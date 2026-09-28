<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { Sheet, Collection, Flag, FlagStatus, SpriteEntry, LicenseStatus, PhysicsReview } from '../services/api';
import HitboxEditor from './HitboxEditor.vue';
import { imageUrl, assignCollection, fetchFlags, setFlagStatus, setLicenseStatus, answerQuestion } from '../services/api';
import { flattenTree } from '../services/collectionTree';
import FlagForm from './FlagForm.vue';

const props = defineProps<{
    sheetPngFilename: string;
    entryName: string;
    sheets: Sheet[];
    collections: Collection[];
    currentCollectionId: string;
    currentLicense: LicenseStatus | null;
    physicsReview: PhysicsReview | null;
}>();

// 'approved' replaces 'reassigned' when a flag is resolved: App refreshes
// and moves the selection on to the next sprite in the grid.
// 'openInReviewer' hands this sprite to Reviewer Mode (App switches view),
// opened on the queue of its pending flag.
const emit = defineEmits<{ close: []; reassigned: []; approved: []; openInReviewer: [queue: FlagStatus]; openHitboxReviewer: [] }>();

const sheet = computed(() => props.sheets.find(s => s.sheetPngFilename === props.sheetPngFilename)!);
const entry = computed<SpriteEntry>(() => sheet.value.entries.find(e => e.name === props.entryName)!);

const canvasRef = ref<HTMLCanvasElement | null>(null);

const DEFAULT_FRAME_MS = 120;

function boxOf(e: SpriteEntry) {
    return e.kind === 'object'
        ? { x: e.x!, y: e.y!, w: e.w!, h: e.h! }
        : { x: e.col! * sheet.value.gridTileWidth!, y: e.row! * sheet.value.gridTileHeight!, w: sheet.value.gridTileWidth!, h: sheet.value.gridTileHeight! };
}

const frames = computed(() => entry.value.frames ?? null);
const isAnimated = computed(() => (frames.value?.length ?? 0) > 1);
const frameIdx = ref(0);
const playing = ref(true);
let timer: number | null = null;
let sheetImg: HTMLImageElement | null = null;

function stopTimer() {
    if (timer !== null) { clearInterval(timer); timer = null; }
}

/** Paints one frame (or the whole sprite, when it isn't animated). */
function paint() {
    const canvas = canvasRef.value;
    const img = sheetImg;
    if (!canvas || !img || !img.complete) return;
    const box = isAnimated.value ? frames.value![frameIdx.value] : boxOf(entry.value);
    // Frames can differ in size; draw each bottom-centred in the largest,
    // the way the game anchors them, so the preview doesn't jump.
    const fw = isAnimated.value ? Math.max(...frames.value!.map(f => f.w)) : box.w;
    const fh = isAnimated.value ? Math.max(...frames.value!.map(f => f.h)) : box.h;
    canvas.width = fw * 4;
    canvas.height = fh * 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, box.x, box.y, box.w, box.h, Math.floor((fw - box.w) / 2) * 4, (fh - box.h) * 4, box.w * 4, box.h * 4);
}

function tick() {
    frameIdx.value = (frameIdx.value + 1) % frames.value!.length;
    paint();
}

/** (Re)starts playback for the current entry — or leaves a still painted. */
function sync() {
    stopTimer();
    frameIdx.value = 0;
    paint();
    if (isAnimated.value && playing.value) {
        timer = window.setInterval(tick, entry.value.frameDurationMs ?? DEFAULT_FRAME_MS);
    }
}

function load() {
    const img = new Image();
    img.src = imageUrl(props.sheetPngFilename);
    sheetImg = img;
    if (img.complete) sync();
    else img.addEventListener('load', sync, { once: true });
}

function togglePlay() {
    playing.value = !playing.value;
    sync();
}

function stepFrame(delta: number) {
    if (!isAnimated.value) return;
    playing.value = false;
    stopTimer();
    const n = frames.value!.length;
    frameIdx.value = (frameIdx.value + delta + n) % n;
    paint();
}

onMounted(load);
watch(() => [props.sheetPngFilename, props.entryName], () => { playing.value = true; load(); });
// An interval that outlives the panel keeps painting a canvas nobody can see.
onBeforeUnmount(stopTimer);

const collectionTree = computed(() => flattenTree(props.collections));

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
// Reviewer Mode has one queue per status; prefer the review queue, since
// that's where the in-context sheet view matters most.
const reviewerQueue = computed<FlagStatus | null>(() => {
    const statuses = new Set(flagsForSprite.value.map(f => f.status));
    return (['needs_review', 'question', 'open'] as FlagStatus[]).find(s => statuses.has(s)) ?? null;
});
async function loadFlagsForSprite() {
    // Show everything still pending action (open, needs_review, question)
    // — hide only flags a human has already fully resolved.
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
        // Either way the parent refreshes so the grid's badges update.
        emit(status === 'resolved' ? 'approved' : 'reassigned');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}

// One draft per flag id, not a single shared string — a sprite can carry
// more than one open question at once.
const answerDrafts = ref<Record<string, string>>({});

