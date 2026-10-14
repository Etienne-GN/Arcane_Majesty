<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getFrame, putFrame } from '@v2/model/workshop.js'
import { ws, wsLayers, beginEdit, bump, undo, redo, nudge } from '@v2/workshopState'
import { layerKeyOf } from '@v2/model/composition.js'
import { renderFrame } from '@v2/render/sheets.js'
import { DIRS } from '@v2/render/frames.js'
import { store } from '@v2/store'

// One frame of the working sheet, large: pencil, eraser, eyedropper, fill,
// rectangle select + drag/arrow move. Onion skins: the body in this frame of
// the motion, and the previous frame. Edits write straight into ws.sheet.

const cv = ref<HTMLCanvasElement>()
const zoom = computed(() => (ws.spec?.fs ?? 64) <= 64 ? 8 : ws.spec.fs <= 128 ? 4 : 3)
const size = computed(() => (ws.spec?.fs ?? 64) * zoom.value)
const hover = ref<{ x: number; y: number } | null>(null)

// Onion skin: the rest of the character (every other layer) in this frame of the motion.
const onion = ref<HTMLCanvasElement | null>(null)
let onionSeq = 0
async function loadOnion() {
  const seq = ++onionSeq
  if (!ws.spec) { onion.value = null; return }
  const dir = ws.spec.rows === 4 ? DIRS[ws.row] : ws.motion === 'climb' ? 'up' : 'down'
  const others = wsLayers.value.filter((l: any) => layerKeyOf(l) !== ws.layerKey)
  const c = await renderFrame(others, ws.motion, dir, Math.max(0, ws.col - ws.spec.skip), store.rules, store.ruleOverrides)
  if (seq === onionSeq) onion.value = c
}
watch(() => [ws.row, ws.col, ws.spec, ws.layerKey, wsLayers.value, ws.motion], loadOnion, { immediate: true })

// selection being moved: the lifted pixels and where they sit now
let floating: null | { img: any; x: number; y: number; ox: number; oy: number } = null
let dragStart: { x: number; y: number } | null = null
let painting = false, last: { x: number; y: number } | null = null

const idx = (x: number, y: number) => (((ws.row * ws.spec.fs + y) * ws.sheet!.w) + ws.col * ws.spec.fs + x) * 4
const inFrame = (x: number, y: number) => x >= 0 && y >= 0 && x < ws.spec.fs && y < ws.spec.fs

function rgba(): [number, number, number, number] {
  const h = ws.colour.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
}

function setPx(x: number, y: number, c: number[]) {
  if (!inFrame(x, y)) return
  const i = idx(x, y), d = ws.sheet!.data
  d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3]
}

/** Paint along the segment from the last point (no gaps on fast strokes). */
function stroke(p: { x: number; y: number }) {
  const c = ws.tool === 'eraser' ? [0, 0, 0, 0] : rgba()
  const from = last ?? p
  const n = Math.max(Math.abs(p.x - from.x), Math.abs(p.y - from.y), 1)
  for (let i = 0; i <= n; i++) setPx(Math.round(from.x + ((p.x - from.x) * i) / n), Math.round(from.y + ((p.y - from.y) * i) / n), c)
  last = p
  bump()
}

function fill(p: { x: number; y: number }) {
  const d = ws.sheet!.data, i0 = idx(p.x, p.y)
  const was = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], c = rgba()
  if (was.every((v, k) => v === c[k])) return
  beginEdit()
  const stack = [p], seen = new Set<number>()
  while (stack.length) {
    const q = stack.pop()!
    if (!inFrame(q.x, q.y) || seen.has(q.y * 4096 + q.x)) continue
    seen.add(q.y * 4096 + q.x)
    const i = idx(q.x, q.y)
    if (was[3] === 0 ? d[i + 3] !== 0 : (d[i] !== was[0] || d[i + 1] !== was[1] || d[i + 2] !== was[2] || d[i + 3] !== was[3])) continue
    setPx(q.x, q.y, c)
    stack.push({ x: q.x + 1, y: q.y }, { x: q.x - 1, y: q.y }, { x: q.x, y: q.y + 1 }, { x: q.x, y: q.y - 1 })
  }
  bump()
}

