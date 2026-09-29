<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Thumb from './Thumb.vue';
import type { Item, Key } from '../store';
import {
    visible, sort, thumbSize, selection, focusKey, select, flagsByKey, physicsOf, licenseOf,
    gridColumns, openFocusMode, scope, filters,
} from '../store';

// Virtualized grid: only the rows on screen are mounted, so "All" (7500+
// sprites) scrolls as smoothly as a single sheet. Grouped by sheet with
// collapsible headers when sorted by sheet.
const scroller = ref<HTMLElement | null>(null);
const width = ref(800);
const height = ref(600);
const scrollTop = ref(0);
const collapsed = ref<Set<string>>(new Set());

const GAP = 8;
const PAD = 12;
const HEADER_H = 34;
const cellW = computed(() => Math.max(thumbSize.value, 56) + 20);
const cellH = computed(() => thumbSize.value + 34);
const columns = computed(() => Math.max(1, Math.floor((width.value - PAD * 2 + GAP) / (cellW.value + GAP))));
watch(columns, c => { gridColumns.value = c; }, { immediate: true });

type Row =
    | { kind: 'header'; sheet: string; count: number; attention: number; top: number; h: number }
    | { kind: 'cells'; items: Item[]; top: number; h: number };

const rows = computed<Row[]>(() => {
    const out: Row[] = [];
    let top = PAD;
    const pushCells = (list: Item[]) => {
        for (let i = 0; i < list.length; i += columns.value) {
            out.push({ kind: 'cells', items: list.slice(i, i + columns.value), top, h: cellH.value });
            top += cellH.value + GAP;
        }
    };
    if (sort.value === 'name') {
        pushCells(visible.value);
    } else {
        // visible is sorted by sheet already: cut it into consecutive groups
        let i = 0;
        const list = visible.value;
        while (i < list.length) {
            const sheet = list[i].sheet.sheetPngFilename;
            let j = i;
            while (j < list.length && list[j].sheet.sheetPngFilename === sheet) j++;
            const group = list.slice(i, j);
            const attention = group.filter(it => flagsByKey.value.has(it.key) || physicsOf(it.key) === 'proposed').length;
            out.push({ kind: 'header', sheet, count: group.length, attention, top, h: HEADER_H });
            top += HEADER_H + 4;
            if (!collapsed.value.has(sheet)) pushCells(group);
            i = j;
        }
    }
    return out;
});
const totalHeight = computed(() => {
    const last = rows.value[rows.value.length - 1];
    return last ? last.top + last.h + PAD : 0;
});
const onScreen = computed(() => {
    const lo = scrollTop.value - 400, hi = scrollTop.value + height.value + 400;
    return rows.value.filter(r => r.top + r.h >= lo && r.top <= hi);
});

function toggleCollapse(sheet: string) {
    const next = new Set(collapsed.value);
    if (next.has(sheet)) next.delete(sheet); else next.add(sheet);
    collapsed.value = next;
}

function onClick(e: MouseEvent, key: Key) {
    select(key, e.shiftKey ? 'range' : (e.ctrlKey || e.metaKey) ? 'toggle' : 'replace');
}

// keep the focused sprite on screen when it moves by keyboard
watch(focusKey, async key => {
    if (!key || !scroller.value) return;
    await nextTick();
    const row = rows.value.find(r => r.kind === 'cells' && r.items.some(i => i.key === key));
    if (!row) return;
    const el = scroller.value;
    if (row.top < el.scrollTop) el.scrollTop = row.top - PAD;
    else if (row.top + row.h > el.scrollTop + el.clientHeight) el.scrollTop = row.top + row.h - el.clientHeight + PAD;
});
// a new scope, filter or sort starts at the top (in-place edits keep the position)
watch([scope, () => ({ ...filters }), sort], () => { if (scroller.value) scroller.value.scrollTop = 0; }, { deep: true });

let ro: ResizeObserver | null = null;
onMounted(() => {
    const el = scroller.value!;
    ro = new ResizeObserver(() => { width.value = el.clientWidth; height.value = el.clientHeight; });
    ro.observe(el);
    width.value = el.clientWidth; height.value = el.clientHeight;
});
onBeforeUnmount(() => ro?.disconnect());

