# JackarooArena: handover

For the next Claude session. The user starts it with **"continue read the handover"**: read
this file, check `git status` and `git log --oneline -5`, say in 2 or 3 lines where things
stand, then carry on with the next milestone. The plan below is already approved.

After every milestone: commit, update this file, then stop and report what's done, the next
milestone and its size, and ask the user's usage % (see "Usage log" below to estimate).

## What it is

Online 4-player Jackaroo (2v2, "upgraded Levant" house rules) in a 3D low-poly majlis. The
server (one Cloudflare Durable Object per room) holds all hidden state so nobody can cheat.
Every rule and design decision is in [docs/braindump.md](docs/braindump.md): read it before
M2-M3 (rules) and M8-M16 (look and feel).

| What | Where |
| --- | --- |
| Folder | `E:\Github Repos\jackarooarena`, branch `main` |
| Remote | https://github.com/4bdulllahh/jackarooarena |
| Live site | not released yet |
| CI | `.github/workflows/ci.yml`: `npm run check` on every push to `main` |

## Starting a session

```
npm install
npm run check
npm run dev
```

Skills live in `.claude/`, which is gitignored. On a new PC, reinstall them from
[docs/commands.md](docs/commands.md).

## How the code is organised

| Folder | What's in it |
| --- | --- |
| `src/domain/` | Pure game logic shared by client and server, fully tested (`*.test.ts` next to the code) |
| `src/domain/board.ts` | Board constants: track 0..71, start = p*18, home entrance = start - 2 (tile 17), positions (`BASE` = -1, `HOME` + 0..3) |
| `src/domain/move.ts` | `moveMarble` (normal and backward moves), `kingMove`, `exitMarble`, `fiveEntersHome`. Each returns new positions or `null` when illegal |
| `src/domain/cards.ts` | Cards as ids 0..51 (`rankOf`, `suitOf`, `isRed`, `cardName`), shuffling |
| `src/domain/bot.ts` | `botPlay(game, player, random)`: tries every legal play, keeps the one that leaves its team furthest ahead (kills, home, sabotage fall out of the score), saves A/K/5/7 on ties |
| `src/domain/game.ts` | Whole game: `newGame`, `legalPlays(game, player)`, `applyPlay(game, player, play, random)` (null = illegal), `viewFor` (what one player may see). Plays: exit, move, king, split, swap, burnNext (red 10), pickNext (red Q), burn, pickBurn |
| `debug.html`, `src/debug/main.ts` | Dev-only rules debug board at http://localhost:5173/debug.html: 2D canvas board, your legal plays as buttons, 3 bots, play log. Not in the production build (Vite only builds `index.html`) |
| `src/main.ts` | Client entry: renderer, majlis + board, camera rig turned to your seat. Dev URL options: `?cam=overview`, `?cam=top`, `?demo` (local bot game on the 3D board) |
| `src/scene/board.ts` | 3D board: grooves, numbers, coloured starts, home lanes, bases and centre star painted on one canvas texture; 16 marbles. `setPositions(marbles)` animates hole-by-hole hops (kills fly back to base after the killer lands); `onLand(marble)` hook for sounds; `route` tested |
| `src/scene/majlis.ts` | The room: walls with arch niches and star frieze, wood ceiling and beams, carpet, Sadu floor seating along the walls, low round table (`TABLE_HEIGHT` 0.34, `TABLE_RADIUS` 0.8) with 4 player cushions, brass chandelier. 2 lights only (hemisphere + chandelier point light) |
| `src/scene/textures.ts` | Procedural canvas textures (plaster, wood, carpet, Sadu weave, frieze, brass), small and nearest-filtered |
| `src/scene/retro.ts` | PS1/CRT look: renders at 240 px tall, upscales with 15-bit colour, dithering, vignette, scanlines; `snapVertices` adds the PS1 vertex wobble to every material |
| `server/index.ts` | Worker: `/api/health`, `POST /api/rooms` (claims a free code in its Durable Object), `GET /api/rooms/:code` (exists/full/started), `/api/rooms/:code/ws` (WebSocket). `Room` Durable Object: hibernating WebSockets, lobby saved in storage under `lobby`, empty rooms deleted by an alarm after 1 hour |
| `src/domain/lobby.ts` | Lobby rules: join (name 1-14 letters), sit (pick seat/team), leave (host passes on), start (host only), `lobbyView` (no private ids) |
| `src/lobby/ui.ts` | Temporary plain HTML lobby + 2D online table (legal plays as buttons, turn countdown, rematch, auto-reconnect). Replaced by the 3D table (M9-M11) and phone menu (M14) |
| `src/debug/board2d.ts` | 2D board drawing and `describePlay`, shared by the debug page and the temporary online table |
| `wrangler.jsonc` | Worker config: static assets, SPA fallback for room links, `ROOMS` Durable Object binding |
| `docs/reference/` | Board layout, groove look, logo meme references |

## Data and storage

