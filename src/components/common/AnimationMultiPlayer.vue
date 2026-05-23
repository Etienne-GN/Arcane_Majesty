<script setup lang="ts">
import {ref, reactive, watch, onMounted, type Ref} from 'vue'

import {ItemCollection} from "@/types/ItemCollection";
import {Renderer} from "@/services/Renderer";

const props = defineProps<{
  collection: ItemCollection,
  current: string,
  renderer: Renderer
}>()

const canvas: any = {
  up: ref(),
  left: ref(),
  right: ref(),
  down: ref()
};

const base: any = {
  up: ref(),
  left: ref(),
  right: ref(),
  down: ref()
};

const context: any = {
  up: null,
  left: null,
  right: null,
  down: null
};

const zoomMin: number = 2;
const zoomMax: number = 8;
const zoomStep: number = 1;

let animationRequestId: number
let animationStartTime: number

const currentCanvas: Ref<HTMLCanvasElement | undefined> = ref();
const playerState: Ref<string> = ref('pause');
const playerDirection: Ref<string> = ref('down');
const playerZoom: Ref<number> = ref(4);
const playerSpeed: Ref<number> = ref(8);
const totalFrames: Ref<number> = ref(0);
const currentFrame: Ref<number> = ref(0);

const state = reactive({ playerState, playerDirection, playerZoom, playerSpeed, totalFrames, currentFrame })

defineExpose({
  state,
  zoomMin,
  zoomMax,
  play: () => { playerState.value = 'play' },
  pause: () => { playerState.value = 'pause' },
  setFrame: (f: number) => { currentFrame.value = f },
  setSpeed: (s: number) => { playerSpeed.value = +s },
  onZoomIn,
  onZoomOut,
  onZoom,
  onCenter,
})

function getDirectionOffset(direction: string) {
  const directionOffsets: any = {
    'up': 0,
    'left': 1,
    'down': (props.current === 'hurt') ? 0 : 2,
    'right': 3
  };

  return directionOffsets[direction] || 0;
}

function init() {
  const animation = props.renderer.getAnimationCanvas(props.current);

  if (!animation.value) {
    return;
  }

  if (props.current === 'hurt') {
    playerDirection.value = 'down';
  }

  currentCanvas.value = animation.value;
  totalFrames.value = (animation.value.width / props.collection.getTileSize(props.current));
}

function animate() {
  init();
  cancelAnimationFrame(animationRequestId)
  animationStartTime = performance.now()
  animationRequestId = requestAnimationFrame(runAnimation)
}

function runAnimation(timestamp: number) {
  animationRequestId = requestAnimationFrame(runAnimation)

  init()

  const elapsedTime: number = timestamp - animationStartTime
  const nextFrame: number = Math.floor(elapsedTime / 1000 * playerSpeed.value) % totalFrames.value

  if (nextFrame === currentFrame.value) return

  if (playerState.value == 'play') {
    currentFrame.value = nextFrame
  }

  if (props.current == 'hurt') {
    const canvasTileSize: number = 192;
    for (let dir of ['up', 'left', 'right']) {
      context[dir].clearRect(0, 0, canvasTileSize, canvasTileSize);
    }
    drawFrame(currentFrame.value, 'down');
  } else {
    for (let dir of ['up', 'left', 'right', 'down']) {
      drawFrame(currentFrame.value, dir);
    }
  }
}

function drawFrame(currentFrame: number, direction: string) {
  const canvasTileSize: number = 192;
  const size: number = props.collection.getTileSize(props.current);
  const col: number = currentFrame;
  const row: number = getDirectionOffset(direction);
  const x: number = (canvasTileSize - size) / 2;
  const y: number = (canvasTileSize - size) / 2;

  if (!currentCanvas.value) {
    return
  }

  context[direction].clearRect(0, 0, canvasTileSize, canvasTileSize);
  context[direction].drawImage(
      currentCanvas.value,
      col * size,
      row * size,
      size,
      size,
      x,
      y,
      size,
      size
  )
}

function onZoomIn() {
  playerZoom.value = Math.min(playerZoom.value + zoomStep, zoomMax);
  onZoom();
}

function onZoomOut() {
  playerZoom.value = Math.max(playerZoom.value - zoomStep, zoomMin);
  onZoom();
}

function onZoom(factor: any = null) {
  if (factor !== null) {
    playerZoom.value = +factor;
  }

  for (let dir of ['up', 'left', 'right', 'down']) {
    canvas[dir].value.style.width = `${64 * playerZoom.value}px`;
    canvas[dir].value.style.height = `${64 * playerZoom.value}px`;
  }

  onCenter();
}

function onCenter() {
  for (let dir of ['up', 'left', 'right', 'down']) {
    const horizontalSpace = (canvas[dir].value.offsetWidth - base[dir].value.offsetWidth) / 4;
    const verticalSpace = (canvas[dir].value.offsetHeight - base[dir].value.offsetHeight) / 2;

    base[dir].value.scrollTo(horizontalSpace, verticalSpace);
  }
}

function onScroll(direction: string) {
  const { scrollLeft, scrollTop } = base[direction].value;
  ['up', 'left', 'right', 'down']
      .filter(dir => dir !== direction)
      .forEach(dir => base[dir].value.scrollTo(scrollLeft, scrollTop));
}

onMounted(() => {
  for (let dir of ['up', 'left', 'right', 'down']) {
    context[dir] = canvas[dir].value.getContext('2d');
  }

  onZoom();
  animate()
})

watch(() => props.current, async () => {
  init()
})
</script>

<template>
  <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-5">
    <div :ref="base.down" @scroll.passive="onScroll('down')"
         class="overflow-scroll scrollbar-thin text-center leading-[0] flex place-content-center">
      <canvas
          class="h-fit aspect-square shrink-0 grow-0 relative pointer-events-none origin-center bg-cover bg-zinc-700 rounded inline-block"
          style="image-rendering: pixelated;" :ref="canvas.down" width="192" height="192"></canvas>
    </div>

    <div :ref="base.left" @scroll.passive="onScroll('left')"
         class="overflow-scroll scrollbar-thin text-center leading-[0] flex place-content-center">
      <canvas
          class="h-fit aspect-square shrink-0 grow-0 relative pointer-events-none origin-center bg-cover bg-zinc-700 rounded inline-block"
          style="image-rendering: pixelated;" :ref="canvas.left" width="192" height="192"></canvas>
    </div>

    <div :ref="base.up" @scroll.passive="onScroll('up')"
         class="overflow-scroll scrollbar-thin text-center leading-[0] flex place-content-center">
      <canvas
          class="h-fit aspect-square shrink-0 grow-0 relative pointer-events-none origin-center bg-cover bg-zinc-700 rounded inline-block"
          style="image-rendering: pixelated;" :ref="canvas.up" width="192" height="192"></canvas>
    </div>

    <div :ref="base.right" @scroll.passive="onScroll('right')"
         class="overflow-scroll scrollbar-thin text-center leading-[0] flex place-content-center">
      <canvas
          class="h-fit aspect-square shrink-0 grow-0 relative pointer-events-none origin-center bg-cover bg-zinc-700 rounded inline-block"
          style="image-rendering: pixelated;" :ref="canvas.right" width="192" height="192"></canvas>
    </div>
  </div>
</template>
