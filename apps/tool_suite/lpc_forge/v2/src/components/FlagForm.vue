<script setup lang="ts">
import { computed } from 'vue'
import { FLAG_REASONS } from '@v2/model/gapFlags.js'
import { flagForm as f, submitFlagForm, gap } from '@v2/gapState'

const what = computed(() => {
  const who = f.options.find(o => o.key === f.key)?.label ?? 'the whole character'
  if (f.scope === 'item') return `${who}, in every motion`
  if (f.scope === 'motion') return `${who} — ${f.motion}`
  return `${who} — ${f.motion}, facing ${f.dir}, frame ${(f.frame ?? 0) + 1}${f.frames ? ` of ${f.frames}` : ''}`
})
</script>

<template>
  <div v-if="f.open" class="backdrop" @click.self="f.open = false" @keydown.esc="f.open = false">
    <form class="dialog" @submit.prevent="submitFlagForm">
      <h3>🚩 Flag for Claude</h3>
      <div class="body">
        <img v-if="f.snapshot" :src="f.snapshot" class="snap checker" alt="what you are flagging" />
        <div class="fields">
          <label>Component
            <select v-model="f.key">
              <option v-for="o in f.options" :key="o.key ?? 'whole'" :value="o.key">{{ o.label }}</option>
            </select>
          </label>
          <label>About
            <select v-model="f.scope">
              <option v-if="f.frame !== null" value="frame">this frame</option>
              <option v-if="f.motion" value="motion">the whole {{ f.motion }}</option>
              <option value="item">{{ f.key === null ? 'the character' : 'this component, every motion' }}</option>
            </select>
          </label>
          <label>Reason
            <select v-model="f.reason">
              <option v-for="r in FLAG_REASONS" :key="r" :value="r">{{ r.replace(/_/g, ' ') }}</option>
            </select>
          </label>
          <p class="what">{{ what }}</p>
        </div>
      </div>
      <textarea v-model="f.comment" rows="4" placeholder="What's wrong, or what should Claude do?" autofocus />
      <p v-if="gap.error" class="err">{{ gap.error }}</p>
      <div class="acts">
        <button type="button" @click="f.open = false">Cancel</button>
        <button type="submit" class="primary" :disabled="!f.comment.trim()">Flag it</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: #0009; display: grid; place-items: center; z-index: 50; }
.dialog { background: var(--panel); border: 1px solid var(--border-strong); border-radius: 8px; padding: 14px 16px; width: min(560px, 94vw); display: flex; flex-direction: column; gap: 10px; }
.dialog h3 { margin: 0; color: var(--text); font-size: 14px; text-transform: none; letter-spacing: 0; }
.body { display: flex; gap: 12px; }
.snap { width: 192px; height: 192px; image-rendering: pixelated; border-radius: var(--radius); flex: none; }
.fields { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
.fields label { display: flex; flex-direction: column; gap: 3px; color: var(--muted); font-size: 12px; }
.what { margin: 0; font-size: 12px; color: var(--accent); }
textarea { font: inherit; color: var(--text); background: var(--panel-2); border: 1px solid var(--border-strong); border-radius: var(--radius); padding: 8px; }
.acts { display: flex; justify-content: flex-end; gap: 8px; }
.primary { border-color: var(--accent); }
.err { color: var(--missing); margin: 0; }
</style>
