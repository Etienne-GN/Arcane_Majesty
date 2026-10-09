/**
 * Published cast members (designed in LPC Forge v2, files in src/data/cast) as
 * CharacterRenderer configs. Unpublished members are invisible to the game.
 */
import { CAST } from '../data/cast/index.js';
import { DEFAULT_ANIMS } from './animResolve.js';

/** Renderer config for a published cast member (or one of its variants); null otherwise. */
export function castConfig(id, variant, cast = CAST) {
    const c = cast[id];
    if (!c?.published) return null;
    const layers = variant ? c.variants?.[variant]?.layers : c.layers;
    if (!layers) return null;
    return { layers, animations: DEFAULT_ANIMS, defaultAnim: 'walk', defaultDir: 'down' };
}
