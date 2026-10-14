<script setup lang="ts">
import { ref, watch, onMounted, shallowRef } from 'vue'
import { frameRateFor } from '@game/systems/lpcLayout.js'
import { layerPlan, drawLayer } from '@v2/render/sheets.js'
import { useTick } from '@v2/clock'
import { store } from '@v2/store'

const props = defineProps<{
  layers: any[]; motion: string; dir: string; scale?: number; missingOverlay?: boolean; still?: boolean
}>()

const cv = ref<HTMLCanvasElement>()
// Per layer, as the game draws it: { mode: own|fallback|borrow|hide|missing, concrete, sheet }
const plans = shallowRef<any[]>([])
const t = useTick()
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  const out = await Promise.all(props.layers.map(l => layerPlan(l, props.motion, store.rules, store.ruleOverrides)))
  if (seq === loadSeq) plans.value = out   // ignore results of a superseded load
}

// Overlay corner badges: amber = falls back to walk frames, blue = borrowed, red = hidden/missing.
const BADGES: [string, string[]][] = [['#e0a030', ['fallback']], ['#4a8fe0', ['borrow']], ['#e5484d', ['hide', 'missing']]]

function draw() {
  const c = cv.value
  if (!c || plans.value.length !== props.layers.length) return
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 64, 64)
  for (const p of plans.value) {
    if (!p.sheet) continue
    // Fallback layers run their walk cycle at walk speed (as in the game); others at the motion's.
    const fps = frameRateFor(p.mode === 'fallback' ? p.concrete : props.motion)
    const frame = props.still ? 0 : Math.floor((t.value * fps) / 1000)
    drawLayer(ctx, p.sheet, p.concrete, props.dir, frame, 0, 0, p.mode === 'borrow' ? props.motion : undefined)
  }
  if (props.missingOverlay) {
    let x = 64
    for (const [colour, modes] of BADGES) {
      const n = plans.value.filter(p => modes.includes(p.mode)).length
      if (!n) continue
      x -= 11
      ctx.fillStyle = colour
      ctx.fillRect(x, 0, 10, 9)
      ctx.fillStyle = '#fff'
      ctx.font = '8px monospace'
      ctx.fillText(String(n), x + 2, 8)
    }
  }
}

watch(() => [props.layers, props.motion, store.rules, store.ruleOverrides, store.sheetVersion], load, { immediate: true, deep: true })
watch([plans, () => props.dir, () => props.missingOverlay], draw)
watch(t, () => { if (!props.still) draw() })
onMounted(draw)
</script>

<template>
  <canvas ref="cv" width="64" height="64"
          :style="{ width: 64 * (scale ?? 2) + 'px', height: 64 * (scale ?? 2) + 'px', imageRendering: 'pixelated' }" />
</template>
