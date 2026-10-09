/**
 * Phaser-free LPC palette data and pixel remapping, shared by the game
 * (CharacterCreatorScene, CharacterRenderer) and LPC Forge v2. Tables moved
 * verbatim from CharacterCreatorScene.
 */
// Tint palettes sourced from lpc_forge ULPC palette definitions (mid-tone shade per colour)
// Palette swap: source pixel colors per material (from ulpc-*-palettes.json "source" key, RGB only)
export const PALETTE_SOURCE = {
    hair:   [0x260D14, 0x6A1108, 0xA02600, 0xA02600, 0xA42600, 0xBF4000, 0xE55600, 0xFF8A00],
    body:   [0x271920, 0x271920, 0x99423C, 0xCC8665, 0xE4A47C, 0xF9D5BA, 0xFAECE7, 0xF8F3EB],
    cloth:       [0x1D131E, 0x1D131E, 0x411E05, 0x4B2B13, 0x62351C, 0x744B30, 0x996B4A],
    cloth_light: [0x281820, 0x4D4A5D, 0x958080, 0xC4B59F, 0xE5E6C7, 0xFFFFFF],  // grey tshirt/shortsleeve palette
    metal:       [0x1D131E, 0x2E2533, 0x4D4A5D, 0x726B7E, 0x867E7F, 0xC4B59F, 0xFFFFFF],
    // Animal head materials — natural pixel colors extracted from default sprites
    fur:    [0x000000, 0x000000, 0x1E120E, 0x251B19, 0x473730, 0x624135, 0x975B5A, 0xD79993],  // Fur Brown (wolf, boarman, wartotaur)
    green:  [0x140C09, 0x140C09, 0x09320B, 0x19541D, 0x228236, 0x39AA4E, 0x53BF71, 0xADCCA6],  // Green (lizard, orc, goblin, troll)
    tan:    [0x222121, 0x222121, 0x3A200E, 0x663A1A, 0x975F43, 0xB88751, 0xDB8E60, 0xE9BBA0],  // Fur Tan (minotaur)
    zombie: [0x281820, 0x281820, 0x6B5C40, 0x928364, 0xA79778, 0xC5B38F, 0xDBCBAB, 0xEAD7CA],  // Zombie flesh
    // Wound blood colors — only remaps the blood-red pixels; flesh/bone/brain tones unaffected
    wound:  [0x511818, 0x9f2828, 0x9d3f3f],
};

