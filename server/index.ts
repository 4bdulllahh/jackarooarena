import { DurableObject } from 'cloudflare:workers';
import { isRoomCode, newRoomCode } from '../src/domain/roomCode';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

// One Durable Object per room. It will hold all hidden game state (hands, deck) from M6 on.
export class Room extends DurableObject<Env> {
  async info(code: string) {
    return { code, players: 0 };
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ ok: true });
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return Response.json({ code: newRoomCode() });
    }
    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (match?.[1]) {
      const code = match[1].toUpperCase();
      if (!isRoomCode(code)) return Response.json({ error: 'Invalid room code' }, { status: 400 });
      return Response.json(await env.ROOMS.getByName(code).info(code));
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
