# JackarooArena: agreed braindump

Agreed with abzoola on 2026-11-26. After a restart: "continue, read docs/braindump.md".
Kickoff follows `new-project.md` in https://github.com/4bdulllahh/coding-preferences.
Status: kickoff done, plan approved. Work continues from handover.md.

## The game

1. **JackarooArena:** online 4-player Jackaroo with friends. A loud, chill party game.
2. **Launch:** free on the web first. If it takes off, a paid Steam version as soon as
   possible. First proper Steam game, so the wrap to a desktop `.exe` must be simple.
3. **Audience:** international. The setting looks Arab because the game is widely played
   there. Environment and design are the main focus.

## Modes

4. **Classic (now):** "upgraded Levant" rules below. 2v2 only.
5. **Chaos (later):** each player holds 4 normal cards + 4 power-up cards (not designed yet).
   Jokers belong to Chaos. Main menu shows Chaos as "Coming soon". Once the environment
   exists, Chaos is mostly rules and logic, so the engine must let it plug in.
6. **Later:** 1v1, 3v3, 4v4 (different boards), and other board shapes chosen when making a
   room (hexagon, square, more). Classic 2v2 on a circle board only for now.

## Classic rules ("upgraded Levant")

7. **Teams:** 2v2, partners sit opposite. A player with all 4 marbles home uses their cards
   to move their partner's marbles.
8. **Deck:** one standard 52-card deck, no jokers. Deal 4, 4, then 5 cards (3 rounds = 52).
   Then reshuffle.
9. **Turn order:** counterclockwise, the next turn is always the player to the right
   (P1, P2, P3, P4). The dealer moves one seat every deal: P1 deals to P2 and P2 starts, then
   P2 deals and P3 starts, and so on (an anti-cheating custom: the next person gets the cards
   first and starts).
10. **Shuffling:** fully random, done on the server.
11. **Cards:**
    - **A:** take a marble out, or move 1, or move 11.
    - **2, 3, 6, 8, 9:** move that many.
    - **4:** move backward 4 only.
    - **5:** move your marble or any marble on the table 5 (if the move is valid).
    - **7:** move 7, or split between 2 marbles (6+1, 5+2, 4+3).
    - **10 black:** move 10. **10 red:** makes a player burn a card of their choice.
    - **J black:** move 11. **J red:** swap your marble with any marble on the table (if valid).
    - **Q black:** move 12. **Q red:** the next player shows their cards face down, the Q player
      picks one, and it is burned.
    - **K:** take a marble out, or move 13 and kill every marble in its path, including your own.
12. **"Burn"** means a wasted/discarded card. It's the game's own term, keep it.
13. **Movement rules:**
    - You cannot jump over 2 marbles.
    - You cannot jump over your own marble.
    - You cannot jump over marbles inside home. Push them all the way in to fit more.
    - Your marble on your own start tile is invincible: nobody can jump, kill or swap it.
    - Landing on a marble sends it back to its base.
    - No legal move with any card: burn a card and pass.

## Look and feel

14. **Style:** Buckshot Roulette's retro PS1/CRT low-poly look (not a copy), but the mood is
    the opposite: a chill, warm, well-lit Arab majlis with a chandelier.
15. **Chaos mode mood (later):** dark, thunder outside, lights off, one lamp over the table.
16. **Setting:** players sit cross-legged on the floor at a low table, legs slid under it.
    Each player has a side snack tray: green tea, sunflower seeds, chips, water.
17. **Board:** a big circular wooden Jackaroo board. Every spot is a drilled groove the marble
    sits in smoothly (see `docs/reference/board-groove.png`).
18. **Cameras:** first person from your seat, and top-down. Press `V` to toggle.
19. **Players:** floating heads and hands holding cards. Hair and beard, no facial features,
    plus a "resemblance is coincidence" disclaimer.
20. **Sound is a core feature:** satisfying, "brain itch" sounds that make people come back,
    especially marbles dropping into grooves, clacks, card flicks. Made in code, mute toggle.
21. **Performance:** procedural textures and models in code, light bundle, runs on weak PCs.

## Menu

30. **The main menu is a phone in the player's hand** (reference: the tablet menu in Bodycam
    on Steam). You load into first person holding a phone that shows Play, Chaos (coming
    soon), Settings. Phone in the left hand, the right hand sips tea. Unique, not a regular flat menu.

## Stack (round 2)

31. **Vite + plain three.js + TypeScript.** Lightest on old PCs; the phone menu lives in the
    3D scene, so no React. WebGL renders on the GPU.
32. **Rooms:** Cloudflare Worker + Durable Objects. **Site:** Workers static assets (one deploy).
33. **Steam:** Electron + steamworks.js, forcing the high-performance GPU on laptops.
34. Nothing to avoid beyond the $0 rule.

## Setup (rounds 3-4)

35. English only. Private repo, no license. Version 0.1.0. CI: GitHub Actions, tests + build.

## Logo

24. **Square logo, meme blend.** Layout from the lion-vs-chimp painting: two faces in profile,
    nose to nose. Left guy (the lion): screaming in rage, mouth wide open, holding up a marble
    the right guy just killed. Expression as absurd as the screaming-cartoon meme. Right guy
    (the chimp): calm, cards held in the middle, snickering/mocking him like a successful
    ragebait.
