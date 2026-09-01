"""
Convert ULPC weapon sprites to vitruvian-web format.
Reads from /tmp/ulpc-clone/spritesheets/weapon/
Writes to ../public/spritesheets/equipment/
"""

import os
import shutil
import json

ULPC_WEAPON_ROOT = '/tmp/ulpc-clone/spritesheets/weapon'
VITRUV_EQUIP_ROOT = '../public/spritesheets/equipment'

BODY_CONDITIONS_FG = {
    "anatomy.body.male": "fg",
    "anatomy.body.muscular": "fg",
    "anatomy.body.female": "fg",
    "anatomy.body.teen": "fg",
    "anatomy.body.pregnant": "fg"
}
BODY_CONDITIONS_BG = {
    "anatomy.body.male": "bg",
    "anatomy.body.muscular": "bg",
    "anatomy.body.female": "bg",
    "anatomy.body.teen": "bg",
    "anatomy.body.pregnant": "bg"
}

def cp(src, dst):
    if not os.path.exists(src):
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return True

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def make_data_json(item_id, name, path, poses, sizes, has_bg=True, z_fg=150, z_bg=8):
    layers = {"fg": {"z": z_fg, "conditions": BODY_CONDITIONS_FG}}
    if has_bg:
        layers["bg"] = {"z": z_bg, "conditions": BODY_CONDITIONS_BG}
    return {
        "id": item_id,
        "name": name,
        "path": path,
        "layers": layers,
        "poses": poses,
        "sizes": sizes,
        "materials": {},
        "colors": {},
        "notes": [],
        "authors": ["Universal LPC contributors"],
        "licenses": ["OGA-BY 3.0"],
        "urls": ["https://github.com/Zireael07/Universal-LPC-Spritesheet"]
    }

def try_copy_anim(ulpc_item_path, name, fg_candidates, bg_candidates, out_dir, vitruv_anim):
    """Try multiple candidate source paths for fg and bg. Returns True if fg was found."""
    found_fg = False
    for cand in fg_candidates:
        src = os.path.join(ulpc_item_path, cand)
        if cp(src, os.path.join(out_dir, 'fg', f'{vitruv_anim}.png')):
            found_fg = True
            break
    for cand in bg_candidates:
        src = os.path.join(ulpc_item_path, cand)
        if cp(src, os.path.join(out_dir, 'bg', f'{vitruv_anim}.png')):
            break
    return found_fg


# ── UNIVERSAL ITEM IMPORTER ───────────────────────────────────────────────────
# Handles all the structural variants we see in ULPC

