import { reactive, computed, markRaw, watch } from 'vue'
import JSZip from 'jszip'
import { DEFAULT_ANIMS, resolveAnim } from '@game/systems/animResolve.js'
import { animPath, libPath, setCustomFiles } from '@game/systems/lpcLayout.js'
import { ruleKey } from '@game/systems/motionRules.js'
import { layersFor, layerKeyOf, entryFor } from '@v2/model/composition.js'
import {
  sheetSpec, specOf, sizeError, blankSheet, getFrame, putFrame, retimeDraft, poseFitDraft,
  paletteOf, colourMap, applyColourMap, shiftFrame, History,
} from '@v2/model/workshop.js'
import { setSheetOverride, renderFrame, renderStanding } from '@v2/render/sheets.js'
import { DIRS } from '@v2/render/frames.js'
import { store, catalogue, refreshCustom } from './store'
import { flags, setFlagStatus } from './gapState'

// The motion workshop (spec §5): draw a motion a layer lacks into a working
// sheet, preview it on the character, save it to the game's custom overlay.
// Pixel logic lives in model/workshop.js; this holds the session.

type Img = { w: number; h: number; data: Uint8ClampedArray }
const ATTACKS = new Set(['slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast'])
// '' = add nothing: a derivative keeps its sources' licences (looked up by the server)
export const LICENSES = ['', 'CC-BY-SA 3.0', 'CC-BY-SA 4.0', 'OGA-BY 3.0', 'GPL 3.0', 'CC-BY 4.0', 'CC0']

function remembered(k: string, d: string) { try { return localStorage.getItem(k) ?? d } catch { return d } }

export const ws = reactive({
  comp: null as null | { name: string; sel: Record<string, any> },   // what the preview wears (null = the forge's)
  layerKey: '', motion: 'run',
  draft: 'blank',                     // blank | existing | from:<motion> | pose:<motion>
  spec: null as any, sheet: null as Img | null, version: 0,
  derivedFrom: [] as string[],
  row: 2, col: 0,
  tool: 'pencil' as 'pencil' | 'eraser' | 'pick' | 'fill' | 'select',
  colour: '#000000', palette: [] as string[],
  onionBody: true, onionPrev: false,
  sel: null as null | { x: number; y: number; w: number; h: number },
  author: remembered('forge_author', ''), license: 'CC-BY-SA 3.0', note: '',
  dirty: false, busy: false, error: '', message: '',
})
let history = new History(40)

export const wsLayers = computed(() => layersFor(catalogue, ws.comp ?? store.comp))
export const target = computed(() => wsLayers.value.find((l: any) => layerKeyOf(l) === ws.layerKey) ?? null)
export const targetRel = computed(() => target.value ? libPath(target.value, ws.motion) : '')
export const targetEntry = computed(() => target.value ? entryFor(catalogue, target.value.slot, target.value.id) ?? findEntry(target.value) : null)
export const ownMotions = computed(() => (store.sheetVersion, target.value ? DEFAULT_ANIMS.filter((m: string) => resolveAnim(target.value, m)) : []))
export const bodyLayer = computed(() => wsLayers.value.find((l: any) => l.slot === 'body') ?? null)

/** A companion layer's parent catalogue entry (its colours, label). */
function findEntry(l: any) {
  return (catalogue[l.slot] ?? []).find((e: any) => (e.companions ?? []).some((c: any) => c.id === l.id)) ?? null
}

/** Draft choices for the target: its own motions, retimed or fitted to the body; blank; its saved custom sheet. */
export const draftOptions = computed(() => {
  const out: { value: string; label: string }[] = []
  if (store.custom[targetRel.value]) out.push({ value: 'existing', label: 'my saved custom sheet' })
  const body = bodyLayer.value
  for (const m of ownMotions.value as string[]) {
    if (m === ws.motion && store.custom[targetRel.value]) continue
    if (body && m !== ws.motion && resolveAnim(body, m) && resolveAnim(body, ws.motion)) out.push({ value: `pose:${m}`, label: `${m}, fitted to the body's ${ws.motion}` })
    out.push({ value: `from:${m}`, label: m === ws.motion ? `${m} (its current art)` : `${m}, retimed` })
  }
  out.push({ value: 'blank', label: 'blank' })
  return out
})

