<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Sheet, Collection, Flag, SpriteEntry } from '../services/api';
import { imageUrl, assignCollection, fetchFlags, resolveFlag } from '../services/api';
import FlagForm from './FlagForm.vue';

const props = defineProps<{
    sheetPngFilename: string;
    entryName: string;
    sheets: Sheet[];
    collections: Collection[];
    currentCollectionId: string;
}>();

const emit = defineEmits<{ close: []; reassigned: [] }>();

const sheet = computed(() => props.sheets.find(s => s.sheetPngFilename === props.sheetPngFilename)!);
const entry = computed<SpriteEntry>(() => sheet.value.entries.find(e => e.name === props.entryName)!);

const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const img = new Image();
    img.src = imageUrl(props.sheetPngFilename);
    img.onload = () => {
        const e = entry.value;
        const box = e.kind === 'object'
            ? { x: e.x!, y: e.y!, w: e.w!, h: e.h! }
            : { x: e.col! * sheet.value.gridTileWidth!, y: e.row! * sheet.value.gridTileHeight!, w: sheet.value.gridTileWidth!, h: sheet.value.gridTileHeight! };
        canvas.width = box.w * 4;
        canvas.height = box.h * 4;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w * 4, box.h * 4);
    };
}

onMounted(draw);
watch(() => [props.sheetPngFilename, props.entryName], draw);

const selectedCollection = ref(props.currentCollectionId);
watch(() => props.currentCollectionId, (v) => { selectedCollection.value = v; });

const errorMessage = ref<string | null>(null);

async function onCollectionChange() {
    try {
        await assignCollection(props.sheetPngFilename, props.entryName, selectedCollection.value);
        errorMessage.value = null;
        emit('reassigned');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
        selectedCollection.value = props.currentCollectionId; // revert the dropdown to what's actually saved
    }
}

const flagsForSprite = ref<Flag[]>([]);
async function loadFlagsForSprite() {
    const all = await fetchFlags('open');
    flagsForSprite.value = all.filter(f => f.sheet === props.sheetPngFilename && f.name === props.entryName);
}
onMounted(loadFlagsForSprite);
watch(() => [props.sheetPngFilename, props.entryName], loadFlagsForSprite);

async function onFlagSubmitted() {
    await loadFlagsForSprite();
    emit('reassigned'); // reuse the same "refresh parent" signal
}

async function onResolve(id: string) {
    try {
        await resolveFlag(id);
        await loadFlagsForSprite();
        errorMessage.value = null;
        emit('reassigned'); // reuse the same "refresh parent" signal so the grid's flag-dot clears
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}
</script>

<template>
  <div class="detail-panel">
    <button class="close" @click="emit('close')">×</button>
    <canvas ref="canvasRef" class="preview" />
    <h3>{{ entryName }}</h3>
    <div class="sheet-name">{{ sheetPngFilename }}</div>
    <div class="tags" v-if="entry.tags?.length">{{ entry.tags.join(', ') }}</div>

    <label class="collection-picker">
      Collection:
      <select v-model="selectedCollection" @change="onCollectionChange">
        <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <div v-if="flagsForSprite.length" class="open-flags">
      <h4>Open flags</h4>
      <div v-for="f in flagsForSprite" :key="f.id" class="flag-row">
        <span>{{ f.reason }}<template v-if="f.comment"> — {{ f.comment }}</template></span>
        <button @click="onResolve(f.id)">Resolve</button>
      </div>
    </div>

    <FlagForm
      :sheet-png-filename="sheetPngFilename"
      :entry-name="entryName"
      @submitted="onFlagSubmitted"
    />
  </div>
</template>

<style scoped>
.detail-panel { width: 320px; padding: 16px; border-left: 1px solid #333; position: relative; overflow-y: auto; }
.close { position: absolute; top: 8px; right: 8px; }
.preview canvas, .preview { image-rendering: pixelated; }
.sheet-name { font-size: 11px; color: #888; }
.tags { font-size: 11px; color: #6a6; margin-top: 4px; }
.collection-picker { display: block; margin-top: 12px; }
.error { color: #e88; font-size: 11px; margin-top: 4px; }
.open-flags { margin-top: 12px; }
.flag-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px; }
</style>
