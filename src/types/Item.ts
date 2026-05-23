import {ItemCollection} from "./ItemCollection";
import {ItemLayer} from "./ItemLayer";
import {ItemMaterial} from "./ItemMaterial";
import {ItemCredits} from "./ItemCredits";
import {ItemColors} from "./ItemColors";

/**
 * Represents an item from the packed.json
 */
export class Item {
    id: string
    name: string
    path: string
    group: string
    actAs: string
    sizes:{[key:string]:string}
    preview: string
    animations: string[]
    layers: {[key:string]: ItemLayer} = {}
    materials: {[key:string]: ItemMaterial} = {}
    colors: ItemColors
    credits: ItemCredits
    collection:ItemCollection
    presets: {[key: string]: { name: string, options: {[key: string]: { name: string, color: string }} }} = {}
    selectedPresets: {[key: string]: string} = {}

    constructor(collection:ItemCollection, itemData:any) {
        this.collection = collection
        this.id = itemData.id
        this.name = itemData.name
        this.path = itemData.path
        this.group = itemData.group || null
        this.actAs = itemData.actAs || null
        this.sizes = itemData.sizes || {}
        this.animations = itemData.poses
        this.colors = new ItemColors(this)
        this.preview = itemData.preview
        this.presets = itemData.presets || {}

        for (const [key, preset] of Object.entries(this.presets) as any) {
            if (preset.default) {
                this.selectedPresets[key] = preset.default
            }
        }

        Object.entries(itemData.layers).forEach(([layerIndex, layerData]) => {
            this.layers[layerIndex] = new ItemLayer(this, layerIndex, layerData);
        });

        Object.entries(itemData.materials).forEach(([materialIndex, materialData]) => {
            this.materials[materialIndex] = new ItemMaterial(materialData);
        });

        Object.entries(itemData.colors).forEach(([colorIndex, colorData]) => {
            this.colors.addColor(colorIndex, colorData as string);
        });

        this.credits = new ItemCredits(itemData.authors, itemData.licenses, itemData.urls, itemData.notes);
    }

    /**
     * Load animation
     */
    async load():Promise<any> {
        return Promise.all(Object.values(this.layers).map(layer => layer.load()))
    }

    /**
     * Colorize (and load) animation
     */
    async colorize():Promise<any> {
        return Promise.all(Object.values(this.layers).map(layer => layer.colorize()))
    }

    setPreset(key: string, value: string) {
        this.selectedPresets[key] = value
        this.resetLoaded()
    }

    resetLoaded() {
        for (const layerId in this.layers) {
            this.layers[layerId].resetLoaded()
        }
    }

    /**
     * Get base path for the image (includes selected presets as path segments)
     */
    getPath():string {
        let path = 'spritesheets/' + this.path
        for (const key in this.selectedPresets) {
            path += '/' + this.selectedPresets[key]
        }
        return path
    }

    isAllowed():boolean {
        for(const layerIndex in this.layers) {
            const layer = this.layers[layerIndex]
            if(layer.isAllowed()) {
                return true
            }
        }

        return false;
    }

    getPartSize(animation:string) {
        if(this.id.indexOf('horse') !== -1) {
            return 128;
        }

        if (!this.sizes) {
            return 64
        }

        if (!this.sizes[animation]) {
            return 64
        }

        switch (this.sizes[animation]) {
            case 'lg':
                return 128
            case 'xl':
                return 192
        }

        return 64
    }
}