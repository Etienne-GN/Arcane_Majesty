import { reactive, computed, watch } from 'vue'
import CATALOGUE from '@game/data/character_catalogue.json'
import { layersFor, defaultComposition } from '@v2/model/composition.js'

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
  // "motion:dir" → keys of layers that draw nothing there (filled by the stage canvases)
  missing: {} as Record<string, string[]>,
})

export const layers = computed(() => layersFor(catalogue, store.comp))

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
