<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import CollectionSidebar from './components/CollectionSidebar.vue';
import SpriteGrid from './components/SpriteGrid.vue';
import SpriteDetail from './components/SpriteDetail.vue';
import { fetchSheets, fetchMeta, fetchFlags } from './services/api';
import type { Sheet, Collection, Flag } from './services/api';

const sheets = ref<Sheet[]>([]);
const collections = ref<Collection[]>([]);
const spriteMeta = ref<Record<string, { collection: string }>>({});
const openFlags = ref<Flag[]>([]);

const activeCollectionId = ref<string | null>(null);
const activeSheet = ref<string | null>(null); // null = "All sheets"
const flaggedOnly = ref(false);
const searchText = ref('');

const selected = ref<{ sheetPngFilename: string; entryName: string } | null>(null);

async function reload() {
    sheets.value = await fetchSheets();
    const meta = await fetchMeta();
    collections.value = meta.collections;
    spriteMeta.value = meta.spriteMeta;
    openFlags.value = await fetchFlags('open');
}

onMounted(reload);

function keyFor(sheetPngFilename: string, entryName: string) {
    return `${sheetPngFilename}::${entryName}`;
}

function collectionOf(sheetPngFilename: string, entryName: string): string {
    return spriteMeta.value[keyFor(sheetPngFilename, entryName)]?.collection ?? 'uncollected';
}

const flaggedKeys = computed(() => new Set(openFlags.value.map(f => keyFor(f.sheet, f.name))));

const sheetNames = computed(() => sheets.value.map(s => s.sheetPngFilename));

const visibleKeys = computed(() => {
    const set = new Set<string>();
    for (const sheet of sheets.value) {
        if (activeSheet.value !== null && sheet.sheetPngFilename !== activeSheet.value) continue;
        for (const entry of sheet.entries) {
            const key = keyFor(sheet.sheetPngFilename, entry.name);
            if (activeCollectionId.value !== null && collectionOf(sheet.sheetPngFilename, entry.name) !== activeCollectionId.value) continue;
            if (flaggedOnly.value && !flaggedKeys.value.has(key)) continue;
            if (searchText.value && !entry.name.toLowerCase().includes(searchText.value.toLowerCase())) continue;
            set.add(key);
        }
    }
    return set;
});

const counts = computed(() => {
    const c: Record<string, number> = { all: 0 };
    for (const sheet of sheets.value) {
        for (const entry of sheet.entries) {
            c.all++;
            const col = collectionOf(sheet.sheetPngFilename, entry.name);
            c[col] = (c[col] ?? 0) + 1;
        }
    }
    return c;
});

function onSelect(sheetPngFilename: string, entryName: string) {
    selected.value = { sheetPngFilename, entryName };
}
</script>

<template>
  <div class="layout">
    <CollectionSidebar
      :collections="collections"
      :active-collection-id="activeCollectionId"
      :sheet-names="sheetNames"
      :active-sheet="activeSheet"
      :flagged-only="flaggedOnly"
      :search-text="searchText"
      :counts="counts"
      @select-collection="(id) => activeCollectionId = id"
      @select-sheet="(sheet) => activeSheet = sheet"
      @toggle-flagged-only="flaggedOnly = !flaggedOnly"
      @update-search="(v) => searchText = v"
    />
    <SpriteGrid
      :sheets="sheets"
      :visible-keys="visibleKeys"
      :flagged-keys="flaggedKeys"
      @select="onSelect"
    />
    <SpriteDetail
      v-if="selected"
      :sheet-png-filename="selected.sheetPngFilename"
      :entry-name="selected.entryName"
      :sheets="sheets"
      :collections="collections"
      :current-collection-id="collectionOf(selected.sheetPngFilename, selected.entryName)"
      @close="selected = null"
      @reassigned="reload"
    />
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; background: #111; color: #eee; font-family: monospace; }
</style>
