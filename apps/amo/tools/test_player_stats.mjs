// Tests for the inventory / progression fixes from the 2026-09-30 mechanics
// review: stack-aware counting and consuming, the XP curve, the temporary
// max-HP bonus (no stacking, expires, not saved), haste vs slow speed, and
// food/tonics no longer raising max HP permanently.
import assert from 'node:assert';

// SaveManager writes to localStorage; give node a minimal one.
const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats, xpForLevel } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const { statusManager } = await import('../src/systems/StatusManager.js').catch(() => ({}));
const { ITEMS } = await import('../src/data/items.js');
const { SPELLS } = await import('../src/data/spells.js');
const SPELLS_COOLDOWN = id => SPELLS[id].cooldown[0];

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- stack-aware counting / consuming
{
    const s = new PlayerStats();
    s.addItem('forest_herb', 5);
    eq(s.inventory.filter(i => i.id === 'forest_herb').length, 1, 'herbs stack in one slot');
    eq(s.countItem('forest_herb'), 5, 'count is the stack quantity');
    ok(s.consumeItem('forest_herb', 3), 'consume 3 of 5');
    eq(s.countItem('forest_herb'), 2, '2 left, stack kept');
    ok(!s.consumeItem('forest_herb', 3), 'cannot consume more than held');
    eq(s.countItem('forest_herb'), 2, 'a failed consume removes nothing');
    ok(s.consumeItem('forest_herb', 2), 'consume the rest');
    eq(s.inventory.some(i => i.id === 'forest_herb'), false, 'empty stack slot is removed');
    eq(s.countItem('tent'), 0, 'absent item counts 0');
}

// ---- XP curve
{
    eq(xpForLevel(1), 100, 'level 1 -> 2 costs 100');
    let total = 0;
    for (let l = 1; l < 20; l++) total += xpForLevel(l);
    ok(total > 40000 && total < 90000, `reaching level 20 takes a sane total (${total})`);
    const s = new PlayerStats();
    s.gainXp(100);
    eq(s.level, 2, 'levelled up once');
    eq(s.xpToNextLevel, xpForLevel(2), 'next requirement follows the curve');
}

// ---- temporary max HP
{
    const s = new PlayerStats();
    const base = s.maxHealth;
    s.addTempMaxHealth(10, 1000);
    eq(s.maxHealth, base + 10, '+10 applied');
    s.addTempMaxHealth(15, 1000);
    eq(s.maxHealth, base + 15, 'a stronger bonus replaces, not stacks');
    s.addTempMaxHealth(8, 1000);
    eq(s.maxHealth, base + 15, 'a weaker bonus does nothing');
    SaveManager.save(s, 'test', 'c1');
    const saved = JSON.parse([...store.values()].pop());
    eq(saved.maxHealth, base, 'the save stores max HP without the temporary bonus');
    ok(saved.health <= base, 'saved health never exceeds saved max');
    s.tickTempMaxHealth(1500);
    eq(s.maxHealth, base, 'bonus expires');
    ok(s.health <= s.maxHealth, 'health clamped on expiry');
}

// ---- food and tonics: no permanent max HP (Heart Crystal stays a permanent upgrade)
{
    for (const id of ['grand_feast', 'hearty_stew', 'bone_broth', 'bone_herb_soup', 'iron_skin_tonic']) {
        const s = new PlayerStats();
        const base = s.maxHealth;
        s._applyStatus = () => {};
        ITEMS[id].onUse(s);
        s.tickTempMaxHealth(10 * 60 * 1000 + 1);
        eq(s.maxHealth, base, `${id} leaves max HP unchanged once it wears off`);
    }
    const s = new PlayerStats();
    const base = s.maxHealth;
    ITEMS.heart_crystal.onUse(s);
    eq(s.maxHealth, base + 10, 'heart crystal is still permanent');
}

// ---- speed: slow and haste combine
if (statusManager?.speedMult) {
    const e = { _statuses: { swift: {} } };
    eq(statusManager.speedMult(e), 1.25, 'swift speeds up');
    e._statuses.cold = {};
    ok(Math.abs(statusManager.speedMult(e) - 0.7 * 1.25) < 1e-9, 'cold and swift combine');
    eq(statusManager.speedMult({ _statuses: {} }), 1, 'no status, normal speed');
}

