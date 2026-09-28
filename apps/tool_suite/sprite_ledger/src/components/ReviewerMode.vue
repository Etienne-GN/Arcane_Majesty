<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { Sheet, Flag, SpriteEntry } from '../services/api';
import { imageUrl, setFlagStatus, answerQuestion } from '../services/api';

// A focused, one-sprite-at-a-time pass over the review queue: big preview,
// the sprite in its surrounding sheet, the flag notes, and approve / rework
// that jump straight to the next item. It only reads the same flags the
// rest of the ledger uses and writes through the same API, so nothing here
// changes how the grid or the detail panel behave.
// startKey/startQueue: opened from a sprite's detail panel — land on that
// sprite (in its queue) instead of the first item.
const props = defineProps<{ sheets: Sheet[]; flags: Flag[]; startKey?: string | null; startQueue?: 'needs_review' | 'question' | 'open' | null }>();
const emit = defineEmits<{ exit: []; changed: [] }>();

type Queue = 'needs_review' | 'question' | 'open';
const queue = ref<Queue>(props.startQueue ?? 'needs_review');
const sheetFilter = ref<string>('all');

interface Item { key: string; sheet: Sheet; entry: SpriteEntry; flags: Flag[] }

const sheetByName = computed(() => new Map(props.sheets.map(s => [s.sheetPngFilename, s])));

function boxOf(sheet: Sheet, e: SpriteEntry) {
    return e.kind === 'object'
        ? { x: e.x!, y: e.y!, w: e.w!, h: e.h! }
        : { x: e.col! * sheet.gridTileWidth!, y: e.row! * sheet.gridTileHeight!, w: sheet.gridTileWidth!, h: sheet.gridTileHeight! };
}

function buildItems(status: Queue): Item[] {
    const byKey = new Map<string, Item>();
    for (const f of props.flags) {
        if (f.status !== status) continue;
        const key = `${f.sheet}::${f.name}`;
        let item = byKey.get(key);
        if (!item) {
            const sheet = sheetByName.value.get(f.sheet);
            const entry = sheet?.entries.find(e => e.name === f.name);
            if (!sheet || !entry) continue; // sprite gone — Home's orphan list covers those
            item = { key, sheet, entry, flags: [] };
            byKey.set(key, item);
        }
        item.flags.push(f);
    }
    // Sheet by sheet, then reading order within the sheet, so the pieces of
    // a split come up next to each other instead of scattered.
    return [...byKey.values()].sort((a, b) => {
        if (a.sheet.sheetPngFilename !== b.sheet.sheetPngFilename) return a.sheet.sheetPngFilename.localeCompare(b.sheet.sheetPngFilename);
        const ba = boxOf(a.sheet, a.entry), bb = boxOf(b.sheet, b.entry);
        return ba.y - bb.y || ba.x - bb.x;
    });
}

// The queue is a snapshot taken when you pick it, not a live filter:
// approving an item must not make the list shift under you mid-pass.
const items = ref<Item[]>([]);
const done = ref<Record<string, 'approved' | 'rework' | 'answered'>>({});
const index = ref(0);

function rebuild() {
    // Hand focus back from the queue/sheet dropdown, or the arrow keys would
    // keep cycling its options instead of moving between sprites.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const all = buildItems(queue.value);
    items.value = sheetFilter.value === 'all' ? all : all.filter(i => i.sheet.sheetPngFilename === sheetFilter.value);
    done.value = {};
    index.value = 0;
}
onMounted(() => {
    rebuild();
    if (props.startKey) {
        const i = items.value.findIndex(it => it.key === props.startKey);
        if (i >= 0) index.value = i;
    }
});
watch([queue, sheetFilter], rebuild);

const sheetCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const i of buildItems(queue.value)) counts.set(i.sheet.sheetPngFilename, (counts.get(i.sheet.sheetPngFilename) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
});

const current = computed(() => items.value[index.value] ?? null);
const doneCount = computed(() => Object.keys(done.value).length);
const approvedCount = computed(() => Object.values(done.value).filter(v => v === 'approved').length);
const reworkCount = computed(() => Object.values(done.value).filter(v => v === 'rework').length);

function go(delta: number) {
    const n = items.value.length;
    if (n === 0) return;
    index.value = Math.min(n - 1, Math.max(0, index.value + delta));
}

// After acting, land on the next item not handled yet in this pass —
// wrapping around so skipped items get picked up at the end.
function advance() {
    const n = items.value.length;
    for (let step = 1; step <= n; step++) {
        const j = (index.value + step) % n;
        if (!done.value[items.value[j].key]) { index.value = j; return; }
    }
}

