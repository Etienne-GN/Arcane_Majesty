# 3/3 — Write docs/3d/LORE_REVIEW.md from /tmp/lore_review/{db,game}.json. Run from the repo root.
import json,re
L='/tmp/lore_review/'
g=json.load(open(L+'game.json')); db=json.load(open(L+'db.json'))
dbn={ (o['name'] or '').lower(): o for o in db }
def indb(name):
    n=name.lower().replace('the ','')
    for k,o in dbn.items():
        if k.replace('the ','')==n: return o
    return None
def status(name):
    o=indb(name)
    if not o: return '🆕 not in DB'
    return '✅ in DB (game-origin)' if o['origin']=='game' else '✅ in DB (album)'
out=[]
P=out.append
P("# Lore review — what the game has that the lore DB doesn't\n")
P("_Gathered 2026-11-19 from the 3D game (`apps/amo3d`), its rules (`packages/rules`), and compared with the Neo4j lore DB on scarif (read only — nothing was written). The DB today: 38 locations, 19 characters, 7 races, 10 organizations, 3 artifacts, 4 prophecies, 38 events, 10 regions (11 nodes already carry `origin: \"game\"`, listed at the end)._\n")
P("**How to review:** tick a box to keep an item as it is (it goes into the DB with `origin: \"game\"`), write a note after it to change it, or strike it (`~~…~~`) to drop it (it then goes out of the game too, or gets renamed). Items marked 📖 are already in the book (canon) but not in the DB. Nothing is added to the DB until you say so.\n")
P("## Summary — the decisions that matter most\n")
P("""These are the new names that would add real canon: places, peoples, institutions, a calendar. Everything else below is smaller (creatures, items, quests, flavour lines).

- [ ] **Valdric** — a land or city with its own siege engineers, miners, assassins, quarrymen, philosophers and old forests. It's named in 7 spell descriptions (`packages/rules/src/data/spells.js`) and appears nowhere else.
- [ ] **The Asran Academy** — a school of magic whose spell-tier classification is "used across Eldoria", with textbooks, banned texts and tournaments (spells.js, 4 mentions).
- [ ] **The Arcane Covenant** (and "Covenant-era" stonework) — founded long ago; the Staff of the First Covenant was "forged at its founding" (items.js, dialogues.js). Note: the DB has the *Crimson* Covenant, which is a different order.
- [ ] **The Twilight Order** — a shadow order with a hidden initiation quest and a legendary dagger, the Twilight Fang (quests.js, items.js).
- [ ] **The Rift-Gate network** — Aetheric Monoliths that "were not built but discovered", used for saving, healing and fast travel. Mentioned in `world_lore.md`, but not in the DB.
- [ ] **The Border Watch** of Graywatch — it guards against the shadow-touched coming out of Whisper-Wood (graywatch.json).
- [ ] **"0 GD"** — a calendar epoch. 📖 It's in the book, but not in the DB.
- [ ] **The Star-Guard** — 📖 in the book's interludes, used in chapter 12's last line, but not in the DB.
- [ ] **Silvara** — a merchant and scout camped in the forest for "twenty years", from the archived 2D game; her quest is still in the rules.
- [ ] **The Citadel of Thaloria** and **the Great Library** — the library-palace on the cliff, after the album cover. The DB only has "Thaloria".
- [ ] **The Lower Town of Thaloria**, **the Thalorian Wilds** (the East Road), **the Mountain** (the Summit Pass and its cairns), **the Corrupted Rim**, **the Hermit's old camp** — game places.
- [ ] **The four dungeons and their bosses** — the Deep Shaft under Iron Hollow (the Prop-Breaker, the Thing in the Deep), the Inferno halls (the Obsidian Warden), the Keepers' Vaults under the Ruins (the Hollow Keeper).
- [ ] **Werewolves as a playable race**, with a human ↔ wolf change; the neutral pack of the Emerald Fields (the Guardians of the Wild are album canon; the playable form is game-only).
- [ ] **116 creature kinds** — no creature is in the DB at all. Decide whether the DB should get a `Creature` label, or keep creatures game-side only.
""")
P("## Possible conflicts with canon — look at these first\n")
P("""- [ ] **Cleaver of Vorgos** (legendary item, items.js): “The warlord Vorgos's legendary blade.” The DB has Vorgos as the *Universal Sentinel; Master Narrator* — not a warlord. Rename the item, or rewrite its line.
- [ ] **“the Crimson Covenant” (DB) vs “the Arcane Covenant” (game)** — two different covenants, or one? If one, the game's items and Silvara's line should use the canon name.
- [ ] **Voraun fought in the Ruins (ch. 9)** — the DB calls Voraun “a subtraction in the Aether; quiet, patient, disciplined”; the game makes him a duelist who turns spells back until the Heartstone's ward burns him. Check against the book.
- [ ] **The Balrog fight's look** (0.16.1 model: a winged giant of shadow and fire with a flame sword and whip) — the DB says only *The Shadow Balrog*; check the look against the album and book.
""")
# ---------- places ----------
P("## 1. Places\n")
P("### 1.1 Regions (maps built from `apps/amo3d/src/content/regions/*.json`)\n")
for r in sorted(g['regions'],key=lambda r:r['name']):
    P(f"- [ ] **{r['name']}** (`{r['id']}`) — {status(r['name'])}")
    if r['lore']: P(f"  - Lore line: {r['lore']}")
    if r['landmarks']: P(f"  - Landmarks: {', '.join(x for x in r['landmarks'] if x)}")
    for t in r['signs']:
        if t: P(f"  - Sign: “{t}”")
    if r['gates']: P(f"  - Rift-Gate monoliths: {', '.join(x for x in r['gates'] if x)}")
