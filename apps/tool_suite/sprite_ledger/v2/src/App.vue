<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Navigator from './components/Navigator.vue';
import Toolbar from './components/Toolbar.vue';
import SpriteGrid from './components/SpriteGrid.vue';
import SheetView from './components/SheetView.vue';
import Inspector from './components/Inspector.vue';
import StaleFlags from './components/StaleFlags.vue';
import ZoneFlags from './components/ZoneFlags.vue';
import FocusMode from './components/FocusMode.vue';
import CommandPalette from './components/CommandPalette.vue';
import HelpOverlay from './components/HelpOverlay.vue';
import Toasts from './components/Toasts.vue';
import {
    load, loading, loadError, refreshIfStale, initUrlSync, items, scope, view, filters, inboxCounts,
    focusMode, closeFocusMode, openFocusMode, moveFocus, gridColumns, selectAll, clearSelection, selection, selectedItems,
    inspectorTab, approveReview, approveHitboxes, physicsOf,
} from './store';

const inspector = ref<InstanceType<typeof Inspector> | null>(null);
const focus = ref<InstanceType<typeof FocusMode> | null>(null);
const search = ref<HTMLInputElement | null>(null);
const paletteOpen = ref(false);
const helpOpen = ref(false);

const attention = computed(() => inboxCounts.value.review + inboxCounts.value.question);

onMounted(async () => {
    initUrlSync();
    await load();
    window.addEventListener('keydown', onKey);
    window.addEventListener('focus', refreshIfStale);
});
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('focus', refreshIfStale);
});

function typing(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/** A: approve what the context says — hitboxes in the hitbox inbox or Collision tab, otherwise review flags. */
function approve() {
    const sel = selectedItems.value.map(i => i.key);
    if (!sel.length) return;
    const hitboxContext = (scope.value.kind === 'inbox' && scope.value.id === 'hitbox') || inspectorTab.value === 'collision';
    if (hitboxContext) {
        if (sel.length === 1) inspector.value?.saveCollision();
        else approveHitboxes(sel.filter(k => physicsOf(k) === 'proposed'));
    } else {
        approveReview(sel);
    }
}

function onKey(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { paletteOpen.value = !paletteOpen.value; e.preventDefault(); return; }
    if (paletteOpen.value || helpOpen.value) {
        if (e.key === 'Escape') { paletteOpen.value = false; helpOpen.value = false; }
        return;
    }
    if (typing(e)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
    }
    if (e.key === '?') { helpOpen.value = true; e.preventDefault(); return; }

    if (focusMode.active) {
        const f = focus.value;
        const k = e.key;
        if (k === 'ArrowRight' || k === 'j') f?.go(1);
        else if (k === 'ArrowLeft' || k === 'k') f?.go(-1);
        else if (k === 'a' || k === 'Enter') f?.primary();
        else if (k === 'r') f?.focusRework();
        else if (k === '-' || k === '_') f?.zoom(1);
        else if (k === '+' || k === '=') f?.zoom(-1);
        else if (k === ' ') f?.togglePlay();
        else if (k === 'Escape') closeFocusMode();
        else return;
        e.preventDefault();
        return;
    }

    const k = e.key;
    if (k === 'ArrowRight') moveFocus(1, e.shiftKey);
    else if (k === 'ArrowLeft') moveFocus(-1, e.shiftKey);
    else if (k === 'ArrowDown') moveFocus(view.value === 'grid' ? gridColumns.value : 1, e.shiftKey);
    else if (k === 'ArrowUp') moveFocus(view.value === 'grid' ? -gridColumns.value : -1, e.shiftKey);
    else if (k === 'j') moveFocus(1);
    else if (k === 'k') moveFocus(-1);
    else if (mod && k.toLowerCase() === 'a') selectAll();
    else if (k === 'Escape') clearSelection();
    else if (k === 'a') approve();
    else if (k === 'r' && selection.value.size === 1) {
        inspectorTab.value = 'flags';
        setTimeout(() => (document.querySelector('.inspector textarea[data-rework]') as HTMLTextAreaElement | null)?.focus(), 0);
    }
    else if (k === 'f' && selection.value.size) inspector.value?.focusComposer();
    else if (k === '1') inspectorTab.value = 'info';
    else if (k === '2') inspectorTab.value = 'flags';
    else if (k === '3') inspectorTab.value = 'collision';
    else if (k === 'g') view.value = 'grid';
    else if (k === 's') view.value = 'sheet';
    else if (k === 'Enter') openFocusMode(null);
    else if (k === ' ') inspector.value?.togglePlay();
    else if (k === '/') search.value?.focus();
    else return;
    e.preventDefault();
}
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">▣ Sprite Ledger <span class="ver">v2</span></div>
      <div class="search">
        <input ref="search" v-model="filters.search" placeholder="Search sprite or sheet names…  /" />
        <button class="ghost palette-btn" title="Command palette (Ctrl K)" @click="paletteOpen = true">⌘ Jump to… <kbd>Ctrl K</kbd></button>
      </div>
      <div class="stats muted">
        <span>{{ items.length }} sprites</span>
        <span v-if="attention" class="need">{{ attention }} waiting for you</span>
      </div>
      <button class="ghost" title="Reload from disk" :disabled="loading" @click="load">↻</button>
      <button class="ghost" title="Keyboard shortcuts (?)" @click="helpOpen = true">?</button>
      <a class="v1" href="http://192.168.0.206:5178/" target="_blank" title="The previous version, same data">v1 ↗</a>
    </header>

    <div v-if="loadError" class="error">Couldn't load the ledger: {{ loadError }} <button @click="load">Retry</button></div>

    <div class="body">
      <Navigator />
      <main class="workspace">
        <div v-if="loading && !items.length" class="loading muted">Loading sprites…</div>
        <StaleFlags v-else-if="scope.kind === 'inbox' && scope.id === 'stale'" />
        <ZoneFlags v-else-if="scope.kind === 'inbox' && scope.id === 'zones'" />
        <template v-else>
          <Toolbar />
          <SpriteGrid v-if="view === 'grid'" />
          <SheetView v-else />
        </template>
      </main>
      <Inspector ref="inspector" />
    </div>

    <FocusMode v-if="focusMode.active" ref="focus" />
    <CommandPalette v-if="paletteOpen" @close="paletteOpen = false" @help="helpOpen = true" />
    <HelpOverlay v-if="helpOpen" @close="helpOpen = false" />
    <Toasts />
  </div>
</template>

<style scoped>
.app { height: 100%; display: flex; flex-direction: column; }
.top { display: flex; align-items: center; gap: 14px; padding: 8px 14px; border-bottom: 1px solid var(--border); background: var(--panel); }
.brand { font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
.ver { font-size: 10px; color: var(--accent); border: 1px solid var(--accent); border-radius: 4px; padding: 0 4px; margin-left: 4px; vertical-align: middle; }
.search { flex: 1; display: flex; gap: 6px; max-width: 640px; }
.search input { flex: 1; }
.palette-btn { white-space: nowrap; color: var(--muted); }
.stats { display: flex; gap: 12px; font-size: 12px; white-space: nowrap; }
.need { color: var(--s-review); }
.v1 { color: var(--muted); font-size: 12px; text-decoration: none; }
.v1:hover { color: var(--text); }
.error { background: #4a1f1f; padding: 8px 14px; }
.body { flex: 1; display: flex; min-height: 0; }
.workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.loading { padding: 60px; text-align: center; }
</style>
