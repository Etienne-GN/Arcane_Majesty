<script setup lang="ts">
import { ref } from 'vue';
import { setFlagStatus, answerQuestion } from '../services/api';
import type { Flag, FlagStatus } from '../services/api';

// Flags whose sprite no longer exists in any catalogue. A fix that renames,
// splits or deletes an entry leaves its flag keyed to the old name, and the
// grid can only reach a flag through its sprite — so without this list those
// flags were counted on Home but impossible to open, approve or answer.
const emit = defineEmits<{ changed: [] }>();

const answerDrafts = ref<Record<string, string>>({});
const errorMessage = ref<string | null>(null);

async function run(action: () => Promise<void>) {
    try {
        await action();
        errorMessage.value = null;
        emit('changed');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    }
}

function onSetStatus(f: Flag, status: FlagStatus) {
    return run(() => setFlagStatus(f.id, status));
}

// Collapsed by default: these can't be looked at in the grid, so they're
// housekeeping, not the review queue.
const expanded = ref(false);
const props = defineProps<{ flags: Flag[] }>();

// There is no sprite left to evaluate, so the realistic action is to clear
// them all at once rather than approve ~100 blind one by one.
async function onDismissAll() {
    return run(async () => {
        for (const f of props.flags) await setFlagStatus(f.id, 'resolved');
    });
}

function onAnswer(f: Flag) {
    const answer = (answerDrafts.value[f.id] ?? '').trim();
    if (!answer) return;
    return run(async () => {
        await answerQuestion(f, answer);
        delete answerDrafts.value[f.id];
    });
}
</script>

<template>
  <div class="orphans">
    <div class="bar">
      <button class="toggle" @click="expanded = !expanded">
        {{ expanded ? '▾' : '▸' }} {{ flags.length }} old flag{{ flags.length === 1 ? '' : 's' }} on sprites that no longer exist
      </button>
      <button class="dismiss" @click="onDismissAll">Dismiss all</button>
    </div>
    <p v-if="expanded" class="hint">The sprite was renamed, split or removed by an earlier fix and there is nothing left to show. Dismiss them, or read the notes below.</p>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div v-for="f in (expanded ? flags : [])" :key="f.id" class="flag" :class="f.status">
      <div class="head">
        <span class="status">{{ f.status === 'needs_review' ? '🔍 review' : f.status === 'question' ? '❓ question' : '● open' }}</span>
        <span class="where">{{ f.sheet }} · <b>{{ f.name }}</b></span>
        <span class="reason">{{ f.reason }}</span>
      </div>
      <div v-if="f.comment" class="comment">{{ f.comment }}</div>
      <div v-if="f.claudeNote" class="question-note">❓ Claude {{ f.status === 'question' ? 'asks' : 'asked' }}: {{ f.claudeNote }}</div>
      <div v-if="f.status === 'question'" class="answer">
        <textarea v-model="answerDrafts[f.id]" placeholder="Your answer…" rows="2" />
        <button :disabled="!(answerDrafts[f.id] ?? '').trim()" @click="onAnswer(f)">Send answer</button>
      </div>
      <div class="actions">
        <button @click="onSetStatus(f, 'resolved')">✓ Approve</button>
        <button v-if="f.status !== 'open'" @click="onSetStatus(f, 'open')">↩ Rework</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orphans { margin: 32px 0; }
.bar { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.toggle { background: transparent; border: none; color: #888; padding: 0; font-size: 12px; }
.toggle:hover { color: #ccc; }
.hint { margin: 0 0 10px; color: #888; font-size: 12px; }
.error { color: #f99; font-size: 12px; margin-bottom: 8px; }
.flag { background: #1a1a1a; border: 1px solid #333; border-left-width: 3px; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; }
.flag.open { border-left-color: #a33; }
.flag.needs_review { border-left-color: #39c; }
.flag.question { border-left-color: #96c; }
.head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
.status { color: #aaa; }
.reason { color: #888; }
.comment { white-space: pre-wrap; color: #ccc; margin-top: 6px; }
.question-note { white-space: pre-wrap; color: #c9f; margin-top: 6px; }
.answer { display: flex; gap: 8px; margin-top: 6px; }
.answer textarea { flex: 1; font-family: inherit; font-size: 12px; background: #111; color: #eee; border: 1px solid #444; }
.actions { display: flex; gap: 8px; margin-top: 6px; }
button { font-family: inherit; font-size: 12px; cursor: pointer; background: #222; color: #eee; border: 1px solid #555; border-radius: 4px; padding: 3px 10px; }
button:disabled { opacity: 0.4; cursor: default; }
</style>
