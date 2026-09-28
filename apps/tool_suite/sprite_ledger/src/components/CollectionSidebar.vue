<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Collection } from '../services/api';
import { flattenTree } from '../services/collectionTree';

const props = defineProps<{
    collections: Collection[];
    activeCollectionId: string | null; // null = "All"
    sheetNames: string[]; // distinct sheetPngFilename values, for the sheet filter
    activeSheet: string | null; // null = "All sheets"
    flagFilter: 'all' | 'flagged' | 'open' | 'needs_review' | 'question';
    animatedOnly: boolean;
    searchText: string;
    sortOrder: 'name' | 'sheet';
    // collection id -> sprite count, rolled up over descendants; 'all' -> total.
    counts: Record<string, number>;
    licenseFilter: 'all' | 'ok' | 'unlicensed' | 'unmarked';
    physicsFilter: 'all' | 'unset' | 'proposed' | 'approved' | 'no_hitbox';
}>();

const newName = ref('');
const newParentId = ref('');

const emit = defineEmits<{
    goHome: [];
    selectCollection: [id: string | null];
    selectSheet: [sheet: string | null];
    selectFlag: [value: 'all' | 'flagged' | 'open' | 'needs_review' | 'question'];
    toggleAnimatedOnly: [];
    updateSearch: [value: string];
    selectSort: [value: 'name' | 'sheet'];
    addCollection: [name: string, parentId: string | null];
    selectLicense: [value: 'all' | 'ok' | 'unlicensed' | 'unmarked'];
    selectPhysics: [value: 'all' | 'unset' | 'proposed' | 'approved' | 'no_hitbox'];
}>();

// Pre-order, depth-annotated so the tree and the "parent" picker below both
// read the hierarchy the same way a real tree view would — each root
// immediately followed by its descendants, indented one step per level.
const tree = computed(() => flattenTree(props.collections));

function onAddSubmit() {
    emit('addCollection', newName.value, newParentId.value || null);
    newName.value = '';
    newParentId.value = '';
}
</script>

<template>
  <aside class="sidebar">
    <button class="home-link" @click="emit('goHome')">🏠 Home</button>
    <input
      class="search"
      type="text"
      placeholder="Search sprite names..."
      :value="searchText"
      @input="emit('updateSearch', ($event.target as HTMLInputElement).value)"
    />

    <select
      class="sheet-filter"
      :value="activeSheet ?? ''"
      @change="emit('selectSheet', ($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">All sheets</option>
      <option v-for="name in sheetNames" :key="name" :value="name">{{ name }}</option>
    </select>

    <select
      class="flag-filter"
      :value="flagFilter"
      @change="emit('selectFlag', ($event.target as HTMLSelectElement).value as 'all' | 'flagged' | 'open' | 'needs_review' | 'question')"
    >
      <option value="all">Any flag status</option>
      <option value="flagged">Flagged (open, needs review, or question)</option>
      <option value="open">● Open — not acted on yet</option>
      <option value="needs_review">🔍 Needs your review</option>
      <option value="question">❓ Claude has a question</option>
    </select>

    <label class="flagged-toggle animated">
      <input type="checkbox" :checked="animatedOnly" @change="emit('toggleAnimatedOnly')" />
      ▶ Animated only
    </label>

    <select
      class="license-filter"
      :value="licenseFilter"
      @change="emit('selectLicense', ($event.target as HTMLSelectElement).value as 'all' | 'ok' | 'unlicensed' | 'unmarked')"
    >
      <option value="all">Any license status</option>
      <option value="ok">✓ Licensed OK</option>
      <option value="unlicensed">⚠ Flagged unlicensed</option>
      <option value="unmarked">Unmarked</option>
    </select>

    <select
      class="physics-filter"
      :value="physicsFilter"
      title="Collision box and draw layer"
      @change="emit('selectPhysics', ($event.target as HTMLSelectElement).value as 'all' | 'unset' | 'proposed' | 'approved' | 'no_hitbox')"
    >
      <option value="all">Any hitbox status</option>
      <option value="unset">Hitbox / layer not set</option>
      <option value="proposed">🤖 Hitbox guessed, to review</option>
      <option value="approved">✓ Hitbox approved</option>
      <option value="no_hitbox">🚫 No hitbox</option>
    </select>

    <select
      class="sort-order"
      :value="sortOrder"
      title="Order sprites within the grid"
      @change="emit('selectSort', ($event.target as HTMLSelectElement).value as 'name' | 'sheet')"
    >
      <option value="name">Sort: name</option>
      <option value="sheet">Sort: sheet position</option>
    </select>

    <ul class="collections">
      <li
        :class="{ active: activeCollectionId === null }"
        @click="emit('selectCollection', null)"
      >
        All ({{ counts.all ?? 0 }})
      </li>
      <li
        v-for="c in tree"
        :key="c.id"
        :class="{ active: activeCollectionId === c.id }"
        :style="{ paddingLeft: `${8 + c.depth * 14}px` }"
        @click="emit('selectCollection', c.id)"
      >
        {{ c.name }} ({{ counts[c.id] ?? 0 }})
      </li>
    </ul>

    <form class="add-collection" @submit.prevent="onAddSubmit">
      <input v-model="newName" placeholder="New collection name" />
      <select v-model="newParentId" class="parent-picker">
        <option value="">(top level)</option>
        <option v-for="c in tree" :key="c.id" :value="c.id">{{ '—'.repeat(c.depth) }} {{ c.name }}</option>
      </select>
      <button type="submit">Add</button>
    </form>
  </aside>
</template>

<style scoped>
/* The layout's flex container never gave the sidebar its own scroll —
   past a couple dozen collections (now worse with sub-collections nested
   in) the add-collection form at the bottom was simply clipped, not
   reachable by any scroll. flex-shrink:0 keeps SpriteGrid's flex:1 from
   squeezing this instead of the intended fixed width. */
.sidebar { width: 220px; flex-shrink: 0; padding: 12px; border-right: 1px solid #333; height: 100vh; overflow-y: auto; box-sizing: border-box; }
.home-link {
    display: block; width: 100%; margin-bottom: 12px; text-align: left;
    font-family: inherit; font-size: 13px; cursor: pointer;
    background: #1a1a1a; border: 1px solid #333; border-radius: 4px;
    color: #eee; padding: 6px 8px;
}
.home-link:hover { border-color: #77a; background: #202030; }
.search { width: 100%; margin-bottom: 8px; }
.sheet-filter { width: 100%; margin-bottom: 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
.license-filter { width: 100%; margin-bottom: 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
.flagged-toggle.animated { color: #b8f; }
.flag-filter { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
.flagged-toggle { display: block; margin-bottom: 12px; font-size: 13px; }
.physics-filter { width: 100%; margin-bottom: 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
.sort-order { width: 100%; margin-bottom: 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
.collections { list-style: none; padding: 0; margin: 0; }
.collections li { padding: 6px 8px; cursor: pointer; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.collections li:hover { background: #2a2a2a; }
.collections li.active { background: #3a3a5a; font-weight: bold; }
.add-collection { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 12px; }
.add-collection input { flex: 1; min-width: 0; }
.add-collection .parent-picker { flex-basis: 100%; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
</style>
