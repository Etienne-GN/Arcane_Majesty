import os
from neo4j import GraphDatabase
import json

# Database Configuration
URI = "bolt://192.168.0.159:7687"
USER = "neo4j"
PASSWORD = "vwnx6h8g"

def get_lore_data():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        # Fetch Albums and their Songs
        albums_data = session.run("""
            MATCH (a:Album)
            OPTIONAL MATCH (s:Song)-[:PART_OF]->(a)
            WITH a, s ORDER BY s.track_index
            RETURN a.title AS title, a.summary AS summary, a.global_timeline AS timeline, 
                   collect({
                       title: s.title, 
                       track_index: s.track_index, 
                       plot: s.plot, 
                       lyrics: s.lyrics
                   }) AS songs
            ORDER BY a.global_timeline
        """).data()

        # Fetch Characters
        characters = session.run("""
            MATCH (c:Character)
            RETURN c.name AS name, c.role AS role, c.race AS race, c.description AS description, c.backstory AS backstory
            ORDER BY c.name
        """).data()

        # Fetch Locations
        locations = session.run("""
            MATCH (l:Location)
            RETURN l.name AS name, l.description AS description
            ORDER BY l.name
        """).data()

        # Fetch Artifacts
        artifacts = session.run("""
            MATCH (art:Artifact)
            RETURN art.name AS name, art.description AS description
            ORDER BY art.name
        """).data()

    driver.close()
    return {
        "albums": albums_data,
        "characters": characters,
        "locations": locations,
        "artifacts": artifacts
    }

def generate_html(data):
    # Constructing segments to avoid complex f-string nesting
    album_html = ""
    for a in data['albums']:
        song_html = ""
        # Filter out empty songs (from optional match)
        valid_songs = [s for s in a['songs'] if s['title'] is not None]
        for s in valid_songs:
            song_html += f'''
            <div class="bg-black/20 p-4 rounded-xl border border-white/5">
                <h3 class="text-lg font-bold text-gray-200">{s["track_index"]}. {s["title"]}</h3>
                <p class="text-gray-400 text-sm mt-2">{s["plot"]}</p>
                <details class="mt-4">
                    <summary class="text-xs text-primary cursor-pointer uppercase tracking-widest font-bold">View Lyrics</summary>
                    <pre class="mt-4 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-sans bg-black/40 p-4 rounded-lg">{s["lyrics"]}</pre>
                </details>
            </div>
            '''
        
        album_html += f'''
        <div class="glass-card p-8 rounded-3xl mb-8">
            <div class="flex justify-between items-baseline mb-4 border-b border-white/10 pb-4">
                <h2 class="text-3xl font-bold text-primary">{a["title"]}</h2>
                <span class="text-gray-500 font-mono italic">{a["timeline"]}</span>
            </div>
            <p class="text-gray-300 mb-8 leading-relaxed italic">"{a["summary"]}"</p>
            <div class="grid gap-4">
                {song_html}
            </div>
        </div>
        '''

    char_html = ""
    for c in data['characters']:
        char_html += f'''
        <div class="glass-card p-6 rounded-2xl border-l-4 border-primary">
            <h3 class="text-2xl font-bold mb-1">{c["name"]}</h3>
            <div class="text-xs text-primary font-bold uppercase tracking-tighter mb-3">{c["race"]} | {c["role"]}</div>
            <p class="text-gray-400 text-sm leading-relaxed mb-4">{c["description"]}</p>
            <details>
                <summary class="text-[10px] text-gray-500 cursor-pointer uppercase font-bold italic">Read Backstory</summary>
                <p class="mt-3 text-sm text-gray-500 italic leading-relaxed">{c["backstory"]}</p>
            </details>
        </div>
        '''

    loc_html = ""
    for l in data['locations']:
        loc_html += f'''
        <div class="glass-card p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-primary mb-2">{l["name"]}</h3>
            <p class="text-gray-400 text-sm leading-relaxed">{l["description"]}</p>
        </div>
        '''

    art_html = ""
    for art in data['artifacts']:
        art_html += f'''
        <div class="glass-card p-6 rounded-2xl border-b-2 border-accent">
            <h3 class="text-xl font-bold text-accent mb-2">{art["name"]}</h3>
            <p class="text-gray-400 text-sm leading-relaxed">{art["description"]}</p>
        </div>
        '''

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arcane Majesty Compendium | Live from Scarif</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {{
        theme: {{
          extend: {{
            colors: {{
              primary: '#8b0000',
              secondary: '#1f1f1f',
              accent: '#b22222'
            }}
          }}
        }}
      }};
    </script>
    <script type="module">
        import {{ createIcons, icons }} from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';
        createIcons({{ icons }});
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;600&display=swap');
        
        body {{ font-family: 'Inter', sans-serif; background-color: #050505; color: white; }}
        h1, h2, h3 {{ font-family: 'Cinzel', serif; }}
        .glass-card {{ background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }}
        .content-section {{ display: none; }}
        .content-section.active {{ display: block; }}
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#200000] to-[#0a0a0a]">

    <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-12">
            <h1 class="text-5xl font-bold mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                ARCANE MAJESTY COMPENDIUM
            </h1>
            <p class="text-gray-400 uppercase tracking-widest text-sm">Synchronized with Scarif Lore-Graph</p>
        </header>

        <nav class="flex flex-wrap justify-center gap-4 mb-12">
            <button onclick="showSection('albums')" class="px-6 py-2 rounded-full glass-card hover:bg-primary transition-all">Albums</button>
            <button onclick="showSection('characters')" class="px-6 py-2 rounded-full glass-card hover:bg-primary transition-all">Characters</button>
            <button onclick="showSection('locations')" class="px-6 py-2 rounded-full glass-card hover:bg-primary transition-all">Realms</button>
            <button onclick="showSection('artifacts')" class="px-6 py-2 rounded-full glass-card hover:bg-primary transition-all">Artifacts</button>
        </nav>

        <div id="sections">
            <section id="albums" class="content-section active space-y-8">{album_html}</section>
            <section id="characters" class="content-section grid md:grid-cols-2 gap-6">{char_html}</section>
            <section id="locations" class="content-section grid md:grid-cols-3 gap-6">{loc_html}</section>
            <section id="artifacts" class="content-section grid md:grid-cols-3 gap-6">{art_html}</section>
        </div>
    </div>

    <script>
        function showSection(id) {{
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }}
    </script>
</body>
</html>"""

if __name__ == "__main__":
    print("Connecting to Scarif Neo4j...")
    lore = get_lore_data()
    print("Generating HTML...")
    full_html = generate_html(lore)
    
    with open("apps/compendium/index.html", "w") as f:
        f.write(full_html)
    print("Compendium update complete: apps/compendium/index.html")
