<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Sheet, Collection, Flag, SpriteEntry, LicenseStatus } from '../services/api';
import { imageUrl, assignCollection, fetchFlags, setFlagStatus, setLicenseStatus } from '../services/api';
import FlagForm from './FlagForm.vue';

const props = defineProps<{
    sheetPngFilename: string;
    entryName: string;
    sheets: Sheet[];
    collections: Collection[];
    currentCollectionId: string;
    currentLicense: LicenseStatus | null;
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

// Clicking the already-active status clears it back to unmarked; clicking
// the other one switches directly (no need to clear first).
async function onSetLicense(status: LicenseStatus) {
    const next = props.currentLicense === status ? null : status;
    try {
        await setLicenseStatus(props.sheetPngFilename, props.entryName, next);
        errorMessage.value = null;
        emit('reassigned');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}

const flagsForSprite = ref<Flag[]>([]);
async function loadFlagsForSprite() {
    // Show everything still pending action (open + needs_review) — hide
    // only flags a human has already fully resolved.
    const all = await fetchFlags();
    flagsForSprite.value = all.filter(
        f => f.sheet === props.sheetPngFilename && f.name === props.entryName && f.status !== 'resolved'
    );
}
onMounted(loadFlagsForSprite);
watch(() => [props.sheetPngFilename, props.entryName], loadFlagsForSprite);

async function onFlagSubmitted() {
    await loadFlagsForSprite();
    emit('reassigned'); // reuse the same "refresh parent" signal
}

async function onSetFlagStatus(id: string, status: 'open' | 'resolved') {
    try {
        await setFlagStatus(id, status);
        await loadFlagsForSprite();
        errorMessage.value = null;
        emit('reassigned'); // reuse the same "refresh parent" signal so the grid's badges update
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

    <div class="license-controls">
      <button
        type="button"
        :class="{ active: currentLicense === 'ok' }"
        @click="onSetLicense('ok')"
      >✓ Licensed OK</button>
      <button
        type="button"
        :class="{ active: currentLicense === 'unlicensed' }"
        @click="onSetLicense('unlicensed')"
      >⚠ Flag Unlicensed</button>
    </div>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <div v-if="flagsForSprite.length" class="open-flags">
      <h4>Open flags</h4>
      <div v-for="f in flagsForSprite" :key="f.id" class="flag-row">
        <div class="flag-text">
          <span v-if="f.status === 'needs_review'" class="review-badge">🔍 needs your review</span>
          <span>{{ f.reason }}<template v-if="f.comment"> — {{ f.comment }}</template></span>
        </div>
        <div class="flag-actions">
          <template v-if="f.status === 'needs_review'">
            <button @click="onSetFlagStatus(f.id, 'resolved')">✓ Approve</button>
            <button @click="onSetFlagStatus(f.id, 'open')">↩ Rework</button>
          </template>
          <button v-else @click="onSetFlagStatus(f.id, 'resolved')">Resolve</button>
        </div>
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
.license-controls { display: flex; gap: 6px; margin-top: 10px; }
.license-controls button { flex: 1; font-size: 11px; padding: 4px; background: #1a1a1a; color: #eee; border: 1px solid #333; cursor: pointer; }
.license-controls button.active:first-child { background: #1a3a1a; border-color: #3c3; color: #6e6; }
.license-controls button.active:last-child { background: #3a2a1a; border-color: #e91; color: #ea6; }
.error { color: #e88; font-size: 11px; margin-top: 4px; }
.open-flags { margin-top: 12px; }
.flag-row { font-size: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #222; }
.flag-text { margin-bottom: 4px; }
.review-badge { display: block; color: #6af; font-size: 11px; margin-bottom: 2px; }
.flag-actions { display: flex; gap: 6px; }
.flag-actions button { flex: 1; font-size: 11px; padding: 3px; background: #1a1a1a; color: #eee; border: 1px solid #333; cursor: pointer; }
</style>
