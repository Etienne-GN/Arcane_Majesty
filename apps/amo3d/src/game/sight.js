// Aether Sight, the active use (L · touch MENU → Aether Sight). The second hand of the world, read on purpose:
// for a few seconds the world turns blue-violet at the edges and
//   — creatures within 25 m are slowed (crippled) for 2/3/4 s (amo's Aetheric Sight: "Slow enemies for 2/3/4s"),
//   — each one's detection range shows as a faint ring on the ground ("Reveals detection ranges"),
//   — what hides is shown: near-invisible things (Frost-Shades, wraiths) at full strength, and illusions marked
//     (Malphas's doubles cast no shadow — with the sight they show as hollow).
// Who has it: Eldrin from the Hermit's teaching (flag aether_sight, counts as level 1), or anyone who learned the
// Aetheric Sight skill (its level 1–3). Mana 18, 14 s cooldown; lasts 4/5/6 s.
import * as THREE from 'three';
import { coreOf, PX, SIGHT } from '../content/actors/enemyCore.js';
import { sfx } from '../engine/sfx.js';

export function createSight({ stats, hud, getMap, getPlayer }) {
    let active = 0, cd = 0, rings = [];
    const level = () => Math.max(stats.skills?.aetheric_sight?.level ?? 0, stats.flags?.aether_sight ? 1 : 0);
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .5s;background:radial-gradient(ellipse at center, transparent 45%, #4a3aaa55 80%, #2a1a6a99 100%);mix-blend-mode:screen';
    document.body.append(veil);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5a7a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const hollowMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });

    function clear() { for (const r of rings) r.mesh.parent?.remove(r.mesh); rings = []; }
    function use() {
        const L = level();
        if (!L) return hud.message('You have not learned to read the second hand of the world.');
        if (active > 0) return;
        if (cd > 0) return hud.message(`Aether Sight — ${Math.ceil(cd)}s`);
        if ((stats.mana ?? 0) < 18) return hud.message('Not enough mana for the sight.');
        stats.mana -= 18; active = 3 + L; cd = 14; SIGHT.on = true;   // (beast.js shows the near-invisible while it is on)
        veil.style.opacity = 1; sfx.cast?.('arcane');
        const map = getMap(), p = getPlayer().pos;
        let slowed = 0;
        for (const h of map?.hittables ?? []) {
            if (h.alive === false || !h.pos || Math.hypot(h.pos.x - p.x, h.pos.z - p.z) > 25) continue;
            const core = coreOf(h.pos);
            if (core) { core.addStatus('crippled', (1 + L) * 1000); slowed++; }
            const sightR = core?.DEF?.sightRange ? (core.DEF.sightRange / PX) * 2.6 : null;   // (beast.js: SIGHT = sightRange / PX × 2.6)
            const illusion = h.kind === 'void_general' && !core;   // (Malphas's doubles have no core of their own)
            if (sightR || illusion) {
                const mesh = new THREE.Mesh(new THREE.RingGeometry(illusion ? 0.7 : sightR - 0.12, illusion ? 0.95 : sightR, 48).rotateX(-Math.PI / 2), illusion ? hollowMat : ringMat);
                mesh.renderOrder = 2; map.scene.add(mesh); rings.push({ mesh, h });
            }
        }
        hud.banner(slowed ? 'Aether Sight — the second hand of the world' : 'Aether Sight');
    }
    function update(dt) {
        cd = Math.max(0, cd - dt);
        if (active <= 0) return;
        active -= dt;
        const map = getMap();
        for (const r of rings) { const y = map?.heightAt?.(r.h.pos.x, r.h.pos.z) ?? r.h.pos.y; r.mesh.position.set(r.h.pos.x, y + 0.08, r.h.pos.z); r.mesh.visible = r.h.alive !== false; }
        if (active <= 0) { veil.style.opacity = 0; clear(); SIGHT.on = false; }
    }
    return { use, update, get active() { return active > 0; }, get level() { return level(); }, get cooldown() { return cd; } };
}
