<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { libPath } from '@game/systems/lpcLayout.js'
import { layerKeyOf, entryFor } from '@v2/model/composition.js'
import { DIRS } from '@v2/render/frames.js'
import CharacterCanvas from './CharacterCanvas.vue'
import PixelEditor from './PixelEditor.vue'
import { store, catalogue } from '@v2/store'
import {
  ws, wsLayers, target, targetRel, ownMotions, draftOptions, otherColours, LICENSES,
  startDraft, closeSheet, undo, redo, nudge, uploadSheet, downloadTemplate, saveSheet, saveAllColours, deleteSaved,
} from '@v2/workshopState'

const label = (l: any) => `${l.slot.replace(/_/g, ' ')} — ${entryFor(catalogue, l.slot, l.id)?.label ?? l.id}${l.itemName ? ` · ${l.itemName}` : ''}${l.color ? ` · ${l.color}` : ''}`
// Re-read on sheetVersion: the overlay registry (what counts as own art) isn't reactive.
const lacks = (l: any) => (store.sheetVersion, DEFAULT_ANIMS.filter((m: string) => !resolveAnim(l, m)).length)
function motionNote(m: string) {
  if (!target.value) return ''
  if (m === ws.motion && ws.sheet && !store.custom[targetRel.value]) return ' — drawing'
  if (store.custom[libPath(target.value, m)]) return ' ✎ custom'
  return ownMotions.value.includes(m) ? ' ✓' : ' — missing'
}

// Picking another layer or motion forgets the sheet (after asking) and proposes a draft.
function retarget(fn: () => void) {
  if (ws.dirty && !confirm('Discard the unsaved sheet?')) return
  fn()
  closeSheet()
  ws.draft = draftOptions.value[0]?.value ?? 'blank'
}
const layerKey = computed({ get: () => ws.layerKey, set: v => retarget(() => { ws.layerKey = v }) })
const motion = computed({ get: () => ws.motion, set: v => retarget(() => { ws.motion = v }) })
// Opened from the tab: start on a weapon (the usual gap) or the top layer.
if (!ws.layerKey && wsLayers.value.length) {
  ws.layerKey = layerKeyOf(wsLayers.value.find((l: any) => l.slot === 'weapon') ?? wsLayers.value[wsLayers.value.length - 1])
  ws.draft = draftOptions.value[0]?.value ?? 'blank'
}
watch(draftOptions, o => { if (!o.some(x => x.value === ws.draft)) ws.draft = o[0]?.value ?? 'blank' })

// ── frame strip: the whole sheet, click to pick a frame ──
const strip = ref<HTMLCanvasElement>()
const stripScale = computed(() => ws.spec ? Math.min(2, 760 / ws.spec.w) : 1)
function drawStrip() {
  const c = strip.value
  if (!c || !ws.sheet) return
  const k = stripScale.value
  c.width = Math.round(ws.spec.w * k); c.height = Math.round(ws.spec.h * k)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  const t = document.createElement('canvas')
  t.width = ws.sheet.w; t.height = ws.sheet.h
  t.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(ws.sheet.data), ws.sheet.w, ws.sheet.h), 0, 0)
  ctx.drawImage(t, 0, 0, c.width, c.height)
  const fs = ws.spec.fs * k
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  for (let r = 0; r < ws.spec.rows; r++) for (let col = 0; col < ws.spec.cols; col++) ctx.strokeRect(col * fs + 0.5, r * fs + 0.5, fs - 1, fs - 1)
  if (ws.spec.skip) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, fs, c.height) }
  ctx.strokeStyle = '#6aa3ff'; ctx.lineWidth = 2
  ctx.strokeRect(ws.col * fs + 1, ws.row * fs + 1, fs - 2, fs - 2)
}
function pickFrame(e: MouseEvent) {
  if (!ws.spec) return
  const r = (e.target as HTMLCanvasElement).getBoundingClientRect(), fs = ws.spec.fs * stripScale.value
  ws.col = Math.min(ws.spec.cols - 1, Math.floor((e.clientX - r.left) / fs))
  ws.row = Math.min(ws.spec.rows - 1, Math.floor((e.clientY - r.top) / fs))
}
watch(() => [ws.version, ws.row, ws.col, ws.spec], drawStrip, { flush: 'post' })

