<script setup lang="ts">
import { ref, watchEffect } from 'vue';
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

// One offscreen <img> per sheet, loaded once, reused for every crop.
const sheetImages = ref<Record<string, HTMLImageElement>>({});

watchEffect(() => {
    for (const sheet of props.sheets) {
        if (sheetImages.value[sheet.sheetPngFilename]) continue;
        const img = new Image();
        img.src = imageUrl(sheet.sheetPngFilename);
        sheetImages.value[sheet.sheetPngFilename] = img;
    }
});

function cropBox(sheet: Sheet, entry: SpriteEntry): { x: number; y: number; w: number; h: number } {
    // An animated entry's own box is the whole strip, which reads as a smear
    // of every frame at once. Show frame 1 as the thumbnail instead.
    if (entry.frames?.length) return entry.frames[0];
    if (entry.kind === 'object') {
        return { x: entry.x!, y: entry.y!, w: entry.w!, h: entry.h! };
    }
    const tw = sheet.gridTileWidth!, th = sheet.gridTileHeight!;
    return { x: entry.col! * tw, y: entry.row! * th, w: tw, h: th };
}

function drawCrop(canvas: HTMLCanvasElement | null, sheet: Sheet, entry: SpriteEntry) {
    if (!canvas) return;
    const img = sheetImages.value[sheet.sheetPngFilename];
    if (!img) return;
    const box = cropBox(sheet, entry);
    // Integer-upscale small sprites so they're actually visible (a 17x9
    // sprite drawn at native size is nearly imperceptible in an 84px
    // cell) — same technique SpriteDetail.vue uses for its 4x preview,
    // just clamped so large sprites still cap at ~64px instead of
    // overflowing the cell.
    const scale = Math.max(1, Math.floor(64 / Math.max(box.w, box.h)));
    canvas.width = box.w * scale;
    canvas.height = box.h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const draw = () => ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w * scale, box.h * scale);
    // `img` is shared across every cell on the same sheet (see
    // sheetImages above) — assigning to `img.onload` here would let each
    // cell's callback silently clobber the previous cell's, leaving only
    // the last-drawn cell per sheet actually rendered on cold load.
    // addEventListener lets every cell's draw survive.
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
.cell canvas.pixelated { image-rendering: pixelated; max-width: 64px; max-height: 64px; background: #1a1a1a; }
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