No database. A room's state lives in its Durable Object storage (`lobby` key; the game from M7).
In the browser, localStorage keeps `name` and `id:<CODE>` (the private player id for that room,
used to rejoin). Settings will go there too (M15).

WebSocket messages, client to server: `{t:'join', name, id?}`, `{t:'sit', seat}`, `{t:'start'}`.
Also `{t:'play', play}` (a play copied from the server's `plays` list) and `{t:'rematch'}` (host, after a win).
Server to client: `{t:'welcome', id}`, `{t:'lobby', seats, hostSeat, you, started}`, `{t:'error', message}`,
`{t:'game', ...viewFor(game, seat), bots, deadline, plays}` (only your own hand; `plays` = your legal plays now).

Storage keys in the Room: `lobby` and `match` (`{game, bots, deadline}`). One alarm runs bots
(0.9 s per move), the 15 s human timeout (a bot plays that turn) and the 1-hour empty-room delete.

## Rules that must not break

- Never send hidden cards to the wrong player: the anti-cheat promise of the game.
- Durable Objects must stay SQLite-backed (`new_sqlite_classes`): the only kind on the free plan.
- Durable Object migrations are append-only: never edit the `v1` tag, add a new one.

## Checking your work

`npm run check` runs lint, format check, typecheck, tests and build. For the server, run
`npm run dev` and `curl` the `/api` routes. For anything visual, open the dev server in a
browser and take a screenshot.

## Milestones

| # | Milestone | Size | Status |
| --- | --- | --- | --- |
| M1 | Setup: Vite + three.js + TS, Worker + Durable Object skeleton, CI, docs | S | ✅ done |
| M2 | Rules engine 1: 72-tile board, base, home lane, movement, jump limit, kills, invincible start, home entrance block | M | ✅ done |
| M3 | Rules engine 2: all cards (7 split, 5, red 10/J/Q, K), burn/pass, deal 4-4-5, turn order, teams, win | M | ✅ done |
| M4 | Bots: legal moves, prefer kills and sabotage | S | ✅ done |
| M5 | Flat 2D debug board, play a full game to check rules | S | ✅ done |
| M6 | Online rooms: create/join by code or link, name, pick seat/team, host starts, bots fill seats | M | ✅ done |
| M7 | Online play: hidden hands, network moves, reconnect, 15 s turn timer then bot plays, rematch | M | ✅ done |
| M8 | 3D majlis: room, low table, warm light, chandelier, PS1/CRT look | M | ✅ done |
| M9 | 3D board: wooden board, grooves, marbles, movement | M | ✅ done |
| M10 | Players: floating heads, hands with cards, snack trays | M | next |
| M11 | Cameras (first person / top-down, `V`) + picking cards and marbles + legal move highlights | M | |
| M12 | Procedural sound, mute toggle | M | |
| M13 | Taunts / quick emotes with sounds | S | |
| M14 | Phone menu: phone left hand, tea right, Play / Chaos (soon) / Settings, name, room code | M | |
| M15 | How to play screen + settings (volume sliders, graphics low/high) | M | |
| M16 | Logo (full + small icon), favicon, share image | S | |
| M17 | Deploy to Cloudflare with domain, release 0.1.0 | S | |

## Usage log

| Milestone | Size | Usage before | Usage after |
| --- | --- | --- | --- |
| M1 | S | 9% | 10% |
| M2 | M | 10% | 13% |
| M3 | M | 13% | 15% |
| M4 | S | 15% | 16% |
| M5 | S | 16% | 17% |
| M6 | M | 17% | 19% |
| M7 | M | 19% | 22% |
| M8 | M | 22% | 24% |
| M9 | M | 24% | ? |

## Current state

- **Last done:** M9. 3D board on the table, fed by the online game: marbles hop hole by hole, jump for exits, kills and swaps, and killed marbles fly back after the killer lands. Your own start faces you (board angle per seat, camera rig turns to your seat). Checked with headless screenshots (seat and `?cam=top`); headless timers are too slow to show `?demo` moving, so movement is covered by unit tests only. Ask the user to look at `/?demo`.
- **Next:** M10 players in `src/scene/players.ts`: 3 other players as floating low-poly heads (hair, beard, no face) + 2 floating hands each, at their seat cushions (seat s sits at angle s*90°, see `table()` in majlis.ts); the hands hold a fan of face-down cards matching `handSizes`; your own hands at the bottom of your view hold your cards face up (`hand`, drawn with `cardName`). Snack tray beside each cushion: tea glass (istikana) on saucer, bowl of sunflower seeds, chips bowl, water bottle. Add a "resemblance is coincidence" line to the page footer.
- **Open questions:** none. Confirmed by the user after M2: a K kills a marble on its home entrance and enters; a 5 sends own/partner marbles into home and opponents' past it (no choice); a 5's jump limits use the moved marble's colour.
- **Known issues:** client bundle is 530 kB (three.js imported whole, 131 kB gzipped), fine for now. npm blocked esbuild's postinstall script (`npm approve-scripts`); builds work without it.
- **Not pushed:** the M2 commit.
