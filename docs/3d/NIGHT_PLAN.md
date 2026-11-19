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
- [ ] **3. Life in the new places** — townsfolk (Forge archetypes) with simple day routines in the Crossroads, Port
      Silver, Iron Hollow, Duskmeet, Graywatch; an innkeeper (rest) and a merchant (shop with the checkout) in each
      town; a few lore-flavoured barks.
- [ ] **4. The rest of Thaloria** — a lookout on the glade road framing the Citadel like the album cover; the city
      spread wider (an outer district outside the walls); the Forbidden Archive interior (sealed until the campaign).
- [ ] **5. If time remains** — fighting style skills still "not in 3D yet" (start with Piercing Lunge, Leaping Strike,
      Flurry of Blows, Aimed Shot), shield Block.

## Progress notes
- Step 1 done: `RACES` in content/models/look.js (human, aurorian, nythorian, fallen_aurorian: ears, skin glow, starting colours, Fallen's glowing veins); character.js builds pointed ears / glow / veins; the Forge Body panel has a Race picker (your own hero gets it through the Forge). Not done: elf townsfolk (no lore place for them yet in the built world — Nythorians belong to New Ravenspire).
- Step 2 done (2026-11-19 morning): 18 new Forge garments; per the user, **one item per body part** — equipment slots arms, legs, feet, shoulders, back beside head/body (PlayerStats.equipment; old saves load with them empty); 24 wearable items with `wear` (Forge part id) in packages/rules items.js; ARMOURER_CATALOG (CATALOGS.armourer); wardrobe.js maps each slot to its part (look.wear, applied after the outfit in normalizeLook); the satchel figure has the new slots.
- User asks (morning): werewolves **playable**; the Aetheric Tear in God mode reaches **every** map — done (travel.js builds the list from all region files).

## For the user (decisions skipped tonight)
- Dwarves: not in the lore DB — add them as new canon? (skipped)
