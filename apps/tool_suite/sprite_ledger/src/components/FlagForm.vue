<script setup lang="ts">
import { ref } from 'vue';
import { addFlag } from '../services/api';

const props = defineProps<{ sheetPngFilename: string; entryName: string }>();
const emit = defineEmits<{ submitted: [] }>();

const REASONS: { id: string; label: string }[] = [
    { id: 'misaligned', label: 'Misaligned / wrong crop' },
    { id: 'should_be_animation', label: 'Should be an animation' },
    { id: 'wrong_colors', label: 'Wrong colors / palette' },
    { id: 'wrong_name', label: 'Wrong name' },
    { id: 'duplicate', label: 'Duplicate of another sprite' },
    { id: 'wrong_collection', label: "Doesn't belong in this collection" },
    { id: 'broken_image', label: 'Broken / corrupted image' },
    { id: 'other', label: 'Other' },
];

const comment = ref('');
const submitting = ref(false);
const errorMessage = ref<string | null>(null);

async function submitWithReason(reasonId: string) {
    submitting.value = true;
    errorMessage.value = null;
    try {
        await addFlag(props.sheetPngFilename, props.entryName, reasonId, comment.value);
        comment.value = '';
        emit('submitted');
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e);
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
  <div class="flag-form">
    <h4>Flag this sprite</h4>
    <div class="reasons">
      <button
        v-for="r in REASONS"
        :key="r.id"
        :disabled="submitting"
        @click="submitWithReason(r.id)"
        :class="{ animation: r.id === 'should_be_animation' }"
      >
        {{ r.label }}
      </button>
    </div>
    <p class="hint">
      “Should be an animation” needs a frame count to be actionable — the strip
      has to divide evenly, and that can't be read off the crop. Put it in the
      comment first, e.g. <em>4 frames, left to right, ~120ms each</em>.
    </p>
    <textarea
      v-model="comment"
      placeholder="Optional comment — describe what's wrong (you can add this with or without picking a reason above)"
      rows="3"
    />
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
  </div>
</template>

<style scoped>
.flag-form { margin-top: 16px; padding-top: 12px; border-top: 1px solid #333; }
.reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.reasons button { font-size: 11px; padding: 4px 8px; }
.reasons button.animation { border-color: #85c; color: #b8f; }
.hint { font-size: 10px; color: #777; margin: 0 0 6px; line-height: 1.4; }
.hint em { color: #b8f; font-style: normal; }
textarea { width: 100%; box-sizing: border-box; }
.error { color: #e88; font-size: 11px; margin-top: 4px; }
</style>
