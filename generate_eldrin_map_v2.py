
import math
import random

# Map Dimensions
WIDTH = 128
HEIGHT = 128
TILE_SIZE = 32

# Tile IDs (BaseChip firstgid=577)
GRASS = 577
DIRT = 582
STONE_WALL = 673
STONE_WALL_WINDOW = 681
STONE_ROOF = 653
STONE_ROOF_EDGE = 645

WOOD_WALL = 1153
WOOD_ROOF = 1137
WOOD_DOOR = 1463 # Guessing based on sample

WATER = 2169 # [A]Water_pipo
BRIDGE = 867 # Bridge in building/ground layer

TREE_VARIANTS = [585, 586, 593, 594, 609, 610]
FLOWER_BASE = 5241 # [A]Flower_pipo

class Map:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.ground = [GRASS] * (w * h)
        self.water = [0] * (w * h)
        self.tree = [0] * (w * h)
        self.building = [0] * (w * h)
        self.paths = [0] * (w * h)

    def set_tile(self, layer, x, y, val):
        if 0 <= x < self.w and 0 <= y < self.h:
            layer[y * self.w + x] = val

    def draw_rect(self, layer, x, y, w, h, val):
        for i in range(x, x + w):
            for j in range(y, y + h):
                self.set_tile(layer, i, j, val)

    def draw_circle(self, layer, cx, cy, r, val):
        for i in range(cx - r, cx + r + 1):
            for j in range(cy - r, cy + r + 1):
                if ((i - cx)**2 + (j - cy)**2)**0.5 <= r:
                    self.set_tile(layer, i, j, val)

def generate_eldrin_map():
    m = Map(WIDTH, HEIGHT)
    random.seed(1337)

    # 1. Meandering River
    river_center = 30
    amplitude = 8
    freq = 0.05
    phase = random.random() * 10
    
    river_coords = []
    for y in range(HEIGHT):
        x_off = int(amplitude * math.sin(y * freq + phase))
        cx = river_center + x_off
        for dx in range(-3, 4):
            m.set_tile(m.water, cx + dx, y, WATER)
        river_coords.append(cx)

    # 2. Bridge
    bridge_y = HEIGHT // 2
    bx = river_coords[bridge_y]
    m.draw_rect(m.water, bx - 3, bridge_y - 1, 7, 3, 0) # Clear water
    m.draw_rect(m.building, bx - 3, bridge_y - 1, 7, 3, BRIDGE)

    # 3. Path from house to bridge to tower
    # House at (10, bridge_y), Tower at (100, bridge_y)
    def draw_path(x1, y1, x2, y2):
        curr_x, curr_y = x1, y1
        while curr_x != x2 or curr_y != y2:
            m.set_tile(m.ground, curr_x, curr_y, DIRT)
            # Add some width
            m.set_tile(m.ground, curr_x, curr_y + 1, DIRT)
            if curr_x < x2: curr_x += 1
            elif curr_x > x2: curr_x -= 1
            if curr_y < y2: curr_y += 1
            elif curr_y > y2: curr_y -= 1

    draw_path(10, bridge_y, bx - 3, bridge_y)
    draw_path(bx + 4, bridge_y, 100, bridge_y)

    # 4. Eldrin's Tower (Complex)
    tx, ty = 100, bridge_y
    # Main Tower Body (Hexagonal-ish)
    m.draw_circle(m.building, tx, ty, 5, STONE_WALL)
    m.draw_circle(m.building, tx, ty, 3, 0) # Hollow inside for later?
    # Add windows
    m.set_tile(m.building, tx - 4, ty - 3, STONE_WALL_WINDOW)
    m.set_tile(m.building, tx + 4, ty - 3, STONE_WALL_WINDOW)
    m.set_tile(m.building, tx, ty - 5, STONE_WALL_WINDOW)
    # Tower base / entrance
    m.draw_rect(m.building, tx - 2, ty + 4, 4, 2, STONE_WALL)
    m.set_tile(m.building, tx, ty + 5, WOOD_DOOR)

    # 5. The House (West)
    hx, hy = 10, bridge_y
    m.draw_rect(m.building, hx - 3, hy - 4, 6, 6, WOOD_WALL)
    m.draw_rect(m.building, hx - 4, hy - 5, 8, 2, WOOD_ROOF)
    m.set_tile(m.building, hx, hy + 1, WOOD_DOOR)

    # 6. Dense Forest Clusters
    for _ in range(60): # 60 groves
        gx = random.randint(0, WIDTH - 1)
        gy = random.randint(0, HEIGHT - 1)
        # Avoid river and buildings
        dist_river = abs(gx - river_coords[gy])
        dist_house = ((gx - hx)**2 + (gy - hy)**2)**0.5
        dist_tower = ((gx - tx)**2 + (gy - ty)**2)**0.5
        
        if dist_river < 8 or dist_house < 12 or dist_tower < 15:
            continue
            
        radius = random.randint(3, 8)
        for _ in range(radius * 5):
            ox = random.randint(-radius, radius)
            oy = random.randint(-radius, radius)
            if ox*ox + oy*oy <= radius*radius:
                m.set_tile(m.tree, gx + ox, gy + oy, random.choice(TREE_VARIANTS))

    # 7. Decorative flowers and grass variations
    for _ in range(1000):
        fx = random.randint(0, WIDTH - 1)
        fy = random.randint(0, HEIGHT - 1)
        if m.water[fy * WIDTH + fx] == 0 and m.building[fy * WIDTH + fx] == 0 and m.tree[fy * WIDTH + fx] == 0:
            if random.random() < 0.1:
                m.set_tile(m.ground, fx, fy, FLOWER_BASE + random.randint(0, 50))

    # TMX File Generation
    tmx = []
    tmx.append('<?xml version="1.0" encoding="UTF-8"?>')
    tmx.append(f'<map version="1.2" tiledversion="1.2.4" orientation="orthogonal" renderorder="right-down" width="{WIDTH}" height="{HEIGHT}" tilewidth="{TILE_SIZE}" tileheight="{TILE_SIZE}" infinite="0">')
    
    tmx.append(' <tileset firstgid="1" source="[A]WaterFall_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="577" name="[Base]BaseChip_pipo" tilewidth="32" tileheight="32" tilecount="1064" columns="8">')
    tmx.append('  <image source="[Base]BaseChip_pipo.png" width="256" height="4256"/>')
    tmx.append(' </tileset>')
    tmx.append(' <tileset firstgid="1641" source="[A]Grass_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="2169" source="[A]Water_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="5241" source="[A]Flower_pipo.tsx"/>')
    
    layers = [
        ("ground", m.ground),
        ("water", m.water),
        ("tree", m.tree),
        ("building", m.building)
    ]
    
    for i, (name, data) in enumerate(layers):
        tmx.append(f' <layer id="{i+1}" name="{name}" width="{WIDTH}" height="{HEIGHT}">')
        tmx.append('  <data encoding="csv">')
        tmx.append(",".join(map(str, data)))
        tmx.append('  </data>')
        tmx.append(' </layer>')
    
    tmx.append('</map>')
    
    output_path = "apps/am1/ressources/tilesets/rpg_tileset_32x32/SampleMap/eldrin_tower_forest_v2.tmx"
    with open(output_path, "w") as f:
        f.write("\n".join(tmx))
    print(f"Map V2 created at: {output_path}")

if __name__ == "__main__":
    generate_eldrin_map()
