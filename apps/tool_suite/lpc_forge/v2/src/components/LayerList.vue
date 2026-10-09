<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { entryFor, layerKeyOf } from '@v2/model/composition.js'
import { store, layers, catalogue } from '@v2/store'

// For each layer: the motions it has no art for (store.missing).
const rows = computed(() => layers.value.map(l => {
  const key = layerKeyOf(l)
  const gone = DEFAULT_ANIMS.filter((m: string) => (store.missing[m] ?? []).includes(key))
  const hereGone = (store.missing[store.motion] ?? []).includes(key)
  return { l, key, label: entryFor(catalogue, l.slot, l.id)?.label ?? l.id, gone, hereGone }
}).reverse()) // top of the stack first
</script>

<template>
  <section class="layers">
    <h3>Layers — {{ store.view === 'single' ? `${store.motion} ${store.dir}` : 'all motions' }}</h3>
    <div v-for="r in rows" :key="r.key" class="row"
         :class="{ gone: store.view === 'single' ? r.hereGone : r.gone.length === 15 }">
      <span class="slot">{{ r.l.slot.replace(/_/g, ' ') }}</span>
      <span class="lbl">{{ r.label }}<small v-if="r.l.itemName"> · {{ r.l.itemName }}</small><small v-if="r.l.color"> · {{ r.l.color }}</small></span>
      <span v-if="store.view === 'single' && r.hereGone" class="why">missing in {{ store.motion }}</span>
      <span v-else-if="store.view === 'grid' && r.gone.length" class="why" :title="r.gone.join(', ')">
        missing in {{ r.gone.length }}: {{ r.gone.slice(0, 4).join(', ') }}{{ r.gone.length > 4 ? '…' : '' }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.layers { padding: 0 12px 12px; }
.row { display: grid; grid-template-columns: 78px 1fr; gap: 0 8px; padding: 4px 0; border-bottom: 1px solid var(--border); }
.slot { color: var(--muted); text-transform: capitalize; }
.lbl small { color: var(--faint); }
.why { grid-column: 2; color: var(--missing); font-size: 11px; }
.row.gone .lbl { opacity: .45; text-decoration: line-through; }
</style>
