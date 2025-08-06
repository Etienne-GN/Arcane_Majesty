# Arcane Majesty Compendium

## Project Overview

This project, "Arcane Majesty," is a multi-dimensional fantasy saga that combines music, lore, and game development to create a rich, immersive universe. The project is presented as a web-based compendium that serves as a central hub for all its components.

The core of the project is a fantasy world with a detailed narrative, characters, and realms. This lore is expressed through:

*   **Music Albums:** The project includes multiple music albums, with songs that tell the story of the "Arcane Majesty" universe. The albums are divided into acts and songs, each with its own plot, tone, and lyrics.
*   **Game Development:** The project is being developed as an Action RPG using the Solarus game engine. The game's story, chapters, and mechanics are detailed in the project files.
*   **Web Compendium:** The project's main entry point is a web-based compendium that presents all the lore, music, and game development information in a structured and interactive way.

The project is built using the following technologies:

*   **Frontend:** HTML, CSS, JavaScript, Tailwind CSS, and Lucide icons.
*   **Data:** XML is used to store the project's lore, including album information, song details, and game story.
*   **Game Engine:** The Solarus game engine is used for the game development component.

## Directory Overview

The project directory is structured as follows:

*   `index.html`: The main entry point for the web compendium. It presents the "Arcane Majesty" universe and includes sections for Overview, Albums, Characters, Realms, Artifacts, and Game Dev.
*   `styles.css`: Contains the CSS for the `index.html` file, including animations, gradients, and glass morphism effects.
*   `Arcane_Majesty.xml`: An XML file that serves as the main database for the project's lore. It contains detailed information about the music albums, songs, plots, and lyrics.
*   `Game.xml`: An XML file that contains the game's story, acts, and chapters, as well as details about the game's mechanics.
*   `converter.html`: A utility file that converts the XML song data into HTML format. This tool is used to generate the HTML content for the web compendium.
*   `old/`: A directory containing older versions of the project files.

## Development Conventions

The project follows a set of development conventions that are evident from the codebase:

*   **Data-Driven Approach:** The project uses a data-driven approach, with the lore and content stored in XML files. This allows for a separation of the data from the presentation layer.
*   **Component-Based Structure:** The web compendium is structured into components, with each section (Overview, Albums, Characters, etc.) having its own dedicated HTML and CSS code.
*   **Utility-First CSS:** The project uses Tailwind CSS, a utility-first CSS framework, for styling the web compendium.
*   **Interactive UI:** The web compendium features an interactive user interface, with features like expandable content sections, lyrics toggles, and animated particle backgrounds.
*   **Modular JavaScript:** The JavaScript code is modular, with different functions for handling different aspects of the web compendium's functionality.

## Usage

The project is intended to be viewed and interacted with through the `index.html` file, which serves as the main entry point for the web compendium. The `converter.html` file is a utility for the project owner to convert their XML data to HTML, which can then be integrated into the web compendium.

To view the project, open the `index.html` file in a web browser. To use the XML to HTML converter, open the `converter.html` file in a web browser.
