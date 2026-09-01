<script setup lang="ts">
import type { Collection } from '../services/api';

const props = defineProps<{
    collections: Collection[];
    activeCollectionId: string | null; // null = "All"
    sheetNames: string[]; // distinct sheetPngFilename values, for the sheet filter
    activeSheet: string | null; // null = "All sheets"
    flaggedOnly: boolean;
    searchText: string;
    counts: Record<string, number>; // collection id -> sprite count, 'all' -> total
}>();

const emit = defineEmits<{
    selectCollection: [id: string | null];
    selectSheet: [sheet: string | null];
    toggleFlaggedOnly: [];
    updateSearch: [value: string];
}>();
</script>

<template>
  <aside class="sidebar">
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

    <label class="flagged-toggle">
      <input type="checkbox" :checked="flaggedOnly" @change="emit('toggleFlaggedOnly')" />
      Flagged only
    </label>

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
  </aside>
</template>

<style scoped>
.sidebar { width: 220px; padding: 12px; border-right: 1px solid #333; }
.search { width: 100%; margin-bottom: 8px; }
.sheet-filter { width: 100%; margin-bottom: 8px; background: #1a1a1a; color: #eee; border: 1px solid #333; padding: 4px; }
.flagged-toggle { display: block; margin-bottom: 12px; font-size: 13px; }
.collections { list-style: none; padding: 0; margin: 0; }
.collections li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.collections li:hover { background: #2a2a2a; }
.collections li.active { background: #3a3a5a; font-weight: bold; }
</style>
