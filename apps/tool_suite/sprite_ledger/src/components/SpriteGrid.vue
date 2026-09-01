<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Sheet, SpriteEntry } from '../services/api';
import { imageUrl } from '../services/api';

const props = defineProps<{
    sheets: Sheet[];
    visibleKeys: Set<string>; // `${sheetPngFilename}::${entryName}` — which sprites survive current filters
    flaggedKeys: Set<string>;
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
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    if (img.complete) draw(); else img.onload = draw;
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
        <span v-if="flaggedKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="flag-dot" />
        <canvas :ref="(el) => drawCrop(el as HTMLCanvasElement, sheet, entry)" class="pixelated" />
        <div class="name">{{ entry.name }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; align-content: flex-start; }
.cell { position: relative; width: 84px; text-align: center; cursor: pointer; }
.cell canvas.pixelated { image-rendering: pixelated; max-width: 64px; max-height: 64px; background: #1a1a1a; }
.name { font-size: 10px; word-break: break-word; color: #aaa; }
.flag-dot { position: absolute; top: 0; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #e33; }
</style>