// ---- reset: a new game starts clean
{
    const s = new PlayerStats();
    s.gold = 999; s.addItem('forest_herb'); s.chestContents['m:1,1'] = [];
    s.reset();
    eq(s.gold, 50, 'gold reset');
    eq(s.seenItems.size, 0, 'discovered items reset');
    eq(Object.keys(s.chestContents).length, 0, 'chest contents reset');
}

// ---- Combat C1: two hands, move slots, starting kits, old saves
{
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const s = new PlayerStats();
    eq(s.equipment.offHand, null, 'a fresh character has an empty off hand');
    eq(s.moveSlots, { attack: null, second: null }, 'and default buttons');
    const give = id => s.addItem(id, 1);
    give('longsword'); give('novice_staff');
    ok(s.equipItem('longsword') && s.equipItem('novice_staff', 'off'), 'full Gandalf: sword in the main hand, staff in the off hand');
    eq([s.equipment.weapon, s.equipment.offHand], ['longsword', 'novice_staff'], 'both hands held');
    eq([s.resolvedMoves().attack.type, s.resolvedMoves().second.type], ['sword', 'staff'], 'attack slashes, the second button blasts');
    ok(s.setMoveSlot('attack', 'off:basic') && s.setMoveSlot('second', 'main:basic'), 'swap the buttons');
    eq([s.resolvedMoves().attack.type, s.resolvedMoves().second.type], ['staff', 'sword'], 'staff on attack now');
    ok(!s.setMoveSlot('attack', 'off:block'), 'a move the gear does not offer is refused');
    give('hunters_shortbow');
    ok(s.equipItem('hunters_shortbow'), 'a bow takes both hands');
    eq([s.equipment.weapon, s.equipment.offHand], ['hunters_shortbow', null], 'the off hand was freed');
    ok(s.inventory.some(i => i.id === 'novice_staff') && s.inventory.some(i => i.id === 'longsword'), 'nothing lost: both went back to the satchel');
    eq(s.resolvedMoves().attack.id, 'main:basic', 'a stale slot falls back to the default');

    const k = new PlayerStats();
    k.giveStartKit({ weapon: 'etched_shortsword', offHand: 'crude_dagger' });
    eq([k.equipment.weapon, k.equipment.offHand], ['etched_shortsword', 'crude_dagger'], 'Seraphina\'s starting kit: sword and dagger');

    // an old save: no offHand, no moveSlots, empty weapon
    const old = new PlayerStats();
    const data = { equipment: { head: null, body: null, weapon: null, accessory1: null, accessory2: null }, inventory: [] };
    SaveManager.migrateCombatC1(old, data);
    eq(old.equipment.weapon, 'novice_staff', 'an old empty-handed save gets a Novice Staff (it attacked like a staff)');
    const old2 = new PlayerStats();
    old2.equipment.weapon = 'longsword';
    SaveManager.migrateCombatC1(old2, { equipment: { weapon: 'longsword' } });
    eq([old2.equipment.weapon, old2.equipment.offHand], ['longsword', null], 'an old armed save keeps its weapon in the main hand');
    const old3 = new PlayerStats();
    old3.equipment.offHand = 'crude_dagger';                      // left over from the last character in memory
    SaveManager.migrateCombatC1(old3, { equipment: { weapon: 'longsword' } });
    eq(old3.equipment.offHand, null, 'an old save never inherits an off-hand weapon from memory');
    // a two-hander with both hands full and a full satchel: refused, nothing hidden
    {
        const f = new PlayerStats();
        f.addItem('longsword', 1); f.addItem('crude_dagger', 1);
        f.equipItem('longsword'); f.equipItem('crude_dagger', 'off');
        while (f.inventory.length < f.getSatchelCapacity() - 1) f.inventory.push({ id: 'wood', name: 'Wood', qty: 1, stackable: false });
        f.addItem('claymore', 1);
        eq(f.inventory.length, f.getSatchelCapacity(), 'the satchel is full, the Claymore in it');
        ok(!f.equipItem('claymore'), 'equipping it would need two free slots: refused');
        eq([f.equipment.weapon, f.equipment.offHand, f.inventory.length], ['longsword', 'crude_dagger', f.getSatchelCapacity()], 'nothing moved, nothing hidden');
    }
    // through a real save + load: the free staff's stats count, and taking it off restores the save
    {
        const p0 = new PlayerStats();
        SaveManager.save(p0, 'c1review', 'eldrin');
        const raw = JSON.parse(localStorage.getItem('amo_save_c1review_eldrin'));
        delete raw.equipment.offHand; delete raw.moveSlots; raw.equipment.weapon = null;
        localStorage.setItem('amo_save_c1review_eldrin', JSON.stringify(raw));
        const p1 = new PlayerStats();
        SaveManager.load(p1, 'c1review', 'eldrin');
        const staffInt = ITEMS.novice_staff.stats?.intelligence ?? 0;
        eq([p1.equipment.weapon, p1.attributes.intelligence], ['novice_staff', raw.attributes.intelligence + staffInt], 'the free staff\'s Intelligence counts after load');
        p1.unequipItem('weapon');
        eq([p1.attributes.intelligence, p1.maxMana], [raw.attributes.intelligence, raw.maxMana], 'and taking it off gives back exactly the saved character');
    }
}