async function onAnswerQuestion(f: Flag) {
    const answer = (answerDrafts.value[f.id] ?? '').trim();
    if (!answer) return;
    try {
        await answerQuestion(f, answer);
        delete answerDrafts.value[f.id];
        await loadFlagsForSprite();
        errorMessage.value = null;
        emit('reassigned');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}
</script>

<template>
  <div class="detail-panel">
    <button class="close" @click="emit('close')">×</button>
    <canvas ref="canvasRef" class="preview" />
    <div v-if="isAnimated" class="anim-controls">
      <button type="button" @click="stepFrame(-1)" title="Previous frame">‹</button>
      <button type="button" @click="togglePlay">{{ playing ? '❚❚ Pause' : '▶ Play' }}</button>
      <button type="button" @click="stepFrame(1)" title="Next frame">›</button>
      <span class="frame-count">
        frame {{ frameIdx + 1 }}/{{ frames!.length }} · {{ entry.frameDurationMs ?? 120 }}ms
      </span>
    </div>
    <h3>{{ entryName }} <span v-if="isAnimated" class="anim-tag">animated</span></h3>
    <div class="sheet-name">{{ sheetPngFilename }}</div>
    <button
      v-if="reviewerQueue"
      class="open-reviewer"
      title="Open this sprite in Reviewer Mode, with the source spritesheet around it"
      @click="emit('openInReviewer', reviewerQueue)"
    >🧐 Open in Reviewer Mode</button>
    <div class="tags" v-if="entry.tags?.length">{{ entry.tags.join(', ') }}</div>

    <details class="physics" open>
      <summary>Collision &amp; layer</summary>
      <HitboxEditor :sheet="sheet" :entry="entry" :review="physicsReview" @saved="emit('reassigned')" />
      <button v-if="physicsReview === 'proposed'" class="open-reviewer" @click="emit('openHitboxReviewer')">🧱 Review hitboxes in Reviewer Mode</button>
    </details>

    <label class="collection-picker">
      Collection:
      <select v-model="selectedCollection" @change="onCollectionChange">
        <option v-for="c in collectionTree" :key="c.id" :value="c.id">{{ '—'.repeat(c.depth) }} {{ c.name }}</option>
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
          <!-- claudeNote outlives the 'question' status on purpose — once a
               human answers and it goes back to 'open', the question that
               prompted the answer should stay visible right above it. -->
          <div v-if="f.claudeNote" class="question-note" :class="{ pending: f.status === 'question' }">
            ❓ Claude {{ f.status === 'question' ? 'asks' : 'asked' }}: {{ f.claudeNote }}
          </div>
        </div>
        <div v-if="f.status === 'question'" class="answer-box">
          <textarea
            v-model="answerDrafts[f.id]"
            rows="2"
            placeholder="Type your answer for Claude..."
          />
          <button
            :disabled="!(answerDrafts[f.id] ?? '').trim()"
            @click="onAnswerQuestion(f)"
          >Send answer</button>
        </div>
        <div class="flag-actions">
          <template v-if="f.status === 'needs_review'">
            <button @click="onSetFlagStatus(f.id, 'resolved')">✓ Approve</button>
            <button @click="onSetFlagStatus(f.id, 'open')">↩ Rework</button>
          </template>
          <template v-else-if="f.status === 'question'">
            <button class="secondary" @click="onSetFlagStatus(f.id, 'resolved')">Resolve without answering</button>
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
.anim-tag { font-size: 10px; color: #b8f; border: 1px solid #85c; border-radius: 3px; padding: 1px 4px; vertical-align: middle; }
.anim-controls { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
.anim-controls button { font-size: 11px; padding: 2px 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; cursor: pointer; }
.frame-count { font-size: 10px; color: #888; margin-left: 4px; }
.sheet-name { font-size: 11px; color: #888; }
.physics { margin: 10px 0; border: 1px solid #333; border-radius: 4px; padding: 6px 8px; }
.physics summary { cursor: pointer; font-size: 12px; color: #ccc; margin-bottom: 6px; }
.open-reviewer { margin-top: 8px; background: #16261b; color: #eee; border: 1px solid #3a7; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-family: inherit; font-size: 12px; }
.open-reviewer:hover { background: #1d3524; }
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
.question-note {
    margin-top: 4px; font-size: 11px; color: #c9e; padding: 4px 6px;
    background: #2a1a3a; border: 1px solid #74589633; border-radius: 4px;
}
.question-note.pending { border-color: #96c; }
.answer-box { display: flex; flex-direction: column; gap: 4px; margin: 6px 0; }
.answer-box textarea {
    font-family: inherit; font-size: 11px; resize: vertical;
    background: #1a1a1a; color: #eee; border: 1px solid #96c; border-radius: 4px; padding: 4px;
}
.answer-box button {
    align-self: flex-end; font-size: 11px; padding: 3px 10px;
    background: #3a1a52; color: #eee; border: 1px solid #96c; border-radius: 3px; cursor: pointer;
}
.answer-box button:disabled { opacity: 0.4; cursor: default; }
.flag-actions { display: flex; gap: 6px; }
.flag-actions button { flex: 1; font-size: 11px; padding: 3px; background: #1a1a1a; color: #eee; border: 1px solid #333; cursor: pointer; }
.flag-actions button.secondary { color: #999; }
</style>
