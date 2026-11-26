# Skills for later

Not installed yet. Install from the official repo only (see the catalog in
https://github.com/4bdulllahh/coding-preferences/blob/main/skills/catalog.md).
Per-project installs: add `--scope project` so they only load here.

| When | Skill | Why | Install |
| --- | --- | --- | --- |
| Designing Chaos power-ups | [mattpocock/skills](https://github.com/mattpocock/skills) | `/grill-me` interviews you about each power-up until the rules are watertight. | `claude plugin install mattpocock-skills@claude-plugins-official --scope project`, then `/setup-matt-pocock-skills` |
| Long build stretches | [caveman](https://github.com/JuliusBrussee/caveman) | Very short replies, cuts output tokens. Say "caveman" to use it. | `/plugin marketplace add JuliusBrussee/caveman` then `/plugin install caveman@caveman` |
| Codebase gets big | [graphify](https://github.com/Graphify-Labs/graphify) | Knowledge graph of the code so Claude reads less. | `uv tool install graphifyy` (two y's), then its README |
| Launch on web | [brag](https://github.com/latent-spaces/brag) | Short launch video for socials. | `/plugin marketplace add latent-spaces/brag` then `/plugin install brag@brag` |
| Launch on web / Steam page | [marketingskills](https://github.com/coreyhaines31/marketingskills) | Landing page, Steam store copy, SEO. | `npx skills add coreyhaines31/marketingskills` (`--list` to pick single skills) |
| Before publishing any text | [humanizer](https://github.com/blader/humanizer) | Removes AI-sounding wording from UI, store page, posts. | `/plugin marketplace add blader/humanizer` then `/plugin install humanizer@humanizer` |
| Seeing what players say | [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | Read Reddit, Twitter, YouTube feedback with no API fees. | Ask Claude to follow `https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/docs/install.md` (not the PyPI package) |
| Accounts, friends lists, leaderboards | [supabase/agent-skills](https://github.com/supabase/agent-skills) | Only if the game ever needs accounts or a shared database. | `npx skills add supabase/agent-skills` |
| Engine gets complex or bugs pile up | [superpowers](https://github.com/obra/superpowers) | Test-first build method. Pick this **or** agent-skills, not both. | `/plugin install superpowers@claude-plugins-official` |
| Same as above, alternative | [agent-skills](https://github.com/addyosmani/agent-skills) | Five-axis code review, TDD. Overlaps superpowers. | `/plugin marketplace add addyosmani/agent-skills` then `/plugin install agent-skills@addy-agent-skills` |
| Probably never (overlaps ponytail) | [ECC](https://github.com/affaan-m/ECC), [karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Large rule sets that fight ponytail and cost tokens. | See catalog |
