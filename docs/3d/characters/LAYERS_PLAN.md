# Character layers — one sculpt, many characters (plan, 2026-11-26)

Decided with the user: six bodies with their own looks — **man, woman, boy, girl, old man, old woman** — every base
updatable at once, and **overrides** per character on top (the quest-giving kid who looks a little different). The layers
hold **the model's shape only — body and face**; clothes and hair are not part of them (corrected by the user,
2026-11-26): they stay separate parts that dress whatever shape the body has. A character's override is saved with it, next
to its clothes and accessories. Edited in the Character Lab, which can **show a set of basic clothes and hair** on the
model while sculpting. This comes before §2 (every NPC and the Forge on v2): nothing sculpted later should be lost on one NPC.

## Why the change is needed
Today the hand edits (`models/v2/edits_male.json`, `edits_female.json`) are filed under the **exact position** of each
point once the body is built. The rig scales the body for its proportions (child, elder, the Forge's height/width/head
sliders), so for any body not of the standard adult proportions the points land elsewhere and the edits miss. The female
head already needed a special bridge (`share` in base.js) to borrow the male face's edits.

## The design
**1. Design space.** Every point of the body and face gets a stable key from the generator's own coordinates (which ring,
which part, which side — before any proportions), and every edit is an offset in that space, scaled onto the body that is built. The same
edit then lands right on a tall man, a small girl or a stooped elder.

**2. Layers**, each a set of point offsets, stacked in this order (the later wins where two move the same point):

| Layer | Who it reaches |
|---|---|
| **Common** | everyone — "update every base at once" |
| **Sex**: Male · Female | every man / every woman, of every age |
| **Age** (per sex): Boy · Girl · Old man · Old woman | every child / elder of that sex (adults have none) |
| **Character override** | one character only |

So the quest kid = Common + Male + Boy + **his override**. Every other boy = the same without the override — and a change to the Boy layer reaches all of them, him included (his override only
stores his differences).

**3. Where it is saved.**
- Common, sex and age layers: `models/v2/layers/{common, male, female, boy, girl, old_man, old_woman}.json`.
- A character's override: in its look (cast `*.json`, the townsfolk / villager definitions), next to its clothes and
  accessories — `look.v2.override: { points: {key: [dx, dy, dz]} }` (shape only).
- Clothes and hair are not layers: they are built on the shaped body, so they follow it.

**4. The Character Lab.** A layer picker: Common · Man · Woman · Boy · Girl · Old man · Old woman · any character by name. The model shown is always the composed result; your drags go into the chosen layer (highlighted,
so you always know what you are changing), and the points that layer has moved are marked. Save, undo, Blender
export/import per layer. "Show the layers below" toggles (e.g. see the Boy layer without Common). **Dress the model**:
a toggle to show a set of basic clothes and hair on the body being sculpted (plain tunic and trousers, a simple gown, a few
hairstyles; or a character's own) — only a view, to judge the shape dressed; it saves nothing into the layers.

## The Sculptor (the Character Lab, renamed — decided 2026-11-26)
The Lab becomes **the Sculptor**: the workbench where the models' shapes are made — a developer's tool, never shown to
players. **The Forge** stays the place where characters are created and dressed (players' heroes, the cast, NPCs). They are
linked both ways: the Forge's **"Sculpt this character"** opens the Sculptor on that character's override (dressed in its
own clothes and hair); the Sculptor's **"dress the model"** takes its clothes and hair from the Forge's wardrobe (one
wardrobe). In the Workshop menu: *The Forge — create and dress characters*; *The Sculptor — shape the bodies and creatures*.

**Alternate bodies.** Any layer can have alternates — named drafts to work on beside the one in use ("Man — broader jaw",
"Girl — draft 2"): save as, switch, compare side by side, and **make active** when one is right (the game uses only the
active one). Saved beside the layer (`layers/<layer>@<name>.json`).

**Every entity, total control.** The Sculptor shapes not only the six bodies but **the mobs and the animals** (and the
werewolves, in both forms, when they come): each creature kind is a base with its own layer (and alternates), and a single
creature can have an override (a named elite, a boss). Today the creatures are built from simple shapes (boxes, cones,
spheres — a box has 8 points), so each kind first gets a finer body to sculpt — kind by kind, the ones the user wants
first — then joins the same point keys and layers.

## Steps
1. **Design-space keys** for every point of the body and face and **migrate** the present male and female
   edits into the Common/Male/Female layers — checked by rendering: the male and female faces and bodies must come out
   identical to today. The `share` bridge goes (the layers replace it).
2. **The layer stack** in `buildBase` (common → sex → age → garments → hair → override), scaled onto each body.
3. **Ages:** boy, girl, old man, old woman as real bodies (proportions and starting shapes to sculpt from — a child's
   rounder face and larger eyes, an elder's heavier lines and stoop), each with its empty age layer.
4. **The Sculptor**: the Lab renamed; the layer picker (pick, edit, save, compare), **alternates** (save as, switch,
   compare, make active), overrides in the looks, **dress the model** (the Forge's wardrobe), and the Forge's "Sculpt this
   character".
5. Then **§2**: NPCs and the Forge onto v2 — each character picks its layers from its sex and age; its clothes and hair
   dress the shaped body.
6. **Creatures** in the Sculptor, kind by kind: a finer body for the kind, its point keys, its layer and alternates,
   overrides for single creatures; the werewolves (both forms) when they come.

Each step is tested headless (point counts, keys stable across proportions, the composed result) and checked by eye with
the user on the Lab before the next.
