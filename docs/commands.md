# Commands

The commands for the skills installed in this project, taken from each skill's own files.
Updated when a skill is added or removed. Skills for later: [laterskills.md](laterskills.md).

## Installed skills

| Skill | What it's for in this project | On by itself? |
| --- | --- | --- |
| ponytail | Smallest code that fully solves the task, fewer tokens | Yes, every session (level `full`) |
| ration | Sends easy jobs to cheaper models, short replies | Yes, stays on until you turn it off (`balanced`) |
| i-have-adhd | Replies lead with the next action, numbered steps, no tangents | Yes, every session |
| model-router | Your own: hands easy jobs to cheaper models | Yes, Claude uses it on its own |
| impeccable | Designing and polishing the menus, lobby, HUD and landing page | No, you call it |
| taste-skill | Art direction for web pages: landing page, Steam/press site | Claude uses it when building a web page |
| web-asset-generator | Favicon, app icons, share image for room links | No, you ask for it |

**Note:** impeccable and taste-skill are made for 2D web UI. The 3D majlis, board and marbles
are built by hand. Use these two for everything around the game: main menu, name entry,
lobby, card hand overlay, settings, and the website.

## ponytail

| Command | What it does | Use it when |
| --- | --- | --- |
| `/ponytail` | Turns it on at `full` (the default) | After you turned it off |
| `/ponytail lite` | Builds what you asked and names a smaller option in one line | You want exactly what you described, no trimming |
| `/ponytail ultra` | Also questions the request and pushes back before building | Big features where you want a second opinion |
| `stop ponytail` or `/ponytail off` | Turns it off for this session | Rarely. Say it only if replies feel too stripped down |
| `/ponytail-review` | Reviews a change: bugs, security, missing tests, extra code | Before committing a milestone you're unsure about |
| `/ponytail-audit` | The same review for the whole repo, ranked | Before a release (web launch, Steam) |
| `/ponytail-debt` | Lists every `shortcut:` comment Claude left | Before a release, to see what was put off |
| `/ponytail-gain` | Shows what ponytail saves (code, cost, speed) | Curiosity |
| `/ponytail-help` | Quick reference card | You forgot a command |

## ration

| Command | What it does | Use it when |
| --- | --- | --- |
| `/ration` | Toggles on or off | |
| `/ration balanced` | Cheap models for easy jobs, main model for hard thinking | Default. Leave it here |
| `/ration frugal` | Everything one step cheaper, very short replies | You're low on usage for the week |
| `/ration off` | Claude does everything on the main model | A hard bug where cheap helpers keep getting it wrong |
| `/ration status` | Shows if it's on and which preset | |
| `/ration why` | Which model did the last task, and why | A result looks off and you want to know who did it |
| `/ration tips` | Ways to save tokens right now | You're running low |
| `/ration handover` | Saves a note so you can `/clear` and carry on | Mid-milestone and the chat got long |
| `/ration compress` | Shrinks `CLAUDE.md` (or a named file) with a backup | `CLAUDE.md` grows big, since it loads every session |
| `/ration stats` | How many jobs went to each helper and model | Curiosity |
| `/ration commit` | Writes a one-line commit message | Rarely, Claude commits each milestone anyway |
| `/ration help` | This list | |

## i-have-adhd

| Command | What it does | Use it when |
| --- | --- | --- |
| `stop adhd mode` | Turns it off for this session | You want a long explanation |
| `/i-have-adhd` | Turns it back on | After turning it off |

## impeccable

Type `/impeccable <command> [what]`, for example `/impeccable polish main menu`.

**Set up once (before the first UI milestone, Claude will tell you when):**

| Command | What it does |
| --- | --- |
| `/impeccable init` | Writes `PRODUCT.md`: who the game is for, mood, tone. Every other command reads it |
| `/impeccable shape <feature>` | Plans a screen's UX before code, for example `shape lobby` |
| `/impeccable document` | Writes `DESIGN.md` (colours, fonts, spacing) from what's built |
| `/impeccable extract` | Pulls repeated styles into shared tokens and components |

**Check:**

| Command | What it does | Use it when |
| --- | --- | --- |
| `/impeccable critique <screen>` | Design review with scores | A screen works but feels off |
| `/impeccable audit <screen>` | Accessibility, speed, small screens | Before each release |

**Change the feel:**

| Command | What it does | Use it when |
| --- | --- | --- |
| `/impeccable polish <screen>` | Final quality pass | A screen is done, before release |
| `/impeccable bolder` | Makes a bland design stronger | It looks safe and generic |
| `/impeccable quieter` | Tones down a loud design | Too busy, fights with the 3D scene |
| `/impeccable distill` | Strips it to the essentials | Too many buttons or text |
| `/impeccable delight` | Adds personality and small surprises | Menus feel lifeless |
| `/impeccable animate` | Adds purposeful motion | Cards, buttons, screen changes |
| `/impeccable overdrive` | Pushes past the usual | Main menu or title screen moments |
| `/impeccable typeset` | Better fonts and text hierarchy | Text looks plain |
| `/impeccable colorize` | Adds colour to a grey UI | |
| `/impeccable layout` | Fixes spacing and alignment | Things look cramped or uneven |

**Fix:**

| Command | What it does | Use it when |
| --- | --- | --- |
| `/impeccable clarify` | Better button labels and error messages | Lobby errors, "room full", "name too long" |
| `/impeccable harden` | Errors, translations, edge cases | Before release |
| `/impeccable onboard` | First-run flow and empty states | First visit, empty lobby |
| `/impeccable adapt` | Phone and different screen sizes | Phone layout |
| `/impeccable optimize` | Finds and fixes slow UI | Menus stutter |

**Try options:**

| Command | What it does |
| --- | --- |
| `/impeccable live` | Click elements in the browser and pick between alternatives |
| `/impeccable generate 3 <element>` | Makes 3 versions of one element to choose from, for example a button or the room code card |

Outside Claude: `npx impeccable detect <url>` scans a page for "AI-looking" design.

## taste-skill

No commands to type. Claude uses it when building a web page (landing page, press kit,
Steam teaser site). It picks the art direction and checks the page in a real browser.
To call it by hand: `/taste-skill:design-taste-frontend`.

## web-asset-generator

No commands to type. Ask in plain words, for example:
- "Make the favicon and app icons from `assets/logo.png`."
- "Make the share image for room links with the text 'Join my JackarooArena room'."

Needs Pillow (installed).

## model-router

No commands to type. Claude uses it on its own to hand searching, reading and test runs to
cheaper models. ration does the same, so they work together.

## Claude Code built-ins worth knowing

| Command | What it does | Use it when |
| --- | --- | --- |
| `/clear` | Starts a fresh chat in the same folder | After a milestone, once `handover.md` is updated |
| `/compact` | Shrinks the chat history to a summary | A long milestone, chat getting slow |
| `/context` | Shows what's using up the chat's memory | Curious why usage climbs fast |
| `/model` | Switches model | Only at the start of a session, never mid-chat (it throws away the cache) |

## Turn these on to save tokens

| Command | What it does | Worth it when |
| --- | --- | --- |
| `/ration balanced` | Already on. Cheap helpers for easy jobs | Always |
| `/ration frugal` | One step cheaper, very short replies | Usage over about 70% for the week |
| `/ponytail lite` | Less pushback, builds exactly what you said | Design and environment work, where you want your vision built as described |
| `/clear` + "continue read the handover" | Fresh chat, loads only the handover | After every milestone. The biggest single saver |
| caveman (not installed) | Very short replies | Long build stretches with no planning. See [laterskills.md](laterskills.md) |
