<script setup lang="ts">
import { computed } from 'vue';
import { scope, scopeLabel, INBOX, visible, filters, anyFilter, clearFilters, sort, view, thumbSize, openFocusMode, selection, selectAll } from '../store';

// Above the workspace: what you're looking at, the filters as chips (active
// ones highlighted, each clearable), and the view controls.
const STATUS = { flagged: 'Any flag', needs_review: 'To review', question: 'Question', open: 'Open for Claude' } as const;
const HITBOX = { unset: 'Not set', proposed: 'Guess to check', approved: 'Approved', no_hitbox: 'No hitbox' } as const;
const LICENSE = { ok: 'Licensed OK', unlicensed: 'Unlicensed', unmarked: 'Unmarked' } as const;
const hint = computed(() => (scope.value.kind === 'inbox' ? INBOX[scope.value.id].hint : ''));
</script>

<template>
  <div class="toolbar">
    <div class="line">
      <div class="scope">
        <span class="title">{{ scopeLabel() }}</span>
        <span class="count">{{ visible.length }} sprite{{ visible.length === 1 ? '' : 's' }}</span>
        <span v-if="hint" class="muted hint">{{ hint }}</span>
      </div>
      <span class="spacer" />
      <button v-if="visible.length" class="ghost" title="Select everything shown (Ctrl A)" @click="selectAll">Select all</button>
      <button v-if="visible.length" class="primary" title="Walk through them one by one (Enter)" @click="openFocusMode(null)">
        ⛶ Review {{ selection.size > 1 ? selection.size : visible.length }} one by one
      </button>
    </div>
    <div class="line">
      <label class="chip" :class="{ on: filters.status }">
        <span>Flags</span>
        <select v-model="filters.status"><option value="">any</option><option v-for="(l, k) in STATUS" :key="k" :value="k">{{ l }}</option></select>
      </label>
      <label class="chip" :class="{ on: filters.hitbox }">
        <span>Hitbox</span>
        <select v-model="filters.hitbox"><option value="">any</option><option v-for="(l, k) in HITBOX" :key="k" :value="k">{{ l }}</option></select>
      </label>
      <label class="chip" :class="{ on: filters.license }">
        <span>License</span>
        <select v-model="filters.license"><option value="">any</option><option v-for="(l, k) in LICENSE" :key="k" :value="k">{{ l }}</option></select>
      </label>
      <button class="chip toggle" :class="{ on: filters.animated }" @click="filters.animated = !filters.animated">▶ Animated</button>
      <button v-if="filters.search" class="chip on" @click="filters.search = ''">“{{ filters.search }}” ×</button>
      <button v-if="anyFilter" class="ghost clear" @click="clearFilters">Clear filters</button>
      <span class="spacer" />
      <label class="muted small">Sort
        <select v-model="sort"><option value="sheet">by sheet</option><option value="name">by name</option></select>
      </label>
      <label v-if="view === 'grid'" class="muted small size" title="Thumbnail size">
        <input v-model.number="thumbSize" type="range" min="32" max="160" step="8" />
      </label>
      <div class="seg">
        <button :class="{ on: view === 'grid' }" title="Grid (G)" @click="view = 'grid'">▦ Grid</button>
        <button :class="{ on: view === 'sheet' }" title="Sheet view (S)" @click="view = 'sheet'">▣ Sheet</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { border-bottom: 1px solid var(--border); padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; background: var(--panel); }
.line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.scope { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.title { font-size: 15px; font-weight: 600; }
.count { color: var(--muted); font-variant-numeric: tabular-nums; }
.hint { font-size: 12px; }
.spacer { flex: 1; }
.chip {
    display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border-strong); border-radius: 14px;
    padding: 2px 4px 2px 10px; font-size: 12px; background: var(--panel-2); color: var(--muted);
}
.chip select { border: none; background: transparent; padding: 2px 4px; color: var(--text); }
.chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
.chip.toggle { padding: 3px 10px; }
.clear { font-size: 12px; }
.small { font-size: 12px; display: flex; align-items: center; gap: 4px; }
.size input { width: 90px; }
.seg { display: flex; }
.seg button { border-radius: 0; font-size: 12px; padding: 4px 10px; }
.seg button:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.seg button:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
.seg button.on { background: var(--accent-soft); border-color: var(--accent); }
</style>
