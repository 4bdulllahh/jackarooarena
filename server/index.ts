import { DurableObject } from 'cloudflare:workers';
import type { Player } from '../src/domain/board';
import { botPlay } from '../src/domain/bot';
import { type Game, type Play, applyPlay, legalPlays, newGame, viewFor } from '../src/domain/game';
import { type Lobby, join, leave, lobbyView, newLobby, sit, start } from '../src/domain/lobby';
import { isRoomCode, newRoomCode } from '../src/domain/roomCode';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

interface Attachment {
  id: string;
}

/** The running game, saved in storage so it survives hibernation. */
interface Match {
  game: Game;
  bots: boolean[]; // seats nobody sat in at the start
  deadline: number; // when the current human's turn runs out (ms since epoch)
}

const IDLE_MS = 60 * 60 * 1000; // an empty room is deleted after an hour
const TURN_MS = 15_000; // then a bot plays the turn for the human
const BOT_MS = 900; // bots wait a moment so people can follow
const MAX_MESSAGE = 2000;
const ID_PATTERN = /^[0-9a-f-]{36}$/;

const random = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
const actorOf = (game: Game): Player => (game.pending?.kind === 'pick' ? game.pending.by : game.turn);

/**
 * One Durable Object per room. It holds the lobby and all hidden game state, and runs the bots
 * and the turn timer on its alarm. WebSockets hibernate, so an idle room costs nothing.
 */
export class Room extends DurableObject<Env> {
  private lobby: Lobby | null = null;
  private match: Match | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.lobby = (await ctx.storage.get<Lobby>('lobby')) ?? null;
      this.match = (await ctx.storage.get<Match>('match')) ?? null;
    });
  }

  /** Claim this room for a new game. False if the code is already in use. */
  async create(): Promise<boolean> {
    if (this.lobby) return false;
    this.lobby = newLobby();
    await this.save();
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    return true;
  }

  async info() {
    const lobby = this.lobby;
    if (!lobby) return { exists: false, full: false, started: false };
    return { exists: true, full: lobby.seats.every((s) => s), started: lobby.started };
  }

  async fetch(request: Request): Promise<Response> {
    if (!this.lobby) return new Response('Room not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket')
      return new Response('Expected WebSocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (!this.lobby || typeof data !== 'string' || data.length > MAX_MESSAGE) return;
    let msg: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(data);
      if (typeof parsed !== 'object' || parsed === null) return;
      msg = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    const fail = (message: string) => ws.send(JSON.stringify({ t: 'error', message }));
    const known = (ws.deserializeAttachment() as Attachment | null)?.id;

    if (msg.t === 'join') {
      const id =
        known ?? (typeof msg.id === 'string' && ID_PATTERN.test(msg.id) ? msg.id : crypto.randomUUID());
      const result = join(this.lobby, id, msg.name);
      if ('error' in result) return fail(result.error);
      ws.serializeAttachment({ id } satisfies Attachment);
      ws.send(JSON.stringify({ t: 'welcome', id }));
      this.lobby = result;
    } else if (!known) {
      return fail('Join the room first.');
    } else if (msg.t === 'sit' || msg.t === 'start') {
      const result = msg.t === 'sit' ? sit(this.lobby, known, msg.seat) : start(this.lobby, known);
      if ('error' in result) return fail(result.error);
      this.lobby = result;
      if (msg.t === 'start') this.newMatch();
    } else if (msg.t === 'rematch') {
      if (known !== this.lobby.host) return fail('Only the host can start a rematch.');
      if (!this.match || this.match.game.winner === null) return fail('The game is still going.');
      this.newMatch();
    } else if (msg.t === 'play') {
      const seat = this.lobby.seats.findIndex((s) => s?.id === known);
      if (!this.match || seat < 0) return fail('You are not playing in this game.');
      if (typeof msg.play !== 'object' || msg.play === null) return fail('That move is not allowed.');
      // applyPlay only accepts plays that match a legal play exactly, so the shape is checked there.
      const next = applyPlay(this.match.game, seat as Player, msg.play as Play, random);
      if (!next) return fail('That move is not allowed.');
      this.advance(next);
    } else {
      return;
    }
    await this.save();
    await this.schedule();
    this.broadcast();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const id = (ws.deserializeAttachment() as Attachment | null)?.id;
    const open = this.ctx.getWebSockets().filter((s) => s !== ws);
    const stillHere = open.some((s) => (s.deserializeAttachment() as Attachment | null)?.id === id);
    // Before the start a dropped player gives up their seat; after it they keep it and can rejoin.
    if (this.lobby && id && !stillHere && !this.lobby.started) {
      this.lobby = leave(this.lobby, id);
      await this.save();
      this.broadcast();
    }
    if (open.length === 0) await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }

  /** One alarm does three jobs: a bot's move, a human's timeout, or deleting an empty room. */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length === 0) {
      this.lobby = null;
      this.match = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    const match = this.match;
    if (!match || match.game.winner !== null) return;
    const actor = actorOf(match.game);
    if (match.bots[actor] || Date.now() >= match.deadline - 50) {
      this.advance(applyPlay(match.game, actor, botPlay(match.game, actor, random), random)!);
      await this.save();
      this.broadcast();
    }
    await this.schedule();
  }

  private newMatch(): void {
    const bots = this.lobby!.seats.map((s) => s === null);
    const dealer = this.match
      ? (((this.match.game.dealer + 1) % 4) as Player)
      : (Math.floor(random() * 4) as Player);
    this.match = { game: newGame(random, dealer), bots, deadline: 0 };
    this.advance(this.match.game);
  }

  /** Store the new game state and restart the turn clock. */
  private advance(game: Game): void {
    this.match!.game = game;
    this.match!.deadline = Date.now() + TURN_MS;
  }

  private async schedule(): Promise<void> {
    const match = this.match;
    if (!match || match.game.winner !== null) return;
    const bot = match.bots[actorOf(match.game)];
    await this.ctx.storage.setAlarm(bot ? Date.now() + BOT_MS : match.deadline);
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put({ lobby: this.lobby, match: this.match });
  }

  private broadcast(): void {
    const lobby = this.lobby;
    if (!lobby) return;
    const match = this.match;
    for (const ws of this.ctx.getWebSockets()) {
      const id = (ws.deserializeAttachment() as Attachment | null)?.id;
      if (!id) continue;
      const view = lobbyView(lobby, id);
      ws.send(JSON.stringify({ t: 'lobby', ...view }));
      if (match && view.you >= 0) {
        const seat = view.you as Player;
        ws.send(
          JSON.stringify({
            t: 'game',
            ...viewFor(match.game, seat),
            bots: match.bots,
            deadline: match.bots[actorOf(match.game)] ? null : match.deadline,
            plays: legalPlays(match.game, seat),
          }),
        );
      }
    }
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ ok: true });

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let tries = 0; tries < 5; tries++) {
        const code = newRoomCode();
        if (await env.ROOMS.getByName(code).create()) return Response.json({ code });
      }
      return Response.json({ error: 'Could not create a room, try again.' }, { status: 503 });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)(\/ws)?$/);
    if (match?.[1]) {
      const code = match[1].toUpperCase();
      if (!isRoomCode(code)) return Response.json({ error: 'Invalid room code' }, { status: 400 });
      const room = env.ROOMS.getByName(code);
      return match[2] ? room.fetch(request) : Response.json(await room.info());
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
