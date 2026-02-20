# Arcane Majesty: Neo4j Graph Architecture

This document defines the standard schema, node labels, and relationship types for the Arcane Majesty lore database. Adhering to these standards allows for complex narrative queries (e.g., "Find all characters who wielded the Heartstone of Creation before the Great Darkness").

## 1. Core Principles
- **Uniqueness:** Every entity (Character, Location, etc.) exists as a single node.
- **Narrative Flow:** Relationships should track both social connections (Allies/Enemies) and chronological presence (Songs/Events).
- **Phonetic Readiness:** Properties should include phonetic hints where necessary for AI vocalization consistency.

---

## 2. Node Labels & Properties

### `Character`
The primary actors in the universe.
- `name`: (String, Unique) The primary name (e.g., "Anya").
- `surname`: (String) Formal titles or family names (e.g., "Queen of Carnage").
- `race`: (String) The species/type (e.g., "Nephilim", "Human").
- `role`: (String) Their narrative function (e.g., "Scholar", "Antagonist").
- `description`: (String) A concise trait summary.
- `backstory`: (String) Detailed history.

### `Album`
Represents major narrative arcs or eras.
- `title`: (String, Unique) e.g., "A Tapestry of Souls".
- `global_timeline`: (String) e.g., "0 GD", "300 AGD".
- `summary`: (String) High-level plot of the era.

### `Song`
Specific story beats and events.
- `title`: (String) e.g., "Empire of the Void".
- `track_index`: (Integer) Order within the album.
- `timestamp`: (Integer) Days relative to the album's anchor event.
- `plot`: (String) The specific narrative event.
- `lyrics`: (String) The narrative-anchored lyrics.
- `speaker_persona`: (String) The character voice intended for the song.

### `Location`
The geography of the realms.
- `name`: (String, Unique) e.g., "Nythoria".
- `description`: (String) Visual and atmospheric details.
- `key_themes`: (String) e.g., "Fear, Eternal Twilight".

### `Artifact`
Items of power or historical significance.
- `name`: (String, Unique) e.g., "Forbidden Tome".
- `powers`: (String) Mechanical or narrative effects.
- `origin`: (String) Where it was created or first found.

---

## 3. Relationship Types

Standardized relationships allow us to map the "web" of lore.

| Relationship | Source Node | Target Node | Description |
| :--- | :--- | :--- | :--- |
| `SINGS` | `Character` | `Song` | Identifies the narrator/persona of the track. |
| `APPEARS_IN` | `Character` | `Song` | Identifies who is physically present in the scene. |
| `PART_OF` | `Song` | `Album` | Links a track to its parent narrative arc. |
| `LOCATED_AT` | `Song` | `Location` | Defines where the event of the song takes place. |
| `ALLY_OF` | `Character` | `Character` | Positive social/political connection. |
| `ENMITY_WITH` | `Character` | `Character` | Negative social/political connection. |
| `BETRAYED` | `Character` | `Character` | A directional narrative event (A betrayed B). |
| `WIELDS` | `Character` | `Artifact` | Current or historical possession of an item. |
| `ORIGINATES_FROM` | `Character` | `Location` | A character's birthplace or home. |

---

## 4. Setup Queries (Schema Constraints)

When setting up your new server, run these commands first to ensure data integrity:

```cypher
// Ensure Character names are unique
CREATE CONSTRAINT character_name IF NOT EXISTS 
FOR (c:Character) REQUIRE c.name IS UNIQUE;

// Ensure Album titles are unique
CREATE CONSTRAINT album_title IF NOT EXISTS 
FOR (a:Album) REQUIRE a.title IS UNIQUE;

// Ensure Location names are unique
CREATE CONSTRAINT location_name IF NOT EXISTS 
FOR (l:Location) REQUIRE l.name IS UNIQUE;

// Ensure Artifact names are unique
CREATE CONSTRAINT artifact_name IF NOT EXISTS 
FOR (art:Artifact) REQUIRE art.name IS UNIQUE;
```

---

## 5. Narrative Query Examples

**"Who has Anya betrayed across all albums?"**
```cypher
MATCH (a:Character {name: 'Anya'})-[:BETRAYED]->(target)
RETURN target.name;
```

**"List every song that takes place in Nythoria in chronological order."**
```cypher
MATCH (s:Song)-[:LOCATED_AT]->(l:Location {name: 'Nythoria'})
RETURN s.title, s.timestamp ORDER BY s.timestamp ASC;
```
