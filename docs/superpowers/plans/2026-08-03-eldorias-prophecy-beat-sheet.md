# *Eldoria's Prophecy* — Beat Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the first complete draft of the *Eldoria's Prophecy* novel (~75-90k words) part-by-part, establishing new canon (Oren, the Hermit, the three Void Generals, the race for the Heartstone, the Shadow Balrog as untamable final guardian) and logging every chapter against the album's 12 tracks.

**Architecture:** Three-part novel mirroring the album's three acts, with prologue, epilogue, and 4 interludes. Third-person limited on Eldrin; interludes switch POV (Vorgos / Kael+Anya). Part-by-part drafting with a user review gate per part, canon files updated per part, and a fidelity log per chapter.

**Tech Stack:** Markdown prose in `books/eldorias_prophecy/`. No code, no build system. Canon additions propagate to `data/lore/` and Neo4j in a later synchronization task (out of scope here).

## Global Constraints

- **Language:** English. All prose, canon files, and names in English.
- **Canon:** Book is canon. New facts (Oren, Hermit, Generals, race, Balrog) must not contradict the album XML (`data/lore/xmls/processed_albums/Eldorias_Prophecy.xml`) or `world_lore.md`.
- **Blindness:** Eldrin NEVER goes blind, literal or at the end. "The Blind Prophet" is purely metaphoric (he sees cosmic truth others cannot).
- **Shadow Balrog:** Untamable, subservient to no one, never commanded by any character. It is the final guardian of the Heartstone's door.
- **Race premise:** The three Void Generals independently hunt the Heartstone for Nyktoros. Vorgos activates Eldrin in 500 AGD to beat them to it. Evidence of the Generals' hunts appears in every Part.
- **Tone:** Dark fantasy, character-driven, melancholy + mythic. Prose quality at a publishable level — no AI-trope clichés ("shadows in the night", "echoes of time").
- **POV:** Main narrative = third-person limited on Eldrin. Interludes = Vorgos (Aether) or Kael+Anya (Underworld). Never break Eldrin's head in main chapters.
- **Magic rules:** Scholar-Magic is runic/geometric/blue-violet, Aether-based, costly, and acts as a "lighthouse" attracting shadow-predators. Eldrin uses it sparingly.
- **Quest duration:** ~1 year with gentle season overlap: winter departure, spring forest, summer inferno, autumn ruins, winter return.
- **Word targets per part:** Prologue ~2k, Part I ~15k, Part II ~38k, Part III ~25k, Epilogue ~2k, Interludes ~6k. Total ~88k.
- **Per-part review gate:** User reviews each Part before the next begins.

## File Structure

```
books/eldorias_prophecy/
  manuscript/
    prologue/ch01-echoes-of-stone.md
    part-i/ch02-the-vision.md
    part-i/ch03-the-scholars-life.md
    part-i/ch04-odysseys-dawn.md
    part-i/ch05-the-oblivious-road.md
    part-ii/ch06-the-ascent.md
    part-ii/ch07-whisperer-of-doubt.md
    part-ii/ch08-descent.md
    part-ii/ch09-sylvan-sanctuary.md
    part-ii/ch10-the-hermit.md
    part-ii/ch11-the-fire-gate.md
    part-ii/ch12-treacherys-bite.md
    part-ii/ch13-the-solitary-path.md
    part-ii/ch14-infernos-trial.md
    part-ii/ch15-pyre-lord.md
    part-ii/ch16-the-crucible.md
    part-iii/ch17-eldorias-heartbeat.md
    part-iii/ch18-the-pulse.md
    part-iii/ch19-the-silent-executioner.md
    part-iii/ch20-shadow-balrog.md
    part-iii/ch21-the-weight-of-eternity.md
    part-iii/ch22-the-return.md
    part-iii/ch23-dawns-embrace.md
    epilogue/epilogue-the-architects-design.md
    interludes/i1-the-aether.md
    interludes/i2-the-lock.md
    interludes/i3-the-legion.md
    interludes/i4-the-warden.md
  outlines/
    master-beat-sheet.md     # this document (copy)
  canon/
    characters.md            # Oren, the Hermit, the 3 Generals, Balrog
    locations.md             # Summit, Sanctuary, Inferno, Ruins, Heartstone chamber
    magic.md                 # Scholar-Magic, Aether Sight, Compass, Heartstone
    events.md                # race timeline, General hunts, timestamps
    fidelity-log.md          # per-chapter track coverage
```

## Task Breakdown

### Task 0: Scaffold the book repo

**Files:**
- Create: `books/eldorias_prophecy/manuscript/prologue/ch01-echoes-of-stone.md`
- Create: `books/eldorias_prophecy/canon/characters.md`, `locations.md`, `magic.md`, `events.md`, `fidelity-log.md`
- Create: `books/eldorias_prophecy/outlines/master-beat-sheet.md` (copy of this plan)

