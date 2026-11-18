// W4: which tiles a townsperson cannot walk on — the tile grid's trees, walls and
// void, every decoration's collision body (catalogueLayout, exactly as GameScene
// builds them) and the spawned props that block. Baked offline by
// tools/gen_walk_grids.mjs into src/data/townsfolk/walk.js, so a route is the same
// whether or not its maps are loaded. Pure — tools/test_townsfolk.mjs.
import { catalogueLayout } from '../utils/catalogueLayout.js';
import { encodeBits } from './regionFormat.js';
import { mapTree } from './pathfind.js';

export const TILE_PX = 32;

// The boot-loaded sheets a map places by field name (BootScene loads each `cat`
// under `catKey`). GameScene._placeCatalogueDecorations places from this table.
const T = 'assets/catalogued/tilesets';
export const DECORATION_SOURCES = [
    { field: 'decorations',                catKey: 'tileset_base_cat',             texKey: 'tileset_base',             cat: `${T}/SampleMap/[Base]BaseChip_pipo.catalogue.json` },
    { field: 'waterTiles',                 catKey: 'tileset_water_cat',            texKey: 'tileset_water',            cat: `${T}/SampleMap/[A]Water_pipo.catalogue.json` },
    { field: 'snowDecorations',            catKey: 'tileset_snowy_cat',            texKey: 'tileset_snowy',            cat: `${T}/SnowyAssetPack/SnowyAssetPack.catalogue.json` },
    { field: 'addworkDecorations',         catKey: 'tileset_addwork_cat',          texKey: 'tileset_addwork',          cat: `${T}/addwork/addwork.catalogue.json` },
    { field: 'patdGrassDecorations',       catKey: 'tileset_patd_grass_cat',       texKey: 'tileset_patd_grass',       cat: `${T}/PATD_TilesetGrass/PATD_TilesetGrass.catalogue.json` },
    { field: 'patdStoneGroundDecorations', catKey: 'tileset_patd_stoneground_cat', texKey: 'tileset_patd_stoneground', cat: `${T}/PATD_TilesetStoneGround/PATD_TilesetStoneGround.catalogue.json` },
    { field: 'patdWallDecorations',        catKey: 'tileset_patd_wall_cat',        texKey: 'tileset_patd_wall',        cat: `${T}/PATD_TilesetWall/PATD_TilesetWall.catalogue.json` },
    { field: 'patdStructDecorations',      catKey: 'tileset_patd_struct_cat',      texKey: 'tileset_patd_struct',      cat: `${T}/PATD_Struct/PATD_Struct.catalogue.json` },
    { field: 'patdPropsDecorations',       catKey: 'tileset_patd_props_cat',       texKey: 'tileset_patd_props',       cat: `${T}/PATD_Props/PATD_Props.catalogue.json` },
    { field: 'patdPlantDecorations',       catKey: 'tileset_patd_plant_cat',       texKey: 'tileset_patd_plant',       cat: `${T}/PATD_Plant/PATD_Plant.catalogue.json` },
    { field: 'lpcTerrainDecorations',      catKey: 'terrain_atlas_cat',            texKey: 'terrain_atlas',            cat: `${T}/lpc/terrain_atlas.catalogue.json` },
    { field: 'lpcBaseOutDecorations',      catKey: 'base_out_atlas_cat',           texKey: 'base_out_atlas',           cat: `${T}/lpc/base_out_atlas.catalogue.json` },
    { field: 'lpcBuildDecorations',        catKey: 'build_atlas_cat',              texKey: 'build_atlas',              cat: `${T}/lpc/build_atlas.catalogue.json` },
    { field: 'lpcObjMiskDecorations',      catKey: 'obj_misk_atlas_cat',           texKey: 'obj_misk_atlas',           cat: `${T}/lpc/obj_misk_atlas.catalogue.json` },
];

// The towns whose maps get a walk grid (src/data/townsfolk/index.js lists the same).
export const WALK_ROOTS = ['thaloria'];

// Spawned props that stand in the way (their base tile).
const BLOCKING_SPAWNS = ['signs', 'stations', 'bountyBoards', 'chests', 'campfires', 'gatheringNodes', 'crackedBoulders', 'npcs'];

// catalogueOf(path) → the parsed catalogue ({ gridTileWidth, gridTileHeight, entries }) or null.
export function blockedTiles(def, catalogueOf) {
    const w = def.tiles[0].length, h = def.tiles.length, out = new Uint8Array(w * h);
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = 1; };
    def.tiles.forEach((row, y) => row.forEach((t, x) => { if (t === 1 || t === 4) mark(x, y); }));
    // A body blocks every tile whose central 16×16 it overlaps (a townsperson is about 16 px wide).
    const markBody = b => {
        for (let ty = Math.floor(b.y / TILE_PX); ty <= Math.floor((b.y + b.h) / TILE_PX); ty++) {
            for (let tx = Math.floor(b.x / TILE_PX); tx <= Math.floor((b.x + b.w) / TILE_PX); tx++) {
                const ix = tx * TILE_PX + 8, iy = ty * TILE_PX + 8;
                if (b.x < ix + 16 && b.x + b.w > ix && b.y < iy + 16 && b.y + b.h > iy) mark(tx, ty);
            }
        }
    };
    const groups = [
        ...DECORATION_SOURCES.map(s => ({ items: def[s.field], cat: s.cat, scale: 1 })),
        ...(def.sheetDecorations ?? []).map(g => ({ items: g.items, cat: (def.extraSheets ?? []).find(e => e.catKey === g.catKey)?.cat, scale: g.scale ?? 1 })),
    ];
    for (const g of groups) {
        if (!g.items?.length || !g.cat) continue;
        const cat = catalogueOf(g.cat);
        if (!cat) continue;
        const byName = new Map(cat.entries.map(e => [e.name, e]));
        for (const d of g.items) {
            const e = byName.get(d.name);
            if (!e) continue;
            const frames = e.frames?.length > 1 ? e.frames : null;
            const cw = e.kind === 'tile' ? cat.gridTileWidth : frames ? Math.max(...frames.map(f => f.w)) : e.w;
            const ch = e.kind === 'tile' ? cat.gridTileHeight : frames ? Math.max(...frames.map(f => f.h)) : e.h;
            const hb = e.hitbox, s = g.scale;
            const placed = s === 1 || !hb ? e : { ...e, hitbox: { x: hb.x * s, y: hb.y * s, w: hb.w * s, h: hb.h * s } };
            const { body } = catalogueLayout(placed, { left: d.x * TILE_PX, top: d.y * TILE_PX, w: cw * s, h: ch * s }, d);
            if (body) markBody(body);
        }
    }
    for (const k of BLOCKING_SPAWNS) for (const s of def.spawns?.[k] ?? []) mark(s.x, s.y);
    return out;
}

export function computeWalk(getMap, catalogueOf, roots = WALK_ROOTS) {
    const out = {};
    for (const root of roots) {
        for (const { id } of mapTree(root, getMap)) {
            const def = getMap(id), w = def.tiles[0].length, h = def.tiles.length;
            const b = blockedTiles(def, catalogueOf), cells = [];
            b.forEach((v, i) => { if (v) cells.push([i % w, Math.floor(i / w)]); });
            out[id] = encodeBits(cells, w, h);
        }
    }
    return out;
}