// ---- Combat C2: mastery, talents, spells by element level
{
    const { talentsFor } = await import('../src/data/talents.js');
    const M = await import('../src/systems/mastery.js');
    const e = new PlayerStats();
    e.setTalents(talentsFor('eldrin'));
    eq(e.mastery, { weapons: {}, elements: {} }, 'a fresh character has no mastery yet');
    eq([e.weaponLevel('sword'), e.elementLevel('water')], [1, 1], 'everyone starts at 1');
    for (let i = 0; i < 500; i++) e.gainResonance('water', 2);          // a very long time in the rain
    eq(e.elementLevel('water'), 2, 'rain alone stops at water 2');
    eq([e.getSpellLevel('tidal_bolt'), e.getSpellLevel('riptide')], [1, 0], 'it teaches Tidal Bolt, never Riptide');
    e.gainElementPoints('water', 9999);
    eq(e.elementLevel('water'), 10, 'Eldrin is gifted in the elements: water can reach 10');
    eq(e.getSpellLevel('riptide'), 3, 'and the spells follow, up to Adept');
    e.gainWeaponPoints('sword', 9999);
    eq(e.weaponLevel('sword'), 3, 'but a sword stops at 3 for him');
    const ups = [];
    const k = new PlayerStats();
    k.setTalents(talentsFor('kael'));
    k.onMasteryUp((kind, key, level) => ups.push([kind, key, level]));
    k.gainWeaponPoints('sword', 40);
    eq(ups, [['weapon', 'sword', 2]], 'a level-up is announced once');
    k.gainElementPoints('arcane', 99999);
    eq(k.elementLevel('arcane'), 6, 'Kael is trained in light magic (the Spark): 6');
    k.gainElementPoints('fire', 99999);
    eq(k.elementLevel('fire'), 3, 'untrained in the elements: 3');
    // starting kit spells
    const a = new PlayerStats();
    a.giveStartKit({ weapon: 'willow_wand', spells: ['mana_dart', 'shadow_bolt'] });
    eq([a.getSpellLevel('mana_dart'), a.getSpellLevel('shadow_bolt')], [1, 1], 'Anya starts knowing her two spells');
    // the focus
    a.setTalents(talentsFor('anya'));
    eq(a.focusType(), 'wand', 'a wand in hand is the focus');
    a.startSpellCooldown('mana_dart');
    ok(a.spellCooldowns.mana_dart < SPELLS_COOLDOWN('mana_dart'), 'a wand shortens the cooldown');
    // skill-tree requirements read element levels
    const s = new PlayerStats();
    s.level = 9; s.attributes.agility = 20; s.attributes.intelligence = 20;
    const reqSkill = Object.entries(s.skills).find(([, sk]) => sk.requirements?.resonance?.arcane === 3);
    if (reqSkill) {
        ok(!s.canUnlock(reqSkill[0]), 'arcane level 1: the skill is locked');
        s.gainElementPoints('arcane', M.pointsFor(2));
        ok(s.canUnlock(reqSkill[0]), 'arcane level 2: unlocked');
    }
    // old save: resonance converts, known spells stay
    const o = new PlayerStats();
    SaveManager.save(o, 'c2test', 'eldrin');
    const raw = JSON.parse(localStorage.getItem('amo_save_c2test_eldrin'));
    delete raw.mastery; raw.resonance = { ...raw.resonance, water: 40, shadow: 999 }; raw.spells = { ...raw.spells, riptide: 2 };
    localStorage.setItem('amo_save_c2test_eldrin', JSON.stringify(raw));
    const o2 = new PlayerStats();
    SaveManager.load(o2, 'c2test', 'eldrin');
    eq(o2.mastery.elements.water, M.pointsFor(M.unlockLevel(40)), 'old water resonance 40: at least the level its gates needed (8), above 5 x 40');
    eq(o2.mastery.elements.shadow, M.pointsFor(6), 'Eldrin is trained in dark magic: capped at 6');
    ok(o2.getSpellLevel('riptide') >= 2, 'a spell the old save knew never drops below its tier');
    // old save: every gate the old resonance met stays met (review: Important 2)
    const raw3 = JSON.parse(localStorage.getItem('amo_save_c2test_eldrin'));
    delete raw3.mastery; raw3.resonance = { ...raw3.resonance, arcane: 15, water: 40 }; raw3.spells = { ...raw3.spells, tidal_bolt: 0 };
    localStorage.setItem('amo_save_c2test_eldrin', JSON.stringify(raw3));
    const o3 = new PlayerStats();
    SaveManager.load(o3, 'c2test', 'eldrin');
    ok(o3.elementLevel('arcane') >= M.unlockLevel(15), 'an old arcane-15 skill gate stays met after the conversion');
    ok(o3.getSpellLevel('tidal_bolt') > 0, 'spells the converted level allows are known at load');
    // saved mastery above the ceiling (another character's points) never counts past it (review: Minor 2 re-graded)
    const c = new PlayerStats();
    c.setTalents(talentsFor('eldrin'));
    c.mastery.weapons.fists = 1800;
    eq(c.weaponLevel('fists'), 3, 'mastery never reads above the talent ceiling');
}

