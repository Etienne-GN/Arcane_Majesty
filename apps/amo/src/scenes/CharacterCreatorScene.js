import Phaser from 'phaser';
import { CharacterRenderer, DEFAULT_ANIMS, DEFAULT_ZPOS, texKey } from '../systems/CharacterRenderer.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import CATALOGUE from '../data/character_catalogue.json';

// ── Render-type map: UI slot → actual URL type used by CharacterRenderer ──────
// torso_* → 'torso'; wound_*/tail/wings → 'body'; ears/horns/fins/nose → 'head'
const RENDER_TYPE = {
    torso_clothes:   'torso', torso_jacket: 'torso',
    torso_mail:      'torso', torso_armour: 'torso', torso_waist: 'torso',
    tail:            'body',  wings:        'body',
    ears:            'head',  horns:        'head',  fins: 'head', nose: 'head',
    wound_arm:       'body',  wound_brain:  'body',
    wound_eye_left:  'body',  wound_eye_right: 'body',
    wound_mouth:     'body',  wound_ribs:   'body',
};
function rType(type) { return RENDER_TYPE[type] ?? type; }

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = ['body', 'clothes', 'marks', 'equip'];
const TAB_NAMES = { body: 'BODY', clothes: 'CLOTHES', marks: 'MARKS', equip: 'EQUIP' };

// 2-column layout per tab: [leftCol, rightCol]
const TAB_COLS = {
    body:    [['body','tail','wings','head','ears','horns'],              ['fins','nose','eyes','hair','beards','facial']],
    clothes: [['torso_clothes','torso_jacket','torso_mail','torso_armour','torso_waist'],
              ['legs','dress','feet','arms','shoulders']],
    marks:   [['wound_brain','wound_eye_left','wound_eye_right'],         ['wound_mouth','wound_ribs','wound_arm']],
    equip:   [['hat','neck','cape'],                                      ['backpack','shield','weapon']],
};

const ALL_TYPES = [
    'body','tail','wings','head','ears','horns','fins','nose','eyes','hair','beards','facial',
    'torso_clothes','torso_jacket','torso_mail','torso_armour','torso_waist',
    'legs','dress','feet','arms','shoulders',
    'hat','neck','cape','backpack','shield','weapon',
    'wound_brain','wound_eye_left','wound_eye_right','wound_mouth','wound_ribs','wound_arm',
];

const OPTIONAL_TYPES = new Set(ALL_TYPES.filter(t => t !== 'body'));

const TYPE_LABEL = {
    body:'BODY',   tail:'TAIL',  wings:'WINGS',
    head:'HEAD',   ears:'EARS',  horns:'HORNS', fins:'FINS', nose:'NOSE',
    hair:'HAIR',  eyes:'EYES',  beards:'BEARD', facial:'FACE',
    torso_clothes:'SHIRT', torso_jacket:'JCKT', torso_mail:'MAIL',
    torso_armour:'ARMR',   torso_waist:'WAIST',
    legs:'LEGS',   dress:'DRESS', feet:'FEET', arms:'ARMS',  shoulders:'SHLDR',
    hat:'HAT',     neck:'NECK',   cape:'CAPE',
    backpack:'BPACK', shield:'SHILD', weapon:'WEAPN',
    wound_brain:'HEAD', wound_eye_left:'EYE L', wound_eye_right:'EYE R',
    wound_mouth:'MOUTH', wound_ribs:'RIBS', wound_arm:'ARM',
};

const GROUP_COLOR = {
    body:'#7799ff',   tail:'#7799ff',   wings:'#7799ff',
    head:'#7799ff',   ears:'#7799ff',   horns:'#ddbb44', fins:'#7799ff', nose:'#7799ff',
    hair:'#7799ff',   eyes:'#7799ff',
    beards:'#9988dd', facial:'#9988dd',
    torso_clothes:'#55cc88', torso_jacket:'#66dd99', torso_mail:'#88bbcc',
    torso_armour:'#ddbb44',  torso_waist:'#cc9944',
    legs:'#55cc88',   dress:'#ff8866',  feet:'#55cc88',
    arms:'#88bbcc',   shoulders:'#ddbb44',
    hat:'#ddbb44',    neck:'#aa88cc',   cape:'#ff8866',
    backpack:'#ff8866', shield:'#ddbb44', weapon:'#ff5555',
    wound_brain:'#cc3333', wound_eye_left:'#cc3333', wound_eye_right:'#cc3333',
    wound_mouth:'#cc3333', wound_ribs:'#cc3333',     wound_arm:'#cc3333',
};

// Tint palettes sourced from lpc_forge ULPC palette definitions (mid-tone shade per colour)
// Palette swap: source pixel colors per material (from ulpc-*-palettes.json "source" key, RGB only)
const PALETTE_SOURCE = {
    hair:  [0x260D14, 0x6A1108, 0xA02600, 0xA02600, 0xA42600, 0xBF4000, 0xE55600, 0xFF8A00],
    body:  [0x271920, 0x271920, 0x99423C, 0xCC8665, 0xE4A47C, 0xF9D5BA, 0xFAECE7, 0xF8F3EB],
    cloth: [0x1D131E, 0x1D131E, 0x411E05, 0x4B2B13, 0x62351C, 0x744B30, 0x996B4A],
    metal: [0x1D131E, 0x2E2533, 0x4D4A5D, 0x726B7E, 0x867E7F, 0xC4B59F, 0xFFFFFF],
};

