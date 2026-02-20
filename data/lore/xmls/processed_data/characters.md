# Refined Characters of Arcane Majesty

This file contains the foundational character data for the Arcane Majesty universe, refined for graph database import and AI vocalization.

## Primary Entities

### Kael
- **Name:** Kael
- **Race:** Human / Vampire Hybrid
- **Role:** Protagonist; Cursed Swordsman of Eldoria
- **Description:** A young swordsman struggling with a cursed lineage.
- **Backstory:** Formerly a star in the Eldoria city guard, now on a quest for redemption to break the vampiric curse.
- **Relationships:**
    - `ALLY_OF` Anya (Love Interest)
    - `MENTORED_BY` Eldrin
- **Origin:** Eldoria

### Anya
- **Name:** Anya
- **Race:** Aurorian (Void-Echo)
- **Role:** Scholar; The Eternal Warden
- **Description:** A brilliant Aurorian scholar born under a Celestial Eclipse, rendering her "Void-Proof."
- **Backstory:** Born at the moment Nyktoros first attempted to breach the world, her soul was "spirit-stained" by the Void. This grants her a unique frequency that allows Nyktoros's dark magic to pass through her harmlessly. After learning the truth from Elara, she uses this immunity to sacrifice herself, becoming the eternal lock on Nyktoros's prison in the Underworld.
- **Relationships:**
    - `ALLY_OF` Seraphina
    - `MENTORED_BY` Elara
- **Origin:** Thaloria

### Seraphina
- **Name:** Seraphina
- **Surname:** Queen of Carnage
- **Race:** Nythorian
- **Role:** Queen of Ravenspire; Antagonist (Later Ally)
- **Description:** A ruthless warrior queen who rose from a frozen wasteland.
- **Backstory:** Lost her family early; conquered Ravenspire and sought Nythoria to build a kingdom strong enough to survive the Void.
- **Relationships:**
    - `ALLY_OF` Draven
    - `ALLY_OF` Anya
    - `ENMITY_WITH` Malakar
- **Origin:** Ravenspire

### Malakar
- **Name:** Malakar
- **Surname:** Lord of Shadows
- **Race:** Nythorian
- **Role:** Sorcerer King of Nythoria
- **Description:** An iron-fisted ruler mastering dark shadow magic.
- **Backstory:** Overthrew a tyrant using a forbidden tome; rules a realm of perpetual twilight.
- **Relationships:**
    - `ENMITY_WITH` Seraphina
    - `BETRAYED_BY` Draven
- **Origin:** Nythoria

### Nyktoros
- **Name:** Nyktoros
- **Race:** Ancient Entity
- **Role:** Primordial Source of the Vampire Curse; Ruler of the Void
- **Description:** A towering shadowy figure controlling the boundaries of life and death.
- **Backstory:** An ancient being whose power grew over millennia; seeks to consume all light into the Empire of the Void.
- **Relationships:**
    - `ENMITY_WITH` All Mortal Life
    - `WARDEN_IS` Anya
- **Origin:** Empire of the Void

### Eldrin
- **Name:** Eldrin
- **Surname:** Nightshade
- **Race:** Human (Storm-Touched)
- **Role:** Wise Mage; Mentor
- **Description:** A unique human carrying a shard of the Stormbringer; a guidance figure from Thaloria.
- **Backstory:** Devoted to the preservation of knowledge; guides Kael in controlling his curse. His Stormbringer essence grants him near-immortality and infinite magical potential that grows linearly with his training.
- **Relationships:**
    - `ALLY_OF` Kael
- **Origin:** Thaloria

### Draven
- **Name:** Draven
- **Race:** Nythorian
- **Role:** Rebel Leader; Betrayer
- **Description:** A battle-hardened warrior of Nythoria.
- **Backstory:** Swayed by Seraphina's promises; betrays his homeland to weaken it for her invasion.
- **Relationships:**
    - `ALLY_OF` Seraphina
    - `BETRAYED` Malakar
- **Origin:** Nythoria

### Valen
- **Name:** Valen
- **Race:** Nythorian
- **Role:** Leader of the Resistance
- **Description:** A tragic warrior fighting against the Void.
- **Backstory:** His family was destroyed by Nyktoros; leads a group of Nythorian rebels in the Empire of the Void.
- **Relationships:**
    - `ALLY_OF` Anya
- **Origin:** Empire of the Void

### Elara
- **Name:** Elara
- **Race:** Ancient Being
- **Role:** Keeper of Cosmic Knowledge
- **Description:** An ethereal guide dwelling in the Celestial Gardens.
- **Backstory:** Guardian of starlight and time; reveals to Anya her true Void-Echo nature.
- **Relationships:**
    - `ALLY_OF` Anya
- **Origin:** Celestial Gardens
