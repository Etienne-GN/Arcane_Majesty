<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { store, layers, loadComposition } from '@v2/store'
import { renderFrame } from '@v2/render/sheets.js'

// Scratch compositions in saves.db (type "v2"). Named cast members that publish
// to the game are files under apps/amo/src/data/cast (Plan B), not these.
const TYPE = 'v2'
const saves = ref<Record<string, { data: any; preview: string | null }>>({})
const error = ref('')
const open = ref(true)
let loadedJson = JSON.stringify(store.comp)

async function refresh() {
  error.value = ''
  try {
    const r = await fetch(`/api/saves/${TYPE}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    saves.value = await r.json()
  } catch (e: any) { error.value = `Could not list saves: ${e.message}` }
}

async function save() {
  error.value = ''
  const name = store.comp.name.trim()
  if (!name) { error.value = 'Give the character a name first.'; return }
  if (saves.value[name] && !confirm(`Overwrite "${name}"?`)) return
  try {
    const preview = (await renderFrame(layers.value, 'walk', 'down')).toDataURL('image/png')
    const r = await fetch(`/api/saves/${TYPE}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: store.comp, preview }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    loadedJson = JSON.stringify(store.comp)
    await refresh()
  } catch (e: any) { error.value = `Could not save: ${e.message}` }
}

function load(name: string) {
  if (JSON.stringify(store.comp) !== loadedJson && !confirm('Discard unsaved changes to the current character?')) return
  loadComposition(saves.value[name].data)
  loadedJson = JSON.stringify(store.comp)
}

async function remove(name: string) {
  if (!confirm(`Delete "${name}"?`)) return
  error.value = ''
  try {
    const r = await fetch(`/api/saves/${TYPE}/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    await refresh()
  } catch (e: any) { error.value = `Could not delete: ${e.message}` }
}

onMounted(refresh)
</script>

<template>
  <section class="saves">
    <h3 class="toggle" @click="open = !open">{{ open ? '▾' : '▸' }} Saves</h3>
    <template v-if="open">
      <button class="primary" @click="save">Save “{{ store.comp.name || '…' }}”</button>
      <p v-if="error" class="err">{{ error }}</p>
      <div v-for="(s, name) in saves" :key="name" class="row">
        <img v-if="s.preview" :src="s.preview" alt="" class="checker" />
        <span class="n">{{ name }}</span>
        <button @click="load(name as string)">Load</button>
        <button @click="remove(name as string)" title="Delete">✕</button>
      </div>
      <p v-if="!Object.keys(saves).length && !error" class="muted">No saves yet.</p>
    </template>
  </section>
</template>

<style scoped>
.saves { padding: 0 12px 16px; }
.toggle { cursor: pointer; user-select: none; }
.primary { width: 100%; margin-bottom: 8px; }
.row { display: grid; grid-template-columns: 40px 1fr auto auto; gap: 6px; align-items: center; padding: 3px 0; }
.row img { width: 40px; height: 40px; image-rendering: pixelated; border-radius: 4px; }
.n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row button { padding: 2px 8px; }
.err { color: var(--missing); }
.muted { color: var(--muted); }
</style>
