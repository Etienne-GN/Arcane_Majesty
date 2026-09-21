<script setup lang="ts">
import { ref } from 'vue';
import type { Collection } from '../services/api';

const props = defineProps<{
    collections: Collection[];
    activeCollectionId: string | null; // null = "All"
    sheetNames: string[]; // distinct sheetPngFilename values, for the sheet filter
    activeSheet: string | null; // null = "All sheets"
    flagFilter: 'all' | 'flagged' | 'open' | 'needs_review';
    animatedOnly: boolean;
    searchText: string;
    counts: Record<string, number>; // collection id -> sprite count, 'all' -> total
    licenseFilter: 'all' | 'ok' | 'unlicensed' | 'unmarked';
}>();

const newName = ref('');

const emit = defineEmits<{
    goHome: [];
    selectCollection: [id: string | null];
    selectSheet: [sheet: string | null];
    selectFlag: [value: 'all' | 'flagged' | 'open' | 'needs_review'];
    toggleAnimatedOnly: [];
    updateSearch: [value: string];
    addCollection: [name: string];
    selectLicense: [value: 'all' | 'ok' | 'unlicensed' | 'unmarked'];
}>();
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
      @change="emit('selectFlag', ($event.target as HTMLSelectElement).value as 'all' | 'flagged' | 'open' | 'needs_review')"
    >
      <option value="all">Any flag status</option>
      <option value="flagged">Flagged (open or needs review)</option>
      <option value="open">● Open — not acted on yet</option>
      <option value="needs_review">🔍 Needs your review</option>
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

    <ul class="collections">
      <li
        :class="{ active: activeCollectionId === null }"
        @click="emit('selectCollection', null)"
      >
        All ({{ counts.all ?? 0 }})
      </li>
      <li
        v-for="c in collections"
        :key="c.id"
        :class="{ active: activeCollectionId === c.id }"
        @click="emit('selectCollection', c.id)"
      >
        {{ c.name }} ({{ counts[c.id] ?? 0 }})
      </li>
    </ul>

    <form class="add-collection" @submit.prevent="() => { emit('addCollection', newName); newName = ''; }">
      <input v-model="newName" placeholder="New collection name" />
      <button type="submit">Add</button>
    </form>
  </aside>
</template>

<style scoped>
.sidebar { width: 220px; padding: 12px; border-right: 1px solid #333; }
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
.collections { list-style: none; padding: 0; margin: 0; }
.collections li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.collections li:hover { background: #2a2a2a; }
.collections li.active { background: #3a3a5a; font-weight: bold; }
.add-collection { display: flex; gap: 4px; margin-top: 12px; }
.add-collection input { flex: 1; min-width: 0; }
</style>
