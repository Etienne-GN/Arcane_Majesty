<script setup lang="ts">
import { SLOTS } from '@game/systems/lpcLayout.js'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { motionsOf, entryFor } from '@v2/model/composition.js'
import { store, catalogue } from '@v2/store'

const GROUPS: [string, string[]][] = [
  ['Body', SLOTS.slice(0, 12)],
  ['Clothes', SLOTS.slice(12, 22)],
  ['Equipment', SLOTS.slice(22, 29)],
  ['Marks', SLOTS.slice(29)],
]
const label = (s: string) => s.replace(/_/g, ' ')
function item(slot: string) {
  const p = store.comp.sel[slot]
  return p ? entryFor(catalogue, slot, p.id) : null
}
</script>

<template>
  <nav class="slots">
    <section v-for="[g, slots] in GROUPS" :key="g">
      <h3>{{ g }}</h3>
      <button v-for="s in slots.filter(s => catalogue[s])" :key="s" class="slot"
              :class="{ active: store.slot === s }" @click="store.slot = s">
        <span class="name">{{ label(s) }}</span>
        <span class="item">{{ item(s)?.label ?? '—' }}</span>
        <span v-if="item(s)" class="dots" :title="`${motionsOf(item(s)).length}/15 motions`">
          <i v-for="m in DEFAULT_ANIMS" :key="m" :title="m"
             :class="motionsOf(item(s)).includes(m) ? 'on' : 'off'" />
        </span>
      </button>
    </section>
  </nav>
</template>

<style scoped>
.slots { padding: 4px 10px 16px; }
.slot {
  display: grid; grid-template-columns: 90px 1fr; grid-template-rows: auto auto; gap: 2px 8px;
  width: 100%; text-align: left; background: transparent; border-color: transparent; padding: 5px 6px;
}
.slot.active { background: var(--accent-soft); border-color: var(--accent); }
.name { color: var(--muted); text-transform: capitalize; }
.item { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dots { grid-column: 2; }
</style>
