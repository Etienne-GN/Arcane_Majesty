# Lore review — what the game has that the lore DB doesn't

> ## ⚠️ STATUS: PENDING — a canon check must be run before anything goes into the DB
> Decided 2026-11-19 with the user: **every item below gets a canon check** against the established lore (the Neo4j DB, the album XMLs and ACC checkups in `data/lore/xmls/`, the book canon in `books/eldorias_prophecy/canon/`, `world_lore.md`) **in a later session**, and our decisions must be coherent with it.
> **First: the four "Possible conflicts" below** (Vorgos the "warlord", Arcane vs Crimson Covenant, Voraun as a duelist in the Ruins, the Shadow Balrog's look), then the summary's new names (Valdric, the Asran Academy, the Arcane Covenant, the Twilight Order, the Rift-Gates, the Border Watch, 0 GD, the Star-Guard, Silvara…), then everything else.
> For each item: canon says / the game says / verdict (keep, rename, rewrite, drop) — then the user approves, and only then the DB sync (`origin: "game"`) and the game fixes.

_Gathered 2026-11-19 from the 3D game (`apps/amo3d`), its rules (`packages/rules`), and compared with the Neo4j lore DB on scarif (read only — nothing was written). The DB today: 38 locations, 19 characters, 7 races, 10 organizations, 3 artifacts, 4 prophecies, 38 events, 10 regions (11 nodes already carry `origin: "game"`, listed at the end)._

**How to review:** tick a box to keep an item as it is (it goes into the DB with `origin: "game"`), write a note after it to change it, or strike it (`~~…~~`) to drop it (it then goes out of the game too, or gets renamed). Items marked 📖 are already in the book (canon) but not in the DB. Nothing is added to the DB until you say so.

## Summary — the decisions that matter most

These are the new names that would add real canon: places, peoples, institutions, a calendar. Everything else below is smaller (creatures, items, quests, flavour lines).

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

## Possible conflicts with canon — look at these first

- [ ] **Cleaver of Vorgos** (legendary item, items.js): “The warlord Vorgos's legendary blade.” The DB has Vorgos as the *Universal Sentinel; Master Narrator* — not a warlord. Rename the item, or rewrite its line.
- [ ] **“the Crimson Covenant” (DB) vs “the Arcane Covenant” (game)** — two different covenants, or one? If one, the game's items and Silvara's line should use the canon name.
- [ ] **Voraun fought in the Ruins (ch. 9)** — the DB calls Voraun “a subtraction in the Aether; quiet, patient, disciplined”; the game makes him a duelist who turns spells back until the Heartstone's ward burns him. Check against the book.
- [ ] **The Heartstone's direction**: the DB places the Heartstone Chamber at x=800 — *west* of Thaloria (x=1100) and Eldrin's Tower (x=1200) — while the book's compass points *east*, over the mountains, and the game follows the book. The Fire Gate, the Inferno Labyrinth and the Ruins of Eldoria have no position in the DB. The DB's x/y look inherited from the 2D world map; they must be settled before they become the open world's layout.
- [ ] **The Balrog fight's look** (0.16.1 model: a winged giant of shadow and fire with a flame sword and whip) — the DB says only *The Shadow Balrog*; check the look against the album and book.

## 1. Places

### 1.1 Regions (maps built from `apps/amo3d/src/content/regions/*.json`)

- [ ] **Duskmeet** (`duskmeet`) — ✅ in DB (game-origin)
  - Lore line: A small frontier hamlet on the northern edge of Whisper-Wood; its residents keep lanterns lit all night and nail iron horseshoes above every door. A last stop before the dark (lore DB: Duskmeet, in Whisper-Wood).
  - Landmarks: Duskmeet
  - Sign: “DUSKMEET — keep a lamp burning till dawn. South: Whisper-Wood. North: the road beyond the trees. Iron over every door; no one asks why.”
  - Rift-Gate monoliths: Monolith of Duskmeet
- [ ] **Graywatch** (`graywatch`) — ✅ in DB (game-origin)
  - Lore line: A stone border keep standing between the Scarlands and Whisper-Wood, built to watch for shadow-touched creatures creeping out of the dark forest. Sparse garrison, long nights (lore DB: Graywatch, in The Scarlands).
  - Landmarks: Graywatch Keep, The Scarlands
  - Sign: “GRAYWATCH — the Border Watch. West: Whisper-Wood; report anything shadow-touched that comes out of the trees. East: the Scarlands. Sparse garrison, long nights — volunteers welcome.”
  - Rift-Gate monoliths: Monolith of Graywatch
- [ ] **Iron Hollow** (`iron_hollow`) — ✅ in DB (game-origin)
  - Lore line: A grim mining settlement in the northern mountain foothills; its tunnels yield iron and coal, fueling Eldoria's forges. Hard folk, hard lives, and a tavern called The Grinding Wheel (lore DB: Iron Hollow, in Thaloria).
  - Landmarks: Iron Hollow, The North Shaft, The Coal Shaft, The deep shaft
  - Sign: “IRON HOLLOW — the North Shaft and the Coal Shaft. No lamps unlit below ground. No one goes down alone.”
  - Rift-Gate monoliths: Monolith of Iron Hollow
- [ ] **Lake Aethera** (`lake_aethera`) — ✅ in DB (game-origin)
  - Lore line: The largest body of fresh water in Eldoria, cradled in the Heartlands; its surface unnervingly still, reflecting the sky like polished silver. The Sunken Temple rests in its shallows: ancient ruins older than the Crimson Covenant, carved in a forgotten script; fishermen speak of lights beneath the water at dusk (lore DB: Lake Aethera, The Sunken Temple).
  - Landmarks: Lake Aethera, The Sunken Temple
  - Sign: “Mind the pier. The old ones say the temple was here before the lake. The fishermen say they see lights beneath the water at dusk — and do not fish here after dark.”
  - Rift-Gate monoliths: Monolith of Lake Aethera
- [ ] **Port Silver** (`port_silver`) — ✅ in DB (game-origin)
  - Lore line: A bustling coastal town on Eldoria's eastern shore, where the Silverrun empties into the sea: a grey-sand harbour for fishing vessels and the rare merchant ship, known for its salty ale and quiet neutrality (lore DB: Port Silver, in The Silver Coast; Silverrun River, in The Heartlands).
  - Landmarks: Port Silver, The Silverrun, The harbour
  - Sign: “PORT SILVER — the harbour of the Silver Coast. Every flag is welcome on this quay; every quarrel is not. Mooring by the day, fish by the basket.”
  - Rift-Gate monoliths: Monolith of Port Silver
- [ ] **Summit of Despair — the Approach** (`summit_of_despair`) — 🆕 not in DB
  - Lore line: Act II (Song 4): the frozen high pass east of Thaloria, where the Aether runs thin. Layout from amo's summit_of_despair map (trail north; Widow's Overlook west; the Rime Hollow east; Malphas at the top — the boss is not in 3D yet).
  - Landmarks: Widow's Overlook, The Rime Hollow, The Frozen Basin, The foot of the mountain
  - Sign: “A scout's journal, half-frozen: "...the whispering thing arrived before the cold got the rest of us. Tell the Archivists — it feeds on doubt, not blood..."”
  - Rift-Gate monoliths: Monolith of the Frozen Basin
