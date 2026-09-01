<script setup lang="ts">
import '@mdi/font/css/materialdesignicons.css'
import CharacterView from '@/components/CharacterView.vue'
import HorseView from '@/components/HorseView.vue'

import {ref, watch} from 'vue'

let tab = ref('character');

</script>

<template>
  <div class="flex flex-col h-screen bg-zinc-900 scrollbar-thumb-amber-950 scrollbar-track-transparent scrollbar-thumb-rounded">
    <header class="flex bg-zinc-900 text-zinc-300 h-16 px-4 items-center gap-2 md:gap-4 border-b border-zinc-800">
      <div class="flex gap-2 items-center text-zinc-400 shrink-0">
        <img :src="'logo.png'" class="border-zinc-600 border-2 rounded-full h-11 bg-zinc-800">
        <h1 class="hidden md:block">LPC Forge</h1>
      </div>
      <div class="grow flex gap-2 justify-center">
        <button @click="tab = 'character'" class="p-1 px-2 rounded" :class="{'bg-zinc-700': tab == 'character', 'hover:bg-zinc-800': tab != 'character'}"><i class="mdi mdi-human"></i> <span class="hidden md:inline">Character</span></button>
        <button @click="tab = 'horse'" class="p-1 px-2 rounded" :class="{'bg-zinc-700': tab == 'horse', 'hover:bg-zinc-800': tab != 'horse'}"><i class="mdi mdi-horse"></i> <span class="hidden md:inline">Horse</span></button>
      </div>
      <div class="text-right shrink-0">
        <a href="https://github.com/vitruvianstudio" target="_blank" class="text-zinc-400 hover:text-zinc-200 text-2xl" title="Based on Vitruvian Studio"><i class="mdi mdi-github"></i></a>
      </div>
    </header>
    <div class="h-[0px]"></div>

    <character-view :class="{hidden: tab != 'character'}"></character-view>
    <horse-view :class="{hidden: tab != 'horse'}"></horse-view>

    <footer class="h-8 flex items-center justify-center bg-zinc-800 text-zinc-500 text-xs gap-3">
      <span>LPC Forge</span>
      <span>·</span>
      <span>Based on <a href="https://github.com/vitruvianstudio/vitruvian-web" target="_blank" class="hover:text-zinc-300">Vitruvian Studio</a> (AGPL-3.0)</span>
    </footer>
  </div>
</template>

<style scoped>

</style>
