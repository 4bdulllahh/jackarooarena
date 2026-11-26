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
| `src/scene/phone.ts` | The phone menu: low-poly phone in your left hand on the camera, tea in your right hand (sips every 8 s). Its screen canvas (104x180, about 1:1 with the 240 px render) draws the form's visible `data-row` elements; clicks raycast to the screen and go to the real element; arrow keys move focus. `setUp(false)` lowers it when the game starts and `shown` drives your cards rising (`players.ownDrop`) |
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
| M15 | M | 58% | ? (ask at the start of the next session) |

## Current state

- **Graphics overhaul (decided after M14):** the user found the 240-line look too pixelated: "the vibes, not the actual super low res". Decisions: render at full screen resolution with the CRT filter on at every level (Low/Med/High change shadows, bloom, MSAA, pixel ratio cap, not pixels); real shadows + warm glow, blob shadows on Low; no vertex wobble; more polys, things should look nice; characters stay faceless but detailed; 60 fps. Then M15: volume sliders Master + Effects + Taunts, How to play as pages on the phone, Esc raises the phone in game. The user asked for G1-G5 in one go, pushing after each.
- **Last done:** G1. New pipeline in `retro.ts` + `quality.ts`, vertex wobble removed, textures linear-filtered, phone screen and cards drawn at 4x. Dev fps meter top left (headless Edge uses a software renderer, so its fps means nothing; check on a real browser).
- **G2:** `majlis.ts` lights = hemisphere fill 0.55, chandelier point light, a spotlight from the chandelier onto the table (the only shadow caster, Med/High), 4 corner floor lanterns with point lights (no lights on Low). `setShadows(root)` flags meshes (skips transparent/basic and `userData.noShadow`, used by the chandelier). Glowing things use `MeshBasicMaterial` brighter than white so bloom picks them up. `scene.environment` = the room rendered once with PMREM, for reflections. Low: blob shadows under marbles (`new Board(blobs)`); a contact shadow under the table always.
- **G3:** textures are drawn at 4x (`RES` in `textures.ts`) with `mottle` blotches and `weave` threads, and double as bump maps (`lambert(map, color, bump)` in `majlis.ts`). Cushions use three's `RoundedBoxGeometry`, bolsters are capsules, niches have extruded carved frames, the table is a lathe-turned top with turned legs, the chandelier has S-curved tube arms, wax candles and flames.
- **G4:** the board face is drawn at 2048 px, and `boardTexture(true)` draws a matching height map (grooves deep, numbers and ring engraved, star inlay raised) used as `bumpMap`. Edge is a lathe with a rounded lip. Marbles are `MeshPhysicalMaterial` with clearcoat and a swirl texture (`marbleTexture`, offset per marble). The phone is a rounded body with a metal band and speaker slot.
- **G5:** see the `players.ts` row. The phone hand holds the bottom left corner with fingers behind; the tea hand holds the istikana from the side (Euler order `ZYX` so fingers point away and curl round the glass).
- **M15:** Home has How to play (8 pages on the phone, `para` rows wrap text, Next/Back, Esc back home) and Settings: Master/Effects/Taunts sliders (`range` rows: click, drag or arrow keys; `sound.ts` has master + effects + taunts gain nodes, saved as `volume:<channel>`), Graphics Low/Medium/High (saves `graphics` and reloads). In a game, Esc raises the phone as a pause menu (Play and Chaos hidden, Back to the game shown); Esc on the home screen lowers it. Clicks on the raised phone never reach the board. Bloom threshold is 1, so only lights glow.
- **M16:** logo, favicon and share image in `public/`, linked from `index.html` (description, theme colour, Open Graph and Twitter tags). `og:image` is relative until the domain is known.
- **M17:** released 0.1.0 on the free workers.dev address (the user chose it; a custom domain can be added later with a `routes` entry in `wrangler.jsonc`). Release notes in `docs/releases/v0.1.0.md`, README with screenshots, roadmap Done table, tag `v0.1.0`. Live checks passed: `/api/health`, room create, browser create + start game over wss. `og:image` is absolute (change it if the domain changes). Wrangler is logged in on this PC.
- **Next:** the milestone plan is finished. Ask the user what's next (roadmap: last move log, Chaos mode, more player counts, board shapes, Steam).
- **Waiting on the user's feedback:** the look of the majlis (M8), neighbours' heads cut off at the screen edges (M10), how the sounds sound (M12), taunt wording (M13), the logo (M16), the new graphics G1-G5 (run it on a real browser and check fps on Low/Medium/High: `?q=low`).
- **Open questions:** none. Confirmed by the user after M2: a K kills a marble on its home entrance and enters; a 5 sends own/partner marbles into home and opponents' past it (no choice); a 5's jump limits use the moved marble's colour.
- **Known issues:** client bundle is 530 kB (three.js imported whole, 131 kB gzipped), fine for now. npm blocked esbuild's postinstall script (`npm approve-scripts`); builds work without it.
- **Not pushed:** nothing. Everything up to M13 is on GitHub.
