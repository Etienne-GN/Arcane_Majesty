/**
 * Converts a hand-written ASCII-art layout into the tiles 2D array the map
 * engine expects, replacing hand-typed rows of comma-separated ints.
 * Default legend matches the existing tile-value meanings exactly.
 */
export const DEFAULT_LEGEND = { '.': 0, '#': 1, '=': 2 };

export function asciiToTiles(asciiText, legend = DEFAULT_LEGEND) {
    const lines = asciiText.split('\n').filter(l => l.length > 0);
    const width = lines[0]?.length ?? 0;
    return lines.map((line, r) => {
        if (line.length !== width) {
            throw new Error(`row ${r} has length ${line.length}, expected ${width} (all rows must be the same width)`);
        }
        return [...line].map(ch => {
            if (!(ch in legend)) {
                throw new Error(`row ${r}: unrecognized character "${ch}" (legend keys: ${Object.keys(legend).join(', ')})`);
            }
            return legend[ch];
        });
    });
}
