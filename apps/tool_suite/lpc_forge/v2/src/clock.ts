import { ref } from 'vue'
import { store } from './store'

// One animation clock for every canvas, so all 60 grid cells stay in step.
const t = ref(0)
let last = performance.now()
function loop(now: number) {
  if (store.playing) t.value += (now - last) * store.speed
  last = now
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

export function useTick() { return t }

/** Move one frame of a motion playing at `fps`, forward (+1) or back (−1). */
export function stepFrame(fps: number, delta: number) {
  t.value = Math.max(0, t.value + (delta * 1000) / fps)
}
