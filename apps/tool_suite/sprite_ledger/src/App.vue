<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Home from './components/Home.vue';
import CollectionSidebar from './components/CollectionSidebar.vue';
import SpriteGrid from './components/SpriteGrid.vue';
import SpriteDetail from './components/SpriteDetail.vue';
import { fetchSheets, fetchMeta, fetchFlags, addCollection } from './services/api';
import type { Sheet, Collection, Flag, LicenseStatus } from './services/api';
import { descendantIds } from './services/collectionTree';

const sheets = ref<Sheet[]>([]);
const collections = ref<Collection[]>([]);
const spriteMeta = ref<Record<string, { collection: string; license?: LicenseStatus }>>({});
// Every flag that isn't resolved yet — both fresh reports and ones Claude
// has tentatively fixed but a human hasn't approved (or sent back) yet.
const pendingFlags = ref<Flag[]>([]);

// The ledger used to dump straight into the "All" grid on load, which meant
// every visit paid for mounting the whole 10,000+-sprite collection (72% of
// it LPC) before you'd even picked what to look at. Home is a lightweight
// dashboard — no grid, no canvases — that's the actual landing page now;
// "browse" is the old sidebar+grid view, entered by picking something.
const view = ref<'home' | 'browse'>('home');

const activeCollectionId = ref<string | null>(null);
const activeSheet = ref<string | null>(null); // null = "All sheets"
// 'flagged' is the old "Flagged only" toggle: anything still pending action.
// 'open', 'needs_review' and 'question' split that, so a review pass can
// look only at what Claude has tentatively fixed, or only at what it's
// stuck on, without the rest mixed in.
const flagFilter = ref<'all' | 'flagged' | 'open' | 'needs_review' | 'question'>('all');
const animatedOnly = ref(false);
const searchText = ref('');
const licenseFilter = ref<'all' | 'ok' | 'unlicensed' | 'unmarked'>('all');
const sortOrder = ref<'name' | 'sheet'>('name');

const selected = ref<{ sheetPngFilename: string; entryName: string } | null>(null);
const errorMessage = ref<string | null>(null);