P("")
P("### 1.2 Places built in code\n")
places=[("Thaloria Glade","the vale around Eldrin's tower (the first map, `content/eldrinVale.js`); the DB has Eldrin's Tower, not the glade"),
("The Thalorian Wilds / the East Road","the forest road east of Thaloria (`content/eastRoad.js`), with the Old Waystone, the Shepherd's Lean-to (where Oren waits) and the East Road Monolith"),
("The Hollow","a cave behind a cave mouth on the East Road (2D: east_road_cave)"),
("The Mountain — Summit of Despair range","(`content/mountain.js`) the ridge north of Thaloria: one trail up the south flank, the Summit Pass with a ring of standing stones (Malphas's fight), and a river and bridge down to the Sylvan Sanctuary's gate. The DB has Summit of Despair as one location."),
("The cairns","Base camp, the Shelf of Sighs, the Widow's Ledge, the Summit Pass, the Cloudbreak, the Riverwatch, plus the Rope Bridge and two ice caves — named spots on the trail"),
("Widow's Overlook / the Rime Hollow / the Frozen Basin","spots on the Summit approach (2D summit map); \"The Widow's Watch\" is a shrine quest there"),
("The Corrupted Rim","the greyed edge of the Sylvan Sanctuary (side quest Seeds of the Valley) — already listed as a DB sync owed"),
("The Hermit's old camp","past the Sanctuary's western rim on a path only Aether Sight shows (The Hermit's Debt) — already listed as a DB sync owed"),
("The Citadel of Thaloria, the Great Library","the library-palace on its cliff (`content/citadelLibrary.js`); the Forbidden Archive below it is in the DB"),
("The North Gate, the South Gate, the East Gate, the West Gate, the Lookout","Thaloria's gates and the raised lookout over the gorge (`content/thaloria.js`)"),
("Thaloria's interiors","the Inn and its cellar, the market hall, the smithy, the temple, the barracks, the Bell Tower, the manor, the alchemist's, the Archivist's Guild (the guild is in the DB), houses"),
("Eldrin's Tower inside","the Hall, the Study, the Crypt"),
("The Deep Shaft (Iron Hollow)","two dungeon levels under Iron Hollow: the old workings (boss: the Prop-Breaker) and the deep gallery (boss: the Thing in the Deep)"),
("The Inferno Labyrinth — the halls","a maze through the gate of flame to the crucible (boss: the Obsidian Warden)"),
("The Keepers' Vaults","under the Ruins of Eldoria — \"a vigil where keepers stood so long their standing became architecture\" (boss: the Hollow Keeper)"),
]
for n,d in places: P(f"- [ ] **{n}** — {d}")
P("")
# ---------- people ----------
P("## 2. People\n")
P("### 2.1 Named people not in the DB\n")
P("- [ ] **Silvara** — merchant and scout of the forest (2D prologue). Her lines: “I am Silvara. Merchant, occasional scout, and the only person in this forest who keeps a proper inventory.” / “The stonework is Covenant-era — maybe older… Whatever happened at 0 GD, it left a scar on the land itself.” (`packages/rules/src/data/dialogues.js`)")
P("- [ ] **The forest Elemental** of the Sylvan Sanctuary (it asks “Why do you seek the light of day?”) — the DB has the event The Elemental's Trial, not the Elemental itself")
P("- [ ] **The Alpha** of the Guardians of the Wild — the pack leader in the Emerald Fields")
P("- [ ] **Dungeon bosses:** the Prop-Breaker, the Thing in the Deep, the Obsidian Warden, the Hollow Keeper, the Spider Queen (Whisper-Wood)")
P("- [ ] **Thaloria's named roles** (no personal names): the Innkeeper, the Trader, the Merchant (Thaloria Market), the Cartographer, the Smith (teaches Crusher), the Sergeant (teaches Guard), the Priest (teaches arcane spells), the Archivist. 41 residents live by amo's schedules; the rest are unnamed.")
P("")
P("### 2.2 Villagers of the regions (each with their own lines)\n")
for r in sorted(g['regions'],key=lambda r:r['name']):
    if not r['people']: continue
    P(f"**{r['name']}**")
    for p in r['people']:
        lines=' / '.join(f"“{l}”" for l in (p['lines'] or [])[:3])
        P(f"- [ ] **{p['name']}** ({p['role'] or 'villager'}){' — '+lines if lines else ''}")
    P("")
