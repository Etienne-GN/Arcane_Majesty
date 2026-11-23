# Handoff — AMO_3D session moves from Naboo to exegol (2026-11-23)

You are Claude Code on **exegol** (192.168.0.153). The long-running "AMO_3D" session (id `68ef4add-7c58-4af8-9c28-fc6f2dd9d97c`) ran on **Naboo** (192.168.0.206) from 2026-11-12 to 2026-11-23 and is moving here. Work through this file top to bottom. When everything is checked, delete this file and its pointer at the top of `CLAUDE.md`, and commit that.

## What was already done on Naboo

- All work is committed and pushed to `origin/main`. HEAD on Naboo was `7c00911f`, the map baker; the commit before it, `960f1084`, holds Etienne's latest point-editor edits.
- Already copied to exegol by rsync at the same paths:
  - `.superpowers/` (phase plans, gitignored), `.remember/` and `.claude/settings.local.json` in this repo
  - the session transcript and its side folder: `~/.claude/projects/-home-etienne-projects-Arcane-Majesty/68ef4add-7c58-4af8-9c28-fc6f2dd9d97c{.jsonl,/}`
  - the project memory: `~/.claude/projects/-home-etienne-projects-Arcane-Majesty/memory/`
  - reference art: `~/Downloads/{Ravenspire*,Thaloria_playmat,Eldoria's Prophecy Cover.png}`
- **Not copied on purpose:** `apps/amo3d/public/map/`. It's a partial bake from 2026-11-21 with no manifest, so the game ignores it and it's out of date. Etienne's rule: bake the map only once he says the land is finished.

## Steps on exegol

1. `git pull` in `~/projects/Arcane_Majesty`. HEAD must include `7c00911f` and this file's commit.
2. Check the session copy is complete. Compare with Naboo's size, which is printed in the commit that added this file:
   `ls -la ~/.claude/projects/-home-etienne-projects-Arcane-Majesty/68ef4add-7c58-4af8-9c28-fc6f2dd9d97c.jsonl`
3. Remove the stale lock written by Naboo's process: `rm -f .claude/scheduled_tasks.lock`
4. Dev server: `cd apps/amo3d && npm install && npm run dev` (Vite, port 5190, `--host 0.0.0.0`). Run it in the background.
   - The Character Lab's point editor saves through `/api/v2edits`, but only when the page is opened as localhost or the machine's own LAN IP. Etienne's URL is now **http://192.168.0.153:5190/charlab.html?who=base**, no longer 192.168.0.206.
5. **Headless screenshots:** `apps/amo3d/tools/headless.mjs` runs `google-chrome`, and **exegol has no Chrome or Chromium**. Install it, or point `headless.mjs` at an installed browser. Ask Etienne before running `sudo` installs.
6. Already present on exegol (checked from Naboo): Node v26, Python 3 with Pillow and numpy (used by `tools/compare_ref.py`), `gh` logged in as Etienne-GN, GitHub SSH working, and the Neo4j lore DB on scarif (192.168.0.159:7687) reachable. Its credentials are in `data/scripts/run_mcp_server.sh`.
7. Disk: `/home` on exegol was 93% full (6.5 GB free) at handoff. `npm install` and screenshots add up, so keep an eye on it.
8. Releases are unchanged: push a tag `amo3d-vX.Y.Z` and GitHub Actions builds the signed APK from the repo secrets. Nothing local is needed. Local `npm run android` builds would also need an Android SDK at `/opt/android-sdk` and `adb`, which exegol doesn't have. Only set that up if Etienne asks.

## Then Etienne resumes the session

```bash
cd ~/projects/Arcane_Majesty
claude --resume 68ef4add-7c58-4af8-9c28-fc6f2dd9d97c     # or: claude -r → "AMO_3D"
```
The resumed session should know it now runs on **exegol**, not Naboo. Some memory notes, like `feedback_machine_resources.md`, mention Naboo. Update those notes.

## Where the work stands (from the AMO_3D session itself)

- **Current task:** the "character models v2" POC, in `apps/amo3d/src/content/models/v2/` (`skin.js`, `base.js`, `eldrin.js`). Etienne reshapes the male and female base bodies himself in the Character Lab's point editor (`charlab.html?who=base`, then ✎ Edit points). The editor has an A-pose view, a reference panel, and a hair on/off toggle (`?hair=0`).
- His edits live in `v2/edits_{male,female}.json`, keyed by the positions of the generated points. **If code moves generated points, migrate those edits:** dump `bodyMesh(i).userData.editKeys` in the Lab before and after the change, then map them vertex by vertex.
- **Last step done:** the editor shows the A-pose (`26636494`).
- **Open items:** the back of the skull is still flat seen from the side, and the female's hair has gaps at the crown.
- **Next, per Etienne:** keep refining the face and body with him, then integrate v2 into the Forge, then dress Seraphina and Anya on the female base, then reduce the triangle count.
- **Also pending:** a gorilla-like gait for the Shadow Balrog (task #64), and the 30 fps target on phones (#58).
- **Notes:** `project_character_models_v2.md` and `project_balrog_gait.md` in the project memory.
