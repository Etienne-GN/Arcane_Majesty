<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { entryFor, layerKeyOf } from '@v2/model/composition.js'
import { store, layers, catalogue } from '@v2/store'

const MODES = ['fallback', 'borrow', 'hide', 'missing'] as const
const WORD: Record<string, string> = { fallback: 'walk frames', borrow: 'borrows', hide: 'hidden', missing: 'no art' }
// For each layer: what it does in each motion without its own art (store.gaps).
const rows = computed(() => layers.value.map(l => {
  const key = layerKeyOf(l)
  const modeIn = (m: string) => MODES.find(md => (store.gaps[m]?.[md] ?? []).includes(key)) ?? null
  const byMode: Record<string, string[]> = {}
  for (const m of DEFAULT_ANIMS) { const md = modeIn(m); if (md) (byMode[md] ??= []).push(m) }
  return { l, key, label: entryFor(catalogue, l.slot, l.id)?.label ?? l.id, byMode, here: modeIn(store.motion) }
}).reverse()) // top of the stack first
</script>

<template>
  <section class="layers">
    <h3>Layers — {{ store.view === 'single' ? `${store.motion} ${store.dir}` : 'all motions' }}</h3>
    <div v-for="r in rows" :key="r.key" class="row"
         :class="{ gone: store.view === 'single' && (r.here === 'hide' || r.here === 'missing') }">
      <span class="slot">{{ r.l.slot.replace(/_/g, ' ') }}</span>
      <span class="lbl">{{ r.label }}<small v-if="r.l.itemName"> · {{ r.l.itemName }}</small><small v-if="r.l.color"> · {{ r.l.color }}</small></span>
      <span v-if="store.view === 'single' && r.here" class="why" :class="r.here">{{ WORD[r.here] }} in {{ store.motion }}</span>
      <template v-else-if="store.view === 'grid'">
        <span v-for="(ms, md) in r.byMode" :key="md" class="why" :class="md" :title="ms.join(', ')">
          {{ WORD[md] }} in {{ ms.length }}: {{ ms.slice(0, 4).join(', ') }}{{ ms.length > 4 ? '…' : '' }}
        </span>
      </template>
    </div>
  </section>
</template>

<style scoped>
.layers { padding: 0 12px 12px; }
.row { display: grid; grid-template-columns: 78px 1fr; gap: 0 8px; padding: 4px 0; border-bottom: 1px solid var(--border); }
.slot { color: var(--muted); text-transform: capitalize; }
.lbl small { color: var(--faint); }
.why { grid-column: 2; font-size: 11px; }
.why.fallback { color: #e0a030; } .why.borrow { color: #4a8fe0; } .why.hide, .why.missing { color: var(--missing); }
.row.gone .lbl { opacity: .45; text-decoration: line-through; }
</style>
