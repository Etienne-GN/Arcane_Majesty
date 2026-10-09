import { reactive, ref, watch } from 'vue'
import * as S from '@v2/model/castSession.js'
import { store, catalogue } from './store'

// The cast member being edited (meta null = a scratch composition). The pure
// session logic lives in model/castSession.js; this wires it to the store and
// adds the prompts. `session` is the { meta, comp, scratch } object it acts on.
export const cast = reactive({ meta: null as any, scratch: null as any, error: '' })
export const castList = ref<any[]>([])

const session = {
  get meta() { return cast.meta }, set meta(v) { cast.meta = v; store.editingCast = !!v },
  get comp() { return store.comp }, set comp(v) { store.comp = v },
  get scratch() { return cast.scratch }, set scratch(v) { cast.scratch = v },
}

// The open character's own motion rules drive the stage (on top of the global rules).
watch(() => cast.meta?.motionRules, v => { store.ruleOverrides = v && Object.keys(v).length ? v : undefined }, { deep: true, immediate: true })

export const isDirty = () => S.isDirty(session, catalogue)
export const currentCast = () => S.current(session, catalogue)

function okToLeave() {
  return !isDirty() || confirm(`Discard unsaved changes to "${store.comp.name}"?`)
}

// Reloading or closing the tab with unsaved cast edits asks first.
window.addEventListener('beforeunload', e => { if (isDirty()) e.preventDefault() })

export async function refreshCast() {
  try {
    const r = await fetch('/api/cast')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    castList.value = await r.json()
    cast.error = ''
  } catch (e: any) { cast.error = `Could not load the cast: ${e.message}` }
}

export function openCast(c: any) {
  if (!okToLeave()) return
  S.open(session, c, catalogue)
  store.screen = 'forge'
}

export function newCast() {
  if (!okToLeave()) return
  S.create(session, catalogue)
  store.screen = 'forge'
}

/** Back to the cast home; the scratch composition comes back to the forge. */
export function closeCast() {
  if (!okToLeave()) return
  S.close(session)
  store.screen = 'cast'
}

export const switchVariant = (name: string | null) => S.switchVariant(session, name)
export const setOverride = (key: string, motion: string, rule: any) => S.setOverride(session, key, motion, rule)
export const removeVariant = (name: string) => S.removeVariant(session, name)
export function addVariant(name: string) {
  if (!S.addVariant(session, name)) cast.error = `A variant called "${name}" already exists.`
  else cast.error = ''
}

export async function saveCast() {
  const m = cast.meta
  if (!m) return
  const c = currentCast()
  if (!m.onDisk && castList.value.some(x => x.id === c.id) && !confirm(`A cast member "${c.id}" exists. Overwrite it?`)) return
  try {
    const r = await fetch(`/api/cast/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`)
    S.markSaved(session, c)
    cast.error = ''
    await refreshCast()
  } catch (e: any) { cast.error = `Could not save: ${e.message}` }
}

export async function deleteCastMember(id: string) {
  if (!confirm(`Delete cast member "${id}"? Its file is removed from the game.`)) return
  try {
    const r = await fetch(`/api/cast/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    if (cast.meta?.id === id) { S.close(session); store.screen = 'cast' }
    await refreshCast()
  } catch (e: any) { cast.error = `Could not delete: ${e.message}` }
}