**Interfaces:**
- Produces: `canon/*.md` scaffolds with headers only (TBD content filled in later tasks). The `fidelity-log.md` uses this table format:

```markdown
| Chapter | Track(s) covered | POV | Word target | Status |
|---|---|---|---|---|
```

- [ ] **Step 1: Create directories and canon scaffolds**

```bash
mkdir -p books/eldorias_prophecy/{manuscript/prologue,manuscript/part-i,manuscript/part-ii,manuscript/part-iii,manuscript/epilogue,manuscript/interludes,outlines,canon}
```

Each `canon/*.md` file gets a title + one-line purpose + empty section headers matching what later tasks will fill:
- `characters.md`: Oren / The Hermit / Malphas / Xarathos / Voraun / The Shadow Balrog
- `locations.md`: Summit of Despair / Sylvan Sanctuary / Fire Gate / Inferno Labyrinth / Ruins of Eldoria / Heartstone chamber
- `magic.md`: Scholar-Magic / Aether Sight / Compass of the Storm / Heartstone of Creation
- `events.md`: The Gap discovery / The vision / The race / The betrayal / The Balrog / The vigil

- [ ] **Step 2: Create the fidelity log scaffold with all 28 chapters pre-listed**

Fill `canon/fidelity-log.md` rows for every chapter in the File Structure above (Status = "pending").

- [ ] **Step 3: Create `ch01-echoes-of-stone.md` with a header comment block**

Header block format (used for every chapter):
```markdown
# Ch. 1 — Echoes of Stone
<!-- Track: 1. Echoes of Stone | POV: Eldrin | Date: 501 AGD, early winter -->
```

