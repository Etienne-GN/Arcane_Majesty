<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { imageUrl } from '@shared/api';
import type { Item, Key, Box } from '../store';
import {
    items, visible, visibleIndex, scope, focusItem, focusKey, selection, select, selectMany, flagsByKey, physicsOf,
    openFocusMode, zoneFlags, draftZones, addZoneFlags,
} from '../store';

// The whole spritesheet with every sprite outlined and colour-coded by status.
// Sprites outside the current view/filters are dimmed, not hidden, so you
// always see where a sprite sits among its neighbours.
//
// Two tools:
//  - Select: click a sprite (Shift/Ctrl to add), or drag a box to select every
//    sprite it touches — then flag them together in the inspector.
//  - Zone: drag boxes on the sheet image itself (an item that is badly cropped
//    or not catalogued at all), then flag those zones for Claude.
const showNames = ref(false);
const showHitboxes = ref(false);
const zoom = ref<number | 'fit'>('fit');
const tool = ref<'select' | 'zone'>('select');
const wrap = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
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

const sheetZoneFlags = computed(() => zoneFlags.value.filter(f => f.sheet === sheetName.value));
const sheetDrafts = computed(() => draftZones.value.filter(z => z.sheet === sheetName.value));

function statusClass(key: Key) {
    const fl = flagsByKey.value.get(key) ?? [];
    if (fl.some(f => f.status === 'question')) return 'question';
    if (fl.some(f => f.status === 'needs_review')) return 'review';
    if (fl.some(f => f.status === 'open')) return 'open';
    if (physicsOf(key) === 'proposed') return 'hitbox';
    return 'plain';
}
const ZONE_STATUS: Record<string, string> = { open: 'open', needs_review: 'review', question: 'question' };
function rectStyle(b: Box) {
    const s = scale.value;
    return { left: `${b.x * s}px`, top: `${b.y * s}px`, width: `${b.w * s}px`, height: `${b.h * s}px` };
}
function boxStyle(it: Item) { return rectStyle(it.box); }
function hitboxStyle(it: Item) {
    const hb = it.entry.hitbox;
    if (!hb || (it.entry.frames?.length ?? 0) > 1) return null;
    return rectStyle(hb);
}

// ---- pointer: click / drag-select / draw zones
interface Drag { x0: number; y0: number; x1: number; y1: number; add: boolean; moved: boolean }
const drag = ref<Drag | null>(null);
let suppressClick = false;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function toSheet(e: MouseEvent) {
    const r = stage.value!.getBoundingClientRect();
    const s = scale.value;
    return { x: clamp((e.clientX - r.left) / s, 0, sheet.value!.sheetWidth!), y: clamp((e.clientY - r.top) / s, 0, sheet.value!.sheetHeight!) };
}
function dragRect(d: Drag): Box {
    const x = Math.floor(Math.min(d.x0, d.x1)), y = Math.floor(Math.min(d.y0, d.y1));
    return { x, y, w: Math.ceil(Math.max(d.x0, d.x1)) - x, h: Math.ceil(Math.max(d.y0, d.y1)) - y };
}
function onDown(e: MouseEvent) {
    if (e.button !== 0 || !sheet.value) return;
    const p = toSheet(e);
    drag.value = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.shiftKey || e.ctrlKey || e.metaKey, moved: false };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    if (tool.value === 'zone') e.preventDefault();
}
function onMove(e: MouseEvent) {
    const d = drag.value;
    if (!d) return;
    const p = toSheet(e);
    d.x1 = p.x; d.y1 = p.y;
    if (!d.moved && Math.hypot((d.x1 - d.x0) * scale.value, (d.y1 - d.y0) * scale.value) > 4) d.moved = true;
}
function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    const d = drag.value;
    drag.value = null;
    if (!d?.moved || !sheetName.value) return;
    suppressClick = true;   // the click event that follows a drag must not re-select
    const r = dragRect(d);
    if (tool.value === 'zone') {
        if (r.w >= 2 && r.h >= 2) draftZones.value = [...draftZones.value, { sheet: sheetName.value, box: r }];
        return;
    }
    const hit = sheetItems.value.filter(it =>
        it.box.x < r.x + r.w && it.box.x + it.box.w > r.x && it.box.y < r.y + r.h && it.box.y + it.box.h > r.y);
    selectMany(hit.map(it => it.key), d.add);
}
function onClick(e: MouseEvent, key: Key) {
    if (suppressClick) { suppressClick = false; return; }
    if (tool.value !== 'select') return;
    select(key, e.shiftKey ? 'range' : (e.ctrlKey || e.metaKey) ? 'toggle' : 'replace');
}
function removeDraft(i: number) {
    const mine = sheetDrafts.value[i];
    draftZones.value = draftZones.value.filter(z => z !== mine);
}

