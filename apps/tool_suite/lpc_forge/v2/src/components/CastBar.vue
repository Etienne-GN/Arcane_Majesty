<script setup lang="ts">
import { computed } from 'vue'
import { ROLES, validateCast } from '@v2/model/cast.js'
import { CHARACTERS } from '@game/data/characters.js'
import { catalogue, store } from '@v2/store'
import { cast, castList, closeCast, saveCast, switchVariant, addVariant, removeVariant, currentCast } from '@v2/castState'

// Lore names to link: the game's playable characters plus any already used on the cast.
const loreNames = computed(() => [...new Set([
  ...CHARACTERS.map((c: any) => c.name),
  ...castList.value.map(c => c.dbCharacter).filter(Boolean),
])].sort())

// Blocking problems (stale layers are expected while editing; saving rebuilds them).
const problems = computed(() => {
  if (!cast.meta) return []
  void JSON.stringify(store.comp)   // re-evaluate on edits
  return validateCast(catalogue, currentCast()).filter((e: string) => e !== 'layers are stale')
})

function askVariant() {
  const n = prompt('Variant name (e.g. traveling, armoured):')
  if (n) addVariant(n)
}
</script>

<template>
  <div v-if="cast.meta" class="castbar">
    <button @click="closeCast" title="Back to the cast">◀ Cast</button>
    <span class="id" :title="cast.meta.onDisk ? 'File: apps/amo/src/data/cast/' + cast.meta.id + '.json' : 'Saved as the name, slugified'">
      {{ cast.meta.onDisk ? cast.meta.id : 'new' }}
    </span>
    <select v-model="cast.meta.role" aria-label="Role">
      <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
    </select>
    <input v-model="cast.meta.dbCharacter" list="lore-names" placeholder="Lore character" class="lore" aria-label="Lore character" />
    <datalist id="lore-names"><option v-for="n in loreNames" :key="n" :value="n" /></datalist>
    <select :value="cast.meta.variant ?? ''" @change="switchVariant(($event.target as HTMLSelectElement).value || null)" aria-label="Variant">
      <option value="">Base look</option>
      <option v-for="v in Object.keys(cast.meta.variants)" :key="v" :value="v">{{ v }}</option>
    </select>
    <button @click="askVariant" title="New variant from what's on screen">+ variant</button>
    <button v-if="cast.meta.variant" @click="removeVariant(cast.meta.variant!)" title="Delete this variant">− variant</button>
    <label class="pub"><input type="checkbox" v-model="cast.meta.published" /> published</label>
    <button class="save" :disabled="problems.length > 0" :title="problems.join('\n')" @click="saveCast">Save to cast</button>
    <span v-if="problems.length" class="err" :title="problems.join('\n')">{{ problems.length }} problem(s)</span>
    <span v-if="cast.error" class="err">{{ cast.error }}</span>
  </div>
  <div v-else class="castbar scratch">
    <button @click="store.screen = 'cast'">◀ Cast</button>
    <span class="muted">Scratch composition (not in the cast)</span>
  </div>
</template>

<style scoped>
.castbar { display: flex; gap: 6px; align-items: center; margin-left: 12px; flex-wrap: wrap; }
.castbar button, .castbar select, .castbar input { padding: 3px 8px; }
.id { font-family: var(--font-mono); color: var(--muted); }
.lore { width: 150px; }
.pub { display: flex; gap: 4px; align-items: center; }
.save { border-color: var(--accent); }
.save:disabled { opacity: .5; cursor: not-allowed; }
.err { color: var(--missing); }
.muted { color: var(--muted); }
</style>