// Palette entries: hex = swatch display color, shades = target RGB array (null = Natural/no swap).
// hair: 26, body: 47, cloth: 24, metal: 8 (+ Natural each)
export const TINT_PALETTE = {
    hair: [
        { name: 'Natural',     hex: 0xffffff, shades: null },
        { name: 'Orange',      hex: 0xBF4000, shades: [0x260D14, 0x6A1108, 0xA42600, 0xA42600, 0xA42600, 0xBF4000, 0xE55600, 0xFF8A00] },
        { name: 'Ash',         hex: 0xC18F8A, shades: [0x2D061B, 0x642442, 0x935065, 0x935065, 0x935065, 0xC18F8A, 0xEDDF95, 0xFFF1C1] },
        { name: 'Platinum',    hex: 0xC0AB81, shades: [0x1C0E06, 0x7D5D5D, 0xA87D52, 0xA87D52, 0xA87D52, 0xC0AB81, 0xEDDF95, 0xF6F6F3] },
        { name: 'White',       hex: 0xB8BBBC, shades: [0x1D1D21, 0x484E57, 0x8B9498, 0x8B9498, 0x8B9498, 0xB8BBBC, 0xD8DCDC, 0xFFFFFF] },
        { name: 'Gray',        hex: 0x777777, shades: [0x0E0E0E, 0x292929, 0x4B4B4B, 0x4B4B4B, 0x4B4B4B, 0x777777, 0xAAAAAA, 0xD9D9D9] },
        { name: 'Blonde',      hex: 0xE09E2B, shades: [0x331313, 0x552B15, 0xAC5D1F, 0xAC5D1F, 0xAC5D1F, 0xE09E2B, 0xFCCF56, 0xFFE67D] },
        { name: 'Sandy',       hex: 0xBF9D5A, shades: [0x1C0E06, 0x633E2C, 0x99622D, 0x99622D, 0x99622D, 0xBF9D5A, 0xEDDC7E, 0xF6F6C2] },
        { name: 'Strawberry',  hex: 0xCCA000, shades: [0x300700, 0x6A2800, 0x9C5900, 0x9C5900, 0x9C5900, 0xCCA000, 0xFAF080, 0xF6F6C2] },
        { name: 'Gold',        hex: 0xFFA913, shades: [0x5C0D00, 0x902900, 0xE47100, 0xE47100, 0xE47100, 0xFFA913, 0xFFE453, 0xEEFE7E] },
        { name: 'Ginger',      hex: 0xCC6901, shades: [0x300500, 0x6A1A00, 0x9C3B01, 0x9C3B01, 0x9C3B01, 0xCC6901, 0xFAA301, 0xFFE01E] },
        { name: 'Carrot',      hex: 0xEC673E, shades: [0x5A1500, 0x8A2000, 0xAC2800, 0xAC2800, 0xAC2800, 0xEC673E, 0xF68764, 0xFFB39C] },
        { name: 'Redhead',     hex: 0x9E1F1F, shades: [0x260D14, 0x3E111A, 0x73171E, 0x73171E, 0x73171E, 0x9E1F1F, 0xC7341B, 0xE74716] },
        { name: 'Red',         hex: 0xCB0000, shades: [0x300000, 0x870000, 0xA40712, 0xA40712, 0xA40712, 0xCB0000, 0xE21414, 0xF1583A] },
        { name: 'Light Brown', hex: 0x7D4513, shades: [0x1A0E04, 0x301B07, 0x60350F, 0x60350F, 0x60350F, 0x7D4513, 0xAE682A, 0xC88D58] },
        { name: 'Chestnut',    hex: 0x81310A, shades: [0x200C0D, 0x3A130E, 0x63200B, 0x63200B, 0x63200B, 0x81310A, 0xB6550E, 0xD28102] },
        { name: 'Dark Brown',  hex: 0x421603, shades: [0x050100, 0x160701, 0x290E02, 0x290E02, 0x290E02, 0x421603, 0x5F1F04, 0x792806] },
        { name: 'Dark Gray',   hex: 0x3B3B3B, shades: [0x000000, 0x0E0E0E, 0x1B1B1B, 0x1B1B1B, 0x1B1B1B, 0x3B3B3B, 0x7C7C7C, 0xC1C1C1] },
        { name: 'Black',       hex: 0x1C2222, shades: [0x000000, 0x080A0A, 0x101414, 0x101414, 0x101414, 0x1C2222, 0x31313E, 0x4A5057] },
        { name: 'Raven',       hex: 0x071F2A, shades: [0x010107, 0x040B18, 0x061421, 0x061421, 0x061421, 0x071F2A, 0x0D384D, 0x1A5369] },
        { name: 'Rose',        hex: 0xCC789D, shades: [0x30051F, 0x6A1E4B, 0x9C4373, 0x9C4373, 0x9C4373, 0xCC789D, 0xFABBC6, 0xFAE1E5] },
        { name: 'Pink',        hex: 0xE941AA, shades: [0x330410, 0x71043A, 0xB60A68, 0xB60A68, 0xB60A68, 0xE941AA, 0xE976C4, 0xEA95D5] },
        { name: 'Purple',      hex: 0x7141B2, shades: [0x13112D, 0x2B225A, 0x402E82, 0x402E82, 0x402E82, 0x7141B2, 0xA966DD, 0xD085ED] },
        { name: 'Violet',      hex: 0x3C07D8, shades: [0x1E032E, 0x30035C, 0x380392, 0x380392, 0x380392, 0x3C07D8, 0x5662F3, 0x5792F2] },
        { name: 'Navy',        hex: 0x322D6A, shades: [0x180716, 0x20102B, 0x281E41, 0x281E41, 0x281E41, 0x322D6A, 0x3C49AD, 0x466AC9] },
        { name: 'Blue',        hex: 0x0041B4, shades: [0x000027, 0x00005E, 0x000091, 0x000091, 0x000091, 0x0041B4, 0x0074CB, 0x1E85EF] },
        { name: 'Green',       hex: 0x005000, shades: [0x000400, 0x001400, 0x002D00, 0x002D00, 0x002D00, 0x005000, 0x007C00, 0x00A700] },
    ],
    body: [
        { name: 'Natural',      hex: 0xffffff, shades: null },
        // ── skin tones ────────────────────────────────────────────────────────
        { name: 'Light',        hex: 0xE4A47C, shades: [0x271920, 0x271920, 0x99423C, 0xCC8665, 0xE4A47C, 0xF9D5BA, 0xFAECE7, 0xF8F3EB] },
        { name: 'Amber',        hex: 0xEA9F54, shades: [0x281716, 0x281716, 0x9E3E37, 0xD28144, 0xEA9F54, 0xFDD082, 0xFBE7A4, 0xFBE7A4] },
        { name: 'Olive',        hex: 0xAE6B3F, shades: [0x271920, 0x271920, 0x442725, 0x7F4C31, 0xAE6B3F, 0xD38B59, 0xE4A47C, 0xE4A47C] },
        { name: 'Taupe',        hex: 0x936849, shades: [0x271920, 0x271920, 0x503734, 0x785946, 0x936849, 0xBA8454, 0xC7935F, 0xC7935F] },
        { name: 'Bronze',       hex: 0x7F4C31, shades: [0x1A1213, 0x1A1213, 0x442725, 0x644133, 0x7F4C31, 0xAE6B3F, 0xD38B59, 0xD38B59] },
        { name: 'Brown',        hex: 0x76513A, shades: [0x120E10, 0x120E10, 0x412B29, 0x5F4539, 0x76513A, 0x9C663E, 0xB8773F, 0xB8773F] },
        { name: 'Ebony',        hex: 0x442725, shades: [0x000000, 0x000000, 0x1A1213, 0x2E1F1C, 0x442725, 0x603429, 0x7F4C31, 0x7F4C31] },
        { name: 'Lavender',     hex: 0xA0A5BC, shades: [0x16171B, 0x16171B, 0x393B44, 0x787C8F, 0xA0A5BC, 0xC9D0EE, 0xFBECE6, 0xF8F3EB] },
        { name: 'Pale Green',   hex: 0x5F874D, shades: [0x271920, 0x271920, 0x314829, 0x456238, 0x5F874D, 0x86B278, 0xADCCA6, 0xF8F3EB] },
        { name: 'Bright Green', hex: 0x5B8F11, shades: [0x02280E, 0x02280E, 0x06410E, 0x255E1D, 0x5B8F11, 0x75AE23, 0x99D248, 0xD4D887] },
        { name: 'Dark Green',   hex: 0x255E1D, shades: [0x011708, 0x011708, 0x02280E, 0x06410E, 0x255E1D, 0x508A48, 0x509E59, 0x509E59] },
        { name: 'Jade',         hex: 0x228236, shades: [0x140C09, 0x140C09, 0x09320B, 0x19541D, 0x228236, 0x39AA4E, 0x53BF71, 0xADCCA6] },
        { name: 'Zombie',       hex: 0xA79778, shades: [0x281820, 0x281820, 0x6B5C40, 0x928364, 0xA79778, 0xC5B38F, 0xDBCBAB, 0xEAD7CA] },
        { name: 'Zombie Green', hex: 0x839F6E, shades: [0x101925, 0x101925, 0x074337, 0x4A7A69, 0x839F6E, 0xD4D887, 0xF2F0C4, 0xF8F3EB] },
        // ── fur tones ────────────────────────────────────────────────────────
        { name: 'Fur Black',    hex: 0x14212C, shades: [0x040510, 0x040510, 0x0A0E1B, 0x0D1621, 0x14212C, 0x1B2C36, 0x154259, 0x265C78] },
        { name: 'Fur Brown',    hex: 0x473730, shades: [0x000000, 0x000000, 0x1E120E, 0x251B19, 0x473730, 0x624135, 0x975B5A, 0xD79993] },
        { name: 'Fur Copper',   hex: 0x9C3B01, shades: [0x0F0506, 0x0F0506, 0x300500, 0x6A1A00, 0x9C3B01, 0xCC6901, 0xFAA301, 0xFFE01E] },
        { name: 'Fur Gold',     hex: 0xE09E2B, shades: [0x200808, 0x200808, 0x552B15, 0xAC5D1F, 0xE09E2B, 0xFCCF56, 0xFFE67D, 0xF6F6C2] },
        { name: 'Fur Grey',     hex: 0x6A6E74, shades: [0x0F0F11, 0x0F0F11, 0x36363F, 0x55585F, 0x6A6E74, 0x909699, 0xB8BBBC, 0xD3D9DA] },
        { name: 'Fur Tan',      hex: 0x975F43, shades: [0x222121, 0x222121, 0x3A200E, 0x663A1A, 0x975F43, 0xB88751, 0xDB8E60, 0xE9BBA0] },
        { name: 'Fur White',    hex: 0x8B9498, shades: [0x17171A, 0x222121, 0x36363F, 0x484E57, 0x8B9498, 0xB8BBBC, 0xD8DCDC, 0xFAFAFA] },
        // ── hair palette (matches tail file colors exactly) ───────────────────
        { name: 'Orange',      hex: 0xBF4000, shades: [0x260D14, 0x6A1108, 0xA42600, 0xA42600, 0xA42600, 0xBF4000, 0xE55600, 0xFF8A00] },
        { name: 'Ash',         hex: 0xC18F8A, shades: [0x2D061B, 0x642442, 0x935065, 0x935065, 0x935065, 0xC18F8A, 0xEDDF95, 0xFFF1C1] },
        { name: 'Platinum',    hex: 0xC0AB81, shades: [0x1C0E06, 0x7D5D5D, 0xA87D52, 0xA87D52, 0xA87D52, 0xC0AB81, 0xEDDF95, 0xF6F6F3] },
        { name: 'White',       hex: 0xB8BBBC, shades: [0x1D1D21, 0x484E57, 0x8B9498, 0x8B9498, 0x8B9498, 0xB8BBBC, 0xD8DCDC, 0xFFFFFF] },
        { name: 'Gray',        hex: 0x777777, shades: [0x0E0E0E, 0x292929, 0x4B4B4B, 0x4B4B4B, 0x4B4B4B, 0x777777, 0xAAAAAA, 0xD9D9D9] },
        { name: 'Blonde',      hex: 0xE09E2B, shades: [0x331313, 0x552B15, 0xAC5D1F, 0xAC5D1F, 0xAC5D1F, 0xE09E2B, 0xFCCF56, 0xFFE67D] },
        { name: 'Sandy',       hex: 0xBF9D5A, shades: [0x1C0E06, 0x633E2C, 0x99622D, 0x99622D, 0x99622D, 0xBF9D5A, 0xEDDC7E, 0xF6F6C2] },
        { name: 'Strawberry',  hex: 0xCCA000, shades: [0x300700, 0x6A2800, 0x9C5900, 0x9C5900, 0x9C5900, 0xCCA000, 0xFAF080, 0xF6F6C2] },
        { name: 'Gold',        hex: 0xFFA913, shades: [0x5C0D00, 0x902900, 0xE47100, 0xE47100, 0xE47100, 0xFFA913, 0xFFE453, 0xEEFE7E] },
        { name: 'Ginger',      hex: 0xCC6901, shades: [0x300500, 0x6A1A00, 0x9C3B01, 0x9C3B01, 0x9C3B01, 0xCC6901, 0xFAA301, 0xFFE01E] },
        { name: 'Carrot',      hex: 0xEC673E, shades: [0x5A1500, 0x8A2000, 0xAC2800, 0xAC2800, 0xAC2800, 0xEC673E, 0xF68764, 0xFFB39C] },
        { name: 'Redhead',     hex: 0x9E1F1F, shades: [0x260D14, 0x3E111A, 0x73171E, 0x73171E, 0x73171E, 0x9E1F1F, 0xC7341B, 0xE74716] },
        { name: 'Red',         hex: 0xCB0000, shades: [0x300000, 0x870000, 0xA40712, 0xA40712, 0xA40712, 0xCB0000, 0xE21414, 0xF1583A] },
        { name: 'Light Brown', hex: 0x7D4513, shades: [0x1A0E04, 0x301B07, 0x60350F, 0x60350F, 0x60350F, 0x7D4513, 0xAE682A, 0xC88D58] },
        { name: 'Chestnut',    hex: 0x81310A, shades: [0x200C0D, 0x3A130E, 0x63200B, 0x63200B, 0x63200B, 0x81310A, 0xB6550E, 0xD28102] },
        { name: 'Dark Brown',  hex: 0x421603, shades: [0x050100, 0x160701, 0x290E02, 0x290E02, 0x290E02, 0x421603, 0x5F1F04, 0x792806] },
        { name: 'Dark Gray',   hex: 0x3B3B3B, shades: [0x000000, 0x0E0E0E, 0x1B1B1B, 0x1B1B1B, 0x1B1B1B, 0x3B3B3B, 0x7C7C7C, 0xC1C1C1] },
        { name: 'Black',       hex: 0x1C2222, shades: [0x000000, 0x080A0A, 0x101414, 0x101414, 0x101414, 0x1C2222, 0x31313E, 0x4A5057] },
        { name: 'Raven',       hex: 0x071F2A, shades: [0x010107, 0x040B18, 0x061421, 0x061421, 0x061421, 0x071F2A, 0x0D384D, 0x1A5369] },
        { name: 'Rose',        hex: 0xCC789D, shades: [0x30051F, 0x6A1E4B, 0x9C4373, 0x9C4373, 0x9C4373, 0xCC789D, 0xFABBC6, 0xFAE1E5] },
        { name: 'Pink',        hex: 0xE941AA, shades: [0x330410, 0x71043A, 0xB60A68, 0xB60A68, 0xB60A68, 0xE941AA, 0xE976C4, 0xEA95D5] },
        { name: 'Purple',      hex: 0x7141B2, shades: [0x13112D, 0x2B225A, 0x402E82, 0x402E82, 0x402E82, 0x7141B2, 0xA966DD, 0xD085ED] },
        { name: 'Violet',      hex: 0x3C07D8, shades: [0x1E032E, 0x30035C, 0x380392, 0x380392, 0x380392, 0x3C07D8, 0x5662F3, 0x5792F2] },
        { name: 'Navy',        hex: 0x322D6A, shades: [0x180716, 0x20102B, 0x281E41, 0x281E41, 0x281E41, 0x322D6A, 0x3C49AD, 0x466AC9] },
        { name: 'Blue',        hex: 0x0041B4, shades: [0x000027, 0x00005E, 0x000091, 0x000091, 0x000091, 0x0041B4, 0x0074CB, 0x1E85EF] },
        { name: 'Green',       hex: 0x005000, shades: [0x000400, 0x001400, 0x002D00, 0x002D00, 0x002D00, 0x005000, 0x007C00, 0x00A700] },
    ],
    cloth: [
        { name: 'Natural',  hex: 0xffffff, shades: null },
        { name: 'Brown',    hex: 0x744B30, shades: [0x1D131E, 0x1D131E, 0x411E05, 0x4B2B13, 0x62351C, 0x744B30, 0x996B4A] },
        { name: 'Leather',  hex: 0x75502D, shades: [0x2B1C1D, 0x2B1C1D, 0x311210, 0x4B2B13, 0x704325, 0x75502D, 0x9A6F37] },
        { name: 'Walnut',   hex: 0x996B4A, shades: [0x1D0F0E, 0x1D0F0E, 0x3E2613, 0x62351C, 0x744B30, 0x996B4A, 0xA17C50] },
        { name: 'Yellow',   hex: 0xF3C03F, shades: [0x301723, 0x301723, 0x5F2F25, 0xBA5B23, 0xD99431, 0xF3C03F, 0xFFE360] },
        { name: 'Tan',      hex: 0xB7996A, shades: [0x3E2613, 0x3E2613, 0x684415, 0x986A20, 0xB78C41, 0xB7996A, 0xCFC587] },
        { name: 'Orange',   hex: 0xEF7E19, shades: [0x301723, 0x301723, 0x5F1D1B, 0x9C3F23, 0xD75B1A, 0xEF7E19, 0xFFA749] },
        { name: 'Rose',     hex: 0x8A3D28, shades: [0x1D131E, 0x1D131E, 0x301723, 0x562323, 0x77372B, 0x8A3D28, 0xB05F3C] },
        { name: 'Maroon',   hex: 0x832121, shades: [0x1D131E, 0x1D131E, 0x400B1F, 0x551C22, 0x682121, 0x832121, 0xAE424A] },
        { name: 'Red',      hex: 0xAB1E1E, shades: [0x1D131E, 0x1D131E, 0x400B1F, 0x651117, 0x82171C, 0xAB1E1E, 0xCD2429] },
        { name: 'Pink',     hex: 0xC36072, shades: [0x1D131E, 0x1D131E, 0x54242E, 0x6C3536, 0xAE424A, 0xC36072, 0xE08080] },
        { name: 'Lavender', hex: 0xA966DD, shades: [0x13112D, 0x13112D, 0x2B225A, 0x402E82, 0x7141B2, 0xA966DD, 0xD085ED] },
        { name: 'Purple',   hex: 0x621E78, shades: [0x180716, 0x180716, 0x13112D, 0x261044, 0x411357, 0x621E78, 0x813089] },
        { name: 'Blue',     hex: 0x466AC9, shades: [0x180716, 0x180716, 0x281E41, 0x322D6A, 0x3C49AD, 0x466AC9, 0x61A0EF] },
        { name: 'Navy',     hex: 0x3C49AD, shades: [0x180716, 0x180716, 0x20102B, 0x281E41, 0x322D6A, 0x3C49AD, 0x466AC9] },
        { name: 'Teal',     hex: 0x0098B2, shades: [0x180716, 0x180716, 0x1B2B47, 0x0E4E72, 0x156C99, 0x0098B2, 0x00CFDF] },
        { name: 'Bluegray', hex: 0x557E85, shades: [0x11150B, 0x11150B, 0x0B2B28, 0x2E403A, 0x315B49, 0x557E85, 0x79979D] },
        { name: 'Forest',   hex: 0x134507, shades: [0x09131D, 0x09131D, 0x07391D, 0x0B1F25, 0x0B2B28, 0x134507, 0x1B5502] },
        { name: 'Green',    hex: 0x2F8136, shades: [0x101820, 0x101820, 0x192832, 0x0B5C2F, 0x214437, 0x2F8136, 0x64A42C] },
        { name: 'White',    hex: 0xE5E6C7, shades: [0x281820, 0x281820, 0x4D4A5D, 0x958080, 0xC4B59F, 0xE5E6C7, 0xFFFFFF] },
        { name: 'Sky',      hex: 0xC6EEFD, shades: [0x1A0D18, 0x1A0D18, 0x313148, 0x586B90, 0x9FBBCB, 0xC6EEFD, 0xFFFFFF] },
        { name: 'Slate',    hex: 0xB3AFA1, shades: [0x1D131E, 0x1D131E, 0x31313E, 0x4A5057, 0x818B8B, 0xB3AFA1, 0xE5E6C7] },
        { name: 'Gray',     hex: 0x797580, shades: [0x0E0E18, 0x0E0E18, 0x201E2B, 0x373340, 0x585561, 0x797580, 0xA2A0A4] },
        { name: 'Black',    hex: 0x2A3034, shades: [0x000000, 0x000000, 0x101414, 0x1C2222, 0x22282A, 0x2A3034, 0x4A5057] },
        { name: 'Charcoal', hex: 0x4A5057, shades: [0x000000, 0x000000, 0x130D14, 0x1C2222, 0x2A3034, 0x4A5057, 0x6E7675] },
    ],
    metal: [
        { name: 'Natural', hex: 0xffffff, shades: null },
        { name: 'Ceramic', hex: 0xBA9069, shades: [0x181009, 0x2B1C1D, 0x32251A, 0x594435, 0x7D604D, 0xBA9069, 0xFBE3B0] },
        { name: 'Brass',   hex: 0xFDD082, shades: [0x1A1213, 0x2E2533, 0x61482C, 0x836332, 0xAF8A35, 0xFDD082, 0xFDF5CC] },
        { name: 'Copper',  hex: 0xEC855C, shades: [0x691503, 0x4F2313, 0x7B2008, 0x973C23, 0x9D5427, 0xEC855C, 0xFFC95A] },
        { name: 'Bronze',  hex: 0xE7A820, shades: [0x4F2313, 0x573726, 0x6D4A00, 0x966600, 0xBF8200, 0xE7A820, 0xFBE3B0] },
        { name: 'Iron',    hex: 0x484152, shades: [0x000000, 0x1D131E, 0x1B192B, 0x29253A, 0x343043, 0x484152, 0x726B7E] },
        { name: 'Steel',   hex: 0xC4B59F, shades: [0x1D131E, 0x2E2533, 0x4D4A5D, 0x726B7E, 0x867E7F, 0xC4B59F, 0xFFFFFF] },
        { name: 'Silver',  hex: 0xD6E1D3, shades: [0x1D131E, 0x2E2533, 0x31313E, 0x4A5057, 0x818B8B, 0xD6E1D3, 0xFFFFFF] },
        { name: 'Gold',    hex: 0xFFC95A, shades: [0x2E2533, 0x4F2313, 0x6D4A00, 0x966600, 0xDC6F35, 0xFFC95A, 0xFFFF61] },
    ],
    wound: [
        { name: 'Natural',     hex: 0x9f2828, shades: null },
        { name: 'Fresh Blood', hex: 0xcc2222, shades: [0x6b0000, 0xcc2222, 0xdd5555] },
        { name: 'Dark Blood',  hex: 0x3d1010, shades: [0x1a0000, 0x3d1010, 0x5a2020] },
        { name: 'Dried Blood', hex: 0x7a3015, shades: [0x3d1a0a, 0x7a3015, 0x9a4a28] },
        { name: 'Poison',      hex: 0x1a5a12, shades: [0x0a2a08, 0x1a5a12, 0x2a7a1e] },
        { name: 'Magic',       hex: 0x4a1a8b, shades: [0x1a0a2d, 0x4a1a8b, 0x6b3fbb] },
        { name: 'Ice',         hex: 0x2a4a9b, shades: [0x0a1a3d, 0x2a4a9b, 0x6a8acb] },
        { name: 'Shadow',      hex: 0x151515, shades: [0x050505, 0x151515, 0x252525] },
        { name: 'Gold',        hex: 0x8b5000, shades: [0x3d2000, 0x8b5000, 0xcc8020] },
    ],
};
// Animal material types share the body display palette; only the pixel source differs (PALETTE_SOURCE)
['fur','green','tan','zombie'].forEach(k => { TINT_PALETTE[k] = TINT_PALETTE.body; });

