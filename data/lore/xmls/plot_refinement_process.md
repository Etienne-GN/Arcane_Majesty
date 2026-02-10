# Album Plot Refinement Process

This document outlines the step-by-step process for refining the story and plots of each album in the "Arcane Majesty" universe.

## Phase 0: Global Context & Timeline

Before starting a new album, we will perform two key actions:

1.  **Recall Continuity:** We will always keep the narratives of previously refined albums in mind to ensure a cohesive and consistent universe.
2.  **Establish Timeline:** We use a two-tiered timeline system to precisely place events within the universe:
    *   **Global Timeline:** The central reference point for the Arcane Majesty universe is "The Great Darkness" (GD), the world-changing event from the song "Eternal Nightfall." Major events and albums are dated in years relative to this point (e.g., `150 BGD` for 150 years Before Great Darkness, or `25 AGD` for 25 years After Great Darkness). The "A Tapestry of Souls" album itself is marked as `0 GD`.
    *   **Song Timeline:** Within each album's XML file, every song has a `<timestamp>` tag. This is a numeric value representing the number of days relative to the album's main event (e.g., `-30`, `0`, `75`).

## Phase 1: High-Level Story Definition

This phase establishes the core narrative for the entire album.

3.  **Define Immutable Facts:** For the album we are working on, you will provide the essential, unchangeable plot points, considering the established timeline and continuity. This includes:
    *   Key character arcs and their outcomes.
    *   Major events that must occur.
    *   Any other critical constraints (e.g., character origins, motivations).

4.  **Draft High-Level Album Plot:** Based on these facts, I will draft a high-level story for the entire album, typically structured in acts.

5.  **Review and Finalize:** We will discuss and refine the high-level plot until you are satisfied.

## Phase 2: Individual Song Plot Refinement

This phase details the story beat by beat, song by song.

6.  **Process Songs Sequentially:** We will work through the album's songs one by one.

7.  **Propose New Song Plot:** For each song, I will propose a new, detailed plot that fits the high-level story and is consistent with the song's lyrics.

8.  **Review and Approve:** You will review each proposed song plot until it's approved.

## Phase 3: Finalization and Cleanup

This phase commits our work to the project's master files.

9.  **Update Master XML File:** Once all song plots for the album are approved, I will update the album's main `.xml` file.

10. **Integrate Album Plot (Optional):** Upon request, I will add the high-level album plot to the top of the `.xml` file.

11. **Cleanup (Optional):** Any temporary files can be removed upon your request.

## Phase 4: File Organization

To maintain a clear overview of our progress, all XML files are organized into a specific folder structure:

*   `raw_albums/`: Contains original, unprocessed album XML files.
*   `processed_albums/`: Once an album file has been fully refined and updated, it is moved here.
*   `raw_data/`: Contains the extracted data sections (`locations.xml`, `characters.xml`, etc.) in their original, unprocessed state.
*   `processed_data/`: After a data section file has been reviewed and updated, it will be moved here.

This process ensures we always know which files are complete and which are pending review.