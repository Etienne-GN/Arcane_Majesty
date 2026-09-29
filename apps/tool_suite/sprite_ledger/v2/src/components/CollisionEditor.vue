<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { HitBox, Layer } from '@shared/api';
import { imageUrl } from '@shared/api';
import { fullBox, baseBox, LAYER_LABELS } from '@shared/physics';
import type { Item } from '../store';
import { physicsOf, savePhysics } from '../store';

// Draw the collision box on the sprite and pick its layer. Saving stores both
// and marks them approved (with Undo). "Approve" with no edit keeps Claude's
// guess as is.
const props = withDefaults(defineProps<{ item: Item; maxPx?: number }>(), { maxPx: 240 });

const frames = computed(() => ((props.item.entry.frames?.length ?? 0) > 1 ? props.item.entry.frames! : null));
const size = computed(() => frames.value
    ? { w: Math.max(...frames.value.map(f => f.w)), h: Math.max(...frames.value.map(f => f.h)) }
    : { w: props.item.box.w, h: props.item.box.h });
const scale = computed(() => Math.max(1, Math.floor(Math.min(props.maxPx / size.value.w, props.maxPx / size.value.h))));
const review = computed(() => physicsOf(props.item.key));

const draftBox = ref<HitBox | null | undefined>(undefined);
const draftLayer = ref<Layer | undefined>(undefined);
function reset() {
    const e = props.item.entry;
    draftBox.value = e.hitbox === undefined ? undefined : (e.hitbox ? { ...e.hitbox } : null);
    draftLayer.value = e.layer;
}
const same = (a: HitBox | null | undefined, b: HitBox | null | undefined) => JSON.stringify(a ?? String(a)) === JSON.stringify(b ?? String(b));
const dirty = computed(() => !same(draftBox.value, props.item.entry.hitbox) || draftLayer.value !== props.item.entry.layer);
const complete = computed(() => draftBox.value !== undefined && draftLayer.value !== undefined);

const canvas = ref<HTMLCanvasElement | null>(null);
let img: HTMLImageElement | null = null;
const drag = ref<HitBox | null>(null);
let dragStart: { x: number; y: number } | null = null;

function paint() {
    const c = canvas.value;
    if (!c || !img?.complete) return;
    const s = scale.value, { w, h } = size.value;
    c.width = w * s; c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    const b = frames.value ? frames.value[0] : props.item.box;
    g.drawImage(img, b.x, b.y, b.w, b.h, Math.floor((w - b.w) / 2) * s, (h - b.h) * s, b.w * s, b.h * s);
    const box = drag.value ?? draftBox.value;
    if (box) {
        g.fillStyle = 'rgba(255, 64, 64, 0.35)';
        g.fillRect(box.x * s, box.y * s, box.w * s, box.h * s);
        g.strokeStyle = '#ff4040'; g.lineWidth = 2;
        g.strokeRect(box.x * s + 1, box.y * s + 1, box.w * s - 2, box.h * s - 2);
    }
}
function load() {
    reset();
    img = new Image();
    img.src = imageUrl(props.item.sheet.sheetPngFilename);
    if (img.complete) paint(); else img.addEventListener('load', paint, { once: true });
}
watch(() => props.item.key, load);
watch(() => [props.item.entry.hitbox, props.item.entry.layer], reset, { deep: true });
watch([draftBox, scale], () => nextTick(paint), { deep: true });
onMounted(load);

function px(e: MouseEvent) {
    const r = canvas.value!.getBoundingClientRect();
    const s = scale.value * (r.width / canvas.value!.width);
    return {
        x: Math.min(size.value.w, Math.max(0, Math.round((e.clientX - r.left) / s))),
        y: Math.min(size.value.h, Math.max(0, Math.round((e.clientY - r.top) / s))),
    };
}
function onDown(e: MouseEvent) { dragStart = px(e); drag.value = null; }
function onMove(e: MouseEvent) {
    if (!dragStart) return;
    const p = px(e), a = dragStart;
    drag.value = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
    paint();
}
function onUp() {
    if (drag.value && drag.value.w > 0 && drag.value.h > 0) draftBox.value = drag.value;
    dragStart = null; drag.value = null;
    paint();
}

/** Save the drawn values, or approve what is there. */
async function save() {
    if (!complete.value) return;
    if (!dirty.value) {
        await savePhysics([{ key: props.item.key }], 'Hitbox approved');
    } else {
        await savePhysics([{ key: props.item.key, hitbox: draftBox.value, layer: draftLayer.value }], 'Hitbox saved');
    }
}
defineExpose({ save, complete, dirty });

const boxLabel = computed(() => {
    const b = draftBox.value;
    if (b === undefined) return 'not set';
    if (b === null) return 'none (walk through)';
    return `${b.x},${b.y} · ${b.w}×${b.h}px`;
});
</script>

<template>
  <div class="collision">
    <div class="state">
      <span v-if="dirty" class="edited">✎ Edited, not saved</span>
      <span v-else-if="review === 'approved'" class="approved">✓ Approved</span>
      <span v-else-if="review === 'proposed'" class="proposed">● Claude's guess, check it</span>
      <span v-else class="muted">Not set yet</span>
    </div>
    <canvas
      ref="canvas" class="pixelated checker" title="Drag to draw the collision box"
      @mousedown.prevent="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp"
    />
    <div class="muted small">Hitbox: {{ boxLabel }} · sprite {{ size.w }}×{{ size.h }}px · drag to draw</div>
    <div class="row">
      <button :class="{ on: draftBox === null }" @click="draftBox = null">No hitbox</button>
      <button @click="draftBox = fullBox(size)">Full</button>
      <button @click="draftBox = baseBox(size)">Base</button>
      <button class="ghost" :disabled="!dirty" @click="reset">Undo edit</button>
    </div>
    <div class="row">
      <button
        v-for="(l, key) in LAYER_LABELS" :key="key" :class="{ on: draftLayer === key }" :title="l.hint"
        @click="draftLayer = key"
      >{{ l.icon }} {{ l.label }}</button>
    </div>
    <div v-if="draftLayer" class="muted small">{{ LAYER_LABELS[draftLayer].hint }}</div>
    <button class="primary save" :disabled="!complete || (!dirty && review === 'approved')" @click="save">
      ✓ {{ dirty ? 'Save hitbox & layer' : 'Approve as is' }} <kbd>A</kbd>
    </button>
  </div>
</template>

<style scoped>
.collision { display: flex; flex-direction: column; gap: 8px; }
canvas { align-self: flex-start; cursor: crosshair; border-radius: var(--radius); }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.row button { font-size: 12px; padding: 4px 8px; }
.row button.on { background: var(--accent-soft); border-color: var(--accent); }
.small { font-size: 11px; }
.state { font-size: 12px; }
.approved { color: var(--s-approved); } .proposed { color: var(--s-hitbox); } .edited { color: var(--accent); }
.save { padding: 8px; }
</style>
