<script setup lang="ts">
import SlotList from './components/SlotList.vue'
import ItemPicker from './components/ItemPicker.vue'
import ColorPicker from './components/ColorPicker.vue'
import { store } from './store'
</script>

<template>
  <div class="app">
    <header class="top">
      <strong>LPC Forge</strong> <span class="ver">v2</span>
      <input class="name" v-model="store.comp.name" aria-label="Character name" />
    </header>
    <aside class="left"><SlotList /></aside>
    <main class="center">
      <ItemPicker />
      <div class="stage"></div>
    </main>
    <aside class="right"><ColorPicker /></aside>
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 260px 1fr 300px; grid-template-rows: 44px 1fr; height: 100%; }
.top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-bottom: 1px solid var(--border); background: var(--panel); }
.ver { color: var(--muted); font-family: var(--font-mono); }
.name { margin-left: 16px; width: 220px; }
.left, .right { background: var(--panel); overflow: auto; }
.left { border-right: 1px solid var(--border); }
.right { border-left: 1px solid var(--border); }
.center { overflow: auto; display: flex; flex-direction: column; min-height: 0; }
.stage { flex: 1; }
</style>
