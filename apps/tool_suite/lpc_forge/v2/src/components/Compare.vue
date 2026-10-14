<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { SLOTS } from '@game/systems/lpcLayout.js'
import { layersFor, entryFor } from '@v2/model/composition.js'
import { compositionOf } from '@v2/model/cast.js'
import { DIRS } from '@v2/render/frames.js'
import CharacterCanvas from './CharacterCanvas.vue'
import { store, layers, catalogue } from '@v2/store'
import { cast, castList, refreshCast } from '@v2/castState'

// Two characters (or two looks of one) side by side on the same motion, in step
// (every canvas runs on the shared clock), with what differs slot by slot.

type Side = { src: string; variant: string }   // src: '' = the forge's character, else a cast id
const sides = reactive<Side[]>([{ src: '', variant: '' }, { src: '', variant: '' }])
const view = reactive({ motion: 'walk', dir: 'down', mode: 'grid' as 'grid' | 'single' })

onMounted(async () => {
  if (!castList.value.length) await refreshCast()
  // Sensible start: the open character against its first variant, or the first cast member.
  const open = cast.meta?.id
  const other = castList.value.find(c => c.id !== open)
  if (open && Object.keys(cast.meta.variants ?? {}).length) sides[1] = { src: open, variant: Object.keys(cast.meta.variants)[0] }
  else if (other) sides[1] = { src: other.id, variant: '' }
})

function info(s: Side) {
  if (!s.src) return { name: `${store.comp.name || 'Forge'} (in the forge)`, comp: store.comp, layers: layers.value, overrides: store.ruleOverrides ?? null, variants: [] as string[] }
  const c = castList.value.find(x => x.id === s.src)
  if (!c) return null
  const comp = compositionOf(c, s.variant || null)
  return {
    name: c.name + (s.variant ? ` · ${s.variant}` : ''), comp,
    layers: layersFor(catalogue, comp), overrides: c.motionRules ?? null, variants: Object.keys(c.variants ?? {}),
  }
}
const infos = computed(() => sides.map(info))

function describe(slot: string, p: any) {
  if (!p?.id) return '—'
  const e = entryFor(catalogue, slot, p.id)
  return (e?.label ?? p.id) + (p.color ? ` (${p.color})` : p.tint ? ` (tint ${p.tint})` : '')
}
const diffs = computed(() => {
  const [a, b] = infos.value
  if (!a || !b) return []
  return SLOTS.filter((s: string) => JSON.stringify(a.comp.sel[s] ?? null) !== JSON.stringify(b.comp.sel[s] ?? null))
    .map((s: string) => ({ slot: s, a: describe(s, a.comp.sel[s]), b: describe(s, b.comp.sel[s]) }))
})
const dirs = computed(() => (view.mode === 'single' ? [view.dir] : DIRS))
</script>

<template>
  <div class="cmp">
    <div class="bar">
      <h2>Compare</h2>
      <select v-model="view.motion" aria-label="Motion"><option v-for="m in DEFAULT_ANIMS" :key="m" :value="m">{{ m.replace('_', ' ') }}</option></select>
      <button :class="{ active: view.mode === 'grid' }" @click="view.mode = 'grid'">4 directions</button>
      <button :class="{ active: view.mode === 'single' }" @click="view.mode = 'single'">Single</button>
      <template v-if="view.mode === 'single'">
        <button v-for="d in DIRS" :key="d" :class="{ active: view.dir === d }" @click="view.dir = d">{{ d }}</button>
      </template>
      <button @click="store.playing = !store.playing">{{ store.playing ? 'Pause' : 'Play' }}</button>
    </div>
    <div class="sides">
      <section v-for="(s, i) in sides" :key="i" class="side">
        <div class="pick">
          <select v-model="s.src" @change="s.variant = ''" :aria-label="`Side ${i + 1}`">
            <option value="">The forge's character</option>
            <option v-for="c in castList" :key="c.id" :value="c.id">{{ c.name }}{{ c.published ? '' : ' (draft)' }}</option>
          </select>
          <select v-if="infos[i]?.variants.length" v-model="s.variant" aria-label="Variant">
            <option value="">Base look</option>
            <option v-for="v in infos[i]!.variants" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>
        <h3>{{ infos[i]?.name ?? 'Not found' }}</h3>
        <div v-if="infos[i]" class="canvases checker" :class="view.mode">
          <CharacterCanvas v-for="d in dirs" :key="d" :layers="infos[i]!.layers" :motion="view.motion" :dir="d"
                           :overrides="infos[i]!.overrides" :scale="view.mode === 'single' ? 6 : 3" missing-overlay />
        </div>
      </section>
    </div>
    <section class="diff">
      <h3>What differs</h3>
      <p v-if="!diffs.length" class="muted">Nothing — same items, colours and tints.</p>
      <table v-else>
        <tr v-for="d in diffs" :key="d.slot"><th>{{ d.slot.replace(/_/g, ' ') }}</th><td>{{ d.a }}</td><td>{{ d.b }}</td></tr>
      </table>
    </section>
  </div>
</template>

<style scoped>
.cmp { grid-column: 1 / -1; overflow: auto; padding-bottom: 20px; }
.bar { display: flex; gap: 6px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bar h2 { margin: 0 8px 0 0; font-size: 16px; }
.bar button { padding: 3px 8px; }
.sides { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px 16px; }
.side { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; }
.pick { display: flex; gap: 6px; flex-wrap: wrap; }
.canvases { display: grid; grid-template-columns: repeat(2, max-content); gap: 4px; padding: 6px; border-radius: var(--radius); justify-content: center; }
.canvases.single { grid-template-columns: max-content; }
.checker { background-color: var(--checker-a); background-image: linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%), linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.diff { padding: 0 16px; }
table { border-collapse: collapse; }
th { text-align: left; color: var(--muted); font-weight: normal; text-transform: capitalize; padding: 3px 14px 3px 0; }
td { padding: 3px 14px 3px 0; border-bottom: 1px solid var(--border); }
.muted { color: var(--muted); }
</style>