25. Matches the game: warm majlis, retro PS1 low-poly feel, Arab look, funny not dark.
26. The logo is the one place the heads have faces (in-game they have none).
27. Original characters: copy the composition and expressions, never the reference art.
28. Two versions: full square scene (title screen, Steam capsule, share image) and a small
    icon cropped to the screaming mouth + marble (favicon, app icon).
29. Claude makes it in code (SVG), then web-asset-generator makes the icon sizes.

## Online

22. **No accounts:** enter a name (max 14 letters), create a room, share a 4-letter code or link.
    Bots fill empty seats. Reconnect handling.
23. **Hosting:** Cloudflare free tier only, $0 except a domain. "Create room" starts a
    Cloudflare Durable Object room (no PC hosting). The server holds all hidden state, so
    nobody can see other hands or cheat.

## Rules confirmed (question rounds)

36. **Jumping:** a normal move may jump over at most 1 marble (any colour, but never your
    own). Landing on a marble kills it and is not a jump. Example, you on 1, marbles on 2
    and 7: A kills 2, 3 jumps 2 to 4, 5 stops behind 7, 6 kills 7, 8 is illegal (2 jumps).
37. **K:** ignores the jump limits and kills every marble in its 13-tile path, your own
    included. Only exception: a marble on its owner's start tile is invincible. Nothing can
    jump, land on, kill or swap it, K included. If it is in the K's path, the K can't be played.
38. Start-tile marbles let players block others behind them on purpose.
39. A card can only be played when its move is legal; otherwise play another card.
40. **Red 10:** the next player burns a card of their choice.
41. **Red J:** swap with any marble on the track (opponent's or partner's), not marbles in
    home, in base, or on their owner's start tile.

42. **Leaving base:** not allowed while your own marble sits on your start tile.
43. **4 backward shortcut:** a 4 back past your start lets the marble enter home on a later
    forward move, no full lap needed.
44. **The 5:** moves any marble on the track except a start-tile (invincible) one, under
    normal move rules. Used to sabotage: push your partner from behind their start into
    their home, push an opponent past their home entrance so they must go around, or move
    an opponent's marble to kill others. The game is more about sabotage than winning.
45. **Board:** 18 track tiles per player section, numbered 1 (start, boxed) to 18; 72 total.
    Each player has a 4-hole base and a 4-hole home lane. Layout reference:
    `docs/reference/board-layout.png` (drawn as a circle in the game).
46. **Home entrance:** tile 17 is the entrance to your home lane. Any marble standing on it
    blocks you from entering until it moves or is killed.
47. **Entering home is forced:** a marble that reaches its entrance must go in (by going
    around, or by the 4-back shortcut). Only an opponent's 5 pushing it past the entrance
    sends it around again (unless it 4-backs again).
48. Any forward card that fits can enter home, K and 7-split included (nothing inside home
    is killed). Marbles in home move deeper with an exact count, no jumping inside home.
49. **Winning:** the first team with all 8 marbles home wins.
50. **Edge cases (confirmed after M2):** a K kills a marble standing on its home entrance and
    enters home. A 5 sends your own or partner's marble into home and an opponent's past it,
    no choice. A 5's jump limits use the moved marble's colour.
51. **Red 10 / red Q burns are the victim's whole turn:** they lose the card and play passes
    to the player after them.
52. **7 split:** if the first part brings your 4th marble home, the rest moves a partner marble.

Logo references: `docs/reference/logo-meme-layout.png`, `docs/reference/logo-meme-expressions.png`.

## Plan (approved, tracked in handover.md)

| # | What it does | Size |
| --- | --- | --- |
| 1 | Setup: Vite + three.js + TS, Worker + Durable Object skeleton, CI, CLAUDE.md, handover, roadmap, README | S |
| 2 | Rules engine 1: 72-tile board, base, home lane, movement, jump limit, kills, invincible start, home entrance block | M |
| 3 | Rules engine 2: all cards (7 split, 5, red 10/J/Q, K), burn/pass, deal 4-4-5, turn order, teams, win | M |
| 4 | Bots: legal moves, prefer kills and sabotage | S |
| 5 | Flat 2D debug board, play a full game to check rules | S |
| 6 | Online rooms: create/join by code or link, name, pick seat/team, host starts, bots fill seats | M |
| 7 | Online play: hidden hands, network moves, reconnect, 15 s turn timer then bot plays, rematch | M |
| 8 | 3D majlis: room, low table, warm light, chandelier, PS1/CRT look | M |
| 9 | 3D board: wooden board, grooves, marbles, movement | M |
| 10 | Players: floating heads, hands with cards, snack trays | M |
| 11 | Cameras (first person / top-down, `V`) + picking cards and marbles + legal move highlights | M |
| 12 | Procedural sound, mute toggle | M |
| 13 | Taunts / quick emotes with sounds | S |
| 14 | Phone menu: phone left hand, tea right, Play / Chaos (soon) / Settings, name, room code | M |
| 15 | How to play screen + settings (volume sliders, graphics low/high) | M |
| 16 | Logo (full + small icon), favicon, share image | S |
| 17 | Deploy to Cloudflare with domain, release 0.1.0 | S |

Roadmap: last move log, Chaos mode, 1v1/3v3/4v4, other board shapes, Steam (Electron).