def import_weapon(name, ulpc_path, out_category, z_fg=150, z_bg=8, size_override=None):
    out_dir = os.path.join(VITRUV_EQUIP_ROOT, out_category, name)
    poses = []
    sizes = {}

    item_png = f'{name}.png'

    def add_pose(vitruv_anim, size=None):
        if vitruv_anim not in poses:
            poses.append(vitruv_anim)
        if size:
            sizes[vitruv_anim] = size

    # Animation mapping: list of (vitruv_anim, fg_candidates, bg_candidates, size)
    anim_map = [
        # Swords: attack_slash/fg.png OR attack_slash/{name}.png OR slash/{name}.png OR flat root file
        ('slash', [
            f'attack_slash/fg.png',
            f'attack_slash/{item_png}',
            f'slash/{item_png}',
            f'male/slash/{item_png}',
            f'{item_png}',
        ], [
            f'attack_slash/bg.png',
            f'attack_slash/behind/{item_png}',
            f'slash/behind/{item_png}',
            f'behind/slash/{item_png}',
            f'background/{item_png}',
        ], 'lg'),

        # Swords: backslash from attack_backslash or attack_slash_reverse
        ('backslash', [
            f'attack_backslash/fg.png',
            f'attack_slash_reverse/{item_png}',
        ], [
            f'attack_backslash/bg.png',
            f'attack_slash_reverse/behind/{item_png}',
        ], 'lg'),

        # Thrust from attack_halfslash (sword overhead) or attack_thrust or thrust
        ('thrust', [
            f'attack_halfslash/fg.png',
            f'attack_thrust/{item_png}',
            f'attack_halfslash/{item_png}',
            f'thrust/foreground.png',
            f'foreground/thrust/{item_png}',
            f'thrust/{item_png}',
        ], [
            f'attack_halfslash/bg.png',
            f'attack_thrust/behind/{item_png}',
            f'thrust/background.png',
            f'background/thrust/{item_png}',
            f'thrust/behind/{item_png}',
        ], 'xl'),

        # Walk
        ('walk', [
            f'universal/walk/fg.png',
            f'universal/walk/foreground.png',
            f'universal/fg/walk/steel.png',
            f'walk/{item_png}',
            f'walk/foreground.png',
            f'foreground/walk/{item_png}',
            f'male/walk/{item_png}',
        ], [
            f'universal/walk/bg.png',
            f'universal/walk/background.png',
            f'universal/bg/walk/steel.png',
            f'walk/behind/{item_png}',
            f'walk/background.png',
            f'behind/walk/{item_png}',
            f'universal_behind/walk/{item_png}',
            f'background/walk/{item_png}',
        ], 'lg'),

        # Idle
        ('idle', [
            f'universal/idle/fg.png',
            f'universal/idle/foreground.png',
            f'universal/fg/idle/steel.png',
            f'idle/{item_png}',
            f'idle/foreground.png',
        ], [
            f'universal/idle/bg.png',
            f'universal/idle/background.png',
            f'universal/bg/idle/steel.png',
            f'idle/background.png',
        ], 'lg'),

        # Hurt
        ('hurt', [
            f'universal/hurt/fg.png',
            f'universal/hurt/foreground.png',
            f'universal/fg/hurt/steel.png',
            f'hurt/{item_png}',
            f'hurt/foreground.png',
            f'foreground/hurt/{item_png}',
            f'universal/hurt/{item_png}',
        ], [
            f'universal/hurt/bg.png',
            f'universal/hurt/background.png',
            f'universal/bg/hurt/steel.png',
            f'hurt/background.png',
            f'behind/hurt/{item_png}',
            f'universal_behind/hurt/{item_png}',
            f'background/hurt/{item_png}',
        ], 'lg'),

        # Shoot (bows)
        ('shoot', [
            f'universal/shoot/foreground.png',
            f'shoot/{item_png}',
            f'shoot/foreground.png',
        ], [
            f'universal/shoot/background.png',
            f'shoot/background.png',
        ], 'lg'),

        # Spell (magic staffs with spellcast)
        ('spell', [
            f'foreground/spellcast/{item_png}',
            f'spellcast/foreground.png',
        ], [
            f'background/spellcast/{item_png}',
            f'spellcast/background.png',
        ], 'xl'),
    ]

    for vitruv_anim, fg_cands, bg_cands, default_size in anim_map:
        if try_copy_anim(ulpc_path, name, fg_cands, bg_cands, out_dir, vitruv_anim):
            s = size_override or default_size
            add_pose(vitruv_anim, s)

    if not poses:
        return False

    has_bg = any(
        os.path.exists(os.path.join(out_dir, 'bg', f'{p}.png')) for p in poses
    )
    item_id = f'equipment.{out_category}.{name}'
    item_path = f'equipment/{out_category}/{name}'
    display_name = name.replace('_', ' ').title()
    # rename 's' staff to something readable
    if name == 's':
        display_name = 'S-Staff'
    data = make_data_json(item_id, display_name, item_path, poses, sizes, has_bg, z_fg, z_bg)
    write_json(os.path.join(out_dir, 'data.json'), data)
    return True


# ── MAIN ─────────────────────────────────────────────────────────────────────

def clear_category(cat):
    path = os.path.join(VITRUV_EQUIP_ROOT, cat)
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

