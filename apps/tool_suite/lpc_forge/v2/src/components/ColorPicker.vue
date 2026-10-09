<script setup lang="ts">
import { computed } from 'vue'
import { TINT_PALETTE, COLOR_SWATCH_HEX, FORCE_TINT_TYPES, tintMaterialFor } from '@game/systems/lpcPalettes.js'
import { entryFor } from '@v2/model/composition.js'
import { store, catalogue, setColor, setTint } from '@v2/store'

const pickRef = computed(() => store.comp.sel[store.slot])
const entry = computed(() => pickRef.value ? entryFor(catalogue, store.slot, pickRef.value.id) : null)

// File colours (separate PNG per colour) win, except types the game forces to tint.
const fileColors = computed<string[]>(() =>
  entry.value?.colors?.length && !FORCE_TINT_TYPES.has(store.slot) ? entry.value.colors : [])
const tints = computed<any[]>(() => {
  if (!entry.value || fileColors.value.length) return []
  return TINT_PALETTE[tintMaterialFor(store.slot, entry.value)] ?? []
})
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')
const swatch = (name: string) => {
  const v = COLOR_SWATCH_HEX[name.toLowerCase()]
  return v != null ? hex(v) : '#777'
}
const currentColor = computed(() => {
  const c = pickRef.value?.color
  return c && fileColors.value.includes(c) ? c : fileColors.value[0]
})
</script>

<template>
  <section class="colors" v-if="entry">
    <h3>Colour — {{ entry.label }}</h3>
    <div v-if="fileColors.length" class="swatches">
      <button v-for="c in fileColors" :key="c" class="sw" :class="{ active: currentColor === c }"
              :title="c" @click="setColor(store.slot, c)">
        <i :style="{ background: swatch(c) }" /><span>{{ c }}</span>
      </button>
    </div>
    <div v-else-if="tints.length" class="swatches">
      <button v-for="(t, i) in tints" :key="t.name" class="sw" :class="{ active: (pickRef?.tint ?? 0) === i }"
              :title="t.name" @click="setTint(store.slot, i)">
        <i :style="{ background: t.shades ? hex(t.hex) : 'transparent' }" :class="{ natural: !t.shades }" /><span>{{ t.name }}</span>
      </button>
    </div>
    <p v-else class="muted">No colour options for this item.</p>
  </section>
</template>

<style scoped>
.colors { padding: 0 12px 12px; }
.swatches { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; max-height: 260px; overflow: auto; }
.sw { display: flex; align-items: center; gap: 6px; padding: 3px 6px; background: transparent; border-color: transparent; text-align: left; }
.sw.active { border-color: var(--accent); background: var(--accent-soft); }
.sw i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border-strong); flex: none; }
.sw i.natural { background: repeating-linear-gradient(45deg, #555 0 3px, #333 3px 6px) !important; }
.sw span { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: var(--muted); }
</style>
