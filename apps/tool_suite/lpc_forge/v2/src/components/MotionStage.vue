<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { frameRateFor } from '@game/systems/lpcLayout.js'
import { DIRS } from '@v2/render/frames.js'
import CharacterCanvas from './CharacterCanvas.vue'
import { store, layers } from '@v2/store'
import { stepFrame } from '@v2/clock'
import { flagFromStage } from '@v2/flagging'

const SPEEDS = [0.25, 0.5, 1, 2]

/** Layers without their own art in a motion, by what they do: fallback / borrow / hide+missing. */
function gapCounts(motion: string) {
  const g = store.gaps[motion] ?? {}
  return { fallback: g.fallback?.length ?? 0, borrow: g.borrow?.length ?? 0, gone: (g.hide?.length ?? 0) + (g.missing?.length ?? 0) }
}
const anyGap = (m: string) => { const c = gapCounts(m); return c.fallback + c.borrow + c.gone > 0 }
function open(motion: string, dir: string) {
  store.motion = motion
  store.dir = dir
  store.view = 'single'
}
const fps = computed(() => frameRateFor(store.motion))

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  if (e.key === ' ') { store.playing = !store.playing; e.preventDefault() }
  else if (e.key === ',') stepFrame(fps.value, -1)
  else if (e.key === '.') stepFrame(fps.value, 1)
  else if ((e.key === 'f' || e.key === 'F') && store.view === 'single') flagFromStage('frame')
  else if (store.view === 'single') {
    const d = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' }[e.key]
    if (d) { store.dir = d; e.preventDefault() }
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="stage">
    <div class="bar">
      <button :class="{ active: store.view === 'grid' }" @click="store.view = 'grid'">Grid</button>
      <button :class="{ active: store.view === 'single' }" @click="store.view = 'single'">Single</button>
      <span class="sep" />
      <button @click="store.playing = !store.playing" :title="'Space'">{{ store.playing ? 'Pause' : 'Play' }}</button>
      <button @click="stepFrame(fps, -1)" title="Previous frame (,)">◀</button>
      <button @click="stepFrame(fps, 1)" title="Next frame (.)">▶</button>
      <button v-for="s in SPEEDS" :key="s" :class="{ active: store.speed === s }" @click="store.speed = s">{{ s }}×</button>
      <span class="sep" />
      <template v-if="store.view === 'single'">
        <button v-for="d in DIRS" :key="d" :class="{ active: store.dir === d }" @click="store.dir = d">{{ d }}</button>
        <span class="sep" />
        <button class="flag" title="Pause here and flag this frame for Claude (F)" @click="flagFromStage('frame')">🚩 Flag this frame</button>
        <span class="sep" />
      </template>
      <button title="PNG sheets + credits of this character" @click="store.exportOpen = true">⤓ Export…</button>
      <label title="corner badges: amber = walk frames, blue = borrowed, red = hidden"><input type="checkbox" v-model="store.showMissing" /> show gaps</label>
      <select v-model="store.bg" aria-label="Background">
        <option value="checker">checker</option><option value="grass">grass</option><option value="stone">stone</option>
      </select>
    </div>

    <div v-if="store.view === 'grid'" class="grid" :class="'bg-' + store.bg">
      <div class="head" />
      <div v-for="d in DIRS" :key="d" class="head">{{ d }}</div>
      <template v-for="m in DEFAULT_ANIMS" :key="m">
        <div class="mlabel">
          <span>{{ m.replace('_', ' ') }}</span>
          <span class="gapc">
            <b v-if="gapCounts(m).fallback" class="fb" title="layers playing their walk frames (no art for this motion)">{{ gapCounts(m).fallback }} walk</b>
            <b v-if="gapCounts(m).borrow" class="bo" title="layers borrowing another motion's frames">{{ gapCounts(m).borrow }} borrow</b>
            <b v-if="gapCounts(m).gone" class="gn" title="layers hidden in this motion">{{ gapCounts(m).gone }} hidden</b>
          </span>
        </div>
        <button v-for="d in DIRS" :key="m + d" class="cell" :title="`${m} ${d}`" @click="open(m, d)">
          <CharacterCanvas :layers="layers" :motion="m" :dir="d" :scale="2" :missing-overlay="store.showMissing" />
        </button>
      </template>
    </div>

    <div v-else class="single">
      <div class="big" :class="'bg-' + store.bg">
        <CharacterCanvas :layers="layers" :motion="store.motion" :dir="store.dir" :scale="6"
                         :missing-overlay="store.showMissing" />
      </div>
      <div class="strip">
        <button v-for="m in DEFAULT_ANIMS" :key="m" :class="{ active: store.motion === m }" @click="store.motion = m">
          {{ m.replace('_', ' ') }}<i v-if="anyGap(m)" class="dot" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; flex-direction: column; min-height: 0; flex: 1; border-top: 1px solid var(--border); }
.bar { display: flex; gap: 6px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bar button { padding: 3px 8px; }
.sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }
.flag { border-color: #ff6464; }
.grid { display: grid; grid-template-columns: 110px repeat(4, 136px); gap: 4px; padding: 12px; align-content: start; overflow: auto; }
.head { color: var(--muted); text-align: center; font-size: 11px; text-transform: uppercase; }
.mlabel { display: flex; flex-direction: column; justify-content: center; gap: 2px; text-transform: capitalize; }
.gapc { display: flex; flex-direction: column; font-family: var(--font-mono); font-size: 10px; }
.gapc b { font-weight: normal; }
.fb { color: #e0a030; } .bo { color: #4a8fe0; } .gn { color: var(--missing); }
.cell { padding: 2px; background: transparent; border-color: var(--border); }
.single { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; }
.big { padding: 8px; border-radius: var(--radius); }
.strip { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.strip button { position: relative; text-transform: capitalize; }
.dot { position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: var(--missing); }
.bg-checker { background-color: var(--checker-a); background-image: linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%), linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.bg-grass { background: #4f7a3a; }
.bg-stone { background: #6b6862; }
</style>
