<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SpritePreview from './SpritePreview.vue';
import FlagThread from './FlagThread.vue';
import FlagComposer from './FlagComposer.vue';
import CollisionEditor from './CollisionEditor.vue';
import BulkPanel from './BulkPanel.vue';
import {
    focusItem, selection, inspectorTab, flagsByKey, physicsOf, licenseOf, collectionOf, collectionTree,
    setLicense, setCollection, openFocusMode, view, setScope,
} from '../store';

// Right-hand panel: the focused sprite (preview + Info / Flags / Collision),
// or bulk actions when several sprites are selected.
const preview = ref<InstanceType<typeof SpritePreview> | null>(null);
const composer = ref<InstanceType<typeof FlagComposer> | null>(null);
const collision = ref<InstanceType<typeof CollisionEditor> | null>(null);
defineExpose({
    togglePlay: () => preview.value?.togglePlay(),
    focusComposer: () => { inspectorTab.value = 'flags'; setTimeout(() => composer.value?.focus(), 0); },
    saveCollision: () => collision.value?.save(),
});

const it = computed(() => focusItem.value);
const flagsHere = computed(() => (it.value ? flagsByKey.value.get(it.value.key) ?? [] : []));
const physics = computed(() => (it.value ? physicsOf(it.value.key) : null));
const license = computed(() => (it.value ? licenseOf(it.value.key) : null));
const collection = ref('');
watch(it, v => { collection.value = v ? collectionOf(v.key) : ''; }, { immediate: true });

const LAYER_NAMES = { under: 'Under characters', sorted: 'Sorted', over: 'Over characters' } as const;
const hitboxText = computed(() => {
    const e = it.value?.entry;
    if (!e || e.hitbox === undefined) return 'not set';
    if (e.hitbox === null) return 'none';
    return `${e.hitbox.x},${e.hitbox.y} ${e.hitbox.w}×${e.hitbox.h}`;
});
function openSheet() {
    if (!it.value) return;
    setScope({ kind: 'sheet', id: it.value.sheet.sheetPngFilename });
    view.value = 'sheet';
}
</script>

<template>
  <aside class="inspector">
    <BulkPanel v-if="selection.size > 1" />

    <div v-else-if="!it" class="empty">
      <div class="empty-title">Nothing selected</div>
      <p class="muted">Click a sprite to inspect it. Shift/Ctrl-click to select several, then act on all of them at once.</p>
      <ul class="muted keys">
        <li><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>J</kbd><kbd>K</kbd> next / previous</li>
        <li><kbd>A</kbd> approve · <kbd>R</kbd> send back · <kbd>F</kbd> flag</li>
        <li><kbd>↵</kbd> focus mode · <kbd>Ctrl K</kbd> command palette · <kbd>?</kbd> all shortcuts</li>
      </ul>
    </div>

    <template v-else>
      <div class="title">
        <div class="name mono">{{ it.entry.name }}</div>
        <div class="muted small mono">{{ it.sheet.sheetPngFilename }}</div>
      </div>
      <SpritePreview ref="preview" :item="it" :max-px="220" />
      <div class="row">
        <button @click="openFocusMode(it.key)" title="Review in focus mode (Enter)">⛶ Focus mode</button>
        <button class="ghost" @click="openSheet" title="Show it in its sheet">▦ In sheet</button>
      </div>

      <nav class="tabs">
        <button :class="{ on: inspectorTab === 'info' }" @click="inspectorTab = 'info'">Info <kbd>1</kbd></button>
        <button :class="{ on: inspectorTab === 'flags' }" @click="inspectorTab = 'flags'">
          Flags <span v-if="flagsHere.length" class="count">{{ flagsHere.length }}</span> <kbd>2</kbd>
        </button>
        <button :class="{ on: inspectorTab === 'collision' }" @click="inspectorTab = 'collision'">
          Collision <span v-if="physics === 'proposed'" class="dot hitbox" /> <kbd>3</kbd>
        </button>
      </nav>

      <div v-if="inspectorTab === 'info'" class="tab">
        <dl>
          <dt>Kind</dt><dd>{{ it.entry.kind }} · {{ it.box.w }}×{{ it.box.h }}px at {{ it.box.x }},{{ it.box.y }}</dd>
          <template v-if="it.entry.frames?.length"><dt>Animation</dt><dd>{{ it.entry.frames.length }} frames · {{ it.entry.frameDurationMs ?? 120 }}ms</dd></template>
          <dt>Tags</dt><dd>{{ it.entry.tags?.join(', ') || '—' }}</dd>
          <dt>Hitbox</dt><dd>{{ hitboxText }} · {{ it.entry.layer ? LAYER_NAMES[it.entry.layer] : 'layer not set' }}
            <span v-if="physics === 'proposed'" class="warn">(guess)</span></dd>
        </dl>
        <label class="field">Collection
          <select v-model="collection" @change="setCollection([it.key], collection)">
            <option v-for="c in collectionTree" :key="c.id" :value="c.id">{{ '— '.repeat(c.depth) }}{{ c.name }}</option>
          </select>
        </label>
        <div class="field">License
          <div class="seg">
            <button :class="{ on: license === 'ok' }" @click="setLicense([it.key], license === 'ok' ? null : 'ok')">✓ OK</button>
            <button :class="{ on: license === 'unlicensed' }" @click="setLicense([it.key], license === 'unlicensed' ? null : 'unlicensed')">⚠ Unlicensed</button>
          </div>
        </div>
      </div>

      <div v-else-if="inspectorTab === 'flags'" class="tab">
        <FlagThread v-for="f in flagsHere" :key="f.id" :flag="f" />
        <div v-if="!flagsHere.length" class="muted small">No open flags on this sprite.</div>
        <FlagComposer ref="composer" :keys="[it.key]" />
      </div>

      <div v-else class="tab">
        <CollisionEditor ref="collision" :item="it" />
      </div>
    </template>
  </aside>
</template>

<style scoped>
.inspector { width: 340px; flex-shrink: 0; border-left: 1px solid var(--border); background: var(--panel); overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.title .name { font-size: 14px; word-break: break-all; }
.small { font-size: 11px; }
.row { display: flex; gap: 6px; }
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.tabs button { background: none; border: none; border-bottom: 2px solid transparent; border-radius: 0; padding: 6px 10px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.tabs button.on { color: var(--text); border-bottom-color: var(--accent); }
.count { background: var(--raised); border-radius: 8px; padding: 0 6px; font-size: 11px; color: var(--text); }
.tab { display: flex; flex-direction: column; gap: 10px; }
dl { display: grid; grid-template-columns: 80px 1fr; gap: 4px 8px; margin: 0; font-size: 12px; }
dt { color: var(--muted); }
dd { margin: 0; word-break: break-word; }
.warn { color: var(--s-hitbox); }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.seg { display: flex; gap: 4px; }
.seg button.on { background: var(--accent-soft); border-color: var(--accent); }
.empty { padding: 20px 4px; }
.empty-title { font-size: 15px; margin-bottom: 6px; }
.keys { padding-left: 16px; line-height: 2; font-size: 12px; }
</style>
