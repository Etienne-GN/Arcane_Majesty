import type { Sheet, SpriteEntry } from './api';

export interface GridCell { sheet: Sheet; entry: SpriteEntry; key: string }

// The grid's display order, shared with App so "select the next sprite"
// after an approval means the next one you actually see on screen.
export function orderedCells(sheets: Sheet[], visibleKeys: Set<string>, sortOrder: 'name' | 'sheet'): GridCell[] {
    const cells: GridCell[] = [];
    for (const sheet of sheets) {
        for (const entry of sheet.entries) {
            const key = `${sheet.sheetPngFilename}::${entry.name}`;
            if (visibleKeys.has(key)) cells.push({ sheet, entry, key });
        }
    }
    // 'sheet' order (the loop above) is spatial — the order pieces sit in
    // the source PNG, useful when position on the sheet matters. 'name'
    // groups same-family sprites together (grass_fill_a next to
    // grass_fill_b) regardless of where they happen to live on the sheet,
    // which is the point when reviewing a whole collection at once.
    if (sortOrder === 'name') {
        cells.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
    }
    return cells;
}
