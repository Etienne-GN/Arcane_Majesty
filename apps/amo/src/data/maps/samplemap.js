// AUTO-GENERATED test map — direct import of the Tiled-authored samplemap.tmx
// demo scene (60x60 tiles, 9 layers, 5 tilesets: WaterFall, BaseChip, Grass,
// Water, Flower), converted via tools/tiled_import/tmx_to_json.py. This is a
// proof-of-concept for loading a real Tiled map natively through Phaser's own
// tilemap system, rather than the flat tile-value + decorations format the
// other test maps use — the intended standard going forward for hand-authored
// maps built in Tiled.
//
// playerStart was picked by scanning the converted JSON for a tile where all
// four blocking layers (water/building/building_up/tree) are empty (gid 0) —
// an open grass patch just left of the farm.

export const SAMPLEMAP = {
    id: 'samplemap',
    displayName: 'Sample Map (Tiled Import)',
    mapCols: 60,
    mapRows: 60,
    lightTint: null,
    playerStart: { x: 4, y: 6 },
    tiledMap: {
        jsonKey: 'samplemap_json',
        tilesetImageKeys: {
            '[A]WaterFall_pipo':  'tileset_waterfall',
            '[Base]BaseChip_pipo': 'tileset_base',
            '[A]Grass_pipo':      'tileset_grass',
            '[A]Water_pipo':      'tileset_water',
            '[A]Flower_pipo':     'tileset_flower',
        },
        // Layer names as authored in Tiled (file order = draw order):
        // ground, grass, farm, farm_up, water, water_grass, building,
        // building_up, tree
        blockingLayers: ['water', 'building', 'building_up', 'tree'],
        overlayLayers: ['building_up', 'tree'],
    },
    portals: [],
    spawns: {},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'Sample Map (Tiled Import)',
};
