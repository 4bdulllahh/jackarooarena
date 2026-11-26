import { DurableObject } from 'cloudflare:workers';
import { type Lobby, join, leave, lobbyView, newLobby, sit, start } from '../src/domain/lobby';
import { isRoomCode, newRoomCode } from '../src/domain/roomCode';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

interface Attachment {
  id: string;
}

const IDLE_MS = 60 * 60 * 1000; // an empty room is deleted after an hour
const MAX_MESSAGE = 1000;
const ID_PATTERN = /^[0-9a-f-]{36}$/;

/**
 * One Durable Object per room. It holds the lobby now and all hidden game state from M7 on.
 * Uses WebSocket hibernation, so an idle room costs nothing; state lives in storage, not memory.
 */
export class Room extends DurableObject<Env> {
  private lobby: Lobby | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.lobby = (await ctx.storage.get<Lobby>('lobby')) ?? null;
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

    const known = (ws.deserializeAttachment() as Attachment | null)?.id;
    let result;
    if (msg.t === 'join') {
      const id =
        known ?? (typeof msg.id === 'string' && ID_PATTERN.test(msg.id) ? msg.id : crypto.randomUUID());
      result = join(this.lobby, id, msg.name);
      if (!('error' in result)) {
        ws.serializeAttachment({ id } satisfies Attachment);
        ws.send(JSON.stringify({ t: 'welcome', id }));
      }
    } else if (!known) {
      result = { error: 'Join the room first.' };
    } else if (msg.t === 'sit') {
      result = sit(this.lobby, known, msg.seat);
    } else if (msg.t === 'start') {
      result = start(this.lobby, known);
    } else {
      return;
    }

    if ('error' in result) {
      ws.send(JSON.stringify({ t: 'error', message: result.error }));
      return;
    }
    this.lobby = result;
    await this.save();
    this.broadcast();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const id = (ws.deserializeAttachment() as Attachment | null)?.id;
    const open = this.ctx.getWebSockets().filter((s) => s !== ws);
    if (this.lobby && id && !open.some((s) => (s.deserializeAttachment() as Attachment | null)?.id === id)) {
      // shortcut: before the start, a dropped player loses their seat; M7 adds reconnecting into a seat.
      this.lobby = leave(this.lobby, id);
      await this.save();
      this.broadcast();
    }
    if (open.length === 0) await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }

  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length > 0) return;
    this.lobby = null;
    await this.ctx.storage.deleteAll();
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('lobby', this.lobby);
  }

  private broadcast(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const id = (ws.deserializeAttachment() as Attachment | null)?.id;
      if (id && this.lobby) ws.send(JSON.stringify({ t: 'lobby', ...lobbyView(this.lobby, id) }));
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
