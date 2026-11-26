# JackarooArena: notes for Claude

Online 4-player Jackaroo (2v2) for friends: a loud, chill party game set in a warm Arab majlis
with a retro CRT vibe (full resolution, detailed models). Free on the web first, then a paid Steam version (Electron).
Vite + plain three.js + TypeScript on the client, a Cloudflare Worker + one Durable Object per
room on the server. 0.1.0 is live on the web (see handover.md).

**At the start of each session, read every file in `global/` from my preferences repo:
https://github.com/4bdulllahh/coding-preferences.** Those are my rules for all projects.

**Read [handover.md](handover.md) before changing anything.** It has the milestone plan and
where the work stopped. The full idea and every confirmed rule: [docs/braindump.md](docs/braindump.md).

## Project choices

| Choice | This project |
| --- | --- |
| Stack | Vite 8 + three.js + TypeScript (strict), no React. Server: Cloudflare Worker + Durable Objects (SQLite-backed, free plan) |
| Data | Game state lives only in the room's Durable Object. No accounts, no database. Settings in localStorage |
| Languages | English only |
| Themes | None: the 3D scene sets the look (warm majlis; Chaos mode later is dark) |
| Design | Buckshot Roulette vibe with a soft CRT filter at full resolution (not super low-res), opposite mood. Menu is a phone in the player's hand (like Bodycam's tablet). impeccable for 2D UI, taste-skill for the website |
| Shipping | Cloudflare Workers static assets + the same Worker for rooms (`npm run deploy`). Steam later via Electron + steamworks.js |
| Version | 0.1.0, stored in `package.json` |
| Skills | ponytail, ration, i-have-adhd, model-router, impeccable, taste-skill, web-asset-generator. Commands in [docs/commands.md](docs/commands.md) |
| Repo | https://github.com/4bdulllahh/jackarooarena (private, no license) |

## Rules that are easy to break

- `src/domain/` is pure game logic: no three.js, no DOM, no Worker APIs. The server and the client both import it, and it is fully tested.
- The server holds all hidden state (deck, hands). Never send a player another player's cards, and validate every move on the server.
- Only $0 Cloudflare features: SQLite-backed Durable Objects, no paid add-ons.
- Assets are made in code (procedural textures, models, sounds). No downloaded art or audio to license.
- Keep it light for weak PCs: 60 fps on the Low preset (`src/scene/quality.ts`), `powerPreference: 'high-performance'` on the renderer.
- House rules are exact (docs/braindump.md items 7-13 and 36-49). Don't "fix" them to standard Jackaroo.

## Everyday commands

```
npm install
npm run dev        # game + Worker + rooms on http://localhost:5173
npm run check      # lint, format check, typecheck, tests, build (what CI runs)
npm run deploy     # build and deploy to Cloudflare (ask first)
```
