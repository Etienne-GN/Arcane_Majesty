<script setup lang="ts">
import { ref } from 'vue';
import type { Key } from '../store';
import { addFlag } from '../store';

// Report a problem on one or more sprites. Pick what's wrong, add a note,
// send: it becomes an "Open for Claude" flag on each sprite.
const props = defineProps<{ keys: Key[] }>();

const REASONS = [
    { id: 'misaligned', label: 'Wrong crop' },
    { id: 'wrong_name', label: 'Wrong name' },
    { id: 'should_be_animation', label: 'Should be an animation' },
    { id: 'wrong_colors', label: 'Wrong colors' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'wrong_collection', label: 'Wrong collection' },
    { id: 'broken_image', label: 'Broken image' },
    { id: 'other', label: 'Other' },
];
const reason = ref('misaligned');
const note = ref('');
const busy = ref(false);
const input = ref<HTMLTextAreaElement | null>(null);
defineExpose({ focus: () => input.value?.focus() });

async function send() {
    busy.value = true;
    for (const k of props.keys) await addFlag(k, reason.value, note.value.trim());
    note.value = '';
    busy.value = false;
}
</script>

<template>
  <div class="composer">
    <div class="title">Flag {{ keys.length > 1 ? `${keys.length} sprites` : 'this sprite' }} for Claude</div>
    <div class="chips">
      <button v-for="r in REASONS" :key="r.id" :class="{ on: reason === r.id }" @click="reason = r.id">{{ r.label }}</button>
    </div>
    <textarea
      ref="input" v-model="note" rows="3"
      :placeholder="reason === 'should_be_animation' ? 'How many frames, in what order, how fast? e.g. 4 frames, left to right, ~120ms' : 'Describe what is wrong (optional)'"
      @keydown.ctrl.enter="send"
    />
    <button :disabled="busy" @click="send">Send flag <kbd>Ctrl ↵</kbd></button>
  </div>
</template>

<style scoped>
.composer { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border); padding-top: 10px; }
.title { font-size: 12px; color: var(--muted); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chips button { font-size: 11px; padding: 3px 8px; border-radius: 12px; }
.chips button.on { background: var(--accent-soft); border-color: var(--accent); }
textarea { width: 100%; }
</style>
