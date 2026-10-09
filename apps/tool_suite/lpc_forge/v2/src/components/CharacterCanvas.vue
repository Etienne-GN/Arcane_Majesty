<script setup lang="ts">
import { ref, watch, onMounted, shallowRef } from 'vue'
import { resolveAnim } from '@game/systems/animResolve.js'
import { frameRateFor } from '@game/systems/lpcLayout.js'
import { loadSheet, drawLayer } from '@v2/render/sheets.js'
import { layerKeyOf } from '@v2/model/composition.js'
import { useTick } from '@v2/clock'

const props = defineProps<{
  layers: any[]; motion: string; dir: string; scale?: number; missingOverlay?: boolean; still?: boolean
}>()
// Emitted when the set of layers with no file for this motion changes.
const emit = defineEmits<{ missing: [string[]] }>()

const cv = ref<HTMLCanvasElement>()
const sheets = shallowRef<(any | null)[]>([])
const t = useTick()
let lastMissing = ''
let loadSeq = 0

const keyOf = layerKeyOf

async function load() {
  const seq = ++loadSeq
  const out = await Promise.all(props.layers.map(l => {
    const c = resolveAnim(l, props.motion)
    return c ? loadSheet(l, c) : Promise.resolve(null)
  }))
  if (seq === loadSeq) sheets.value = out   // ignore results of a superseded load
}

function draw() {
  const c = cv.value
  if (!c || sheets.value.length !== props.layers.length) return
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 64, 64)
  const frame = props.still ? 0 : Math.floor((t.value * frameRateFor(props.motion)) / 1000)
  const missing: string[] = []
  // "Missing" = the layer has no file for this motion (a real gap). An empty
  // direction row (a blade behind the body facing up) is by design: not drawn,
  // not counted.
  props.layers.forEach((l, i) => {
    if (!sheets.value[i]) missing.push(keyOf(l))
    else drawLayer(ctx, sheets.value[i], props.motion, props.dir, frame, 0, 0)
  })
  if (props.missingOverlay && missing.length) {
    ctx.strokeStyle = '#e5484d'
    ctx.setLineDash([2, 2])
    ctx.strokeRect(0.5, 0.5, 63, 63)
    ctx.setLineDash([])
    ctx.fillStyle = '#e5484d'
    ctx.fillRect(52, 0, 12, 9)
    ctx.fillStyle = '#fff'
    ctx.font = '8px monospace'
    ctx.fillText(String(missing.length), 55, 8)
  }
  const k = missing.join('|')
  if (k !== lastMissing) { lastMissing = k; emit('missing', missing) }
}

watch(() => [props.layers, props.motion], load, { immediate: true, deep: true })
watch([sheets, () => props.dir, () => props.missingOverlay], draw)
watch(t, () => { if (!props.still) draw() })
onMounted(draw)
</script>

<template>
  <canvas ref="cv" width="64" height="64"
          :style="{ width: 64 * (scale ?? 2) + 'px', height: 64 * (scale ?? 2) + 'px', imageRendering: 'pixelated' }" />
</template>