- [ ] **The Citadel of Thaloria** (`citadel_plateau`) — 🆕 not in DB
  - Lore line: The terrace of the Citadel, the great library-palace of Thaloria — the scholarly kingdom of libraries and archives (lore DB: Thaloria) — on its cliff above the river gorge, after the Eldoria's Prophecy cover. Inside: the Great Library, and the Forbidden Archive.
  - Landmarks: The Citadel, The Great Library
  - Sign: “THE CITADEL OF THALORIA — the Great Library within. Readers welcome from the first bell to the last. Below: the cliff stair and the bridge to the city.”
  - Rift-Gate monoliths: Monolith of the Citadel
- [ ] **The Crossroads** (`the_crossroads`) — ✅ in DB (game-origin)
  - Lore line: A central trading village of the Heartlands where the old north-south and east-west routes meet: a worn stone inn, a weathered market square, and travellers from every corner (lore DB: The Crossroads, in The Heartlands).
  - Landmarks: The Crossroads
  - Sign: “THE CROSSROADS — West: the East Road and Thaloria. North: Whisper-Wood. East: the Silverrun to Port Silver. South: Lake Aethera.”
  - Rift-Gate monoliths: Monolith of the Crossroads
- [ ] **The Emerald Fields** (`emerald_fields`) — ✅ in DB (album)
  - Lore line: A remote, untamed wilderness of the south where Kael and Anya hid in exile after emerging from the Underworld; the Hidden Cabin, their sanctuary of peace before tragedy struck; and in the south the Weeping Stones, seven monoliths with weeping faces worn smooth by the wind, raised by no one remembers whom, where locals leave wildflowers (lore DB: The Emerald Fields, The Hidden Cabin, The Weeping Stones). The noble werewolf pack, the Guardians of the Wild, roams here (they come with the races).
  - Landmarks: The Weeping Stones, The Emerald Fields, The Guardians' ground
  - Sign: “Carved small into the door frame, two names worn almost smooth: K · A. The cabin is swept, as if someone still comes back.”
  - Rift-Gate monoliths: Monolith of the Emerald Fields
