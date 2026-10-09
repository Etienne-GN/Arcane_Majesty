<script setup lang="ts">
import { ref, computed } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { motionsOf } from '@v2/model/composition.js'
import { store, catalogue, pick } from '@v2/store'

const q = ref('')
const need = ref<string[]>([])
const FILTERS = ['run', 'jump', 'sit', 'idle', 'climb']

const entries = computed(() => {
  const s = q.value.trim().toLowerCase()
  return (catalogue[store.slot] ?? [])
    .filter(e => e.id)
    .map(e => ({ e, motions: motionsOf(e) }))
    .filter(({ e }) => !s || e.label.toLowerCase().includes(s) || e.id.toLowerCase().includes(s))
    .filter(({ motions }) => need.value.every(m => motions.includes(m)))
})
const selectedId = computed(() => store.comp.sel[store.slot]?.id ?? null)
function toggle(m: string) {
  need.value = need.value.includes(m) ? need.value.filter(x => x !== m) : [...need.value, m]
}
</script>

<template>
  <div class="picker">
    <div class="bar">
      <strong class="slotname">{{ store.slot.replace(/_/g, ' ') }}</strong>
      <input v-model="q" placeholder="Search items…" />
      <span class="muted">covers:</span>
      <button v-for="m in FILTERS" :key="m" :class="{ active: need.includes(m) }" @click="toggle(m)">{{ m }}</button>
      <span class="muted count">{{ entries.length }} items</span>
    </div>
    <div class="grid">
      <button class="card" :class="{ active: !selectedId }" @click="pick(store.slot, null)">
        <slot name="thumb" :entry="null" />
        <span class="label">None</span>
      </button>
      <button v-for="{ e, motions } in entries" :key="e.id + (e.itemName ?? '')" class="card"
              :class="{ active: selectedId === e.id }" :title="e.id" @click="pick(store.slot, e.id)">
        <slot name="thumb" :entry="e" />
        <span class="label">{{ e.label }}</span>
        <span class="dots"><i v-for="m in DEFAULT_ANIMS" :key="m" :title="m" :class="motions.includes(m) ? 'on' : 'off'" /></span>
        <span v-if="motions.length < 15" class="badge" :title="DEFAULT_ANIMS.filter((m: string) => !motions.includes(m)).join(', ')">
          −{{ 15 - motions.length }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; min-height: 0; }
.bar { display: flex; gap: 6px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bar input { width: 200px; }
.bar button { padding: 3px 8px; }
.slotname { text-transform: capitalize; margin-right: 6px; }
.muted { color: var(--muted); }
.count { margin-left: auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 6px; padding: 10px 12px; overflow: auto; max-height: 280px; }
.card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; background: var(--panel-2); }
.label { font-size: 12px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.badge { position: absolute; top: 4px; right: 4px; font-size: 10px; color: var(--missing); font-family: var(--font-mono); }
</style>
