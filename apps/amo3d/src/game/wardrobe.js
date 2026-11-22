// Equipment on the body: the head and body items you wear change the character's look.
// Head: cowl / hood → a hood · helm → a helmet · hat → a wide-brimmed hat.
// Body: robe(s) → robe cut · tunic → tunic cut · armor / mail / plate → armour cut · cloak → a cape.
// Everything takes the item's own colour (amo item.color).
import { items as itemRules } from '@rules';

const { ITEMS } = itemRules;
const hex = c => `#${(c ?? 0x888888).toString(16).padStart(6, '0')}`;
const shade = (c, k) => hex([16, 8, 0].reduce((n, sh) => n | (Math.round(((c >> sh) & 255) * k) << sh), 0));

export function wornLook(base, equipment, { ownOutfit = false } = {}) {   // ownOutfit: a campaign hero's clothes are their look (nothing on the body: still theirs)
    const look = JSON.parse(JSON.stringify(base));
    look.outfit ??= {};
    const head = ITEMS[equipment.head], body = ITEMS[equipment.body];
    if (head) {
        const n = `${equipment.head} ${head.name}`.toLowerCase();
        if (head.hatStyle) look.headgear = { type: 'hat', style: head.hatStyle, color: hex(head.color) };
        else if (/cowl|hood/.test(n)) { look.hood = true; look.hoodColor = hex(head.color); }
        else if (/helm/.test(n)) look.headgear = { type: 'helmet', color: hex(head.color) };
        else if (/hat|cap/.test(n)) look.headgear = { type: 'hat', color: hex(head.color) };
    }
    // Nothing on the body: the linen under-things (shirt and three-quarter trousers).
    if (!body && ownOutfit) { /* their own clothes */ }
    else if (!body) Object.assign(look.outfit, { style: 'linen', coat: '#d8ccb0', collar: '#c4b896', pants: '#cfc2a4', pantsDark: '#9a8e74', trim: '#c4b896' });
    else if (body.keepsLook) { /* an outfit that is the character's own (Eldrin's coat): the base look */ }
    else if (body) {
        const n = `${equipment.body} ${body.name}`.toLowerCase();
        const style = /robe/.test(n) ? 'robe' : /tunic/.test(n) ? 'tunic' : /armou?r|mail|plate|hide/.test(n) ? 'armour' : null;
        if (/cloak/.test(n) && !style) { look.cape = true; look.outfit.collar = hex(body.color); }
        else if (style) {
            look.outfit.style = style;
            look.outfit.coat = hex(body.color);
            look.outfit.collar = shade(body.color, 0.65);
        }
    }
    // Items made for the new body slots (and head/body items that name a part): `wear` is the part id it puts on,
    // `wearSlot` the part slot when it differs from the equipment slot; `colors` override the part's own.
    const PART_OF = { head: 'headgear', body: 'torso', arms: 'arms', legs: 'legs', feet: 'feet', shoulders: 'shoulders', back: 'back' };
    for (const [slot, part] of Object.entries(PART_OF)) {
        const it = ITEMS[equipment[slot]];
        if (!it?.wear) continue;
        look.wear ??= {};
        look.wear[it.wearSlot ?? part] = { id: it.wear, colors: it.wearColors ?? {} };
        if (part === 'headgear') { delete look.headgear; look.hood = false; }
    }
    // A werewolf in wolf form (stats.flags.wolfForm): the fur body; hat, gloves, boots and cloak come off.
    if (look.body) look.body.wolf = false;   // the Forge's preview switch never sticks: the game decides
    if (equipment._wolf) {
        look.body = { ...(look.body ?? {}), wolf: true };
        look.wear = { ...(look.wear ?? {}), headgear: { id: 'none' }, arms: { id: 'bare' }, feet: { id: 'bare' }, cape: { id: 'none' }, back: { id: 'none' } };
        delete look.headgear; look.hood = false; look.cape = false;
    }
    return look;
}