// Palette entries: hex = swatch display color, shades = target RGB array (null = Natural/no swap).
// Counts match lpc_forge exactly: 26 hair, 22 body, 24 cloth, 8 metal (+ Natural each).
const TINT_PALETTE = {
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
        { name: 'Light',        hex: 0xE4A47C, shades: [0x271920, 0x271920, 0x99423C, 0xCC8665, 0xE4A47C, 0xF9D5BA, 0xFAECE7, 0xF8F3EB] },
        { name: 'Amber',        hex: 0xEA9F54, shades: [0x281716, 0x281716, 0x9E3E37, 0xD28144, 0xEA9F54, 0xFDD082, 0xFBE7A4, 0xFBE7A4] },
        { name: 'Olive',        hex: 0xAE6B3F, shades: [0x271920, 0x271920, 0x442725, 0x7F4C31, 0xAE6B3F, 0xD38B59, 0xE4A47C, 0xE4A47C] },
        { name: 'Taupe',        hex: 0x936849, shades: [0x271920, 0x271920, 0x503734, 0x785946, 0x936849, 0xBA8454, 0xC7935F, 0xC7935F] },
        { name: 'Bronze',       hex: 0x7F4C31, shades: [0x1A1213, 0x1A1213, 0x442725, 0x644133, 0x7F4C31, 0xAE6B3F, 0xD38B59, 0xD38B59] },
        { name: 'Brown',        hex: 0x76513A, shades: [0x120E10, 0x120E10, 0x412B29, 0x5F4539, 0x76513A, 0x9C663E, 0xB8773F, 0xB8773F] },
        { name: 'Black',        hex: 0x442725, shades: [0x000000, 0x000000, 0x1A1213, 0x2E1F1C, 0x442725, 0x603429, 0x7F4C31, 0x7F4C31] },
        { name: 'Blue',         hex: 0x748DA4, shades: [0x16171B, 0x16171B, 0x46425D, 0x586B90, 0x748DA4, 0xA9C9CA, 0xC8E8E8, 0xF8F3EB] },
        { name: 'Bright Green', hex: 0x5B8F11, shades: [0x02280E, 0x02280E, 0x06410E, 0x255E1D, 0x5B8F11, 0x75AE23, 0x99D248, 0xD4D887] },
        { name: 'Dark Green',   hex: 0x255E1D, shades: [0x011708, 0x011708, 0x02280E, 0x06410E, 0x255E1D, 0x508A48, 0x509E59, 0x509E59] },
        { name: 'Fur Black',    hex: 0x14212C, shades: [0x040510, 0x040510, 0x0A0E1B, 0x0D1621, 0x14212C, 0x1B2C36, 0x154259, 0x265C78] },
        { name: 'Fur Brown',    hex: 0x473730, shades: [0x000000, 0x000000, 0x1E120E, 0x251B19, 0x473730, 0x624135, 0x975B5A, 0xD79993] },
        { name: 'Fur Copper',   hex: 0x9C3B01, shades: [0x0F0506, 0x0F0506, 0x300500, 0x6A1A00, 0x9C3B01, 0xCC6901, 0xFAA301, 0xFFE01E] },
        { name: 'Fur Gold',     hex: 0xE09E2B, shades: [0x200808, 0x200808, 0x552B15, 0xAC5D1F, 0xE09E2B, 0xFCCF56, 0xFFE67D, 0xF6F6C2] },
        { name: 'Fur Grey',     hex: 0x6A6E74, shades: [0x0F0F11, 0x0F0F11, 0x36363F, 0x55585F, 0x6A6E74, 0x909699, 0xB8BBBC, 0xD3D9DA] },
        { name: 'Fur Tan',      hex: 0x975F43, shades: [0x222121, 0x222121, 0x3A200E, 0x663A1A, 0x975F43, 0xB88751, 0xDB8E60, 0xE9BBA0] },
        { name: 'Fur White',    hex: 0x8B9498, shades: [0x17171A, 0x222121, 0x36363F, 0x484E57, 0x8B9498, 0xB8BBBC, 0xD8DCDC, 0xFAFAFA] },
        { name: 'Green',        hex: 0x228236, shades: [0x140C09, 0x140C09, 0x09320B, 0x19541D, 0x228236, 0x39AA4E, 0x53BF71, 0xADCCA6] },
        { name: 'Lavender',     hex: 0xA0A5BC, shades: [0x16171B, 0x16171B, 0x393B44, 0x787C8F, 0xA0A5BC, 0xC9D0EE, 0xFBECE6, 0xF8F3EB] },
        { name: 'Pale Green',   hex: 0x5F874D, shades: [0x271920, 0x271920, 0x314829, 0x456238, 0x5F874D, 0x86B278, 0xADCCA6, 0xF8F3EB] },
        { name: 'Zombie',       hex: 0xA79778, shades: [0x281820, 0x281820, 0x6B5C40, 0x928364, 0xA79778, 0xC5B38F, 0xDBCBAB, 0xEAD7CA] },
        { name: 'Zombie Green', hex: 0x839F6E, shades: [0x101925, 0x101925, 0x074337, 0x4A7A69, 0x839F6E, 0xD4D887, 0xF2F0C4, 0xF8F3EB] },
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
};

// Maps item type → palette key for palette-swap coloring (types NOT listed use file-based colors).
const TINT_MATERIAL = {
    hair:         'hair',
    beards:       'hair',
    body:         'body',
    torso_mail:   'metal',
    torso_armour: 'metal',
    weapon:       'metal',
    arms:         'cloth',
};

function trunc(s, n = 13) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function findIdx(type, id) {
    const i = CATALOGUE[type]?.findIndex(e => e.id === id) ?? -1;
    return i >= 0 ? i : 0;
}

const DEFAULT_SEL = {
    body:           findIdx('body',   'bodies/male'),
    head:           findIdx('head',   'heads/human/male'),
    hair:           findIdx('hair',   'afro/adult'),
    tail:0, wings:0,
    ears:0, horns:0, fins:0, nose:0,
    eyes:0, beards:0, facial:0,
    torso_clothes:0, torso_jacket:0, torso_mail:0, torso_armour:0, torso_waist:0,
    legs:0, dress:0, feet:0, arms:0, shoulders:0,
    hat:0, neck:0, cape:0, backpack:0, shield:0,
    weapon: findIdx('weapon', 'sword/longsword'),
    wound_brain:0, wound_eye_left:0, wound_eye_right:0,
    wound_mouth:0, wound_ribs:0,     wound_arm:0,
};

const DIRS  = ['up', 'left', 'down', 'right'];
const ANIMS = [
    'walk','idle','hurt','slash','attack_slash','thrust','attack_thrust','spellcast',
    'run','sit','jump','climb','combat_idle','emote',
];

// ─────────────────────────────────────────────────────────────────────────────

export default class CharacterCreatorScene extends Phaser.Scene {
    constructor() { super('CharacterCreatorScene'); }

    init(data) {
        this._onlineMode = data?.mode === 'online';
        this._onlineSlot = data?.slot ?? null;
    }

