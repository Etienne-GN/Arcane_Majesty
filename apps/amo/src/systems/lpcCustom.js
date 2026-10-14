/**
 * Registers the custom overlay (sheets authored in LPC Forge's motion workshop,
 * served from public/lpc_custom/) with lpcLayout, so animPath and resolveAnim
 * see them. Imported for its side effect by CharacterRenderer.
 */
import LPC_CUSTOM from '../data/lpc_custom.json' with { type: 'json' };
import { setCustomFiles } from './lpcLayout.js';

setCustomFiles(Object.keys(LPC_CUSTOM));
