import { reactive, computed, watch } from 'vue'
import CATALOGUE from '@game/data/character_catalogue.json'
import { layersFor, defaultComposition, gapsIn } from '@v2/model/composition.js'
import RULES from '@game/data/motion_rules.json'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { loadSheet } from '@v2/render/sheets.js'

// The composition autosaves per browser (a convenience, not storage of record:
// named saves go to saves.db; cast members are files, see castState.ts).
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

const opensWithLink = /^#comp=/.test(location.hash)

export const store = reactive({
  // Cast home first, unless a #comp= link opens a character straight in the forge.
  screen: (opensWithLink ? 'forge' : 'cast') as 'cast' | 'forge',
  comp: restore() as { name: string; sel: Record<string, { id: string; color?: string; tint?: number }> },
  slot: 'body',
  motion: 'walk',
  dir: 'down',
  playing: true,
  speed: 1,
  view: 'grid' as 'grid' | 'single',
  showMissing: true,
  bg: 'checker' as 'checker' | 'grass' | 'stone',
  // true while a cast member is open: the scratch autosave must not take its place
  editingCast: false,
  // Motion rules (src/data/motion_rules.json) and the open cast member's overrides.
  rules: RULES as Record<string, any>,
  ruleOverrides: undefined as Record<string, any> | undefined,
  // motion → mode (fallback / borrow / hide / missing) → keys of layers in that state
  gaps: {} as Record<string, Record<string, string[]>>,
})

export const layers = computed(() => layersFor(catalogue, store.comp))

// What each layer does in each motion (as the game decides), recomputed when the
// stack or the rules change — never reported by canvases, so it can't go stale.
let gapSeq = 0
watch(() => [layers.value, store.rules, store.ruleOverrides] as const, async ([ls, rules, overrides]) => {
  const seq = ++gapSeq
  const found = new Map<string, boolean>()
  const fileKey = (l: any, c: string) => `${l.type}|${l.id}|${l.itemName ?? ''}|${l.color ?? ''}|${c}`
  await Promise.all(ls.flatMap((l: any) => [...new Set(DEFAULT_ANIMS.flatMap((m: string) => {
    const c = resolveAnim(l, m); return c ? [c] : []
  }).concat(resolveAnim(l, 'walk') ?? 'walk'))].map(async (c: string) => {
    found.set(fileKey(l, c), (await loadSheet(l, c)) !== null)
  })))
  if (seq !== gapSeq) return
  const out: Record<string, Record<string, string[]>> = {}
  for (const m of DEFAULT_ANIMS) {
    out[m] = { fallback: [], borrow: [], hide: [], missing: [] }
    for (const g of gapsIn(ls, m, rules, overrides, (l: any, c: string) => found.get(fileKey(l, c)) ?? false)) {
      if (g.mode !== 'own') out[m][g.mode].push(g.key)
    }
  }
  store.gaps = out
}, { immediate: true, deep: true })

watch(() => store.comp, c => {
  if (store.editingCast) return
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
