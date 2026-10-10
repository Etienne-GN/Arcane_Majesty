import { reactive, ref, computed } from 'vue'
import { store } from './store'

// Flags (your notes for Claude — tool data in lpc_forge/gap_flags.json) and
// saving motion rules into the game. Flags are created and updated one at a
// time on the server, so nothing here ever resends the whole list.
export const gap = reactive({ error: '', saving: false })
export const flags = ref<any[]>([])
export const openFlagCount = computed(() => flags.value.filter(f => f.status !== 'resolved').length)

export async function refreshFlags() {
  try {
    const r = await fetch('/api/gap-flags')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    flags.value = await r.json()
  } catch (e: any) { gap.error = `Could not load flags: ${e.message}` }
}
refreshFlags()

async function call(method: string, url: string, body: any) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(out.error ?? `HTTP ${r.status}`)
  return out
}

/** Create a flag: { target, key?, cast?, motion?, dir?, frame?, reason, comment, snapshot?, comp? }. */
export async function createFlag(fields: Record<string, any>) {
  try {
    const f = await call('POST', '/api/gap-flags', fields)
    flags.value = [...flags.value, f]
    gap.error = ''
    return f
  } catch (e: any) { gap.error = `Could not flag: ${e.message}`; return null }
}

/** Gaps-tab cell flag (an item in one motion). */
export const addFlag = (key: string, motion: string, reason: string, comment: string) =>
  createFlag({ target: 'motion', key, motion, reason, comment })

/** Move a flag to a status (or reply, keeping it), appending your note to its thread. */
export async function setFlagStatus(id: string, status: string, note = '') {
  try {
    const f = await call('PATCH', `/api/gap-flags/${id}`, { status, note })
    flags.value = flags.value.map(x => (x.id === id ? f : x))
    gap.error = ''
  } catch (e: any) { gap.error = `Could not update the flag: ${e.message}` }
}

/**
 * Set (or clear, with rule null) one cell's rule. The server applies it to the
 * file and answers the full rules, so other cells (another tab, a teammate's
 * edit on disk) are never overwritten by this browser's copy.
 */
export async function saveRule(key: string, motion: string, rule: any) {
  if (!store.rulesLoaded) { gap.error = store.rulesError || 'Motion rules not loaded yet — not saving.'; return }
  gap.saving = true
  try {
    store.rules = await call('PATCH', '/api/motion-rules/cell', { key, motion, rule })
    gap.error = ''
  } catch (e: any) {
    gap.error = `Could not save the rule: ${e.message}`
  } finally { gap.saving = false }
}

// ── the flag form (one at a time, opened from the stage, layer list or gaps) ──
export const flagForm = reactive({
  open: false,
  // fixed context of what is being flagged
  motion: '' as string, dir: '' as string, frame: null as number | null, frames: 0,
  snapshot: '' as string, cast: '' as string, comp: null as any,
  // choices
  options: [] as { key: string | null; label: string }[],   // components; key null = whole character
  key: null as string | null,
  scope: 'frame' as 'frame' | 'motion' | 'item',
  reason: 'looks_broken', comment: '',
})

export function openFlagForm(init: Partial<typeof flagForm>) {
  Object.assign(flagForm, { reason: 'looks_broken', comment: '', key: null, scope: 'frame', frame: null, snapshot: '' }, init, { open: true })
}

export async function submitFlagForm() {
  const f = flagForm
  const whole = f.key === null
  const target = whole ? (f.scope === 'frame' ? 'frame' : 'character') : f.scope
  const fields: Record<string, any> = { target, reason: f.reason, comment: f.comment, comp: f.comp }
  if (!whole) fields.key = f.key
  if (f.cast) fields.cast = f.cast
  if (target === 'motion' || target === 'frame') fields.motion = f.motion
  if (target === 'frame') { fields.dir = f.dir; fields.frame = f.frame }
  if (f.snapshot) fields.snapshot = f.snapshot
  if (await createFlag(fields)) f.open = false
}
