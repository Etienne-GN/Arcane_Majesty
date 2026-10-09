import { reactive, ref } from 'vue'
import { store } from './store'

// Gap review: flags (Forge-only notes) and saving motion rules into the game.
export const gap = reactive({ error: '', saving: false })
export const flags = ref<any[]>([])

export async function refreshFlags() {
  try {
    const r = await fetch('/api/gap-flags')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    flags.value = await r.json()
  } catch (e: any) { gap.error = `Could not load flags: ${e.message}` }
}

async function putFlags(list: any[]) {
  const r = await fetch('/api/gap-flags', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`)
  flags.value = list
}

export async function addFlag(key: string, motion: string, reason: string, comment: string) {
  const f = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), key, motion, reason, status: 'open',
    comment: comment.trim(), createdAt: new Date().toISOString() }
  try { await putFlags([...flags.value, f]); gap.error = '' } catch (e: any) { gap.error = `Could not flag: ${e.message}` }
}

/** Change a flag's status, appending an optional note to its thread. */
export async function setFlagStatus(id: string, status: string, note = '') {
  const list = flags.value.map(f => f.id !== id ? f : {
    ...f, status,
    comment: note.trim() ? `${f.comment}\n[You] ${note.trim()}` : f.comment,
    resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
  })
  try { await putFlags(list); gap.error = '' } catch (e: any) { gap.error = `Could not update the flag: ${e.message}` }
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
    const r = await fetch('/api/motion-rules/cell', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, motion, rule }) })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`)
    store.rules = body
    gap.error = ''
  } catch (e: any) {
    gap.error = `Could not save the rule: ${e.message}`
  } finally { gap.saving = false }
}