// ---- Combat C3: styles
{
    const { STYLE_SKILLS } = await import('../src/data/styles.js');
    const s = new PlayerStats();
    s.setTalents({ sword: 'gifted' });
    s.learnFromHit('sword', true, s.level);
    eq(s.styles.progress.guard, 1, 'a sword kill practises Guard');
    ok(s.mastery.weapons.sword > 0, '… and still teaches the sword');
    s.learnFromHit('sword', false, s.level);
    eq(s.styles.progress.guard, 1, 'a hit that does not kill teaches no style');
    let learned = null; s.onStyleEvent(id => { learned = id; });
    s.addItem('manual_guard');
    ok(ITEMS.manual_guard.onUse(s), 'reading the Guard manual');
    s.styles.progress.guard = 99.5; s.learnFromHit('sword', true, s.level);
    eq(learned, 'guard', 'learning a style is announced');
    eq(s.styleSkillState('parry'), 'mastery', 'sword mastery 1: Parry waits');
    s.mastery.weapons.sword = 40;
    s.equipment.weapon = 'longsword';
    eq(s.styleSkillState('parry'), 'ready', 'sword mastery 2 with a sword in hand: ready');
    ok(s.assignSkillSlot(0, 'parry'), 'Parry goes on Q');
    ok(!s.assignSkillSlot(1, 'riposte'), 'Riposte (mastery 5) cannot be slotted yet');
    s.equipment.weapon = null;
    eq(s.styleSkillState('parry'), 'weapon', 'no sword in hand: greyed');
    s.startSkillCooldown('parry');
    ok(!s.skillReady('parry'), 'cooling down');
    s.tickSkillCooldowns(STYLE_SKILLS.parry.cd);
    ok(s.skillCooldowns.parry === 0, 'cooled');
    // save round trip
    SaveManager.save(s, 'c3test', 'eldrin');
    const o = new PlayerStats();
    SaveManager.load(o, 'c3test', 'eldrin');
    eq(o.styles.progress.guard, 100, 'style progress is saved');
    eq(o.skillSlots[0], 'parry', 'a skill on a slot is saved');
    // old save: no styles field
    const raw = JSON.parse(localStorage.getItem('amo_save_c3test_eldrin'));
    delete raw.styles; localStorage.setItem('amo_save_c3test_eldrin', JSON.stringify(raw));
    const o2 = new PlayerStats();
    SaveManager.load(o2, 'c3test', 'eldrin');
    eq(o2.styles.progress, {}, 'an old save starts with no styles');
    const { canHotbar } = await import('../src/systems/hotbar.js');
    ok(!canHotbar('manual_guard'), 'manuals are read from the Inventory, not the hotbar');
}

console.log(`✓ player-stats tests passed (${n} assertions).`);
