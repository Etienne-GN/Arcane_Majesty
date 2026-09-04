<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { Sheet, SpriteEntry } from '../services/api';
import { imageUrl } from '../services/api';

const props = defineProps<{
    sheets: Sheet[];
    visibleKeys: Set<string>; // `${sheetPngFilename}::${entryName}` — which sprites survive current filters
    flaggedKeys: Set<string>;
    needsReviewKeys: Set<string>;
    licenseOkKeys: Set<string>;
    licenseFlaggedKeys: Set<string>;
}>();

const emit = defineEmits<{ select: [sheetPngFilename: string, entryName: string] }>();

const DEFAULT_FRAME_MS = 120;

// One offscreen <img> per sheet, loaded once, reused for every crop.
// A plain Map, not a ref: nothing in the template reads it, and resolving an
// image from inside a :ref callback would otherwise write to reactive state
// mid-render. Lazily created, because a prefetch pass that ran *after* the
// first render left every cell whose ref fired first permanently blank — the
// ref callback doesn't fire again, so an early return there is forever.
const sheetImages = new Map<string, HTMLImageElement>();

function imageFor(sheetPngFilename: string): HTMLImageElement {
    let img = sheetImages.get(sheetPngFilename);
    if (!img) {
        img = new Image();
        img.src = imageUrl(sheetPngFilename);
        sheetImages.set(sheetPngFilename, img);
    }
    return img;
}

function cropBox(sheet: Sheet, entry: SpriteEntry): { x: number; y: number; w: number; h: number } {
    if (entry.kind === 'object') {
        return { x: entry.x!, y: entry.y!, w: entry.w!, h: entry.h! };
    }
    const tw = sheet.gridTileWidth!, th = sheet.gridTileHeight!;
    return { x: entry.col! * tw, y: entry.row! * th, w: tw, h: th };
}

/** The box a still thumbnail should show. */
function stillBox(sheet: Sheet, entry: SpriteEntry) {
    // An animated entry's own box is the whole strip, which reads as a smear
    // of every frame at once — frame 1 is the honest thumbnail.
    if (entry.frames?.length) return entry.frames[0];
    return cropBox(sheet, entry);
}

function paint(canvas: HTMLCanvasElement, img: HTMLImageElement,
               box: { x: number; y: number; w: number; h: number }) {
    // Integer-upscale small sprites so they're actually visible (a 17x9
    // sprite drawn at native size is nearly imperceptible in an 84px cell),
    // clamped so large sprites still cap at ~64px instead of overflowing.
    const scale = Math.max(1, Math.floor(64 / Math.max(box.w, box.h)));
    if (canvas.width !== box.w * scale || canvas.height !== box.h * scale) {
        canvas.width = box.w * scale;
        canvas.height = box.h * scale;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w * scale, box.h * scale);
}

// --- animated cells ------------------------------------------------------
// Only entries with `frames` are registered here — a few dozen out of several
// thousand sprites — so one shared ticker repaints them all without the grid
// having thousands of live timers in it.
interface AnimCell {
    canvas: HTMLCanvasElement;
    sheet: Sheet;
    entry: SpriteEntry;
    frame: number;
    nextDue: number;
}
const animCells = new Map<HTMLCanvasElement, AnimCell>();
let ticker: number | null = null;

function tick() {
    const now = performance.now();
    for (const cell of animCells.values()) {
        // Vue hands drawCrop a null ref on unmount, which can't say *which*
        // canvas went away — so retired elements are reaped here instead.
        // Without this the map grows every time the grid re-renders.
        if (!cell.canvas.isConnected) {
            animCells.delete(cell.canvas);
            continue;
        }
        // A cell hidden by the current filters (v-show) has no layout box.
        // Repainting it burns the frame budget to change nothing.
        if (cell.canvas.offsetParent === null) continue;
        if (now < cell.nextDue) continue;
        const img = imageFor(cell.sheet.sheetPngFilename);
        if (!img.complete) continue;
        const frames = cell.entry.frames!;
        cell.frame = (cell.frame + 1) % frames.length;
        cell.nextDue = now + (cell.entry.frameDurationMs ?? DEFAULT_FRAME_MS);
        paint(cell.canvas, img, frames[cell.frame]);
    }
    if (!animCells.size) stopTicker();
}