def main():
    # Clear weapon categories (NOT shields or tools)
    print('Clearing old weapon categories...')
    for cat in ['swords', 'spears', 'staffs', 'bows', 'bow_accessory', 'staff_accessory']:
        clear_category(cat)
    # Remove old blunt/ranged items from misc that we're replacing
    for item in ['club', 'flail', 'mace', 'waraxe', 'boomerang', 'slingshot', 'halberd']:
        p = os.path.join(VITRUV_EQUIP_ROOT, 'misc', item)
        if os.path.exists(p):
            shutil.rmtree(p)

    def run_category(ulpc_cat_path, out_category, z_fg=150, z_bg=8, excludes=None):
        excludes = excludes or []
        count = 0
        for name in sorted(os.listdir(ulpc_cat_path)):
            if name in excludes:
                print(f'  SKIP {name}: excluded')
                continue
            path = os.path.join(ulpc_cat_path, name)
            if not os.path.isdir(path):
                continue
            ok = import_weapon(name, path, out_category, z_fg, z_bg)
            if ok:
                out_dir = os.path.join(VITRUV_EQUIP_ROOT, out_category, name)
                # print poses from data.json
                dj = json.load(open(os.path.join(out_dir, 'data.json')))
                print(f'  {name}: {dj["poses"]}')
                count += 1
            else:
                print(f'  SKIP {name}: no PNGs found')
        return count

    # ── SWORDS
    print('\nImporting swords...')
    n = run_category(
        os.path.join(ULPC_WEAPON_ROOT, 'sword'), 'swords', z_fg=150, z_bg=8,
        excludes=['glowsword']  # glowsword has only color variants, no default
    )
    print(f'  → {n} swords imported')

    # ── SPEARS (polearms)
    print('\nImporting spears (polearms)...')
    n = run_category(
        os.path.join(ULPC_WEAPON_ROOT, 'polearm'), 'spears', z_fg=140, z_bg=9
    )
    print(f'  → {n} spears imported')

    # ── STAFFS (magic weapons)
    print('\nImporting staffs (magic)...')
    n = run_category(
        os.path.join(ULPC_WEAPON_ROOT, 'magic'), 'staffs', z_fg=140, z_bg=9
    )
    print(f'  → {n} staffs imported')

    # ── BOWS (bow sub-types)
    print('\nImporting bows...')
    bow_root = os.path.join(ULPC_WEAPON_ROOT, 'ranged', 'bow')
    n = run_category(bow_root, 'bows', z_fg=150, z_bg=8, excludes=['arrow'])
    # crossbow as bow
    ok = import_weapon('crossbow', os.path.join(ULPC_WEAPON_ROOT, 'ranged', 'crossbow'), 'bows')
    if ok:
        dj = json.load(open(os.path.join(VITRUV_EQUIP_ROOT, 'bows', 'crossbow', 'data.json')))
        print(f'  crossbow: {dj["poses"]}')
        n += 1
    print(f'  → {n} bows imported')

    # ── BLUNTS → misc
    print('\nImporting blunt weapons (→ misc)...')
    blunt_root = os.path.join(ULPC_WEAPON_ROOT, 'blunt')
    n = run_category(blunt_root, 'misc', z_fg=150, z_bg=8, excludes=['club'])

    # ── RANGED SIMPLE → misc
    for name in ['slingshot', 'boomerang']:
        path = os.path.join(ULPC_WEAPON_ROOT, 'ranged', name)
        if os.path.exists(path):
            ok = import_weapon(name, path, 'misc')
            if ok:
                dj = json.load(open(os.path.join(VITRUV_EQUIP_ROOT, 'misc', name, 'data.json')))
                print(f'  {name}: {dj["poses"]}')
                n += 1
            else:
                print(f'  SKIP {name}: no PNGs found')
    print(f'  → {n} misc weapons imported')

    print('\nDone. Remember to re-run pack.py')

if __name__ == '__main__':
    main()