    preload() {
        this._renderer = new CharacterRenderer(this);
        for (const type of ALL_TYPES) {
            const opt = CATALOGUE[type]?.[DEFAULT_SEL[type]];
            if (!opt?.id) continue;
            const rt    = rType(type);
            const color = opt.colors ? opt.colors[0] : opt.color;
            const layers = [
                { type: rt, id: opt.id, zPos: opt.zPos, color },
                ...(opt.companions ?? []).map(c => ({
                    type: rt, id: c.id, zPos: c.zPos,
                    color: opt.colors ? color : undefined,
                })),
            ];
            this._renderer.preload({ layers, animations: DEFAULT_ANIMS });
        }
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const S = Phaser.Math.Clamp(w / 480, 1.0, 1.8);
        const f = (n) => Math.round(n * S);

        // ── State ─────────────────────────────────────────────────────
        this._dirIdx       = DIRS.indexOf('down');
        this._animIdx      = ANIMS.indexOf('walk');
        this._playing      = true;
        this._speed        = 8;
        this._frameIdx     = 0;
        this._sel          = { ...DEFAULT_SEL };
        this._colorSel     = {};
        this._tintSel      = {};
        this._activeTab    = 'body';
        this._pickerLabels = {};
        this._catLabels    = {};
        this._bars         = {};
        this._colorRows    = {};
        this._tintRows     = {};
        this._tabObjects   = { body: [], clothes: [], marks: [], equip: [] };
        this._loadingTypes = new Set();

        // ── Split layout ──────────────────────────────────────────────
        const SPLIT = Math.round(w * 0.62);
        const RP_W  = w - SPLIT;
        const RP_CX = SPLIT + Math.round(RP_W / 2);
        const RP_CY = Math.round(h / 2);
        this._zoom  = Phaser.Math.Clamp(Math.floor(Math.min(RP_W, h * 0.7) / 70), 2, 6);

        // ── Background ────────────────────────────────────────────────
        this.add.rectangle(0, 0, w, h, 0x08060f).setOrigin(0);
        for (let i = 0; i < 60; i++) {
            this.add.rectangle(
                Phaser.Math.Between(0, w), Phaser.Math.Between(0, h),
                1, 1, 0xffffff, Math.random() * 0.22 + 0.04,
            );
        }
        this.add.rectangle(0, 0, SPLIT, h, 0x0d0920).setOrigin(0, 0);
        const gfxBase = this.add.graphics();
        gfxBase.lineStyle(1, 0x2a0e44);
        gfxBase.strokeRect(0, 0, SPLIT, h);
        this.add.rectangle(SPLIT, 0, RP_W, h, 0x060410).setOrigin(0, 0);
        gfxBase.lineStyle(1, 0x1a0030);
        gfxBase.lineBetween(SPLIT, 0, SPLIT, h);

        // ── Left panel geometry ───────────────────────────────────────
        const PM      = f(8);
        const LP_W    = SPLIT;
        const TITLE_H = f(20);
        const TAB_H   = f(18);
        const BACK_H  = f(16);
        const CTRL_H  = f(78);
        const CTRL_Y0 = h - BACK_H - f(6) - CTRL_H;
        const GRID_Y0 = f(5) + TITLE_H + f(4) + TAB_H + f(4);
        const GRID_H  = CTRL_Y0 - GRID_Y0 - f(4);
        const GAP     = f(4);
        const COL_W   = Math.floor((LP_W - PM * 2 - GAP) / 2);
        const LX      = PM;
        const RX      = PM + COL_W + GAP;

        // ── Title ─────────────────────────────────────────────────────
        this.add.text(LP_W / 2, f(4), 'CHARACTER CREATOR', {
            font: `bold ${f(14)}px monospace`, fill: '#bb88ff',
            stroke: '#1a0033', strokeThickness: Math.max(1, f(2)),
        }).setOrigin(0.5, 0);

        // ── Tab buttons ───────────────────────────────────────────────
        const TAB_Y   = f(5) + TITLE_H + f(4);
        const TAB_BTW = Math.floor(LP_W / TABS.length);
        this._tabBtns = {};
        TABS.forEach((tab, i) => {
            const tx = i * TAB_BTW;
            const bg = this.add.rectangle(tx + TAB_BTW / 2, TAB_Y + TAB_H / 2, TAB_BTW - 2, TAB_H, 0x1a0a30)
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            const lbl = this.add.text(tx + TAB_BTW / 2, TAB_Y + TAB_H / 2, TAB_NAMES[tab], {
                font: `bold ${f(9)}px monospace`, fill: '#554477',
            }).setOrigin(0.5);
            bg.on('pointerdown', () => this._switchTab(tab));
            bg.on('pointerover', () => { if (this._activeTab !== tab) bg.setFillStyle(0x2a1040); });
            bg.on('pointerout',  () => this._updateTabBtns());
            this._tabBtns[tab] = { bg, lbl };
        });
        // Tab separator lines
        gfxBase.lineStyle(1, 0x331155);
        gfxBase.lineBetween(0, TAB_Y + TAB_H + 1, LP_W, TAB_Y + TAB_H + 1);

        // ── Build tab grids ───────────────────────────────────────────
        for (const tabName of TABS) {
            const cols = TAB_COLS[tabName];
            const objs = this._tabObjects[tabName];

            if (!cols) {
                // Marks placeholder
                const msg = this.add.text(LP_W / 2, GRID_Y0 + GRID_H * 0.4,
                    'INJURIES & MARKS\ncoming soon', {
                        font: `bold ${f(12)}px monospace`, fill: '#332255',
                        align: 'center',
                    }).setOrigin(0.5);
                objs.push(msg);
                continue;
            }

            const nRows  = Math.max(cols[0].length, cols[1].length);
            const tROW_H = Math.floor(GRID_H / nRows);

            const tabGfx = this.add.graphics();
            objs.push(tabGfx);

            // Column gap divider
            tabGfx.lineStyle(1, 0x1a0a30);
            tabGfx.lineBetween(RX - f(2), GRID_Y0 + f(4), RX - f(2), CTRL_Y0 - f(4));

            // Rows
            for (let col = 0; col < 2; col++) {
                const baseX  = col === 0 ? LX : RX;
                const colLen = cols[col].length;
                cols[col].forEach((type, i) => {
                    const ry     = GRID_Y0 + i * tROW_H + tROW_H / 2;
                    const isLast = i === colLen - 1;
                    this._mkCell(tabGfx, baseX, ry, COL_W, tROW_H, type, i, f, S, objs, isLast);
                });
            }
        }

        // ── Hide all tab objects, then show active ────────────────────
        for (const objs of Object.values(this._tabObjects)) {
            for (const obj of objs) obj.setVisible(false);
        }
        this._switchTab('body');

        // Divider above controls
        gfxBase.lineStyle(1, 0x221144);
        gfxBase.lineBetween(f(4), CTRL_Y0, SPLIT - f(4), CTRL_Y0);

        // ── Controls ──────────────────────────────────────────────────
        const DPAD_CX  = PM + f(30);
        const DPAD_CY  = CTRL_Y0 + Math.round(CTRL_H * 0.58);
        const ANIM_CX  = PM + f(112);
        const ANIM_CY  = DPAD_CY;
        const SLDR_LX  = PM + f(178);
        const SLDR_TW  = LP_W - SLDR_LX - PM - f(20);
        const SLDR_Y1  = CTRL_Y0 + Math.round(CTRL_H * 0.18);
        const SLDR_Y2  = CTRL_Y0 + Math.round(CTRL_H * 0.50);
        const SLDR_Y3  = CTRL_Y0 + Math.round(CTRL_H * 0.82);

        this.add.text(DPAD_CX,        CTRL_Y0 + f(3), 'DIR',  { font: `${f(8)}px monospace`, fill: '#332255' }).setOrigin(0.5, 0);
        this.add.text(ANIM_CX,        CTRL_Y0 + f(3), 'ANIM', { font: `${f(8)}px monospace`, fill: '#332255' }).setOrigin(0.5, 0);
        this.add.text(SLDR_LX - f(2), CTRL_Y0 + f(3), 'CTRL', { font: `${f(8)}px monospace`, fill: '#332255' }).setOrigin(0, 0);

        const STEP = f(20), CELL = f(16);
        const dpadCfg = {
            up:    { x: DPAD_CX,        y: DPAD_CY - STEP, lbl: '▲' },
            down:  { x: DPAD_CX,        y: DPAD_CY + STEP, lbl: '▼' },
            left:  { x: DPAD_CX - STEP, y: DPAD_CY,        lbl: '◄' },
            right: { x: DPAD_CX + STEP, y: DPAD_CY,        lbl: '►' },
        };
        this._dpadBtns = {};
        for (const [dir, cfg] of Object.entries(dpadCfg)) {
            const bg  = this.add.rectangle(cfg.x, cfg.y, CELL, CELL, 0x1a0e2a).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const lbl = this.add.text(cfg.x, cfg.y, cfg.lbl, { font: `bold ${f(11)}px monospace`, fill: '#7755aa' }).setOrigin(0.5);
            bg.on('pointerdown', () => this._setDir(dir));
            bg.on('pointerover', () => { bg.setFillStyle(0x3a1e5a); lbl.setStyle({ fill: '#ffffff' }); });
            bg.on('pointerout',  () => this._refreshDpad());
            this._dpadBtns[dir] = { bg, lbl };
        }
        const ppBg  = this.add.rectangle(DPAD_CX, DPAD_CY, CELL, CELL, 0x2a1040).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const ppLbl = this.add.text(DPAD_CX, DPAD_CY, '▐▐', { font: `bold ${f(8)}px monospace`, fill: '#ffcc44' }).setOrigin(0.5);
        this._ppBg = ppBg; this._ppLbl = ppLbl;
        ppBg.on('pointerover', () => ppBg.setFillStyle(0x4a2060));
        ppBg.on('pointerout',  () => ppBg.setFillStyle(0x2a1040));
        ppBg.on('pointerdown', () => this._togglePlay());
        this._refreshDpad();

        this._animLabel = this.add.text(ANIM_CX, ANIM_CY, this._animName(), {
            font: `bold ${f(10)}px monospace`, fill: '#ffcc66',
        }).setOrigin(0.5);
        this._mkBtn(ANIM_CX - f(38), ANIM_CY, '◄', () => this._cycleAnim(-1), f(13));
        this._mkBtn(ANIM_CX + f(38), ANIM_CY, '►', () => this._cycleAnim(+1), f(13));

        this._zoomSlider  = this._mkSlider(SLDR_LX, SLDR_Y1, SLDR_TW, 'Z', f, 1,  6, this._zoom,  (v) => { this._zoom = v; this._char.setScale(v); });
        this._speedSlider = this._mkSlider(SLDR_LX, SLDR_Y2, SLDR_TW, 'S', f, 1, 24, this._speed, (v) => this._setSpeed(v));
        this._frameSlider = this._mkSlider(SLDR_LX, SLDR_Y3, SLDR_TW, 'F', f, 0,  8, 0,           (v) => this._onFrameSlider(v));

        // ── Preview ───────────────────────────────────────────────────
        this.add.text(RP_CX, f(6), 'PREVIEW', {
            font: `${f(8)}px monospace`, fill: '#1a0830',
        }).setOrigin(0.5, 0);
        this._char = this._renderer.create(RP_CX, RP_CY, this._buildConfig());
        this._char.setScale(this._zoom);

        // ── Back ──────────────────────────────────────────────────────
        const back = this.add.text(LP_W / 2, h - f(4), '← BACK', {
            font: `${f(9)}px monospace`, fill: '#7755aa',
        }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setStyle({ fill: '#ffffff' }));
        back.on('pointerout',  () => back.setStyle({ fill: '#7755aa' }));
        back.on('pointerdown', () => this._back());

        // ── Export buttons (right panel) ──────────────────────────────
        const mkExport = (x, label, cb) => {
            const btn = this.add.text(x, h - f(4), label, {
                font: `${f(9)}px monospace`, fill: '#55aa88',
            }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout',  () => btn.setStyle({ fill: '#55aa88' }));
            btn.on('pointerdown', cb);
        };
        mkExport(RP_CX - f(50), 'SAVE',     () => this._exportCharacter());
        mkExport(RP_CX,         'SHEET',    () => this._exportSpritesheet());
        mkExport(RP_CX + f(54), 'LICENSES', () => this._exportLicenses());

        this.input.keyboard.on('keydown-ESC',   () => this._back());
        this.input.keyboard.on('keydown-SPACE', () => this._togglePlay());
        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(200);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.B)     this._back();
        if (gp.up)    this._setDir('up');
        if (gp.down)  this._setDir('down');
        if (gp.left)  this._setDir('left');
        if (gp.right) this._setDir('right');
        if (gp.A)     this._togglePlay();
        if (gp.LB)    this._cycleAnim(-1);
        if (gp.RB)    this._cycleAnim(+1);
    }