// --- drawing ---------------------------------------------------------------
const bigCanvas = ref<HTMLCanvasElement | null>(null);
const ctxCanvas = ref<HTMLCanvasElement | null>(null);
const images = new Map<string, HTMLImageElement>();
let animTimer: number | null = null;
let frameIdx = 0;

// The loaded image is handed to the callback rather than returned: when the
// sheet is already cached the callback runs synchronously, before any
// `const img = imageFor(...)` at the call site would have been assigned.
function withImage(sheetName: string, onReady: (img: HTMLImageElement) => void) {
    let img = images.get(sheetName);
    if (!img) {
        img = new Image();
        img.src = imageUrl(sheetName);
        images.set(sheetName, img);
    }
    const loaded = img;
    if (loaded.complete && loaded.naturalWidth > 0) onReady(loaded);
    else loaded.addEventListener('load', () => onReady(loaded), { once: true });
}

const BIG_MAX = 440;
const CTX_MAX = 320;
const CTX_MAX_ZOOMED_OUT = 520;
const scaleInfo = ref('');

// `frame` (optional) is the canvas size for animations whose frames differ
// in size: each frame is drawn bottom-centred in it, like the game does.
function paintBig(img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }, frame = { w: box.w, h: box.h }) {
    const c = bigCanvas.value;
    if (!c) return;
    const s = Math.max(1, Math.floor(Math.min(BIG_MAX / frame.w, BIG_MAX / frame.h)));
    c.width = frame.w * s; c.height = frame.h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, box.x, box.y, box.w, box.h, Math.floor((frame.w - box.w) / 2) * s, (frame.h - box.h) * s, box.w * s, box.h * s);
    scaleInfo.value = `${frame.w}×${frame.h}px at ${s}×`;
}

// Zoom levels for the "in the sheet" view, from close-up to the whole
// sheet. Each is how much of the surroundings to show around the crop, as
// a multiple of the crop's own size; null means the entire sheet. The
// level is kept while moving between sprites.
const CTX_LEVELS: { pad: number | null; label: string }[] = [
    { pad: 0.75, label: 'close' },
    { pad: 2, label: 'wide' },
    { pad: 5, label: 'wider' },
    { pad: null, label: 'whole sheet' },
];
const ctxLevel = ref(0);
const ctxCaption = ref('');

function zoomContext(delta: number) {
    const next = Math.min(CTX_LEVELS.length - 1, Math.max(0, ctxLevel.value + delta));
    if (next === ctxLevel.value) return;
    ctxLevel.value = next;
    paint();
}

function paintContext(img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }) {
    const c = ctxCanvas.value;
    if (!c) return;
    const level = CTX_LEVELS[ctxLevel.value];
    let x0 = 0, y0 = 0, x1 = img.width, y1 = img.height;
    if (level.pad !== null) {
        // Enough of the surroundings to see whether the crop cuts something
        // off or swallows a neighbour.
        const pad = Math.max(16 * (ctxLevel.value + 1), Math.round(Math.max(box.w, box.h) * level.pad));
        x0 = Math.max(0, box.x - pad); y0 = Math.max(0, box.y - pad);
        x1 = Math.min(img.width, box.x + box.w + pad); y1 = Math.min(img.height, box.y + box.h + pad);
    }
    const w = x1 - x0, h = y1 - y0;
    // Close-up stays pixel-exact (whole-number scale). Zoomed out, the region
    // is fitted to the available space instead: shrunk when it's large, and
    // not left at a tiny 1x when a small sheet could fill more of the view.
    const max = ctxLevel.value === 0 ? CTX_MAX : CTX_MAX_ZOOMED_OUT;
    const fit = Math.min(max / w, max / h);
    const s = ctxLevel.value === 0 ? Math.max(1, Math.floor(fit)) : (fit >= 2 ? Math.floor(fit) : fit);
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, x0, y0, w, h, 0, 0, c.width, c.height);
    g.strokeStyle = '#ff3fd5';
    g.lineWidth = 2;
    // Keep the outline findable even when the crop shrinks to a few pixels.
    const bw = Math.max(6, box.w * s), bh = Math.max(6, box.h * s);
    const bx = (box.x - x0) * s - (bw - box.w * s) / 2, by = (box.y - y0) * s - (bh - box.h * s) / 2;
    g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctxCaption.value = `${level.label} · ${w}×${h}px${Number.isInteger(s) ? ` at ${s}×` : ` at ${Math.round(s * 100)}%`}`;
}

