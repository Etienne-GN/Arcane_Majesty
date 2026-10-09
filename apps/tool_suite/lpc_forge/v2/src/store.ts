import { reactive, computed, watch } from 'vue'
import CATALOGUE from '@game/data/character_catalogue.json'
import { layersFor, defaultComposition, missingIn, layerKeyOf } from '@v2/model/composition.js'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { loadSheet } from '@v2/render/sheets.js'

// The composition autosaves per browser (a convenience, not storage of record:
// named saves go to saves.db, cast files arrive with Plan B).
const KEY = 'forge_v2_comp'

export const catalogue = CATALOGUE as Record<string, any[]>

function restore() {
  // A link can carry a composition: …#comp=<encodeURIComponent(json)>
  try {
    const m = location.hash.match(/^#comp=(.+)$/)
    if (m) {
      const c = JSON.parse(decodeURIComponent(m[1]))
      if (c && typeof c === 'object' && c.sel) return c
    }
  } catch { /* malformed link: fall through */ }
  try {
    const s = localStorage.getItem(KEY)
    if (s) {
      const c = JSON.parse(s)
      if (c && typeof c === 'object' && c.sel) return c
    }
  } catch { /* private mode / blocked storage */ }
  return defaultComposition(catalogue)
}

export const store = reactive({
  comp: restore() as { name: string; sel: Record<string, { id: string; color?: string; tint?: number }> },
  slot: 'body',
  motion: 'walk',
  dir: 'down',
  playing: true,
  speed: 1,
  view: 'grid' as 'grid' | 'single',
  showMissing: true,
  bg: 'checker' as 'checker' | 'grass' | 'stone',
  // motion → keys of layers with no art for it (computed from the layers below)
  missing: {} as Record<string, string[]>,
})

export const layers = computed(() => layersFor(catalogue, store.comp))

// Missing layers per motion: a pure function of the layer stack plus which files
// exist, recomputed whenever the stack changes (never reported by canvases, so it
// can't go stale when the view, motion or direction changes).
let missingSeq = 0
watch(layers, async ls => {
  const seq = ++missingSeq
  const found = new Map<string, boolean>()
  await Promise.all(ls.flatMap((l: any) => DEFAULT_ANIMS.map(async (m: string) => {
    const c = resolveAnim(l, m)
    if (c) found.set(`${layerKeyOf(l)}|${c}`, (await loadSheet(l, c)) !== null)
  })))
  if (seq !== missingSeq) return
  const out: Record<string, string[]> = {}
  for (const m of DEFAULT_ANIMS) {
    out[m] = missingIn(ls, m, (l: any, c: string) => found.get(`${layerKeyOf(l)}|${c}`) ?? false).map(layerKeyOf)
  }
  store.missing = out
}, { immediate: true })

watch(() => store.comp, c => {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* ignore */ }
}, { deep: true })

export function pick(slot: string, id: string | null) {
  if (!id) delete store.comp.sel[slot]
  else store.comp.sel[slot] = { id }
}
export function setColor(slot: string, color: string) {
  const p = store.comp.sel[slot]
  if (p) p.color = color
}
export function setTint(slot: string, idx: number) {
  const p = store.comp.sel[slot]
  if (p) p.tint = idx
}
export function loadComposition(c: any) {
  store.comp = JSON.parse(JSON.stringify(c))
}
