<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { ruleFor, ruleKey } from '@game/systems/motionRules.js'
import { matrixRows, cellMode, filterRows } from '@v2/model/gapMatrix.js'
import { layersFor } from '@v2/model/composition.js'
import { FLAG_REASONS } from '@v2/model/gapFlags.js'
import { DIRS } from '@v2/render/frames.js'
import CharacterCanvas from './CharacterCanvas.vue'
import { store, catalogue } from '@v2/store'
import { castList, refreshCast } from '@v2/castState'
import { gap, flags, refreshFlags, addFlag, setFlagStatus, saveRule } from '@v2/gapState'

const ALL_ROWS = matrixRows(catalogue)
const SLOTS = [...new Set(ALL_ROWS.map(r => r.slot))]
const SHORT: Record<string, string> = { backslash: 'bslash', halfslash: 'hslash', spellcast: 'spell', combat_idle: 'c.idle' }

const f = reactive({ slot: '', q: '', onlyGaps: true, worn: 'all' as 'all' | 'cast' | 'published' })
const limit = ref(150)

// Rule keys worn by the cast (or only published members), for the "worn by" filter.
const wornKeys = computed(() => {
  if (f.worn === 'all') return undefined
  const s = new Set<string>()
  for (const c of castList.value) {
    if (f.worn === 'published' && !c.published) continue
    for (const l of c.layers ?? []) s.add(ruleKey(l))
  }
  return s
})
const rows = computed(() => filterRows(ALL_ROWS, { slot: f.slot, q: f.q, onlyGaps: f.onlyGaps, keys: wornKeys.value }, store.rules))
const shown = computed(() => rows.value.slice(0, limit.value))
const colGaps = computed(() => Object.fromEntries(DEFAULT_ANIMS.map((m: string) =>
  [m, rows.value.filter(r => cellMode(r, m, store.rules) !== 'own').length])))

const openFlags = computed(() => {
  const s = new Set<string>()
  for (const fl of flags.value) if (fl.status !== 'resolved') s.add(`${fl.key}#${fl.motion}`)
  return s
})

// ── selected cell ──
const sel = ref<{ row: any; motion: string } | null>(null)
const selRule = computed(() => sel.value ? ruleFor(sel.value.row.layer, sel.value.motion, store.rules) : null)
const ownMotions = computed(() => sel.value ? DEFAULT_ANIMS.filter((m: string) => m !== sel.value!.motion && cellMode(sel.value!.row, m, {}) === 'own') : [])
const choice = reactive({ rule: 'fallback', from: 'walk' })
function select(row: any, motion: string) {
  sel.value = { row, motion }
  const r = ruleFor(row.layer, motion, store.rules)
  choice.rule = r.rule === 'own' ? 'own' : r.rule
  choice.from = r.rule === 'borrow' ? r.from : (ownMotions.value.includes('walk') ? 'walk' : ownMotions.value[0] ?? 'walk')
}
// The current character wearing the selected item (its whole item: main + companions).
const previewLayers = computed(() => {
  if (!sel.value) return []
  return layersFor(catalogue, { name: '', sel: { ...store.comp.sel, [sel.value.row.slot]: { id: sel.value.row.entryId } } })
})
const cellFlags = computed(() => sel.value ? flags.value.filter(x => x.key === sel.value!.row.key && x.motion === sel.value!.motion) : [])
const draft = reactive({ reason: 'needs_art', comment: '' })
async function submitFlag() {
  if (!sel.value) return
  await addFlag(sel.value.row.key, sel.value.motion, draft.reason, draft.comment)
  draft.comment = ''
}
function applyRule() {
  if (!sel.value) return
  const rule = choice.rule === 'hide' ? { rule: 'hide' } : choice.rule === 'borrow' ? { rule: 'borrow', from: choice.from } : null
  saveRule(sel.value.row.key, sel.value.motion, rule)
}

onMounted(() => { refreshFlags(); if (!castList.value.length) refreshCast() })
</script>

