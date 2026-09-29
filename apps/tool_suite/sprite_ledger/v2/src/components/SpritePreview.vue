<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { imageUrl } from '@shared/api';
import type { Item } from '../store';

// Big preview of one sprite. Animations play (bottom-centred in their largest
// frame, like the game draws them) with play/pause and frame stepping.
const props = withDefaults(defineProps<{ item: Item; maxPx?: number; controls?: boolean }>(), { maxPx: 256, controls: true });

const canvas = ref<HTMLCanvasElement | null>(null);
const frames = computed(() => ((props.item.entry.frames?.length ?? 0) > 1 ? props.item.entry.frames! : null));
const size = computed(() => frames.value
    ? { w: Math.max(...frames.value.map(f => f.w)), h: Math.max(...frames.value.map(f => f.h)) }
    : { w: props.item.box.w, h: props.item.box.h });
const scale = computed(() => {
    const fit = props.maxPx / Math.max(size.value.w, size.value.h);
    return fit >= 1 ? Math.floor(fit) : fit;
});
const frameIdx = ref(0);
const playing = ref(true);
let img: HTMLImageElement | null = null;
let timer: number | null = null;

function paint() {
    const c = canvas.value;
    if (!c || !img?.complete) return;
    const s = scale.value, { w, h } = size.value;
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    const b = frames.value ? frames.value[frameIdx.value] : props.item.box;
    g.drawImage(img, b.x, b.y, b.w, b.h, Math.floor((w - b.w) / 2) * s, (h - b.h) * s, b.w * s, b.h * s);
}
function stop() { if (timer !== null) { clearInterval(timer); timer = null; } }
function start() {
    stop();
    if (frames.value && playing.value) {
        timer = window.setInterval(() => { frameIdx.value = (frameIdx.value + 1) % frames.value!.length; paint(); },
            props.item.entry.frameDurationMs ?? 120);
    }
}
function load() {
    frameIdx.value = 0;
    img = new Image();
    img.src = imageUrl(props.item.sheet.sheetPngFilename);
    const ready = () => { paint(); start(); };
    if (img.complete) ready(); else img.addEventListener('load', ready, { once: true });
}
function togglePlay() { playing.value = !playing.value; start(); }
function step(d: number) {
    if (!frames.value) return;
    playing.value = false; stop();
    frameIdx.value = (frameIdx.value + d + frames.value.length) % frames.value.length;
    paint();
}
defineExpose({ togglePlay, step });

watch(() => props.item.key, load);
watch(scale, paint);
onMounted(load);
onBeforeUnmount(stop);
</script>

<template>
  <div class="preview">
    <div class="stage checker"><canvas ref="canvas" class="pixelated" /></div>
    <div v-if="frames && controls" class="anim">
      <button class="ghost" title="Previous frame" @click="step(-1)">‹</button>
      <button class="ghost" :title="playing ? 'Pause (Space)' : 'Play (Space)'" @click="togglePlay">{{ playing ? '❚❚' : '▶' }}</button>
      <button class="ghost" title="Next frame" @click="step(1)">›</button>
      <span class="muted">frame {{ frameIdx + 1 }}/{{ frames.length }} · {{ item.entry.frameDurationMs ?? 120 }}ms</span>
    </div>
  </div>
</template>

<style scoped>
.preview { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.stage { display: flex; align-items: center; justify-content: center; border-radius: var(--radius); padding: 10px; min-width: 96px; min-height: 96px; }
.anim { display: flex; align-items: center; gap: 4px; font-size: 11px; }
.anim button { padding: 2px 8px; }
</style>
