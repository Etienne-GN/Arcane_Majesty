import { MOTION_FRAMES, frameRateFor, renderType } from '@game/systems/lpcLayout.js'
import { ruleKey } from '@game/systems/motionRules.js'
import { entryFor } from '@v2/model/composition.js'
import { slugify } from '@v2/model/cast.js'
import { renderFrame } from '@v2/render/sheets.js'
import { store, layers, catalogue } from './store'
import { cast } from './castState'
import { useTick } from './clock'
import { openFlagForm } from './gapState'

const t = useTick()

/** Label for a layer's rule key, e.g. "Solid Cape · bg". */
export function labelForKey(key: string) {
  const [type, id, item] = key.split('|')
  for (const [slot, arr] of Object.entries(catalogue)) {
    for (const e of arr as any[]) {
      if ((e.renderType ?? renderType(slot)) !== type) continue
      if (e.id === id || (e.companions ?? []).some((c: any) => c.id === id)) return e.label + (item ? ` · ${item}` : '')
    }
  }
  return key
}

/**
 * Pause on the frame on screen and open the flag form for it: the snapshot
 * (what you see, 3×), the frame number, every component of the character, and
 * the composition itself so Claude can reproduce it exactly.
 */
export async function flagFromStage(scope: 'frame' | 'motion' | 'item' = 'frame', key: string | null = null) {
  store.playing = false
  const motion = store.motion, dir = store.dir
  const frames = MOTION_FRAMES[motion] ?? 1
  const raw = Math.floor((t.value * frameRateFor(motion)) / 1000)
  const frame = ((raw % frames) + frames) % frames
  const small = await renderFrame(layers.value, motion, dir, raw, store.rules, store.ruleOverrides)
  const big = document.createElement('canvas')
  big.width = big.height = 192
  const ctx = big.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, 192, 192)
  const seen = new Set<string>()
  const options: { key: string | null; label: string }[] = [{ key: null, label: 'Whole character' }]
  for (const l of [...layers.value].reverse()) {
    const k = ruleKey(l)
    if (seen.has(k)) continue
    seen.add(k)
    options.push({ key: k, label: `${entryFor(catalogue, l.slot, l.id)?.label ?? l.id}${l.itemName ? ` · ${l.itemName}` : ''}` })
  }
  openFlagForm({
    motion, dir, frame, frames, snapshot: big.toDataURL('image/png'),
    cast: cast.meta?.id || `scratch:${slugify(store.comp.name)}`,
    comp: JSON.parse(JSON.stringify(store.comp)),
    options, key, scope,
  })
}