# ---------- organizations ----------
P("## 3. Institutions, orders, peoples\n")
P("""- [ ] **Valdric** (7 spell descriptions): “invented by a Valdric siege engineer”, “a Valdric assassin's notes”, “Valdric miners developed the technique”, “Valdric quarrying equipment”, “the old forests near Valdric”, “a grandmother in Valdric”, “Valdric philosophers argue…”
- [ ] **The Asran Academy**: “Tier names follow the Asran Academy classification used across Eldoria”, “An Asran Academy invention, banned in tournament play…”, “a banned Asran text”, “The Asran Academy includes it in textbooks…”
- [ ] **The Arcane Covenant**: “Staff of the First Covenant — Forged at the founding of the Arcane Covenant”, “Blade of the Covenant — One of the original Covenant weapons”, Covenant-era stonework (Silvara), “the Old Aetheric hand, written before the standardization” (a sign), the hidden quest The Covenant Scholar
- [ ] **The Twilight Order**: the hidden quest “Initiation of the Twilight Order” (a shadow-marked stone), the Twilight Fang (“Fang of the Twilight Order”)
- [ ] **The Rift-Gate network** (Aetheric Monoliths; in `world_lore.md`): “The Rift-Gate network was not built. It was discovered.”
- [ ] **The Border Watch** (Graywatch's garrison)
- [ ] **“the capital”** — Silvara's scholar “from the capital” (Thaloria? another city?)
""")
# ---------- creatures ----------
P("## 4. Creatures (none are in the DB)\n")
P("The DB has no creature label. 116 kinds are in the game's rules (`ENEMY_TYPES`, amo); 18 have a written bestiary entry, and the 3D game gives some their own names. ★ = has a 3D body in the game now.\n")
built=set(re.findall(r"\b([a-z_]+): '", open('apps/amo3d/src/content/actors/beast.js').read()))|set(re.findall(r"\b([a-z_]+): '", open('apps/amo3d/src/content/actors/bodies2.js').read()))
built|={'wolf','shadow_soldier','werewolf','deer','rabbit','fox','crow','feral_boar','black_bear','grizzly_bear','sheep','cow','pig','goat','chicken','void_general'}
P("### 4.1 With a written bestiary entry\n")
for c in g['creatures']:
    if c['lore']:
        l=c['lore']; P(f"- [ ] **{l.get('name',c['id'])}** (`{c['id']}`, threat {l.get('threat','?')}){' ★' if c['id'] in built else ''} — {l.get('desc','')}")
P("\n### 4.2 Named only\n")
P(", ".join(f"`{c['id']}`{'★' if c['id'] in built else ''}" for c in g['creatures'] if not c['lore']))
P("\n3D names given in the game: Magma-Eater (lava elemental), Cinder-Soul (ember imp), Obsidian Golem, Gloom-Beak, Frost-Shade, Crag-Fiend, Void-Stalker, Blight-Ent, Root-Wraith, Corrupted Sentinel, Grave-Wraith, Cursed Knight, Blind Stalker, Deep Horror, Shadow Soldier, the Guardians of the Wild (werewolves).\n")
# ---------- items ----------
P("## 5. Named items and artifacts\n")
P("The DB has 3 artifacts (the Crystal Focus, the Forbidden Tome, the Heartstone of Creation). These items make claims about the world:\n")
for it in g['items']:
    if it['rarity'] in ('legendary','epic') and it['slot'] in ('weapon','body','accessory','head','offHand'):
        P(f"- [ ] **{it['name']}** ({it['rarity']}) — {it['desc']}")
