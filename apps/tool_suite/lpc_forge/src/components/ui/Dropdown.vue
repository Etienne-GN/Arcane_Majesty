<script setup lang="ts">
import {type Ref, ref, watch, onUnmounted, nextTick} from 'vue';

import {Item} from "@/types/Item";

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  type: string,
  options: any,
  selected: any
}>();

const emit = defineEmits(['selected'])

const isDropdownOpen:Ref<boolean> = ref(false);
const dropdownLabel:Ref<HTMLElement | null> = ref(null);
const dropdownList:Ref<HTMLElement | null> = ref(null);
const mobileList:Ref<HTMLElement | null> = ref(null);
const position:Ref<string> = ref('bottom');
const isMobile:Ref<boolean> = ref(window.innerWidth < 768);

function scrollToSelected(listEl: HTMLElement | null) {
  if (!listEl || !props.selected?.id) return
  listEl.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
}

watch(isDropdownOpen, (open) => {
  if (open && isMobile.value) {
    nextTick(() => scrollToSelected(mobileList.value))
  }
})

function onResize() {
  isMobile.value = window.innerWidth < 768;
}
window.addEventListener('resize', onResize);

function getHiddenHeight(element:HTMLElement) {
  if(!element?.cloneNode) {
    return 0;
  }

  const clone:HTMLElement = element.cloneNode(true) as HTMLElement;

  Object.assign(clone.style, {
    overflow: 'visible',
    height: 'auto',
    opacity: '0',
    visibility: 'hidden',
    display: 'block',
  });

  element.after(clone);
  const height = clone.offsetHeight;
  clone.remove();

  return height;
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;

  if(isMobile.value || !dropdownList.value || !dropdownLabel.value) {
    return
  }

  const dropdownHeight:number = getHiddenHeight(dropdownList.value)
  const windowHeight:number = window.visualViewport?.height ?? window.innerHeight
  const dropdownBottom:number = dropdownLabel.value.getBoundingClientRect().bottom

  if (windowHeight - dropdownBottom < dropdownHeight) {
    position.value = 'top'
  } else {
    position.value = 'bottom'
  }

  nextTick(() => scrollToSelected(dropdownList.value))
}

function selectOption(option:Item | null) {
  isDropdownOpen.value = false;

  if(!option) {
    emit('selected', null)
  } else {
    emit('selected', option.id)
  }
}

function sortedOpts(opts: any[]) {
  return [...opts].sort((a, b) => a.name.localeCompare(b.name));
}

function closeDropdownOnOutsideClick(event:any) {
  if (!event.target.closest('#select-' + props.type.replace('.', '-'))) {
    isDropdownOpen.value = false;
  }
}

window.addEventListener('click', closeDropdownOnOutsideClick);

onUnmounted(() => {
  window.removeEventListener('click', closeDropdownOnOutsideClick);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div v-bind="$attrs" ref="dropdownLabel" :id="'select-' + type.replace('.', '-')" class="relative inline-block cursor-pointer bg-zinc-700 text-zinc-300 w-full overflow-visible" :class="{'rounded-bl': position == 'top' && isDropdownOpen && !isMobile, 'rounded-tl': position == 'bottom' && isDropdownOpen && !isMobile, 'rounded-l': !isDropdownOpen || isMobile}">
    <div @click="toggleDropdown" class="p-1.5 flex">
      <div class="grow select-none">
        {{(selected && selected.id) ? selected.name : 'Select...'}}
      </div>
      <div class="justify-self-end"><i class="mdi mdi-menu-down"></i></div>
    </div>

    <!-- Desktop: absolute positioned dropdown -->
    <ul v-if="!isMobile" ref="dropdownList" class="z-10 list-none p-0 m-0 absolute w-full bg-zinc-600 overflow-y-scroll scrollbar-thin max-h-96 divide-y divide-zinc-700" :class="{hidden: !isDropdownOpen, 'top-full': position == 'bottom', 'bottom-auto': position == 'bottom', 'top-auto': position == 'top', 'bottom-full': position == 'top', 'rounded-b': position == 'bottom', 'rounded-t': position == 'top'}">
      <li class="select-none text-zinc-200 px-2 py-1 cursor-pointer hover:bg-zinc-500" @click.stop="selectOption(null)">
        None
      </li>
      <template v-for="(opts, key) of options">
        <li v-if="key.toString() != '_'" class="select-none capitalize text-zinc-200 px-2 py-1 pointer-events-none bg-zinc-700">
          {{key}}
        </li>
        <li :title="option.name" :data-selected="selected?.id === option.id" class="select-none text-zinc-200 px-2 py-1 cursor-pointer hover:bg-zinc-500 flex" :class="{'bg-zinc-500': selected?.id === option.id}" v-for="(option, index) in sortedOpts(opts)" :key="option?.id" @click.stop="selectOption(option)">
          <div class="w-[64px] min-w-[64px] aspect-square mr-2"><img class="rounded bg-zinc-400" :src="option.preview"></div>
          <div class="self-center truncate">{{ option.name }}</div>
        </li>
      </template>
    </ul>
  </div>

  <!-- Mobile: bottom sheet modal (teleported to body to avoid any clipping) -->
  <Teleport to="body" v-if="isMobile && isDropdownOpen">
    <div class="fixed inset-0 z-50 flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/60" @click="isDropdownOpen = false"></div>
      <div class="relative bg-zinc-800 rounded-t-2xl max-h-[75vh] flex flex-col">
        <div class="p-4 border-b border-zinc-700 flex justify-between items-center shrink-0">
          <span class="text-zinc-200 font-medium capitalize">{{ type.split('.').pop() }}</span>
          <button @click="isDropdownOpen = false" class="text-zinc-400 p-1"><i class="mdi mdi-close text-xl"></i></button>
        </div>
        <ul ref="mobileList" class="overflow-y-auto scrollbar-thin divide-y divide-zinc-700 list-none p-0 m-0">
          <li class="select-none text-zinc-300 px-4 py-3 cursor-pointer active:bg-zinc-700" @click="selectOption(null)">
            None
          </li>
          <template v-for="(opts, key) of options">
            <li v-if="key.toString() != '_'" class="select-none capitalize text-zinc-500 text-xs px-4 py-2 pointer-events-none bg-zinc-900">
              {{key}}
            </li>
            <li :title="option.name" :data-selected="selected?.id === option.id" class="select-none text-zinc-200 px-4 py-3 cursor-pointer active:bg-zinc-700 flex items-center" :class="{'bg-zinc-600': selected?.id === option.id}" v-for="(option, index) in sortedOpts(opts)" :key="option?.id" @click="selectOption(option)">
              <div class="w-12 min-w-12 aspect-square mr-3"><img class="rounded bg-zinc-400 w-full h-full object-cover" :src="option.preview"></div>
              <div class="truncate">{{ option.name }}</div>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<style>

</style>
