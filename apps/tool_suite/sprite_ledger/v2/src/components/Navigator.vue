<script setup lang="ts">
import { ref, computed } from 'vue';
import type { InboxId } from '../store';
import {
    INBOX, scope, setScope, inboxCounts, collectionTree, collectionCounts, sheetCounts, addCollection,
} from '../store';

// Left navigator: what to work on (Inbox), where things live (Library =
// collections), and every sheet. Picking an entry sets the workspace scope.
const INBOX_ORDER: InboxId[] = ['review', 'question', 'hitbox', 'open', 'zones', 'stale'];
const isScope = (kind: string, id: string) => scope.value.kind === kind && scope.value.id === id;

const sheetQuery = ref('');
const sheetList = computed(() => {
    const q = sheetQuery.value.toLowerCase();
    return [...sheetCounts.value.entries()]
        .filter(([name]) => !q || name.toLowerCase().includes(q))
        .sort((a, b) => a[0].localeCompare(b[0]));
});
const showSheets = ref(true);
const showLibrary = ref(true);

const newName = ref('');
const newParent = ref('');
const adding = ref(false);
async function create() {
    await addCollection(newName.value, newParent.value || null);
    newName.value = ''; newParent.value = ''; adding.value = false;
}
function count(id: string) {
    const t = collectionCounts.value.total[id] ?? 0;
    const m = collectionCounts.value.matched;
    return m ? `${m[id] ?? 0}/${t}` : String(t);
}
</script>

<template>
  <nav class="nav">
    <div class="section-title">Inbox</div>
    <button
      v-for="id in INBOX_ORDER" :key="id" class="entry" :class="{ on: isScope('inbox', id), zero: !inboxCounts[id] }"
      :title="INBOX[id].hint" @click="setScope({ kind: 'inbox', id })"
    >
      <span class="dot" :class="INBOX[id].color" />
      <span class="label">{{ INBOX[id].label }}</span>
      <span class="n">{{ inboxCounts[id] }}</span>
    </button>

    <div class="section-title clickable" @click="showLibrary = !showLibrary">{{ showLibrary ? '▾' : '▸' }} Library</div>
    <template v-if="showLibrary">
      <button class="entry" :class="{ on: isScope('library', 'all') }" @click="setScope({ kind: 'library', id: 'all' })">
        <span class="label">All sprites</span><span class="n">{{ count('all') }}</span>
      </button>
      <button
        v-for="c in collectionTree" :key="c.id" class="entry" :class="{ on: isScope('library', c.id) }"
        :style="{ paddingLeft: `${12 + c.depth * 14}px` }" @click="setScope({ kind: 'library', id: c.id })"
      >
        <span class="label">{{ c.name }}</span><span class="n">{{ count(c.id) }}</span>
      </button>
      <button v-if="!adding" class="entry add" @click="adding = true">+ New collection</button>
      <form v-else class="new" @submit.prevent="create">
        <input v-model="newName" placeholder="Collection name" autofocus />
        <select v-model="newParent">
          <option value="">(top level)</option>
          <option v-for="c in collectionTree" :key="c.id" :value="c.id">{{ '— '.repeat(c.depth) }}{{ c.name }}</option>
        </select>
        <div class="row"><button type="submit" :disabled="!newName.trim()">Create</button><button type="button" class="ghost" @click="adding = false">Cancel</button></div>
      </form>
    </template>

    <div class="section-title clickable" @click="showSheets = !showSheets">{{ showSheets ? '▾' : '▸' }} Sheets <span class="muted">{{ sheetCounts.size }}</span></div>
    <template v-if="showSheets">
      <input v-model="sheetQuery" class="sheet-search" placeholder="Find a sheet…" />
      <button
        v-for="[name, c] in sheetList" :key="name" class="entry sheet" :class="{ on: isScope('sheet', name) }" :title="name"
        @click="setScope({ kind: 'sheet', id: name })"
      >
        <span class="label mono">{{ name }}</span>
        <span v-if="c.attention" class="dot hitbox" :title="`${c.attention} need attention`" />
        <span class="n">{{ c.total }}</span>
      </button>
    </template>
  </nav>
</template>

<style scoped>
.nav { width: 250px; flex-shrink: 0; background: var(--panel); border-right: 1px solid var(--border); overflow-y: auto; padding: 10px 8px; display: flex; flex-direction: column; gap: 1px; }
.section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--faint); padding: 12px 8px 4px; }
.section-title:first-child { padding-top: 2px; }
.clickable { cursor: pointer; user-select: none; }
.entry {
    display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
    background: none; border: 1px solid transparent; border-radius: var(--radius); padding: 5px 8px; color: var(--text);
}
.entry:hover { background: var(--panel-2); border-color: transparent; }
.entry.on { background: var(--accent-soft); border-color: #6aa3ff55; }
.entry.zero { color: var(--muted); }
.entry .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry .n { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.entry.sheet .label { font-size: 11px; }
.entry.add { color: var(--muted); }
.sheet-search { margin: 2px 4px 4px; }
.new { display: flex; flex-direction: column; gap: 4px; padding: 4px; }
.row { display: flex; gap: 4px; }
.dot.muted { background: var(--faint); }
</style>
