// W5: the map overview as a Phaser canvas texture, one per map, shared by the minimap
// (UIScene) and the full map (MapScene). Kept for the session and repainted in place,
// so no scene ever draws a destroyed texture. The pixels come from mapPaint.js.
import Phaser from 'phaser';
import { paintMap, paintCells } from './mapPaint.js';

export const mapTextureKey = mapId => `__map_${mapId}`;

function upload(scene, key, img) {
    let tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
    if (tex && (tex.width !== img.w || tex.height !== img.h)) { scene.textures.remove(key); tex = null; }
    if (!tex) {
        tex = scene.textures.createCanvas(key, img.w, img.h);
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    tex.context.putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
    tex.refresh();
}

// { key, img, w, h } with the whole map painted, or null for a map without a tile grid.
export function buildMapTexture(scene, mapId, def, fog, opts) {
    const img = paintMap(def, fog, opts);
    if (!img) return null;
    const key = mapTextureKey(mapId);
    upload(scene, key, img);
    return { key, img, w: img.w, h: img.h };
}

export function repaintMapTexture(scene, mapImg, def, fog, cells, opts) {
    if (!mapImg) return;
    paintCells(mapImg.img, def, fog, cells, opts);
    upload(scene, mapImg.key, mapImg.img);
}