// Types that have file-based colours in the catalogue but should use palette swap instead.
// 'orange' == PALETTE_SOURCE.hair, so loading that file gives the correct pixel source to remap from.
export const FORCE_TINT_TYPES = new Set(['tail', 'wings']);
export const FORCE_TINT_BASE  = 'orange';

// Which PALETTE_SOURCE pixel-set to use per type for the actual canvas pixel remapping.
// (Animal head entries override this via catalogue's tintMaterial field.)
export const SOURCE_MATERIAL = {
    body:          'body',  head:         'body',
    ears:          'body',  horns:        'body',  fins:  'body', nose: 'body',
    hair:          'hair',  beards:       'hair',
    tail:          'hair',  wings:        'hair',
    torso_mail:    'metal', torso_armour: 'metal', weapon: 'metal', shield: 'metal', shoulders: 'metal',
    arms:          'cloth', torso_clothes:'cloth',  torso_jacket: 'cloth', torso_waist: 'cloth',
    legs:          'cloth', dress:        'cloth',  feet:  'cloth', hat: 'cloth', neck: 'cloth',
    cape:          'cloth', backpack:     'cloth',
    wound_arm:     'wound', wound_brain:  'wound',
    wound_eye_left:'wound', wound_eye_right: 'wound',
    wound_mouth:   'wound', wound_ribs:   'wound',
};