async function reload() {
    try {
        // None of these three depend on each other's result — awaiting them
        // one at a time serialized 3 round-trips for no reason.
        const [sheetsResult, meta, flags] = await Promise.all([
            fetchSheets(), fetchMeta(), fetchFlags(),
        ]);
        sheets.value = sheetsResult;
        collections.value = meta.collections;
        spriteMeta.value = meta.spriteMeta;
        pendingFlags.value = flags.filter(f => f.status !== 'resolved');
        errorMessage.value = null;
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}

onMounted(reload);

function keyFor(sheetPngFilename: string, entryName: string) {
    return `${sheetPngFilename}::${entryName}`;
}

function collectionOf(sheetPngFilename: string, entryName: string): string {
    return spriteMeta.value[keyFor(sheetPngFilename, entryName)]?.collection ?? 'uncollected';
}

function licenseOf(sheetPngFilename: string, entryName: string): LicenseStatus | null {
    return spriteMeta.value[keyFor(sheetPngFilename, entryName)]?.license ?? null;
}

// Every sprite that actually exists right now. A flag is only reachable
// from the grid through its sprite, so flags on sprites a fix has since
// renamed, split or deleted are split out as orphans and listed on Home
// instead — otherwise Home counted them but every filter came up empty.
const existingKeys = computed(() => {
    const set = new Set<string>();
    for (const sheet of sheets.value) for (const entry of sheet.entries) set.add(keyFor(sheet.sheetPngFilename, entry.name));
    return set;
});
const liveFlags = computed(() => pendingFlags.value.filter(f => existingKeys.value.has(keyFor(f.sheet, f.name))));
const ORPHAN_ORDER: Record<string, number> = { question: 0, open: 1, needs_review: 2 };
const orphanFlags = computed(() =>
    pendingFlags.value
        .filter(f => !existingKeys.value.has(keyFor(f.sheet, f.name)))
        .sort((a, b) => (ORPHAN_ORDER[a.status] ?? 9) - (ORPHAN_ORDER[b.status] ?? 9))
);

// Used by the "Flagged only" sidebar toggle — anything still pending
// action, open or needs_review alike.
const flaggedKeys = computed(() => new Set(liveFlags.value.map(f => keyFor(f.sheet, f.name))));
// The grid's two flag badges are computed per status, not lumped
// together — a sprite whose only flag is needs_review shouldn't still
// show the "fresh, un-acted-on" open badge. A sprite with both an open
// flag and a separate needs_review flag legitimately shows both.
const openFlagKeys = computed(() =>
    new Set(liveFlags.value.filter(f => f.status === 'open').map(f => keyFor(f.sheet, f.name)))
);
const needsReviewKeys = computed(() =>
    new Set(liveFlags.value.filter(f => f.status === 'needs_review').map(f => keyFor(f.sheet, f.name)))
);
const questionKeys = computed(() =>
    new Set(liveFlags.value.filter(f => f.status === 'question').map(f => keyFor(f.sheet, f.name)))
);

const licenseOkKeys = computed(() => {
    const set = new Set<string>();
    for (const [key, m] of Object.entries(spriteMeta.value)) if (m.license === 'ok') set.add(key);
    return set;
});

const licenseFlaggedKeys = computed(() => {
    const set = new Set<string>();
    for (const [key, m] of Object.entries(spriteMeta.value)) if (m.license === 'unlicensed') set.add(key);
    return set;
});

const sheetNames = computed(() => sheets.value.map(s => s.sheetPngFilename));

// Selecting a parent collection shows everything nested under it too — a
// sub-collection is a drill-down refinement of its parent, not a place
// that steals sprites away from it. Picking "LPC — Base/Out" after
// carving "grass patches" out of it as a child still shows every grass
// patch, right alongside whatever hasn't been sub-categorized yet.
const activeDescendantSet = computed(() =>
    activeCollectionId.value === null ? null : descendantIds(collections.value, activeCollectionId.value)
);

const visibleKeys = computed(() => {
    const set = new Set<string>();
    for (const sheet of sheets.value) {
        if (activeSheet.value !== null && sheet.sheetPngFilename !== activeSheet.value) continue;
        for (const entry of sheet.entries) {
            const key = keyFor(sheet.sheetPngFilename, entry.name);
            if (activeDescendantSet.value !== null && !activeDescendantSet.value.has(collectionOf(sheet.sheetPngFilename, entry.name))) continue;
            if (flagFilter.value === 'flagged' && !flaggedKeys.value.has(key)) continue;
            if (flagFilter.value === 'open' && !openFlagKeys.value.has(key)) continue;
            if (flagFilter.value === 'needs_review' && !needsReviewKeys.value.has(key)) continue;
            if (flagFilter.value === 'question' && !questionKeys.value.has(key)) continue;
            if (animatedOnly.value && (entry.frames?.length ?? 0) < 2) continue;
            if (searchText.value && !entry.name.toLowerCase().includes(searchText.value.toLowerCase())) continue;
            const license = licenseOf(sheet.sheetPngFilename, entry.name);
            if (licenseFilter.value === 'ok' && license !== 'ok') continue;
            if (licenseFilter.value === 'unlicensed' && license !== 'unlicensed') continue;
            if (licenseFilter.value === 'unmarked' && license !== null) continue;
            set.add(key);
        }
    }
    return set;
});

const counts = computed(() => {
    const raw: Record<string, number> = { all: 0 };
    for (const sheet of sheets.value) {
        // Counts follow the sheet filter (same as visibleKeys) so the
        // sidebar's numbers match what's actually shown in the grid when
        // a sheet is selected — but deliberately ignore the flag filter and
        // searchText, since those are meant to narrow within a
        // collection/sheet, not redefine its total size.
        if (activeSheet.value !== null && sheet.sheetPngFilename !== activeSheet.value) continue;
        for (const entry of sheet.entries) {
            raw.all++;
            const col = collectionOf(sheet.sheetPngFilename, entry.name);
            raw[col] = (raw[col] ?? 0) + 1;
        }
    }
    // Roll each collection's raw count up into every ancestor's total, so
    // a parent's number in the sidebar still reads as "everything here",
    // matching what selecting it actually shows (see activeDescendantSet).
    const rolled: Record<string, number> = { all: raw.all };
    for (const c of collections.value) {
        let total = 0;
        for (const id of descendantIds(collections.value, c.id)) total += raw[id] ?? 0;
        rolled[c.id] = total;
    }
    return rolled;
});

function onSelect(sheetPngFilename: string, entryName: string) {
    selected.value = { sheetPngFilename, entryName };
}

function goHome() {
    view.value = 'home';
}

function onHomeSelectCollection(id: string | null) {
    activeCollectionId.value = id;
    view.value = 'browse';
}

function onHomeSelectFlagFilter(value: 'open' | 'needs_review' | 'question') {
    activeCollectionId.value = null;
    flagFilter.value = value;
    view.value = 'browse';
}

async function onAddCollection(name: string, parentId: string | null) {
    if (!name.trim()) return;
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    try {
        await addCollection(id, name.trim(), parentId);
    } catch (e) {
        // Don't reload on failure — reload()'s own success path clears
        // errorMessage, which would erase this error before the user
        // could read it, and nothing new was actually added anyway.
        errorMessage.value = e instanceof Error ? e.message : String(e);
        return;
    }
    await reload();
}
</script>

<template>
  <div class="layout">
    <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
    <Home
      v-if="view === 'home'"
      :collections="collections"
      :counts="counts"
      :open-flag-count="openFlagKeys.size"
      :needs-review-count="needsReviewKeys.size"
      :question-count="questionKeys.size"
      :unlicensed-count="licenseFlaggedKeys.size"
      :orphan-flags="orphanFlags"
      @flags-changed="reload"
      @select-collection="onHomeSelectCollection"
      @select-flag-filter="onHomeSelectFlagFilter"
    />
    <template v-else>
      <CollectionSidebar
        :collections="collections"
        :active-collection-id="activeCollectionId"
        :sheet-names="sheetNames"
        :active-sheet="activeSheet"
        :flag-filter="flagFilter"
        :animated-only="animatedOnly"
        :search-text="searchText"
        :counts="counts"
        :license-filter="licenseFilter"
        :sort-order="sortOrder"
        @go-home="goHome"
        @select-collection="(id) => activeCollectionId = id"
        @select-sheet="(sheet) => activeSheet = sheet"
        @select-flag="(v) => flagFilter = v"
        @toggle-animated-only="animatedOnly = !animatedOnly"
        @update-search="(v) => searchText = v"
        @select-sort="(v) => sortOrder = v"
        @add-collection="onAddCollection"
        @select-license="(v) => licenseFilter = v"
      />
      <SpriteGrid
        :sheets="sheets"
        :visible-keys="visibleKeys"
        :flagged-keys="openFlagKeys"
        :needs-review-keys="needsReviewKeys"
        :question-keys="questionKeys"
        :license-ok-keys="licenseOkKeys"
        :license-flagged-keys="licenseFlaggedKeys"
        :sort-order="sortOrder"
        @select="onSelect"
      />
    </template>
    <SpriteDetail
      v-if="selected"
      :sheet-png-filename="selected.sheetPngFilename"
      :entry-name="selected.entryName"
      :sheets="sheets"
      :collections="collections"
      :current-collection-id="collectionOf(selected.sheetPngFilename, selected.entryName)"
      :current-license="licenseOf(selected.sheetPngFilename, selected.entryName)"
      @close="selected = null"
      @reassigned="reload"
    />
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; overflow: hidden; background: #111; color: #eee; font-family: monospace; position: relative; }
.error-banner {
    position: absolute; top: 0; left: 0; right: 0; z-index: 10;
    background: #5a1f1f; color: #fdd; padding: 8px 16px; font-size: 13px;
}
</style>
