import { reactive, ref } from 'vue'
import { buildCast, compositionOf, slugify } from '@v2/model/cast.js'
import { defaultComposition } from '@v2/model/composition.js'
import { store, catalogue, loadComposition } from './store'

// The cast member being edited in the forge. null = a scratch composition.
// While a variant is open, store.comp.sel holds the variant's sel and the base
// sel waits in baseSel (and vice versa), so switching never loses edits.
export interface CastMeta {
  id: string
  role: string
  dbCharacter: string
  published: boolean
  variant: string | null
  baseSel: Record<string, any>
  variants: Record<string, Record<string, any>>
  migrationNotes?: string[]
  onDisk: boolean
}

export const cast = reactive({ meta: null as CastMeta | null, error: '' })
export const castList = ref<any[]>([])

const clone = (x: any) => JSON.parse(JSON.stringify(x))

export async function refreshCast() {
  try {
    const r = await fetch('/api/cast')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    castList.value = await r.json()
    cast.error = ''
  } catch (e: any) { cast.error = `Could not load the cast: ${e.message}` }
}

export function openCast(c: any) {
  cast.meta = {
    id: c.id, role: c.role, dbCharacter: c.dbCharacter ?? '', published: !!c.published, variant: null,
    baseSel: clone(c.sel ?? {}),
    variants: Object.fromEntries(Object.entries(c.variants ?? {}).map(([n, v]: any) => [n, clone(v.sel)])),
    migrationNotes: c.migrationNotes, onDisk: true,
  }
  loadComposition(compositionOf(c))
  store.screen = 'forge'
}

export function newCast() {
  const comp = defaultComposition(catalogue)
  comp.name = 'New character'
  cast.meta = { id: '', role: 'npc', dbCharacter: '', published: false, variant: null, baseSel: clone(comp.sel), variants: {}, onDisk: false }
  loadComposition(comp)
  store.screen = 'forge'
}

/** Leave the cast member: the forge goes back to a scratch composition. */
export function closeCast() {
  cast.meta = null
  store.screen = 'cast'
}

function stashCurrent() {
  const m = cast.meta!
  if (m.variant) m.variants[m.variant] = clone(store.comp.sel)
  else m.baseSel = clone(store.comp.sel)
}

export function switchVariant(name: string | null) {
  const m = cast.meta
  if (!m || m.variant === name) return
  stashCurrent()
  m.variant = name
  store.comp.sel = clone(name ? m.variants[name] : m.baseSel)
}

export function addVariant(name: string) {
  const m = cast.meta
  const n = slugify(name)
  if (!m || !n || m.variants[n]) return
  stashCurrent()
  m.variants[n] = clone(store.comp.sel)   // starts as a copy of what's on screen
  m.variant = n
}

export function removeVariant(name: string) {
  const m = cast.meta
  if (!m || !m.variants[name]) return
  if (m.variant === name) switchVariant(null)
  delete m.variants[name]
}

/** The cast file for what's on screen (id from the name for a new member). Pure: safe in computeds. */
export function currentCast() {
  const m = cast.meta!
  const sel = m.variant ? m.baseSel : store.comp.sel
  const variants = m.variant ? { ...m.variants, [m.variant]: store.comp.sel } : m.variants
  return buildCast(catalogue, {
    id: m.onDisk ? m.id : (m.id || slugify(store.comp.name)),
    name: store.comp.name, role: m.role, dbCharacter: m.dbCharacter || undefined,
    sel: clone(sel), variants: clone(variants), published: m.published, migrationNotes: m.migrationNotes,
  })
}

export async function saveCast() {
  const m = cast.meta
  if (!m) return
  stashCurrent()
  const c = currentCast()
  if (!m.onDisk && castList.value.some(x => x.id === c.id) && !confirm(`A cast member "${c.id}" exists. Overwrite it?`)) return
  try {
    const r = await fetch(`/api/cast/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`)
    m.id = c.id
    m.onDisk = true
    cast.error = ''
    await refreshCast()
  } catch (e: any) { cast.error = `Could not save: ${e.message}` }
}

export async function deleteCastMember(id: string) {
  if (!confirm(`Delete cast member "${id}"? Its file is removed from the game.`)) return
  try {
    const r = await fetch(`/api/cast/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    if (cast.meta?.id === id) closeCast()
    await refreshCast()
  } catch (e: any) { cast.error = `Could not delete: ${e.message}` }
}
