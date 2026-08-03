# Eldoria's Prophecy — Novel

## Status: First Complete Draft (milestone committed)

**We gave it a try: a first novel written end-to-end by AI.** It might need
adjustments. It might need refinement. But we made it — and by writing it, we
**locked the lore for *Eldoria's Prophecy*.**

This book is the definitive canon for the album's story. What it establishes
overrides earlier, looser interpretations; future game docs, the Neo4j graph
sync, and any sequel material (e.g. *The Prophecy of Darkness*) build on this
text, not around it.

## The book

- **Title:** *Eldoria's Prophecy*
- **Format:** ~89,372 words; prologue + 23 chapters (Parts I–III) + 4 interludes + epilogue
- **POV:** third-person limited on Eldrin (interludes: Vorgos; Kael + Anya; epilogue adds a Vorgos dream)
- **Timeframe:** winter 501 AGD → the 400-year vigil begins ~501/502 AGD; epilogue ~600 AGD
- **Theme:** the world is held, not saved; mastery through humility; a pawn becomes a monument

## Milestone notes

- Drafted via subagent-driven development: 10 tasks, each subagent wrote prose and
  reported; the controller filled canon files, updated the fidelity log, and committed.
- Every chapter is tracked against the album's 12 tracks in `canon/fidelity-log.md`.
- A full end-to-end consistency audit passed on all 8 axes (race premise,
  metaphoric-only blindness, untamable Balrog, Oren's arc, timeline, terminology,
  cross-chapter continuity). One cosmetic fix applied.
- **Canon guardrails that must never break in any adaptation:**
  - Eldrin NEVER goes blind — "Blind Prophet" is purely metaphoric (blind to the ordinary, seeing only the timeline).
  - The Shadow Balrog is untamable and never commanded — it yields, satisfied, to the Stone's accepted guardian.
  - The Heartstone of Creation is a *Cosmic Insulator*: it holds, it is not a weapon, it rejects unworthy hands, and it accepts only its intended keeper — the catch-22 that kept Eldrin alive.
  - Voraun is dealt at the ruins' gates (ch19), burned by the ward.
  - The 400-year vigil (to ~900 AGD) is the price; the book ends on tragic acceptance + sequel seed.

## Refinement targets (if we do a revision pass)

- **Negation tic:** ~1,143 negations (`was not` / `did not` / `had not` / `could not` /
  `would not`) ≈ one per 78 words, plus 47 `not … it was` anastrophes. This is the
  deliberate "the songs lie / the plain truth" voice, but it is the top fatigue risk.
- Part II pacing (38k of road-and-trial) and Eldrin's stoic, often reactive interiority —
  worth judging in a real read-through.
- The "we must keep Eldrin alive" logic is Xarathos's; Voraun's secret mission was to
  prevent the Stone's use, which killing Eldrin would have served. Defensible (Oren
  believed the break-the-seal plan), but one clarifying line would seal the seam.

## Reading order

```
manuscript/prologue/ch01-echoes-of-stone.md
manuscript/part-i/ch02-the-vision.md        … ch05-the-oblivious-road.md
manuscript/interludes/i1-the-aether.md
manuscript/part-ii/ch06-the-ascent.md       … ch16-the-crucible.md
manuscript/interludes/i2-the-lock.md
manuscript/part-iii/ch17-eldorias-heartbeat.md … ch23-dawns-embrace.md
manuscript/interludes/i3-the-legion.md
manuscript/interludes/i4-the-warden.md
manuscript/epilogue/epilogue-the-architects-design.md
```

## Canon handoff

The `canon/*.md` files are the lore payload for the future game-doc + Neo4j sync:
`characters.md`, `magic.md`, `locations.md`, `events.md`, each ending in a
**Book Canon Summary** section with the complete set of facts the novel establishes.
