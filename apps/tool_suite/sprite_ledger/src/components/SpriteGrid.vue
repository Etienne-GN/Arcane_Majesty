<script setup lang="ts">
import { computed } from 'vue';
import type { Sheet, SpriteEntry } from '../services/api';
import { imageUrl } from '../services/api';

const props = defineProps<{
    sheets: Sheet[];
    visibleKeys: Set<string>; // `${sheetPngFilename}::${entryName}` — which sprites survive current filters
    flaggedKeys: Set<string>;
    needsReviewKeys: Set<string>;
    licenseOkKeys: Set<string>;
    licenseFlaggedKeys: Set<string>;
    sortOrder: 'name' | 'sheet';
}>();

const emit = defineEmits<{ select: [sheetPngFilename: string, entryName: string] }>();

// Only sprites that pass the current filters get a DOM cell + canvas at
// all — visibleKeys used to just toggle `v-show` while every one of the
// (10,000+, once LPC's in the mix) sprites across every sheet stayed
// mounted and drew its crop regardless. That made every view exactly as
// heavy as the whole ledger, all the time, no matter how narrow the
// filter actually was. Filtering the source array instead means "All"
// with a narrow search, or any single collection, only ever mounts what
// it shows.
const visibleCells = computed(() => {
    const cells: { sheet: Sheet; entry: SpriteEntry; key: string }[] = [];
    for (const sheet of props.sheets) {
        for (const entry of sheet.entries) {
            const key = `${sheet.sheetPngFilename}::${entry.name}`;
            if (props.visibleKeys.has(key)) cells.push({ sheet, entry, key });
        }
    }
    // 'sheet' order (the loop above) is spatial — the order pieces sit in
    // the source PNG, useful when position on the sheet matters. 'name'
    // groups same-family sprites together (grass_fill_a next to
    // grass_fill_b) regardless of where they happen to live on the sheet,
    // which is the point when reviewing a whole collection at once.
    if (props.sortOrder === 'name') {
        cells.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
    }
    return cells;
});

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

/** The box a thumbnail should show.
 *
 * The grid stays still on purpose. Thousands of cells repainting on a timer
 * is a lot of work to show something nobody asked to watch — the ▶ badge says
 * there's motion here, and the detail panel plays it on demand.
 */
function thumbBox(sheet: Sheet, entry: SpriteEntry) {
    // An animated entry's own box is the whole strip, which reads as a smear
    // of every frame at once — frame 1 is the honest thumbnail.
    if (entry.frames?.length) return entry.frames[0];
    return cropBox(sheet, entry);
}

function drawCrop(canvas: HTMLCanvasElement | null, sheet: Sheet, entry: SpriteEntry) {
    if (!canvas) return;                       // element unmounted
    const img = imageFor(sheet.sheetPngFilename);
    const box = thumbBox(sheet, entry);
    // Integer-upscale small sprites so they're actually visible (a 17x9
    // sprite drawn at native size is nearly imperceptible in an 84px cell),
    // clamped so large sprites still cap at ~64px instead of overflowing.
    const scale = Math.max(1, Math.floor(64 / Math.max(box.w, box.h)));

    const draw = () => {
        canvas.width = box.w * scale;
        canvas.height = box.h * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w * scale, box.h * scale);
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
    <div
      v-for="{ sheet, entry, key } in visibleCells"
      :key="key"
      class="cell"
      @click="emit('select', sheet.sheetPngFilename, entry.name)"
    >
      <span v-if="flaggedKeys.has(key)" class="flag-dot" title="Open flag" />
      <span v-if="needsReviewKeys.has(key)" class="review-badge" title="Tentatively fixed — needs your review">🔍</span>
      <span v-if="licenseOkKeys.has(key)" class="license-badge ok">✓</span>
      <span v-if="licenseFlaggedKeys.has(key)" class="license-badge unlicensed">⚠</span>
      <canvas :ref="(el) => drawCrop(el as HTMLCanvasElement, sheet, entry)" class="pixelated" />
      <div class="name">
        <span v-if="(entry.frames?.length ?? 0) > 1" class="anim-badge" :title="`animated — ${entry.frames!.length} frames`">▶</span>{{ entry.name }}
      </div>
    </div>
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
/* A legible badge rather than a second coloured dot: "needs your review" is
   a call to action, and two 8px dots differing only in hue read as noise. */
.review-badge {
    position: absolute; top: -2px; right: 18px; z-index: 1;
    font-size: 10px; line-height: 1;
    background: #123a52; border: 1px solid #39c; border-radius: 3px;
    padding: 1px 2px;
}
.license-badge { position: absolute; top: -2px; left: 4px; font-size: 12px; line-height: 1; }
.license-badge.ok { color: #3c3; }
.license-badge.unlicensed { color: #e91; }
/* Animating every cell of a 1700-sprite grid would burn the frame budget for
   no gain — the badge says "there's motion here", the detail panel plays it. */
.anim-badge { color: #b8f; margin-right: 3px; }
</style>
