# "A Tapestry of Souls: The Awakening" — Implementation Plan (Trilogy Setup + Album 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the old single album *A Tapestry of Souls* into the 0 GD trilogy, and fully produce its first album, *The Awakening* (10 songs: 1 light-touch rework + 9 new lore-first songs), in the standard album-production format.

**Architecture:** This is a lore/creative production, not software. Each song is an XML file pair (master + per-song archive) following `data/lore/xmls/album_production_process.md`. The plan: (1) global setup — archive the old master, scaffold the three trilogy masters + archive dirs, add a reusable verification script; (2) produce each of the album's 10 songs (kept song = light-touch rework, new songs = lore-first lyrics); (3) final album verification (XML parse, master/archive diff, ACC lore check against Neo4j).

**Tech Stack:** XML (custom schema), Python 3 (standard lib only: `xml.etree.ElementTree`), Neo4j (read-only verification), git.

## Global Constraints

- **Canon source of truth:** The Neo4j graph on scarif (`bolt://192.168.0.159:7687`, `neo4j`/`vwnx6h8g`) is authoritative. Verify any character/place/event/name against it before writing lyrics. `world_lore.md` mirrors it.
- **origin property:** Every node/song introduced by this work carries `origin: "album"`.
- **Media-model rule:** Characters never reference songs or albums in-world. No meta lyrics ("this song", "the album"). Replace in-world "the songs tell" phrasing with old tales / the vision / the record.
- **Music is primary; album XMLs are canon.** Do not invent lore that contradicts the DB; when the XML and DB disagree, fix the doc.
- **Era:** All three trilogy albums are **Era II (0 GD)**. No Era III content (no "Queen of Carnage" — Seraphina's Era III title — no Shadow Legion, no formal New Ravenspire founding).
- **Rework rules (kept songs):** structure frozen (no sections added/removed); ≥70% of original lines verbatim; lore anchors only where a generic line begs for it; preserve syllable count and rhyme so the melody is untouched; keep hook/title/mood; no POV change unless the spec mandates it.
- **Canon fixes (apply to kept songs, regardless of lightness):** Celestial Rebellion "Queen of Carnage" → **"Queen of the Fallen"**; "Impossible Key" → **The Void-Echo** / **The Living Lock**; Shadows and Stardust "the Stone" → the Tablets; Empire of the Void: no "humble scholar" line (Anya never joins the Void); Stormbringer: Anya wields Vorgos's power, never claims his title.
- **XML rules:** NEVER use `n/a` in an attribute name (unparseable) — use `not_applicable`. Master `<Lyrics>` uses `[Verse 1]`-style bracket headers; archives use `<section name="...">`. Content must be identical apart from the headers.
- **Spellings (canonical):** Nyktoros (not Nyktoros' variants), Ravenspire, Vorgos, Eldoria, Nythoria, Auroria, the Underworld, the Great Rift, the Legion of Souls, the Void-Echo, the Living Lock, the Forbidden Tome, the Crystal Sanctum, the Celestial Gardens, the Black Well.
- **Album size:** ≥10 songs per album. This album: exactly 10.

---

## File Structure

**Created / modified by this plan:**

| File | Responsibility |
|---|---|
| `data/lore/xmls/archived_data/A_Tapestry_of_Souls_pre_split.xml` | The old 13-song master, archived (read-only reference for OriginalLyrics). |
| `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` | Master album 1 (this plan produces it fully). |
| `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Paradox_of_Light.xml` | Master album 2 — **scaffolded only** (kept songs copied); produced by the sibling plan. |
| `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_Dawn_of_Ravenspire.xml` | Master album 3 — **scaffolded only**; produced by the sibling plan. |
| `archives/processed_albums/A Tapestry of Souls - The Awakening/*.xml` | One per-song archive file (10 files). |
| `archives/processed_albums/A Tapestry of Souls - The Paradox of Light/` | Empty dir (scaffold only). |
| `archives/processed_albums/A Tapestry of Souls - Dawn of Ravenspire/` | Empty dir (scaffold only). |
| `data/scripts/verify_album.py` | Reusable verification script (parse-check + master/archive diff). |

**Album 1 master skeleton (acts & tracks):**

```
Act I: The Rising of the Void
 1. The Tilt            (new)   Vorgos — the balance tips
 2. The Awakening       (new)   Nyktoros stirs
 3. Empire of the Void  (kept)  Legion/Nyktoros anthem
 4. March of the Legion (new)   The Legion of Souls unleashed
Act II: The War for Nythoria
 5. The First Stand     (new)   Seraphina & Valen defend
 6. The Fall of Ravenspire (new) The ancestral ruins burn
 7. The Unending War    (new)   the war grinds on
 8. Auroria's Lament    (new)   the Celestial Plane watches
Act III: The Sentinel's Gambit
 9. The Sentinel's Gambit (new) Vorgos's agonized decision
10. Torn from the Stars (new)   the Rift, Anya plucked (cliffhanger)
```

---

### Task 1: Global setup — archive old master, scaffold trilogy, verification script

**Files:**
- Move: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls.xml` → `data/lore/xmls/archived_data/A_Tapestry_of_Souls_pre_split.xml`
- Create: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml`
- Create: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Paradox_of_Light.xml`
- Create: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_Dawn_of_Ravenspire.xml`
- Create: `data/scripts/verify_album.py`
- Create dirs: `archives/processed_albums/A Tapestry of Souls - The Awakening/`, `archives/processed_albums/A Tapestry of Souls - The Paradox of Light/`, `archives/processed_albums/A Tapestry of Souls - Dawn of Ravenspire/`

**Interfaces:**
- Consumes: the old `A_Tapestry_of_Souls.xml` (source of the kept songs' `<OriginalLyrics>`).
- Produces: the 3 master files (albums 2 & 3 scaffolded with their kept songs), the 3 archive dirs, `verify_album.py` (`python3 data/scripts/verify_album.py "<Album Name>"` → exit 0 on PASS, 1 on FAIL).

- [ ] **Step 1: Verify repo state**

Run: `git status --short`
Expected: working tree clean (or only the spec/design docs uncommitted). Note any unexpected files.

- [ ] **Step 2: Archive the old master**

```bash
git mv data/lore/xmls/processed_albums/A_Tapestry_of_Souls.xml data/lore/xmls/archived_data/A_Tapestry_of_Souls_pre_split.xml
```

- [ ] **Step 3: Create the archive directories**

```bash
mkdir -p "archives/processed_albums/A Tapestry of Souls - The Awakening"
mkdir -p "archives/processed_albums/A Tapestry of Souls - The Paradox of Light"
mkdir -p "archives/processed_albums/A Tapestry of Souls - Dawn of Ravenspire"
```

- [ ] **Step 4: Scaffold the three master files**

For each album, create a master XML with the structure below. **Album 1** starts with only its kept song (`Empire of the Void`) copied verbatim from the archived master (its `<OriginalLyrics>` + current `<Lyrics>` + `<analysis>`). **Album 2** starts with its 7 kept songs (Eternal Nightfall, After the Snowfall, Mystic Horizon, Learning to Fly, Shadows and Stardust, Stormbringer, Symphony of Suffering) and **Album 3** with its 5 kept songs (Eclipse of Destiny, Shadows in the Rain, Endless Night, Haunting Life, Celestial Rebellion), each copied verbatim. Album-level template:

```xml
<album album="A Tapestry of Souls: The Awakening">
    <AlbumPlot><![CDATA[
### "A Tapestry of Souls: The Awakening" — The 0 GD Trilogy, Part I (Era II)

[One-paragraph arc: Nyktoros's rising, the Legion of Souls, the invasion of
Nythoria, the war, Vorgos watching and deciding to pluck Anya from Auroria,
ending on the Great Rift tearing open and Anya falling. See the design spec:
docs/superpowers/specs/2026-08-04-tapestry-of-souls-trilogy-design.md.]
    ]]></AlbumPlot>
    <Act act="I: The Rising of the Void">
        <Song song="Empire of the Void">
            <song_id>3</song_id>
            ...verbatim copied from archived master...
        </Song>
    </Act>
    <Act act="II: The War for Nythoria">
    </Act>
    <Act act="III: The Sentinel's Gambit">
    </Act>
</album>
```

For albums 2 and 3: `album="A Tapestry of Souls: The Paradox of Light"` and `album="A Tapestry of Souls: Dawn of Ravenspire"`, with one-line placeholder arcs (to be expanded by their own plans) and their kept songs copied with `<song_id>` values per the locked tracklists in the design spec. Empty acts are fine at scaffold time. **No new-song placeholders** — new songs are added by their tasks.

- [ ] **Step 5: Write the verification script**

Create `data/scripts/verify_album.py`:

```python
#!/usr/bin/env python3
"""Verify a processed album: parse-check master + archives, and diff each
archive <reworked> block against the master <Lyrics> (ignoring [Section]
headers and normalizing curly -> straight apostrophes).

Usage: python3 verify_album.py "<Album Name>"
Exit 0 on PASS, 1 on FAIL.
"""
import sys, glob, os, re
import xml.etree.ElementTree as ET

CURLY = {'\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"'}

def normalize(text):
    for k, v in CURLY.items():
        text = text.replace(k, v)
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\t', ' ')
    return re.sub(r'^\[[^\]]+\]\s*$', '', text, flags=re.M).strip()

def archive_reworked(path):
    root = ET.parse(path).getroot()
    blocks = []
    for sec in root.findall('./lyrics/section'):
        rw = sec.find('reworked')
        if rw is not None and rw.get('not_applicable') != 'true' and (rw.text or '').strip():
            blocks.append(normalize(rw.text))
    return '\n\n'.join(blocks)

def master_lyrics(master_path, song_name):
    if not os.path.exists(master_path):
        return None
    root = ET.parse(master_path).getroot()
    for song in root.findall('.//Song'):
        if song.get('song') == song_name:
            lyr = song.findtext('Lyrics')
            return normalize(lyr or '')
    return None

def main():
    album = sys.argv[1]
    archive_dir = f'archives/processed_albums/{album}'
    master_path = f'data/lore/xmls/processed_albums/{album.replace(" ", "_")}.xml'
    errors = 0
    all_files = [master_path] + sorted(glob.glob(archive_dir + '/*.xml'))
    for path in all_files:
        if not os.path.exists(path):
            print(f'MISSING: {path}')
            errors += 1
            continue
        try:
            ET.parse(path)
        except ET.ParseError as e:
            print(f'PARSE ERROR: {path}: {e}')
            errors += 1
    for path in sorted(glob.glob(archive_dir + '/*.xml')):
        name = os.path.basename(path)[:-4]
        rw = archive_reworked(path)
        lyr = master_lyrics(master_path, name)
        if lyr is None:
            print(f'WARN: "{name}" has no <Lyrics> in the master')
            errors += 1
        elif rw != lyr:
            print(f'DIFF: "{name}" archive <reworked> != master <Lyrics>')
            errors += 1
    print('PASS' if errors == 0 else f'{errors} error(s)')
    sys.exit(0 if errors == 0 else 1)

if __name__ == '__main__':
    main()
```

- [ ] **Step 6: Run the verification script on the archived album name to smoke-test it**

Run: `python3 data/scripts/verify_album.py "A Tapestry of Souls"`
Expected: reports WARN (songs exist in archive? none yet) or at minimum no PARSE ERROR — the archived master itself parses. It is acceptable for this call to be noisy; the script's job is confirmed once it runs without a traceback.

- [ ] **Step 7: Parse-check the three new masters**

Run:
```bash
python3 -c "import xml.etree.ElementTree as ET; [ET.parse(p) for p in __import__('glob').glob('data/lore/xmls/processed_albums/A_Tapestry_of_Souls_*.xml')]; print('OK')"
```
Expected: prints `OK`.

- [ ] **Step 8: Commit**

```bash
git add data/lore/xmls/archived_data/A_Tapestry_of_Souls_pre_split.xml \
        data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml \
        data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Paradox_of_Light.xml \
        data/lore/xmls/processed_albums/A_Tapestry_of_Souls_Dawn_of_Ravenspire.xml \
        data/scripts/verify_album.py \
        "archives/processed_albums/A Tapestry of Souls - The Awakening" \
        "archives/processed_albums/A Tapestry of Souls - The Paradox of Light" \
        "archives/processed_albums/A Tapestry of Souls - Dawn of Ravenspire"
git commit -m "feat(lore): scaffold 0 GD trilogy from A Tapestry of Souls; add verify_album.py"
```

---

### Task 2: Empire of the Void — light-touch rework (kept, The Awakening #3)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/Empire_of_the_Void.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (`<Lyrics>` + `<analysis>` for this song)

**Interfaces:**
- Consumes: `Empire of the Void` `<OriginalLyrics>` from the archived master; the light-touch rules and canon fixes in Global Constraints.
- Produces: production archive file + synced master `<Lyrics>`; a user review gate.

**Required changes (the ONLY changes allowed):**
- POV is the Legion / Nyktoros ("we"/"our" — a collective anthem). It is NOT Anya.
- Verse 1: keep the original structure; anchor "a kingdom forged in darkness" → Nyktoros's awakening. Suggested anchor words: *Aurorian suns, Nythoria, the Void, Nyktoros*.
- Chorus: keep **verbatim** (it already fits the Empire of the Void).
- Verse 2: keep structure; "eclipsing suns and galaxies" stays, but the power belongs to the Master/Nyktoros.
- Bridge: the archived master's current line **"No more the humble scholar, our banners waving high"** MUST be removed — Anya never joins the Void. Replace with a Legion-line that preserves the original bridge's syllable count (the original read "We conquer through the silence, our banners waving high").
- Verse 3: keep structure; the "ancient throne" is Nyktoros's, the "tyranny of day" is Auroria's light.
- Outro: keep; end on the Empire / Nyktoros's reach, not any character's conversion.

- [ ] **Step 1: Write the production archive file**

Create `archives/processed_albums/A Tapestry of Souls - The Awakening/Empire_of_the_Void.xml` following the archive format from `album_production_process.md` and the example at `archives/processed_albums/Crimson Covenant/Rising_Tide.xml`: `<song name="Empire of the Void" status="in_review" version="draft">` with `<plot>` (CDATA: what happens — Nyktoros's anthem as the Legion declares), `<analysis>` (CDATA: rework rationale, the "humble scholar" removal, lore anchors, suggested Suno direction — dark anthemic, choir, heavy), and `<lyrics>` with one `<section>` per part (`Verse 1`, `Pre-Chorus`, `Chorus`, `Verse 2`, `Bridge`, `Verse 3`, `Outro`), each containing `<original>` (the archived original lines) and `<reworked>` (the light-touch version). Keep section headers and repeats faithful to the original file.

- [ ] **Step 2: Update the master `<Lyrics>`**

In `A_Tapestry_of_Souls_The_Awakening.xml`, replace this song's `<Lyrics>` with the same reworked text (with `[Verse 1]`-style headers) and update `<analysis>` to a one-line summary of the rework.

- [ ] **Step 3: Verify**

Run: `python3 data/scripts/verify_album.py "A Tapestry of Souls - The Awakening"`
Expected: PASS (no parse errors, no diffs). If DIFF appears, fix the mismatch.

- [ ] **Step 4: Present to user for the listening/review gate**

Show the user: original vs reworked side by side (full lyrics, every repeat). The user must listen to the Suno audio and approve before this is marked `human_reviewed`/`production_ready` (per `album_production_process.md` Step 3). On approval, set `status="human_reviewed" version="production_ready"` in the archive; if the audio differs from the working file, create a save-point `Empire_of_the_Void_AUDIO_VERSION.xml`, update the working file to match, then delete the save-point.

- [ ] **Step 5: Commit**

```bash
git add "archives/processed_albums/A Tapestry of Souls - The Awakening/Empire_of_the_Void.xml" \
        data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml
git commit -m "feat(album): light-touch rework of Empire of the Void (The Awakening)"
```

---

### Task 3: The Tilt — new song (The Awakening #1)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_Tilt.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act I as song_id 1)

**Song spec (write lyrics to these constraints):**
- **POV:** Vorgos the Stormbringer, first person ("I"). Universal Sentinel, Aether-dweller, pragmatic, not omniscient, not benevolent. Grave and monumental.
- **Story beat:** Before Nyktoros is awake — Vorgos senses the planar balance tilting. The two leaks: Acheron's vampiric soul-banking in Eldoria, Malakar's ritual sacrifices in Nythoria. The Underworld soul-pool nears critical mass.
- **Structure:** Verse 1 → Pre-Chorus → Chorus → Verse 2 → Chorus → Bridge → Chorus. 4 lines per verse, 4-line chorus, standard rock/ballad meter (8–10 syllables per line, consistent within a section).
- **Mandatory lore anchors:** the Aether, the three planes (Auroria / Eldoria / Nythoria) as frequencies, "the tilt" of the scales, the two leaks, the sleeping Void beneath the Underworld, the Stormbringer's domain.
- **Must NOT contain:** Nyktoros already awake (he isn't yet), the Rift (not opened yet), Anya (not chosen yet), Seraphina/Valen, any war/battle imagery.
- **Tone (Suno direction for `<analysis>`):** low, slow, brooding — deep strings, storm-rumble, restrained drums, ominous choir swells. Grave opener.
- **Prose note:** No meta references to songs/albums.

- [ ] **Step 1: Write the production archive file**

Create `The_Tilt.xml`: `<song name="The Tilt" status="in_review" version="draft">`, `<plot>` (CDATA: Vorgos senses the tilt), `<analysis>` (CDATA: rationale + anchors + Suno direction), `<lyrics>` with `<section>` per part. Since this is a new song there is no original — use `<original not_applicable="true">—</original>` and put the lyrics in `<reworked>`.

- [ ] **Step 2: Add to the master**

In `A_Tapestry_of_Souls_The_Awakening.xml`, add under `<Act act="I: The Rising of the Void">` (before Empire of the Void): a `<Song song="The Tilt">` block with `<song_id>1</song_id>`, `<Lyrics>` (with `[Verse 1]` headers, identical text), and a one-line `<analysis>`.

- [ ] **Step 3: Verify**

Run: `python3 data/scripts/verify_album.py "A Tapestry of Souls - The Awakening"`
Expected: PASS.

- [ ] **Step 4: User review gate**

Show the user the full lyrics (every repeat). User approves the lyrics; then the user generates the Suno audio and listens. On approval, mark `human_reviewed`/`production_ready` (and handle audio save-points per `album_production_process.md` Step 3).

- [ ] **Step 5: Commit**

```bash
git add "archives/processed_albums/A Tapestry of Souls - The Awakening/The_Tilt.xml" \
        data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml
git commit -m "feat(album): add The Tilt (The Awakening)"
```

---

### Task 4: The Awakening — new song (The Awakening #2)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_Awakening.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act I, song_id 2)

**Song spec:**
- **POV:** Nyktoros / the Void itself, or the omniscient narrator describing the manifestation. If first person, the "I" is Nyktoros.
- **Story beat:** The Underworld soul-pool hits critical mass; Nyktoros, the sleeping god, wakes and breaches the planar barrier. The first dark breath of the Great Darkness.
- **Structure:** Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro. Slow build; the chorus is the anthem moment.
- **Mandatory lore anchors:** the Underworld (deepest stratum of Nythoria), the shadow-energy reaching critical mass, the Legion of Souls (name it), the planar barrier tearing, "the black sun", the Void's hunger for light.
- **Must NOT contain:** the Rift (Vorgos opens it later), Anya, Vorgos, Eldoria, Seraphina/Valen, any specific battle.
- **Tone (Suno):** dark, monumental, slow build to anthemic — low choir, tolling bells, sub-bass, rising intensity. The album's villain-establishing epic.
- **Title collision note:** the album title and this song share "The Awakening" — this is intentional (title track of The Awakening).

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act I as song_id 2 → run `python3 data/scripts/verify_album.py "A Tapestry of Souls - The Awakening"` → user review gate → commit `feat(album): add The Awakening (The Awakening)`).

---

### Task 5: March of the Legion — new song (The Awakening #4)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/March_of_the_Legion.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act I, song_id 4)

**Song spec:**
- **POV:** The Legion of Souls (collective "we"), the corrupted horde of the Void — Nythorians lost to the Void's influence and the damned souls Nyktoros commands. Voice of the Legion.
- **Story beat:** The Legion of Souls is unleashed across Nythoria. The war anthem of the invasion.
- **Structure:** Verse → Chorus → Verse → Chorus → Bridge → Chorus → Outro. Driving war rhythm; short punchy lines (6–8 syllables).
- **Mandatory lore anchors:** the Legion of Souls, Nythoria, the Void as master, souls conscripted, the "banked souls" of the sacrifices (ties to the soul-leak canon), the fall of light.
- **Must NOT contain:** named individual heroes, the Rift, Eldoria, Anya, Seraphina, Valen, Nyktoros-speaks-in-first-person (the Legion speaks for him).
- **Tone (Suno):** relentless march — double-kick drums, war horns, chanting crowd vocals.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act I as song_id 4 → verify → user review gate → commit `feat(album): add March of the Legion (The Awakening)`).

---

### Task 6: The First Stand — new song (The Awakening #5)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_First_Stand.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act II, song_id 5)

**Song spec:**
- **POV:** Seraphina and/or Valen (duet-friendly), Nythorian resistance fighters, first person plural "we". This is their introduction to the saga.
- **Story beat:** The Legion of Souls reaches them; Seraphina and Valen make their stand with the rebels — fighting a tide they cannot hold. Introduces them as defenders of what remains of Nythoria.
- **Structure:** Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus. Mid-tempo defiant ballad-anthem.
- **Mandatory lore anchors:** Nythoria, Ravenspire (the ancestral ruins — their home/ground), the resistance, the Legion of Souls, holding ground against the dark. Seraphina and Valen named (or clearly "I"/"we" with them as subject per the album's analysis).
- **Must NOT contain:** founding-the-resistance plot (that is Vows of Silence, Era I) — they are already rebels here; the Rift; Anya; the Underworld; any "Queen" title.
- **Tone (Suno):** defiant, desperate, warm under the grim — anthem rock, battle drums, twin vocals.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act II as song_id 5 → verify → user review gate → commit `feat(album): add The First Stand (The Awakening)`).

---

### Task 7: The Fall of Ravenspire — new song (The Awakening #6)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_Fall_of_Ravenspire.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act II, song_id 6)

**Song spec:**
- **POV:** Seraphina (or Seraphina + Valen), first person. The song where home is lost.
- **Story beat:** The Legion of Souls overruns the ancestral ruins of Ravenspire in Nythoria. Seraphina watches her home burn; the invasion of Nythoria is complete. (This is the Era II "invasion/fall of Nythoria" beat — distinct from the Era III "Fall of Nythoria" event ~230 AGD, which is Seraphina conquering Malakar. Keep the lyrics to the Legion's destruction.)
- **Structure:** Verse 1 → Chorus → Verse 2 → Chorus → Bridge (grief) → Chorus → Outro. Slow, mournful build; 8–10 syllable lines.
- **Mandatory lore anchors:** Ravenspire (ancestral ruins), Nythoria, the Legion of Souls, the Shadow-Kin, ash, what the Void took.
- **Must NOT contain:** crossing to Eldoria (later), the Rift, Anya, founding anything, "Queen".
- **Tone (Suno):** tragic, cinematic — choir over mournful strings, heavy but slow, emotional peak.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act II as song_id 6 → verify → user review gate → commit `feat(album): add The Fall of Ravenspire (The Awakening)`).

---

### Task 8: The Unending War — new song (The Awakening #7)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_Unending_War.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act II, song_id 7)

**Song spec:**
- **POV:** The survivors / resistance ("we"), or a third-person war chronicle. The grinding middle of the war.
- **Story beat:** The war against the Legion drags on — no victory in sight, ground lost, the planes bleeding. Day after day of holding against an endless tide.
- **Structure:** Verse → Chorus → Verse → Chorus → Bridge → Chorus. Driving, relentless; punchy lines.
- **Mandatory lore anchors:** the Legion of Souls, Nythoria, the war without end, the fading light, the planes, the resistance's dwindling hope. May name the Shadow-Vale or the Black Well as battlegrounds (verify these exist in the DB first: Location nodes `The Shadow-Vale`, `The Black Well`, both in Nythoria Surface).
- **Must NOT contain:** Vorgos acting (he watches, hasn't acted yet), Anya, the Rift, any victory.
- **Tone (Suno):** relentless war anthem — fast drums, aggressive guitars, exhausted-but-fighting vocals.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act II as song_id 7 → verify → user review gate → commit `feat(album): add The Unending War (The Awakening)`).

---

### Task 9: Auroria's Lament — new song (The Awakening #8)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/Aurorias_Lament.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act II, song_id 8)

**Song spec:**
- **POV:** The Aurorians / Auroria itself (collective), or an omniscient narrator. The Celestial Plane grieving.
- **Story beat:** From the high plane of light, the Aurorians watch the storm gathering below — the darkness rising in the lower frequencies, their world dimming as the balance breaks. Foreshadows what Auroria will lose.
- **Structure:** Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus. Ethereal, slow.
- **Mandatory lore anchors:** Auroria, the Celestial Gardens (and/or the Astral Archives, the Crystal Sanctum — Anya's home), the three planes, the light dimming, the frequencies. Anya is NOT yet named or taken (she's still here — the plucking is the next album beat). May reference "the scholars who study the sky" (the seers).
- **Must NOT contain:** the Rift, Anya's name, Vorgos, the war's battles, any character POV from Nythoria.
- **Tone (Suno):** ethereal, sorrowful — high female choir, celesta/glass, slow strings, celestial pads.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act II as song_id 8 → verify → user review gate → commit `feat(album): add Auroria's Lament (The Awakening)`).

---

### Task 10: The Sentinel's Gambit — new song (The Awakening #9)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/The_Sentinels_Gambit.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act III, song_id 9)

**Song spec:**
- **POV:** Vorgos, first person. The agonized decision.
- **Story beat:** Vorgos, Sentinel of the Aether, has watched the tilt and the war. Now he must act: pluck a mortal from Auroria and throw her into the war-torn Underworld as a cosmic stop-gap. He does it because the balance demands it — pragmatic, not benevolent, and it costs him something (his role as passive observer; the harm to one life).
- **Structure:** Verse 1 → Pre-Chorus → Chorus → Verse 2 → Chorus → Bridge → Chorus. Grave, swelling.
- **Mandatory lore anchors:** the Aether, the Stormbringer, the balance, the Great Rift (he will tear it open — can be referenced as the coming act), Auroria, the Underworld, "a scholar" / "a life" (Anya's life, unnamed or named in the final verse), the cosmic stop-gap.
- **Must NOT contain:** any suggestion that Anya is a soldier or warrior (she's a scholar); any hint this is fair or kind.
- **Tone (Suno):** tragic, monumental — heavy orchestra, storm, a lone voice over the storm, swelling to the decision.

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act III as song_id 9 → verify → user review gate → commit `feat(album): add The Sentinel's Gambit (The Awakening)`).

---

### Task 11: Torn from the Stars — new song (The Awakening #10)

**Files:**
- Create: `archives/processed_albums/A Tapestry of Souls - The Awakening/Torn_from_the_Stars.xml`
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (add under Act III, song_id 10)

**Song spec:**
- **POV:** Anya, first person — the album's cliffhanger finale.
- **Story beat:** The Great Rift is torn open (canon event: "The Great Rift Opening" — Vorgos tears reality to pull Anya from Auroria at the moment of Nyktoros's awakening). Anya, a scholar in the Crystal Sanctum, is wrenched from Auroria and falls through the Rift into the abyss — a cliffhanger into *The Paradox of Light* (where she lands in the Underworld and meets Valen).
- **Structure:** Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro (the fall). Slow build then a dramatic drop at the end (the fall).
- **Mandatory lore anchors:** the Crystal Sanctum (Anya's origin, Auroria), the Great Rift, the torn sky, falling, the Underworld below, her Aurorian home receding. Anya named (this is her introduction).
- **Must NOT contain:** landing (that's the next album), Valen, Seraphina, the Underworld's ground, any fight. Ends mid-fall.
- **Tone (Suno):** soaring then falling — ethereal verse over cosmic strings, a drop/descent in the final bars, unresolved (cliffhanger).
- **Prose note:** Anya's POV lyrics should not name Vorgos as the cause in a way that vilifies him beyond the fact of the abduction — the listener should be torn (horror at the abduction + hint of design).

- [ ] **Step 1–5:** Same workflow as Task 3 (write archive file → add to master under Act III as song_id 10 → verify → user review gate → commit `feat(album): add Torn from the Stars (The Awakening)`).

---

### Task 12: Album 1 final verification + ACC lore check

**Files:**
- Modify: `data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml` (AlbumPlot finalized)
- Create: `data/lore/xmls/acc/A_Tapestry_of_Souls_The_Awakening_checkup.md`

**Interfaces:**
- Consumes: the 10 finished songs, the ACC process (`data/lore/xmls/album_canon_checkup.md`) and its template (`data/lore/xmls/acc/Eldorias_Prophecy_checkup.md`), the Neo4j graph (read-only).
- Produces: a passing verify run, a finalized AlbumPlot, an ACC checkup file.

- [ ] **Step 1: Verify the whole album**

Run: `python3 data/scripts/verify_album.py "A Tapestry of Souls - The Awakening"`
Expected: PASS (all 10 songs parse, every archive matches the master).

- [ ] **Step 2: Finalize the AlbumPlot**

In the master, replace the placeholder AlbumPlot with the full story: the rising of Nyktoros, the Legion's invasion, the war, Vorgos watching and deciding, the Rift torn open, Anya falling. (Mirror the arc in the design spec. Keep it in-world prose — no meta.)

- [ ] **Step 3: Run the Album Canon Checkup**

Follow `data/lore/xmls/album_canon_checkup.md` against the finished album. Query the DB (read-only) for every named entity the songs reference (characters, locations, events) and confirm:
- Every name exists and is spelled canonically (use the neo4j MCP tools).
- No Era III content (no "Queen of Carnage", Shadow Legion, New Ravenspire founding, Kael).
- No Vows of Silence/Era I plot (no resistance founding, no civil war) and no Crimson Covenant plot.
- All new content is `origin: "album"`-compatible (only applied at DB migration, but the lyrics must not imply otherwise).
- Media-model rule: no in-world song/album references in lyrics.
Write the checkup to `data/lore/xmls/acc/A_Tapestry_of_Souls_The_Awakening_checkup.md` (follow the existing Eldoria's Prophecy checkup's structure). Fix any deviations found, in the affected archive + master, then re-run Step 1.

- [ ] **Step 4: Confirm all 10 songs are `human_reviewed`/`production_ready`**

Grep the archive dir:
Run: `grep -L 'version="production_ready"' "archives/processed_albums/A Tapestry of Souls - The Awakening/"*.xml`
Expected: no output (every file is production_ready). Any output means that song is not yet approved — do not skip the user gate.

- [ ] **Step 5: Commit**

```bash
git add data/lore/xmls/processed_albums/A_Tapestry_of_Souls_The_Awakening.xml \
        data/lore/xmls/acc/A_Tapestry_of_Souls_The_Awakening_checkup.md \
        "archives/processed_albums/A Tapestry of Souls - The Awakening/"
git commit -m "docs(album): ACC pass for A Tapestry of Souls: The Awakening"
```

---

## Self-Review

**Spec coverage:** Design spec sections mapped — tracklist (all 10 songs in Tasks 2–11), rework philosophy (Global Constraints + Task 2), canon fixes (Global Constraints), boundaries (Global Constraints era/media-model rules; Task 7 keeps "Fall of Ravenspire" distinct from Era III "Fall of Nythoria"), saga/migration scaffolding (Task 1; full DB migration is the sibling plan), ACC (Task 12).

**Placeholder scan:** No TBD/TODO. Every step has concrete commands or explicit creative constraints with mandatory anchors. New-song tasks intentionally do not pre-write lyrics — they specify POV, beat, section map, mandatory anchors, forbidden content, and tone; the executor drafts per those constraints and the user reviews (this is a creative deliverable, reviewed by the user like all songs in this project).

**Type consistency:** File paths and names are consistent (`A_Tapestry_of_Souls_The_Awakening.xml` ↔ `A Tapestry of Souls - The Awakening`), the verify script's call signature matches its usage, and song_ids in Task 1 scaffolding (Empire of the Void = 3) match the tracklist (Acts I–III, 1–10).

## Execution Handoff

After the user approves this plan: the sibling plans for *The Paradox of Light*, *Dawn of Ravenspire*, and the Neo4j migration + docs will follow the same template (Tasks 1's scaffold already readies their masters). Then execution choice is offered per plan.
