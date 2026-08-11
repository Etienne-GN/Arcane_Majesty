# Eldoria's Prophecy — Campaign Bible

## Meta

- **Timeline / era:** ~500–501 AGD (Era III, "The Silent Century"). Album node
  `Eldoria's Prophecy`: `era: Era III`, `timeline_range: ~500 AGD`.
- **Sources:** album XML `data/lore/xmls/processed_albums/Eldorias_Prophecy.xml`
  (12 tracks); book draft `books/eldorias_prophecy/` (canon summaries +
  `fidelity-log.md`); game design `data/lore/{magic,combat,bestiary,world_systems}.md`.
- **Status:** draft (2026-08-03). Game code not yet wired; this is the design source.
- **Canon rule:** book is canon on conflict; album is an external telling medium.
  Where the album text and book differ (Balrog, Vorgos's titles), this bible follows
  the **book canon** and records the override.

## Narrative Arc

Eldrin Nightshade, master mage of Thaloria, discovers the "Echoes" in the strata —
proof the world has catastrophically ended before. Vorgos the Stormbringer gives him a
vision of the future (900 AGD: the Star-Guard shattering) and a Compass of the Storm.
Eldrin walks east through winter to retrieve the Heartstone of Creation, a Cosmic
Insulator meant to steady the failing Living Lock. Three Void Generals of the Legion
of Souls hunt the same prize. He loses a false companion (Oren) to betrayal, destroys
the Pyre-Lord (Xarathos), breaks past the Silent Executioner (Voraun), and — unable to
defeat the untamable Shadow Balrog by force — yields through humility. Vorgos reveals
the true condition: Eldrin must guard the Stone for 400 years, until a hero not yet
born needs it in 900 AGD. He accepts, re-seals his sanctum in Thaloria, and begins
the vigil. The world names him the "Blind Prophet" — metaphoric only.

## Song-by-Song Breakdown

### Song 1 — Echoes of Stone (Act I)
- **Song plot (XML):** Eldrin Nightshade sits in his tower, surrounded by dust and
  silence. He studies the geological strata of the world, noticing a terrifying
  anomaly—"Echoes" in the stone that suggest the world has ended before. He feels the
  weight of a history he cannot read, and a premonition that the cycle is about to repeat.
- **Expanded beat:** *Situation:* Eldrin is a scholar-mage in his tower above Silverrun,
  in the scholar's quarter. *Inciting event:* reading the strata, he finds the erasure —
  records "tidied," history actively silenced, and deep "Echoes" proving prior endings.
  *Rising action:* his career's thesis — the record is a lie — is confirmed; the premonition
  of a repeating cycle lands. *Conflict:* knowledge he cannot act on; he is old (~60) and
  alone. *Resolution:* he resolves to prove the pattern. *Emotional beat:* the weight of a
  history he cannot read. *Bridge:* the vision strikes mid-study.
- **Canon anchors:** Eldrin Nightshade, Eldrin's Tower, Thaloria, event *Eldrin's Call*
  (part). `LOCATED_AT Eldrin's Tower` (DB).
- **Game content:**
  - Map/area: **Eldrin's Tower** (tutorial hub, existing `eldrin_tower` map).
  - Enemies: none — a training Resonance-Wisp for the casting tutorial (non-canon, tool).
  - Boss: none.
  - NPCs: none (isolation is the point); the bell that never struck correctly (ambient).
  - Quests (main): "Read the Erasure" — inspect strata, find the Echoes, gain first
    Insight. Side: "The Missing Decades" (library lore fragments about the Gap).
  - Items / unlocks: Scholar's Staff (starting focus), Insight **Aetheric Reading**
    (detect/downplay mechanics).
  - Set-piece / mechanic: **Strata-memory investigation** — examine rock layers to
    reveal layered past endings; tutorial for the mage-first rhythm.
  - Gameplay moment: the "Echoes" reveal — the tower walls flash with a past apocalypse;
    you have done this before. Player knows this world has ended once.
- **Conflict notes:** none.

### Song 2 — Dreamweaver's Call (Act I)
- **Song plot (XML):** The vision strikes. Eldrin is pulled out of time by Vorgos. He sees
  the "Violet Sky" of 900 AGD—the moment Kael explodes. He sees a woman (Anya) weeping
  over a broken man. The "Dreamweaver" (Vorgos) speaks: "The Lock will fail. Find the
  Anchor." It is not a request; it is a command from the Aether.
- **Expanded beat:** *Situation:* mid-study, the Aether pulls Eldrin out of time.
  *Inciting event:* he witnesses the future — the violet sky, the Star-Guard shattering.
  *Rising action:* the woman (Anya) weeping over Kael; Vorgos's words. *Conflict:*
  a command he cannot refuse vs. a task he does not understand. *Resolution:* the Compass
  of the Storm is implanted. *Emotional beat:* dread + the first hint of cosmic scale.
  *Bridge:* he wakes with the Compass and the Lock's deadline in his head.
- **Canon anchors:** Vorgos, Anya, Kael, The Heartstone of Creation (mentioned),
  Eldrin's Tower, event *Eldrin's Call*. `FEATURES Vorgos/Anya/Kael`, `MENTIONS Heartstone`
  (DB).
- **Game content:**
  - Map/area: **Aetheric Vision** — an unreal, non-physical dream map (short).
  - Enemies: none (Echo-Phantoms of the future, non-hostile).
  - Boss: none.
  - NPCs: **Vorgos** (first contact; gives Compass of the Storm).
  - Quests (main): "The Lock Will Fail" — walk the vision, witness the shattering.
  - Items / unlocks: **Compass of the Storm** (points to the Anchor), Insight
    **Aether-Resonance basics**, first real spell unlock.
  - Set-piece / mechanic: timed forced-progression dream; you cannot stop the shattering.
  - Gameplay moment: watching the Star-Guard break and knowing you can't fix it — "you
    are not the hero of this dream."
- **Conflict notes:** song title/lyric uses "Dreamweaver" for Vorgos — recorded override
  (ACC minor note); in-game Vorgos is **Stormbringer / Architect** only. "Not a request;
  a command" is album telling — book softens to *Vorgos never forces pieces*; bible uses
  the book version (he *moved* Eldrin).

### Song 3 — Odyssey's Dawn (Act I)
- **Song plot (XML):** Eldrin packs his staff and his journals. He locks his tower,
  knowing he may never return. The "Odyssey" begins. He steps out into the world of
  500 AGD, a place of rebuilding and ignorance, guided only by the "Compass of the Storm"
  Vorgos implanted in his mind.
- **Expanded beat:** *Situation:* the tower is packed; the sanctum sealed behind him.
  *Inciting event:* he locks the door knowing he may never return. *Rising action:* the
  walk east through a world that does not know it is in danger; the first Legion rumor
  (agents ask about "the Anchor"). *Conflict:* his ignorance of who else hunts the prize.
  *Resolution:* first combat skills confirmed; Oren joins him on the road. *Emotional
  beat:* the loneliness of being the only one who saw the vision. *Bridge:* the mountains
  rise ahead.
- **Canon anchors:** Eldrin's Tower, Thaloria, event *The Race for the Anchor*.
  `LOCATED_AT Eldrin's Tower` (DB).
- **Game content:**
  - Map/area: **Thaloria city** (hub: forge, shop, inn) + **East Road** (wilderness
    corridor; existing `prologue_forest`-style assets).
  - Enemies: **Void-Stalker** (wolf), **Blight-Ent**, **Root-Wraith** (Shadow-Touched
    biome, low density).
  - Boss: none (early optional miniboss: corrupted sentinel).
  - NPCs: **Oren** (joins the road — false companion), trader at the inn (rumor: the
    Legion's line of questions eastward).
  - Quests (main): "Odyssey's Dawn" (departure + first combat). Side: "Trader's Rumor",
    "The Scholar's Saddlebags".
  - Items / unlocks: **Spell-Blade** (sword, combat skill), first **Rift-Gate** node
    discovered (Tier-2 travel tease), Mana-Shield aug.
  - Set-piece / mechanic: departure montage; the tower door stays locked behind you.
  - Gameplay moment: stepping past the city gate into the winter road, the Compass
    needle fixed east.
- **Conflict notes:** none.

### Song 4 — Summit of Despair (Act II)
- **Song plot (XML):** As Eldrin climbs a treacherous mountain pass, the weight of his
  mission begins to bear down on him. The cold wind bites at his bones, and the
  snow-covered peaks seem to loom over him like menacing giants. Doubt and fear creep
  into his mind, and he questions his ability to save the world. The physical and
  emotional toll of the journey is taking its toll on him, but he must press on.
- **Expanded beat:** *Situation:* the frozen high pass east of Thaloria; the Aether runs
  thin. *Inciting event:* the frozen camp of fourteen Legion-less dead (Malphas's work).
  *Rising action:* Malphas feeds on his doubt — illusions of allies and past failures.
  *Conflict:* the Whisperer's hold vs. Eldrin's will. *Resolution:* Aether Sight + the
  refusal of fear break the anchor-thread; Malphas retreats ALIVE. *Emotional beat:*
  the toll of the road + the first General faced. *Bridge:* over the pass to an
  impossible green.
- **Canon anchors:** Summit of Despair, Malphas, event *Malphas Forced to Retreat*.
  `LOCATED_AT Summit of Despair` (DB).
- **Game content:**
  - Map/area: **Summit of Despair** (new map — blizzard high pass).
  - Enemies: **Gloom-Beak** (bird, dive-bombs high-mana), **Frost-Shade** (invisible in
    snow), **Crag-Fiend** (resonance rod).
  - Boss: **Malphas, the Whisperer of Doubt** — illusion boss; use Aether Sight to find
    the real General among illusions of your allies; intermission dialogue feeds doubt.
  - NPCs: the fourteen dead (readable lore).
  - Quests (main): "Whisperer of Doubt". Side: "The Frozen Camp" (investigate the
    fourteen, Legion lore fragment).
  - Items / unlocks: **Aether Sight** (formal mastery — required for this boss),
    Insight **Refusal of Fear**.
  - Set-piece / mechanic: blizzard hazard; Frost-Shades hidden in the whiteout; the camp
    as dread set-piece.
  - Gameplay moment: the illusion of a trusted face cutting into your resolve — and
    Aether Sight cutting it away.
- **Conflict notes:** Malphas survives (book canon) — no kill reward; he vows to find
  Eldrin where the road is loneliest.

### Song 5 — Sylvan Sanctuary (Act II)
- **Song plot (XML):** Lost and weary, Eldrin stumbles upon a hidden forest. As he
  explores its depths, he encounters strange creatures and magical plants. The forest
  seems to have a life of its own, and Eldrin feels a sense of peace and tranquility as
  he wanders through its paths. He eventually comes across a wise old hermit, who offers
  him guidance and wisdom. The hermit reveals that the forest is a sacred place, and that
  it holds secrets that could aid Eldrin in his quest.
- **Expanded beat:** *Situation:* an impossible early-spring valley in the mountain
  country — a green cathedral. *Inciting event:* the forest Elemental trials Eldrin on
  intent ("Why do you seek the light of day?"). *Rising action:* the Hermit — a failed
  former Keeper, spirit bound to the Elemental — reads Oren coldly but says nothing.
  *Conflict:* the Hermit's warnings (the Balrog cannot be commanded or bargained with).
  *Resolution:* Aether Sight granted (formal mastery). *Emotional beat:* the only peace
  on the road, and the price of it. *Bridge:* the trail down to the Fire Gate.
- **Canon anchors:** Sylvan Sanctuary, The Hermit, event *The Elemental's Trial*.
  `LOCATED_AT Sylvan Sanctuary` (DB).
- **Game content:**
  - Map/area: **Sylvan Sanctuary** (green valley; existing `hermit_hut` map + expansion).
  - Enemies: **Blight-Ent**, **Root-Wraith** (the valley is not corrupted — the
    Shadow-Touched creep at its edges only).
  - Boss: **the Elemental** — a *trial of intent*, not a fight: dialogue/puzzle boss.
  - NPCs: **The Hermit** (major; grants Aether Sight), the forest **Elemental**.
  - Quests (main): "The Elemental's Trial". Side: "The Hermit's Debt" (recover a lost
    talisman for the Hermit), "Seeds of the Valley" (heal corrupted edges).
  - Items / unlocks: **Aether Sight** (permanent formal mastery — shared with Summit),
    Hermit's resonance talisman.
  - Set-piece / mechanic: intent-based trial (answer the Elemental's question truthfully);
    the Hermit's hut as a rest/refuge hub.
  - Gameplay moment: the Elemental silently dismissing Oren — the first crack in the mask
    of true things.
- **Conflict notes:** *Whispering Woods* in `bestiary.md` refers to this valley in the
  game — standardize game naming to **Sylvan Sanctuary** to match canon. The DB's
  **The Hidden Cabin** (in The Emerald Fields) is Kael's exile home, NOT the Hermit's hut
  — keep distinct.

### Song 6 — Treachery's Bite (Act II)
- **Song plot (XML):** A trusted companion betrays Eldrin, shattering his trust and
  leaving him feeling betrayed and alone. The betrayal is a devastating blow, and Eldrin
  struggles to cope with the pain and anger that consume him. The betrayal has shaken his
  faith in humanity, and he questions his own judgment.
- **Expanded beat:** *Situation:* the Fire Gate's first landing — black glass, the
  snow-line/ash transition. *Inciting event:* Oren strikes — "the dagger that the
  shadows bring." *Rising action:* Oren is Voraun's agent of thirty years; his scholarship
  and kindness were real; a shadow-blade arm from Voraun's touch. *Conflict:* Oren does
  not kill Eldrin — the Stone needs a hand it accepts, and Eldrin is too valuable.
  *Resolution:* Oren takes the journal (coordinates) and descends the labyrinth ahead.
  *Emotional beat:* the hardest mask to remove is one made of true things. *Bridge:* the
  descent alone.
- **Canon anchors:** Fire Gate, Oren, Voraun, event *Oren's Betrayal at the Fire Gate*.
  `LOCATED_AT Fire Gate` (DB).
- **Game content:**
  - Map/area: **Fire Gate** (new map — black-glass stair, first landing).
  - Enemies: **Void-Squire** (flickering shadow-blade), **Aether-Leech** (mana drain).
  - Boss: **Oren** — a duel he *flees* from (he needs you alive; takes the journal).
  - NPCs: Oren (companion → betrayer; this is a scripted set-piece).
  - Quests (main): "Treachery's Bite" (survive the ambush, lose the journal).
  - Items / unlocks: (permanent loss) **the Journal** with the coordinates; unlock
    **Umbral Dagger** (stealth/silent takedowns).
  - Set-piece / mechanic: betrayal mid-combat; a quest item is lost **permanently** —
    consequence is real.
  - Gameplay moment: the companion's dagger — and the reason you live is that the Stone
    accepts only you.
- **Conflict notes:** book canon — Oren's mask was made of true things; in-game he is a
  sympathetic traitor, not a cartoon villain. His later fate (the Warden has the sword)
  is seeded, not shown.

### Song 7 — The Solitary Path (Act II)
- **Song plot (XML):** After the betrayal, Eldrin realizes he must walk this path alone.
  The stakes are too high for trust. He embraces his isolation, becoming the 'Silent
  Guardian' in spirit before he even finds the stone.
- **Expanded beat:** *Situation:* post-betrayal, bleeding, alone in the descent.
  *Inciting event:* the realization that allies are a liability now. *Rising action:* a
  solitude gauntlet — cold clinging, doubt echoes. *Conflict:* old Eldrin (trusts) vs.
  the warden he must become. *Resolution:* he embraces isolation — the Silent Guardian
  in spirit. *Emotional beat:* the road empties; the resolve hardens. *Bridge:* the gate
  of flame calls his name.
- **Canon anchors:** Inferno Labyrinth (approach), event *The Race for the Anchor*
  (context — the Legion's line of questions).
  `LOCATED_AT Inferno Labyrinth` (DB).
- **Game content:**
  - Map/area: **The Descent** (cold→ash transition into the upper Inferno Labyrinth).
  - Enemies: lingering **Frost-Shade**, first **Magma-Eater** / **Cinder-Soul** as heat
    rises.
  - Boss: none (a survival gauntlet).
  - NPCs: none — the point is solitude; voice-over of Eldrin's resolve; optional doubt-
    echo of Oren (memory mechanic).
  - Quests (main): "The Solitary Path" (gauntlet). Side: "Echoes of the Road" (fragments
    of Oren's true story — the mask made of true things).
  - Items / unlocks: Insight **Silent Guardian** (resonance-silencing passive — lower
    Scent).
  - Set-piece / mechanic: no-help gauntlet; the snow-line/ash transition; the Aetheric
    Ripple budget (spells draw predators — manage Scent).
  - Gameplay moment: a quiet inner-monologue beat — the moment Eldrin stops needing an
    ally.
- **Conflict notes:** none.

### Song 8 — Inferno's Trial (Act II)
- **Song plot (XML):** Eldrin is confronted with a fiery trial, a test of his courage and
  determination. He must navigate through a treacherous labyrinth of flames, dodging
  traps and avoiding deadly obstacles. The heat is intense, and the air is thick with
  smoke. Eldrin's physical and mental endurance are pushed to their limits, but he
  refuses to give up. The trial is a crucible that will test his resolve and prepare him
  for the challenges that lie ahead.
- **Expanded beat:** *Situation:* the Inferno Labyrinth — Xarathos's territory, the
  Legion seeded its defenses with Eldrin's identity. *Inciting event:* the gate of flame
  "that calls me by my given name." *Rising action:* golem rune-puzzle, Magma-Eaters,
  Cinder-Souls, the flame burning away doubt. *Conflict:* the Pyre-Lord's mana-steal
  vs. Eldrin's rune-drain counter. *Resolution:* Xarathos destroyed in the crucible.
  *Emotional beat:* dying words — "Voraun will have you at the door." *Bridge:* out of
  the mountain to the ruins under the moon.
- **Canon anchors:** Inferno Labyrinth, Xarathos, event *Xarathos Destroyed in the
  Crucible*. `LOCATED_AT Inferno Labyrinth` (DB).
- **Game content:**
  - Map/area: **Inferno Labyrinth** (new map — full dungeon).
  - Enemies: **Magma-Eater** (eats fire spells, grows), **Cinder-Soul** (Void-Flame
    burns HP+Mana), **Obsidian Golem** (runic-frequency vulnerability), Void-Squire,
    Aether-Leech.
  - Boss: **Xarathos, the Pyre-Lord** — floor-is-lava + mana-steal Super-Nova; canon
    mechanic: **rune-drain counter** — when he drains you, you can drain back (find the
    crack in Thirst-driven arrogance).
  - NPCs: post-boss, Xarathos's dying words (seeded lore).
  - Quests (main): "Inferno's Trial". Side: "The Golem Frequencies" (find rune-
    frequencies to bypass golems).
  - Items / unlocks: **Runic Focus** (mana-scaling item), spell **Inferno's Trial**
    (finisher requiring a Casting Window).
  - Set-piece / mechanic: the flame gate that knows your name; golem rune-puzzle combat;
    lava hazard dance.
  - Gameplay moment: the crucible — Xarathos's Super-Nova denied by his own Thirst.
- **Conflict notes:** Xarathos is **destroyed** (book canon) — a real kill, the only
  General kill.

### Song 9 — Eldoria's Heartbeat (Act III)
- **Song plot (XML):** After overcoming countless challenges, Eldrin finally reaches the
  ancient realm of Eldoria. The land is filled with ancient ruins and hidden secrets.
  Eldrin must explore the realm and find the Heartstone of Creation, a powerful artifact
  that holds the key to saving the world. The search is fraught with danger, and Eldrin
  must face a series of trials and tribulations before he can claim the Heartstone.
- **Expanded beat:** *Situation:* the Ruins of Eldoria — a graveyard of the golden age; a
  vigil, not a city. *Inciting event:* the approach is a rune-dead gate sealed by
  Voraun's silence. *Rising action:* the Heartstone's echo; Eldrin "Witnesses" the golden
  age (Aetheric Witness). *Conflict:* Voraun has been sitting at the door of the keeping
  for months. *Resolution:* the Heartstone is **accepted** — resonance synced; Voraun,
  reaching for it, is burned by the ward. *Emotional beat:* the pulse of the stone in the
  floor. *Bridge:* the ancient door appears.
- **Canon anchors:** Ruins of Eldoria, Heartstone Chamber, Voraun, The Heartstone of
  Creation, event *The Retrieval of the Heartstone*. `LOCATED_AT Ruins of Eldoria` (DB).
- **Game content:**
  - Map/area: **Ruins of Eldoria** (new map — black-stone ruins, moonlit).
  - Enemies: **Hollow Guard** (reflects projectiles), **Void-Archer** (Siphon-Arrows),
    Legion sentries.
  - Boss: **Voraun's rune-dead gate** — a resonance-lock puzzle (Voraun felt, not yet
    fought; his presence is the boss).
  - NPCs: ghostly echoes of the Keepers (Witness mechanic).
  - Quests (main): "Eldoria's Heartbeat" (reach the Heartstone Chamber). Side: "The
    Vigil's Bones" (piece together the keepers' vigil through Witness).
  - Items / unlocks: Insight **Aetheric Witness** (lore-vision over the golden age).
  - Set-piece / mechanic: the Witness — see the golden age overlaid on the ruins; the
    rune-dead gate as a resonance-lock puzzle.
  - Gameplay moment: the pulse of the Heartstone in the floor — Eldoria's heartbeat
    through your feet.
- **Conflict notes:** "ancient realm of Eldoria" = the ancient realm of the golden age
  **within** the plane Eldoria — the oldest Eldoria, pre-GD — of which the ruins are the
  last trace (the record was tidied at the Great Darkness; nothing else is known).
  Physically the ruins sit in a red valley below the ridge, reached after the Inferno
  Labyrinth; the DB keeps `LOCATED_IN Thaloria` so the campaign journey holds on the
  Material Plane.

### Song 10 — Heart of War (Act III)
- **Song plot (XML):** Eldrin faces the Shadow Balrog — a powerful adversary corrupted
  by dark forces who guards the ancient door and seeks the Heartstone. A final
  confrontation ensues that will determine the fate of the world.
- **Expanded beat (book canon, per ACC):** *Situation:* the Heartstone Chamber; Voraun
  (Silent Executioner) reaches for the Stone and is burned by the ward — his dying truth
  seeds the next saga. *Inciting event:* the ancient door appears — older than the
  valley; the Shadow Balrog rises from the floor. *Rising action:* Eldrin fights as a
  mage — runes, ward, beacon, staff, Aether Sight — and loses the duel by force; the
  Balrog eats runes; the hunger's weight pins him ("placed, not fallen"). *Conflict:*
  force fails utterly; it cannot be commanded or bargained with. *Resolution:* Eldrin
  stops demanding and stands as what the Stone is meant for — its intended guardian. The
  Balrog settles, **satisfied — not defeated, not commanded, not tamed**. *Emotional
  beat:* mastery through humility. *Bridge:* Vorgos steps from time.
- **Canon anchors:** The Ancient Door, The Shadow Balrog, Voraun, The Heartstone of
  Creation, events *The Retrieval of the Heartstone* + *The Shadow Balrog Yields*.
  `LOCATED_AT The Ancient Door` (DB).
- **Game content:**
  - Map/area: **Heartstone Chamber** → **The Ancient Door** (nested, new maps).
  - Enemies: (chamber) Legion remnants, Hollow Guard; (door) the Balrog is the whole
    encounter.
  - Bosses: **Voraun, the Silent Executioner** — high-speed duel; runic reflection
    (parries magic back into patterns you dodge); shadow-blade across the ward's line.
    Canon mechanic: Voraun cannot take the Stone — unworthy hands burn; weaponize his
    need; the ward does the killing. Then **The Shadow Balrog** — a **survival/humility
    encounter** (see Boss Design): no HP bar, un-killable, waves of hunger-pin; the
    "win" is a state change, not damage.
  - NPCs: Voraun's dying truth (post-fight).
  - Quests (main): "Heart of War" (carry the Stone out past the Executioner; survive the
    Balrog; the door opens).
  - Items / unlocks: **The Heartstone of Creation** (carried), Insight **Mastery Through
    Humility**.
  - Set-piece / mechanic: the Balrog survival encounter; the ward of the keeping (first
    use against Voraun).
  - Gameplay moment: losing the duel on purpose-is-not-possible — you genuinely cannot
    win by force; the door opens when you stop demanding.
- **Conflict notes:** album text says "corrupted by dark forces… seeks the Heartstone"
  and (song 12) "defeated the dark guardian" — **recorded overrides** (ACC E1–E4): the
  Balrog is ancient and untamable, does NOT seek the Stone, and is never defeated or
  commanded. The game must NOT show a kill or a taming.

### Song 11 — The Weight of Eternity (Act III)
- **Song plot (XML):** Victory is won, but the reward is a curse. Vorgos reveals the
  final condition: Eldrin must guard the stone for 400 years. He grapples with the
  crushing weight of a life paused, waiting for a hero who isn't born yet.
- **Expanded beat:** *Situation:* at the ruins, Vorgos steps from time ("a storm of
  grey"). *Inciting event:* the test — "Put down the Stone, and walk away." *Rising
  action:* Eldrin refuses. *Conflict:* the true condition — 400 years until a hero not
  yet born needs the key in 900 AGD. *Resolution:* tragic acceptance — he is the bridge
  between past tragedy and future salvation. *Emotional beat:* "a hundred years, and
  then three more"; his friends will die, his world will change. *Bridge:* the return
  to Thaloria.
- **Canon anchors:** Vorgos, The Heartstone of Creation, Ruins of Eldoria, events
  *The 400-Year Condition Revealed* + *Eldrin's 400-Year Vigil*. `LOCATED_AT Ruins of
  Eldoria` (DB).
- **Game content:**
  - Map/area: **Ruins of Eldoria** (Vorgos scene) → **Thaloria / East Road** (the return).
  - Enemies: none (narrative beat); residual Legion on the road (they are withdrawing).
  - Boss: none — the heaviest scene in the campaign.
  - NPCs: **Vorgos** (the reveal, the choice — not a battle).
  - Quests (main): "The Weight of Eternity" (the choice: put it down or keep it —
    scripted to refuse, but framed as a decision).
  - Items / unlocks: the **ward of the keeping** (re-seal the sanctum).
  - Set-piece / mechanic: Vorgos's storm-of-grey appearance; the test; the montage of
    the years to come.
  - Gameplay moment: "A hundred years, and then three more" — the weight lands.
- **Conflict notes:** "victory is won" is album telling — Eldrin kept the Stone and the
  passage opened; he won the encounter by humility, not by defeating the Balrog
  (ACC overrides).

### Song 12 — Dawn's Embrace (Act III)
- **Song plot (XML):** Eldrin emerges victorious, having defeated the dark guardian and
  secured the Heartstone of Creation. Guided by the wisdom of his journey, he returns to
  his tower in Thaloria as a master mage, safeguarding the Heartstone and preparing for
  his continued destiny in the next chapter, The Prophecy of Darkness.
- **Expanded beat:** *Situation:* back in Thaloria; the sanctum re-sealed. *Inciting
  event:* he draws the ward of the keeping around the chamber. *Rising action:* the
  vigil begins; the years fold; the world names him the "Blind Prophet" (metaphoric —
  his sight never fails). *Conflict:* he holds a cure that does nothing yet, for a future
  he will never see. *Resolution:* "I am the watcher, here and now" — dawn breaks, the
  Star-Guard is not ready; he waits. *Emotional beat:* epilogue — Vorgos's dream-visit
  (~600 AGD): "You will not see it, but it will come." *Bridge:* seeds the next saga —
  the Prophecy of Darkness.
- **Canon anchors:** Thaloria, Eldrin's Tower, The Heartstone of Creation, events
  *Eldrin's 400-Year Vigil*. `LOCATED_AT Thaloria` (DB).
- **Game content:**
  - Map/area: **Eldrin's Tower sanctum** (revisited, transformed by the ward).
  - Enemies: none — the world is quiet (the campaign ends in stillness).
  - Boss: none.
  - NPCs: Vorgos (epilogue dream-visit).
  - Quests (main): "Dawn's Embrace" (the vigil begins; year montage). Epilogue: "The
    Architect's Design" (the dream).
  - Items / unlocks: the ward of the keeping (permanent); post-game Rift-Gate network;
    the Heartstone re-sealed in the chamber.
  - Set-piece / mechanic: the montage of the years; the dawn over Thaloria; the epilogue
    dream — a handoff, not an ending.
  - Gameplay moment: "I am the watcher, here and now" — the campaign closes as a
    beginning.
- **Conflict notes:** "defeated the dark guardian" — recorded override (ACC E4); Eldrin
  IS a master mage and fought as one. Next-chapter hook = **The Prophecy of Darkness**
  (album status: not yet produced).

## Boss Design

### The Shadow Balrog (survival / humility encounter)
- **Canon constraints:** ancient, untamable, subservient to no one; exists to protect
  the ancient door from misuse; hungers for light; cannot be commanded or bargained
  with; force fails — it *eats* runes; it yields only to the one the Stone accepts.
  Never defeated, never tamed.
- **Mechanic (design):** a "boss" with **no HP bar and no kill**. Three escalating
  phases, each a pressure-and-pin loop:
  1. *Probe* — your strongest magic is absorbed; the hunger's weight begins to press.
  2. *Pinned* — you are forced to your knees ("placed, not fallen"); damage keeps
     coming but cannot be answered by force.
  3. *Settle* — when the player **stops casting and stands as the Stone's guardian**
     (a non-combat resolve prompt / hand-empty moment), the Balrog settles, satisfied;
     the door opens.
- **Failure:** if the player keeps demanding (keeps attacking), the pressure never
  releases; the fight cannot be won by damage — it must be *endured into yielding*.
- **Payoff:** no death, no taming, no banner; the door opens, and the player understands
  why.

### Voraun, the Silent Executioner (tactical duel)
- **Canon constraints:** runic reflection (mirrors magic back), shadow-blade across the
  ward's line; cannot touch the Stone (unworthy hands burn); on orders to *prevent* the
  Stone's use.
- **Mechanic:** his rune-reflection turns your own spells into dodgeable patterns;
  he is fought at the ward's edge. Canon win: **carry the Stone out past him** — his
  reach into the ward is what burns him. Dying truth seeds the next saga.

### Xarathos, the Pyre-Lord (arena boss)
- **Canon constraints:** Fallen Aurorian, Thirst-corrupted; mana-steal Super-Nova;
  destroyed in the crucible.
- **Mechanic:** floor-is-lava + Super-Nova steal; the **rune-drain counter** turns his
  drain into your window — exploit the crack in Thirst-driven arrogance. This is the
  one **kill**.

### Malphas, the Whisperer of Doubt (illusion boss)
- **Canon constraints:** feeds on doubt; illusions of allies; retreats ALIVE.
- **Mechanic:** Aether Sight reveals the real General among illusions; intermission
  dialogue plants doubt that debuffs; **no kill** — he flees.

### Oren (scripted betrayal duel)
- **Canon constraints:** cannot kill Eldrin (the Stone needs an accepted hand); takes
  the journal; flees ahead.
- **Mechanic:** a duel that ends in scripted escape; you lose a quest item permanently.

## Campaign Progression

```
Thaloria (hub) → East Road → Summit of Despair → Sylvan Sanctuary →
Fire Gate → The Descent → Inferno Labyrinth → Ruins of Eldoria →
Heartstone Chamber / The Ancient Door → return to Thaloria → the vigil
```

- **Combat loop:** mage-first "Scholar's Rhythm" (Analyze → Distance → Engage →
  Finisher) per `combat_system.md`; Mana-Physical dependency; weapon hotkeys
  (Staff/Sword/Dagger/Bow).
- **Unlock ladder:** Staff (1) → first spell (2) → Spell-Blade + Rift-Gate tease (3) →
  Aether Sight (4–5) → Umbral Dagger (6) → Silent Guardian passive (7) → Runic Focus +
  Inferno's Trial (8) → Aetheric Witness (9) → Heartstone + ward (10–11) → permanent
  ward + post-game Rift-Gates (12).
- **Boss gating:** Malphas (Aether Sight required) → Elemental (intent, not stats) →
  Oren (scripted) → Xarathos (rune-drain counter) → Voraun (ward duel) → the Balrog
  (humility encounter).
- **Replay / hooks:** the campaign closes into the Prophecy of Darkness hook; Legion
  agents withdraw "for now" — open threads for the next saga.
- **Existing game content to align:** `apps/amo/src/data/stories.js` story 0 is EP
  (`mapId: prologue_forest`, characters `['eldrin']`) — expand against this bible;
  generic quests/bosses (`void_general`) in `quests.js` should be renamed to canon
  entities (Malphas/Xarathos/Voraun; Void-Stalker/Squire/etc.).

## DB Sync Log (G-items)

| # | Gap | Status |
|---|---|---|
| G1 | 6 book-canon characters missing (Oren, The Hermit, Malphas, Xarathos, Voraun, The Shadow Balrog) | fixed — added with `origin: album` + relationships (`SERVANT_OF`, `ENMITY_WITH`, `KILLED`, `PART_OF_RACE`) |
| G2 | 4 locations missing (Fire Gate, Inferno Labyrinth, Ruins of Eldoria, The Ancient Door); Heartstone Chamber reparented under Ruins of Eldoria | fixed |
| G3 | `LOCATED_AT` too coarse (Plane-level) | fixed — 12 songs now point at specific locations |
| G4 | No `LYRICAL_POV` on EP songs | fixed — Eldrin on all 12 |
| G5 | No `OCCURRED_IN` Event→Song links | fixed — 3 album events linked + 7 granular book-canon events added with `PRECEDES` chain |
| G6 | "Eldoria's Prophecy" is an album title, not an in-world prophecy node (in-world = *The Living Lock*) | note — no node added; keep media/prophecy distinct |
| G7 | The Hermit's hut (Sylvan Sanctuary) vs The Hidden Cabin (Emerald Fields, Kael's exile home) | note — distinct; do not merge |
