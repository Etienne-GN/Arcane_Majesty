<script setup lang="ts">
</script>

<template>
  <div class="app">
    <header class="top"><strong>LPC Forge</strong> <span class="ver">v2</span></header>
    <aside class="left"></aside>
    <main class="center"></main>
    <aside class="right"></aside>
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 260px 1fr 300px; grid-template-rows: 44px 1fr; height: 100%; }
.top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-bottom: 1px solid var(--border); background: var(--panel); }
.ver { color: var(--muted); font-family: var(--font-mono); }
.left, .right { background: var(--panel); overflow: auto; }
.left { border-right: 1px solid var(--border); }
.right { border-left: 1px solid var(--border); }
.center { overflow: auto; }
</style>
