<script setup lang="ts">
import {type Ref, ref, computed} from "vue";

import SideBar from "@/components/ui/SideBar.vue";
import ShortBar from "@/components/ui/ShortBar.vue";
import UiButton from "@/components/ui/Button.vue"
import PoseBar from "@/components/ui/PoseBar.vue";

import ColorSelect from "@/components/common/ColorSelect.vue";
import AnimationPlayer from "@/components/common/AnimationPlayer.vue";
import AnimationMultiPlayer from "@/components/common/AnimationMultiPlayer.vue";
import SavingsCard from "@/components/common/SavingsCard.vue";
import CreditsCard from "@/components/common/CreditsCard.vue";
import RenderingsCard from "@/components/common/RenderingsCard.vue";
import SpriteCard from "@/components/common/SpriteCard.vue";

import SpriteCanvas from "@/components/horse/SpriteCanvas.vue";

import {HorseRenderer} from "@/services/HorseRenderer";

import {ColorCollection} from "@/types/ColorCollection";
import {HorseCollection} from "@/types/HorseCollection";
import {Item} from "@/types/Item";

import raw_data from '@/data/packed.json'
import raw_colors from '@/data/colors.json'


const colors:Ref<ColorCollection> = ref(new ColorCollection())
colors.value.initColors(raw_colors)
const collection:Ref<HorseCollection> = ref(new HorseCollection(colors.value)) as Ref<HorseCollection>
collection.value.initItems(raw_data);

const renderer:HorseRenderer = new HorseRenderer(collection.value);
const spriteCanvas = ref()
const refresh:Ref<number> = ref(0)
const sideBar:Ref<any> = ref()

const leftTab:Ref<string> = ref('anatomy');
const rightTab:Ref<string> = ref('savings');
const centerTab:Ref<string> = ref('preview-multiple');

const currentColorPicker:Ref<boolean> = ref(false)
const currentColorItem:Ref<Item | null> = ref(null)
const currentColorMaterial:Ref<string> = ref('')

function onToggleColorSelector(item:Item, material:string) {
  currentColorPicker.value = !!item;
  currentColorItem.value = item;
  currentColorMaterial.value = material;
}

async function onColorSelected(color:string) {
  if(!currentColorItem.value) {
    return
  }

  currentColorItem.value?.colors.set(currentColorMaterial.value, color);
  await collection.value.select(currentColorItem.value)
  renderer.draw();
  refresh.value++;

  onColorPickerClosed();
}

function onColorPickerClosed() {
  currentColorPicker.value = false
  currentColorItem.value = null
  currentColorMaterial.value = ''

  sideBar.value.$el.scrollTo(0, 0)
}

function jumpToNextActiveAnimation() {
  if(collection.value.isAnimationDisabled(currentPose.value)) {
    currentPose.value = 'walk'
  }
}

async function onRefresh() {
  renderer.draw();
  refresh.value++;
  jumpToNextActiveAnimation()
}

const currentPose = ref('walk')
const mobilePanel = ref<'left'|'right'>('left')

const singlePlayer = ref()
const multiPlayer = ref()
const activePlayer = computed(() => {
  if (centerTab.value === 'preview') return singlePlayer.value
  if (centerTab.value === 'preview-multiple') return multiPlayer.value
  return null
})

function setMobileLeftTab(tab: string) {
  leftTab.value = tab
  mobilePanel.value = 'left'
}

function setMobileRightTab(tab: string) {
  rightTab.value = tab
  mobilePanel.value = 'right'
}
</script>

