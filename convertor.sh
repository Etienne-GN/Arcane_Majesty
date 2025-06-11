#!/bin/bash
# Convertisseur HTML vers XML pour les chansons
# Usage: ./html_to_xml.sh input.html [output.xml]

# Vérifier si le fichier d'entrée est fourni
if [ $# -eq 0 ]; then
    echo "Usage: $0 input.html [output.xml]"
    echo "Exemples:"
    echo "  $0 empire_void.html"
    echo "  $0 empire_void.html chanson.xml"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"
SONG_ID=1

# Vérifier si le fichier d'entrée existe
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Erreur: Fichier '$INPUT_FILE' non trouvé"
    exit 1
fi

# Fonction pour échapper les caractères XML
escape_xml() {
    local text="$1"
    echo "$text" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'"'"'/\&#39;/g'
}

# Extraire le titre de la chanson
extract_title() {
    grep -o '<h5[^>]*>[^<]*</h5>' "$INPUT_FILE" | sed 's/<[^>]*>//g' | head -1
}

# Extraire le ton/mood
extract_tone() {
    grep -o 'bg-purple-600[^>]*>[^<]*<' "$INPUT_FILE" | sed 's/^[^>]*>//; s/<.*//' | head -1
}

# Extraire la description/plot
extract_plot() {
    grep -A 10 'text-gray-300 leading-relaxed' "$INPUT_FILE" | \
    sed -n 's/.*<p[^>]*>\(.*\)<\/p>.*/\1/p' | \
    sed 's/<[^>]*>//g' | head -1
}

# Extraire les paroles (version simplifiée)
extract_lyrics() {
    local temp_file=$(mktemp)
    
    # Extraire la section lyrics
    sed -n '/lyrics-content/,/^[[:space:]]*<\/div>/p' "$INPUT_FILE" > "$temp_file"
    
    # Traiter chaque section de paroles
    {
        grep -o '\[Verse [0-9]*\]' "$temp_file"
        grep -o '\[Pre-Chorus\]' "$temp_file"
        grep -o '\[Chorus\]' "$temp_file" 
        grep -o '\[Bridge\]' "$temp_file"
        grep -o '\[Outro\]' "$temp_file"
    } | while read -r label; do
        echo "$label"
        # Extraire le texte après le label (méthode simplifiée)
        grep -A 10 "$label" "$temp_file" | \
        sed '1d; /verse-label/d; s/<br[^>]*>/\n/g; s/<[^>]*>//g; /^[[:space:]]*$/d' | \
        head -4
    done
    
    rm -f "$temp_file"
}

# Créer le XML
create_xml() {
    local title="$1"
    local tone="$2" 
    local plot="$3"
    local lyrics="$4"
    
    cat << EOF
<Song song="$(escape_xml "$title")">
	<song_id>$SONG_ID</song_id>
	<Tone>$(escape_xml "$tone")</Tone>
	<Plot>$(escape_xml "$plot")
	</Plot>
	<Lyrics>$(escape_xml "$lyrics")</Lyrics>
	<analysis>...</analysis>
</Song>
EOF
}

# Extraction des données
echo "🔄 Extraction des données de $INPUT_FILE..."
TITLE=$(extract_title)
TONE=$(extract_tone)
PLOT=$(extract_plot)
LYRICS=$(extract_lyrics)

# Génération du XML
XML_OUTPUT=$(create_xml "$TITLE" "$TONE" "$PLOT" "$LYRICS")

# Sortie du résultat
if [ -n "$OUTPUT_FILE" ]; then
    echo "$XML_OUTPUT" > "$OUTPUT_FILE"
    echo "✅ Conversion terminée: $INPUT_FILE -> $OUTPUT_FILE"
else
    echo "$XML_OUTPUT"
fi

# Script pour traiter plusieurs fichiers
if [ "$1" = "--batch" ]; then
    echo "🔄 Mode batch - traitement de tous les fichiers HTML..."
    COUNTER=1
    find . -name "*.html" -type f | while read -r file; do
        echo "Traitement de $file..."
        SONG_ID=$COUNTER
        # Traiter chaque fichier...
        ((COUNTER++))
    done
fi
