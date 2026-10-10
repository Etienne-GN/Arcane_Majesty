<script setup lang="ts">
import SlotList from './components/SlotList.vue'
import ItemPicker from './components/ItemPicker.vue'
import ColorPicker from './components/ColorPicker.vue'
import MotionStage from './components/MotionStage.vue'
import LayerList from './components/LayerList.vue'
import CharacterCanvas from './components/CharacterCanvas.vue'
import SavesPanel from './components/SavesPanel.vue'
import CastHome from './components/CastHome.vue'
import CastBar from './components/CastBar.vue'
import GapReview from './components/GapReview.vue'
import FlagsInbox from './components/FlagsInbox.vue'
import FlagForm from './components/FlagForm.vue'
import { openFlagCount } from './gapState'
import { layersFor } from '@v2/model/composition.js'
import { store, catalogue } from './store'
import { cast } from './castState'

/** The current character wearing `entry` in the selected slot (or nothing there), for picker thumbnails. */
function withItem(entry: any) {
  const sel = { ...store.comp.sel }
  if (entry) sel[store.slot] = { id: entry.id }
  else delete sel[store.slot]
  return layersFor(catalogue, { name: '', sel })
}
</script>

<template>
  <div class="app">
    <header class="top">
      <strong>LPC Forge</strong> <span class="ver">v2</span>
      <nav class="tabs">
        <button :class="{ active: store.screen === 'cast' }" @click="store.screen = 'cast'">Cast</button>
        <button :class="{ active: store.screen === 'forge' }" @click="store.screen = 'forge'">Forge</button>
        <button :class="{ active: store.screen === 'gaps' }" @click="store.screen = 'gaps'">Gaps</button>
        <button :class="{ active: store.screen === 'flags' }" @click="store.screen = 'flags'">Flags<b v-if="openFlagCount" class="count">{{ openFlagCount }}</b></button>
      </nav>
      <template v-if="store.screen === 'forge'">
        <input class="name" v-model="store.comp.name" aria-label="Character name" />
        <CastBar />
      </template>
    </header>
    <CastHome v-if="store.screen === 'cast'" />
    <GapReview v-else-if="store.screen === 'gaps'" />
    <FlagsInbox v-else-if="store.screen === 'flags'" />
    <template v-else>
      <aside class="left"><SlotList /></aside>
      <main class="center">
        <ItemPicker>
          <template #thumb="{ entry }">
            <CharacterCanvas class="checker" :layers="withItem(entry)" motion="walk" dir="down" :scale="1" still />
          </template>
        </ItemPicker>
        <MotionStage />
      </main>
      <aside class="right">
        <ColorPicker />
        <LayerList />
        <SavesPanel v-if="!cast.meta" />
      </aside>
    </template>
    <FlagForm />
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 260px 1fr 320px; grid-template-rows: auto 1fr; height: 100%; }
.top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding: 6px 14px; min-height: 44px; border-bottom: 1px solid var(--border); background: var(--panel); flex-wrap: wrap; }
.ver { color: var(--muted); font-family: var(--font-mono); }
.tabs { display: flex; gap: 4px; margin-left: 12px; }
.tabs button { padding: 3px 10px; }
.count { margin-left: 5px; background: #ff6464; color: #fff; border-radius: 8px; padding: 0 5px; font-size: 10px; font-weight: normal; }
.name { margin-left: 16px; width: 200px; }
.left, .right { background: var(--panel); overflow: auto; }
.left { border-right: 1px solid var(--border); }
.right { border-left: 1px solid var(--border); }
.center { overflow: auto; display: flex; flex-direction: column; min-height: 0; }
</style>
