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

## Step 1b: Suno Pronunciation Guide

Suno reads names inconsistently — even within a single song it can switch between two pronunciations. Enforce the intended sound with **phonetic respelling** (hyphenated syllables) in the Suno lyrics box, identically in **every** occurrence across all verses/choruses/bridges.

| Name | Standard spelling | Suno lyrics box (respelled) | Never (Suno's wrong reads) |
|---|---|---|---|
| Acheron | Acheron | `Ah-keh-ron` | "ay-ke-ron" / "hey-ke-ron" / "ah-kay-ron" (`Ah-ke-ron` reads as "kay" — must be `keh`) |
| Nythoria | Nythoria | `Nee-tho-ree-ah` | "ni-THOR-ia" (`Nih-tho-ria` / `Nih-tho-ree-ah` read as "THOR" or "nye"; the `ee` forces the "nee" sound) |
| Nyktoros | Nyktoros | `Nee-kto-ros` | "Ny-ch-toros" (renamed from Nychtoros) / "nick-toh-ros" (`Nyk-to-ros` reads as "nick"; the `ee` forces the "nee" sound, mirroring `Nee-tho-ree-ah`) |

Rules:
- **Only the Suno lyrics box uses the respelling.** Release/distributor lyrics keep standard spelling.
- Hyphenated respelling (`Ah-ke-ron`) is the reliable syllable split; dropping dashes (`Ahkeron`) usually works but is less reliable.
- Test a new/unusual name on a short line before committing to a full generation.
- If a name still fails after respelling, rename it (as done for `Nychtoros` → `Nyktoros`) rather than fight the model.

## Step 1c: Suno Style Tags

The style box always starts from the user's **house base tags**, then appends **2–3 song-specific tags** from the song's `<analysis>` Suno direction.

**House base tags (every original song):**
```
viking metal, male aggressive voice, natural minor scale, harmonic guitar, dual guitar
```

Rules:
- Suno weights **the first tags hardest** — if a specific element must land (e.g. `piano intro`), put it in front of the house base or append it high up.
- For covers/remixes, drop or adjust the house base to fit the original (see Step 1e sliders).
- Example (soft piano-led track): `viking metal, progressive metal, piano intro, male aggressive voice, natural minor scale, harmonic guitar, dual guitar, mournful, cinematic`
- Example (relentless war track): `viking metal, progressive metal, male aggressive voice, natural minor scale, harmonic guitar, dual guitar, relentless, fast drums, dark`

## Step 1d: Lyric Structure & Style Cues

Every `<reworked>` block carries **`[Section]` headers plus an inline style cue** so the user can paste straight into Suno. Format: `[Section: musical direction]` on the line above each section.

Rules:
- Cues describe **sound** (instruments, dynamics, energy), **never plot**.
- Cue `[Intro: ...]` and `[Outro: ...]` (or `[Piano Outro: ...]`) bookend the song — an empty cue tells Suno to end there instrumentally.
- Every chorus repeat gets its own cue, and each repeat escalates (e.g. `[Chorus: heavy, dual guitars, emotional]` → `[Chorus: heavier, soaring]` → `[Chorus: massive, cinematic peak]`).
- Keep cues short — a few comma-separated words (`[Verse 2: build, double guitars enter]`).
- Write cues identically in the archive `<reworked>` blocks and the master `<Lyrics>` (verify strips them, so they stay in sync without breaking the diff).

Example shape: `[Intro: soft piano, quiet]` → `[Verse 1: piano and strings, hushed]` → `[Chorus: heavy, dual guitars, emotional]` → `[Bridge: stripped to piano, grief]` → `[Outro: fading, distant choir]` → `[Piano Outro: solo piano, final note]`.

## Step 1e: Suno Generation Sliders

Default sliders for **original songs** (Arcane Majesty house setting):
| Slider | Value |
|---|---|
| Weirdness | 30% |
| Style influence | 75% |
| Audio influence (the voice) | 25% |

- **Covers of existing songs use different slider values** — tune per cover (higher style influence to match the original's arrangement; the voice/audio influence changes based on how closely the vocal should match).
- Record the slider values actually used in the song's `<analysis>` when they deviate from the defaults.

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
