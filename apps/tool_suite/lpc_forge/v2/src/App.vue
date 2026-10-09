<script setup lang="ts">
import SlotList from './components/SlotList.vue'
import ItemPicker from './components/ItemPicker.vue'
import ColorPicker from './components/ColorPicker.vue'
import MotionStage from './components/MotionStage.vue'
import LayerList from './components/LayerList.vue'
import CharacterCanvas from './components/CharacterCanvas.vue'
import { layersFor } from '@v2/model/composition.js'
import { store, catalogue } from './store'

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
      <input class="name" v-model="store.comp.name" aria-label="Character name" />
    </header>
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
    </aside>
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 260px 1fr 320px; grid-template-rows: 44px 1fr; height: 100%; }
.top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-bottom: 1px solid var(--border); background: var(--panel); }
.ver { color: var(--muted); font-family: var(--font-mono); }
.name { margin-left: 16px; width: 220px; }
.left, .right { background: var(--panel); overflow: auto; }
.left { border-right: 1px solid var(--border); }
.right { border-left: 1px solid var(--border); }
.center { overflow: auto; display: flex; flex-direction: column; min-height: 0; }
</style>
