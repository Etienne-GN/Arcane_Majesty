<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import JSZip from 'jszip'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { MOTION_FRAMES } from '@game/systems/lpcLayout.js'
import { resolveMotion } from '@game/systems/motionRules.js'
import { UNIVERSAL_ROWS, universalSize, filesUsed, creditsMarkdown, licenceProblems } from '@v2/model/exportSheet.js'
import { slugify } from '@v2/model/cast.js'
import { loadSheet, renderFrame, renderStanding } from '@v2/render/sheets.js'
import { DIRS } from '@v2/render/frames.js'
import { store, layers } from '@v2/store'
import { cast } from '@v2/castState'

// Export the character on screen (cast member and variant, or scratch): PNGs
// plus credits generated from exactly the sheets it draws.

const opt = reactive({ universal: true, perMotion: true, oversize: false, motions: [...DEFAULT_ANIMS] as string[] })
const state = reactive({ loading: false, busy: false, error: '', done: '', progress: '' })
const credits = ref<any[]>([])
const problems = computed(() => licenceProblems(credits.value))

const id = computed(() => (cast.meta?.id || slugify(store.comp.name)) + (cast.meta?.variant ? `__${cast.meta.variant}` : ''))
const rules = () => [store.rules, store.ruleOverrides] as const

/** Which files exist (as the browser loads them), then the credits of every file drawn. */
async function gatherCredits() {
  state.loading = true; state.error = ''; state.done = ''
  try {
    const ls = layers.value, motions = opt.motions
    const found = new Map<string, boolean>()
    const k = (l: any, c: string) => `${l.type}|${l.id}|${l.itemName ?? ''}|${l.color ?? ''}|${c}`
    await Promise.all(ls.flatMap((l: any) => [...new Set(motions.flatMap((m: string) => {
      const r = resolveMotion(l, m, ...rules())
      return r.concrete ? [r.concrete] : []
    }).concat(resolveAnim(l, 'walk') ?? 'walk'))].map(async (c: string) => { found.set(k(l, c), (await loadSheet(l, c)) !== null) })))
    const used = filesUsed(ls, motions, store.rules, store.ruleOverrides, (l: any, c: string) => found.get(k(l, c)) ?? false)
    const paths = used.filter((u: any) => u.path).map((u: any) => u.path)
    const r = await fetch('/api/credits/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const rows = await r.json()
    const byPath = new Map(rows.map((x: any) => [x.path, x]))
    credits.value = used.map((u: any) => (u.path ? { ...byPath.get(u.path), layerKey: u.layerKey, motions: u.motions } : u))
  } catch (e: any) { state.error = `Could not gather credits: ${e.message}` }
  finally { state.loading = false }
}

watch(() => store.exportOpen, o => { if (o) gatherCredits() })
watch(() => [...opt.motions], () => { if (store.exportOpen) gatherCredits() })

const dirsFor = (m: string) => (m === 'hurt' ? ['down'] : m === 'climb' ? ['up'] : DIRS)
const blob = (c: HTMLCanvasElement) => new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'))

async function universalSheet() {
  const { w, h } = universalSize()
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  const ctx = out.getContext('2d')!
  for (const r of UNIVERSAL_ROWS) {
    if (!opt.motions.includes(r.motion)) continue
    state.progress = `universal sheet: ${r.motion}`
    const dirs = dirsFor(r.motion)
    for (let i = 0; i < r.rows; i++) for (let c = 0; c < r.cols; c++) {
      const skip = r.motion === 'walk' ? 1 : 0
      const cell = c < skip
        ? await renderStanding(layers.value, dirs[i], ...rules())
        : await renderFrame(layers.value, r.motion, dirs[i], c - skip, ...rules())
      ctx.drawImage(cell, c * 64, (r.row + i) * 64)
    }
  }
  return out
}

async function motionSheet(m: string) {
  const cell = opt.oversize ? 192 : 64, dirs = dirsFor(m), n = MOTION_FRAMES[m]
  const out = document.createElement('canvas')
  out.width = n * cell; out.height = dirs.length * cell
  const ctx = out.getContext('2d')!
  for (let i = 0; i < dirs.length; i++) for (let f = 0; f < n; f++) {
    ctx.drawImage(await renderFrame(layers.value, m, dirs[i], f, ...rules(), cell), f * cell, i * cell)
  }
  return out
}

async function doExport() {
  state.busy = true; state.error = ''; state.done = ''
  try {
    if (!credits.value.length) await gatherCredits()
    const zip = new JSZip(), dir = zip.folder(id.value)!
    if (opt.universal) dir.file('universal.png', await blob(await universalSheet()))
    if (opt.perMotion) for (const m of opt.motions) { state.progress = m; dir.file(`${m}.png`, await blob(await motionSheet(m))) }
    dir.file('credits.json', JSON.stringify({ character: store.comp.name, cast: cast.meta?.id ?? null, variant: cast.meta?.variant ?? null, motions: opt.motions, files: credits.value }, null, 2))
    dir.file('CREDITS.md', creditsMarkdown(store.comp.name + (cast.meta?.variant ? ` (${cast.meta.variant})` : ''), credits.value))
    dir.file('composition.json', JSON.stringify({ ...store.comp, variant: cast.meta?.variant ?? null }, null, 2))
    state.progress = 'zipping'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }))
    a.download = `${id.value}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    state.done = `Exported ${id.value}.zip`
  } catch (e: any) { state.error = `Export failed: ${e.message}` }
  finally { state.busy = false; state.progress = '' }
}

function toggleAll(on: boolean) { opt.motions = on ? [...DEFAULT_ANIMS] : [] }
</script>

<template>
  <div v-if="store.exportOpen" class="backdrop" @click.self="store.exportOpen = false">
    <div class="modal" role="dialog" aria-label="Export">
      <h2>Export {{ store.comp.name }}<small v-if="cast.meta?.variant"> · {{ cast.meta.variant }}</small></h2>
      <label class="opt"><input type="checkbox" v-model="opt.universal" /> Universal LPC sheet <span class="muted">(832×3456, 64 px cells; big weapon swings are cut to the cell)</span></label>
      <label class="opt"><input type="checkbox" v-model="opt.perMotion" /> one PNG per motion</label>
      <label class="opt sub" :class="{ off: !opt.perMotion }"><input type="checkbox" v-model="opt.oversize" :disabled="!opt.perMotion" /> 192 px cells (keeps oversize art)</label>
      <h3>Motions <button class="link" @click="toggleAll(true)">all</button> <button class="link" @click="toggleAll(false)">none</button></h3>
      <div class="motions">
        <label v-for="m in DEFAULT_ANIMS" :key="m"><input type="checkbox" :value="m" v-model="opt.motions" /> {{ m.replace('_', ' ') }}</label>
      </div>
      <h3>Credits</h3>
      <p v-if="state.loading" class="muted">Looking up the sheets this character draws…</p>
      <template v-else>
        <p class="muted">{{ credits.filter(c => c.path).length }} sheets credited in CREDITS.md and credits.json.</p>
        <div v-if="problems.length" class="warn">
          <b>Check these ({{ problems.length }})</b> — no credit or unknown licence; listed at the top of CREDITS.md:
          <ul><li v-for="p in problems" :key="p" class="mono">{{ p }}</li></ul>
        </div>
        <p v-else-if="credits.length" class="ok">Every sheet has known authors and licences.</p>
      </template>
      <p v-if="state.error" class="err">{{ state.error }}</p>
      <p v-if="state.done" class="ok">{{ state.done }}</p>
      <div class="acts">
        <span class="muted">{{ state.progress }}</span>
        <button @click="store.exportOpen = false">Close</button>
        <button class="primary" :disabled="state.busy || state.loading || !opt.motions.length || (!opt.universal && !opt.perMotion)" @click="doExport">
          {{ state.busy ? 'Exporting…' : `Export ${id}.zip` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: #0009; display: flex; align-items: center; justify-content: center; z-index: 20; }
.modal { width: min(620px, 94vw); max-height: 90vh; overflow: auto; background: var(--panel); border: 1px solid var(--border-strong); border-radius: 10px; padding: 16px 20px; }
.modal h2 { margin: 0 0 10px; font-size: 16px; }
.modal h2 small { color: var(--muted); font-weight: normal; }
.opt { display: flex; gap: 6px; align-items: center; margin: 5px 0; }
.opt.sub { margin-left: 22px; } .opt.off { opacity: .5; }
.motions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 10px; text-transform: capitalize; }
.motions label { display: flex; gap: 5px; align-items: center; }
.warn { border: 1px solid #8a6420; background: #8a642022; border-radius: var(--radius); padding: 8px 10px; }
.warn ul { margin: 6px 0 0; padding-left: 18px; max-height: 140px; overflow: auto; }
.acts { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 14px; }
.acts .muted { margin-right: auto; }
.primary { border-color: var(--accent); }
.muted { color: var(--muted); } .mono { font-family: var(--font-mono); font-size: 11px; }
.ok { color: var(--ok); } .err { color: var(--missing); }
.link { background: none; border: none; color: var(--accent); padding: 0 4px; text-transform: none; letter-spacing: 0; font-size: 11px; }
</style>