    // ── Tab control ──────────────────────────────────────────────────

    _switchTab(newTab) {
        this._activeTab = newTab;
        for (const [tab, objs] of Object.entries(this._tabObjects)) {
            const show = tab === newTab;
            for (const obj of objs) obj.setVisible(show);
        }
        this._updateTabBtns();
    }

    _updateTabBtns() {
        for (const [tab, { bg, lbl }] of Object.entries(this._tabBtns)) {
            const active = tab === this._activeTab;
            bg.setFillStyle(active ? 0x4422aa : 0x1a0a30);
            lbl.setStyle({ fill: active ? '#ddccff' : '#554477' });
        }
    }

    // ── Cell builder ──────────────────────────────────────────────────

    _mkCell(gfx, baseX, cy, colW, rowH, type, rowIdx, f, S, tabObjs, isLast = false) {
        const push = (obj) => { tabObjs.push(obj); return obj; };

        const color      = GROUP_COLOR[type];
        const colorNum   = Phaser.Display.Color.HexStringToColor(color).color;
        const opt        = CATALOGUE[type]?.[this._sel[type]] ?? { id: null, label: 'None' };
        const active     = !!opt.id;
        const isColorT   = CATALOGUE[type]?.some(e => e.colors?.length > 0) ?? false;
        const isTintT    = !!TINT_MATERIAL[type];
        const isOptional = OPTIONAL_TYPES.has(type);

        const itemY  = (isColorT || isTintT) ? cy - Math.round(rowH * 0.20) : cy;
        const colorY = cy + Math.round(rowH * 0.28);

        if (rowIdx % 2 === 0) {
            push(this.add.rectangle(baseX + colW / 2, cy, colW, rowH - 1, 0x110b22, 0.5).setOrigin(0.5));
        }

        const bar = push(this.add.rectangle(baseX + 1, cy, f(2), rowH - f(2), active ? colorNum : 0x1a1030).setOrigin(0, 0.5));
        this._bars[type] = bar;

        const CAT_W  = f(36);
        const catLbl = push(this.add.text(baseX + f(5), itemY, TYPE_LABEL[type], {
            font: `bold ${f(8)}px monospace`, fill: active ? color : '#33224a',
        }).setOrigin(0, 0.5));
        this._catLabels[type] = catLbl;

        // ✕ remove button
        const xBtnW = isOptional ? f(13) : 0;
        if (isOptional) {
            const xBtn = push(this.add.text(baseX + colW - f(3), itemY, '×', {
                font: `bold ${f(11)}px monospace`, fill: active ? '#553366' : '#331144',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }));
            xBtn.on('pointerover', () => xBtn.setStyle({ fill: '#ff4466' }));
            xBtn.on('pointerout',  () => xBtn.setStyle({ fill: this._sel[type] ? '#553366' : '#331144' }));
            xBtn.on('pointerdown', () => this._removeLayer(type));
            this._bars[`${type}_xbtn`] = xBtn;
        }

        const ARW    = f(15);
        const prevX  = baseX + f(4) + CAT_W + ARW / 2;
        const nextX  = baseX + colW - ARW / 2 - f(3) - xBtnW;
        const nameCX = (prevX + ARW / 2 + nextX - ARW / 2) / 2;
        const maxCh  = Math.max(5, Math.floor((nextX - ARW / 2 - prevX - ARW / 2) / f(7)));

        const nameLbl = push(this.add.text(nameCX, itemY, trunc(opt.label.toUpperCase(), maxCh), {
            font: `bold ${f(9)}px monospace`, fill: active ? '#ffcc66' : '#2a1a40',
        }).setOrigin(0.5));
        this._pickerLabels[type] = nameLbl;

        const mkArrow = (x, lbl, dir) => {
            const btn = push(this.add.text(x, itemY, lbl, {
                font: `bold ${f(11)}px monospace`, fill: color,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout',  () => btn.setStyle({ fill: color }));
            btn.on('pointerdown', () => this._cycleLayer(type, dir));
        };
        mkArrow(prevX, '◄', -1);
        mkArrow(nextX, '►', +1);

        // Color sub-row
        if (isColorT) {
            const colors    = opt.colors ?? [];
            const hasColors = active && colors.length > 1;
            const colorStr  = colors[this._colorSel[type] ?? 0] ?? '';
            const cpPrevX   = baseX + f(6) + CAT_W;
            const cpNextX   = baseX + colW - f(6) - xBtnW;
            const cpCX      = (cpPrevX + cpNextX) / 2;

            const cpPrev  = push(this.add.text(cpPrevX, colorY, '◄', { font: `${f(10)}px monospace`, fill: '#554477' }).setOrigin(0.5).setVisible(hasColors).setInteractive({ useHandCursor: true }));
            const cpNext  = push(this.add.text(cpNextX, colorY, '►', { font: `${f(10)}px monospace`, fill: '#554477' }).setOrigin(0.5).setVisible(hasColors).setInteractive({ useHandCursor: true }));
            const cpLabel = push(this.add.text(cpCX, colorY, colorStr.toUpperCase(), { font: `${f(8)}px monospace`, fill: '#aa88cc' }).setOrigin(0.5).setVisible(hasColors));

            cpPrev.on('pointerover', () => cpPrev.setStyle({ fill: '#ffffff' }));
            cpPrev.on('pointerout',  () => cpPrev.setStyle({ fill: '#554477' }));
            cpNext.on('pointerover', () => cpNext.setStyle({ fill: '#ffffff' }));
            cpNext.on('pointerout',  () => cpNext.setStyle({ fill: '#554477' }));
            cpPrev.on('pointerdown', () => this._cycleColor(type, -1));
            cpNext.on('pointerdown', () => this._cycleColor(type, +1));
            this._colorRows[type] = { prev: cpPrev, next: cpNext, label: cpLabel };
        }

        // Tint sub-row — palette-based tinting for types with no colour-variant files
        if (isTintT) {
            const palette  = TINT_PALETTE[TINT_MATERIAL[type]];
            const tintIdx  = this._tintSel[type] ?? 0;
            const tint     = palette[tintIdx];
            const show     = active;
            const cpPrevX  = baseX + f(6) + CAT_W;
            const cpNextX  = baseX + colW - f(6) - xBtnW;
            const cpCX     = (cpPrevX + cpNextX) / 2;

            const cpPrev   = push(this.add.text(cpPrevX, colorY, '◄', { font: `${f(10)}px monospace`, fill: '#554477' }).setOrigin(0.5).setVisible(show).setInteractive({ useHandCursor: true }));
            const cpNext   = push(this.add.text(cpNextX, colorY, '►', { font: `${f(10)}px monospace`, fill: '#554477' }).setOrigin(0.5).setVisible(show).setInteractive({ useHandCursor: true }));
            const swatchW  = f(12);
            const cpSwatch = push(this.add.rectangle(cpCX - swatchW / 2 - f(2), colorY, swatchW, f(7), tint.hex).setOrigin(0.5).setVisible(show));
            const cpLabel  = push(this.add.text(cpCX + f(4), colorY, tint.name.toUpperCase(), { font: `${f(7)}px monospace`, fill: '#aa88cc' }).setOrigin(0, 0.5).setVisible(show));

            cpPrev.on('pointerover', () => cpPrev.setStyle({ fill: '#ffffff' }));
            cpPrev.on('pointerout',  () => cpPrev.setStyle({ fill: '#554477' }));
            cpNext.on('pointerover', () => cpNext.setStyle({ fill: '#ffffff' }));
            cpNext.on('pointerout',  () => cpNext.setStyle({ fill: '#554477' }));
            cpPrev.on('pointerdown', () => this._cycleTint(type, -1));
            cpNext.on('pointerdown', () => this._cycleTint(type, +1));
            this._tintRows[type] = { prev: cpPrev, next: cpNext, swatch: cpSwatch, label: cpLabel };
        }

        if (!isLast) {
            gfx.lineStyle(1, 0x130a24);
            gfx.lineBetween(baseX + f(2), cy + rowH / 2, baseX + colW - f(2), cy + rowH / 2);
        }
    }

    // ── Layer helpers ─────────────────────────────────────────────────

    _getColor(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.colors?.length) return opt?.color;
        return opt.colors[this._colorSel[type] ?? 0];
    }

    _currentLayers(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.id) return [];
        const rt    = opt.renderType ?? rType(type);
        const color = this._getColor(type);
        const layers = [{ type: rt, id: opt.id, zPos: opt.zPos ?? DEFAULT_ZPOS[rt] ?? 0, color, itemName: opt.itemName }];
        for (const c of opt.companions ?? []) {
            layers.push({ type: rt, id: c.id, zPos: c.zPos ?? DEFAULT_ZPOS[rt] ?? 0,
                color: opt.colors ? color : undefined });
        }
        return layers;
    }

    _buildConfig() {
        const layers = [];
        for (const type of ALL_TYPES) {
            for (const l of this._currentLayers(type)) layers.push(l);
        }
        return { layers, animations: DEFAULT_ANIMS, defaultAnim: 'walk', defaultDir: 'down' };
    }

    // ── Layer cycling ───────────────────────────────────────────────────

    _cycleLayer(type, delta) {
        if (this._loadingTypes.has(type)) return;
        const list   = CATALOGUE[type] ?? [];
        const newIdx = (this._sel[type] + delta + list.length) % list.length;
        const oldOpt = list[this._sel[type]];
        const newOpt = list[newIdx];

        this._sel[type]      = newIdx;
        this._colorSel[type] = 0;

        if (!newOpt.id) {
            this._updateCell(type, null);
            this._removeTypeFromChar(type, oldOpt);
            return;
        }

        const layers    = this._currentLayers(type);
        const allLoaded = layers.every(l => this._renderer.isLayerLoaded(l, DEFAULT_ANIMS));

        const applyChange = () => {
            this._loadingTypes.delete(type);
            this._updateCell(type, newOpt);
            this._applyLayerChange(type, oldOpt, layers);
        };

        if (!allLoaded) {
            this._loadingTypes.add(type);
            this._updateCell(type, '...');
            this._renderer.loadLayers(layers, DEFAULT_ANIMS, applyChange);
        } else {
            applyChange();
        }
    }

    _removeLayer(type) {
        if (this._loadingTypes.has(type)) return;
        const oldOpt = CATALOGUE[type]?.[this._sel[type]];
        if (!oldOpt?.id) return;
        this._sel[type]      = 0;
        this._colorSel[type] = 0;
        this._updateCell(type, null);
        this._removeTypeFromChar(type, oldOpt);
    }

    _cycleColor(type, delta) {
        if (this._loadingTypes.has(type)) return;
        const opt    = CATALOGUE[type]?.[this._sel[type]];
        const colors = opt?.colors;
        if (!colors?.length || !opt.id) return;

        const n   = colors.length;
        const idx = ((this._colorSel[type] ?? 0) + delta + n) % n;
        this._colorSel[type] = idx;

        const layers    = this._currentLayers(type);
        const allLoaded = layers.every(l => this._renderer.isLayerLoaded(l, DEFAULT_ANIMS));

        const applyColor = () => {
            this._loadingTypes.delete(type);
            const rt = rType(type);
            for (const l of layers) {
                const key = `${rt}:${l.id}`;
                if (this._char._lpcLayers[key]) this._renderer.replaceLayer(this._char, key, l);
            }
            this._updateColorRow(type);
            if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); }
            else this._renderer.freezeFrame(this._char, this._frameIdx);
        };

