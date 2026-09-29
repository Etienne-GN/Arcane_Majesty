<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SpritePreview from './SpritePreview.vue';
import ContextView from './ContextView.vue';
import FlagThread from './FlagThread.vue';
import FlagComposer from './FlagComposer.vue';
import CollisionEditor from './CollisionEditor.vue';
import { focusMode, closeFocusMode, itemByKey, flagsByKey, physicsOf, lastActed, approveReview, scope } from '../store';

// One sprite at a time, big, with its sheet around it: the review pass.
// The queue is a snapshot taken when focus mode opens, so approving an item
// never shifts the list under you. After an action it moves to the next
// sprite not handled yet in this pass.
const preview = ref<InstanceType<typeof SpritePreview> | null>(null);
const context = ref<InstanceType<typeof ContextView> | null>(null);
const collision = ref<InstanceType<typeof CollisionEditor> | null>(null);

const key = computed(() => focusMode.queue[focusMode.index] ?? null);
const item = computed(() => (key.value ? itemByKey.value.get(key.value) ?? null : null));
const flagsHere = computed(() => (key.value ? flagsByKey.value.get(key.value) ?? [] : []));
const hitboxPending = computed(() => (key.value ? physicsOf(key.value) === 'proposed' : false));

// What to show first: the hitbox queue opens on Collision, otherwise Flags
// when there are some.
const tab = ref<'flags' | 'collision'>('flags');
function pickTab() {
    tab.value = (scope.value.kind === 'inbox' && scope.value.id === 'hitbox') || (!flagsHere.value.length && hitboxPending.value) ? 'collision' : 'flags';
}
watch(key, pickTab, { immediate: true });

const doneCount = computed(() => Object.keys(focusMode.done).length);
const approvedCount = computed(() => Object.values(focusMode.done).filter(v => v === 'approved' || v === 'saved').length);
const reworkCount = computed(() => Object.values(focusMode.done).filter(v => v === 'rework').length);

function go(d: number) {
    focusMode.index = Math.max(0, Math.min(focusMode.queue.length - 1, focusMode.index + d));
}
function advance() {
    const n = focusMode.queue.length;
    for (let step = 1; step <= n; step++) {
        const j = (focusMode.index + step) % n;
        if (!focusMode.done[focusMode.queue[j]]) { focusMode.index = j; return; }
    }
}
watch(lastActed, a => {
    if (!a || !focusMode.active || !key.value || !a.keys.includes(key.value)) return;
    if (a.kind === 'other') return;
    focusMode.done[key.value] = a.kind;
    advance();
});

/** A / Enter: the main action for what is on screen. */
function primary() {
    if (!key.value) return;
    if (tab.value === 'collision') collision.value?.save();
    else if (flagsHere.value.some(f => f.status === 'needs_review')) approveReview([key.value]);
}
function focusRework() {
    tab.value = 'flags';
    setTimeout(() => (document.querySelector('.focus textarea[data-rework]') as HTMLTextAreaElement | null)?.focus(), 0);
}
defineExpose({ go, primary, focusRework, zoom: (d: number) => context.value?.zoom(d), togglePlay: () => preview.value?.togglePlay() });
</script>

<template>
  <div class="focus">
    <header>
      <button class="ghost" @click="closeFocusMode">← Back <kbd>Esc</kbd></button>
      <span class="progress">
        {{ focusMode.index + 1 }} / {{ focusMode.queue.length }}
        · <span class="ok">✓ {{ approvedCount }}</span> · <span class="rw">↩ {{ reworkCount }}</span>
        <template v-if="doneCount === focusMode.queue.length"> · all done 🎉</template>
      </span>
      <div class="bar"><div class="fill" :style="{ width: `${(doneCount / Math.max(1, focusMode.queue.length)) * 100}%` }" /></div>
    </header>

    <div v-if="!item" class="muted empty">This sprite no longer exists. <button @click="go(1)">Next</button></div>
    <main v-else>
      <section class="visual">
        <SpritePreview ref="preview" :item="item" :max-px="400" />
        <ContextView ref="context" :item="item" :max-px="400" />
      </section>

      <section class="side">
        <div v-if="focusMode.done[item.key]" class="done" :class="focusMode.done[item.key]">
          {{ { approved: '✓ Approved', saved: '✓ Hitbox saved', rework: '↩ Sent back', answered: '✉ Answered' }[focusMode.done[item.key]] }} in this pass
        </div>
        <div class="name mono">{{ item.entry.name }}</div>
        <div class="muted mono small">{{ item.sheet.sheetPngFilename }}</div>

        <nav class="tabs">
          <button :class="{ on: tab === 'flags' }" @click="tab = 'flags'">Flags <span v-if="flagsHere.length" class="count">{{ flagsHere.length }}</span></button>
          <button :class="{ on: tab === 'collision' }" @click="tab = 'collision'">Collision <span v-if="hitboxPending" class="dot hitbox" /></button>
        </nav>

        <div v-if="tab === 'flags'" class="tab">
          <FlagThread v-for="f in flagsHere" :key="f.id" :flag="f" />
          <div v-if="!flagsHere.length" class="muted small">No open flags on this sprite.</div>
          <FlagComposer :keys="[item.key]" />
        </div>
        <div v-else class="tab">
          <CollisionEditor ref="collision" :item="item" :max-px="300" />
        </div>

        <div class="nav">
          <button :disabled="focusMode.index === 0" @click="go(-1)">◀ Previous <kbd>←</kbd></button>
          <button :disabled="focusMode.index >= focusMode.queue.length - 1" @click="go(1)">Next ▶ <kbd>→</kbd></button>
        </div>
        <div class="muted small">A approve / save · R send back · ← → move · − + zoom the sheet · Space play · Esc back</div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.focus { position: fixed; inset: 0; background: var(--bg); z-index: 50; display: flex; flex-direction: column; }
header { display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-bottom: 1px solid var(--border); position: relative; }
.progress { font-variant-numeric: tabular-nums; }
.ok { color: var(--s-approved); } .rw { color: var(--s-hitbox); }
.bar { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: transparent; }
.fill { height: 100%; background: var(--s-approved); transition: width .2s; }
main { flex: 1; display: flex; gap: 28px; padding: 20px 28px; overflow: auto; }
.visual { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.side { flex: 1; max-width: 560px; min-width: 320px; display: flex; flex-direction: column; gap: 10px; }
.name { font-size: 18px; word-break: break-all; }
.small { font-size: 11px; }
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.tabs button { background: none; border: none; border-bottom: 2px solid transparent; border-radius: 0; padding: 6px 10px; color: var(--muted); }
.tabs button.on { color: var(--text); border-bottom-color: var(--accent); }
.count { background: var(--raised); border-radius: 8px; padding: 0 6px; font-size: 11px; }
.tab { display: flex; flex-direction: column; gap: 10px; }
.nav { display: flex; gap: 8px; }
.nav button { flex: 1; }
.done { font-size: 12px; padding: 4px 8px; border-radius: var(--radius); background: #1f3a2b; }
.done.rework { background: #3a2e1d; }
.done.answered { background: #2b1f3a; }
.empty { padding: 60px; text-align: center; }
</style>
