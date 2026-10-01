<script setup lang="ts">
import { imageUrl } from '@shared/api';
import type { Flag } from '@shared/api';
import FlagThread from './FlagThread.vue';
import { zoneFlags, sheetByName, setScope, view } from '../store';

// Zone flags: areas of a sheet flagged in the sheet view (badly cropped or
// uncatalogued items). Each shows the zone itself, cropped from the sheet,
// and its conversation with Claude.
const PREVIEW = 160;   // px, the larger side of the crop preview

function previewStyle(f: Flag) {
    const r = f.region!;
    const s = Math.min(PREVIEW / Math.max(r.w, r.h), 8);
    const sh = sheetByName.value.get(f.sheet);
    return {
        width: `${Math.round(r.w * s)}px`, height: `${Math.round(r.h * s)}px`,
        backgroundImage: `url(${imageUrl(f.sheet)})`,
        backgroundPosition: `${-r.x * s}px ${-r.y * s}px`,
        backgroundSize: sh?.sheetWidth ? `${sh.sheetWidth * s}px auto` : 'auto',
    };
}
function showOnSheet(f: Flag) {
    setScope({ kind: 'sheet', id: f.sheet });
    view.value = 'sheet';
}
</script>

<template>
  <div class="zones">
    <p class="muted head">Areas of a sheet you flagged in the sheet view (✎ Zone tool). Claude sees the exact pixels.</p>
    <div v-if="!zoneFlags.length" class="muted empty">No zone flags. Open a sheet, press <kbd>Z</kbd> and drag around what is wrong.</div>
    <div class="list">
      <div v-for="f in zoneFlags" :key="f.id" class="card">
        <div class="where">
          <div class="crop pixelated checker" :style="previewStyle(f)" />
          <div class="meta">
            <div class="mono">{{ f.sheet }}</div>
            <div class="muted mono small">x {{ f.region!.x }}, y {{ f.region!.y }} · {{ f.region!.w }}×{{ f.region!.h }}px</div>
            <button class="ghost" @click="showOnSheet(f)">Show on sheet</button>
          </div>
        </div>
        <FlagThread :flag="f" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.zones { flex: 1; overflow-y: auto; padding: 16px; }
.head { margin: 0 0 12px; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px; }
.card { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; background: var(--panel); }
.where { display: flex; gap: 10px; align-items: flex-start; }
.crop { background-repeat: no-repeat; image-rendering: pixelated; border: 1px solid var(--border); flex: none; }
.meta { display: flex; flex-direction: column; gap: 4px; font-size: 12px; min-width: 0; word-break: break-all; }
.small { font-size: 11px; }
.empty { padding: 40px; text-align: center; }
</style>
