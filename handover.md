# JackarooArena: handover

For the next Claude session. The user starts it with **"continue read the handover"**: read
this file, check `git status` and `git log --oneline -5`, say in 2 or 3 lines where things
stand, then carry on with the next milestone. The plan below is already approved.

**The user is changing the game themselves after 0.1.0** (release commit `a20a33d`, tag
`v0.1.0`). At the start of the next session, run `git log --oneline v0.1.0..HEAD` and
`git diff --stat v0.1.0` (plus `git status` for uncommitted work), read what they changed,
and update this file to match before building on it. Never undo their changes.

After every milestone: commit, update this file, then stop and report what's done, the next
milestone and its size, and ask the user's usage % (see "Usage log" below to estimate).

## What it is

Online 4-player Jackaroo (2v2, "upgraded Levant" house rules) in a 3D majlis with a soft retro CRT filter. The
server (one Cloudflare Durable Object per room) holds all hidden state so nobody can cheat.
Every rule and design decision is in [docs/braindump.md](docs/braindump.md): read it before
M2-M3 (rules) and M8-M16 (look and feel).

| What | Where |
| --- | --- |
| Folder | `E:\Github Repos\jackarooarena`, branch `main` |
| Remote | https://github.com/4bdulllahh/jackarooarena |
| Live site | https://jackarooarena.abdullahkamran823.workers.dev (0.1.0, deployed 2026-11-26) |
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
| `src/main.ts` | Client entry: renderer, scene, camera rig turned to your seat, `V` glides between seat and top-down poses. Dev URL options: `?cam=overview`, `?cam=top`, `?demo` (you play seat 0 against bots, no server), `?demo=auto` (bots only) |
| `src/scene/board.ts` | 3D board: grooves, numbers, coloured starts, home lanes, bases and centre star painted on one canvas texture; 16 marbles. `setPositions(marbles)` animates hole-by-hole hops (kills fly back to base after the killer lands); `onLand(marble)` hook for sounds; `route` tested |
| `src/scene/majlis.ts` | The room: walls with arch niches and star frieze, wood ceiling and beams, carpet, Sadu floor seating along the walls, low round table (`TABLE_HEIGHT` 0.34, `TABLE_RADIUS` 0.8) with 4 player cushions, brass chandelier. 2 lights only (hemisphere + chandelier point light) |
| `src/scene/players.ts` | `Players`: 4 faceless heads (skull, jaw, ears; hair or folded shemagh with double agal; full/goatee/stubble beards with a strand bump map), `hand(skin, left, curl)` with jointed fingers (curl > 0 bends in front of the palm), `istikana()` tea glass, a card fan (yours face up, others face down by `handSizes`), snack tray per seat (istikana tea, seeds, chips, water). `setSeat`, `setCards`, `update(time, turn)`; the player whose turn it is lifts their cards |
| `src/scene/controls.ts` | Playing in 3D: click a card (or number keys), movable marbles glow, click a marble, glowing discs mark destinations, click to play; `#choices` panel lists the same options as buttons (keyboard, 7 splits, burns, red Q picks). `landing(marbles, me, play)` = which marble a play moves and where (tested) |
| `src/scene/sound.ts` | Web Audio sounds made in code: `tick` (marble passing a groove), `drop` (settling), `clack` (kill), `flick` (card), `ping` (your turn), `whoosh` (camera). Starts on the first click/key; `setMuted` saved in localStorage `muted`. Wired in `main.ts` (`board.onLand`, `board.onKill`, hand sizes, `M` key, `#mute` button) |
| `src/domain/taunts.ts` | The 6 preset taunts (`TAUNTS`, `isTaunt`, `tauntLabel`) and `killed(before, after)` used for bot gloating |
| `tools/shot.mjs` | Browser check: `node tools/shot.mjs <url> <out-dir> wait:<ms> key:<Key> click:<x>,<y> shot:<name> text:<selector>` drives the installed Edge (playwright-core) and reports page errors |
| `src/scene/textures.ts` | Procedural canvas textures (plaster, wood, carpet, Sadu weave, frieze, brass), small and nearest-filtered |
| `src/scene/retro.ts` | Render pipeline (three's EffectComposer): full-res render with MSAA, ACES tone mapping, bloom on Medium/High, then a soft CRT pass (faint scanlines, fine dither, grain, edge colour fringing, vignette) |
| `src/scene/quality.ts` | Graphics presets Low/Medium/High (`PRESETS`: pixel ratio cap, shadow map size, bloom, MSAA). `getQuality()` reads localStorage `graphics`; `?q=low` overrides for testing |
| `server/index.ts` | Worker: `/api/health`, `POST /api/rooms` (claims a free code in its Durable Object), `GET /api/rooms/:code` (exists/full/started), `/api/rooms/:code/ws` (WebSocket). `Room` Durable Object: hibernating WebSockets, lobby saved in storage under `lobby`, empty rooms deleted by an alarm after 1 hour |
| `src/domain/lobby.ts` | Lobby rules: join (name 1-14 letters), sit (pick seat/team), leave (host passes on), start (host only), `lobbyView` (no private ids) |
| `src/lobby/rules.ts` | The 8 How to play pages (tested: short enough, no long dashes) |
| `src/lobby/ui.ts` | Menu and lobby as a visually hidden HTML form (screens `home`, `entry`, `settings`, `rules`, `room`; rows marked `data-row`), plus networking: join/create, seats, start, auto-reconnect, turn bar and rematch (`#game` in `index.html`) |
| `src/scene/phone.ts` | The phone menu: low-poly phone in your left hand on the camera, tea in your right hand (sips every 8 s). Its screen canvas (104x180 layout units, drawn at 4x) draws the form's visible `data-row` elements; clicks raycast to the screen and go to the real element; arrow keys move focus. `setUp(false)` lowers it when the game starts and `shown` drives your cards rising (`players.ownDrop`) |
| `src/debug/board2d.ts` | 2D board drawing and `describePlay`, shared by the debug page and the temporary online table |
| `wrangler.jsonc` | Worker config: static assets, SPA fallback for room links, `ROOMS` Durable Object binding |
| `docs/reference/` | Board layout, groove look, logo meme references |
| `public/` | `logo.svg` (square meme logo: the screaming shemagh player holds up the killed marble, the calm bearded one smirks with his cards), `favicon.svg` (mouth + marble), PNGs and `og.png` share image made by `node tools/assets.mjs` (renders the SVGs in Edge) |

## Data and storage

No database. A room's state lives in its Durable Object storage (`lobby` key; the game from M7).
In the browser, localStorage keeps `name` and `id:<CODE>` (the private player id for that room,
used to rejoin). Settings will go there too (M15).

WebSocket messages, client to server: `{t:'join', name, id?}`, `{t:'sit', seat}`, `{t:'start'}`.
Also `{t:'play', play}` (a play copied from the server's `plays` list), `{t:'rematch'}` (host, after a win) and
`{t:'taunt', id}` (preset id only, one per player per 2 s; broadcast as `{t:'taunt', seat, id}`; bots taunt after half their kills).
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
| M10 | Players: floating heads, hands with cards, snack trays | M | ✅ done |
| M11 | Cameras (first person / top-down, `V`) + picking cards and marbles + legal move highlights | M | ✅ done |
| M12 | Procedural sound, mute toggle | M | ✅ done |
| M13 | Taunts / quick emotes with sounds | S | ✅ done |
| M14 | Phone menu: phone left hand, tea right, Play / Chaos (soon) / Settings, name, room code | M | ✅ done |
| G1 | Render pipeline: full resolution, softer CRT filter, no vertex wobble, Low/Med/High presets, sharp phone and cards, dev fps meter | M | ✅ done |
| G2 | Lighting: chandelier shadows (Med/High), blob shadows (Low), bloom glow, lanterns/candles, better materials (shiny marbles, brass, glass) | M | ✅ done |
| G3 | Room and table detail: smoother table, cushions, arches, chandelier, sharper procedural textures | M | ✅ done |
| G4 | Board, marbles and phone: carved board, deeper grooves, round glossy marbles, proper phone model | M | ✅ done |
| G5 | Characters: smoother faceless heads, hair, beards, shemagh folds, hands with fingers holding cards, phone and tea | M | ✅ done |
| M15 | Settings (Master/Effects/Taunts volume, Graphics Low/Med/High), How to play pages on the phone, Esc raises the phone in game | M | ✅ done |
| M16 | Logo (full + small icon), favicon, share image | S | ✅ done |
| M17 | Deploy to Cloudflare (free workers.dev for now), release 0.1.0 | S | ✅ done |

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
| M9 | M | 24% | 27% |
| M10 | M | 27% | 29% |
| M11 | M | 29% | 36% (many screenshots: keep image checks few) |
| M12 | M | 36% | 38% |
| M13 | S | 38% | 40% |
| M14 | M | 40% | 46% (many screenshots) |
| G1-G5 | 5 x M | 46% | 58% |
| M15-M17 | M + S + S | 58% | ? (ask at the start of the next session) |

## Current state

- **Released:** 0.1.0 is live at https://jackarooarena.abdullahkamran823.workers.dev (free workers.dev, chosen by the user; a custom domain later = a `routes` entry in `wrangler.jsonc` plus updating `og:image` in `index.html` and the README link). Release notes `docs/releases/v0.1.0.md`. Wrangler is logged in on the user's PC. `npm run deploy` only when the user says so.
- **Milestone plan:** finished (M1-M17 and G1-G5). Next work comes from the user; ideas are in [docs/roadmap.md](docs/roadmap.md) (last move log, Chaos mode, more player counts, board shapes, Steam).
- **The look (decided after M14, overrides the old 240-line PS1 plan):** full screen resolution with a soft CRT filter at every level; Low/Medium/High change pixel ratio cap, shadows, bloom and MSAA (`quality.ts`), not pixels. Real shadows from the table spotlight on Med/High, blob shadows on Low. No vertex wobble. Detailed models; players stay faceless. Target 60 fps.
- **How the pieces fit (details in the file table above):**
  - Lights (`majlis.ts`): hemisphere fill, chandelier point light, a spotlight from the chandelier onto the table (the only shadow caster), 4 corner lanterns with point lights (not on Low). `setShadows(root)` skips transparent/basic meshes and anything under `userData.noShadow`. Glowing things are `MeshBasicMaterial` brighter than white; bloom threshold is 1, so only they glow. `scene.environment` is the room rendered once with PMREM.
  - Textures (`textures.ts`) are drawn at 4x and double as bump maps. The board has a matching height map (`boardTexture(true)`); marbles are clear-coated `MeshPhysicalMaterial` with swirls.
  - Phone menu: the real menu is a hidden HTML form in `ui.ts` (screens `home`, `entry`, `settings`, `rules`, `room`); `phone.ts` draws rows marked `data-row` (`title`, controls, `text`, `para` wraps, `range` sliders) and forwards clicks. Esc in a game raises it as a pause menu.
  - Sound (`sound.ts`): master + effects + taunts gain nodes, saved as `volume:<channel>`; `muted` separate (M key, corner button).
  - Logo and icons: `public/logo.svg`, `public/favicon.svg`; PNGs and `og.png` come from `node tools/assets.mjs`.
- **Waiting on the user's feedback:** the logo (M16), the new graphics and real fps on Low/Medium/High (the dev fps meter shows top left with `npm run dev`; headless Edge renders in software, so its fps means nothing), how the sounds sound (M12), taunt wording (M13), neighbours' heads cut off at the screen edges (M10).
- **To do whenever:** create the GitHub release for `v0.1.0` by hand (no `gh` on this PC): paste `docs/releases/v0.1.0.md`.
- **Open questions:** none. Confirmed by the user after M2: a K kills a marble on its home entrance and enters; a 5 sends own/partner marbles into home and opponents' past it (no choice); a 5's jump limits use the moved marble's colour.
- **Known issues:** client bundle is 652 kB (170 kB gzipped; three.js and its post-processing imported whole), fine for now. npm blocked esbuild's postinstall script (`npm approve-scripts`); builds work without it.
- **Not pushed:** nothing. Everything up to the 0.1.0 release is on GitHub.