function startTicker() {
    // A single 50ms interval is coarse enough to be cheap and fine enough to
    // serve the shortest frame durations in the catalogue; each cell advances
    // on its own schedule against `nextDue`, so sprites with different frame
    // rates stay independent.
    if (ticker === null) ticker = window.setInterval(tick, 50);
}
function stopTicker() {
    if (ticker !== null) { clearInterval(ticker); ticker = null; }
}
onBeforeUnmount(stopTicker);

function drawCrop(canvas: HTMLCanvasElement | null, sheet: Sheet, entry: SpriteEntry) {
    if (!canvas) return;                       // element unmounted
    const img = imageFor(sheet.sheetPngFilename);
    const animated = (entry.frames?.length ?? 0) > 1;

    const draw = () => {
        paint(canvas, img, stillBox(sheet, entry));
        if (animated && !animCells.has(canvas)) {
            animCells.set(canvas, {
                canvas, sheet, entry, frame: 0,
                nextDue: performance.now() + (entry.frameDurationMs ?? DEFAULT_FRAME_MS),
            });
            startTicker();
        }
    };
    // `img` is shared across every cell on the same sheet (see sheetImages
    // above) — assigning to `img.onload` here would let each cell's callback
    // silently clobber the previous cell's, leaving only the last-drawn cell
    // per sheet actually rendered on cold load. addEventListener lets every
    // cell's draw survive.
    if (img.complete) draw(); else img.addEventListener('load', draw, { once: true });
}
</script>

<template>
  <div class="grid">
    <template v-for="sheet in sheets" :key="sheet.sheetPngFilename">
      <div
        v-for="entry in sheet.entries"
        :key="`${sheet.sheetPngFilename}::${entry.name}`"
        v-show="visibleKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)"
        class="cell"
        @click="emit('select', sheet.sheetPngFilename, entry.name)"
      >
        <span v-if="flaggedKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="flag-dot" title="Open flag" />
        <span v-if="needsReviewKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="review-dot" title="Tentatively fixed — needs your review" />
        <span v-if="licenseOkKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="license-badge ok">✓</span>
        <span v-if="licenseFlaggedKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="license-badge unlicensed">⚠</span>
        <canvas :ref="(el) => drawCrop(el as HTMLCanvasElement, sheet, entry)" class="pixelated" />
        <div class="name">
          <span v-if="(entry.frames?.length ?? 0) > 1" class="anim-badge" :title="`animated — ${entry.frames!.length} frames`">▶</span>{{ entry.name }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; align-content: flex-start; flex: 1; overflow-y: auto; }
.cell { position: relative; width: 84px; text-align: center; cursor: pointer; }
/* Checkerboard, not a flat dark fill: a lot of these sprites are dark VFX
   (smoke, shadow, night-palette effects) and vanish against #1a1a1a. The
   same ground the contact-sheet tooling uses, so a sprite reads the same in
   both places. */
.cell canvas.pixelated {
    image-rendering: pixelated;
    max-width: 64px; max-height: 64px;
    background-color: #3a3a42;
    background-image:
        linear-gradient(45deg, #30303a 25%, transparent 25%, transparent 75%, #30303a 75%),
        linear-gradient(45deg, #30303a 25%, transparent 25%, transparent 75%, #30303a 75%);
    background-size: 12px 12px;
    background-position: 0 0, 6px 6px;
}
.name { font-size: 10px; word-break: break-word; color: #aaa; }
.flag-dot { position: absolute; top: 0; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #e33; }
.review-dot { position: absolute; top: 0; right: 20px; width: 8px; height: 8px; border-radius: 50%; background: #39c; }
.license-badge { position: absolute; top: -2px; left: 4px; font-size: 12px; line-height: 1; }
.license-badge.ok { color: #3c3; }
.license-badge.unlicensed { color: #e91; }
/* Animating every cell of a 1700-sprite grid would burn the frame budget for
   no gain — the badge says "there's motion here", the detail panel plays it. */
.anim-badge { color: #b8f; margin-right: 3px; }
</style>
