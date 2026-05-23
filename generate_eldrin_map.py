
import os

# Map Dimensions
WIDTH = 128
HEIGHT = 128
TILE_SIZE = 32

# Tile IDs (based on [Base]BaseChip_pipo firstgid=577)
GRASS = 577
TREE_BASE = [585, 586, 593, 594, 609, 610]
WATER = 2169  # [A]Water_pipo
BRIDGE_WOOD = 867  # Bridge tile from sample map
WALL_STONE = 673
ROOF_STONE = 653
WALL_WOOD = 1153
ROOF_WOOD = 1137

def generate_layer(name, width, height, fill_value=0):
    data = [fill_value] * (width * height)
    return data

def set_rect(data, x, y, w, h, value, width):
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= i < width and 0 <= j < len(data) // width:
                data[j * width + i] = value

def create_tmx(file_path):
    ground = generate_layer("ground", WIDTH, HEIGHT, GRASS)
    water = generate_layer("water", WIDTH, HEIGHT, 0)
    tree = generate_layer("tree", WIDTH, HEIGHT, 0)
    building = generate_layer("building", WIDTH, HEIGHT, 0)
    
    # 1. Create River
    set_rect(water, 20, 0, 4, HEIGHT, WATER, WIDTH)
    
    # 2. Create Bridge
    set_rect(water, 20, HEIGHT // 2, 4, 2, 0, WIDTH)  # Clear water for bridge
    set_rect(building, 20, HEIGHT // 2, 4, 2, BRIDGE_WOOD, WIDTH)
    
    # 3. Create House (West)
    set_rect(building, 5, HEIGHT // 2 - 2, 4, 4, WALL_WOOD, WIDTH)
    set_rect(building, 5, HEIGHT // 2 - 3, 4, 1, ROOF_WOOD, WIDTH)
    
    # 4. Create Eldrin's Tower (East)
    # A large 6x6 tower
    tx, ty = 90, HEIGHT // 2 - 5
    set_rect(building, tx, ty, 6, 10, WALL_STONE, WIDTH)
    set_rect(building, tx - 1, ty - 1, 8, 2, ROOF_STONE, WIDTH) # Tower cap
    
    # 5. Dense Forest
    import random
    random.seed(42)
    for y in range(HEIGHT):
        for x in range(WIDTH):
            # Don't place trees on paths, water, or buildings
            if water[y * WIDTH + x] != 0 or building[y * WIDTH + x] != 0:
                continue
            
            # Distance from house and tower
            dist_house = ((x - 7)**2 + (y - HEIGHT//2)**2)**0.5
            dist_tower = ((x - 93)**2 + (y - HEIGHT//2)**2)**0.5
            
            if dist_house < 8 or dist_tower < 10:
                continue
                
            if random.random() < 0.4: # 40% density
                tree[y * WIDTH + x] = random.choice(TREE_BASE)

    # XML Construction
    tmx = []
    tmx.append('<?xml version="1.0" encoding="UTF-8"?>')
    tmx.append(f'<map version="1.2" tiledversion="1.2.4" orientation="orthogonal" renderorder="right-down" width="{WIDTH}" height="{HEIGHT}" tilewidth="{TILE_SIZE}" tileheight="{TILE_SIZE}" infinite="0">')
    
    # Tilesets
    tmx.append(' <tileset firstgid="1" source="[A]WaterFall_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="577" name="[Base]BaseChip_pipo" tilewidth="32" tileheight="32" tilecount="1064" columns="8">')
    tmx.append('  <image source="[Base]BaseChip_pipo.png" width="256" height="4256"/>')
    tmx.append(' </tileset>')
    tmx.append(' <tileset firstgid="1641" source="[A]Grass_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="2169" source="[A]Water_pipo.tsx"/>')
    tmx.append(' <tileset firstgid="5241" source="[A]Flower_pipo.tsx"/>')
    
    layers = [
        ("ground", ground),
        ("water", water),
        ("tree", tree),
        ("building", building)
    ]
    
    for i, (name, data) in enumerate(layers):
        tmx.append(f' <layer id="{i+1}" name="{name}" width="{WIDTH}" height="{HEIGHT}">')
        tmx.append('  <data encoding="csv">')
        csv_data = ",".join(map(str, data))
        tmx.append(csv_data)
        tmx.append('  </data>')
        tmx.append(' </layer>')
    
    tmx.append('</map>')
    
    with open(file_path, "w") as f:
        f.write("\n".join(tmx))

if __name__ == "__main__":
    output_path = "apps/am1/ressources/tilesets/rpg_tileset_32x32/SampleMap/eldrin_tower_forest.tmx"
    create_tmx(output_path)
    print(f"Map created at: {output_path}")
