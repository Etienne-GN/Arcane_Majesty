# Graph Migration Procedure: XML to Neo4j

This document defines the repeatable process for migrating a "Lore Complete" (Phase 4) album into the production Neo4j graph database.

## Phase 6: Graph Preparation & Manifesting

Once an album has passed Phase 5 (Lyrics Reworked), we must map its narrative nodes before execution.

1.  **Draft Import Manifest:** Create a mapping of every song in the album to its specific graph entities:
    - **Speaker:** Who is the `[:SINGS]` character?
    - **Presence:** Which characters are physically present in the song's plot (`[:APPEARS_IN]`)?
    - **Geography:** Where does this specific track take place (`[:LOCATED_AT]`)?
    - **Entities:** Identify any Artifacts, Prophecies, or unique Organizations mentioned.
2.  **Entity Verification:** Check if all identified Characters and Locations exist in the DB. If not, they must be created.
3.  **Relationship Mapping:** Identify directional narrative links (e.g., A saves B, A meets B) that happen within the tracks.

## Phase 7: Data Execution (The Import)

4.  **The Album Node:** Create/Merge the primary `Album` node with its global timeline and summary.
5.  **The Song Nodes:** Create every `Song` node, linking them to the `Album` via `[:PART_OF]`.
6.  **The Presence Links:** Execute the `SINGS`, `APPEARS_IN`, and `LOCATED_AT` relationships defined in the manifest.
7.  **Narrative Event Links:** Link songs to any `Prophecy` or `Artifact` they reveal or use.

## Phase 8: Verification & Graph Integrity

8.  **Visual Audit:** Use Neo4j Browser to ensure the "Tapestry" of the album looks logically connected.
9.  **Query Test:** Run a test query (e.g., "Find all locations visited by Character X in this Album").
