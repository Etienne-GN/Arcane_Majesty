<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { InboxId } from '../store';
import {
    INBOX, items, collectionTree, sheetCounts, setScope, select, view, filters, clearFilters, load, openFocusMode,
    selectAll, inboxCounts,
} from '../store';

// Ctrl+K: jump to any sprite, sheet or collection by typing part of its name,
// or run a command.
const emit = defineEmits<{ close: []; help: [] }>();
const q = ref('');
const active = ref(0);
const input = ref<HTMLInputElement | null>(null);
onMounted(() => nextTick(() => input.value?.focus()));

interface Entry { group: string; label: string; detail?: string; run: () => void }
const commands = computed<Entry[]>(() => [
    ...(Object.keys(INBOX) as InboxId[]).map(id => ({
        group: 'Go to', label: `Inbox: ${INBOX[id].label}`, detail: String(inboxCounts.value[id]), run: () => setScope({ kind: 'inbox', id }),
    })),
    { group: 'Go to', label: 'All sprites', run: () => setScope({ kind: 'library', id: 'all' }) },
    { group: 'View', label: 'Grid view', detail: 'G', run: () => { view.value = 'grid'; } },
    { group: 'View', label: 'Sheet view', detail: 'S', run: () => { view.value = 'sheet'; } },
    { group: 'Filter', label: 'Only animated sprites', run: () => { filters.animated = true; } },
    { group: 'Filter', label: 'Only hitbox guesses to check', run: () => { filters.hitbox = 'proposed'; } },
    { group: 'Filter', label: 'Only unlicensed', run: () => { filters.license = 'unlicensed'; } },
    { group: 'Filter', label: 'Clear filters', run: clearFilters },
    { group: 'Action', label: 'Select everything shown', detail: 'Ctrl A', run: selectAll },
    { group: 'Action', label: 'Review one by one (focus mode)', detail: '↵', run: () => openFocusMode(null) },
    { group: 'Action', label: 'Reload data from disk', run: load },
    { group: 'Help', label: 'Keyboard shortcuts', detail: '?', run: () => emit('help') },
]);

const results = computed<Entry[]>(() => {
    const s = q.value.trim().toLowerCase();
    if (!s) return commands.value;
    const out: Entry[] = commands.value.filter(c => c.label.toLowerCase().includes(s));
    for (const c of collectionTree.value) {
        if (c.name.toLowerCase().includes(s)) out.push({ group: 'Collection', label: c.name, run: () => setScope({ kind: 'library', id: c.id }) });
    }
    let n = 0;
    for (const [name, c] of sheetCounts.value) {
        if (name.toLowerCase().includes(s) && n++ < 15) out.push({ group: 'Sheet', label: name, detail: String(c.total), run: () => setScope({ kind: 'sheet', id: name }) });
    }
    n = 0;
    for (const it of items.value) {
        if (it.entry.name.toLowerCase().includes(s) && n++ < 40) {
            out.push({
                group: 'Sprite', label: it.entry.name, detail: it.sheet.sheetPngFilename,
                run: () => { setScope({ kind: 'sheet', id: it.sheet.sheetPngFilename }); select(it.key); },
            });
        }
    }
    return out;
});

function run(e: Entry) { e.run(); emit('close'); }
function onKey(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') { active.value = Math.min(results.value.length - 1, active.value + 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { active.value = Math.max(0, active.value - 1); ev.preventDefault(); }
    else if (ev.key === 'Enter' && results.value[active.value]) { run(results.value[active.value]); ev.preventDefault(); }
    else if (ev.key === 'Escape') emit('close');
}
function searchInGrid() { filters.search = q.value.trim(); emit('close'); }
</script>

<template>
  <div class="backdrop" @mousedown.self="emit('close')">
    <div class="palette">
      <input ref="input" v-model="q" placeholder="Type a sprite, sheet, collection or command…" @keydown="onKey" @input="active = 0" />
      <div class="list">
        <button v-if="q.trim()" class="item" @click="searchInGrid">
          <span class="group">Filter</span><span class="label">Show sprites matching “{{ q.trim() }}”</span>
        </button>
        <button
          v-for="(r, i) in results" :key="`${r.group}:${r.label}:${r.detail}`" class="item" :class="{ active: i === active }"
          @mouseenter="active = i" @click="run(r)"
        >
          <span class="group">{{ r.group }}</span>
          <span class="label" :class="{ mono: r.group === 'Sprite' || r.group === 'Sheet' }">{{ r.label }}</span>
          <span v-if="r.detail" class="detail muted">{{ r.detail }}</span>
        </button>
        <div v-if="!results.length" class="muted none">No match.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: #0008; z-index: 100; display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; }
.palette { width: min(640px, 92vw); background: var(--panel); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 20px 60px #000a; overflow: hidden; }
input { width: 100%; border: none; border-bottom: 1px solid var(--border); border-radius: 0; padding: 14px 16px; font-size: 15px; background: transparent; }
input:focus { outline: none; }
.list { max-height: 55vh; overflow-y: auto; padding: 6px; }
.item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: none; border: 1px solid transparent; padding: 7px 10px; }
.item.active, .item:hover { background: var(--accent-soft); border-color: transparent; }
.group { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--faint); width: 72px; flex-shrink: 0; }
.label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail { font-size: 11px; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.none { padding: 14px; }
</style>