function stopAnim() {
    if (animTimer !== null) { clearInterval(animTimer); animTimer = null; }
}

function paint() {
    stopAnim();
    const item = current.value;
    if (!item) return;
    withImage(item.sheet.sheetPngFilename, (img) => {
        if (current.value !== item) return;
        const box = boxOf(item.sheet, item.entry);
        paintContext(img, box);
        const frames = item.entry.frames;
        if (frames && frames.length > 1) {
            frameIdx = 0;
            const frameSize = { w: Math.max(...frames.map(f => f.w)), h: Math.max(...frames.map(f => f.h)) };
            paintBig(img, frames[0], frameSize);
            animTimer = window.setInterval(() => {
                frameIdx = (frameIdx + 1) % frames.length;
                paintBig(img, frames[frameIdx], frameSize);
            }, item.entry.frameDurationMs ?? 120);
        } else {
            paintBig(img, box);
        }
    });
}
watch(current, () => { reworkDraft.value = ''; answerDraft.value = ''; nextTick(paint); });
onMounted(() => nextTick(paint));
onBeforeUnmount(stopAnim);

// --- actions ---------------------------------------------------------------
const busy = ref(false);
const errorMessage = ref<string | null>(null);
const reworkDraft = ref('');
const answerDraft = ref('');

async function act(kind: 'approved' | 'rework' | 'answered', run: (f: Flag) => Promise<void>) {
    const item = current.value;
    if (!item || busy.value) return;
    busy.value = true;
    try {
        for (const f of item.flags) await run(f);
        done.value[item.key] = kind;
        errorMessage.value = null;
        emit('changed');
        advance();
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    } finally {
        busy.value = false;
    }
}

function approve() {
    return act('approved', f => setFlagStatus(f.id, 'resolved'));
}

function rework() {
    const note = reworkDraft.value.trim();
    return act('rework', f => {
        if (!note) return setFlagStatus(f.id, 'open');
        const line = `[Rework] ${note}`;
        return setFlagStatus(f.id, 'open', { comment: f.comment ? `${f.comment}\n\n${line}` : line });
    });
}

function answer() {
    const text = answerDraft.value.trim();
    if (!text) return;
    return act('answered', f => answerQuestion(f, text));
}

function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    else if ((e.key === 'a' || e.key === 'Enter') && queue.value !== 'question') { approve(); e.preventDefault(); }
    else if (e.key === 'r') { (document.getElementById('rework-note') as HTMLTextAreaElement | null)?.focus(); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomContext(1); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomContext(-1); e.preventDefault(); }
    else if (e.key === 'Escape') emit('exit');
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

function statusLabel(s: string) {
    return s === 'needs_review' ? 'awaiting review' : s;
}
</script>

