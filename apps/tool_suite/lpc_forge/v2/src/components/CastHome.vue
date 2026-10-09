<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ROLES, coverage, validateCast } from '@v2/model/cast.js'
import CharacterCanvas from './CharacterCanvas.vue'
import { catalogue, store } from '@v2/store'
import { castList, cast, refreshCast, openCast, newCast, deleteCastMember } from '@v2/castState'

const role = ref<string>('all')
const shown = computed(() => castList.value.filter(c => role.value === 'all' || c.role === role.value))
const cards = computed(() => shown.value.map(c => ({
  c,
  cov: coverage(c.layers ?? []),
  errors: validateCast(catalogue, c),
})))
onMounted(refreshCast)
</script>

<template>
  <div class="home">
    <div class="bar">
      <h2>Cast</h2>
      <button v-for="r in ['all', ...ROLES]" :key="r" :class="{ active: role === r }" @click="role = r">{{ r }}</button>
      <span class="grow" />
      <button @click="store.screen = 'forge'">Scratch forge</button>
      <button class="primary" @click="newCast">New character</button>
    </div>
    <p v-if="cast.error" class="err">{{ cast.error }}</p>
    <div class="grid">
      <article v-for="{ c, cov, errors } in cards" :key="c.id" class="card" @click="openCast(c)">
        <CharacterCanvas class="checker" :layers="c.layers ?? []" motion="walk" dir="down" :scale="2" />
        <div class="meta">
          <strong>{{ c.name }}</strong>
          <span class="muted">{{ c.role }}<template v-if="c.dbCharacter"> · {{ c.dbCharacter }}</template></span>
          <span class="chips">
            <span :class="['chip', c.published ? 'pub' : 'draft']">{{ c.published ? 'Published' : 'Draft' }}</span>
            <span class="chip" :class="cov.clean === cov.total ? 'pub' : 'warn'" :title="Object.entries(cov.gaps).filter(([, g]) => (g as string[]).length).map(([m]) => m).join(', ')">
              {{ cov.clean }}/{{ cov.total }} motions clean
            </span>
            <span v-if="c.migrationNotes?.length" class="chip warn" :title="c.migrationNotes.join('\n')">{{ c.migrationNotes.length }} migration notes</span>
            <span v-if="errors.length" class="chip bad" :title="errors.join('\n')">{{ errors.length }} problems</span>
            <span v-if="Object.keys(c.variants ?? {}).length" class="chip">{{ Object.keys(c.variants).length }} variant{{ Object.keys(c.variants).length === 1 ? '' : 's' }}</span>
          </span>
        </div>
        <button class="del" title="Delete" @click.stop="deleteCastMember(c.id)">✕</button>
      </article>
      <p v-if="!cards.length && !cast.error" class="muted">No cast members yet — make one with “New character”.</p>
    </div>
  </div>
</template>

<style scoped>
.home { grid-column: 1 / -1; overflow: auto; padding: 0 20px 20px; }
.bar { display: flex; gap: 6px; align-items: center; padding: 12px 0; position: sticky; top: 0; background: var(--bg); z-index: 1; }
.bar h2 { margin: 0 12px 0 0; font-size: 16px; }
.bar button { text-transform: capitalize; }
.grow { flex: 1; }
.primary { border-color: var(--accent); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.card { position: relative; display: flex; gap: 12px; padding: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; }
.card:hover { border-color: var(--accent); }
.meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.muted { color: var(--muted); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.chip { font-size: 11px; padding: 1px 6px; border-radius: 10px; border: 1px solid var(--border-strong); color: var(--muted); }
.chip.pub { color: var(--ok); border-color: var(--ok); }
.chip.draft { color: var(--muted); }
.chip.warn { color: #f0a030; border-color: #f0a030; }
.chip.bad { color: var(--missing); border-color: var(--missing); }
.del { position: absolute; top: 6px; right: 6px; padding: 1px 6px; opacity: .5; }
.del:hover { opacity: 1; }
.err { color: var(--missing); }
</style>
