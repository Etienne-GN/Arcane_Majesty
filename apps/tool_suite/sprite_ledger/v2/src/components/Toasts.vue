<script setup lang="ts">
import { toasts, dismissToast } from '../store';
</script>

<template>
  <div class="toasts">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">
      <span>{{ t.text }}</span>
      <button v-if="t.undo" class="ghost undo" @click="t.undo!(); dismissToast(t.id)">Undo</button>
      <button class="ghost x" @click="dismissToast(t.id)">✕</button>
    </div>
  </div>
</template>

<style scoped>
.toasts { position: fixed; right: 16px; bottom: 16px; z-index: 200; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast { display: flex; align-items: center; gap: 10px; background: var(--raised); border: 1px solid var(--border-strong); border-left: 3px solid var(--s-approved); border-radius: var(--radius); padding: 8px 8px 8px 12px; box-shadow: 0 8px 24px #0008; max-width: 460px; }
.toast.error { border-left-color: var(--s-open); }
.undo { color: var(--accent); font-weight: 600; }
.x { color: var(--muted); padding: 2px 6px; }
</style>