- [ ] **Step 4: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): scaffold Eldoria's Prophecy repo structure"
```

---

### Task 1: Prologue — "Echoes of Stone" (~2k words)

**Files:**
- Create: `books/eldorias_prophecy/manuscript/prologue/ch01-echoes-of-stone.md`

**Interfaces:**
- Consumes: Task 0 chapter skeleton.
- Produces: Full chapter 1 prose. Establishes Eldrin's voice (scholar, precise, melancholic), the tower setting, and the "Gap."
- Canon additions: **the Gap** (written history is incomplete — 0 GD erased), Eldrin's relationship to The Forbidden Archive.

- [ ] **Step 1: Draft chapter 1**

Scene beats:
1. Eldrin in his tower at night, surrounded by strata samples and journals. Establish the Silent Century: peaceful, wrong.
2. He studies geological strata and finds "Echoes" — anomalies suggesting the world has catastrophically reset more than once. The Great Darkness is "stories half-told."
3. He visits The Forbidden Archive mentally/historically — every record of 0 GD is missing or self-contradictory. This is his life's obsession: the Gap.
4. First shadow-sense: the Aether feels thin; a distant wrongness like a crack in glass. (Plant the race: he hears rumors of travelers asking about "the Anchor" — the Legion is searching too, quietly.)
5. The candle flickers; the room dissolves. The vision begins. End chapter on the hook.

- [ ] **Step 2: Review gate — user reads chapter**

- [ ] **Step 3: Revision pass** — revise for character/voice/consistency per user feedback; establish Eldrin's scholarly voice firmly.

- [ ] **Step 4: Polish pass** — prose quality; no AI-trope clichés.

- [ ] **Step 5: Fill canon additions**

`canon/events.md` gets the **Gap** entry: history of 0 GD was actively erased/silenced; Eldrin has spent his career proving the record is a lie.

- [ ] **Step 6: Update fidelity log** — mark ch01: Track 1, POV Eldrin, ~2k, done.

- [ ] **Step 7: Commit**

```bash
git add books/eldorias_prophecy/manuscript/prologue books/eldorias_prophecy/canon
git commit -m "feat(book): draft chapter 1 - Echoes of Stone"
```

---

### Task 2: Part I — The Call of the Architect (~15k words, ch 2-5)

**Files:**
- Create: `part-i/ch02-the-vision.md`, `part-i/ch03-the-scholars-life.md`, `part-i/ch04-odysseys-dawn.md`, `part-i/ch05-the-oblivious-road.md`

**Interfaces:**
- Consumes: ch01 (Gap established, vision hook).
- Produces: The vision, the Compass of the Storm, Eldrin's departure, first shadow-touched encounter, and **Oren's introduction** (meets on the road, per lyrics "I met a traveler on the road").
- Canon additions: **Compass of the Storm**, **Vorgos's command**, **Oren's cover identity**, the **race premise** (first evidence a General hunts the Stone).

- [ ] **Step 1: Draft chapter 2 — "The Vision" (~3.5k)**

Scene beats:
1. Vorgos pulls Eldrin out of time to 900 AGD. Surreal, distorted world. The "Violet Sky" — the sky is violet and blood; the Star-Guard (Kael) shatters.
2. A woman (Anya) weeps over a broken man. Eldrin feels the resonance — a "killing sound."
3. Vorgos manifests as a Giant Eye / storm. Speaks: "The Lock will fail. Find the Anchor." Not a request — a command from the Aether.
4. The Compass of the Storm is burned into his mind: a needle that always points to the Heartstone.
5. Vision ends with "Rise, Eldrin, the century is late." He wakes in his tower.

- [ ] **Step 2: Draft chapter 3 — "The Scholar's Life" (~3.5k)**

Scene beats:
1. Waking aftermath: the coordinates burned into his mind. He tests the compass — it pulls east, to the ruins.
2. Eldrin's counterargument with himself: he is a historian, not a hero. Why him? He researches: the Anchor = Heartstone of Creation, "Cosmic Insulator." Found in fragments in The Forbidden Archive.
3. He decides the Gap is worth it: if history was erased once, it can be erased again. He will go.
4. Prepares: staff, journals, rune-kits. Locks the tower, knowing he may never return. (Lyrics anchor: "The scholar's life is mine to live no more.")

- [ ] **Step 3: Draft chapter 4 — "Odyssey's Dawn" (~4k)**

Scene beats:
1. Departure at dawn. "Under a sky of terrifying blue." The tower door seals behind him.
2. First day on the road: villages of wood and thatch; simple lives; no one knows the fire in the sky. Eldrin is a lighthouse — villagers feel uneasy near him.
3. First shadow-touched encounter: a Void-Stalker pack at dusk. Eldrin uses Scholar-Magic for the first time on-page — runic ward, blue/violet. The fight works but the light attracts more. Lesson: magic is expensive.
4. He decides to travel as a wanderer-scholar, no titles. The compass pulls east.

- [ ] **Step 4: Draft chapter 5 — "The Oblivious Road" (~4k)**

Scene beats:
1. Travel montage (weeks): trade roads, inns, rumors. Echoes of travelers asking about "an Anchor," "a heart of stone" — the Legion's agents are asking quietly. First concrete evidence of the race.
2. Meets **Oren** on the road: a traveling scholar who "helps bear the heavy load," speaks of lore and ancient kings. Charming, warm, knowledgeable. Eldrin cautiously warms to him. (Oren's cover: a chronicler researching lost libraries.)
3. Oren offers to travel together. Eldrin, after the loneliness of the road, accepts against his better judgment. Foreshadowing note: Oren asks one question too many about Eldrin's destination.
4. Part I close: the two of them heading toward the mountains. The compass needle trembles — closer.

- [ ] **Step 5: Review gate — user reads all 4 chapters of Part I**

- [ ] **Step 6: Revision pass** — revise for character/voice/consistency per user feedback; ensure Oren's introduction reads as genuinely warm, not suspicious.

- [ ] **Step 7: Polish pass** — prose quality; no AI-trope clichés; verify the lighthouse/magic-is-costly rule is demonstrated, not stated.

- [ ] **Step 8: Fill canon additions**

- `canon/magic.md`: **Compass of the Storm** (mental compass to the Heartstone, planted by Vorgos; needle trembles near the target); **Scholar-Magic** rules on-page (runic, blue/violet, costly, lighthouse effect).
- `canon/characters.md`: **Oren** — cover identity (chronicler), appearance, manner, the feigned scholarly persona; note that he joins Eldrin on the road.
- `canon/events.md`: **The race** — Legion agents are quietly asking about "the Anchor" in 500 AGD.

- [ ] **Step 9: Update fidelity log** — ch02-05: Tracks 2, 3; POV Eldrin; ~15k total; done.

- [ ] **Step 10: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft Part I - The Call of the Architect"
```

---

### Task 3: Interlude 1 — The Aether (Vorgos) (~1.5k)

**Files:**
- Create: `manuscript/interludes/i1-the-aether.md`

