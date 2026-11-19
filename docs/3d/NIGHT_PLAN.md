# Night plan (2026-11-18 → 19) — work through without the user

The user asked: do as much of the roadmap as possible overnight, commit and release whenever enough is done,
restart automatically at 5:00 AM, and **never hang waiting on a question** — skip anything that needs the user's
decision, note it under "For the user", and go on to the next step.

## Rules
- Resume: read this file, `git log --oneline -5`, `git status`; finish a half-done step, then continue in order.
- Lore: the Neo4j DB is the truth (memory `reference_neo4j_http`). Never invent canon: **no dwarves** (not in the
  lore; the user hasn't decided). Never edit `apps/amo/` (archived).
- Each step: build → headless check (`tools/headless.mjs`, phone size too) → commit and push on `main` → tick here
  and add a progress note. Release (`git tag amo3d-vX.Y.Z` + push; CI builds it with a changelog) after every one or
  two steps. If CI fails on a network hiccup, `gh run rerun <id> --failed`; if publishing is refused (HTTP 403),
  build locally like CI and `gh release create` by hand (see memory `project_amo3d_releases`).
- If something keeps failing after two honest tries, write it down here and move on. Don't loop.

## Steps
- [x] **1. Elves (races)** — a race choice on the character body (Forge + New Game hero + townsfolk): Human,
      Aurorian (elven, beings of light: pointed ears, pale luminous skin, light hair, a faint glow, gold-white eyes),
      Nythorian (elven kin of the Underworld: pointed ears, ashen-violet skin, dark hair, silver eyes, a shadow aura).
      Lore DB races: Aurorian (Anya), Nythorian (Seraphina, Malakar, Valen, Draven), Fallen Aurorian (Xarathos,
      Acheron: Aurorian features with corruption — cracked skin, dark veins). Codex/codex-free. No dwarves.
- [x] **2. Clothing** — more garments per Forge slot (torso: gambeson, chain shirt, plate cuirass, leather jerkin,
      tabard, gown; legs: skirt, greaves; feet: sandals, riding boots, sabatons; arms: gloves, gauntlets; head:
      circlet, crown, coif, great helm, feathered cap; shoulders: fur mantle; back: quiver, cloak variants), metal tints;
      new wearable items in `packages/rules` mapped to these parts so equipping shows on Eldrin; a few sold in shops.
- [x] **3. Life in the new places** — townsfolk (Forge archetypes) with simple day routines in the Crossroads, Port
      Silver, Iron Hollow, Duskmeet, Graywatch; an innkeeper (rest) and a merchant (shop with the checkout) in each
      town; a few lore-flavoured barks.
- [x] **4. The rest of Thaloria** — a lookout on the glade road framing the Citadel like the album cover; the city
      spread wider (an outer district outside the walls); the Forbidden Archive interior (sealed until the campaign).
- [ ] **5. If time remains** — fighting style skills still "not in 3D yet" (start with Piercing Lunge, Leaping Strike,
      Flurry of Blows, Aimed Shot), shield Block.

## Progress notes
- Step 1 done: `RACES` in content/models/look.js (human, aurorian, nythorian, fallen_aurorian: ears, skin glow, starting colours, Fallen's glowing veins); character.js builds pointed ears / glow / veins; the Forge Body panel has a Race picker (your own hero gets it through the Forge). Not done: elf townsfolk (no lore place for them yet in the built world — Nythorians belong to New Ravenspire).
- Step 2 done (2026-11-19 morning): 18 new Forge garments; per the user, **one item per body part** — equipment slots arms, legs, feet, shoulders, back beside head/body (PlayerStats.equipment; old saves load with them empty); 24 wearable items with `wear` (Forge part id) in packages/rules items.js; ARMOURER_CATALOG (CATALOGS.armourer); wardrobe.js maps each slot to its part (look.wear, applied after the outfit in normalizeLook); the satchel figure has the new slots.
- User asks (morning): werewolves **playable**; the Aetheric Tear in God mode reaches **every** map — done (travel.js builds the list from all region files).
- Playable werewolves (user, morning): race `werewolf` in RACES (human form: amber eyes; `fur`); the wolf form = body.wolf in character.js (muzzle, fangs, wolf ears, mane, claws, tail; no hair/beard); the change V / R3 / touch WOLF (only for werewolf heroes; stats.flags.wolfForm, kept in the save); wolf form: ×1.3 speed, ×1.8 strike damage, no casting; hat, gloves, boots, cloak come off (wardrobe.js). Forge preview switch Human/Wolf form. Not yet: a change animation, werewolf-only skills.
- Step 3 done: content/actors/villagers.js (region `people`: Forge archetype looks, stand or stroll, G to talk; merchant → shop with `catalog`; innkeeper → a room: gold, full rest, clock to 7:00; others → their own lines). 26 people in the Crossroads, Port Silver, Iron Hollow, Duskmeet, Graywatch (clothier, smith, sailmaker and quartermaster sell the armourer catalogue). Names are roles, no new canon characters.
- Step 4 done: the North Gate fixed (gap in the wall's real line, the bridge corridor past the map edge); the South Gate → the Lower Town (regions/thaloria_lower.json: 42 houses on a main street and two cross streets, market square, the Inkwell inn, Booksellers' Row, the scriptorium, the tailor, 8 people); the Lookout on a raised mound on the western hills (thaloria.js LOOK; the Citadel over the cliff — the cliff's shoulder still hides the gorge from there); the Forbidden Archive (citadelLibrary.js createForbiddenArchive: chained books, ward circle, the book of lineages) behind the Library's door, sealed until flag `archive_unsealed` (God mode opens it). No werewolf villagers (user).

## For the user (decisions skipped tonight)
- Dwarves: not in the lore DB — add them as new canon? (skipped)