<template>
  <div class="gaps">
    <div class="bar">
      <h2>Gaps</h2>
      <select v-model="f.slot" aria-label="Slot"><option value="">all slots</option><option v-for="s in SLOTS" :key="s" :value="s">{{ s.replace(/_/g, ' ') }}</option></select>
      <input v-model="f.q" placeholder="Search items…" />
      <label><input type="checkbox" v-model="f.onlyGaps" /> only items with gaps</label>
      <select v-model="f.worn" aria-label="Worn by">
        <option value="all">all items</option><option value="cast">worn by the cast</option><option value="published">worn by published cast</option>
      </select>
      <span class="muted">{{ rows.length }} layers</span>
      <span class="legend"><i class="own" /> own art <i class="fallback" /> walk frames <i class="borrow" /> borrowed <i class="hide" /> hidden <i class="flag" /> open flag</span>
      <span v-if="gap.error" class="err">{{ gap.error }}</span>
    </div>
    <div class="body">
      <div class="table">
        <table>
          <thead>
            <tr><th class="lbl">item</th><th v-for="m in DEFAULT_ANIMS" :key="m" :title="`${colGaps[m]} layers without own art`">{{ SHORT[m] ?? m.replace('_', ' ') }}<small>{{ colGaps[m] || '' }}</small></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="r.key">
              <td class="lbl" :title="r.key"><span class="slot">{{ r.slot.replace(/_/g, ' ') }}</span> {{ r.label }}</td>
              <td v-for="m in DEFAULT_ANIMS" :key="m" class="cell"
                  :class="[cellMode(r, m, store.rules), { sel: sel?.row.key === r.key && sel?.motion === m }]"
                  :title="`${r.label} — ${m}: ${cellMode(r, m, store.rules)}`" @click="select(r, m)">
                <i v-if="openFlags.has(`${r.key}#${m}`)" class="fl" />
              </td>
            </tr>
          </tbody>
        </table>
        <button v-if="rows.length > limit" class="more" @click="limit += 300">Show more ({{ rows.length - limit }} left)</button>
      </div>

      <aside v-if="sel" class="panel">
        <h3>{{ sel.row.label }} — {{ sel.motion.replace('_', ' ') }}</h3>
        <p class="muted mono">{{ sel.row.key }}</p>
        <div class="previews checker">
          <CharacterCanvas v-for="d in DIRS" :key="d" :layers="previewLayers" :motion="sel.motion" :dir="d" :scale="2" missing-overlay />
        </div>
        <template v-if="selRule?.rule === 'own'">
          <p class="ok">This item has its own {{ sel.motion }} art.</p>
        </template>
        <template v-else>
          <h3>When the character plays {{ sel.motion }}</h3>
          <label class="opt"><input type="radio" value="fallback" v-model="choice.rule" /> play its walk frames <span class="muted">(default)</span></label>
          <label class="opt"><input type="radio" value="hide" v-model="choice.rule" /> hide it</label>
          <label class="opt" :class="{ off: !ownMotions.length }"><input type="radio" value="borrow" v-model="choice.rule" :disabled="!ownMotions.length" />
            borrow frames from
            <select v-model="choice.from" :disabled="choice.rule !== 'borrow'"><option v-for="m in ownMotions" :key="m" :value="m">{{ m }}</option></select>
            <span class="muted">(retimed)</span></label>
          <button class="primary" :disabled="gap.saving" @click="applyRule">Save rule for the game</button>
          <p class="muted small">Applies to every character wearing this item. Custom art for the motion comes with the motion workshop.</p>
        </template>

        <h3>Flags</h3>
        <div v-for="fl in cellFlags" :key="fl.id" class="flag" :class="fl.status">
          <div><b>{{ fl.reason.replace('_', ' ') }}</b> · <span class="st">{{ fl.status.replace('_', ' ') }}</span></div>
          <pre>{{ fl.comment }}</pre>
          <div class="acts">
            <button v-if="fl.status !== 'resolved'" @click="setFlagStatus(fl.id, 'resolved')">Resolve</button>
            <button v-else @click="setFlagStatus(fl.id, 'open')">Reopen</button>
          </div>
        </div>
        <div class="newflag">
          <select v-model="draft.reason"><option v-for="r in FLAG_REASONS" :key="r" :value="r">{{ r.replace('_', ' ') }}</option></select>
          <textarea v-model="draft.comment" rows="2" placeholder="What's wrong / what should happen?" />
          <button @click="submitFlag">Flag for Claude</button>
        </div>
      </aside>
      <aside v-else class="panel muted">Pick a cell to preview it on the current character, set its rule, or flag it.</aside>
    </div>
  </div>
</template>

<style scoped>
.gaps { grid-column: 1 / -1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.bar { display: flex; gap: 8px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bar h2 { margin: 0 8px 0 0; font-size: 16px; }
.muted { color: var(--muted); } .small { font-size: 11px; } .mono { font-family: var(--font-mono); font-size: 11px; }
.err { color: var(--missing); } .ok { color: var(--ok); }
.legend { display: flex; gap: 4px; align-items: center; color: var(--muted); font-size: 11px; margin-left: auto; }
.legend i { width: 10px; height: 10px; display: inline-block; border-radius: 2px; margin-left: 6px; }
.body { flex: 1; display: grid; grid-template-columns: 1fr 340px; min-height: 0; }
.table { overflow: auto; padding: 0 0 20px 16px; }
table { border-collapse: separate; border-spacing: 2px; font-size: 12px; }
th { position: sticky; top: 0; background: var(--bg); color: var(--muted); font-weight: normal; padding: 6px 2px; z-index: 1; font-size: 11px; }
th small { display: block; color: #e0a030; font-family: var(--font-mono); }
.lbl { text-align: left; white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
.slot { color: var(--faint); text-transform: capitalize; }
.cell { width: 26px; height: 18px; border-radius: 3px; cursor: pointer; position: relative; }
.cell.own, i.own { background: #2c4a3a; }
.cell.fallback, i.fallback { background: #8a6420; }
.cell.borrow, i.borrow { background: #2d5a9a; }
.cell.hide, i.hide { background: #8a2c30; }
.cell.sel { outline: 2px solid var(--accent); }
.fl, i.flag { position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: #fff; }
i.flag { position: static; }
.more { margin: 10px 0; }
.panel { border-left: 1px solid var(--border); background: var(--panel); padding: 12px; overflow: auto; }
.previews { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 4px; border-radius: var(--radius); margin: 8px 0; }
.opt { display: flex; gap: 6px; align-items: center; margin: 6px 0; }
.opt.off { opacity: .5; }
.primary { border-color: var(--accent); margin-top: 6px; }
.flag { border: 1px solid var(--border); border-radius: var(--radius); padding: 6px; margin: 6px 0; }
.flag.resolved { opacity: .6; }
.flag pre { white-space: pre-wrap; font-family: var(--font-ui); margin: 4px 0; }
.st { color: var(--muted); }
.newflag { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.newflag textarea { font: inherit; color: var(--text); background: var(--panel-2); border: 1px solid var(--border-strong); border-radius: var(--radius); padding: 6px; }
</style>