// All palette-tinted types use the unified body palette for display (47 colors).
// The actual pixel source comes from SOURCE_MATERIAL above.
export const TINT_MATERIAL = {};
for (const _t of Object.keys(SOURCE_MATERIAL)) TINT_MATERIAL[_t] = 'body';
// Wounds use their own small palette instead of the body skin-tone list.
['wound_arm','wound_brain','wound_eye_left','wound_eye_right','wound_mouth','wound_ribs']
    .forEach(k => { TINT_MATERIAL[k] = 'wound'; });

// Hex swatch lookup for file-based color names (e.g. "fur_brown", "ash", "blue").
// Build body first (captures fur_* entries), then hair last so hair names like "blue"
// override the body palette's same-named but differently-toned entries.
export const COLOR_SWATCH_HEX = {};
for (const key of ['body', 'hair']) {
    for (const e of TINT_PALETTE[key]) {
        if (e.shades) COLOR_SWATCH_HEX[e.name.toLowerCase().replace(/\s+/g, '_')] = e.hex;
    }
}
const THRESH = 3 * 3 * 3;

/** Recolour RGBA pixels in place: nearest source colour within THRESH → its target shade. */
export function remapPixels(data, sourceColors, targetShades) {
    const n = sourceColors.length;
    const sR = sourceColors.map(v => (v >> 16) & 0xff), sG = sourceColors.map(v => (v >> 8) & 0xff), sB = sourceColors.map(v => v & 0xff);
    const tR = targetShades.map(v => (v >> 16) & 0xff), tG = targetShades.map(v => (v >> 8) & 0xff), tB = targetShades.map(v => v & 0xff);
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        let best = -1, bestD = Infinity;
        for (let j = 0; j < n; j++) {
            const dr = pr - sR[j], dg = pg - sG[j], db = pb - sB[j];
            const d = dr * dr + dg * dg + db * db;
            if (d < bestD) { bestD = d; best = j; }
        }
        if (best >= 0 && bestD <= THRESH) { data[i] = tR[best]; data[i + 1] = tG[best]; data[i + 2] = tB[best]; }
    }
}