const rowName = computed(() => ws.spec?.rows === 4 ? DIRS[ws.row] : ws.motion === 'climb' ? 'up (single row)' : 'down (single row)')
const previewDirs = computed(() => ws.spec?.rows === 1 ? [ws.motion === 'climb' ? 'up' : 'down'] : DIRS)
const upload = ref<HTMLInputElement>()
function onUpload(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) uploadSheet(f)
  ;(e.target as HTMLInputElement).value = ''
}
const TOOLS = [['pencil', 'Pencil (B)'], ['eraser', 'Eraser (E)'], ['pick', 'Eyedropper (I)'], ['fill', 'Fill (G)'], ['select', 'Select & move (M)']] as const
</script>

<template>
  <div class="ws">
    <aside class="left">
      <h3>What to draw</h3>
      <label class="fld">Layer
        <select v-model="layerKey">
          <option v-for="l in [...wsLayers].reverse()" :key="layerKeyOf(l)" :value="layerKeyOf(l)">{{ label(l) }}{{ lacks(l) ? ` (${lacks(l)} missing)` : '' }}</option>
        </select>
      </label>
      <label class="fld">Motion
        <select v-model="motion">
          <option v-for="m in DEFAULT_ANIMS" :key="m" :value="m">{{ m }}{{ motionNote(m) }}</option>
        </select>
      </label>
      <p v-if="ws.comp" class="muted small">Previewed on the character from the Gaps tab. <button class="link" @click="ws.comp = null">Use the forge's character</button></p>
      <p v-if="target" class="mono small">lpc_custom/{{ targetRel }}</p>
      <label class="fld">Start from
        <select v-model="ws.draft"><option v-for="o in draftOptions" :key="o.value" :value="o.value">{{ o.label }}</option></select>
      </label>
      <button class="primary" :disabled="!target || ws.busy" @click="startDraft">{{ ws.sheet ? 'New draft' : 'Create draft' }}</button>
      <p class="muted small">"Fitted to the body" moves each frame with the body's bob and lean; arm swing is up to you.</p>

      <template v-if="ws.sheet">
        <h3>Tools</h3>
        <div class="tools">
          <button v-for="[t, tip] in TOOLS" :key="t" :class="{ active: ws.tool === t }" :title="tip" @click="ws.tool = t">{{ tip.split(' (')[0] }}</button>
        </div>
        <div class="tools">
          <button title="Undo (Ctrl+Z)" @click="undo">Undo</button><button title="Redo (Ctrl+Y)" @click="redo">Redo</button>
          <button title="Nudge frame left (←; Shift = whole row)" @click="nudge(-1, 0)">←</button>
          <button title="Nudge frame right (→)" @click="nudge(1, 0)">→</button>
          <button title="Nudge frame up (↑)" @click="nudge(0, -1)">↑</button>
          <button title="Nudge frame down (↓)" @click="nudge(0, 1)">↓</button>
        </div>
        <h3>Colour</h3>
        <div class="pal">
          <button v-for="c in ws.palette" :key="c" class="sw" :class="{ active: ws.colour === c }" :style="{ background: c }" :title="c" @click="ws.colour = c" />
          <input type="color" v-model="ws.colour" title="Any colour (the item's palette keeps it recolourable)" />
        </div>
        <h3>Onion skin</h3>
        <label class="opt"><input type="checkbox" v-model="ws.onionBody" /> the character in this frame</label>
        <label class="opt"><input type="checkbox" v-model="ws.onionPrev" /> previous frame</label>
        <h3>Outside editor</h3>
        <div class="tools">
          <button @click="downloadTemplate">Download template</button>
          <button @click="upload?.click()">Upload PNG</button>
          <input ref="upload" type="file" accept="image/png" hidden @change="onUpload" />
        </div>
      </template>
    </aside>

    <main class="center">
      <template v-if="ws.sheet">
        <div class="where">
          <b>{{ ws.motion }}</b> · {{ rowName }} · frame {{ ws.col - ws.spec.skip + 1 }}/{{ ws.spec.cols - ws.spec.skip }}
          <span v-if="ws.col < ws.spec.skip" class="muted">(standing frame — not played)</span>
          <span class="muted small">{{ ws.spec.w }}×{{ ws.spec.h }}, {{ ws.spec.fs }} px frames · , . frames · arrows nudge</span>
          <span v-if="ws.dirty" class="dirty">unsaved</span>
        </div>
        <PixelEditor />
        <canvas ref="strip" class="strip" @click="pickFrame" />
      </template>
      <div v-else class="empty muted">
        <p>Pick a layer and a motion, choose what to start from, then <b>Create draft</b>.</p>
        <p>Saved sheets go to the game's <span class="mono">public/lpc_custom/</span> and replace the motion rule for that item — for every character wearing it.</p>
      </div>
    </main>

    <aside class="right">
      <h3>Live preview</h3>
      <div class="previews checker">
        <CharacterCanvas v-for="d in previewDirs" :key="d" :layers="wsLayers" :motion="ws.motion" :dir="d" :scale="2" missing-overlay />
      </div>
      <template v-if="ws.sheet">
        <h3>Save to the game</h3>
        <label class="fld">Author <input v-model="ws.author" placeholder="Your name (for the credits)" /></label>
        <label class="fld">Your licence for this work
          <select v-model="ws.license"><option v-for="l in LICENSES" :key="l" :value="l">{{ l }}</option></select>
        </label>
        <p v-if="ws.derivedFrom.length" class="muted small">Derived from {{ ws.derivedFrom.join(', ') }} — its authors and licences are added to the credits automatically.</p>
        <label class="fld">Note <input v-model="ws.note" placeholder="optional" /></label>
        <div class="tools">
          <button class="primary" :disabled="ws.busy" @click="saveSheet">Save</button>
          <button v-if="otherColours.length" :disabled="ws.busy" :title="`Also recolour into ${otherColours.join(', ')}`" @click="saveAllColours">Save for all {{ otherColours.length + 1 }} colours</button>
          <button v-if="store.custom[targetRel]" :disabled="ws.busy" @click="deleteSaved">Delete saved</button>
        </div>
      </template>
      <p v-if="ws.message" class="ok">{{ ws.message }}</p>
      <p v-if="ws.error" class="err">{{ ws.error }}</p>
    </aside>
  </div>