<template>
  <section class="flex flex-col md:flex-row flex-1 overflow-hidden relative bg-zinc-900 md:divide-x md:divide-zinc-800">

    <!-- Left icon nav: desktop only -->
    <short-bar class="!hidden md:!flex md:!flex-col">
      <ui-button @click="leftTab = 'anatomy'" :active="leftTab == 'anatomy'" ui="primary-square" title="Anatomy" icon="horse"></ui-button>
      <ui-button @click="leftTab = 'clothes'" :disabled="!collection.isBodySelected()" :active="leftTab == 'clothes'" ui="primary-square" title="Clothes" icon="hanger"></ui-button>
    </short-bar>

    <!-- Left panel: below canvas on mobile, sidebar on desktop -->
    <side-bar ref="sideBar" class="order-3 md:order-none flex-1 md:flex-none md:block" :class="{'hidden': mobilePanel === 'right'}">
      <sprite-card @selected="onRefresh" @toggle-color-selector="onToggleColorSelector" :hidden="currentColorPicker" :refresh="refresh" :collection="collection" :tab="leftTab"></sprite-card>
      <color-select @selected="onColorSelected" @close="onColorPickerClosed" :collection="collection" :item="currentColorItem" :material="currentColorMaterial" :class="{hidden: !currentColorPicker}" class="bg-zinc-900 text-zinc-400"></color-select>
    </side-bar>

    <!-- Mobile-only right panel (savings/credits/render) -->
    <aside class="order-3 md:hidden flex-1 overflow-y-auto bg-zinc-900 scrollbar-thin" :class="{'hidden': mobilePanel !== 'right'}">
      <savings-card @loaded="onRefresh" :collection="collection" :renderer="renderer" type="horse" :class="{'hidden': rightTab != 'savings'}"></savings-card>
      <credits-card :collection="collection" :class="{'hidden': rightTab != 'credits'}"></credits-card>
      <renderings-card :collection="collection" :renderer="renderer" :current="currentPose" :class="{'hidden': rightTab != 'render'}"></renderings-card>
    </aside>

    <!-- Canvas: top on mobile, center on desktop -->
    <main class="order-1 md:order-none flex flex-col overflow-hidden shrink-0 h-64 md:h-auto md:flex-1 gap-4 bg-zinc-800">
      <pose-bar :class="{hidden: centerTab == 'sprites'}">
        <ui-button :disabled="collection.isAnimationDisabled('walk')" @click="currentPose = 'walk'" :active="currentPose == 'walk'" ui="primary" title="Walk">Walk</ui-button>
        <ui-button :disabled="collection.isAnimationDisabled('gallop')" @click="currentPose = 'gallop'" :active="currentPose == 'gallop'" ui="primary" title="Gallop">Gallop</ui-button>
        <ui-button :disabled="collection.isAnimationDisabled('idle')" @click="currentPose = 'idle'" :active="currentPose == 'idle'" ui="primary" title="Idle">Idle</ui-button>
      </pose-bar>
      <div class="grow overflow-scroll scrollbar-thin p-2">
        <!-- Mobile: single animation player always shown -->
        <animation-player :current="currentPose" :collection="collection" :renderer="renderer" class="md:hidden"></animation-player>
        <!-- Desktop: view depends on centerTab -->
        <sprite-canvas ref="spriteCanvas" :current="currentPose" :renderer="renderer" class="hidden md:block" :class="{'!hidden': centerTab != 'sprites'}"></sprite-canvas>
        <animation-multi-player ref="multiPlayer" :current="currentPose" :collection="collection" :renderer="renderer" class="hidden md:grid" :class="{'!hidden': centerTab != 'preview-multiple'}"></animation-multi-player>
        <animation-player ref="singlePlayer" :current="currentPose" :collection="collection" :renderer="renderer" class="hidden md:block" :class="{'!hidden': centerTab != 'preview'}"></animation-player>
      </div>
      <!-- Desktop bottom bar: playback controls + view toggles -->
      <div class="hidden md:flex items-center gap-2 px-3 py-1.5 shrink-0 border-t border-zinc-700 overflow-x-auto scrollbar-thin">
        <template v-if="centerTab !== 'sprites' && activePlayer">
          <!-- Play / Pause -->
          <ui-button v-if="activePlayer.state.playerState !== 'play'" @click="activePlayer.play()" ui="primary-square" title="Play" icon="play"></ui-button>
          <ui-button v-else @click="activePlayer.pause()" ui="primary-square" title="Pause" icon="pause"></ui-button>

          <!-- Direction buttons: single-player only -->
          <template v-if="centerTab === 'preview'">
            <div class="w-px h-5 bg-zinc-600 mx-0.5 shrink-0"></div>
            <ui-button @click="singlePlayer.setDirection('left')" :active="singlePlayer.state.playerDirection === 'left'" :disabled="currentPose === 'hurt'" ui="primary-square" title="Look Left" icon="arrow-left"></ui-button>
            <ui-button @click="singlePlayer.setDirection('up')" :active="singlePlayer.state.playerDirection === 'up'" :disabled="currentPose === 'hurt'" ui="primary-square" title="Look Up" icon="arrow-up"></ui-button>
            <ui-button @click="singlePlayer.setDirection('down')" :active="singlePlayer.state.playerDirection === 'down'" ui="primary-square" title="Look Down" icon="arrow-down"></ui-button>
            <ui-button @click="singlePlayer.setDirection('right')" :active="singlePlayer.state.playerDirection === 'right'" :disabled="currentPose === 'hurt'" ui="primary-square" title="Look Right" icon="arrow-right"></ui-button>
          </template>

          <div class="w-px h-5 bg-zinc-600 mx-0.5 shrink-0"></div>

          <label class="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <span>Zoom</span>
            <input class="range-slider w-20" type="range" :min="activePlayer.zoomMin" :max="activePlayer.zoomMax" :value="activePlayer.state.playerZoom" @input="activePlayer.onZoom(+($event.target as HTMLInputElement).value)">
          </label>

          <label class="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <span>Speed</span>
            <input class="range-slider w-20" type="range" min="1" max="24" :value="activePlayer.state.playerSpeed" @input="activePlayer.setSpeed(+($event.target as HTMLInputElement).value)">
          </label>

          <label class="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <span>Frame</span>
            <input class="range-slider w-20" type="range" min="0" :max="Math.max(0, activePlayer.state.totalFrames - 1)" :value="activePlayer.state.currentFrame" @input="activePlayer.setFrame(+($event.target as HTMLInputElement).value)">
          </label>

          <ui-button @click="activePlayer.onCenter()" ui="primary-square" title="Center" icon="image-filter-center-focus"></ui-button>
        </template>

        <div class="flex-1"></div>

        <ui-button @click="centerTab = 'preview-multiple'" :active="centerTab == 'preview-multiple'" ui="primary-square" title="Preview Multiple" icon="filmstrip-box-multiple"></ui-button>
        <ui-button @click="centerTab = 'preview'" :active="centerTab == 'preview'" ui="primary-square" title="Preview" icon="filmstrip-box"></ui-button>
        <ui-button @click="centerTab = 'sprites'" :active="centerTab == 'sprites'" ui="primary-square" title="Sprites" icon="grid"></ui-button>
      </div>
    </main>

    <!-- Right panel: desktop only -->
    <side-bar class="hidden md:block">
      <savings-card @loaded="onRefresh" :collection="collection" :renderer="renderer" type="horse" :class="{'hidden': rightTab != 'savings'}"></savings-card>
      <credits-card :collection="collection" :class="{'hidden': rightTab != 'credits'}"></credits-card>
      <renderings-card :collection="collection" :renderer="renderer" :current="currentPose" :class="{'hidden': rightTab != 'render'}"></renderings-card>
    </side-bar>

    <!-- Right icon nav: desktop only -->
    <short-bar class="!hidden md:!flex md:!flex-col">
      <ui-button @click="rightTab = 'savings'" :active="rightTab == 'savings'" ui="primary-square" title="Savings" icon="folder"></ui-button>
      <ui-button :disabled="!collection.isBodySelected()" @click="rightTab = 'credits'" :active="rightTab == 'credits'" ui="primary-square" title="Credits" icon="license"></ui-button>
      <ui-button :disabled="!collection.isBodySelected()" @click="rightTab = 'render'" :active="rightTab == 'render'" ui="primary-square" title="Renderings" icon="folder-image"></ui-button>
    </short-bar>

    <!-- Mobile bottom nav -->
    <div class="order-4 sticky bottom-0 z-10 flex md:hidden shrink-0 bg-zinc-900 border-t border-zinc-700 justify-around py-1">
      <ui-button @click="setMobileLeftTab('anatomy')" :active="leftTab == 'anatomy' && mobilePanel === 'left'" ui="primary-square" title="Anatomy" icon="horse"></ui-button>
      <ui-button @click="setMobileLeftTab('clothes')" :disabled="!collection.isBodySelected()" :active="leftTab == 'clothes' && mobilePanel === 'left'" ui="primary-square" title="Clothes" icon="hanger"></ui-button>
      <ui-button @click="setMobileRightTab('savings')" :active="mobilePanel === 'right'" ui="primary-square" title="Savings" icon="folder"></ui-button>
    </div>
  </section>
</template>

<style scoped>

</style>
