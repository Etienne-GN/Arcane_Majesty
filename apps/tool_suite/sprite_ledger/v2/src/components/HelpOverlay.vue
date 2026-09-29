<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();
const GROUPS: { title: string; keys: [string, string][] }[] = [
    { title: 'Move & select', keys: [
        ['← → ↑ ↓', 'Move in the grid'], ['J / K', 'Next / previous sprite'], ['Shift + arrows / click', 'Extend the selection'],
        ['Ctrl + click', 'Add / remove one sprite'], ['Ctrl A', 'Select everything shown'], ['Esc', 'Clear the selection'],
    ] },
    { title: 'Act', keys: [
        ['A', 'Approve (review flags, or the hitbox in the Collision tab)'], ['R', 'Send back to Claude (focus the note)'],
        ['F', 'Flag the selection for Claude'], ['Ctrl ↵', 'Send a flag / answer'], ['↵', 'Focus mode on the selection or view'],
        ['Space', 'Play / pause the animation'],
    ] },
    { title: 'View', keys: [
        ['1 / 2 / 3', 'Inspector tab: Info / Flags / Collision'], ['G / S', 'Grid / Sheet view'], ['− / +', 'Zoom the sheet context (focus mode)'],
        ['Ctrl K', 'Command palette: jump anywhere'], ['/', 'Search sprite names'], ['?', 'This help'],
    ] },
];
</script>

<template>
  <div class="backdrop" @mousedown.self="emit('close')">
    <div class="help">
      <div class="head"><span>Keyboard shortcuts</span><button class="ghost" @click="emit('close')">✕</button></div>
      <div class="cols">
        <div v-for="g in GROUPS" :key="g.title">
          <h4>{{ g.title }}</h4>
          <div v-for="[k, d] in g.keys" :key="k" class="row"><kbd>{{ k }}</kbd><span>{{ d }}</span></div>
        </div>
      </div>
      <p class="muted small">Every change shows a notice at the bottom right with Undo. The address bar keeps where you are, so reload and Back work.</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: #0008; z-index: 100; display: flex; align-items: center; justify-content: center; }
.help { width: min(900px, 94vw); background: var(--panel); border: 1px solid var(--border-strong); border-radius: 10px; padding: 18px 22px; }
.head { display: flex; justify-content: space-between; align-items: center; font-size: 16px; margin-bottom: 8px; }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
h4 { margin: 8px 0; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.row { display: flex; gap: 10px; align-items: baseline; margin: 5px 0; font-size: 12px; }
.row kbd { flex-shrink: 0; min-width: 88px; text-align: center; margin: 0; }
.small { font-size: 11px; margin-top: 14px; }
</style>