function badges(key: Key) {
    const fl = flagsByKey.value.get(key) ?? [];
    return {
        review: fl.some(f => f.status === 'needs_review'),
        question: fl.some(f => f.status === 'question'),
        open: fl.some(f => f.status === 'open'),
        hitbox: physicsOf(key) === 'proposed',
        license: licenseOf(key),
    };
}
</script>

<template>
  <div ref="scroller" class="scroller" @scroll="scrollTop = ($event.target as HTMLElement).scrollTop">
    <div v-if="!visible.length" class="empty">
      <div class="empty-title">Nothing here</div>
      <div class="muted">No sprite matches this view. Try another inbox or clear the filters.</div>
    </div>
    <div class="canvas" :style="{ height: `${totalHeight}px` }">
      <template v-for="row in onScreen" :key="row.kind === 'header' ? `h:${row.sheet}` : `r:${row.top}`">
        <div
          v-if="row.kind === 'header'"
          class="group-header"
          :style="{ top: `${row.top}px`, height: `${row.h}px` }"
          @click="toggleCollapse(row.sheet)"
        >
          <span class="chev">{{ collapsed.has(row.sheet) ? '▸' : '▾' }}</span>
          <span class="mono">{{ row.sheet }}</span>
          <span class="muted">{{ row.count }}</span>
          <span v-if="row.attention" class="attention">{{ row.attention }} need attention</span>
        </div>
        <div v-else class="cell-row" :style="{ top: `${row.top}px`, height: `${row.h}px`, gap: `${GAP}px`, paddingLeft: `${PAD}px` }">
          <div
            v-for="it in row.items"
            :key="it.key"
            class="cell"
            :class="{ selected: selection.has(it.key), focused: focusKey === it.key }"
            :style="{ width: `${cellW}px` }"
            :data-key="it.key"
            :title="`${it.entry.name}\n${it.sheet.sheetPngFilename}`"
            @click="onClick($event, it.key)"
            @dblclick="openFocusMode(it.key)"
          >
            <div class="frame checker" :style="{ width: `${thumbSize + 8}px`, height: `${thumbSize + 8}px` }">
              <Thumb :item="it" :size="thumbSize" />
            </div>
            <div class="name mono">{{ it.entry.name }}</div>
            <div class="badges">
              <template v-for="b in [badges(it.key)]" :key="0">
                <span v-if="b.review" class="dot review" title="To review" />
                <span v-if="b.question" class="dot question" title="Claude has a question" />
                <span v-if="b.open" class="dot open" title="Open for Claude" />
                <span v-if="b.hitbox" class="dot hitbox" title="Hitbox guess to check" />
                <span v-if="b.license === 'ok'" class="lic ok" title="Licensed OK">✓</span>
                <span v-if="b.license === 'unlicensed'" class="lic bad" title="Flagged unlicensed">⚠</span>
                <span v-if="(it.entry.frames?.length ?? 0) > 1" class="anim" :title="`${it.entry.frames!.length} frames`">▶</span>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scroller { flex: 1; overflow-y: auto; position: relative; }
.canvas { position: relative; }
.group-header {
    position: absolute; left: 0; right: 0; display: flex; align-items: center; gap: 10px;
    padding: 0 14px; font-size: 12px; cursor: pointer; user-select: none;
    background: var(--panel); border-bottom: 1px solid var(--border);
}
.group-header:hover { background: var(--panel-2); }
.chev { width: 10px; color: var(--muted); }
.attention { margin-left: auto; color: var(--s-hitbox); font-size: 11px; }
.cell-row { position: absolute; left: 0; right: 0; display: flex; }
.cell {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 4px; border-radius: var(--radius); border: 1px solid transparent; cursor: pointer; user-select: none;
}
.cell:hover { background: var(--panel-2); }
.cell.selected { background: var(--accent-soft); border-color: #6aa3ff66; }
.cell.focused { border-color: var(--accent); }
.frame { display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden; }
.name { font-size: 10px; color: var(--muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell.selected .name, .cell.focused .name { color: var(--text); }
.badges { position: absolute; top: 6px; right: 6px; display: flex; gap: 3px; align-items: center; }
.lic { font-size: 11px; line-height: 1; }
.lic.ok { color: var(--s-approved); }
.lic.bad { color: var(--s-warn); }
.anim { font-size: 9px; color: #b88cff; }
.empty { position: absolute; top: 80px; left: 0; right: 0; text-align: center; }
.empty-title { font-size: 16px; margin-bottom: 6px; }
</style>