// ---- zone flag composer
const REASONS = [
    { id: 'misaligned', label: 'Wrong crop' },
    { id: 'missing_sprite', label: 'Not catalogued' },
    { id: 'should_be_split', label: 'Should be split' },
    { id: 'should_be_merged', label: 'Should be one sprite' },
    { id: 'should_be_animation', label: 'Animation' },
    { id: 'other', label: 'Other' },
];
const reason = ref('misaligned');
const note = ref('');
const sending = ref(false);
async function sendZones() {
    if (!sheetName.value || !sheetDrafts.value.length) return;
    sending.value = true;
    await addZoneFlags(sheetName.value, sheetDrafts.value.map(z => z.box), reason.value, note.value.trim());
    note.value = '';
    sending.value = false;
}
function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t?.closest?.('input, textarea, select')) return;
    if (e.key === 'z' && !e.ctrlKey && !e.metaKey) tool.value = tool.value === 'zone' ? 'select' : 'zone';
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
    window.addEventListener('keydown', onKey);
    reveal();
});
onBeforeUnmount(() => {
    ro?.disconnect();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
});
</script>

<template>
  <div class="sheet-view">
    <div class="bar">
      <select v-if="scope.kind !== 'sheet'" :value="sheetName ?? ''" @change="chosen = ($event.target as HTMLSelectElement).value">
        <option v-for="s in sheetsInView" :key="s" :value="s">{{ s }}</option>
      </select>
      <span v-else class="mono">{{ sheetName }}</span>
      <span v-if="sheet" class="muted">{{ sheet.sheetWidth }}×{{ sheet.sheetHeight }}px · {{ sheetItems.length }} sprites</span>
      <div class="seg" title="Z toggles">
        <button :class="{ on: tool === 'select' }" @click="tool = 'select'">⬚ Select</button>
        <button :class="{ on: tool === 'zone' }" @click="tool = 'zone'">✎ Zone <kbd>Z</kbd></button>
      </div>
      <span class="spacer" />
      <label><input v-model="showNames" type="checkbox" /> Names</label>
      <label><input v-model="showHitboxes" type="checkbox" /> Hitboxes</label>
      <div class="seg">
        <button :class="{ on: zoom === 'fit' }" @click="zoom = 'fit'">Fit</button>
        <button v-for="z in [1, 2, 3, 4]" :key="z" :class="{ on: zoom === z }" @click="zoom = z">{{ z }}×</button>
      </div>
    </div>
    <div class="hint muted" v-if="sheet">
      <template v-if="tool === 'select'">Click a sprite (Shift/Ctrl to add) or drag a box to select every sprite it touches, then flag them in the inspector.</template>
      <template v-else>Drag boxes on the sheet around what is wrong (a badly cropped or missing item). Add as many as you like, then flag them below.</template>
    </div>
    <div ref="wrap" class="wrap">
      <div v-if="!sheet" class="muted empty">No sheet in this view.</div>
      <div
        v-else
        ref="stage"
        class="stage checker"
        :class="{ zoning: tool === 'zone' }"
        :style="{ width: `${sheet.sheetWidth! * scale}px`, height: `${sheet.sheetHeight! * scale}px` }"
        @mousedown="onDown"
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
          @dblclick="tool === 'select' && openFocusMode(it.key)"
        >
          <div v-if="showHitboxes && hitboxStyle(it)" class="hitbox" :style="hitboxStyle(it)!" />
          <span v-if="showNames" class="label mono">{{ it.entry.name }}</span>
        </div>
        <!-- zone flags already sent -->
        <div
          v-for="f in sheetZoneFlags" :key="f.id"
          class="zone sent" :class="ZONE_STATUS[f.status]"
          :style="rectStyle(f.region!)"
          :title="`Zone flag (${f.status.replace('_', ' ')}): ${f.reason}${f.comment ? ' — ' + f.comment : ''}`"
        />
        <!-- zones drawn, not sent yet -->
        <div v-for="(z, i) in sheetDrafts" :key="`d${i}`" class="zone draft" :style="rectStyle(z.box)">
          <span class="num">{{ i + 1 }}</span>
          <button class="x" title="Remove this zone" @mousedown.stop @click.stop="removeDraft(i)">✕</button>
        </div>
        <!-- live drag rectangle -->
        <div v-if="drag?.moved" class="drag" :class="tool" :style="rectStyle(dragRect(drag))" />
      </div>
    </div>
    <div v-if="sheetDrafts.length" class="zone-composer">
      <div class="title">Flag {{ sheetDrafts.length > 1 ? `${sheetDrafts.length} zones` : 'this zone' }} on <span class="mono">{{ sheetName }}</span> for Claude</div>
      <div class="chips">
        <button v-for="r in REASONS" :key="r.id" :class="{ on: reason === r.id }" @click="reason = r.id">{{ r.label }}</button>
      </div>
      <div class="row">
        <textarea v-model="note" rows="2" placeholder="What should Claude do here? e.g. this barrel is cut in half — the zone is the whole item" @keydown.ctrl.enter="sendZones" />
        <div class="col">
          <button class="primary" :disabled="sending" @click="sendZones">Send <kbd>Ctrl ↵</kbd></button>
          <button class="ghost" @click="draftZones = draftZones.filter(z => z.sheet !== sheetName)">Clear zones</button>
        </div>
      </div>
    </div>
    <div class="legend">
      <span><i class="dot review" /> to review</span>
      <span><i class="dot question" /> question</span>
      <span><i class="dot open" /> open for Claude</span>
      <span><i class="dot hitbox" /> hitbox guess</span>
      <span><i class="dash" /> zone flag</span>
      <span class="muted">dimmed = outside the current view</span>
    </div>
  </div>
