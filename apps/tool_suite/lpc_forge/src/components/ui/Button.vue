<script setup lang="ts">
const props = defineProps<{
  ui: string,
  title: string,
  icon?: string,
  active?: boolean
  small?: boolean
}>()

function getClasses():string {
  let colorsPrimary:string = 'bg-amber-600 hover:bg-amber-700';
  let colorsSecondary:string = 'bg-zinc-600 hover:bg-zinc-700';
  let squareSize:string = ' h-8 w-8';

  if(props.active) {
    colorsPrimary = 'bg-amber-400 hover:bg-amber-400';
    colorsSecondary = 'bg-zinc-400 hover:bg-zinc-400';
  }

  if(props.small) {
    colorsPrimary += ' text-sm'
    colorsSecondary += ' text-sm'
    squareSize = ' h-6 w-6';
  }

  switch(props.ui) {
    case 'primary':
      return colorsPrimary + ' py-1 px-3 disabled:bg-amber-800 disabled:text-zinc-500 text-zinc-200';
    case 'primary-square':
      return colorsPrimary + squareSize + ' aspect-square leading-none disabled:bg-amber-800 disabled:text-zinc-500 text-zinc-200';
    case 'secondary':
      return colorsSecondary + ' py-1 px-3 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-200';
    case 'secondary-square':
      return colorsSecondary + squareSize + ' aspect-square leading-none disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-200';
  }

  return ''
}

function getIconClass(slots:any) {
  let out = `mdi mdi-${props.icon}`;

  if(slots._) {
    out += ' mr-2';
  }

  return out;
}
</script>
<template>
  <button :title="title" :class="getClasses()" class="rounded flex place-content-center">
    <template v-if="icon">
      <i :class="getIconClass($slots)" class="self-center"></i>
    </template>
    <template v-if="$slots">
      <slot></slot>
    </template>
  </button>
</template>