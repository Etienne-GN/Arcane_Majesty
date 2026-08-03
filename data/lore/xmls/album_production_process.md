# Album Production & Review Process

This document defines the repeatable process for producing a **production-ready** album from its master lore file. It is the standardized workflow for **every album** in the Arcane Majesty universe. Completed for *Eldoria's Prophecy* (the template); applied to all other albums in order.

## Overview

The process takes an album's master XML (`data/lore/xmls/processed_albums/<Album>.xml`) and produces:
1. Per-song archive files in `archives/processed_albums/<Album Name>/`.
2. Lore-anchored, production-ready lyrics for every song.
3. A synced master file matching the archive versions.

Each song is approved by the user **after listening to the Suno audio** before it is marked production-ready.

---

## Step 1: Per-song XML files

Create `archives/processed_albums/<Album Name>/` with one file per song: `<Song_Title>.xml`.

```xml
<song name="..." status="human_reviewed" version="production_ready">
    <plot>...</plot>          <!-- CDATA: what happens in the song -->
    <analysis>...</analysis>  <!-- CDATA: rework rationale, lore anchors, Suno direction -->
    <lyrics>
        <section name="Verse 1">
            <original>...</original>     <!-- the stock/generic lyrics -->
            <reworked>...</reworked>     <!-- the lore-anchored rewrite -->
        </section>
    </lyrics>
</song>
```

Rules:
- Sections that have no rework use `<reworked not_applicable="true">—</reworked>`.
- **NEVER** use `n/a` in an attribute name — it contains `/`, which makes the XML unparseable. Use `not_applicable`.
- Song `<plot>` comes from the master file; the `<analysis>` is written during review.

## Step 2: Per-song review pass

- **Lore-anchor every lyric** against canon (`SCENARIO.md`, `world_lore.md`, the album's `<Tone>`/`<Plot>`): add specific names (characters), places, artifacts, and timeline facts.
- **Fix incoherences**: plural "we" → singular "I" where the song is one character's POV, false claims about events, generic army/blade imagery vs. the actual 1v1 fight, etc.
- **Check canonical spellings** (e.g., Heartstone = one word) and standardize across the album.
- Write the `<analysis>` explaining each change + a Suno song-direction note (vocals, tempo, mood).
- When displaying lyrics to the user, **always show the full lyrics with every verse/chorus repeat** — never collapse repeats (the user copies them to Suno).

## Step 3: User review gate

- User listens to the **Suno audio** before final sign-off.
- On approval: mark `status="human_reviewed" version="production_ready"`.
- If the generated audio differs from the working file, create a **save-point copy** (e.g., `Song_AUDIO_VERSION.xml`), update the working file to match the audio, and delete the save-point after.

## Step 4: Sync the master lore source

After all songs are approved, sync `data/lore/xmls/processed_albums/<Album>.xml`:
- Update each `<Lyrics>` block to the production-ready reworked version.
- Update `<Plot>`/`<analysis>` where they changed.
- Standardize spellings across the whole file.

Formatting: the master uses `[Verse 1]`-style bracket headers inside `<Lyrics>`; the archives use `<section name="...">` elements. Content must be identical.

## Step 5: Verification

- **Parse-check** every XML file (master + all archives).
- **Diff every song** between the archive `<reworked>` blocks and the master `<Lyrics>` (normalize curly→straight apostrophes) — must match line-for-line.
- Confirm no stale references remain (old spellings, old bridge lyrics, removed sections).

---

## Album Status

| Album | Status | ACC (Album Canon Checkup) | Campaign (ACR) |
|---|---|---|---|
| Eldoria's Prophecy | ✅ DONE — production-ready (in review: ask people to listen) | ✅ PASS (D re-run 2026-08-03) | ✅ Bible — `campaigns/Eldorias_Prophecy_campaign.md` |
| Crimson Covenant | 🔄 ACTIVE — in production/review | ⏳ Run ACC after production | ⏳ Pending |
| A Tapestry of Souls | ⏳ Pending |
| Vows of Silence | ⏳ Pending |
| Queen of Carnage | ⏳ Pending |
| Lord of Shadows | ⏳ Pending |
| Beyond the Veil Twilight | ⏳ Pending |
| Bound by Blood | ⏳ Pending |