**Interfaces:**
- Consumes: Part I canon (race premise, Eldrin's activation).
- Produces: Vorgos's perspective. Establishes WHY now, the cost of moving Eldrin, and that the Generals are hunting.
- Canon additions: Vorgos's operational logic, the timing decision.

- [ ] **Step 1: Draft interlude 1**

Scene beats:
1. Vorgos in the Aether — the dimension between planes. The Rift glows; he reads the resonance like a ledger.
2. Kael's Lock is decaying faster than predicted. The Generals have caught the Heartstone's scent — three signatures converging on the ruins.
3. He reflects on Eldrin: not the strongest, not the chosen of prophecy — the *available* piece. "A pawn upon a cosmic board."
4. End beat: Vorgos acknowledges the tragedy he is inflicting — and does it anyway. Pragmatism, not malice.

- [ ] **Step 2: Review gate — user reads**

- [ ] **Step 3: Fill canon additions** — `canon/events.md`: Vorgos's timing; three Generals' signatures converge.

- [ ] **Step 4: Update fidelity log** — I1: interlude, POV Vorgos, ~1.5k, done.

- [ ] **Step 5: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft interlude 1 - the Aether"
```

---

### Task 4: Part II — Trials and Tribulations (~38k words, ch 6-16)

**Files:**
- Create: `part-ii/ch06-ascent.md` through `part-ii/ch16-crucible.md` (11 files)

**Interfaces:**
- Consumes: Part I (Eldrin + Oren on the road), I1 (Generals hunting).
- Produces: Malphas confrontation, Sylvan Sanctuary + Hermit + Aether Sight, the betrayal, the solitary path, Inferno's Trial + Xarathos, the crucible rebirth.
- Canon additions: **Malphas** (Summit, Whisperer of Doubt), **the Hermit** (failed Keeper, Balrog-defeated, spirit bound to the Elemental), **Aether Sight**, **Xarathos** (fallen Aurorian), **the betrayal details** (Voraun orchestrated via Oren).

- [ ] **Step 1: Draft chapter 6 — "The Ascent" (~3k)**

Scene beats:
1. Winter ascent into the mountains. Oren and Eldrin share the burden; Oren proves useful and companionable.
2. The Summit of Despair: the cold bites; "ice-kissed peaks, a barren expanse." Doubt creeps in. Eldrin's inner monologue: is he enough?
3. Signs of the Legion: a frozen camp of corpses, a Crag-Fiend with violet crystals — evidence someone (Malphas) is ahead or has claimed this pass.
4. Oren's loyalty tested lightly; he reassures Eldrin. (Foreshadow of the mask.)

- [ ] **Step 2: Draft chapter 7 — "Whisperer of Doubt" (~3.5k)**

Scene beats:
1. Blizzard. Frost-Shades and Gloom-Beaks harass them. The Aether thin.
2. **Malphas** reveals himself — the Whisperer of Doubt. He feeds on isolation; creates illusions of Eldrin's allies and past failures.
3. Combat via Aether Sight (seed the mechanic) + runic wards. Oren "fights beside him" but hesitates at a key moment — Malphas's illusions show Oren as the betrayer, but Eldrin dismisses it. (Dramatic irony: the vision was true.)
4. Eldrin breaks Malphas's hold, forces the General to retreat — not killed. Malphas vows he'll have the Stone. (The Generals are rivals for the same prize; Malphas also wants to kill the others' agents.)
5. Victory, but Eldrin is shaken — the illusion showed Oren's face.

- [ ] **Step 3: Draft chapter 8 — "Descent" (~2.5k)**

Scene beats:
1. Survival trek down the mountain; the toll on body and mind.
2. Oren notices Eldrin's distance; asks what the illusions showed. Eldrin lies. Trust is cracking quietly.
3. A moment of shared warmth — campfire, Oren's stories of "lost libraries" — rebuilding trust. End on the deceptive calm.

- [ ] **Step 4: Draft chapter 9 — "Sylvan Sanctuary" (~3.5k)**

Scene beats:
1. "A valley green amidst the snow" — spring has arrived early; impossible. The forest is alive.
2. The **Elemental** blocks the way: "Why do you seek the light of day?" A trial of intent — the Elemental judges whether Eldrin's quest is for glory or for need.
3. Eldrin passes by speaking the truth: he seeks the Anchor to prevent a catastrophe he was shown, not for himself. The Elemental admits them.
4. The forest: magical plants, "strange creatures," a sense of peace. Aether Sight begins manifesting on its own.

- [ ] **Step 5: Draft chapter 10 — "The Hermit" (~4k)**

Scene beats:
1. They find the hermit's hut; the guide is half-present, half-spirit. **The Hermit** — the failed former Keeper.
2. His story: he once guarded the Heartstone. The Shadow Balrog came; he was **defeated**, and bound his spirit to the forest's Elemental to survive. The forest is his lingering will.
3. He grants **Aether Sight** (formal mastery) and reveals the truth of the Stone: it is a "Cosmic Insulator" — it stabilizes, it holds; it is not a weapon and never will be. Eldrin's purpose is to guard a cure that does nothing yet.
4. Warning: the Balrog cannot be commanded or bargained with. The only way past it is to *not be its enemy* — to be the thing the Stone is meant for. (Sets up ch20.)
5. Foreshadow: Oren is quiet, taking notes. The Hermit watches Oren coldly but says nothing directly.

- [ ] **Step 6: Draft chapter 11 — "The Fire Gate" (~3k)**

Scene beats:
1. Departure from the sanctuary; spring travel; the air warms.
2. Oren is increasingly interested in the exact location of the Stone, couched as scholar's curiosity. Eldrin, trusting, shares more than he should.
3. They reach the entrance to the Fire Gate — the way to the Inferno Labyrinth. The compass needle spins — the Stone is close now.
4. Night before the descent: Oren asks one final question — "What will you do when you find it?" Eldrin answers: guard it. Oren's smile doesn't reach his eyes.

- [ ] **Step 7: Draft chapter 12 — "Treachery's Bite" (~4k)**

Scene beats:
1. The betrayal at the threshold of the Fire Gate — where snow still bites and the ash has begun. Oren strikes — "the dagger that the shadows bring." He seeks the Stone "to break the seal," not to guard it.
2. Oren's reveal: he is an agent of **Voraun**, the Silent Executioner, tasked to learn the Stone's location and take it. His scholarship was a mask; his friendship was a job.
3. Fight against the corrupted Oren (Voraun's touch gives him shadow-blades). Eldrin is wounded, betrayed, left for dead in the snow-line ash.
4. End beat: Oren takes the compass coordinates from Eldrin's notes and heads into the labyrinth ahead of him. Eldrin survives — barely.

- [ ] **Step 8: Draft chapter 13 — "The Solitary Path" (~3k)**

Scene beats:
1. "I leave him bleeding in the snow" inverted: he leaves *himself* behind — the trusting scholar dies in the snow-line. He patches his wounds, eats, plans.
2. Vorgos's silence. The compass still points — Oren doesn't have the real compass, only notes. The race is still on.
3. Resolution: "The solitary path, I walk alone. No friends to lose, no trust to break." He embraces the isolation. He is the Silent Guardian before the Stone.
4. He descends into the Inferno Labyrinth alone.

- [ ] **Step 9: Draft chapter 14 — "Inferno's Trial" (~3.5k)**

Scene beats:
1. The labyrinth: magma flows, "a wall of fire, a gate of flame that calls me by my given name." It knows his name — the Legion has seeded its defenses with his identity.
2. Puzzle-trial: Obsidian Golems require specific rune-frequencies; Magma-Eaters and Cinder-Souls. He uses Aether Sight + Scholar-Magic sparingly.
3. Heat burns away doubt: the crucible of the mountain's core. He refuses to fall.
4. End beat: he reaches the heart-chamber and finds **Xarathos** waiting — the General got there first. The race is lost... or is it? Xarathos cannot take the Stone either.

- [ ] **Step 10: Draft chapter 15 — "Pyre-Lord" (~3.5k)**

Scene beats:
1. **Xarathos**, the Pyre-Lord — a fallen Aurorian corrupted by the Thirst. He controls the corruption of the flame. He wants the Stone to unmake the Lock, to let the Void in.
2. Why Xarathos hasn't taken it: the Stone rejects unworthy hands — touching it burns the unworthy. He needs someone the Stone *accepts* to carry it out. Eldrin is that someone. (This is why all three Generals need Eldrin alive, not dead — a delicious catch-22 that explains why he keeps surviving.)
3. Combat: the crucible of flame. Xarathos steals mana for a supernova; Eldrin denies it with a rune-drain counter, finds the crack in his Thirst-driven arrogance.
4. Victory: Xarathos is destroyed. His dying words: "Voraun will have you at the door. He has been waiting the longest."

- [ ] **Step 11: Draft chapter 16 — "The Crucible" (~3k)**

Scene beats:
1. Rebirth imagery: "ashes fall, a new dawn breaks." Eldrin emerges changed — the doubt is burned out of him.
2. Summer is at its peak. He walks the volcanic ridge; the compass sings — the Ruins of Eldoria are close.
3. Close Part II: he is alone, unbreakable, and the final door waits. (End on the rising threat of Voraun.)

- [ ] **Step 12: Review gate — user reads all 11 chapters of Part II**

- [ ] **Step 13: Revision pass** — revise the batch for character/voice/consistency per user feedback; check the race premise and Oren's mask hold through every scene.

- [ ] **Step 14: Polish pass** — prose quality: scan for AI-trope clichés ("shadows in the night", "echoes of time") and replace; verify runic/Scholar-Magic language is consistent.

- [ ] **Step 15: Fill canon additions**

- `canon/characters.md`: **Malphas** (Whisperer of Doubt — illusions, feeds on isolation, rivals the other Generals), **The Hermit** (former Keeper, Balrog-defeated, spirit bound to the forest's Elemental, granted Aether Sight), **Xarathos** (Pyre-Lord — fallen Aurorian, Thirst-corrupted, destroyed), **Voraun** (Silent Executioner — orchestrator of Oren's betrayal, waits at the door), **Oren full arc** (cover → agent → corrupted → defeated by Eldrin).
- `canon/magic.md`: **Aether Sight** (sees hidden paths/truth, reveals illusions, "predicts" Balrog; mastered at the Sanctuary).
- `canon/locations.md`: Summit of Despair (Malphas's territory), Sylvan Sanctuary (Elemental + Hermit), Fire Gate, Inferno Labyrinth (Xarathos's territory), the volcanic ridge.
- `canon/events.md`: The betrayal (Voraun orchestrated via Oren); Malphas forced to retreat; Xarathos destroyed; the Stone rejects unworthy hands (the reason the Generals keep Eldrin alive).

- [ ] **Step 16: Update fidelity log** — ch06-16: Tracks 4, 5, 6, 7, 8; POV Eldrin; ~38k; done.

- [ ] **Step 17: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft Part II - Trials and Tribulations"
```

---

### Task 5: Interlude 2 — The Lock (Kael + Anya) (~1.5k)

**Files:**
- Create: `manuscript/interludes/i2-the-lock.md`

**Interfaces:**
- Consumes: Part II (Eldrin entering the ruins).
- Produces: The Underworld's perspective — Kael's Lock failing, Anya's vigil. The stakes behind the quest.
- Canon additions: the Lock's physical decay; Anya's endurance.

- [ ] **Step 1: Draft interlude 2**

Scene beats:
1. The Underworld Sanctuary. Anya watches the sealed prison; the resonance is a constant low scream.
2. Kael, the Living Lock, is aging/killing — the resonance erodes him. He is stoic; Anya is angry and helpless.
3. They speak of Eldrin — the name Vorgos whispered. A stranger carries their survival.
4. Close: a fissure in the prison — small, wrong, violet. Time is running out.

- [ ] **Step 2: Review gate — user reads**

- [ ] **Step 3: Fill canon additions** — `canon/events.md`: Lock decay status at this point in the timeline.

- [ ] **Step 4: Update fidelity log** — I2: interlude, POV Kael/Anya, ~1.5k, done.

- [ ] **Step 5: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft interlude 2 - the lock"
```

---

### Task 6: Part III — The Heartstone & The Eternal Guard (~25k words, ch 17-23)

**Files:**
- Create: `part-iii/ch17-eldorias-heartbeat.md` through `part-iii/ch23-dawns-embrace.md` (7 files)

**Interfaces:**
- Consumes: Part II (Eldrin unbreakable, nearing the ruins), I2 (the Lock failing).
- Produces: The ruins, the Heartstone discovery, Voraun's confrontation, the Shadow Balrog, the 400-year condition, the return, the vigil.
- Canon additions: **Voraun** full arc, **the Shadow Balrog** (untamable final guardian), **the Heartstone's nature**, **the 400-year vigil**, Vorgos's final reveal.

- [ ] **Step 1: Draft chapter 17 — "Eldoria's Heartbeat" (~3.5k)**

Scene beats:
1. The Ruins of Eldoria: "ancient ruins hum a tune beneath the pale and silent moon." Ghostly reconstruction — Eldrin "Witnesses" the golden age via the Heartstone's echo. (Ties to the game's Aetheric Witness mechanic.)
2. The realm is a graveyard of the past — Eldrin the historian sees his people's deepest history for the first time.
3. He finds the approach to the Heartstone chamber. Evidence Voraun has been here — a signature, a guarded gate. The General has held this ground longest.
4. End beat: the chamber door.

- [ ] **Step 2: Draft chapter 18 — "The Pulse" (~3k)**

Scene beats:
1. The Heartstone of Creation — a "pulse of light, a rhythm slow." Understated. A calm, stabilized resonance. Anti-climactic by design.
2. Eldrin touches it — it accepts him (echo of ch15: unworthy hands burn). The "Heartbeat" of Eldoria syncs to his own.
3. He understands its purpose: to hold, to stabilize, to wait. It is not glory; it is the weight of a held breath.
4. Voraun appears at the chamber's threshold. "The Silent Executioner."

- [ ] **Step 3: Draft chapter 19 — "The Silent Executioner" (~4k)**

Scene beats:
1. Voraun: the tactical mind behind Oren's betrayal. He has guarded this ground, waiting for Eldrin to carry the Stone out.
2. Confrontation: Voraun is fast, silent, parries magic — a high-speed duel. He uses runic reflection.
3. Eldrin wins by weaponizing Voraun's need (the Stone rejects unworthy hands — Voraun can't touch it). He drives Voraun into the Stone's ward, which burns the General.
4. Voraun's final moment: as he dies, the deeper truth — he was not fighting for the Stone's power but to *prevent* it being used, on orders from beyond the Legion. (Seed for the next saga chapter / The Prophecy of Darkness.)
5. End beat: silence. The door beyond. Something huge waits.

- [ ] **Step 4: Draft chapter 20 — "Shadow Balrog" (~4k)**

Scene beats:
1. The final door. The **Shadow Balrog** — "a shadow rises from the floor, the guardian of the ancient door." Ancient, untamable, subservient to no one. It hungers for the light Eldrin holds.
2. Eldrin tries force — fails. The Balrog is beyond physical or magical power. (The Hermit's warning pays off: it cannot be commanded or bargained with.)
3. The resolution: Eldrin stops fighting. He offers the Stone's truth — not as a weapon, but as what it is: the thing that holds. He stands not as its conqueror but as its *intended* guardian. The Balrog, which exists to protect the door from misuse, cannot deny the one the Stone accepts.
4. The Balrog yields the way — not defeated, not commanded; *satisfied*. This is the hardest victory: mastery through humility.

- [ ] **Step 5: Draft chapter 21 — "The Weight of Eternity" (~3.5k)**

Scene beats:
1. Vorgos steps from time, "a storm of grey": "Put down the Stone, and walk away." He tests Eldrin one last time.
2. Eldrin refuses to walk away. Vorgos reveals the true condition: he must guard the Stone for **400 years**, until a hero not yet born needs it in 900 AGD.
3. The crushing weight: "A hundred years, and then three more." His friends will die; his world will change; he will remain.
4. Eldrin's choice — tragic acceptance. He is the bridge between past tragedy and future salvation.

- [ ] **Step 6: Draft chapter 22 — "The Return" (~3k)**

Scene beats:
1. The journey home with the Stone; seasons shift around him. The world of 500 AGD continues its oblivious life.
2. He passes the places of Part I — the villages, the road where Oren joined him. What he cannot tell anyone.
3. He is already becoming the "Blind Prophet" in spirit — blind to ordinary life, seeing only the timeline.
4. He arrives at Thaloria. The tower stands as he left it.

- [ ] **Step 7: Draft chapter 23 — "Dawn's Embrace" (~4k)**

Scene beats:
1. He re-seals the sanctum, locks the gate: "I am the watcher, here and now."
2. The vigil begins. Seasons lapse in montage — the years fold. His sight remains; his life narrows to the Stone.
3. He accepts: the cure that does nothing yet, held in the dark for a future he will never see.
4. Close: dawn breaks; the Star-Guard (Kael) is not ready yet. Eldrin waits. "Until the Star-Guard needs the key."

- [ ] **Step 8: Review gate — user reads all 7 chapters of Part III**

- [ ] **Step 9: Revision pass** — revise for character/voice/consistency per user feedback; ensure the Balrog confrontation reads as humility-mastery, not command.

- [ ] **Step 10: Polish pass** — prose quality; no AI-trope clichés; verify Eldrin never goes blind and the vigil montage carries the emotional weight.

- [ ] **Step 11: Fill canon additions**

- `canon/characters.md`: **Voraun** (Silent Executioner — defeated by Eldrin using the Stone's ward; dying words seed the next saga), **The Shadow Balrog** (ancient, untamable, guardian of the door; yields to the Stone's true guardian, not to force).
- `canon/locations.md`: Ruins of Eldoria, Heartstone chamber, the final door.
- `canon/magic.md`: **Heartstone of Creation** (Cosmic Insulator; rejects unworthy hands; accepts its intended guardian; syncs resonance).
- `canon/events.md`: The final confrontation with the Balrog (won through humility, not command); Vorgos reveals the 400-year condition; Eldrin accepts; the vigil begins (winter ~501/502 AGD).

- [ ] **Step 12: Update fidelity log** — ch17-23: Tracks 9, 10, 11, 12; POV Eldrin; ~25k; done.

- [ ] **Step 13: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft Part III - The Heartstone & The Eternal Guard"
```

---

### Task 7: Interludes 3 & 4 (~3k total)

**Files:**
- Create: `manuscript/interludes/i3-the-legion.md`, `manuscript/interludes/i4-the-warden.md`

**Interfaces:**
- Consumes: Part III events.
- Produces: The Legion's reaction to the Generals' failure (I3), and Kael/Anya's vigil closing the book (I4).

- [ ] **Step 1: Draft interlude 3 — "The Legion" (POV: Vorgos, ~1.5k)**

Scene beats:
1. Vorgos reads the aftermath: three General signatures extinguished. The Legion's high command notices; its agents withdraw — for now.
2. Vorgos reflects on the plan holding. The Stone is in safe hands. The universe is bought 400 years.
3. Close: a note of the cost — he has made Eldrin a monument to a purpose he cannot share. "The Architect has moved a pawn today."

- [ ] **Step 2: Draft interlude 4 — "The Warden" (POV: Kael + Anya, ~1.5k)**

Scene beats:
1. Back in the Underworld, the resonance steadies for the first time in decades. The Stone is in place somewhere far above.
2. Kael and Anya share a moment of fragile hope — a stranger they will never meet has bought their future.
3. Close: the sealed prison, quiet now. They do not know the guardian's name. But the book's reader does.

- [ ] **Step 3: Review gate — user reads both interludes**

- [ ] **Step 4: Update fidelity log** — I3, I4: interludes, ~1.5k each, done.

- [ ] **Step 5: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft interludes 3 and 4"
```

---

### Task 8: Epilogue — The Architect's Design (~2k)

**Files:**
- Create: `manuscript/epilogue/epilogue-the-architects-design.md`

**Interfaces:**
- Consumes: ch23 (vigil begun), I3 (Legion withdrawn).
- Produces: The sequel hook to *The Prophecy of Darkness*.
- Canon additions: The seed of the next saga chapter.

- [ ] **Step 1: Draft the epilogue**

Scene beats:
1. Years into the vigil. Eldrin, still sighted, has become legend already — "the Blind Prophet," the scholar who vanished and came back silent.
2. Vorgos visits one last time (in a dream). He shows Eldrin a glimpse of the far future — the Star-Guard will rise, and the key will finally be used. A hint of the next saga: the Prophecy of Darkness.
3. Vorgos gives the one gift he can: certainty. "You will not see it, but it will come."
4. Close: Eldrin alone at the window, dawn, the Heartstone steady at his side. The book ends on the weight and the promise.

- [ ] **Step 2: Review gate — user reads**

- [ ] **Step 3: Revision pass** — revise per user feedback; ensure the hook to *The Prophecy of Darkness* is seeded without resolving it.

- [ ] **Step 4: Polish pass** — prose quality; no AI-trope clichés.

- [ ] **Step 5: Fill canon additions** — `canon/events.md`: the sequel hook (Prophecy of Darkness foreshadowed; Vorgos's promise of certainty).

- [ ] **Step 6: Update fidelity log** — Epilogue: ~2k, POV Eldrin (+Vorgos dream), done.

- [ ] **Step 7: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): draft epilogue - the architect's design"
```

---

### Task 9: Final assembly & consistency pass

**Files:**
- Modify: all manuscript files (as needed)
- Modify: `canon/*.md`, `canon/fidelity-log.md`

**Interfaces:**
- Consumes: Tasks 0-8.
- Produces: A complete, internally consistent first draft.

- [ ] **Step 1: Read the full manuscript end-to-end**

Read every chapter in order (prologue → epilogue). Verify:
- Timeline sanity (seasons advance winter→autumn→winter; quest ~1 year; timestamps in headers don't contradict).
- The race premise holds in all three parts.
- Eldrin never goes blind.
- The Balrog is never commanded.
- Oren's arc is consistent (introduced ch5, betrayed ch12).
- The three Generals are distinct and each has a hunt.

- [ ] **Step 2: Check every chapter against the fidelity log**

Verify each chapter's claimed track coverage in `canon/fidelity-log.md` matches its actual content. Fix mismatches.

- [ ] **Step 3: Fix continuity issues found**

Apply edits directly. Note any deliberate canon changes in the relevant `canon/*.md` file.

- [ ] **Step 4: Produce the book-level canon summary**

Add a final section to each `canon/*.md` titled "## Book Canon Summary" listing the complete set of facts the book establishes for that category — this is the handoff payload for the future game-doc + Neo4j sync task.

- [ ] **Step 5: Final review gate — user reads the full draft**

- [ ] **Step 6: Commit**

```bash
git add books/eldorias_prophecy && git commit -m "feat(book): first complete draft of Eldoria's Prophecy"
```

---

## Self-Review Notes

- **Spec coverage:** All spec sections map to tasks — structure (§2) → Tasks 1-8; characters (§3) → Tasks 2/4/6 canon steps; worldbuilding (§4) → Tasks 2/4/6 canon steps; production process (§5) → Task structure; canon reconciliation (§6) → Tasks 4/6 (Balrog = final boss, Voraun at gates, blindness metaphoric). Game-doc/Neo4j sync is explicitly deferred to a later task.
- **Placeholders:** No TBD/TODO. Every chapter has concrete scene beats.
- **Consistency:** "Aether Sight," "Compass of the Storm," "Heartstone of Creation," "the race," and all character names are used identically across tasks.
- **Canon guardrails enforced:** blindness metaphoric (Task 1, Task 6, Task 8); Balrog untamable (Task 6, Task 9); book-is-canon handoff (Task 9 Step 4).