</template>

<style scoped>
.sheet-view { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 12px; }
.bar label { display: flex; gap: 4px; align-items: center; color: var(--muted); cursor: pointer; }
.hint { font-size: 11px; padding: 4px 12px; border-bottom: 1px solid var(--border); }
.spacer { flex: 1; }
.seg { display: flex; }
.seg button { border-radius: 0; padding: 3px 8px; font-size: 12px; }
.seg button:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.seg button:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
.seg button.on { background: var(--accent-soft); border-color: var(--accent); }
.wrap { flex: 1; overflow: auto; padding: 16px; }
.stage { position: relative; user-select: none; }
.stage.zoning { cursor: crosshair; }
.stage.zoning .box { pointer-events: none; opacity: .55; }
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
.zone { position: absolute; z-index: 3; }
.zone.sent { border: 2px dashed var(--s-open); background: #ffffff08; }
.zone.sent.review { border-color: var(--s-review); }
.zone.sent.question { border-color: var(--s-question); }
.zone.draft { border: 2px solid #ffb020; background: #ffb02022; }
.zone .num { position: absolute; left: 2px; top: 1px; font-size: 10px; font-weight: bold; color: #ffb020; text-shadow: 0 0 2px #000; }
.zone .x { position: absolute; right: -9px; top: -9px; width: 18px; height: 18px; padding: 0; border-radius: 9px; font-size: 10px; line-height: 16px; background: #2a1a00; border-color: #ffb020; color: #ffb020; }
.drag { position: absolute; z-index: 4; pointer-events: none; border: 1px dashed #fff; background: #6aa3ff22; }
.drag.zone { border: 2px solid #ffb020; background: #ffb02022; }
.zone-composer { border-top: 1px solid var(--border); padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.zone-composer .title { font-size: 12px; color: var(--muted); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chips button { font-size: 11px; padding: 3px 8px; border-radius: 12px; }
.chips button.on { background: var(--accent-soft); border-color: var(--accent); }
.row { display: flex; gap: 8px; }
.row textarea { flex: 1; }
.col { display: flex; flex-direction: column; gap: 4px; }
.legend { display: flex; gap: 14px; padding: 6px 12px; border-top: 1px solid var(--border); font-size: 11px; }
.legend i { margin-right: 4px; }
.legend .dash { display: inline-block; width: 12px; height: 8px; border: 2px dashed var(--s-open); vertical-align: middle; }
.empty { padding: 40px; }
</style>