- [ ] **The Fire Gate** (`fire_gate`) — ✅ in DB (album)
  - Lore line: The black-glass entrance to the Inferno Labyrinth: a stair of black glass worn by centuries, runes that hold heat and hunger, leading down into the mountain's heart. Where the snow-line gives way to ash — the site of Oren's betrayal at the first landing (lore DB: Fire Gate; event: Oren's Betrayal at the Fire Gate). The betrayal itself comes with the campaign chapter.
  - Landmarks: The Fire Gate, The first landing
  - Sign: “Cut into the glass beside the first landing, letters that are warm to the touch: WHO GOES DOWN IS NAMED. WHO IS NAMED IS WEIGHED.”
  - Rift-Gate monoliths: Monolith of the Fire Gate
- [ ] **The Inferno Labyrinth** (`inferno_labyrinth`) — ✅ in DB (album)
  - Lore line: Xarathos's territory beneath the Fire Gate: magma rivers, a gate of flame that calls the one who comes by their given name, the obsidian golem puzzle-trial, Magma-Eaters and Cinder-Souls, and the heart-chamber crucible where the Pyre-Lord waits (lore DB: Inferno Labyrinth; event: Xarathos Destroyed in the Crucible). The trial, the creatures and the Pyre-Lord come with the campaign chapter.
  - Landmarks: The gate of flame, The obsidian trial, The crucible, The Labyrinth's halls
  - Sign: “The flames lean toward you as you come near, and in the roar there is a voice that knows your given name.”
- [ ] **The Lower Town of Thaloria** (`thaloria_lower`) — 🆕 not in DB
  - Lore line: The district that grew outside Thaloria's south wall when the city ran out of room: scribes' houses, booksellers, an inn for scholars and pilgrims — Thaloria is the scholarly kingdom of libraries and archives (lore DB: Thaloria). Game-only district (origin: game).
  - Landmarks: The market square, The Inkwell (inn), Booksellers' Row
  - Sign: “THE LOWER TOWN — north: the South Gate and the city; the market square ahead; Booksellers' Row and the Inkwell on the main street.”
- [ ] **The Ruins of Eldoria** (`ruins_of_eldoria`) — ✅ in DB (album)
  - Lore line: A graveyard of the golden age — low black-stone walls, foundations, a few standing arches; the ruins of a vigil, not a city, where keepers stood so long their standing became architecture. The approach is a rune-dead gate sealed by Voraun's silence. Beyond lies the Heartstone Chamber, where the Heart Stone of Creation was hidden, and the Ancient Door — older than the valley, older than the keeping — with runes no one can read; the Shadow Balrog guards it (lore DB: Ruins of Eldoria, Heartstone Chamber, The Ancient Door). The Balrog and the chamber's dark entity come with the campaign.
  - Landmarks: The rune-dead gate, The keepers' way, The Heartstone Chamber, The Ancient Door, The Keepers' Vaults
  - Sign: “The runes on the gate are dead — not broken, not worn: silenced, as if someone had told them to stop. The air here holds no sound for long.”
  - Sign: “An empty pedestal at the bottom of the steps. The stone still remembers a light; it is cold to the touch, and yet it hums.”
  - Rift-Gate monoliths: Monolith of the Ruins
- [ ] **The Sylvan Sanctuary** (`sylvan_sanctuary`) — ✅ in DB (album)
  - Lore line: Act II (Song 5): the impossible early-spring valley over the pass — the Elemental waits at the ford, the Hermit at the heart of the green. Extra pieces (the Elemental, the hut, the Rim, the hidden path) are built by content/sanctuary.js at the places below.
  - Landmarks: The Ford, The Hermit's Hut, The Corrupted Rim
- [ ] **Whisper-Wood** (`whisper_wood`) — ✅ in DB (album)
  - Lore line: A dark forest where the planar veil thins (world_lore.md).
  - Landmarks: The Clearing, Black Water
  - Rift-Gate monoliths: Monolith of Whisper-Wood

### 1.2 Places built in code

- [ ] **Thaloria Glade** — the vale around Eldrin's tower (the first map, `content/eldrinVale.js`); the DB has Eldrin's Tower, not the glade
- [ ] **The Thalorian Wilds / the East Road** — the forest road east of Thaloria (`content/eastRoad.js`), with the Old Waystone, the Shepherd's Lean-to (where Oren waits) and the East Road Monolith
- [ ] **The Hollow** — a cave behind a cave mouth on the East Road (2D: east_road_cave)
- [ ] **The Mountain — Summit of Despair range** — (`content/mountain.js`) the ridge north of Thaloria: one trail up the south flank, the Summit Pass with a ring of standing stones (Malphas's fight), and a river and bridge down to the Sylvan Sanctuary's gate. The DB has Summit of Despair as one location.
- [ ] **The cairns** — Base camp, the Shelf of Sighs, the Widow's Ledge, the Summit Pass, the Cloudbreak, the Riverwatch, plus the Rope Bridge and two ice caves — named spots on the trail
- [ ] **Widow's Overlook / the Rime Hollow / the Frozen Basin** — spots on the Summit approach (2D summit map); "The Widow's Watch" is a shrine quest there
- [ ] **The Corrupted Rim** — the greyed edge of the Sylvan Sanctuary (side quest Seeds of the Valley) — already listed as a DB sync owed
- [ ] **The Hermit's old camp** — past the Sanctuary's western rim on a path only Aether Sight shows (The Hermit's Debt) — already listed as a DB sync owed
- [ ] **The Citadel of Thaloria, the Great Library** — the library-palace on its cliff (`content/citadelLibrary.js`); the Forbidden Archive below it is in the DB
- [ ] **The North Gate, the South Gate, the East Gate, the West Gate, the Lookout** — Thaloria's gates and the raised lookout over the gorge (`content/thaloria.js`)
- [ ] **Thaloria's interiors** — the Inn and its cellar, the market hall, the smithy, the temple, the barracks, the Bell Tower, the manor, the alchemist's, the Archivist's Guild (the guild is in the DB), houses
- [ ] **Eldrin's Tower inside** — the Hall, the Study, the Crypt
- [ ] **The Deep Shaft (Iron Hollow)** — two dungeon levels under Iron Hollow: the old workings (boss: the Prop-Breaker) and the deep gallery (boss: the Thing in the Deep)
- [ ] **The Inferno Labyrinth — the halls** — a maze through the gate of flame to the crucible (boss: the Obsidian Warden)
- [ ] **The Keepers' Vaults** — under the Ruins of Eldoria — "a vigil where keepers stood so long their standing became architecture" (boss: the Hollow Keeper)

## 2. People

### 2.1 Named people not in the DB

- [ ] **Silvara** — merchant and scout of the forest (2D prologue). Her lines: “I am Silvara. Merchant, occasional scout, and the only person in this forest who keeps a proper inventory.” / “The stonework is Covenant-era — maybe older… Whatever happened at 0 GD, it left a scar on the land itself.” (`packages/rules/src/data/dialogues.js`)
- [ ] **The forest Elemental** of the Sylvan Sanctuary (it asks “Why do you seek the light of day?”) — the DB has the event The Elemental's Trial, not the Elemental itself
- [ ] **The Alpha** of the Guardians of the Wild — the pack leader in the Emerald Fields
- [ ] **Dungeon bosses:** the Prop-Breaker, the Thing in the Deep, the Obsidian Warden, the Hollow Keeper, the Spider Queen (Whisper-Wood)
- [ ] **Thaloria's named roles** (no personal names): the Innkeeper, the Trader, the Merchant (Thaloria Market), the Cartographer, the Smith (teaches Crusher), the Sergeant (teaches Guard), the Priest (teaches arcane spells), the Archivist. 41 residents live by amo's schedules; the rest are unnamed.

### 2.2 Villagers of the regions (each with their own lines)

**Duskmeet**
- [ ] **Keeper of the Last Lamp** (innkeeper)
- [ ] **Chandler** (merchant)
- [ ] **Lamplighter** (villager) — “Every lamp lit till dawn. Every one. My father missed one once.” / “Iron over the door. No one says why. No one has to.”
- [ ] **Old woman** (villager) — “The shadows in the trees have no faces. If you see one with a face, run.” / “Graywatch is east, through the wood. The soldiers there drink our ale and call us superstitious.”

**Graywatch**
- [ ] **Quartermaster** (merchant)
- [ ] **Sergeant of the Watch** (guard) — “Sparse garrison, long nights. We watch the forest; the forest watches back.” / “Shadow-touched things come out of Whisper-Wood. We put them down before they reach the villages.”
- [ ] **Sentry** (guard) — “East is the Scarlands. Nothing grows right out there.”
- [ ] **Sentry** (guard) — “Eyes on the trees. Always.”

**Iron Hollow**
- [ ] **Keeper of the Grinding Wheel** (innkeeper)
- [ ] **Ore-trader** (merchant)
- [ ] **Foreman** (guard) — “The deep shaft is closed. Something down there cracks the props at night.” / “Crag-fiends on the slopes. Stone that walks. Don't go up there unarmed.”
- [ ] **Miner** (miner) — “Twelve hours under, and the rock still hums when you put your ear to it.” / “Up the east path is the Summit of Despair. Nobody goes up there for the view.”
- [ ] **Miner** (miner) — “Pay's bad, ale's worse, and I wouldn't live anywhere else.”

**Port Silver**
- [ ] **Keeper of the Salt Cask** (innkeeper)
- [ ] **Fishwife** (merchant)
- [ ] **Sailmaker** (merchant)
- [ ] **Harbour master** (guard) — “Every boat in and out, written in my book. The sea keeps no records; somebody must.” / “Upriver the water is silver. Here it's grey. Same water. Don't ask me.”
- [ ] **Dockhand** (fisher) — “Ships from the far coast talk of black sails. Sailors talk of a lot of things.”
- [ ] **Net-mender** (fisher) — “Mind the nets. Mind the gulls more.”

**The Crossroads**
- [ ] **Innkeeper of the Worn Stone** (innkeeper)
- [ ] **Pedlar** (merchant)
- [ ] **Clothier** (merchant)
- [ ] **Smith** (merchant)
- [ ] **Carter** (farmer) — “West to Thaloria, east to the coast, south to the lake. North is Whisper-Wood — I go round it.” / “The lake road is quiet. Too quiet, my wife says. She says that about everything.”
- [ ] **Well-keeper** (villager) — “Every road in the Heartlands comes through here sooner or later. So does every rumour.” / “They say a stone-faced old wizard from the west passed through once. Didn't pay for his water either.”
- [ ] **Guard** (guard) — “Keep to the road after dark. Things come out of the north wood.”

**The Lower Town of Thaloria**
- [ ] **Keeper of the Inkwell** (innkeeper)
- [ ] **Bookseller** (merchant)
- [ ] **Tailor** (merchant)
- [ ] **Market trader** (merchant)
- [ ] **Scribe** (villager) — “Thaloria copies everything. The originals stay in the Citadel; the copies go out into the world.” / “The Forbidden Archive? Every scribe has a theory. Mine is that it's full of very dull tax ledgers.”
- [ ] **Student** (villager) — “Three years of runes and I can read one door-sign. My master says that's fast.” / “They say the Keeper of the Archive hasn't opened it in a lifetime.”
- [ ] **Watchman** (guard) — “The Lower Town grew outside the walls when the city ran out of room. Mind your purse after dark.”
- [ ] **Lamplighter** (villager) — “Up at dusk, down at dawn. The Citadel windows light themselves — I do the rest.”

## 3. Institutions, orders, peoples

- [ ] **Valdric** (7 spell descriptions): “invented by a Valdric siege engineer”, “a Valdric assassin's notes”, “Valdric miners developed the technique”, “Valdric quarrying equipment”, “the old forests near Valdric”, “a grandmother in Valdric”, “Valdric philosophers argue…”
- [ ] **The Asran Academy**: “Tier names follow the Asran Academy classification used across Eldoria”, “An Asran Academy invention, banned in tournament play…”, “a banned Asran text”, “The Asran Academy includes it in textbooks…”
- [ ] **The Arcane Covenant**: “Staff of the First Covenant — Forged at the founding of the Arcane Covenant”, “Blade of the Covenant — One of the original Covenant weapons”, Covenant-era stonework (Silvara), “the Old Aetheric hand, written before the standardization” (a sign), the hidden quest The Covenant Scholar
- [ ] **The Twilight Order**: the hidden quest “Initiation of the Twilight Order” (a shadow-marked stone), the Twilight Fang (“Fang of the Twilight Order”)
- [ ] **The Rift-Gate network** (Aetheric Monoliths; in `world_lore.md`): “The Rift-Gate network was not built. It was discovered.”
- [ ] **The Border Watch** (Graywatch's garrison)
- [ ] **“the capital”** — Silvara's scholar “from the capital” (Thaloria? another city?)

## 4. Creatures (none are in the DB)

The DB has no creature label. 116 kinds are in the game's rules (`ENEMY_TYPES`, amo); 18 have a written bestiary entry, and the 3D game gives some their own names. ★ = has a 3D body in the game now.

### 4.1 With a written bestiary entry

- [ ] **Guardian of the Wild** (`werewolf`, threat HIGH) ★ — A werewolf of the Emerald Fields pack: tall, grey-furred, walking upright on wolf's legs. Not a monster — a territorial guardian that hunts Void-corruption wherever it seeps into the wild. They mistook Kael for a plague once; it ended in an uneasy truce. Leave them their ground and they leave you yours.
- [ ] **Forest Wisp** (`wisp`, threat LOW) — Resonance-charged fragments that coalesce in areas of high arcane density. They congregate near Rift-Gate sites and ancient survey markers. Dissipation releases trace arcane energy. Neither hostile nor benign — they react to intent.
- [ ] **Forest Wolf** (`wolf`, threat MODERATE) ★ — Corrupted pack predators. Void-taint has overwritten their natural behavior — they move as shadows, driven not by hunger but by the Void General's will. The pack structure remains intact but serves a darker command.
- [ ] **Shadow Sprite** (`shadow_sprite`, threat MODERATE) — Void-born constructs that take the shape of forest creatures. Nothing natural underneath — formed entirely from structured void-matter. They cluster near ruins, feeding on residual resonance. Close contact causes resonance bleed.
- [ ] **Void Stalker** (`void_stalker`, threat HIGH) ★ — A mature void construct — persistent, patient, resistant to physical force. The Stalkers near the boss arena are sentinels, not random encounters. They mark the boundary of the Void General's sphere of influence.
- [ ] **Void Scout** (`scout`, threat MODERATE) — Humanoid — possibly once a Covenant soldier or survey team member. Void-touched past recovery, but retaining enough tactical instinct to function as patrol units. They carry corrupted equipment and remember formation discipline.
- [ ] **Corrupted Treant** (`treant`, threat HIGH) — Ancient forest guardians whose resonance core has been inverted by void-taint. Originally protective entities — their corruption marks how deeply the Void's influence has spread into the forest's living substrate.
- [ ] **Blight-Ent** (`blight_ent`, threat MEDIUM) ★ — An ancient tree fused with Nythorian rot. Slow and heavy-handed; when struck it sheds spores that dampen the mana of anyone breathing them.
- [ ] **Root-Wraith** (`root_wraith`, threat LOW) ★ — A small, fast knot of living vine. It lashes out to entangle, and holds a scholar still long enough for worse things to arrive.
- [ ] **Corrupted Sentinel** (`corrupted_sentinel`, threat HIGH) ★ — A guardian statue off the East Road, its old wards gone sour with shadow. It does not leave its post, and does not forgive trespass.
- [ ] **Obsidian Golem** (`stone_golem`, threat HIGH) ★ — Blocks of black glass bound around a burning core — the guardians of the Labyrinth's trial. Slow, patient, and very hard to break.
- [ ] **Grave-Wraith** (`grave_wraith`, threat MEDIUM) ★ — A pale hooded shade of the vigil beneath the Ruins of Eldoria — a keeper who stood so long that, when the body went, the standing stayed.
- [ ] **Cursed Knight** (`cursed_knight`, threat HIGH) ★ — A knight of the old keeping in rusted plate, who never lay down. It still walks its round in the vaults, and still draws on anyone who did not give the word.
- [ ] **Cinder-Soul** (`ember_imp`, threat MEDIUM) ★ — A drifting wraith of embers and smoke that haunts the Inferno Labyrinth. Some say they were travellers once, who answered when the gate of flame called them by name.
- [ ] **Magma-Eater** (`lava_elemental`, threat HIGH) ★ — A hunched crawler of black crust over molten rock, one of the creatures of Xarathos's Labyrinth. It eats the fire of the deep and breathes it out again.
- [ ] **Cave Bat** (`cave_bat`, threat LOW) ★ — Leather-winged bats of the deep workings, red-eyed and quick. One is a nuisance; a cloud of them in a dark gallery is something else.
- [ ] **Blind Stalker** (`blind_stalker`, threat MEDIUM) ★ — A pale, eyeless hound of the deep places. It hunts by sound and smell, and its maw glows faintly in the dark — walk softly and it may pass you by.
- [ ] **Deep Horror** (`deep_horror`, threat HIGH) ★ — Grey flesh and grasping tentacles round one great yellow eye, from somewhere below the deepest workings. The miners never saw it; they only heard the props crack.

### 4.2 Named only

`giant_spider`★, `dark_druid`★, `feral_boar`★, `skeleton_archer`, `runic_turret`, `bog_lurker`, `rot_toad`★, `will_o_wisp`, `vine_horror`, `plague_rat`★, `ash_crawler`★, `forge_daemon`★, `cinder_hawk`★, `frost_bear`★, `ice_revenant`★, `blizzard_sprite`, `wendigo`★, `glacier_crab`★, `crystal_golem`, `mushroom_shaman`★, `void_spawn`, `mirror_shade`, `arcane_sentinel`★, `rift_walker`, `soul_eater`, `boar`, `deer`★, `deer_doe`, `forest_fox`, `grizzly_bear`★, `black_bear`★, `giant_rat`, `rabbit`★, `crow`★, `stray_cat`, `carrion_crow`, `hollow_cat`, `dark_deer`, `dark_deer_doe`, `lion`, `lioness`, `field_mouse`, `white_mouse`, `mushroom_walker`, `amanita_walker`, `shiba`, `goat`★, `turkey`, `cow`★, `llama`, `pig`★, `sheep`★, `chicken`★, `polar_bear`, `arctic_fox`, `shark`, `bird_bluejay`, `bird_sparrow`, `bird_robin`, `bird_cardinal`, `bird_eagle`, `bird_brown`, `bird_black`, `bird_blue`, `bird_white`, `heron`, `giant_frog`, `plague_heron`, `rot_frog`, `fire_lizard`, `vulture`, `ember_lizard`, `ash_vulture`, `elk`, `corrupted_elk`, `void_fox`, `cave_fish`, `glow_moth`, `void_crawler`, `blight_moth`, `corrupted_boar`, `corrupted_deer`, `corrupted_rabbit`, `spider_green`, `spider_brown`, `spider_red`, `spider_blue`, `spider_gray`, `spider_yellow`, `spider_orange`, `spider_pink`, `spider_white`, `spider_dark`, `spider_queen`★, `gloom_beak`★, `frost_shade`★, `crag_fiend`★, `resonance_wisp`

3D names given in the game: Magma-Eater (lava elemental), Cinder-Soul (ember imp), Obsidian Golem, Gloom-Beak, Frost-Shade, Crag-Fiend, Void-Stalker, Blight-Ent, Root-Wraith, Corrupted Sentinel, Grave-Wraith, Cursed Knight, Blind Stalker, Deep Horror, Shadow Soldier, the Guardians of the Wild (werewolves).

## 5. Named items and artifacts

The DB has 3 artifacts (the Crystal Focus, the Forbidden Tome, the Heartstone of Creation). These items make claims about the world:

- [ ] **Void Channel** (epic) — Channels void-energy into spells. +9 INT, +3 AGI. [Void-Touched] [Lore: 20% void pulse on hit]
- [ ] **Arcane Sceptre** (epic) — Pure arcane authority. +8 INT, +3 STA. [Flame-Kissed] [Lore: 25% chain-lightning arc]
- [ ] **Staff of the First Covenant** (legendary) — Forged at the founding of the Arcane Covenant. +12 INT, +4 AGI. [+25% all spell damage]
- [ ] **Heartwood Resonator** (legendary) — Resonates with the forest's living heartbeat. +10 INT, +5 STA. [+50% mana regen]
- [ ] **Void-Slicer** (epic) — A blade that cuts through reality. Hits cost 2 MP, +35% arcane. +7 INT, +5 STR. [Void-Touched] [Lore: 20% void stun]
- [ ] **Arcane War-Blade** (epic) — Battle-tested arcane fury. Hits cost 2 MP, +35% arcane. +6 INT, +6 STR. [Flame-Kissed] [Lore: 20% arcane burst hits 2 more]
- [ ] **Blade of the Covenant** (legendary) — One of the original Covenant weapons. Hits cost 2 MP, deal +35% arcane. +9 INT, +7 STR. [Blade strikes grant 2 MP if INT > 12]
- [ ] **Cleaver of Vorgos** (legendary) — The warlord Vorgos's legendary blade. Hits cost 2 MP, deal +35% arcane. +12 STR, +4 INT. [3× damage vs enemies below 30% HP]
- [ ] **Midnight Reaver** (epic) — Cuts through shadow and flesh alike. Double-hit costs 1 MP. +7 AGI, +4 STR. [Vampiric] [Lore: 25% shadow clone second strike]
- [ ] **Ecliptic Stiletto** (epic) — Eclipse-forged precision weapon. Double-hit costs 1 MP. +6 AGI, +5 INT. [Void-Touched] [Lore: 20% eclipse mark — next hit 2×]
- [ ] **The Twilight Fang** (legendary) — Fang of the Twilight Order. Augmented double-hit costs 1 MP. +9 AGI, +5 INT. [Enemies killed in Shadow Veil drop +50% Glint]
- [ ] **Dagger of the Void** (legendary) — Born from pure void energy. Double-hit is always augmented — no mana cost. +10 AGI, +6 STR.
- [ ] **Celestial Arc** (epic) — Forged under a celestial alignment. Ranged strikes cost 3 MP. +6 INT, +6 AGI. [Arcane Surge] [Lore: 25% arrow bounce to second enemy]
- [ ] **Tempest Bow** (epic) — Crackling with storm-energy. Ranged strikes cost 3 MP. +8 AGI, +3 STR. [Void-Touched] [Lore: 20% storm burst AoE on impact]
- [ ] **The Eternal Draw** (legendary) — A bow that never misses. Ranged strikes cost 3 MP, reach 150px. +10 AGI, +6 INT. [Every 3rd consecutive shot deals 2× damage]
- [ ] **The Void-Piercer** (legendary) — Arrows pierce through the first enemy struck. Range 220px. Ranged strikes cost 3 MP. +8 INT, +8 AGI. [Arrows pierce first enemy]
- [ ] **Eldrin's Journal** (story item: Oren takes it at the Fire Gate)
- [ ] **Chapter rewards** (game choices, 0.18.0): the Umbral Dagger (ch. 6), Manual: Shadow, a Crystalline Rod, a Heartwood Bracer, the Arcane Sceptre, a Void Pendant, the Staff of the First Covenant (ch. 12)

## 6. Story and events

### 6.1 The campaign's chapters 6–12 (the 3D scenes) against the DB's events

- [ ] ch. 6 Treachery's Bite — Oren at the first landing, the shadow's dagger → DB: *Oren's Betrayal at the Fire Gate* ✅. Game details: Oren takes Eldrin's journal and goes down first.
- [ ] ch. 7 The Solitary Path — down alone through the gate of flame and the halls → no DB event (the halls and the Obsidian Warden are game-made)
- [ ] ch. 8 Inferno's Trial — Xarathos drinks your light until a spell turns it back → DB: *Xarathos Destroyed in the Crucible* ✅ (the mechanics are game-made)
- [ ] ch. 9 Eldoria's Heartbeat — the rune-dead gate woken with the sight; the Heartstone reads your hand; Voraun turns spells back until the Stone's ward burns him → DB: *The Retrieval of the Heartstone* ✅; **the Voraun fight in the Ruins is game-made** (check against canon)
- [ ] ch. 10 Heart of War — the Shadow Balrog at the Ancient Door, absorbing every blow until you stand as the Stone's keeper → DB: *The Shadow Balrog Yields* ✅
- [ ] ch. 11 The Weight of Eternity — Vorgos and the four hundred years → DB: *The 400-Year Condition Revealed* ✅
- [ ] ch. 12 Dawn's Embrace — the ward of the keeping drawn in the tower; last line “Until the Star-Guard needs the key.” 📖 → DB: *Eldrin's 400-Year Vigil* ✅

### 6.2 Malphas on the Summit (game-made details)

- [ ] Malphas rises from the snow on the Summit Pass, makes illusions of himself (only Aether Sight shows they cast no shadow), the winter closes in as he weakens, and he flees into the storm. → DB: *Malphas Forced to Retreat* ✅ (the details are game-made)

### 6.3 Quests (`packages/rules/src/data/quests.js`, from the 2D game, plus the 3D Sanctuary's)

- [ ] **The Forest Hunt** (main) — The Hermit has asked you to clear the forest of dangerous creatures and uncover the source of the growing corruption.
- [ ] **Silvara's Supply Run** (side) — The merchant Silvara needs raw materials from the forest to restock her supplies.
- [ ] **Echoes of the Ancient Ones** (side) — Weathered signs throughout the forest hold fragments of a forgotten story. Find them all.
- [ ] **Initiation of the Twilight Order** (hidden) — A shadow-marked stone pulses with dark energy. Its inscription demands proof of mastery over shadow.
- [ ] **The Covenant Scholar** (hidden) — An ancient tome sealed by magical locks responds to your growing mastery of the arcane arts.
- [ ] **The Hunter's Trial** (hidden) — An ancient training ground for forest hunters. Complete the trial to claim its forgotten prize.
- [ ] **Void-Touched Beasts** (side) — The forest wildlife has been twisted by void-corruption. Hunt the corrupted beasts before the taint spreads further.
- [ ] **The Hermit's Offering** (side) — The Hermit spoke of void shards — crystallized corruption that resonates with fire. Collect them and return to him.
- [ ] **The Hunter's Larder** (side) — A true hunter wastes nothing. Cook your kills at a campfire to prepare proper provisions for the road ahead.
- [ ] **The Hermit's Remedy** (side) — The Hermit's hands shake when he reads by the fire. He needs moonpetal and glowcap for a tonic that steadies them.
- [ ] **Shadows at the Threshold** (side) — Shadow-sprites gather at the eastern edge of the forest. The Hermit wants them thinned out before they reach his door.
- [ ] **The Void Fragment** (hidden) — A shard of crystallized void-energy. Its power can only be claimed by one who has stared into the abyss.
- [ ] **Whisperer of Doubt** (main) — Malphas, the Whisperer of Doubt, haunts the pass ahead. Survive his illusions and force him to retreat.
- [ ] **The Frozen Camp** (side) — Investigate the frozen camp of fourteen dead and recover the scout's journal.
- [ ] **The Widow's Watch** (side) — Gather fuel and offerings for the shrine at Widow's Overlook to claim what it guards.
- [ ] **Echoes in the Rime** (side) — Clear the Frost-Shades guarding the Rime Hollow.
- [ ] **Odyssey's Dawn** (main) — The tower is sealed behind you. Leave Thaloria by the East Gate and follow the Compass east along the winter road.
- [ ] **Trader's Rumor** (side) — A stranger on the East Road asked the Trader one polite question: had he heard of "the Anchor"? Find the waystone where the stranger stopped.
- [ ] **The Scholar's Saddlebags** (side) — Your saddlebag split on the East Road and your field notes scattered. Gather three pages and bring them back to the Innkeeper, who kept the rest.
- [ ] **Read the Erasure** (main) — In the study at the top of your tower: the strata cores, where something in the stone has been tidied away — and a letter you keep coming back to.
- [ ] **The Elemental's Trial**, **Seeds of the Valley** (blight at the Corrupted Rim), **The Hermit's Debt** (the old camp; reward a resonance amulet) — the Sylvan Sanctuary (3D)
- [ ] **Bounties** — Thaloria's board posts three East Road hunts a day (generated, no lore)

## 7. Lore claims in flavour text

### 7.1 Spell descriptions that tell Eldrin's past or the world's history

- [ ] **Mana Dart** — The first spell Eldrin ever truly understood. Pure arcane force, shaped to a point. Frugal with mana, precise in execution. Those who master it cast without thought — the mana simply moves, because the caster has become the spell.
- [ ] **Triple Dart** — Firing three darts at once is not harder than firing one — it is a different understanding of intent. Eldrin learned this from a mage who drew a fork in the air before her and said: 'You are not splitting the spell. You are completing a shape.'
- [ ] **Seeker Dart** — Conventional darts travel straight. This one carries a whisper of intent — it curves, slightly, toward warmth. An Asran Academy invention, banned in tournament play after the third consecutive victory by blind students.
- [ ] **Needle Volley** — Five needles. No flourish, no incantation after the first exhale. Eldrin found it in a river-town compendium under the heading 'For Those Who Simply Need the Enemy to Stop.'
- [ ] **Phantom Dart** — It passes through the first target. It passes through the second. Some say it continues forever. Eldrin believes it simply finds no one worth stopping for.
- [ ] **Luminance** — A bright light, sustained. In caves it is practical. Against shadow-attuned enemies it is disorienting — they feel the arcane light as something personal. Eldrin uses it in dark places and in conversations he wants to end.
- [ ] **Phantom Script** — A rune, inscribed in light, that exists for a few seconds then releases itself as a wave of arcane force. Eldrin uses it as a delaying tool. He also finds something satisfying about leaving a trap made of words.
- [ ] **Benediction** — An academic ritual formalized into a single cast. The mana aligns favorably. Eldrin treats it as a recalibration — not a plea, not a prayer. The mana responds the same way regardless. He prefers spells that do not require sincerity.
- [ ] **Cleanse** — Strips away attached mana structures from the self. Removes burns, cold, poison, curses — whatever has been externally imposed on the mana body. Painful to cast on oneself. Eldrin describes it as 'having your mana combed very quickly and from the wrong direction.'
- [ ] **Aetheric Ward** — A standing field of defensive mana. Permanent until broken by sufficient force. Eldrin considers this the most mature spell he knows — not because it is complicated, but because it requires remembering that the goal is not to win, but to continue.
- [ ] **Aetheric Inscription** — Eldrin's signature. No mage casts exactly alike — the Inscription takes the shape of the caster's mana fingerprint, becoming something no one else can replicate. His traces itself into a recursive spiral. Every time. No matter what he intends.
- [ ] **Fireball** — The first spell every fire-minded student learns and the last one they stop using. A knot of flame mana thrown at a point, where it stops being a knot. Eldrin calls it unsubtle. He also keeps it bound to a slot at all times.
- [ ] **Fire Nova** — An eruption of compressed fire mana, released outward in a ring. Academic mages call it reckless. Eldrin spent years learning to compress the blast — to make it do exactly as much as he intends, no more.
- [ ] **Ember Bloom** — In Eldoria's south, a flower blooms once a year in wildfire season, its petals igniting on contact with air. Eldrin took the shape, not the temperature. The resulting spell is beautiful in a way that makes witnesses unsettled.
- [ ] **Flame Lance** — A narrow, concentrated lance of fire mana. Not elegant — the technique was invented by a Valdric siege engineer to punch holes in supply wagons at range. It works just as well on everything else.
- [ ] **Warmth Aura** — A gentle warmth — not the burning, not the nova, but the kind of fire that lives in a hearth and does not want to consume anything. Removes cold. Prevents freezing briefly. Eldrin cast it first by accident, trying to light a campfire without a flint. He has not told anyone this.
- [ ] **Arc Bolt** — Wisps carry electrical mana in their cores. Eldrin did not learn Arc Bolt from a tome — he absorbed it from years of surviving their strikes. The mana remembers what the body experienced. It chains because wisps always travel in groups.
- [ ] **Thunder Clap** — The sound arrives before you expect it. The shock arrives before the sound. A short-range burst — not for distance mages — but Eldrin learned that some problems require being very close and very loud.
- [ ] **Lightning Lance** — Not a bolt. A continuous stream of electricity held in a single direction for as long as Eldrin's concentration holds. He found the technique in a banned Asran text. The ban was about the noise, not the danger.
- [ ] **Shadow Veil** — The Void Wraith's corruption left a residue in Eldrin's mana pathways. Rather than purge it, he studied it for three days. Shadow mana does not hide you — it makes you briefly become less real. The difference matters.
- [ ] **Hush** — Silence, enforced. Not physical silence — the mana kind. Casters in range find the shape of their spells will not hold. The ambient mana simply does not cooperate. Eldrin considers it one of his more courteous aggressive spells.
- [ ] **Eclipse Mark** — A sigil inscribed upon an enemy in shadow mana. It does not hurt them. The next blow does. Eldrin found this technique in a Valdric assassin's notes — repurposed for someone who believes in giving warning, then not.
- [ ] **Stone Skin** — The treants of Eldoria do not resist force — they simply grow, over centuries, into something that does not care about force. Eldrin's earth attunement did not come from study. It came from watching how long they live, and why.
- [ ] **Quagmire** — The earth does not fight — it holds. This understanding came to Eldrin not through training, but from watching storm water pull a dry riverbed flat. The water did not overcome the mud. The mud simply forgot how to let go.
- [ ] **Rubble Spray** — A cone of stone fragments — not precision magic. Effective at clearing a path, discouraging clustering, and reminding enemies that the ground is not their ally. Valdric miners developed the technique. Mages adopted it without asking.
- [ ] **Mud Wall** — Raises a wall of compressed earth and water at the target point. It does not stop determined enemies — it slows them, covers them in mud, and makes them reconsider their trajectory. Eldrin values the psychological component.
- [ ] **Mud Trap** — Place it and walk away. When the next living thing steps on it, the ground collapses inward, coats them thoroughly, and refuses to release them. Eldrin prefers traps that do not require his attention.
- [ ] **Stone Cannon** — A boulder, compressed to the size of a fist, launched at speed that makes it briefly glow from friction. The Asran Academy includes it in textbooks as an example of 'disproportionate elegance.' Eldrin includes it as his preferred answer to heavily-armored enemies.
- [ ] **Tremor** — The ground shifts. Everyone nearby finds their footing briefly unreliable. Eldrin uses it sparingly — not from restraint, but because he has been knocked over by his own spell twice, and plans to learn from that.
- [ ] **Frost Shard** — Ice mana compressed to a single crystal, launched with velocity. It does not melt in flight — it gets colder. Contact leaves the cold sensation long after the shard has shattered. This is not a side effect. This is the point.
- [ ] **Water Conjure** — Draws moisture from ambient mana and releases it as a wave of cold water. Does no damage. Extinguishes fire. Soaks everything in range. Eldrin used it first to put out his campfire. He now considers it one of his most tactically interesting spells.
- [ ] **Frostbite** — An area of cold mana, sustained long enough for flesh to begin to lose sensation. Cold enemies move slower. Enemies already cold find the cold becomes something else entirely. Eldrin considers this his most efficient spell per mana.
- [ ] **Water Blade** — A thin, pressurized blade of water — the same principle used in Valdric quarrying equipment, reduced to a shape a single mage can manage. It cuts. It soaks. The second fact is relevant against lightning.
- [ ] **Vine Grasp** — In the old forests near Valdric, the roots move toward warmth. This is not a metaphor. Eldrin spent three days in one place learning to ask them, rather than command. They respond better to requests.
- [ ] **Petal Storm** — It is beautiful. Genuinely, arrestingly beautiful — a vortex of flower petals made of condensed nature mana, swirling for several seconds. The damage is negligible. The effect on morale, both allied and enemy, is not. Eldrin learned it from a grandmother in Valdric who claimed she invented it to stop arguments.
- [ ] **Acid Splash** — Nature produces toxins for reasons nature does not explain. Eldrin catalogued forty-three plant-based acids before he understood how to synthesize one from mana. The result is less elegant than the originals, but it works at range.
- [ ] **Vessel Mend** — Draws on nature mana to accelerate the body's own repair. Not healing magic in the arcane sense — closer to asking the body to remember how it was. Works best before the situation has become critical. Eldrin applies it immediately, not optimistically.
- [ ] **Spore Cloud** — A cloud of toxic spores, dispersed from a single point. Effective, slow, and slightly alarming to look at. Eldrin notes that it should not be cast upwind of oneself. He knows this from experience.
- [ ] **Barkskin** — The surface hardens, briefly. Not as complete as stone — more like becoming a tree for thirty seconds, which Eldrin finds philosophically interesting and tactically adequate.
- [ ] **Purifying Sweep** — Removes applied substances from the target area. Mud, soot, alchemical residue, certain magical conditions. Entirely impractical in combat — unless the enemy's protections count as residue, which, Eldrin has found, they do. He uses it about once a week. He does not consider this unusual.
- [ ] **Counterspell** — A sharp, precise pulse of mana aimed at a spell still being shaped. The structure collapses before it closes. Eldrin learned the timing the hard way, against a druid who healed faster than he could hurt. The target is left briefly unable to try again.
- [ ] **Arcane Burst** — A wide, short-range detonation of raw mana — no finesse, no geometry. Academic mages look down on it. Eldrin uses it when there are three enemies within arm's reach, which is a situation that does not reward elegance.
- [ ] **Flame Wall** — A curtain of fire, raised between you and whatever you are trying not to think about right now. Enemies walk through it at significant personal cost. Eldrin finds it useful for buying ten seconds to breathe.
- [ ] **Fire Rain** — Fire mana, dispersed upward and allowed to fall. The timing is wrong for anyone underneath it. Eldrin calculates the arc without thinking about it anymore. He is somewhat concerned about that.
- [ ] **Chain Lightning** — Hits one. Jumps to another. Continues until the chain finds no new target or runs out of patience. Eldrin does not know how many times it jumps exactly. He stopped counting after six.
- [ ] **Static Field** — A zone of charged air. Anything that moves through it triggers a discharge. Eldrin lays it before a chokepoint and walks away. There is a word for this approach and it is not 'elegant,' but it works.
- [ ] **Shadow Bolt** — A dense projectile of shadow mana. Not subtle. Not symbolic. It simply hits the target with the weight of something that should not exist, moving very fast. Eldrin prefers his shadow magic to have some nuance. He keeps this one for emergencies.
- [ ] **Life Drain** — Shadow mana follows the oldest rule: what is taken must go somewhere. The vitality drawn from a target travels back along the spell-thread. Eldrin uses it rarely. It works too well for something that feels so wrong.
- [ ] **Spike Field** — The ground opens. Spikes rise. Anything between them reconsiders its trajectory, usually in a direction that involves falling. Eldrin casts it ahead of approaching groups. He does not need to look afterward.
- [ ] **Glacial Spike** — A single spike of solid ice, large enough to be alarming, launched on a flat trajectory. Hits hard. Applies cold. If the target was already cold, the cold goes deeper. Eldrin finds the physics satisfying.
- [ ] **Ice Prison** — Ice, grown rapidly around a single point of warmth. The target is not harmed by the cold itself — the problem is that they cannot move until the ice breaks. Eldrin considers this his most humane crowd-control spell. The target would probably disagree.
- [ ] **Thornwall** — Dense thornbriar, grown in seconds. Passage through it is painful and slow. Even determined enemies find it persuasive. Eldrin uses it to redirect, not to stop — he finds the idea of blocking a path philosophically interesting.
- [ ] **Wind Knife** — Fast. Very fast. Faster than most enemies expect a mage to be. The knife hits and is gone before the target has registered the sting. Eldrin appreciates spells that do not linger.
- [ ] **Drying Wind** — A warm, dry wind that strips moisture from anything in range. Removes the wet condition. Applies the dried condition. Against fire, this is significant. Against lightning, the opposite — Eldrin uses it carefully and with awareness of who is standing where.
- [ ] **Gale Slash** — Compressed wind, released in a single blade shape. The cut it leaves is real despite the blade being air. Valdric philosophers argue about what exactly is doing the cutting. Eldrin does not participate in the debate.
- [ ] **Tempest Step** — Move very quickly in the direction you are facing. Arrive somewhere else. The wind does not ask where you were going — it takes you where you pointed. Eldrin prefers this to blink_step on days when he wants to feel the movement.
- [ ] **Cyclone** — A column of rotating wind, sustained. Enemies inside it are moved by the wind's opinion about where they should be, which differs significantly from their own. Eldrin spent several months developing the rotational structure needed to keep it stable. He considers it his best wind spell and does not acknowledge the time investment.
- [ ] **Wind Barrier** — A rotating shell of wind mana around the caster. Projectiles slow down. Not everything gets through. Eldrin uses it when he expects to be shot at, which happens more often than he would like.
- [ ] **Tidal Bolt** — A fist of river water thrown hard enough to knock the breath out of a wolf. Eldrin learned it on the banks of the Silverrun, where the current does half the work if you let it. The target is left soaked, which the lightning-minded find very convenient.
- [ ] **Riptide** — A patch of ground turns, for a heartbeat, into the pull of an ebbing tide. Everything standing in it is dragged and left sluggish with cold water in its boots. The fishermen of Port Silver curse the real thing. Eldrin found a use for it.
- [ ] **Torrent Lance** — A spear of water under such pressure that it cuts before it splashes. It passes through the first enemy and the one behind it and the one behind that. Eldrin keeps his distance from walls when he casts it, having once learned what the rebound feels like.
- [ ] **Mistward** — A cloak of cold sea-mist that clings to the caster. Blows land softer, arrows lose their line, and the caster feels, briefly, like the calm at the bottom of a deep lake.
- [ ] **Maelstrom** — A whirlpool torn open in the air. It drags everything in reach toward its eye and holds it there, spinning, drowning on dry land. The greatest of the water workings; the old tales say the first one sank a harbour.

### 7.2 The Hermit, the Sanctuary, the regions' signs and villagers

The region lore lines, signs and villager lines are listed under each place in §1.1 and §2.2. The Hermit's and the Elemental's lines follow the book (ch. 9–10) — review them in-game, or ask for a dump.

## 8. Races and how the game shows them

- [ ] **Werewolves, playable** (Forge race): a human ↔ wolf change (faster, claws ×1.8, no spells in wolf form). DB: the race Werewolf ✅; **being playable and the change are game-made.** (No werewolf villagers, as you asked.)
- [ ] **How the elven races look**: Aurorians with pointed ears and an inner light, Nythorians with shadow skin, Fallen Aurorians with dark veins (game-made looks)
- [ ] **Dwarves** — not in the game, not in the lore (still your call)

## 9. Already in the DB as game-origin (for a second look)

- Region: **The Silver Coast** — The eastern seaboard of Eldoria, a stretch of coastal cliffs and fishing towns where the Silverrun River meets the sea.
- Region: **The Heartlands** — The central plains of Eldoria, a fertile region of rolling hills, scattered farms, and the tranquil Lake Aethera.
- Location: **Port Silver** — A bustling coastal town on Eldoria's eastern shore. Its grey-sand harbor welcomes fishing vessels and the rare merchant ship from across the Silverrun. Known for its salty ale and quiet neutrality.
- Location: **The Crossroads** — A central trading village where the old north-south and east-west routes meet. A worn stone inn, a weathered market square, and travellers from every corner of Eldoria.
- Location: **Iron Hollow** — A grim mining settlement in the northern mountain foothills. Its tunnels yield iron and coal, fueling Eldoria's forges. Hard folk, hard lives, and a tavern called The Grinding Wheel.
- Location: **Graywatch** — A stone border keep standing between The Scarlands and Whisper-Wood. Built to watch for shadow-touched creatures creeping out of the dark forest. Sparse garrison, long nights.
- Location: **The Sunken Temple** — Ancient ruins half-submerged in the shallows of Lake Aethera. Pre-dates the Crimson Covenant. Its hollow chambers echo with carvings in a forgotten script. Fishermen speak of lights beneath the water 
- Location: **Duskmeet** — A small frontier hamlet on the northern edge of Whisper-Wood. Its residents keep lanterns lit all night and nail iron horseshoes above every door. A last stop before the dark.
- Location: **The Weeping Stones** — A circle of seven standing monoliths in the southern Emerald Fields, carved with weeping faces worn smooth by centuries of wind. No one remembers who raised them. Locals leave offerings of wildflowers
- Location: **Lake Aethera** — The largest body of fresh water in Eldoria, cradled in the Heartlands. Its surface is unnervingly still, reflecting the sky like polished silver. The Sunken Temple rests in its shallows.
- Location: **Silverrun River** — The primary waterway of Eldoria, flowing from the northern mountains past Thaloria, through the Heartlands, and emptying into the sea at Port Silver. A vital trade route.

---
_Sources: `apps/amo3d/src/content/` (regions, maps, chapters, actors), `packages/rules/src/data/` (items, spells, quests, dialogues, bestiary, worldMap), the lore DB on scarif (read only). Regenerate after big content changes._
