<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { FLAG_STATUSES, describeFlag, flagTarget } from '@v2/model/gapFlags.js'
import { flags, refreshFlags, setFlagStatus, gap } from '@v2/gapState'
import { labelForKey } from '@v2/flagging'
import { store, loadComposition } from '@v2/store'
import { castList } from '@v2/castState'

const status = ref<string>('active')
const STATUS_WORD: Record<string, string> = { open: 'for Claude', needs_review: 'your turn', question: 'Claude asks', resolved: 'resolved' }
const shown = computed(() => [...flags.value]
  .filter(f => status.value === 'all' || (status.value === 'active' ? f.status !== 'resolved' : f.status === status.value))
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))))
const counts = computed(() => Object.fromEntries(FLAG_STATUSES.map(s => [s, flags.value.filter(f => f.status === s).length])))
const replies = reactive<Record<string, string>>({})
const title = (f: any) => describeFlag(f, f.key ? labelForKey(f.key) : (castList.value.find(c => c.id === f.cast)?.name ?? f.cast))

/** Open the flagged character on the stage, at the flagged motion/direction. */
function show(f: any) {
  if (f.comp) loadComposition(f.comp)
  if (f.motion) store.motion = f.motion
  if (f.dir) store.dir = f.dir
  store.view = flagTarget(f) === 'frame' ? 'single' : store.view
  store.playing = flagTarget(f) !== 'frame'
  store.screen = 'forge'
}
onMounted(refreshFlags)
</script>

<template>
  <div class="inbox">
    <div class="bar">
      <h2>Flags</h2>
      <button :class="{ active: status === 'active' }" @click="status = 'active'">Active</button>
      <button v-for="s in FLAG_STATUSES" :key="s" :class="{ active: status === s }" @click="status = s">
        {{ STATUS_WORD[s] }} <small>{{ counts[s] }}</small>
      </button>
      <button :class="{ active: status === 'all' }" @click="status = 'all'">All</button>
      <span class="hint">Flag from the stage (🚩 on a frame or a layer) or a Gaps cell. Then tell Claude “process the Forge flags”.</span>
      <span v-if="gap.error" class="err">{{ gap.error }}</span>
    </div>
    <div class="list">
      <article v-for="f in shown" :key="f.id" class="flag" :class="f.status">
        <img v-if="f.snapshot" :src="f.snapshot" class="snap checker" alt="" />
        <div v-else class="snap none">no snapshot</div>
        <div class="main">
          <div class="head">
            <strong>{{ title(f) }}</strong>
            <span class="chip" :class="f.status">{{ STATUS_WORD[f.status] }}</span>
            <span class="muted">{{ f.reason.replace(/_/g, ' ') }} · {{ String(f.createdAt).slice(0, 16).replace('T', ' ') }}</span>
          </div>
          <pre>{{ f.comment }}</pre>
          <textarea v-model="replies[f.id]" rows="2" placeholder="Reply…" />
          <div class="acts">
            <button v-if="f.comp || f.motion" @click="show(f)">Show on stage</button>
            <button v-for="st in FLAG_STATUSES.filter(x => x !== f.status)" :key="st"
                    @click="setFlagStatus(f.id, st, replies[f.id] ?? ''); replies[f.id] = ''">
              {{ st === 'open' ? (f.status === 'resolved' ? 'Reopen' : 'Back to Claude') : st === 'needs_review' ? 'Needs review' : st === 'question' ? 'Ask Claude' : 'Resolve' }}
            </button>
            <button v-if="replies[f.id]?.trim()" @click="setFlagStatus(f.id, f.status, replies[f.id]); replies[f.id] = ''">Reply</button>
          </div>
        </div>
      </article>
      <p v-if="!shown.length" class="muted">No flags here.</p>
    </div>
  </div>
</template>

<style scoped>
.inbox { grid-column: 1 / -1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.bar { display: flex; gap: 6px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bar h2 { margin: 0 8px 0 0; font-size: 16px; }
.bar small { color: var(--muted); font-family: var(--font-mono); }
.hint { color: var(--muted); font-size: 11px; margin-left: auto; }
.list { overflow: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.flag { display: flex; gap: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; }
.flag.resolved { opacity: .6; }
.snap { width: 144px; height: 144px; image-rendering: pixelated; border-radius: var(--radius); flex: none; }
.snap.none { display: grid; place-items: center; color: var(--faint); background: var(--panel-2); font-size: 11px; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.chip { font-size: 11px; padding: 1px 6px; border-radius: 10px; border: 1px solid var(--border-strong); }
.chip.open { color: #ff6464; border-color: #ff6464; }
.chip.needs_review { color: #4aa3ff; border-color: #4aa3ff; }
.chip.question { color: #b37cff; border-color: #b37cff; }
.chip.resolved { color: var(--ok); border-color: var(--ok); }
pre { white-space: pre-wrap; font-family: var(--font-ui); margin: 0; }
textarea { font: inherit; color: var(--text); background: var(--panel-2); border: 1px solid var(--border-strong); border-radius: var(--radius); padding: 6px; }
.acts { display: flex; gap: 6px; flex-wrap: wrap; }
.acts button { padding: 2px 8px; font-size: 12px; }
.muted { color: var(--muted); font-size: 12px; }
.err { color: var(--missing); }
</style>
