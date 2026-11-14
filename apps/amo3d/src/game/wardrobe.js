// Equipment on the body: the head and body items you wear change the character's look.
// Head: cowl / hood → a hood · helm → a helmet · hat → a wide-brimmed hat.
// Body: robe(s) → robe cut · tunic → tunic cut · armor / mail / plate → armour cut · cloak → a cape.
// Everything takes the item's own colour (amo item.color).
import { items as itemRules } from '@rules';

const { ITEMS } = itemRules;
const hex = c => `#${(c ?? 0x888888).toString(16).padStart(6, '0')}`;
const shade = (c, k) => hex([16, 8, 0].reduce((n, sh) => n | (Math.round(((c >> sh) & 255) * k) << sh), 0));

export function wornLook(base, equipment) {
    const look = JSON.parse(JSON.stringify(base));
    look.outfit ??= {};
    const head = ITEMS[equipment.head], body = ITEMS[equipment.body];
    if (head) {
        const n = `${equipment.head} ${head.name}`.toLowerCase();
        if (/cowl|hood/.test(n)) { look.hood = true; look.hoodColor = hex(head.color); }
        else if (/helm/.test(n)) look.headgear = { type: 'helmet', color: hex(head.color) };
        else if (/hat|cap/.test(n)) look.headgear = { type: 'hat', color: hex(head.color) };
    }
    // Nothing on the body: the linen under-things (shirt and three-quarter trousers).
    if (!body) Object.assign(look.outfit, { style: 'linen', coat: '#d8ccb0', collar: '#c4b896', pants: '#cfc2a4', pantsDark: '#9a8e74', trim: '#c4b896' });
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
    return look;
}
