# Balance pass — Phases 3–5 (2026-10-16)

Numbers checked against the XP curve (`xpForLevel(L) = 100·L^1.5`: L1→2 100, L3→4 520,
L7→8 1852, L9→10 2700) and regional enemy stats (`scaleEnemyStats`, mid-band level).
Everything below is data — one constant each — so any of it is easy to move back.

## Changed

| What | Was | Now | Why |
|---|---|---|---|
| Elite bounty XP | 40 × band max (120 at Lv 1–3, 360 at the Summit) | **25 × band max** (75 / 225) | The elite kill itself already pays 3× XP; one elite was worth >40% of a level at L3. Gold (10×) and Glint (5×) unchanged. |
| Night | 20:00–05:59, dusk 18–20, dawn 6–7 (10 h full dark of 24) | **21:00–04:59, dusk 19–21, dawn 5–6** (8 h) | A third of each 24-minute day in the dark instead of nearly half. |
| Snow chill | Cold (−30% speed) for 20 s, every 20 s → slowed the whole time | **Cold for 8 s, every 20 s** | Snow is half the time on the Summit; a permanent slow there was punishing. |
| Warming | 60 s | **90 s** | Pairs with the lighter chill; one Warming Draught covers a fight. |

## Checked, left as is

| What | Value | Note |
|---|---|---|
| Hunt bounty | xp 15L+5n, gold 5L+2n (6 kills at Lv 1–3: 75 XP / 27 gold) | ~60% on top of the kills' own XP — a fair bonus. |
| Gather bounty | xp 10L+3n, gold 8L+3n | Main steady gold income besides selling — the intended role of gold. |
| Storm strike | 10 + 2 × band max (16 at Lv 1–3, 28 at the Summit) | ~16% of a new character's HP, telegraphed 1.2 s, dodgeable. Hits enemies too (×2 if Wet). |
| Rain on spells | fire ×0.8, lightning ×1.2, on top of Wet (fire ×0.5, lightning ×2) | Fire is ×0.4 and lightning ×2.4 in rain — strong by design (the spec's "weather matters"). Revisit if lightning dominates. |
| Night void damage | ×1.2 | — |
| Kill glint | 1–4 per kill (+10%/level); potions 18–20 gl | ~7 kills per potion. |
| Forge upgrades | T1 ore 2/4/6 (+aether shard at +3) | Cheap at T1 by design; costs move to rarer materials by tier. |
| Craft ranks | rank 2 at 25 crafts, rank 3 at 75 | — |

## To watch in play

- Lightning builds in rainy forests (×2.4 plus Conduct arcs through every Wet enemy).
- Bounty refresh every 24 real minutes — fine for sessions; may feel fast for long ones.
- Shop prices: catalogue items cost the lower of their two old prices (Phase 3 ruling).
