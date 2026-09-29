<script setup lang="ts">
import FlagThread from './FlagThread.vue';
import { staleFlags, resolveFlags } from '../store';

// Flags whose sprite was renamed, split or deleted by an earlier fix. There
// is nothing left to show, so they are listed here to read and clear.
</script>

<template>
  <div class="stale">
    <div class="head">
      <p class="muted">These flags point at sprites that no longer exist (renamed, split or removed by an earlier fix).</p>
      <button v-if="staleFlags.length" @click="resolveFlags(staleFlags, `Dismissed ${staleFlags.length} stale flags`)">Dismiss all {{ staleFlags.length }}</button>
    </div>
    <div v-if="!staleFlags.length" class="muted empty">No stale flags. 🎉</div>
    <div class="list">
      <FlagThread v-for="f in staleFlags" :key="f.id" :flag="f" stale />
    </div>
  </div>
</template>

<style scoped>
.stale { flex: 1; overflow-y: auto; padding: 16px; }
.head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.head p { margin: 0; flex: 1; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 10px; }
.empty { padding: 40px; text-align: center; }
</style>