function pick(p: { x: number; y: number }) {
  const d = ws.sheet!.data, i = idx(p.x, p.y)
  if (d[i + 3] === 0) return
  ws.colour = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')
}

const inSel = (p: { x: number; y: number }) => ws.sel && p.x >= ws.sel.x && p.y >= ws.sel.y && p.x < ws.sel.x + ws.sel.w && p.y < ws.sel.y + ws.sel.h

/** Lift the selected pixels off the frame (they float until dropped). */
function lift() {
  const s = ws.sel!, fs = ws.spec.fs
  beginEdit()
  const frame = getFrame(ws.sheet, ws.spec, ws.row, ws.col)
  const img = { w: s.w, h: s.h, data: new Uint8ClampedArray(s.w * s.h * 4) }
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const si = ((s.y + y) * fs + s.x + x) * 4, di = (y * s.w + x) * 4
    img.data.set(frame.data.subarray(si, si + 4), di)
    frame.data.fill(0, si, si + 4)
  }
  putFrame(ws.sheet, ws.spec, ws.row, ws.col, frame)
  floating = { img, x: s.x, y: s.y, ox: 0, oy: 0 }
}

/** Drop floating pixels where they are (cut at the frame edge) and select them there. */
function drop() {
  if (!floating) return
  const f = floating
  for (let y = 0; y < f.img.h; y++) for (let x = 0; x < f.img.w; x++) {
    const si = (y * f.img.w + x) * 4
    if (f.img.data[si + 3] === 0) continue
    setPx(f.x + x, f.y + y, [...f.img.data.subarray(si, si + 4)])
  }
  ws.sel = { x: f.x, y: f.y, w: f.img.w, h: f.img.h }
  floating = null
  bump()
}

function moveSelection(dx: number, dy: number) {
  if (!ws.sel) return
  lift()
  floating!.x += dx; floating!.y += dy
  drop()
}

function at(e: MouseEvent) {
  const r = cv.value!.getBoundingClientRect()
  return { x: Math.floor((e.clientX - r.left) / zoom.value), y: Math.floor((e.clientY - r.top) / zoom.value) }
}

function down(e: MouseEvent) {
  if (!ws.sheet) return
  const p = at(e)
  if (!inFrame(p.x, p.y)) return
  if (ws.tool === 'pencil' || ws.tool === 'eraser') { beginEdit(); painting = true; last = null; stroke(p) }
  else if (ws.tool === 'pick') pick(p)
  else if (ws.tool === 'fill') fill(p)
  else if (ws.tool === 'select') {
    if (inSel(p)) { lift(); floating!.ox = p.x - floating!.x; floating!.oy = p.y - floating!.y }
    else { ws.sel = null; dragStart = p }
  }
}
function move(e: MouseEvent) {
  if (!ws.sheet) return
  const p = at(e)
  hover.value = inFrame(p.x, p.y) ? p : null
  if (painting) stroke(p)
  else if (floating) { floating.x = p.x - floating.ox; floating.y = p.y - floating.oy; draw() }
  else if (dragStart) {
    const x = Math.max(0, Math.min(dragStart.x, p.x)), y = Math.max(0, Math.min(dragStart.y, p.y))
    const x2 = Math.min(ws.spec.fs - 1, Math.max(dragStart.x, p.x)), y2 = Math.min(ws.spec.fs - 1, Math.max(dragStart.y, p.y))
    ws.sel = { x, y, w: x2 - x + 1, h: y2 - y + 1 }
  }
}
function up() {
  painting = false; last = null; dragStart = null
  if (floating) drop()
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (!ws.sheet || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const k = e.key
  if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.shiftKey ? redo() : undo(); e.preventDefault(); return }
  if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) { redo(); e.preventDefault(); return }
  const arrow = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, number[]>)[k]
  if (arrow) { ws.sel ? moveSelection(arrow[0], arrow[1]) : nudge(arrow[0], arrow[1], e.shiftKey); e.preventDefault(); return }
  if (k === ',') ws.col = (ws.col - 1 + ws.spec.cols) % ws.spec.cols
  else if (k === '.') ws.col = (ws.col + 1) % ws.spec.cols
  else if (k === 'Escape') ws.sel = null
  else if (k === 'Delete' && ws.sel) { lift(); floating = null; ws.sel = null; bump() }
  else {
    const tool = ({ b: 'pencil', e: 'eraser', i: 'pick', g: 'fill', m: 'select' } as Record<string, any>)[k.toLowerCase()]
    if (tool) ws.tool = tool
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, img: any, spec: any, row: number, col: number, alpha: number, off = 0) {
  const f = getFrame(img, spec, row, col)
  const c = document.createElement('canvas')
  c.width = f.w; c.height = f.h
  c.getContext('2d')!.putImageData(new ImageData(f.data, f.w, f.h), 0, 0)
  ctx.globalAlpha = alpha
  ctx.drawImage(c, off * zoom.value, off * zoom.value, f.w * zoom.value, f.h * zoom.value)
  ctx.globalAlpha = 1
}

