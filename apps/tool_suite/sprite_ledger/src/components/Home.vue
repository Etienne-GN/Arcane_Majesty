<script setup lang="ts">
import { computed } from 'vue';
import type { Collection } from '../services/api';
import { flattenTree } from '../services/collectionTree';

const props = defineProps<{
    collections: Collection[];
    counts: Record<string, number>; // collection id -> count (rolled up over children), 'all' -> total
    openFlagCount: number;
    needsReviewCount: number;
    questionCount: number;
    unlicensedCount: number;
}>();

const emit = defineEmits<{
    // null selects "All" (still fully filterable from there — see App.vue)
    selectCollection: [id: string | null];
    // Jumps into "All" pre-filtered to one flag status.
    selectFlagFilter: [value: 'open' | 'needs_review' | 'question'];
}>();

// Same pre-order, depth-annotated hierarchy the sidebar tree uses, so a
// parent/child pair reads as related here too instead of two unrelated
// cards with suspiciously overlapping counts.
const tree = computed(() => flattenTree(props.collections));
</script>

<template>
  <div class="home">
    <h1>Sprite Ledger</h1>
    <p class="subtitle">{{ counts.all ?? 0 }} sprites catalogued across {{ collections.length }} collections.</p>

    <!-- The review workflow's actual queue — the thing that actually needs
         looking at today, front and center instead of buried in a dropdown. -->
    <div class="flag-callouts">
      <button
        class="callout question"
        :disabled="questionCount === 0"
        @click="emit('selectFlagFilter', 'question')"
      >
        ❓ <span class="count">{{ questionCount }}</span> Claude {{ questionCount === 1 ? 'has a question' : 'questions' }} for you
      </button>
      <button
        class="callout open"
        :disabled="openFlagCount === 0"
        @click="emit('selectFlagFilter', 'open')"
      >
        <span class="count">{{ openFlagCount }}</span> open flag{{ openFlagCount === 1 ? '' : 's' }}
      </button>
      <button
        class="callout review"
        :disabled="needsReviewCount === 0"
        @click="emit('selectFlagFilter', 'needs_review')"
      >
        🔍 <span class="count">{{ needsReviewCount }}</span> awaiting your review
      </button>
      <span v-if="unlicensedCount > 0" class="callout-note">⚠ {{ unlicensedCount }} flagged unlicensed</span>
    </div>

    <div class="section-label">Browse</div>
    <div class="cards">
      <button class="card all" @click="emit('selectCollection', null)">
        <div class="name">All</div>
        <div class="count">{{ counts.all ?? 0 }}</div>
      </button>
      <button
        v-for="c in tree"
        :key="c.id"
        class="card"
        :class="{ child: c.depth > 0 }"
        @click="emit('selectCollection', c.id)"
      >
        <div class="name">{{ c.depth > 0 ? '↳ ' : '' }}{{ c.name }}</div>
        <div class="count">{{ counts[c.id] ?? 0 }}</div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.home { padding: 32px 40px; overflow-y: auto; flex: 1; }
h1 { margin: 0 0 4px; font-size: 22px; }
.subtitle { margin: 0 0 24px; color: #999; font-size: 13px; }

.flag-callouts { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
.callout {
    font-family: inherit; font-size: 13px; cursor: pointer;
    background: #1a1a1a; border: 1px solid #444; border-radius: 6px;
    color: #eee; padding: 10px 16px;
}
.callout:disabled { opacity: 0.4; cursor: default; }
.callout:not(:disabled):hover { border-color: #77a; background: #202030; }
.callout .count { font-weight: bold; font-size: 15px; }
.callout.open { border-color: #a33; }
.callout.review { border-color: #39c; }
.callout.question { border-color: #96c; }
.callout-note { font-size: 12px; color: #e91; }

.section-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; margin-bottom: 10px; }
.cards { display: flex; flex-wrap: wrap; gap: 10px; }
.card {
    font-family: inherit; text-align: left; cursor: pointer;
    background: #1a1a1a; border: 1px solid #333; border-radius: 6px;
    color: #eee; padding: 12px 16px; min-width: 160px;
}
.card:hover { border-color: #77a; background: #202030; }
.card.child { min-width: 130px; padding: 8px 12px; opacity: 0.9; border-style: dashed; }
.card.all { border-color: #556; background: #1a1a26; }
.card .name { font-size: 13px; margin-bottom: 6px; }
.card .count { font-size: 18px; font-weight: bold; color: #aab; }
</style>
