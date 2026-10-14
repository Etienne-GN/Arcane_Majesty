import { reactive, computed, watch } from 'vue'
import CATALOGUE from '@game/data/character_catalogue.json'
import { layersFor, defaultComposition, gapsIn } from '@v2/model/composition.js'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { loadSheet, setCustomStamps } from '@v2/render/sheets.js'
import { setCustomFiles } from '@game/systems/lpcLayout.js'
import { TINT_PALETTE, tintMaterialFor } from '@game/systems/lpcPalettes.js'
import { randomize } from '@v2/model/randomize.js'

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
  // Cast home first, unless a #comp= link opens a character straight in the
  // forge (or #gaps opens the gap review).
  screen: (opensWithLink ? 'forge' : ['#gaps', '#flags', '#workshop', '#compare'].includes(location.hash) ? location.hash.slice(1) : 'cast') as 'cast' | 'forge' | 'gaps' | 'flags' | 'workshop' | 'compare',
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
  // Motion rules (src/data/motion_rules.json, fetched over the API so saving one
  // doesn't make Vite reload the page) and the open cast member's overrides.
  rules: {} as Record<string, any>,
  // false until the rules were really read — saving is refused before that
  rulesLoaded: false,
  rulesError: '',
  ruleOverrides: undefined as Record<string, any> | undefined,
  // motion → mode (fallback / borrow / hide / missing) → keys of layers in that state
  gaps: {} as Record<string, Record<string, string[]>>,
  // Custom overlay (workshop-authored sheets, /api/custom) and a counter bumped
  // whenever it or a workshop preview changes — canvases and gap counts redo
  // their plans on it, since the overlay registry itself isn't reactive.
  custom: {} as Record<string, any>,
  sheetVersion: 0,
  exportOpen: false,
  // slots Randomize leaves alone (per browser)
  locks: readLocks(),
})

function readLocks(): string[] {
  try { const v = JSON.parse(localStorage.getItem('forge_v2_locks') ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
watch(() => store.locks, v => { try { localStorage.setItem('forge_v2_locks', JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })

export function toggleLock(slot: string) {
  store.locks = store.locks.includes(slot) ? store.locks.filter(s => s !== slot) : [...store.locks, slot]
}

/** Re-roll every unlocked slot (body-compatible items, one skin tone). */
export function randomizeComp() {
  store.comp = randomize(catalogue, store.comp, {
    locked: new Set(store.locks),
    tintCount: (slot: string, entry: any) => (TINT_PALETTE as any)[tintMaterialFor(slot, entry)]?.length ?? 0,
  })
}

export const layers = computed(() => layersFor(catalogue, store.comp))

// What each layer does in each motion (as the game decides), recomputed when the
// stack or the rules change — never reported by canvases, so it can't go stale.
let gapSeq = 0
watch(() => [layers.value, store.rules, store.ruleOverrides, store.sheetVersion] as const, async ([ls, rules, overrides]) => {
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

export async function refreshRules() {
  try {
    const r = await fetch('/api/motion-rules')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    store.rules = await r.json()
    store.rulesLoaded = true
    store.rulesError = ''
  } catch (e: any) {
    // Draw with no rules (the game's default fallback) but say so, and don't allow saving.
    store.rulesError = `Could not load the motion rules (${e.message}) — showing defaults, saving disabled.`
  }
}
refreshRules()

/** (Re)load the custom overlay manifest and register it, as the game does at boot. */
export async function refreshCustom() {
  try {
    const r = await fetch('/api/custom')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    store.custom = await r.json()
  } catch { store.custom = {} }   // no overlay: library only, like a game without custom art
  setCustomFiles(Object.keys(store.custom))
  setCustomStamps(store.custom)
  store.sheetVersion++
}
refreshCustom()

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