function draw() {
  const c = cv.value
  if (!c || !ws.sheet) return
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  const z = zoom.value, fs = ws.spec.fs
  ctx.clearRect(0, 0, size.value, size.value)
  // checker
  for (let y = 0; y < fs; y += 4) for (let x = 0; x < fs; x += 4) {
    ctx.fillStyle = ((x + y) / 4) % 2 ? '#2b2d35' : '#24262d'
    ctx.fillRect(x * z, y * z, 4 * z, 4 * z)
  }
  if (ws.onionBody && onion.value) {
    const o = ((fs - 64) / 2) * z
    ctx.globalAlpha = 0.4
    ctx.drawImage(onion.value, o, o, 64 * z, 64 * z)
    ctx.globalAlpha = 1
  }
  if (ws.onionPrev) {
    const prev = ws.col > ws.spec.skip ? ws.col - 1 : ws.spec.cols - 1
    if (prev !== ws.col) drawFrame(ctx, ws.sheet, ws.spec, ws.row, prev, 0.3)
  }
  drawFrame(ctx, ws.sheet, ws.spec, ws.row, ws.col, 1)
  if (floating) {
    const f = floating, t = document.createElement('canvas')
    t.width = f.img.w; t.height = f.img.h
    t.getContext('2d')!.putImageData(new ImageData(f.img.data, f.img.w, f.img.h), 0, 0)
    ctx.drawImage(t, f.x * z, f.y * z, f.img.w * z, f.img.h * z)
  }
  // pixel grid, 64 px cell outline for oversize frames
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= fs; i++) { ctx.moveTo(i * z + 0.5, 0); ctx.lineTo(i * z + 0.5, size.value); ctx.moveTo(0, i * z + 0.5); ctx.lineTo(size.value, i * z + 0.5) }
  ctx.stroke()
  if (fs > 64) {
    ctx.strokeStyle = 'rgba(106,163,255,0.5)'
    const o = ((fs - 64) / 2) * z
    ctx.strokeRect(o + 0.5, o + 0.5, 64 * z, 64 * z)
  }
  const s = floating ? { x: floating.x, y: floating.y, w: floating.img.w, h: floating.img.h } : ws.sel
  if (s) {
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#fff'
    ctx.strokeRect(s.x * z + 0.5, s.y * z + 0.5, s.w * z, s.h * z)
    ctx.setLineDash([])
  }
  if (hover.value && ws.tool !== 'select') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.strokeRect(hover.value.x * z + 0.5, hover.value.y * z + 0.5, z - 1, z - 1)
  }
}

watch(() => [ws.version, ws.row, ws.col, ws.onionBody, ws.onionPrev, ws.sel, onion.value, hover.value, size.value], draw, { deep: true, flush: 'post' })
onMounted(() => { draw(); window.addEventListener('keydown', onKey); window.addEventListener('mouseup', up) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('mouseup', up) })
</script>

<template>
  <canvas ref="cv" class="editor" :class="'tool-' + ws.tool" :width="size" :height="size"
          @mousedown.prevent="down" @mousemove="move" @mouseleave="hover = null" />
</template>

<style scoped>
.editor { image-rendering: pixelated; border: 1px solid var(--border-strong); border-radius: 4px; cursor: crosshair; }
.editor.tool-select { cursor: cell; }
.editor.tool-pick { cursor: copy; }
</style>