// ── image helpers (browser) ──
export function toCanvas(img: Img) {
  const c = document.createElement('canvas')
  c.width = img.w; c.height = img.h
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.w, img.h), 0, 0)
  return c
}
function fromDrawable(src: CanvasImageSource & { width: number; height: number }): Img {
  const c = document.createElement('canvas')
  c.width = src.width; c.height = src.height
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data }
}
/** An unswapped sheet by served path ('lpc/…' or 'lpc_custom/…'), or null when missing. */
async function loadRaw(path: string): Promise<Img | null> {
  const stamp = path.startsWith('lpc_custom/') ? store.custom[path.slice(11)]?.updatedAt : null
  const img = new Image()
  img.src = '/' + path + (stamp ? `?v=${encodeURIComponent(stamp)}` : '')
  try { await img.decode() } catch { return null }
  return fromDrawable(img)
}
const hex = ([r, g, b]: number[]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

// ── opening ──
/** Open the workshop on one layer and motion, wearing `comp` (default: the forge's character). */
export function openWorkshop(opts: { layerKey: string; motion: string; comp?: any }) {
  if (ws.dirty && !confirm('Discard the unsaved workshop sheet?')) return
  closeSheet()
  ws.comp = opts.comp ? JSON.parse(JSON.stringify(opts.comp)) : null
  ws.layerKey = opts.layerKey
  ws.motion = opts.motion
  ws.draft = draftOptions.value[0]?.value ?? 'blank'
  store.screen = 'workshop'
}

/** Build the working sheet from the chosen draft. */
export async function startDraft() {
  const layer = target.value
  if (!layer) return
  if (ws.dirty && !confirm('Replace the unsaved sheet with a new draft?')) return
  ws.busy = true; ws.error = ''; ws.message = ''
  try {
    const motion = ws.motion
    const [kind, from] = ws.draft.split(':')
    let sheet: Img, spec: any, derived: string[] = []
    if (kind === 'existing') {
      const img = await loadRaw('lpc_custom/' + targetRel.value)
      if (!img) throw new Error('the saved custom sheet could not be loaded')
      sheet = img; spec = specOf(motion, img.w, img.h)
      derived = store.custom[targetRel.value]?.derivedFrom ?? []
    } else if (kind === 'blank') {
      spec = sheetSpec(motion); sheet = blankSheet(spec)
    } else {
      const c = resolveAnim(layer, from)
      const srcPath = animPath(layer, c)
      const src = await loadRaw(srcPath)
      if (!src) throw new Error(`${srcPath} could not be loaded`)
      const srcSpec = specOf(from, src.w, src.h)
      spec = sheetSpec(motion, ATTACKS.has(motion) ? srcSpec.fs : 64)
      derived = [srcPath.replace(/^lpc(_custom)?\//, '')]
      if (kind === 'pose') {
        const body = bodyLayer.value
        const bA = await loadRaw(animPath(body, resolveAnim(body, from)))
        const bB = await loadRaw(animPath(body, resolveAnim(body, motion)))
        if (!bA || !bB) throw new Error("the body's sheets could not be loaded")
        sheet = poseFitDraft(src, srcSpec, bA, specOf(from, bA.w, bA.h), bB, spec)
      } else sheet = retimeDraft(src, srcSpec, spec)
    }
    const walk = resolveAnim(layer, 'walk')
    const ref = walk ? await loadRaw(animPath(layer, walk)) : null
    ws.palette = paletteOf(ref ?? sheet, 32).map(hex)
    ws.spec = spec
    ws.sheet = markRaw(sheet)
    ws.derivedFrom = derived
    ws.license = derived.length ? '' : (ws.license || 'CC-BY-SA 3.0')
    ws.row = spec.rows === 4 ? 2 : 0
    ws.col = spec.skip
    ws.sel = null
    history = new History(40)
    ws.dirty = kind !== 'existing'
    bump()
  } catch (e: any) { ws.error = `Could not build the draft: ${e.message}` }
  finally { ws.busy = false }
}

export function closeSheet() {
  ws.sheet = null; ws.spec = null; ws.dirty = false; ws.sel = null; ws.message = ''; ws.error = ''
  restorePreview()
}

// ── edits ──
/** Call before changing the sheet: records the undo step. */
export function beginEdit() {
  if (!ws.sheet) return
  history.push(ws.sheet.data.slice())
  ws.dirty = true
}
/** Call after changing ws.sheet.data in place. */
export function bump() { ws.version++ }

export function undo() {
  if (!ws.sheet || !history.canUndo) return
  ws.sheet.data = history.undo(ws.sheet.data.slice()); ws.dirty = true; bump()
}
export function redo() {
  if (!ws.sheet || !history.canRedo) return
  ws.sheet.data = history.redo(ws.sheet.data.slice()); ws.dirty = true; bump()
}

/** Move the current frame (or every frame of its row) by (dx, dy) pixels. */
export function nudge(dx: number, dy: number, wholeRow = false) {
  if (!ws.sheet) return
  beginEdit()
  const cols = wholeRow ? [...Array(ws.spec.cols).keys()] : [ws.col]
  for (const c of cols) putFrame(ws.sheet, ws.spec, ws.row, c, shiftFrame(getFrame(ws.sheet, ws.spec, ws.row, c), dx, dy))
  bump()
}

/** Replace the working sheet with an uploaded PNG (size-checked; undoable). */
export async function uploadSheet(file: File) {
  if (!ws.sheet) return
  try {
    const img = fromDrawable(await createImageBitmap(file))
    const err = sizeError(img.w, img.h, ws.spec)
    if (err) { ws.error = `Upload refused: ${err}`; return }
    beginEdit()
    ws.sheet.data = img.data
    ws.error = ''; ws.message = `Loaded ${file.name}.`
    bump()
  } catch (e: any) { ws.error = `Could not read ${file.name}: ${e.message}` }
}

/** The rest of the character in each frame at 35% opacity, laid out like the working sheet (drawing guide). */
async function guideImg(): Promise<Img | null> {
  if (!ws.spec) return null
  const spec = ws.spec, fs = spec.fs, off = (fs - 64) / 2
  const others = wsLayers.value.filter((l: any) => layerKeyOf(l) !== ws.layerKey)
  const out = document.createElement('canvas')
  out.width = spec.w; out.height = spec.h
  const ctx = out.getContext('2d')!
  ctx.globalAlpha = 0.35
  for (let r = 0; r < spec.rows; r++) {
    const dir = spec.rows === 4 ? DIRS[r] : ws.motion === 'climb' ? 'up' : 'down'
    for (let c = 0; c < spec.cols; c++) {
      const frame = c < spec.skip
        ? await renderStanding(others, dir, store.rules, store.ruleOverrides)
        : await renderFrame(others, ws.motion, dir, c - spec.skip, store.rules, store.ruleOverrides)
      ctx.drawImage(frame, c * fs + off, r * fs + off)
    }
  }
  return fromDrawable(out)
}

const blobOf = (img: Img) => new Promise<Blob>(res => toCanvas(img).toBlob(b => res(b!), 'image/png'))
function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Zip of the draft and a faded body guide, for drawing in another editor (then Upload the result). */
export async function downloadTemplate() {
  if (!ws.sheet) return
  const zip = new JSZip()
  const base = targetRel.value.replace(/\//g, '__').replace(/\.png$/, '')
  zip.file(`${base}.png`, await blobOf(ws.sheet))
  const guide = await guideImg()
  if (guide) zip.file(`${base}.guide.png`, await blobOf(guide))
  zip.file('README.txt', [
    `Working sheet for ${targetRel.value}`,
    `${ws.spec.cols} frames x ${ws.spec.rows} rows of ${ws.spec.fs} px (${ws.spec.w}x${ws.spec.h}); rows: ${ws.spec.rows === 4 ? 'up, left, down, right' : 'single row'}.`,
    ws.spec.skip ? 'Column 0 is the standing frame (not played in the walk cycle).' : '',
    'The .guide.png is the rest of the character in this motion at 35% opacity: put it on a layer under the draft, draw, hide it, export only the draft layer as PNG at the same size, then use Upload in the workshop.',
  ].filter(Boolean).join('\n'))
  download(await zip.generateAsync({ type: 'blob' }), `${base}.zip`)
}

// ── preview: the working sheet stands in for its custom file while the workshop is open ──
let previewTimer: any = 0
function applyPreview() {
  if (!ws.sheet || store.screen !== 'workshop') return restorePreview()
  setCustomFiles([...Object.keys(store.custom), targetRel.value])
  setSheetOverride('lpc_custom/' + targetRel.value, toCanvas(ws.sheet))
  store.sheetVersion++
}
let previewRel = ''
function restorePreview() {
  if (previewRel) setSheetOverride('lpc_custom/' + previewRel, null)
  previewRel = ''
  setCustomFiles(Object.keys(store.custom))
  store.sheetVersion++
}
watch(() => ws.version, () => {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    if (previewRel && previewRel !== targetRel.value) setSheetOverride('lpc_custom/' + previewRel, null)
    previewRel = ws.sheet ? targetRel.value : ''
    applyPreview()
  }, 120)
})
watch(() => store.screen, s => { if (s === 'workshop') { if (ws.sheet) { previewRel = targetRel.value; applyPreview() } } else if (previewRel) restorePreview() })

// ── save ──
async function put(path: string, img: Img, derivedFrom: string[]) {
  const r = await fetch('/api/custom', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, png: toCanvas(img).toDataURL('image/png'), author: ws.author, derivedFrom, license: ws.license, note: ws.note }),
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(out.error ?? `HTTP ${r.status}`)
  return out
}

/** Open flags on this layer × motion go to needs_review: the art is there for you to check. */
async function markFlagsForReview(layer: any, motion: string) {
  const key = ruleKey(layer)
  for (const f of flags.value.filter(f => f.key === key && f.motion === motion && (f.status === 'open' || f.status === 'question'))) {
    await setFlagStatus(f.id, 'needs_review', `Custom ${motion} art saved in the workshop (lpc_custom/${libPath(layer, motion)}) — please review it on the stage.`)
  }
}

export async function saveSheet() {
  const layer = target.value
  if (!layer || !ws.sheet) return
  if (!ws.author.trim()) { ws.error = 'Who drew it? Fill in the author (it goes in the credits).'; return }
  if (!ws.license && !ws.derivedFrom.length) { ws.error = 'Original work needs a licence.'; return }
  try { localStorage.setItem('forge_author', ws.author.trim()) } catch { /* ignore */ }
  ws.busy = true; ws.error = ''
  try {
    const entry = await put(targetRel.value, ws.sheet, ws.derivedFrom)
    await refreshCustom()
    await markFlagsForReview(layer, ws.motion)
    ws.dirty = false
    ws.message = `Saved ${targetRel.value} — licences: ${entry.licenses.join(', ')}.`
  } catch (e: any) { ws.error = `Could not save: ${e.message}` }
  finally { ws.busy = false }
}

/** Colours of the target's item other than the one being drawn (capes, backpacks…). */
export const otherColours = computed(() => {
  const l = target.value
  const colours: string[] = targetEntry.value?.colors ?? []
  return l?.color ? colours.filter(c => c !== l.color) : []
})

/**
 * Save the sheet, then a recoloured copy for every other colour of the item:
 * each colour's mapping is read off the item's own walk sheets (same pixels,
 * two colours), so shading ramps carry over.
 */
export async function saveAllColours() {
  const layer = target.value
  if (!layer || !ws.sheet || !otherColours.value.length) return
  await saveSheet()
  if (ws.error) return
  ws.busy = true
  const walk = resolveAnim(layer, 'walk')
  const done: string[] = [], skipped: string[] = []
  try {
    const from = walk ? await loadRaw('lpc/' + libPath(layer, walk)) : null
    if (!from) throw new Error('the item has no walk sheet to read colours from')
    for (const c of otherColours.value) {
      const other = { ...layer, color: c }
      const to = await loadRaw('lpc/' + libPath(other, walk))
      if (!to || to.w !== from.w || to.h !== from.h) { skipped.push(c); continue }
      await put(libPath(other, ws.motion), applyColourMap(ws.sheet, colourMap(from, to)), [targetRel.value, libPath(other, walk)])
      done.push(c)
    }
    await refreshCustom()
    ws.message = `Saved ${1 + done.length} colours${skipped.length ? `; skipped ${skipped.join(', ')} (no matching walk sheet)` : ''}.`
  } catch (e: any) { ws.error = `Could not save every colour: ${e.message}` }
  finally { ws.busy = false }
}

/** Delete the saved custom sheet for the target (back to the rules / library). */
export async function deleteSaved() {
  if (!store.custom[targetRel.value] || !confirm(`Delete lpc_custom/${targetRel.value}? The game goes back to its motion rule for this item.`)) return
  const r = await fetch(`/api/custom?path=${encodeURIComponent(targetRel.value)}`, { method: 'DELETE' })
  if (!r.ok) { ws.error = `Could not delete: HTTP ${r.status}`; return }
  await refreshCustom()
  ws.message = 'Deleted.'
}
