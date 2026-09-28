<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { Sheet, SpriteEntry, HitBox, Layer, PhysicsReview } from '../services/api';
import { imageUrl, savePhysics } from '../services/api';
import { spriteSize, stillBox, fullBox, baseBox, LAYER_LABELS } from '../services/physics';

// Set (and review) one sprite's collision box and draw layer. Drag on the
// preview to draw the box; the presets cover the common shapes. Saving marks
// it approved — whatever a human saved here is by definition reviewed.
const props = withDefaults(defineProps<{
    sheet: Sheet;
    entry: SpriteEntry;
    review: PhysicsReview | null;
    maxPx?: number;
}>(), { maxPx: 256 });
const emit = defineEmits<{ saved: [] }>();

const size = computed(() => spriteSize(props.sheet, props.entry));
const scale = computed(() => Math.max(1, Math.floor(Math.min(props.maxPx / size.value.w, props.maxPx / size.value.h))));

// undefined = not decided yet, null = no hitbox.
const draftBox = ref<HitBox | null | undefined>(undefined);
const draftLayer = ref<Layer | undefined>(undefined);
function resetDraft() {
    draftBox.value = props.entry.hitbox === undefined ? undefined : (props.entry.hitbox ? { ...props.entry.hitbox } : null);
    draftLayer.value = props.entry.layer;
}
const dirty = computed(() =>
    JSON.stringify(draftBox.value ?? (draftBox.value === null ? null : 'unset')) !==
        JSON.stringify(props.entry.hitbox ?? (props.entry.hitbox === null ? null : 'unset')) ||
    draftLayer.value !== props.entry.layer);
const complete = computed(() => draftBox.value !== undefined && draftLayer.value !== undefined);

// --- drawing ---
const canvas = ref<HTMLCanvasElement | null>(null);
let img: HTMLImageElement | null = null;

function paint() {
    const c = canvas.value;
    if (!c || !img || !img.complete) return;
    const s = scale.value, { w, h } = size.value;
    c.width = w * s; c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    const b = stillBox(props.sheet, props.entry);
    // bottom-centred in the sprite box, like the game draws it
    g.drawImage(img, b.x, b.y, b.w, b.h, Math.floor((w - b.w) / 2) * s, (h - b.h) * s, b.w * s, b.h * s);
    const box = dragBox.value ?? draftBox.value;
    if (box) {
        g.fillStyle = 'rgba(255, 60, 60, 0.35)';
        g.fillRect(box.x * s, box.y * s, box.w * s, box.h * s);
        g.strokeStyle = '#ff4040';
        g.lineWidth = 2;
        g.strokeRect(box.x * s + 1, box.y * s + 1, box.w * s - 2, box.h * s - 2);
    }
}

function load() {
    img = new Image();
    img.src = imageUrl(props.sheet.sheetPngFilename);
    if (img.complete) paint();
    else img.addEventListener('load', paint, { once: true });
}

watch(() => [props.sheet.sheetPngFilename, props.entry.name], () => { resetDraft(); load(); });
watch([draftBox, scale], () => nextTick(paint), { deep: true });
onMounted(() => { resetDraft(); load(); });

// --- drag to draw ---
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragBox = ref<HitBox | null>(null);
function px(e: MouseEvent) {
    const r = canvas.value!.getBoundingClientRect();
    const s = scale.value * (r.width / canvas.value!.width) || 1;
    return {
        x: Math.min(size.value.w, Math.max(0, Math.round((e.clientX - r.left) / s))),
        y: Math.min(size.value.h, Math.max(0, Math.round((e.clientY - r.top) / s))),
    };
}
function onDown(e: MouseEvent) { dragStart.value = px(e); dragBox.value = null; }
function onMove(e: MouseEvent) {
    if (!dragStart.value) return;
    const p = px(e), a = dragStart.value;
    dragBox.value = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
    paint();
}
function onUp() {
    if (dragBox.value && dragBox.value.w > 0 && dragBox.value.h > 0) draftBox.value = dragBox.value;
    dragStart.value = null; dragBox.value = null;
    paint();
}

// --- save ---
const busy = ref(false);
const errorMessage = ref<string | null>(null);
async function save() {
    if (!complete.value) return;
    busy.value = true;
    try {
        await savePhysics(props.sheet.sheetPngFilename, props.entry.name, { hitbox: draftBox.value, layer: draftLayer.value, review: 'approved' });
        errorMessage.value = null;
        emit('saved');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    } finally {
        busy.value = false;
    }
}
defineExpose({ save, complete, dirty });

const boxLabel = computed(() => {
    const b = draftBox.value;
    if (b === undefined) return 'not set';
    if (b === null) return 'none — walk through it';
    return `${b.x},${b.y} · ${b.w}×${b.h}px`;
});
</script>

<template>
  <div class="hitbox-editor">
    <div class="state">
      <span v-if="review === 'approved' && !dirty" class="approved">✓ approved</span>
      <span v-else-if="review === 'proposed' && !dirty" class="proposed">🤖 Claude's guess — check it</span>
      <span v-else-if="dirty" class="edited">✎ edited, not saved</span>
      <span v-else class="unset">not set yet</span>
    </div>
    <canvas
      ref="canvas"
      title="Drag to draw the collision box"
      @mousedown.prevent="onDown"
      @mousemove="onMove"
      @mouseup="onUp"
      @mouseleave="onUp"
    />
    <div class="caption">Hitbox: {{ boxLabel }} · sprite {{ size.w }}×{{ size.h }}px · drag to draw</div>
    <div class="presets">
      <button :class="{ on: draftBox === null }" @click="draftBox = null">🚫 No hitbox</button>
      <button @click="draftBox = fullBox(size)">▣ Full</button>
      <button @click="draftBox = baseBox(size)">▁ Base</button>
      <button :disabled="!dirty" @click="resetDraft">↺ Undo changes</button>
    </div>
    <div class="layers">
      <button
        v-for="(l, key) in LAYER_LABELS"
        :key="key"
        :class="{ on: draftLayer === key }"
        :title="l.hint"
        @click="draftLayer = key"
      >{{ l.icon }} {{ l.label }}</button>
    </div>
    <div v-if="draftLayer" class="hint">{{ LAYER_LABELS[draftLayer].hint }}</div>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <slot name="actions" :save="save" :complete="complete" :busy="busy" :dirty="dirty">
      <button class="save" :disabled="busy || !complete || (!dirty && review === 'approved')" @click="save">
        ✓ {{ dirty ? 'Save' : 'Approve' }} hitbox &amp; layer
      </button>
    </slot>
  </div>
</template>

<style scoped>
.hitbox-editor { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
canvas {
    image-rendering: pixelated; cursor: crosshair; align-self: flex-start; border: 1px solid #333;
    background-color: #2a2a2a;
    background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
.caption, .hint { color: #888; font-size: 11px; }
.presets, .layers { display: flex; gap: 4px; flex-wrap: wrap; }
button { font-family: inherit; font-size: 12px; cursor: pointer; background: #222; color: #eee; border: 1px solid #555; border-radius: 4px; padding: 3px 8px; }
button:disabled { opacity: 0.4; cursor: default; }
button.on { background: #3a3a5a; border-color: #99c; }
.save { background: #1d3a24; border-color: #3a7; padding: 6px 10px; }
.state .approved { color: #6c6; } .state .proposed { color: #fc6; } .state .edited { color: #9cf; } .state .unset { color: #888; }
.error { color: #f99; }
</style>
