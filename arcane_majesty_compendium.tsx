import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Book, Users, Map, Sword, Crown, Scroll } from 'lucide-react';

const ArcaneMajestyCompendium = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedAlbums, setExpandedAlbums] = useState({});
  const [expandedCharacters, setExpandedCharacters] = useState({});

  const toggleAlbum = (albumId) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }));
  };

  const toggleCharacter = (characterId) => {
    setExpandedCharacters(prev => ({
      ...prev,
      [characterId]: !prev[characterId]
    }));
  };

  const albums = [
    {
      id: 'album1',
      title: 'A Tapestry of Souls',
      storyline: "Anya's epic journey through the Empire of the Void, her alliance with rebels, and her ultimate sacrifice to prevent Nychtoros' return.",
      acts: [
        {
          title: 'Act I: The Empire of Shadows',
          tracks: [
            { title: 'Empire of the Void', description: 'Anya, a young scholar from Thaloria, is mysteriously transported to the ominous Empire of the Void ruled by Nychtoros.' },
            { title: 'Eternal Nightfall', description: 'Anya joins Valen\'s rebel forces, forming alliances and hearing tales of loss and tyranny.' },
            { title: 'After the Snowfall', description: 'In a frozen wasteland, Anya and Seraphina meet and bond over shared grief and resilience.' }
          ]
        },
        {
          title: 'Act II: Symphony of Suffering',
          tracks: [
            { title: 'Symphony of Suffering', description: 'A massive battle erupts between rebels and Nychtoros\' forces.' },
            { title: 'Mystic Horizon', description: 'The allies discover a mystical realm where Elara reveals the true nature of darkness.' },
            { title: 'Learning to Fly', description: 'Under Elara\'s mentorship, Anya undergoes transformation to harness her latent powers.' }
          ]
        },
        {
          title: 'Act III: Shadows and Stardust',
          tracks: [
            { title: 'Shadows and Stardust', description: 'Venturing into the cosmos, they explore ancient ruins and encounter celestial beings.' },
            { title: 'Stormbringer', description: 'A mysterious figure emerges with raw power. Anya struggles between trust and caution.' },
            { title: 'Eclipse of Destiny', description: 'As a cosmic event looms, Anya faces pivotal decisions in her confrontation with Nychtoros.' }
          ]
        },
        {
          title: 'Act IV: Haunting Life and Celestial Rebellion',
          tracks: [
            { title: 'Shadows in the Rain', description: 'Anya confronts her vampiric heritage while battling inner demons.' },
            { title: 'Endless Night', description: 'The universe plunges into despair as Nychtoros\' power grows.' },
            { title: 'Celestical Rebellion', description: 'In the climactic battle, Anya unites with celestial forces and makes the ultimate sacrifice.' },
            { title: 'Haunting Life', description: 'In the aftermath, Anya reflects on her journey while Seraphina emerges as a leader.' }
          ]
        }
      ]
    },
    {
      id: 'album2',
      title: 'Queen of Carnage',
      storyline: 'The rise and reign of Queen Seraphina as she conquers the Lord of Shadows and expands her dark empire.',
      acts: [
        {
          title: 'Act I: The Queen\'s Ascent',
          tracks: [
            { title: 'Queen of Carnage', description: 'Introduces Queen Seraphina, the Queen of Carnage. Describes her rise to power, her throne forged in fury, and her reign over a kingdom born from the ashes of a fallen empire.', tone: 'Dramatic, Powerful' },
            { title: 'The Whispering Shadows', description: 'Queen Seraphina learns of the Lord of Shadows, a powerful ruler of a neighboring realm. She sends her spies to gather information about his strengths and weaknesses.', tone: 'Intriguing, Mysterious' },
            { title: 'The Gathering Storm', description: 'As Seraphina prepares for war, she rallies her legions of darkness. Her generals debate strategies, and the first skirmishes begin at the border.', tone: 'Dramatic, Epic' }
          ]
        },
        {
          title: 'Act II: The War for Dominance',
          tracks: [
            { title: 'The Siege of Silence', description: 'Queen Seraphina\'s forces lay siege to the first stronghold of the Lord of Shadows. The battle is fierce, with Seraphina\'s cunning turning the tide.', tone: 'Intense, Brutal' },
            { title: 'The Betrayal Within', description: 'A trusted advisor betrays Queen Seraphina, revealing critical information to the Lord of Shadows. The queen must deal with the traitor and counter the setback.', tone: 'Dramatic, Suspenseful' },
            { title: 'The Dark Alliance', description: 'Queen Seraphina forms an alliance with a powerful sorcerer. This new ally brings dark magic to her cause, tipping the balance of power.', tone: 'Dark, Sinister' },
            { title: 'Battle of the Broken Dreams', description: 'The climactic battle between Queen Seraphina\'s forces and the Lord of Shadows\' army. The battlefield becomes a scene of carnage and destruction.', tone: 'Epic, Climactic' },
            { title: 'The Fall of the Lord', description: 'The Lord of Shadows is defeated, and his realm falls into chaos. Queen Seraphina claims his throne, but victory comes at a great cost.', tone: 'Triumphant, Bittersweet' }
          ]
        },
        {
          title: 'Act III: The Queen\'s Burden',
          tracks: [
            { title: 'The Reign of Ruin', description: 'With her new territory under control, Queen Seraphina faces the challenges of ruling over a broken and rebellious land.', tone: 'Melancholy, Reflective' },
            { title: 'The Echoes of Despair', description: 'Queen Seraphina is haunted by the ghosts of those she has conquered and lost. Her resolve is tested as new threats emerge.', tone: 'Haunting, Emotional' },
            { title: 'The Eternal Queen', description: 'Queen Seraphina solidifies her legacy as the Queen of Carnage. Her power is unmatched, and her reign becomes eternal and unchallenged.', tone: 'Triumphant, Definitive' }
          ]
        }
      ]
    },
    {
      id: 'album5',
      title: 'Eldoria\'s Prophecy [Game Development Base]',
      storyline: 'The tale of Eldrin Nightshade, a solitary wizard called upon to find the Heart Stone of Creation and save the world.',
      note: 'This album serves as the foundation for the video game currently in development.',
      acts: [
        {
          title: 'Act I: The Call',
          tracks: [
            { title: 'Echoes of Stone', description: 'Eldrin lives reclusive in his tower, studying ancient texts, but feels growing unease.' },
            { title: 'Dreamweaver\'s Call', description: 'Nightmares torment Eldrin, showing him a dying world and an ethereal voice calls him to intervene.' },
            { title: 'Odyssey\'s Dawn', description: 'Eldrin leaves his tower to embark on a perilous journey through landscapes both beautiful and dangerous.' }
          ]
        },
        {
          title: 'Act II: Trials and Tribulations',
          tracks: [
            { title: 'Summit of Despair', description: 'Eldrin climbs a treacherous mountain pass, doubt and fear creeping into his mind.' },
            { title: 'Sylvan Sanctuary', description: 'Lost and exhausted, Eldrin discovers a hidden forest and meets an old hermit who offers wisdom.' },
            { title: 'Treachery\'s Bite', description: 'A trusted companion betrays Eldrin, breaking his trust and leaving him alone.' },
            { title: 'Inferno\'s Trial', description: 'Eldrin faces a trial by fire, testing his courage and determination in a labyrinth of flames.' }
          ]
        },
        {
          title: 'Act III: The Heart Stone Legacy',
          tracks: [
            { title: 'Eldoria\'s Heartbeat', description: 'Eldrin finally reaches the ancient kingdom of Eldoria and searches for the Heart Stone of Creation.' },
            { title: 'Heart of War', description: 'A powerful adversary corrupted by dark forces seeks to seize the Heart Stone. A final confrontation ensues.' },
            { title: 'Dawn\'s Embrace', description: 'Eldrin emerges victorious, having defeated his adversary and secured the Heart Stone. The world is healed.' }
          ]
        }
      ]
    },
    {
      id: 'album6',
      title: 'Bound by Blood',
      storyline: 'The story of Kael, a young swordsman from Eldoria confronted with his cursed vampiric heritage.',
      acts: []
    }
  ];

  const characters = {
    protagonists: [
      {
        id: 'kael',
        name: 'Kael',
        role: 'Main character of Bound by Blood',
        background: 'Young swordsman from Eldoria who discovers his cursed vampiric heritage',
        quest: 'Struggling against his inner darkness while trying to free himself from his curse',
        abilities: 'Human/vampire hybrid with enhanced physical capabilities',
        relationships: 'Romantically linked to Anya before her betrayal'
      },
      {
        id: 'anya',
        name: 'Anya',
        role: 'Young scholar transported to the Void Empire',
        background: 'Descendant of an ancient vampire whose heritage is gradually revealed',
        arc: 'Begins as a curious and compassionate researcher before becoming involved with dark forces',
        betrayal: 'Betrays Kael and ends up trapped in an underground sanctuary to prevent Nychtoros\'s return',
        abilities: 'Knowledge of ancient magic and growing vampiric powers'
      },
      {
        id: 'valen',
        name: 'Valen',
        role: 'Rebel leader allied with Anya against Nychtoros',
        background: 'Skilled warrior leading a group of rebels in the Void Empire',
        motivation: 'Tragic past marked by family destruction by Nychtoros fuels his determination',
        skills: 'Master of close combat and warfare tactics'
      },
      {
        id: 'elara',
        name: 'Elara',
        role: 'Wise figure revealing the true nature of darkness',
        background: 'Ancient and wise being residing in the Celestial Gardens',
        function: 'Anya\'s guide helping her master her powers',
        abilities: 'Controls cosmic forces and possesses deep universal wisdom'
      },
      {
        id: 'eldrin',
        name: 'Eldrin',
        role: 'Wise and skilled mage from the kingdom of Thaloria',
        function: 'Kael\'s mentor helping him navigate dangers and control his vampiric curse',
        abilities: 'Master of ancient magic capable of casting powerful protective spells'
      }
    ],
    antagonists: [
      {
        id: 'nychtoros',
        name: 'Nychtoros',
        role: 'Mysterious entity ruling the Void Empire',
        background: 'Ancient malevolent entity patrolling borders between night and day, life and death',
        appearance: 'Imposing shadow figure with brilliant eyes that pierce darkness',
        abilities: 'Wields immense power over life, death, and time'
      },
      {
        id: 'seraphina',
        name: 'Seraphina (Queen of Carnage)',
        role: 'Warrior queen fighting Nychtoros and leading rebellion',
        background: 'Ruthless sovereign seeking to expand her kingdom by conquering Nythoria',
        appearance: 'Tall and imposing with cold eyes revealing her cunning nature',
        abilities: 'Master of manipulation and combat, controls shadows'
      },
      {
        id: 'malakar',
        name: 'Malakar, Lord of Shadows',
        role: 'Sorcerer who found forbidden tome, became ruler of shadow realm',
        background: 'Rules Nythoria with iron fist, maintaining perpetual twilight and fear',
        abilities: 'Master sorcerer with control over shadows and dark magic'
      }
    ]
  };

  const realms = [
    {
      name: 'Nythoria',
      description: 'Realm of perpetual twilight, imbued with dark magic and ruled by Malakar',
      population: 'Shadow creatures whose inhabitants live in fear under Malakar\'s oppressive reign',
      keyLocations: ['Malakar\'s Citadel', 'Shadow Realm']
    },
    {
      name: 'Void Empire (Underworld)',
      description: 'Realm of shadows and dark forces, ruled by Nychtoros',
      significance: 'Represents the cycle of life and death, filled with secrets and dark magic',
      keyLocations: ['Caverns of Torment', 'Sanctuary of Exile', 'Nychtoros\' Palace', 'Shadowlands']
    },
    {
      name: 'Eldoria',
      description: 'Mystical realm filled with ancient ruins and rich magical history',
      purpose: 'Sanctuary for scholars and mages',
      significance: 'Where the Heart Stone of Creation is sought for its immense power'
    },
    {
      name: 'Thaloria',
      description: 'Scholarly and vibrant realm known for vast libraries and magical studies',
      character: 'Beacon of light and knowledge whose inhabitants value curiosity and illumination',
      keyLocations: ['Celestial Gardens', 'Mystic Horizons']
    },
    {
      name: 'Ravenspire',
      description: 'Fierce and cunning realm ruled by Queen Seraphina',
      culture: 'Known for warrior culture and strategic prowess',
      status: 'Ready to conquer, motivated by ambition and desire for power'
    }
  ];

  const sections = [
    { id: 'overview', title: 'Overview', icon: Book },
    { id: 'albums', title: 'Albums', icon: Scroll },
    { id: 'characters', title: 'Characters', icon: Users },
    { id: 'realms', title: 'Realms', icon: Map },
    { id: 'artifacts', title: 'Artifacts', icon: Crown },
    { id: 'game', title: 'Game Development', icon: Sword }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-lg border border-purple-700">
        <h2 className="text-2xl font-bold text-white mb-4">Arcane Majesty Universe</h2>
        <p className="text-purple-100 mb-3">
          <strong>Concept:</strong> 8 interconnected concept albums with elaborate fantasy storylines
        </p>
        <p className="text-purple-100 mb-3">
          <strong>Medium:</strong> Created using Suno AI music generation
        </p>
        <p className="text-purple-100">
          <strong>Universe:</strong> Rich fantasy world with multiple realms, complex characters, and interconnected narratives
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Current Status</h3>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• Album 1: A Tapestry of Souls ✓</li>
            <li>• Album 2: Queen of Carnage ✓</li>
            <li>• Album 5: Eldoria's Prophecy ✓ (Game Base)</li>
            <li>• Album 6: Bound by Blood ✓</li>
            <li>• Albums 4, 7, 8: In Development</li>
          </ul>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Game Development</h3>
          <p className="text-gray-300 text-sm">
            Video game in development based on Album 5: Eldoria's Prophecy, featuring Eldrin Nightshade's quest for the Heart Stone of Creation.
          </p>
        </div>
      </div>
    </div>
  );

  const renderAlbums = () => (
    <div className="space-y-4">
      {albums.map((album) => (
        <div key={album.id} className="bg-gray-800 rounded-lg border border-gray-700">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-750"
            onClick={() => toggleAlbum(album.id)}
          >
            <div>
              <h3 className="text-lg font-semibold text-white">{album.title}</h3>
              {album.note && (
                <p className="text-sm text-yellow-400 mt-1">{album.note}</p>
              )}
              <p className="text-gray-300 text-sm mt-1">{album.storyline}</p>
            </div>
            {expandedAlbums[album.id] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
          </div>
          
          {expandedAlbums[album.id] && album.acts.length > 0 && (
            <div className="px-4 pb-4 border-t border-gray-700">
              {album.acts.map((act, actIndex) => (
                <div key={actIndex} className="mt-4">
                  <h4 className="font-semibold text-purple-300 mb-2">{act.title}</h4>
                  <div className="space-y-2">
                    {act.tracks.map((track, trackIndex) => (
                      <div key={trackIndex} className="bg-gray-750 p-3 rounded border-l-4 border-purple-500">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-medium text-white">{track.title}</h5>
                          {track.tone && (
                            <span className="text-xs px-2 py-1 bg-purple-700 text-purple-200 rounded-full ml-2">
                              {track.tone}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{track.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCharacters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Protagonists & Allies</h3>
        <div className="space-y-3">
          {characters.protagonists.map((character) => (
            <div key={character.id} className="bg-gray-800 rounded-lg border border-gray-700">
              <div 
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-750"
                onClick={() => toggleCharacter(character.id)}
              >
                <div>
                  <h4 className="text-lg font-semibold text-green-400">{character.name}</h4>
                  <p className="text-gray-300 text-sm">{character.role}</p>
                </div>
                {expandedCharacters[character.id] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
              </div>
              
              {expandedCharacters[character.id] && (
                <div className="px-4 pb-4 border-t border-gray-700 space-y-2">
                  {Object.entries(character).map(([key, value]) => {
                    if (key === 'id' || key === 'name') return null;
                    return (
                      <div key={key}>
                        <span className="text-green-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                        <span className="text-gray-300">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Antagonists & Ambiguous Figures</h3>
        <div className="space-y-3">
          {characters.antagonists.map((character) => (
            <div key={character.id} className="bg-gray-800 rounded-lg border border-gray-700">
              <div 
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-750"
                onClick={() => toggleCharacter(`ant_${character.id}`)}
              >
                <div>
                  <h4 className="text-lg font-semibold text-red-400">{character.name}</h4>
                  <p className="text-gray-300 text-sm">{character.role}</p>
                </div>
                {expandedCharacters[`ant_${character.id}`] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
              </div>
              
              {expandedCharacters[`ant_${character.id}`] && (
                <div className="px-4 pb-4 border-t border-gray-700 space-y-2">
                  {Object.entries(character).map(([key, value]) => {
                    if (key === 'id' || key === 'name') return null;
                    return (
                      <div key={key}>
                        <span className="text-red-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                        <span className="text-gray-300">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRealms = () => (
    <div className="space-y-4">
      {realms.map((realm, index) => (
        <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">{realm.name}</h3>
          <p className="text-gray-300 mb-3">{realm.description}</p>
          
          {realm.population && (
            <p className="text-gray-300 mb-2">
              <span className="text-blue-300 font-medium">Population: </span>
              {realm.population}
            </p>
          )}
          
          {realm.culture && (
            <p className="text-gray-300 mb-2">
              <span className="text-blue-300 font-medium">Culture: </span>
              {realm.culture}
            </p>
          )}
          
          {realm.significance && (
            <p className="text-gray-300 mb-2">
              <span className="text-blue-300 font-medium">Significance: </span>
              {realm.significance}
            </p>
          )}
          
          {realm.keyLocations && (
            <div>
              <span className="text-blue-300 font-medium">Key Locations: </span>
              <span className="text-gray-300">{realm.keyLocations.join(', ')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderArtifacts = () => (
    <div className="space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">The Celestial Key</h3>
        <p className="text-gray-300">Artifact that unlocks the secrets of the Celestial Gardens</p>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">The Forbidden Tome</h3>
        <p className="text-gray-300">Ancient book of dark magic, source of Malakar's power used to overthrow Nythoria's tyrant</p>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">The Heart Stone of Creation</h3>
        <p className="text-gray-300">Powerful artifact sought in Eldoria, coveted for its immense power</p>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 rounded-lg border border-indigo-700">
        <h3 className="text-xl font-semibold text-white mb-4">Game Based on Album 5: Eldoria's Prophecy</h3>
        <p className="text-indigo-100 mb-4">
          The video game currently in development is based on the story told in Arcane Majesty's fifth album, 
          following Eldrin Nightshade's quest to find the Heart Stone of Creation and save the world.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Development Status</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Game Type: To be specified</li>
              <li>• Platform: To be specified</li>
              <li>• Main Characters: To be determined</li>
              <li>• Game Mechanics: To be developed</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Story Elements</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Quest for Heart Stone of Creation</li>
              <li>• Journey through treacherous landscapes</li>
              <li>• Trials by fire and betrayal</li>
              <li>• Ancient kingdom of Eldoria</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'albums': return renderAlbums();
      case 'characters': return renderCharacters();
      case 'realms': return renderRealms();
      case 'artifacts': return renderArtifacts();
      case 'game': return renderGame();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Arcane Majesty Universe
          </h1>
          <p className="text-gray-400">Interactive Compendium</p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon size={16} />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ArcaneMajestyCompendium;