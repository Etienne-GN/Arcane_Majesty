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

        # Fetch Locations with Hierarchy
        locations_data = session.run("""
            MATCH (l:Location)
            OPTIONAL MATCH (l)-[:PART_OF_REALM]->(parent)
            RETURN l.name AS name, l.description AS description, parent.name AS parent
            ORDER BY parent DESC, l.name ASC
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
        "locations": locations_data,
        "artifacts": artifacts
    }

def generate_html(data):
    # Constructing segments
    album_html = ""
    for i, a in enumerate(data['albums']):
        song_html = ""
        valid_songs = [s for s in a['songs'] if s['title'] is not None]
        for s in valid_songs:
            song_html += f'''
            <div class="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group/song">
                <div class="flex justify-between items-start">
                    <h3 class="text-xl font-bold text-gray-100 group-hover/song:text-primary transition-colors">
                        <span class="text-primary/50 text-sm font-mono mr-2">{s["track_index"]}</span>{s["title"]}
                    </h3>
                </div>
                <p class="text-gray-400 text-sm mt-3 leading-relaxed">{s["plot"]}</p>
                <details class="mt-4 group/details">
                    <summary class="text-[10px] text-primary/70 cursor-pointer uppercase tracking-[0.2em] font-black list-none flex items-center gap-2 hover:text-primary transition-colors">
                        <div class="w-1 h-1 bg-primary rounded-full"></div> View Lyrics
                    </summary>
                    <div class="mt-4 p-6 text-sm text-gray-400 leading-relaxed whitespace-pre-wrap font-sans bg-black/60 rounded-xl border border-white/5 shadow-inner">
                        {s["lyrics"]}
                    </div>
                </details>
            </div>
            '''
        
        # Use a slugified title for ID
        album_id = f"album-{i}"
        
        album_html += f'''
        <div class="glass-card p-10 rounded-[2.5rem] mb-8 relative overflow-hidden border-white/10">
            <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <div class="cursor-pointer" onclick="toggleAlbum('{album_id}')">
                <div class="flex flex-col md:flex-row justify-between items-baseline mb-6 gap-4">
                    <div class="flex items-center gap-4">
                        <div id="icon-{album_id}" class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                        <h2 class="text-4xl font-black tracking-tighter text-white">{a["title"]}</h2>
                    </div>
                    <span class="px-4 py-1 bg-primary/20 text-primary rounded-full text-[10px] font-black tracking-widest uppercase border border-primary/30">
                        {a["timeline"]}
                    </span>
                </div>
                <p class="text-lg text-gray-400 mb-2 leading-relaxed italic font-light border-l-2 border-primary/30 pl-6">
                    {a["summary"]}
                </p>
            </div>

            <div id="{album_id}" class="hidden mt-10 space-y-6 pt-10 border-t border-white/5">
                <div class="grid gap-6">
                    {song_html}
                </div>
            </div>
        </div>
        '''

    char_html = ""
    for c in data['characters']:
        char_html += f'''
        <div class="glass-card p-8 rounded-3xl border-t border-white/5 hover:border-primary/50 transition-all group">
            <h3 class="text-3xl font-black mb-1 text-white group-hover:text-primary transition-colors">{c["name"]}</h3>
            <div class="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                {c["race"]} <span class="text-white/20">/</span> {c["role"]}
            </div>
            <p class="text-gray-400 leading-relaxed mb-6 font-medium">{c["description"]}</p>
            <details class="group/backstory">
                <summary class="text-[10px] text-gray-500 cursor-pointer uppercase font-black italic tracking-widest list-none hover:text-white transition-colors">
                    + Reveal Chronicle
                </summary>
                <div class="mt-4 p-6 text-sm text-gray-500 italic leading-relaxed bg-white/5 rounded-2xl border border-white/5">
                    {c["backstory"]}
                </div>
            </details>
        </div>
        '''

    # Organize Locations by Realm
    realms = {}
    for l in data['locations']:
        parent = l['parent'] if l['parent'] else "Prime Realms"
        if parent not in realms:
            realms[parent] = []
        realms[parent].append(l)

    loc_html = ""
    for realm, sub_locs in realms.items():
        sub_html = ""
        for sl in sub_locs:
            if sl['parent'] is None: continue
            sub_html += f'''
            <div class="pl-6 border-l border-white/10 py-4">
                <h4 class="text-xl font-bold text-white mb-2">{sl["name"]}</h4>
                <p class="text-gray-400 text-sm leading-relaxed">{sl["description"]}</p>
            </div>
            '''
        
        realm_desc = next((l['description'] for l in data['locations'] if l['name'] == realm), "A major dimension of the axis.")
        
        loc_html += f'''
        <div class="glass-card p-8 rounded-3xl mb-8">
            <div class="mb-6">
                <h3 class="text-3xl font-black text-primary mb-2 tracking-tight uppercase">{realm}</h3>
                <p class="text-gray-300 italic font-light">{realm_desc}</p>
            </div>
            <div class="grid md:grid-cols-2 gap-8">
                {sub_html}
            </div>
        </div>
        '''

    art_html = ""
    for art in data['artifacts']:
        art_html += f'''
        <div class="glass-card p-8 rounded-3xl border-l-2 border-accent/30 hover:border-accent transition-all">
            <h3 class="text-2xl font-black text-accent mb-4 tracking-tight">{art["name"]}</h3>
            <p class="text-gray-400 text-sm leading-relaxed font-medium">{art["description"]}</p>
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
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;900&family=Inter:wght@300;400;600;800&display=swap');
        
        body {{ 
            font-family: 'Inter', sans-serif; 
            background-color: #050505; 
            color: white;
            background-image: radial-gradient(circle at 50% -20%, #200000 0%, #050505 80%);
        }}
        h1, h2, h3, h4 {{ font-family: 'Cinzel', serif; }}
        
        .glass-card {{ 
            background: rgba(255, 255, 255, 0.02); 
            backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }}
        
        .nav-btn {{
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-size: 0.75rem;
            font-weight: 800;
        }}
        
        .nav-btn.active {{
            background: #8b0000;
            color: white;
            box-shadow: 0 0 30px rgba(139, 0, 0, 0.4);
            transform: translateY(-2px);
        }}

        /* Custom Scrollbar */
        ::-webkit-scrollbar {{ width: 8px; }}
        ::-webkit-scrollbar-track {{ background: #050505; }}
        ::-webkit-scrollbar-thumb {{ background: #200000; border-radius: 10px; }}
        ::-webkit-scrollbar-thumb:hover {{ background: #8b0000; }}
    </style>
</head>
<body class="min-h-screen pb-20">

    <div class="container mx-auto px-4 py-12 max-w-6xl">
        <header class="text-center mb-20">
            <h1 class="text-6xl md:text-7xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 text-shadow">
                ARCANE MAJESTY
            </h1>
            <div class="flex items-center justify-center gap-4 mb-4">
                <div class="h-px w-12 bg-primary/50"></div>
                <p class="text-primary font-black tracking-[0.4em] text-[10px] uppercase">Lore Compendium</p>
                <div class="h-px w-12 bg-primary/50"></div>
            </div>
            <p class="text-gray-500 font-medium italic text-sm">Direct Uplink: Scarif Knowledge-Graph</p>
        </header>

        <nav class="flex flex-wrap justify-center gap-3 mb-20 sticky top-8 z-50">
            <div class="glass-card p-2 rounded-full flex gap-2 border-white/10 shadow-2xl">
                <button onclick="showSection('albums')" id="btn-albums" class="nav-btn active px-8 py-3 rounded-full hover:bg-white/5">Albums</button>
                <button onclick="showSection('characters')" id="btn-characters" class="nav-btn px-8 py-3 rounded-full hover:bg-white/5">Characters</button>
                <button onclick="showSection('locations')" id="btn-locations" class="nav-btn px-8 py-3 rounded-full hover:bg-white/5">Realms</button>
                <button onclick="showSection('artifacts')" id="btn-artifacts" class="nav-btn px-8 py-3 rounded-full hover:bg-white/5">Artifacts</button>
            </div>
        </nav>

        <div id="sections">
            <section id="albums" class="content-section space-y-8">{album_html}</section>
            <section id="characters" class="content-section hidden grid md:grid-cols-2 gap-8">{char_html}</section>
            <section id="locations" class="content-section hidden space-y-12">{loc_html}</section>
            <section id="artifacts" class="content-section hidden grid md:grid-cols-2 gap-8">{art_html}</section>
        </div>
    </div>

    <script>
        function showSection(id) {{
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + id).classList.add('active');
            window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}

        function toggleAlbum(id) {{
            const el = document.getElementById(id);
            const icon = document.getElementById('icon-' + id);
            
            if (el.classList.contains('hidden')) {{
                el.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            }} else {{
                el.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }}
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