/** Display palette key for a slot's item (mirrors CharacterCreatorScene._itemTintMaterial). */
export function tintMaterialFor(slot, entry) {
    return entry?.tintMaterial ?? TINT_MATERIAL[slot] ?? null;
}

/** PALETTE_SOURCE key used for pixel remapping (mirrors _itemSourceMaterial). */
export function sourceMaterialFor(slot, entry) {
    if (entry?.sourceMaterial && PALETTE_SOURCE[entry.sourceMaterial]) return entry.sourceMaterial;
    const tm = entry?.tintMaterial ?? null;
    if (tm && PALETTE_SOURCE[tm]) return tm;
    return SOURCE_MATERIAL[slot] ?? 'body';
}

/**
 * Source → target colour pairs for recolouring an item with a palette entry.
 * Items drawn in their own palette carry `entry.sourceColors` (a dark → light
 * ramp of their real pixel colours); the target shades are then resampled to
 * the same length so each source colour lands on the shade at the same depth.
 * Everything else uses the shared PALETTE_SOURCE of its material.
 */
export function swapColors(slot, entry, paletteEntry) {
    const shades = paletteEntry.shades;
    if (entry?.sourceColors?.length) {
        const n = entry.sourceColors.length;
        const at = i => shades[n === 1 ? Math.floor(shades.length / 2) : Math.round(i * (shades.length - 1) / (n - 1))];
        return { sourceKey: `custom:${entry.id}`, sourceColors: entry.sourceColors, targetShades: entry.sourceColors.map((_, i) => at(i)) };
    }
    const sourceKey = sourceMaterialFor(slot, entry);
    return { sourceKey, sourceColors: PALETTE_SOURCE[sourceKey], targetShades: shades };
}

/** swapParams for a tint choice, or null (Natural, file-coloured item, unknown palette). */
export function swapParamsFor(slot, entry, tintIdx) {
    if (!entry?.id || !tintIdx) return null;
    if (entry.colors?.length && !FORCE_TINT_TYPES.has(slot)) return null;
    const palette = TINT_PALETTE[tintMaterialFor(slot, entry)];
    const pe = palette?.[tintIdx];
    if (!pe?.shades) return null;
    return { ...swapColors(slot, entry, pe), tintName: pe.name };
}