        if (!allLoaded) {
            this._loadingTypes.add(type);
            const row = this._colorRows[type];
            if (row) row.label.setText('...');
            this._renderer.loadLayers(layers, DEFAULT_ANIMS, applyColor);
        } else {
            applyColor();
        }
    }

    _updateCell(type, optOrStr) {
        const color    = GROUP_COLOR[type];
        const loading  = typeof optOrStr === 'string';
        const active   = !loading && optOrStr !== null;
        const colorNum = Phaser.Display.Color.HexStringToColor(color).color;

        const nameLbl = this._pickerLabels[type];
        const catLbl  = this._catLabels[type];
        const bar     = this._bars[type];
        const xBtn    = this._bars[`${type}_xbtn`];

        if (loading) {
            nameLbl?.setText('...');
            nameLbl?.setStyle({ fill: '#443355' });
        } else if (active) {
            nameLbl?.setText(trunc(optOrStr.label.toUpperCase()));
            nameLbl?.setStyle({ fill: '#ffcc66' });
            catLbl?.setStyle({ fill: color });
            bar?.setFillStyle(colorNum);
            xBtn?.setStyle({ fill: '#553366' });
        } else {
            nameLbl?.setText('NONE');
            nameLbl?.setStyle({ fill: '#2a1a40' });
            catLbl?.setStyle({ fill: '#33224a' });
            bar?.setFillStyle(0x1a1030);
            xBtn?.setStyle({ fill: '#331144' });
        }

        this._updateColorRow(type);
        this._updateTintRow(type);
    }

    _updateColorRow(type) {
        const row = this._colorRows[type];
        if (!row) return;
        const opt    = CATALOGUE[type]?.[this._sel[type]];
        const colors = opt?.colors;
        const show   = !!(opt?.id && colors?.length > 1);
        row.prev.setVisible(show);
        row.next.setVisible(show);
        row.label.setVisible(show);
        if (show) row.label.setText((colors[this._colorSel[type] ?? 0] ?? '').toUpperCase().replace(/_/g, ' '));
    }

    _cycleTint(type, delta) {
        const palette = TINT_PALETTE[TINT_MATERIAL[type]];
        if (!palette) return;
        const n = palette.length;
        this._tintSel[type] = ((this._tintSel[type] ?? 0) + delta + n) % n;
        this._applyTintForType(type);
        this._updateTintRow(type);
    }

    _applyPaletteSwap(type) {
        const matKey  = TINT_MATERIAL[type];
        const palette = TINT_PALETTE[matKey];
        if (!palette) return;
        const entry   = palette[this._tintSel[type] ?? 0];
        const rt      = rType(type);
        const dir     = DIRS[this._dirIdx];
        const anim    = ANIMS[this._animIdx];

        for (const [key, lpcEntry] of Object.entries(this._char._lpcLayers)) {
            if (!key.startsWith(`${rt}:`)) continue;
            const sprite  = lpcEntry.sprite;
            const curAnim = lpcEntry.anim ?? anim;

            if (!entry.shades) {
                // Natural: restore original animation
                const origKey    = texKey(lpcEntry.layer, curAnim);
                const origAnim   = `${origKey}_${dir}`;
                if (this.anims.exists(origAnim)) sprite.play(origAnim, true);
                sprite.clearTint();
            } else {
                this._swapSpriteTexture(sprite, lpcEntry.layer, curAnim, dir, matKey, entry);
            }
        }
    }

    _swapSpriteTexture(sprite, layer, animName, dir, matKey, paletteEntry) {
        const scene   = this;  // CharacterCreatorScene IS the Phaser scene
        const origKey = texKey(layer, animName);
        const safe    = paletteEntry.name.replace(/\s+/g, '_');
        const rcKey   = `${origKey}__rc_${safe}`;

        if (!scene.textures.exists(rcKey)) {
            const tex = scene.textures.get(origKey);
            if (!tex || tex.key === '__MISSING') return;

            const src = PALETTE_SOURCE[matKey];
            const tgt = paletteEntry.shades;
            const n   = src.length;
            const srcR = src.map(v => (v >> 16) & 0xff);
            const srcG = src.map(v => (v >>  8) & 0xff);
            const srcB = src.map(v =>  v        & 0xff);
            const tgtR = tgt.map(v => (v >> 16) & 0xff);
            const tgtG = tgt.map(v => (v >>  8) & 0xff);
            const tgtB = tgt.map(v =>  v        & 0xff);

            const w = tex.source[0].width, h = tex.source[0].height;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(tex.source[0].image, 0, 0);

            const imgData = ctx.getImageData(0, 0, w, h);
            const data    = imgData.data;
            const THRESH  = 3 * 3 * 3; // max squared sum per-channel (≈ tolerance 3 each)

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 8) continue;
                const pr = data[i], pg = data[i + 1], pb = data[i + 2];
                let bestIdx = -1, bestDist = Infinity;
                for (let j = 0; j < n; j++) {
                    const dr = pr - srcR[j], dg = pg - srcG[j], db = pb - srcB[j];
                    const d  = dr * dr + dg * dg + db * db;
                    if (d < bestDist) { bestDist = d; bestIdx = j; }
                }
                if (bestIdx >= 0 && bestDist <= THRESH) {
                    data[i]     = tgtR[bestIdx];
                    data[i + 1] = tgtG[bestIdx];
                    data[i + 2] = tgtB[bestIdx];
                    // alpha preserved
                }
            }

            ctx.putImageData(imgData, 0, 0);
            scene.textures.addCanvas(rcKey, canvas);

            // Register all spritesheet frames — addCanvas only creates frame 0 by default
            const newTex = scene.textures.get(rcKey);
            const cols   = Math.floor(w / 64);
            const rows   = Math.floor(h / 64);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    newTex.add(r * cols + c, 0, c * 64, r * 64, 64, 64);
                }
            }
        }

        this._renderer.ensureTextureAnims(rcKey, animName);
        const rcAnim = `${rcKey}_${dir}`;
        if (scene.anims.exists(rcAnim)) sprite.play(rcAnim, true);
    }

    _reapplyPaletteSwaps() {
        if (!this._playing) return;
        for (const type of Object.keys(TINT_MATERIAL)) {
            if ((this._tintSel[type] ?? 0) > 0) this._applyPaletteSwap(type);
        }
    }

    // kept as alias so existing call-sites still work
    _applyTintForType(type) { this._applyPaletteSwap(type); }

    _updateTintRow(type) {
        const row = this._tintRows[type];
        if (!row) return;
        const opt  = CATALOGUE[type]?.[this._sel[type]];
        const show = !!opt?.id;
        row.prev.setVisible(show);
        row.next.setVisible(show);
        row.swatch.setVisible(show);
        row.label.setVisible(show);
        if (show) {
            const tint = TINT_PALETTE[TINT_MATERIAL[type]][this._tintSel[type] ?? 0];
            row.swatch.setFillStyle(tint.hex);
            row.label.setText(tint.name.toUpperCase());
        }
    }

    _applyLayerChange(type, oldOpt, newLayers) {
        // Use the OLD entry's renderType to find the correct layer key in the container
        const oldRt = oldOpt?.renderType ?? rType(type);
        for (const c of oldOpt?.companions ?? []) {
            const cKey = `${oldRt}:${c.id}`;
            if (this._char._lpcLayers[cKey]) this._renderer.removeLayer(this._char, cKey);
        }
        const mainLayer = newLayers[0];
        const oldKey    = oldOpt?.id ? `${oldRt}:${oldOpt.id}` : null;
        const hasOld    = oldKey && !!this._char._lpcLayers[oldKey];
        if (hasOld) this._renderer.replaceLayer(this._char, oldKey, mainLayer);
        else        this._renderer.addLayer(this._char, mainLayer);
        for (let i = 1; i < newLayers.length; i++) this._renderer.addLayer(this._char, newLayers[i]);

        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);

        if (TINT_MATERIAL[type]) this._applyTintForType(type);
    }

    _removeTypeFromChar(type, oldOpt) {
        if (!oldOpt?.id) return;
        const rt      = oldOpt.renderType ?? rType(type);
        const mainKey = `${rt}:${oldOpt.id}`;
        if (this._char._lpcLayers[mainKey]) this._renderer.removeLayer(this._char, mainKey);
        for (const c of oldOpt.companions ?? []) {
            const cKey = `${rt}:${c.id}`;
            if (this._char._lpcLayers[cKey]) this._renderer.removeLayer(this._char, cKey);
        }
    }

    // ── Playback ─────────────────────────────────────────────────────

    _togglePlay() {
        this._playing = !this._playing;
        this._ppLbl.setText(this._playing ? '▐▐' : '▶');
        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);
    }

    _setSpeed(v) {
        this._speed = v;
        for (const { sprite } of Object.values(this._char._lpcLayers)) {
            if (sprite.anims.isPlaying) {
                if (sprite.anims.currentAnim) { sprite.anims.currentAnim.frameRate = v; sprite.anims.currentAnim.msPerFrame = 1000 / v; }
                sprite.anims.msPerFrame = 1000 / v;
            }
        }
    }

    _applySpeed() {
        if (!this._playing) return;
        for (const { sprite } of Object.values(this._char._lpcLayers)) {
            if (sprite.anims.isPlaying) {
                if (sprite.anims.currentAnim) { sprite.anims.currentAnim.frameRate = this._speed; sprite.anims.currentAnim.msPerFrame = 1000 / this._speed; }
                sprite.anims.msPerFrame = 1000 / this._speed;
            }
        }
    }

    _setDir(dir) {
        this._dirIdx = DIRS.indexOf(dir);
        if (this._playing) { this._renderer.play(this._char, null, dir); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);
        this._refreshDpad();
    }

    _refreshDpad() {
        const active = DIRS[this._dirIdx];
        for (const [dir, { bg, lbl }] of Object.entries(this._dpadBtns)) {
            const on = dir === active;
            bg.setFillStyle(on ? 0x5533aa : 0x1a0e2a);
            lbl.setStyle({ fill: on ? '#ffffff' : '#7755aa' });
        }
    }

    _cycleAnim(delta) {
        this._animIdx = (this._animIdx + delta + ANIMS.length) % ANIMS.length;
        this._animLabel.setText(this._animName());
        this._frameIdx = 0;
        const count = this._renderer.frameCount(this._char);
        this._frameSlider.setMax(Math.max(count - 1, 1));
        this._frameSlider.setValue(0);
        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, 0);
    }

    _animName() { return ANIMS[this._animIdx].toUpperCase().replace(/_/g, ' '); }

    _onFrameSlider(v) {
        this._frameIdx = v;
        if (this._playing) { this._playing = false; this._ppLbl.setText('▶'); }
        this._renderer.freezeFrame(this._char, v);
    }

    // ── Slider ──────────────────────────────────────────────────────────

    _mkSlider(lx, y, trackW, label, f, min, max, initial, onChange) {
        const HDL_R = f(7);
        this.add.text(lx - f(5), y, label, { font: `${f(10)}px monospace`, fill: '#554477' }).setOrigin(1, 0.5);
        const valText = this.add.text(lx + trackW + HDL_R + f(4), y, String(initial), {
            font: `bold ${f(10)}px monospace`, fill: '#ffcc66',
        }).setOrigin(0, 0.5);
        this.add.rectangle(lx + trackW / 2, y, trackW, f(4), 0x1a1030).setOrigin(0.5);
        const fill = this.add.rectangle(lx, y, 0, f(4), 0x6644aa).setOrigin(0, 0.5);
        let curMin = min, curMax = max;
        const t0     = (initial - min) / Math.max(max - min, 1);
        const handle = this.add.circle(lx + t0 * trackW, y, HDL_R, 0xff9922).setInteractive({ draggable: true, useHandCursor: true });
        this.input.setDraggable(handle);
        const ring = this.add.circle(lx + t0 * trackW, y, HDL_R - f(3), 0xffcc66);
        fill.width = t0 * trackW;
        const applyX = (rawX) => {
            const clX   = Phaser.Math.Clamp(rawX, lx, lx + trackW);
            const t     = (clX - lx) / trackW;
            const value = Math.round(curMin + t * (curMax - curMin));
            handle.x = clX; ring.x = clX; fill.width = clX - lx;
            valText.setText(String(value)); onChange(value);
        };
        handle.on('drag', (ptr, dragX) => applyX(dragX));
        this.add.rectangle(lx + trackW / 2, y, trackW, f(18), 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', (ptr) => applyX(ptr.x));
        return {
            setMax(m) { curMax = m; handle.x = lx; ring.x = lx; fill.width = 0; valText.setText('0'); },
            setValue(v) { const t = (v - curMin) / Math.max(curMax - curMin, 1); const x = lx + t * trackW; handle.x = x; ring.x = x; fill.width = t * trackW; valText.setText(String(v)); },
        };
    }

    _mkBtn(x, y, label, cb, size = 18) {
        const btn = this.add.text(x, y, label, { font: `bold ${size}px monospace`, fill: '#7755aa' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
        btn.on('pointerout',  () => btn.setStyle({ fill: '#7755aa' }));
        btn.on('pointerdown', cb);
        return btn;
    }

    _back() {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start(this._onlineMode ? 'OnlineCharacterScene' : 'MenuScene'));
    }

    // ── Export ──────────────────────────────────────────────────────────

    _exportCharacter() {
        const layers = [];
        for (const type of ALL_TYPES) {
            const idx = this._sel[type] ?? 0;
            const opt = CATALOGUE[type]?.[idx];
            if (!opt?.id) continue;

            const colorIdx = this._colorSel[type] ?? 0;
            const tintIdx  = this._tintSel[type]  ?? 0;
            const matKey   = TINT_MATERIAL[type];
            const palette  = matKey ? TINT_PALETTE[matKey] : null;
            const tintName = palette ? (palette[tintIdx]?.name ?? 'Natural') : undefined;

            const entry = { type, catalogueIdx: idx, id: opt.id, label: opt.label, zPos: opt.zPos };
            if (opt.itemName)   entry.itemName   = opt.itemName;
            if (opt.colors)     { entry.colorIdx = colorIdx; entry.color = opt.colors[colorIdx] ?? null; }
            if (matKey)         { entry.tintMaterial = matKey; entry.tintIdx = tintIdx; entry.tintName = tintName; }
            layers.push(entry);
        }
        const charName = localStorage.getItem('amo_name') || 'Hero';
        const payload  = { version: 1, created: new Date().toISOString(), charName, layers };

        if (this._onlineMode && this._onlineSlot !== null) {
            localStorage.setItem(`amo_char_slot_${this._onlineSlot}`, JSON.stringify(payload));
            this.cameras.main.fadeOut(200);
            this.time.delayedCall(200, () => this.scene.start('OnlineCharacterScene'));
        } else {
            this._downloadText('character.json', JSON.stringify(payload, null, 2), 'application/json');
        }
    }

    _exportSpritesheet() {
        const SHEET_W = 13 * 64;  // 832 — LPC universal standard width

        // Build z-sorted layer list from current UI selections, carrying tint info
        const expLayers = [];
        for (const uiType of ALL_TYPES) {
            const idx = this._sel[uiType] ?? 0;
            const opt = CATALOGUE[uiType]?.[idx];
            if (!opt?.id) continue;
            const rt       = opt.renderType ?? rType(uiType);
            const color    = this._getColor(uiType);
            const tintIdx  = this._tintSel[uiType] ?? 0;
            const matKey   = TINT_MATERIAL[uiType];
            const palette  = matKey ? TINT_PALETTE[matKey] : null;
            const palEntry = (palette && tintIdx > 0) ? palette[tintIdx] : null;
            const main     = { type: rt, id: opt.id, zPos: opt.zPos ?? DEFAULT_ZPOS[rt] ?? 0, color, itemName: opt.itemName };
            expLayers.push({ layer: main, palEntry, matKey });
            for (const c of opt.companions ?? []) {
                expLayers.push({
                    layer: { type: rt, id: c.id, zPos: c.zPos ?? DEFAULT_ZPOS[rt] ?? 0, color: opt.colors ? color : undefined },
                    palEntry, matKey,
                });
            }
        }
        expLayers.sort((a, b) => (a.layer.zPos ?? 0) - (b.layer.zPos ?? 0));

        // Determine which animations are actually loaded and their vertical offsets
        let totalH = 0;
        const animMeta = [];
        for (const animName of DEFAULT_ANIMS) {
            let srcH = 0;
            for (const { layer } of expLayers) {
                const k = texKey(layer, animName);
                if (this.textures.exists(k)) { srcH = this.textures.get(k).source[0].height; break; }
            }
            if (!srcH) continue;
            animMeta.push({ animName, dstY: totalH, srcH });
            totalH += srcH;
        }

        if (!totalH) return;

        const canvas = document.createElement('canvas');
        canvas.width  = SHEET_W;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        for (const { animName, dstY } of animMeta) {
            for (const { layer, palEntry, matKey } of expLayers) {
                const origKey = texKey(layer, animName);
                if (!this.textures.exists(origKey)) continue;
                const tex = this.textures.get(origKey);
                if (!tex || tex.key === '__MISSING') continue;
                const img = tex.source[0].image;
                if (palEntry?.shades) {
                    ctx.drawImage(this._paletteSwapImage(img, matKey, palEntry), 0, dstY);
                } else {
                    ctx.drawImage(img, 0, dstY);
                }
            }
        }

        canvas.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'spritesheet.png';
            a.click();
            URL.revokeObjectURL(a.href);
        }, 'image/png');
    }

    /** Returns a new canvas with the palette swap applied — used by spritesheet export */
    _paletteSwapImage(image, matKey, paletteEntry) {
        const src  = PALETTE_SOURCE[matKey];
        const tgt  = paletteEntry.shades;
        const n    = src.length;
        const srcR = src.map(v => (v >> 16) & 0xff);
        const srcG = src.map(v => (v >>  8) & 0xff);
        const srcB = src.map(v =>  v        & 0xff);
        const tgtR = tgt.map(v => (v >> 16) & 0xff);
        const tgtG = tgt.map(v => (v >>  8) & 0xff);
        const tgtB = tgt.map(v =>  v        & 0xff);

        const w  = image.naturalWidth  || image.width;
        const h  = image.naturalHeight || image.height;
        const c  = document.createElement('canvas');
        c.width  = w; c.height = h;
        const cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(image, 0, 0);
        const id   = cx.getImageData(0, 0, w, h);
        const data = id.data;
        const THRESH = 3 * 3 * 3;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 8) continue;
            const pr = data[i], pg = data[i + 1], pb = data[i + 2];
            let bi = -1, bd = Infinity;
            for (let j = 0; j < n; j++) {
                const dr = pr - srcR[j], dg = pg - srcG[j], db = pb - srcB[j];
                const d  = dr * dr + dg * dg + db * db;
                if (d < bd) { bd = d; bi = j; }
            }
            if (bi >= 0 && bd <= THRESH) {
                data[i] = tgtR[bi]; data[i + 1] = tgtG[bi]; data[i + 2] = tgtB[bi];
            }
        }
        cx.putImageData(id, 0, 0);
        return c;
    }

    async _exportLicenses() {
        const res  = await fetch('./CREDITS.csv');
        const text = await res.text();
        this._downloadText('lpc-credits.csv', text, 'text/csv');
    }

    _downloadText(filename, text, mimeType = 'text/plain') {
        const a = document.createElement('a');
        a.href  = URL.createObjectURL(new Blob([text], { type: mimeType }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
