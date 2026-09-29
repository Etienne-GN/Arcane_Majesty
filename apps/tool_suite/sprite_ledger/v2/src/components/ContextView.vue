<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { imageUrl } from '@shared/api';
import type { Item } from '../store';

// The sprite in its sheet, outlined, at a chosen zoom level: close, wide,
// wider or the whole sheet.
const props = withDefaults(defineProps<{ item: Item; maxPx?: number }>(), { maxPx: 360 });
const LEVELS: { pad: number | null; label: string }[] = [
    { pad: 0.75, label: 'close' }, { pad: 2, label: 'wide' }, { pad: 5, label: 'wider' }, { pad: null, label: 'whole sheet' },
];
const level = ref(0);
const canvas = ref<HTMLCanvasElement | null>(null);
const caption = ref('');
let img: HTMLImageElement | null = null;

function paint() {
    const c = canvas.value;
    if (!c || !img?.complete) return;
    const box = props.item.box;
    const W = img.naturalWidth, H = img.naturalHeight;
    const lv = LEVELS[level.value];
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    if (lv.pad !== null) {
        const px = Math.max(16, box.w * lv.pad), py = Math.max(16, box.h * lv.pad);
        x0 = Math.max(0, Math.floor(box.x - px)); y0 = Math.max(0, Math.floor(box.y - py));
        x1 = Math.min(W, Math.ceil(box.x + box.w + px)); y1 = Math.min(H, Math.ceil(box.y + box.h + py));
    }
    const w = x1 - x0, h = y1 - y0;
    const fit = props.maxPx / Math.max(w, h);
    const s = fit >= 2 ? Math.floor(fit) : fit;
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, x0, y0, w, h, 0, 0, c.width, c.height);
    g.strokeStyle = '#ff3fd5'; g.lineWidth = 2;
    const bw = Math.max(6, box.w * s), bh = Math.max(6, box.h * s);
    g.strokeRect((box.x - x0) * s - (bw - box.w * s) / 2 + 1, (box.y - y0) * s - (bh - box.h * s) / 2 + 1, bw - 2, bh - 2);
    caption.value = `${lv.label} · ${w}×${h}px`;
}
function load() {
    img = new Image();
    img.src = imageUrl(props.item.sheet.sheetPngFilename);
    if (img.complete) paint(); else img.addEventListener('load', paint, { once: true });
}
const canOut = computed(() => level.value < LEVELS.length - 1);
function zoom(d: number) { level.value = Math.max(0, Math.min(LEVELS.length - 1, level.value + d)); }
defineExpose({ zoom });
watch(() => props.item.key, load);
watch(level, paint);
onMounted(load);
</script>

<template>
  <div class="context">
    <canvas ref="canvas" class="pixelated checker" />
    <div class="bar">
      <button class="ghost" :disabled="!canOut" title="Zoom out (−)" @click="zoom(1)">−</button>
      <button class="ghost" :disabled="level === 0" title="Zoom in (+)" @click="zoom(-1)">+</button>
      <span class="muted">In the sheet · {{ caption }}</span>
    </div>
  </div>
</template>

<style scoped>
.context { display: flex; flex-direction: column; gap: 4px; }
canvas { display: block; border-radius: var(--radius); max-width: 100%; }
.bar { display: flex; align-items: center; gap: 4px; font-size: 11px; }
.bar button { padding: 0 8px; font-size: 14px; }
</style>
