<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Flag } from '@shared/api';
import { keyOf, approveReview, sendBack, sendBackFlag, answerQuestion, setFlagStatus } from '../store';

// One flag shown as a conversation. The flag's `comment` is a running thread
// written by both sides: the report, then "[Claude] …", "[Rework] …" and
// "[Answer to Claude's question] …" paragraphs. Paragraphs without a marker
// continue the bubble before them.
// `stale` (sprite gone) and zone flags (no sprite) act on the flag itself.
const props = defineProps<{ flag: Flag; stale?: boolean }>();
const detached = computed(() => props.stale || !!props.flag.region);

interface Bubble { who: 'you' | 'claude'; tag: string; text: string }
const REASONS: Record<string, string> = {
    misaligned: 'Misaligned / wrong crop', should_be_animation: 'Should be an animation', wrong_colors: 'Wrong colors',
    wrong_name: 'Wrong name', duplicate: 'Duplicate', wrong_collection: 'Wrong collection', broken_image: 'Broken image',
    other: 'Other', new_from_split: 'New from a split',
};
const bubbles = computed<Bubble[]>(() => {
    const out: Bubble[] = [];
    for (const raw of (props.flag.comment ?? '').split(/\n\s*\n/)) {
        const p = raw.trim();
        if (!p) continue;
        let m: RegExpMatchArray | null;
        if ((m = p.match(/^\[Claude\]\s*([\s\S]*)/))) out.push({ who: 'claude', tag: 'Claude', text: m[1] });
        else if ((m = p.match(/^\[Rework\]\s*([\s\S]*)/))) out.push({ who: 'you', tag: 'You · sent back', text: m[1] });
        else if ((m = p.match(/^\[Answer to Claude's question\]\s*([\s\S]*)/))) out.push({ who: 'you', tag: 'You · answer', text: m[1] });
        else if (out.length) out[out.length - 1].text += `\n\n${p}`;
        else out.push({ who: 'you', tag: 'You', text: p });
    }
    if (props.flag.claudeNote) {
        out.push({ who: 'claude', tag: props.flag.status === 'question' ? 'Claude asks' : 'Claude asked', text: props.flag.claudeNote });
    }
    return out;
});

const STATUS: Record<string, { label: string; cls: string }> = {
    needs_review: { label: 'To review', cls: 'review' }, question: { label: 'Question', cls: 'question' },
    open: { label: 'Open for Claude', cls: 'open' }, resolved: { label: 'Resolved', cls: 'approved' },
};
const key = computed(() => keyOf(props.flag.sheet, props.flag.name ?? ''));
const note = ref('');
const answer = ref('');
</script>

<template>
  <div class="thread">
    <div class="head">
      <span class="status" :class="STATUS[flag.status].cls">{{ STATUS[flag.status].label }}</span>
      <span class="reason">{{ REASONS[flag.reason] ?? flag.reason }}</span>
      <span class="muted date">{{ flag.createdAt.slice(0, 10) }}</span>
    </div>
    <div v-if="stale" class="muted where mono">{{ flag.sheet }} · {{ flag.name }}</div>
    <div class="bubbles">
      <div v-for="(b, i) in bubbles" :key="i" class="bubble" :class="b.who">
        <div class="who">{{ b.tag }}</div>
        <div class="text">{{ b.text }}</div>
      </div>
      <div v-if="!bubbles.length" class="muted small">No comment.</div>
    </div>

    <div v-if="flag.status === 'needs_review'" class="actions">
      <button class="primary" @click="detached ? setFlagStatus(flag, 'resolved', 'Approved') : approveReview([key])">✓ Approve <kbd>A</kbd></button>
      <div class="rework">
        <textarea v-model="note" rows="2" placeholder="What's still wrong? (optional)" :data-rework="flag.id" />
        <button @click="detached ? sendBackFlag(flag, note) : sendBack([key], note); note = ''">↩ Send back <kbd>R</kbd></button>
      </div>
    </div>
    <div v-else-if="flag.status === 'question'" class="actions">
      <textarea v-model="answer" rows="2" placeholder="Your answer for Claude…" @keydown.ctrl.enter="answer.trim() && answerQuestion(flag, answer)" />
      <div class="row">
        <button class="primary" :disabled="!answer.trim()" @click="answerQuestion(flag, answer); answer = ''">Send answer <kbd>Ctrl ↵</kbd></button>
        <button class="ghost" @click="setFlagStatus(flag, 'resolved', 'Resolved without answering')">Resolve without answering</button>
      </div>
    </div>
    <div v-else-if="flag.status === 'open'" class="actions row">
      <span class="muted small">Waiting for Claude.</span>
      <button class="ghost" @click="setFlagStatus(flag, 'resolved', 'Flag closed')">Close flag</button>
    </div>
  </div>
</template>

<style scoped>
.thread { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; background: var(--panel-2); display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.status { font-size: 11px; padding: 1px 7px; border-radius: 10px; border: 1px solid; }
.status.review { color: var(--s-review); border-color: var(--s-review); }
.status.question { color: var(--s-question); border-color: var(--s-question); }
.status.open { color: var(--s-open); border-color: var(--s-open); }
.status.approved { color: var(--s-approved); border-color: var(--s-approved); }
.date { margin-left: auto; font-size: 11px; }
.where { font-size: 11px; }
.bubbles { display: flex; flex-direction: column; gap: 6px; }
.bubble { border-radius: 8px; padding: 6px 9px; max-width: 94%; font-size: 12px; line-height: 1.45; }
.bubble.you { align-self: flex-end; background: #25324a; }
.bubble.claude { align-self: flex-start; background: var(--raised); }
.who { font-size: 10px; color: var(--muted); margin-bottom: 2px; }
.text { white-space: pre-wrap; word-break: break-word; }
.actions { display: flex; flex-direction: column; gap: 6px; }
.rework { display: flex; flex-direction: column; gap: 4px; }
.row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.small { font-size: 11px; }
textarea { width: 100%; }
</style>
