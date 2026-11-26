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
| `src/domain/game.ts` | Whole game: `newGame`, `legalPlays(game, player)`, `applyPlay(game, player, play, random)` (null = illegal), `viewFor` (what one player may see). Plays: exit, move, king, split, swap, burnNext (red 10), pickNext (red Q), burn, pickBurn |
| `src/main.ts` | Client entry: three.js scene (placeholder board until M8) |
| `server/index.ts` | Worker: `/api/health`, `POST /api/rooms` (new code), `/api/rooms/:code` (asks the `Room` Durable Object) |
| `wrangler.jsonc` | Worker config: static assets, SPA fallback for room links, `ROOMS` Durable Object binding |
| `docs/reference/` | Board layout, groove look, logo meme references |

## Data and storage

No database. A room's state lives in its Durable Object (from M6). Player settings will go in
localStorage (M15).

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
| M4 | Bots: legal moves, prefer kills and sabotage | S | next |
| M5 | Flat 2D debug board, play a full game to check rules | S | |
| M6 | Online rooms: create/join by code or link, name, pick seat/team, host starts, bots fill seats | M | |
| M7 | Online play: hidden hands, network moves, reconnect, 15 s turn timer then bot plays, rematch | M | |
| M8 | 3D majlis: room, low table, warm light, chandelier, PS1/CRT look | M | |
| M9 | 3D board: wooden board, grooves, marbles, movement | M | |
| M10 | Players: floating heads, hands with cards, snack trays | M | |
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
| M3 | M | 13% | ? |

## Current state

- **Last done:** M3. Every card, burn and pass, red 10 (victim burns, that's their turn), red Q (blind pick, that's the victim's turn), 7 split incl. leftover to partner, finished players moving their partner, dealer rotating every deal (next player starts), fresh deck after 4-4-5, team win. 56 tests, including 30 random full games checking cards are conserved, one marble per tile and hands stay private. Random play always reaches a winner (about 590 turns).
- **Next:** M4 bots in `src/domain/bot.ts`: `botPlay(game, player, random): Play` picks from `legalPlays`. Prefer: win, enter home, kill opponents (more if near their home), exit marbles, sabotage (5 pushing opponents past home, 5 pushing partner in, red J/Q/10), avoid killing own/partner, burn the least useful card. Test: bots beat random players most of the time.
- **Open questions:** none. Confirmed by the user after M2: a K kills a marble on its home entrance and enters; a 5 sends own/partner marbles into home and opponents' past it (no choice); a 5's jump limits use the moved marble's colour.
- **Known issues:** client bundle is 530 kB (three.js imported whole, 131 kB gzipped), fine for now. npm blocked esbuild's postinstall script (`npm approve-scripts`); builds work without it.
- **Not pushed:** the M2 commit.