P("- [ ] **Eldrin's Journal** (story item: Oren takes it at the Fire Gate)")
P("- [ ] **Chapter rewards** (game choices, 0.18.0): the Umbral Dagger (ch. 6), Manual: Shadow, a Crystalline Rod, a Heartwood Bracer, the Arcane Sceptre, a Void Pendant, the Staff of the First Covenant (ch. 12)\n")
# ---------- events ----------
P("## 6. Story and events\n")
P("### 6.1 The campaign's chapters 6–12 (the 3D scenes) against the DB's events\n")
P("""- [ ] ch. 6 Treachery's Bite — Oren at the first landing, the shadow's dagger → DB: *Oren's Betrayal at the Fire Gate* ✅. Game details: Oren takes Eldrin's journal and goes down first.
- [ ] ch. 7 The Solitary Path — down alone through the gate of flame and the halls → no DB event (the halls and the Obsidian Warden are game-made)
- [ ] ch. 8 Inferno's Trial — Xarathos drinks your light until a spell turns it back → DB: *Xarathos Destroyed in the Crucible* ✅ (the mechanics are game-made)
- [ ] ch. 9 Eldoria's Heartbeat — the rune-dead gate woken with the sight; the Heartstone reads your hand; Voraun turns spells back until the Stone's ward burns him → DB: *The Retrieval of the Heartstone* ✅; **the Voraun fight in the Ruins is game-made** (check against canon)
- [ ] ch. 10 Heart of War — the Shadow Balrog at the Ancient Door, absorbing every blow until you stand as the Stone's keeper → DB: *The Shadow Balrog Yields* ✅
- [ ] ch. 11 The Weight of Eternity — Vorgos and the four hundred years → DB: *The 400-Year Condition Revealed* ✅
- [ ] ch. 12 Dawn's Embrace — the ward of the keeping drawn in the tower; last line “Until the Star-Guard needs the key.” 📖 → DB: *Eldrin's 400-Year Vigil* ✅
""")
P("### 6.2 Malphas on the Summit (game-made details)\n")
P("- [ ] Malphas rises from the snow on the Summit Pass, makes illusions of himself (only Aether Sight shows they cast no shadow), the winter closes in as he weakens, and he flees into the storm. → DB: *Malphas Forced to Retreat* ✅ (the details are game-made)\n")
P("### 6.3 Quests (`packages/rules/src/data/quests.js`, from the 2D game, plus the 3D Sanctuary's)\n")
for q in g['quests']:
    if q['id'].startswith('stub_'): continue
    P(f"- [ ] **{q['title']}** ({q['type']}) — {q['desc']}")
P("- [ ] **The Elemental's Trial**, **Seeds of the Valley** (blight at the Corrupted Rim), **The Hermit's Debt** (the old camp; reward a resonance amulet) — the Sylvan Sanctuary (3D)")
P("- [ ] **Bounties** — Thaloria's board posts three East Road hunts a day (generated, no lore)\n")
# ---------- texts ----------
P("## 7. Lore claims in flavour text\n")
P("### 7.1 Spell descriptions that tell Eldrin's past or the world's history\n")
for sp in g['spells']:
    if sp['lore'] and re.search(r"Eldrin|Valdric|Asran|Covenant|Thalor|Void|Vorgos|Aurori|Nythor|ancient|old ", sp['lore']):
        P(f"- [ ] **{sp['name']}** — {sp['lore']}")
P("")
P("### 7.2 The Hermit, the Sanctuary, the regions' signs and villagers\n")
P("The region lore lines, signs and villager lines are listed under each place in §1.1 and §2.2. The Hermit's and the Elemental's lines follow the book (ch. 9–10) — review them in-game, or ask for a dump.\n")
# ---------- races ----------
P("## 8. Races and how the game shows them\n")
P("""- [ ] **Werewolves, playable** (Forge race): a human ↔ wolf change (faster, claws ×1.8, no spells in wolf form). DB: the race Werewolf ✅; **being playable and the change are game-made.** (No werewolf villagers, as you asked.)
- [ ] **How the elven races look**: Aurorians with pointed ears and an inner light, Nythorians with shadow skin, Fallen Aurorians with dark veins (game-made looks)
- [ ] **Dwarves** — not in the game, not in the lore (still your call)
""")
# ---------- in DB game ----------
P("## 9. Already in the DB as game-origin (for a second look)\n")
for o in db:
    if o['origin']=='game': P(f"- {', '.join(o['labels'])}: **{o['name']}** — {o['desc'][:200]}")
P("\n---\n_Sources: `apps/amo3d/src/content/` (regions, maps, chapters, actors), `packages/rules/src/data/` (items, spells, quests, dialogues, bestiary, worldMap), the lore DB on scarif (read only). Regenerate after big content changes._")
open('docs/3d/LORE_REVIEW.md','w').write('\n'.join(out)+'\n')
print(len(out),'lines')
