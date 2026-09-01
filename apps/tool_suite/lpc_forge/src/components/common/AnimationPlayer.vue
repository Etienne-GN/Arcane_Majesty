<script setup lang="ts">
import {ref, reactive, watch, onMounted, type Ref} from 'vue'

import UIButton from '@/components/ui/Button.vue'
import {ItemCollection} from "@/types/ItemCollection";
import {Renderer} from "@/services/Renderer";

const props = defineProps<{
  collection: ItemCollection,
  current: string,
  renderer: Renderer
}>()

const canvas: Ref<HTMLCanvasElement | undefined> = ref();
const base: Ref<HTMLElement | undefined> = ref();
let context: CanvasRenderingContext2D | null = null;

const zoomMin: number = 2;
const zoomMax: number = 15;
const zoomStep: number = 1;

let animationRequestId: number = 0
let animationStartTime: number = 0

const currentCanvas: Ref<HTMLCanvasElement | undefined> = ref();
const playerState: Ref<string> = ref('pause');
const playerDirection: Ref<string> = ref('down');
const playerZoom: Ref<number> = ref(window.innerWidth < 768 ? 6 : 4);
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
  setDirection: (d: string) => { playerDirection.value = d },
  setFrame: (f: number) => { currentFrame.value = f },
  setSpeed: (s: number) => { playerSpeed.value = +s },
  onZoomIn,
  onZoomOut,
  onZoom,
  onCenter,
})

function getDirectionOffset() {
  const directionOffsets: any = {
    'up': 0,
    'left': 1,
    'down': (props.current === 'hurt') ? 0 : 2,
    'right': 3
  };

  return directionOffsets[playerDirection.value] || 0;
}

function init() {
  const animation: any = props.renderer.getAnimationCanvas(props.current);

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

  drawFrame(currentFrame.value);
}

function drawFrame(currentFrame: number) {
  const canvasTileSize: number = 192;
  const size: number = props.collection.getTileSize(props.current);
  const col: number = currentFrame;
  const row: number = getDirectionOffset();
  const x: number = (canvasTileSize - size) / 2;
  const y: number = (canvasTileSize - size) / 2;

  if (!currentCanvas.value) {
    return
  }

  context?.clearRect(0, 0, canvasTileSize, canvasTileSize);
  context?.drawImage(
      currentCanvas.value,
      col * size,
      row * size,
      size,
      size,
      x,
      y,
      size,
      size
  );
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

  if(!canvas.value) {
    return
  }

  canvas.value.style.width = `${64 * playerZoom.value}px`;
  canvas.value.style.height = `${64 * playerZoom.value}px`;

  onCenter();
}

function onCenter() {
  if(!canvas.value || !base.value) {
    return
  }

  const parentNode: HTMLElement = base.value.parentNode as HTMLElement;
  const horizontalSpace: number = (canvas.value.offsetWidth - parentNode.offsetWidth) / 4;
  const verticalSpace: number = (canvas.value.offsetHeight - parentNode.offsetHeight) / 2;

  parentNode.scrollTo(horizontalSpace, verticalSpace);
}

onMounted(() => {
  if(canvas.value) {
    context = canvas.value.getContext('2d');
    onZoom();
    animate()
  }
})

watch(() => props.current, async () => {
  init()
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex-1 overflow-scroll scrollbar-thin min-h-0">
      <div ref="base" class="text-center leading-[0] flex place-content-center">
        <canvas
            class="h-fit aspect-square shrink-0 grow-0 relative pointer-events-none origin-center bg-cover bg-zinc-700 rounded inline-block"
            style="image-rendering: pixelated;" ref="canvas" width="192" height="192"></canvas>
      </div>
    </div>

    <!-- Mobile-only control strip -->
    <div class="md:hidden flex items-center justify-center gap-1.5 py-1.5 shrink-0 border-t border-zinc-700">
      <!-- Play / Pause -->
      <UIButton v-if="playerState !== 'play'" @click="playerState = 'play'" ui="primary-square" title="Play" icon="play"></UIButton>
      <UIButton v-else @click="playerState = 'pause'" ui="primary-square" title="Pause" icon="pause"></UIButton>

      <div class="w-px h-5 bg-zinc-600 mx-0.5"></div>

      <!-- Direction buttons -->
      <UIButton @click="playerDirection = 'left'" :active="playerDirection === 'left'" :disabled="props.current === 'hurt'" ui="primary-square" title="Look Left" icon="arrow-left"></UIButton>
      <UIButton @click="playerDirection = 'up'" :active="playerDirection === 'up'" :disabled="props.current === 'hurt'" ui="primary-square" title="Look Up" icon="arrow-up"></UIButton>
      <UIButton @click="playerDirection = 'down'" :active="playerDirection === 'down'" ui="primary-square" title="Look Down" icon="arrow-down"></UIButton>
      <UIButton @click="playerDirection = 'right'" :active="playerDirection === 'right'" :disabled="props.current === 'hurt'" ui="primary-square" title="Look Right" icon="arrow-right"></UIButton>

      <div class="w-px h-5 bg-zinc-600 mx-0.5"></div>

      <!-- Zoom -->
      <UIButton @click="onZoomOut" :disabled="playerZoom <= zoomMin" ui="primary-square" title="Zoom Out" icon="magnify-minus-outline"></UIButton>
      <UIButton @click="onZoomIn" :disabled="playerZoom >= zoomMax" ui="primary-square" title="Zoom In" icon="magnify-plus-outline"></UIButton>
    </div>
  </div>
</template>