</template>

<style scoped>
.ws { grid-column: 1 / -1; display: grid; grid-template-columns: 280px 1fr 300px; min-height: 0; overflow: hidden; }
.left, .right { background: var(--panel); overflow: auto; padding: 4px 12px 16px; }
.left { border-right: 1px solid var(--border); }
.right { border-left: 1px solid var(--border); }
.center { overflow: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px; }
.fld { display: flex; flex-direction: column; gap: 3px; margin: 6px 0; color: var(--muted); font-size: 12px; }
.fld select, .fld input { color: var(--text); }
.tools { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
.tools button { padding: 3px 8px; }
.primary { border-color: var(--accent); margin: 6px 0; }
.pal { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; }
.sw { width: 20px; height: 20px; padding: 0; border-radius: 3px; }
.sw.active { outline: 2px solid #fff; }
.pal input[type=color] { width: 32px; height: 22px; padding: 0 2px; }
.opt { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
.where { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.dirty { color: #e0a030; }
.strip { image-rendering: pixelated; cursor: pointer; border: 1px solid var(--border); }
.previews { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; padding: 4px; border-radius: var(--radius); }
.checker { background-color: var(--checker-a); background-image: linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%), linear-gradient(45deg, var(--checker-b) 25%, transparent 25%, transparent 75%, var(--checker-b) 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.empty { max-width: 460px; margin-top: 60px; line-height: 1.5; }
.muted { color: var(--muted); } .small { font-size: 11px; } .mono { font-family: var(--font-mono); font-size: 11px; word-break: break-all; }
.ok { color: var(--ok); } .err { color: var(--missing); }
.link { background: none; border: none; color: var(--accent); padding: 0; text-decoration: underline; }
</style>
