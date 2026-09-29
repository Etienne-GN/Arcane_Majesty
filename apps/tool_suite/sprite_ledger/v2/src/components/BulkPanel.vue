<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Layer } from '@shared/api';
import { spriteSize, fullBox, baseBox, LAYER_LABELS } from '@shared/physics';
import FlagComposer from './FlagComposer.vue';
import {
    selectedItems, flagsByKey, physicsOf, approveReview, sendBack, approveHitboxes, savePhysics,
    setLicense, setCollection, collectionTree, clearSelection, openFocusMode,
} from '../store';

// Actions on every selected sprite at once: one write for the whole selection,
// each with Undo.
const keys = computed(() => selectedItems.value.map(i => i.key));
const reviewKeys = computed(() => keys.value.filter(k => (flagsByKey.value.get(k) ?? []).some(f => f.status === 'needs_review')));
const hitboxKeys = computed(() => keys.value.filter(k => physicsOf(k) === 'proposed'));
const sheetsCount = computed(() => new Set(selectedItems.value.map(i => i.sheet.sheetPngFilename)).size);

const note = ref('');
const layer = ref<Layer>('sorted');
const collection = ref('');

function applyHitbox(kind: 'none' | 'full' | 'base') {
    savePhysics(selectedItems.value.map(it => {
        const size = spriteSize(it.sheet, it.entry);
        return { key: it.key, hitbox: kind === 'none' ? null : kind === 'full' ? fullBox(size) : baseBox(size), layer: layer.value };
    }), `Hitbox set on ${selectedItems.value.length} sprites`);
}
</script>

<template>
  <div class="bulk">
    <div class="head">
      <div class="big">{{ keys.length }} sprites selected</div>
      <div class="muted">from {{ sheetsCount }} sheet{{ sheetsCount === 1 ? '' : 's' }}</div>
      <div class="row">
        <button @click="openFocusMode()">Review one by one <kbd>↵</kbd></button>
        <button class="ghost" @click="clearSelection">Clear <kbd>Esc</kbd></button>
      </div>
    </div>

    <section>
      <h4><span class="dot review" /> Review flags <span class="muted">{{ reviewKeys.length }}</span></h4>
      <button class="primary" :disabled="!reviewKeys.length" @click="approveReview(reviewKeys)">✓ Approve {{ reviewKeys.length }} <kbd>A</kbd></button>
      <textarea v-model="note" rows="2" placeholder="Note for Claude when sending back (optional)" />
      <button :disabled="!reviewKeys.length" @click="sendBack(reviewKeys, note); note = ''">↩ Send {{ reviewKeys.length }} back</button>
    </section>

    <section>
      <h4><span class="dot hitbox" /> Hitboxes <span class="muted">{{ hitboxKeys.length }} guesses to check</span></h4>
      <button class="primary" :disabled="!hitboxKeys.length" @click="approveHitboxes(hitboxKeys)">✓ Approve {{ hitboxKeys.length }} guesses as they are</button>
      <div class="muted small">Or set the same hitbox on all {{ keys.length }}:</div>
      <div class="row">
        <button v-for="(l, k) in LAYER_LABELS" :key="k" :class="{ on: layer === k }" :title="l.hint" @click="layer = k">{{ l.icon }} {{ l.label }}</button>
      </div>
      <div class="row">
        <button @click="applyHitbox('none')">No hitbox</button>
        <button @click="applyHitbox('full')">Full</button>
        <button @click="applyHitbox('base')">Base</button>
      </div>
    </section>

    <section>
      <h4>License</h4>
      <div class="row">
        <button @click="setLicense(keys, 'ok')">✓ Licensed OK</button>
        <button @click="setLicense(keys, 'unlicensed')">⚠ Unlicensed</button>
        <button class="ghost" @click="setLicense(keys, null)">Clear</button>
      </div>
    </section>

    <section>
      <h4>Collection</h4>
      <div class="row">
        <select v-model="collection">
          <option value="" disabled>Move to…</option>
          <option v-for="c in collectionTree" :key="c.id" :value="c.id">{{ '— '.repeat(c.depth) }}{{ c.name }}</option>
        </select>
        <button :disabled="!collection" @click="setCollection(keys, collection)">Move</button>
      </div>
    </section>

    <section>
      <FlagComposer :keys="keys" />
    </section>
  </div>
</template>

<style scoped>
.bulk { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; flex-direction: column; gap: 6px; }
.big { font-size: 16px; }
section { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border); padding-top: 10px; }
h4 { margin: 0; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.row button { font-size: 12px; padding: 4px 8px; }
.row button.on { background: var(--accent-soft); border-color: var(--accent); }
.small { font-size: 11px; }
textarea { width: 100%; }
</style>
