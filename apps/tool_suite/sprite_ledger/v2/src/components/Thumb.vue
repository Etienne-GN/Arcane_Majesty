<script setup lang="ts">
import { computed } from 'vue';
import { imageUrl } from '@shared/api';
import type { Item } from '../store';
import { thumbBoxOf } from '../store';

// A sprite thumbnail as a CSS crop of its sheet: one cached image per sheet
// for any number of thumbnails, no canvas per cell.
const props = withDefaults(defineProps<{ item: Item; size: number; box?: { x: number; y: number; w: number; h: number } }>(), {});

const style = computed(() => {
    const b = props.box ?? thumbBoxOf(props.item);
    const sheet = props.item.sheet;
    // integer upscale for crisp pixels, never beyond the cell
    const fit = props.size / Math.max(b.w, b.h);
    const s = fit >= 1 ? Math.floor(fit) : fit;
    return {
        width: `${Math.round(b.w * s)}px`,
        height: `${Math.round(b.h * s)}px`,
        backgroundImage: `url("${imageUrl(sheet.sheetPngFilename)}")`,
        backgroundPosition: `${-b.x * s}px ${-b.y * s}px`,
        backgroundSize: sheet.sheetWidth ? `${sheet.sheetWidth * s}px ${sheet.sheetHeight! * s}px` : undefined,
    };
});
</script>

<template>
  <div class="thumb pixelated" :style="style" />
</template>

<style scoped>
.thumb { background-repeat: no-repeat; image-rendering: pixelated; }
</style>
