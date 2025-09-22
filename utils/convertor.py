#!/usr/bin/env python3
"""
Convertisseur XML vers HTML pour les chansons
Usage: python xml_to_html.py input.xml [output.html]
"""

import sys
import re
import xml.etree.ElementTree as ET
from pathlib import Path

def parse_song_xml(xml_content):
    """Parse le XML et extrait les données de la chanson"""
    try:
        root = ET.fromstring(xml_content)
        
        # Extraire les données
        song_data = {
            'title': root.get('song', 'Titre inconnu'),
            'song_id': root.find('song_id').text if root.find('song_id') is not None else '1',
            'tone': root.find('Tone').text if root.find('Tone') is not None else '',
            'plot': root.find('Plot').text if root.find('Plot') is not None else '',
            'lyrics': root.find('Lyrics').text if root.find('Lyrics') is not None else ''
        }
        
        return song_data
    except ET.ParseError as e:
        print(f"❌ Erreur de parsing XML: {e}")
        return None

def format_lyrics_html(lyrics_text):
    """Convertit le texte des paroles en HTML avec les bonnes classes"""
    if not lyrics_text:
        return ""
    
    # Définir les classes CSS pour chaque type de section
    section_classes = {
        '[Verse 1]': 'verse',
        '[Verse 2]': 'verse', 
        '[Verse 3]': 'verse',
        '[Pre-Chorus]': 'pre-chorus',
        '[Chorus]': 'chorus',
        '[Bridge]': 'bridge',
        '[Outro]': 'outro'
    }
    
    # Définir les couleurs pour les labels
    label_colors = {
        '[Verse 1]': 'text-red-400',
        '[Verse 2]': 'text-red-400',
        '[Verse 3]': 'text-red-400',
        '[Pre-Chorus]': 'text-orange-400',
        '[Chorus]': 'text-yellow-400',
        '[Bridge]': 'text-purple-400',
        '[Outro]': 'text-blue-400'
    }
    
    html_sections = []
    current_section = None
    current_lines = []
    
    for line in lyrics_text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Vérifier si c'est un label de section
        if line in section_classes:
            # Sauvegarder la section précédente
            if current_section and current_lines:
                section_class = section_classes[current_section]
                label_color = label_colors.get(current_section, 'text-red-400')
                
                lines_html = '<br>\n                    '.join(current_lines)
                section_html = f'''                <div class="{section_class}">
                    <span class="verse-label {label_color} font-semibold">{current_section}</span><br>
                    {lines_html}
                </div>'''
                html_sections.append(section_html)
            
            # Commencer une nouvelle section
            current_section = line
            current_lines = []
        else:
            # Ajouter la ligne à la section courante
            current_lines.append(line)
    
    # Traiter la dernière section
    if current_section and current_lines:
        section_class = section_classes.get(current_section, 'verse')
        label_color = label_colors.get(current_section, 'text-red-400')
        
        lines_html = '<br>\n                    '.join(current_lines)
        section_html = f'''                <div class="{section_class}">
                    <span class="verse-label {label_color} font-semibold">{current_section}</span><br>
                    {lines_html}
                </div>'''
        html_sections.append(section_html)
    
    return '\n\n'.join(html_sections)

def create_html_from_song(song_data):
    """Génère le HTML complet à partir des données de chanson"""
    
    # Créer l'ID unique pour les paroles
    song_id_lower = re.sub(r'[^a-z0-9]', '-', song_data['title'].lower())
    lyrics_id = f"lyrics-{song_id_lower}"
    
    # Formatter les paroles
    lyrics_html = format_lyrics_html(song_data['lyrics'])
    
    # Template HTML
    html_template = f'''                                        <!-- {song_data['title']} -->
                                        <div class="bg-gradient-to-r from-red-900/30 to-red-800/30 p-4 rounded-lg border-l-4 border-red-500 hover:border-red-400 transition-colors duration-300">
                                            <div class="flex justify-between items-start mb-2">
                                                <h5 class="text-lg font-semibold text-white">{song_data['title']}</h5>
                                                <div class="flex items-center gap-2">
                                                    <span class="px-2 py-1 text-xs bg-purple-600/30 text-purple-300 rounded-full">{song_data['tone']}</span>
                                                    <button class="lyrics-toggle px-3 py-1 text-xs bg-blue-600/30 text-blue-300 rounded-full hover:bg-blue-600/50 transition-colors duration-300" data-target="{lyrics_id}">
                                                        Show Lyrics
                                                    </button>
                                                </div>
                                            </div>
                                            <p class="text-gray-300 leading-relaxed mb-4">{song_data['plot']}</p>
            
                                            <!-- Lyrics Section -->
                                            <div id="{lyrics_id}" class="lyrics-container hidden">
                                                <div class="bg-black/30 p-4 rounded-lg border border-gray-600/30 mt-4">
                                                    <h6 class="text-md font-semibold text-red-300 mb-3 flex items-center gap-2">
                                                        <i data-lucide="music" class="w-4 h-4"></i>
                                                        Lyrics
                                                    </h6>
                                                    <div class="lyrics-content text-gray-300 text-sm leading-relaxed space-y-3">
{lyrics_html}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>'''
    
    return html_template

def process_xml_file(input_file, output_file=None):
    """Traite un fichier XML et génère le HTML"""
    try:
        # Lire le fichier XML
        with open(input_file, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        # Parser le XML
        song_data = parse_song_xml(xml_content)
        if not song_data:
            return None
        
        # Générer le HTML
        html_output = create_html_from_song(song_data)
        
        # Écrire le résultat
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_output)
            print(f"✅ Conversion terminée: {input_file} -> {output_file}")
        else:
            print(html_output)
        
        return html_output
        
    except FileNotFoundError:
        print(f"❌ Erreur: Fichier '{input_file}' non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")
        return None

def process_multiple_xml_songs(input_file, output_file=None):
    """Traite un fichier XML contenant plusieurs chansons"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        # Diviser le XML en sections Song individuelles
        song_pattern = r'<Song[^>]*>.*?</Song>'
        song_matches = re.findall(song_pattern, xml_content, re.DOTALL)
        
        if not song_matches:
            print("❌ Aucune balise <Song> trouvée dans le fichier")
            return None
        
        html_sections = []
        for song_xml in song_matches:
            song_data = parse_song_xml(song_xml)
            if song_data:
                html_section = create_html_from_song(song_data)
                html_sections.append(html_section)
        
        combined_html = '\n\n'.join(html_sections)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(combined_html)
            print(f"✅ Conversion de {len(html_sections)} chansons terminée: {input_file} -> {output_file}")
        else:
            print(combined_html)
        
        return combined_html
        
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python xml_to_html.py fichier.xml [sortie.html]")
        print("\nExemples:")
        print("  python xml_to_html.py chanson.xml")
        print("  python xml_to_html.py chanson.xml empire_void.html")
        print("  python xml_to_html.py toutes_chansons.xml toutes_chansons.html")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Vérifier si le fichier existe
    if not Path(input_file).is_file():
        print(f"❌ Erreur: Fichier '{input_file}' non trouvé")
        sys.exit(1)
    
    # Traiter le fichier (gère automatiquement les fichiers avec une ou plusieurs chansons)
    process_multiple_xml_songs(input_file, output_file)

if __name__ == "__main__":
    main()
