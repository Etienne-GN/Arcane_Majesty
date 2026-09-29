<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { imageUrl } from '@shared/api';
import type { Item, Key } from '../store';
import { items, visible, visibleIndex, scope, focusItem, focusKey, selection, select, flagsByKey, physicsOf, openFocusMode } from '../store';

// The whole spritesheet with every sprite outlined and colour-coded by status.
// Sprites outside the current view/filters are dimmed, not hidden, so you
// always see where a sprite sits among its neighbours.
const showNames = ref(false);
const showHitboxes = ref(false);
const zoom = ref<number | 'fit'>('fit');
const wrap = ref<HTMLElement | null>(null);
const wrapW = ref(800);
const wrapH = ref(600);

const sheetsInView = computed(() => [...new Set(visible.value.map(i => i.sheet.sheetPngFilename))].sort());
const chosen = ref<string | null>(null);
const sheetName = computed(() =>
    (scope.value.kind === 'sheet' ? scope.value.id : null)
    ?? (chosen.value && sheetsInView.value.includes(chosen.value) ? chosen.value : null)
    ?? focusItem.value?.sheet.sheetPngFilename
    ?? sheetsInView.value[0] ?? null);
watch(() => focusItem.value?.sheet.sheetPngFilename, s => { if (s) chosen.value = s; });

const sheetItems = computed(() => items.value.filter(i => i.sheet.sheetPngFilename === sheetName.value));
const sheet = computed(() => sheetItems.value[0]?.sheet ?? null);
const scale = computed(() => {
    if (!sheet.value?.sheetWidth) return 1;
    if (zoom.value !== 'fit') return zoom.value;
    // fill the width (tall sheets scroll vertically), capped so a tiny sheet
    // doesn't turn into a wall of giant pixels
    const fit = Math.min((wrapW.value - 32) / sheet.value.sheetWidth, 8);
    return fit >= 1 ? Math.floor(fit) : fit;
});

function statusClass(key: Key) {
    const fl = flagsByKey.value.get(key) ?? [];
    if (fl.some(f => f.status === 'question')) return 'question';
    if (fl.some(f => f.status === 'needs_review')) return 'review';
    if (fl.some(f => f.status === 'open')) return 'open';
    if (physicsOf(key) === 'proposed') return 'hitbox';
    return 'plain';
}
function boxStyle(it: Item) {
    const s = scale.value;
    return { left: `${it.box.x * s}px`, top: `${it.box.y * s}px`, width: `${it.box.w * s}px`, height: `${it.box.h * s}px` };
}
function hitboxStyle(it: Item) {
    const hb = it.entry.hitbox;
    if (!hb || (it.entry.frames?.length ?? 0) > 1) return null;
    const s = scale.value;
    return { left: `${hb.x * s}px`, top: `${hb.y * s}px`, width: `${hb.w * s}px`, height: `${hb.h * s}px` };
}
function onClick(e: MouseEvent, key: Key) {
    select(key, e.shiftKey ? 'range' : (e.ctrlKey || e.metaKey) ? 'toggle' : 'replace');
}

// bring the selected sprite into view (after a click in the grid, keys, a jump)
async function reveal() {
    await nextTick();
    const el = wrap.value?.querySelector('.box.focused') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
watch([focusKey, sheetName, scale], reveal);

let ro: ResizeObserver | null = null;
onMounted(() => {
    ro = new ResizeObserver(() => { wrapW.value = wrap.value!.clientWidth; wrapH.value = wrap.value!.clientHeight; });
    ro.observe(wrap.value!);
    reveal();
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <div class="sheet-view">
    <div class="bar">
      <select v-if="scope.kind !== 'sheet'" :value="sheetName ?? ''" @change="chosen = ($event.target as HTMLSelectElement).value">
        <option v-for="s in sheetsInView" :key="s" :value="s">{{ s }}</option>
      </select>
      <span v-else class="mono">{{ sheetName }}</span>
      <span v-if="sheet" class="muted">{{ sheet.sheetWidth }}×{{ sheet.sheetHeight }}px · {{ sheetItems.length }} sprites</span>
      <span class="spacer" />
      <label><input v-model="showNames" type="checkbox" /> Names</label>
      <label><input v-model="showHitboxes" type="checkbox" /> Hitboxes</label>
      <div class="seg">
        <button :class="{ on: zoom === 'fit' }" @click="zoom = 'fit'">Fit</button>
        <button v-for="z in [1, 2, 3, 4]" :key="z" :class="{ on: zoom === z }" @click="zoom = z">{{ z }}×</button>
      </div>
    </div>
    <div ref="wrap" class="wrap">
      <div v-if="!sheet" class="muted empty">No sheet in this view.</div>
      <div
        v-else
        class="stage checker"
        :style="{ width: `${sheet.sheetWidth! * scale}px`, height: `${sheet.sheetHeight! * scale}px` }"
      >
        <img class="pixelated sheet-img" :src="imageUrl(sheet.sheetPngFilename)" :style="{ width: `${sheet.sheetWidth! * scale}px` }" draggable="false" />
        <div
          v-for="it in sheetItems"
          :key="it.key"
          class="box"
          :class="[statusClass(it.key), { dim: !visibleIndex.has(it.key), selected: selection.has(it.key), focused: focusKey === it.key }]"
          :style="boxStyle(it)"
          :title="it.entry.name"
          @click="onClick($event, it.key)"
          @dblclick="openFocusMode(it.key)"
        >
          <div v-if="showHitboxes && hitboxStyle(it)" class="hitbox" :style="hitboxStyle(it)!" />
          <span v-if="showNames" class="label mono">{{ it.entry.name }}</span>
        </div>
      </div>
    </div>
    <div class="legend">
      <span><i class="dot review" /> to review</span>
      <span><i class="dot question" /> question</span>
      <span><i class="dot open" /> open for Claude</span>
      <span><i class="dot hitbox" /> hitbox guess</span>
      <span class="muted">dimmed = outside the current view</span>
    </div>
  </div>
</template>

<style scoped>
.sheet-view { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 12px; }
.bar label { display: flex; gap: 4px; align-items: center; color: var(--muted); cursor: pointer; }
.spacer { flex: 1; }
.seg { display: flex; }
.seg button { border-radius: 0; padding: 3px 8px; font-size: 12px; }
.seg button:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.seg button:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
.seg button.on { background: var(--accent-soft); border-color: var(--accent); }
.wrap { flex: 1; overflow: auto; padding: 16px; }
.stage { position: relative; }
.sheet-img { position: absolute; left: 0; top: 0; pointer-events: none; }
.box { position: absolute; border: 1px solid #ffffff30; cursor: pointer; }
.box:hover { border-color: #fff; background: #ffffff10; }
.box.review { border-color: var(--s-review); }
.box.question { border-color: var(--s-question); }
.box.open { border-color: var(--s-open); }
.box.hitbox { border-color: #f0a03088; }
.box.dim { opacity: .25; }
.box.selected { background: #6aa3ff30; border-color: var(--accent); border-width: 2px; }
.box.focused { outline: 2px solid #fff; z-index: 2; }
.hitbox { position: absolute; background: #ff404055; border: 1px solid #ff4040; pointer-events: none; }
.label { position: absolute; left: 1px; top: 1px; font-size: 9px; color: #fff; text-shadow: 0 0 2px #000, 0 0 2px #000; white-space: nowrap; pointer-events: none; }
.legend { display: flex; gap: 14px; padding: 6px 12px; border-top: 1px solid var(--border); font-size: 11px; }
.legend i { margin-right: 4px; }
.empty { padding: 40px; }
</style>