<template>
  <div class="reviewer">
    <header>
      <button class="exit" @click="emit('exit')">← Exit Reviewer Mode</button>
      <label>Queue
        <select v-model="queue">
          <option value="needs_review">🔍 Awaiting your review</option>
          <option value="question">❓ Claude's questions</option>
          <option value="open">● Open flags</option>
        </select>
      </label>
      <label>Sheet
        <select v-model="sheetFilter">
          <option value="all">All sheets</option>
          <option v-for="[name, n] in sheetCounts" :key="name" :value="name">{{ name }} ({{ n }})</option>
        </select>
      </label>
      <span class="progress" v-if="items.length">
        {{ index + 1 }} / {{ items.length }} · ✓ {{ approvedCount }} approved · ↩ {{ reworkCount }} sent back
        <template v-if="doneCount === items.length"> · all done 🎉</template>
      </span>
    </header>

    <div v-if="!current" class="empty">Nothing in this queue.</div>

    <main v-else>
      <section class="views">
        <div class="big">
          <canvas ref="bigCanvas" />
          <div class="caption">{{ scaleInfo }}<template v-if="(current.entry.frames?.length ?? 0) > 1"> · {{ current.entry.frames!.length }} frames</template></div>
        </div>
        <div class="context">
          <canvas ref="ctxCanvas" />
          <div class="ctx-bar">
            <button :disabled="ctxLevel >= CTX_LEVELS.length - 1" title="Zoom out (-)" @click="zoomContext(1)">−</button>
            <button :disabled="ctxLevel === 0" title="Zoom in (+)" @click="zoomContext(-1)">+</button>
            <span class="caption">In the sheet (crop outlined) · {{ ctxCaption }}</span>
          </div>
        </div>
      </section>

      <section class="info">
        <div v-if="done[current.key]" class="done-banner" :class="done[current.key]">
          {{ done[current.key] === 'approved' ? '✓ Approved' : done[current.key] === 'rework' ? '↩ Sent back' : '✉ Answered' }} in this pass
        </div>
        <h2>{{ current.entry.name }}</h2>
        <div class="where">{{ current.sheet.sheetPngFilename }}</div>

        <div v-for="f in current.flags" :key="f.id" class="flag">
          <div class="flag-head">{{ statusLabel(f.status) }} · {{ f.reason }} · {{ f.createdAt.slice(0, 10) }}</div>
          <div v-if="f.comment" class="comment">{{ f.comment }}</div>
          <div v-if="f.claudeNote" class="question">❓ {{ f.claudeNote }}</div>
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <div v-if="queue === 'question'" class="action-block">
          <textarea v-model="answerDraft" rows="3" placeholder="Your answer…" />
          <button class="primary" :disabled="busy || !answerDraft.trim()" @click="answer">Send answer →</button>
        </div>
        <template v-else>
          <button class="primary approve" :disabled="busy" @click="approve">✓ Approve &amp; next <kbd>A</kbd></button>
          <div class="action-block">
            <textarea id="rework-note" v-model="reworkDraft" rows="2" placeholder="What's wrong? (optional)" />
            <button :disabled="busy" @click="rework">↩ Send back for rework &amp; next</button>
          </div>
        </template>

        <div class="nav">
          <button :disabled="index === 0" @click="go(-1)">◀ Previous <kbd>←</kbd></button>
          <button :disabled="index >= items.length - 1" @click="go(1)">Next ▶ <kbd>→</kbd></button>
        </div>
        <div class="keys">A / Enter approve · R focus rework note · ← → navigate · − / + zoom the sheet view · Esc exit</div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.reviewer { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
header { display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #333; flex-wrap: wrap; font-size: 13px; }
header label { display: flex; gap: 6px; align-items: center; color: #aaa; }
select, textarea, button { font-family: inherit; font-size: 13px; }
select, textarea { background: #1a1a1a; color: #eee; border: 1px solid #444; border-radius: 4px; }
button { cursor: pointer; background: #222; color: #eee; border: 1px solid #555; border-radius: 4px; padding: 6px 12px; }
button:disabled { opacity: 0.4; cursor: default; }
button.primary { background: #1d3a24; border-color: #3a7; }
.exit { background: transparent; }
.progress { margin-left: auto; color: #9ab; }
.empty { padding: 60px; text-align: center; color: #888; }
main { flex: 1; display: flex; gap: 24px; padding: 20px; overflow: auto; }
.views { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.big canvas, .context canvas {
    image-rendering: pixelated; display: block; border: 1px solid #333;
    background-color: #2a2a2a;
    background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
.big canvas { min-width: 64px; min-height: 64px; }
.caption { font-size: 11px; color: #888; margin-top: 4px; }
.ctx-bar { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.ctx-bar button { padding: 0 10px; font-size: 15px; line-height: 20px; }
.ctx-bar .caption { margin-top: 0; }
.info { flex: 1; min-width: 300px; max-width: 520px; display: flex; flex-direction: column; gap: 10px; }
h2 { margin: 0; font-size: 18px; word-break: break-all; }
.where { color: #888; font-size: 12px; }
.flag { background: #1a1a1a; border: 1px solid #333; border-left: 3px solid #39c; border-radius: 4px; padding: 8px 10px; font-size: 12px; }
.flag-head { color: #9ab; margin-bottom: 4px; }
.comment { white-space: pre-wrap; color: #ddd; }
.question { white-space: pre-wrap; color: #c9f; margin-top: 6px; }
.error { color: #f99; font-size: 12px; }
.approve { padding: 12px; font-size: 15px; }
.action-block { display: flex; flex-direction: column; gap: 6px; }
.nav { display: flex; gap: 8px; }
.nav button { flex: 1; }
kbd { font-size: 10px; border: 1px solid #666; border-radius: 3px; padding: 0 4px; margin-left: 6px; color: #aaa; }
.keys { font-size: 11px; color: #777; }
.done-banner { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
.done-banner.approved { background: #1d3a24; }
.done-banner.rework { background: #3a2a1d; }
.done-banner.answered { background: #2a1d3a; }
</style>
