/**
 * Vibe The Game - Game Data (Enhanced Edition)
 * Refactored with ES6+
 */
export const GameData = (() => {

  // Tile type constants
  const T = {
    GROUND: 0, WALL: 1, WATER: 2, PORTAL: 3, TREE: 4,
    TALL_GRASS: 5, PATH: 6, FLOWERS: 7, BOOKSHELF: 8,
    CRYSTAL: 9, CLOUD: 10, VOID: 11, DARK: 12, HOUSE: 13,
    LAMP_POST: 14, POND: 15, FISHING_SPOT: 16, FLOWER_CLUSTER: 17, ROCK: 18
  };

  const tileProps = {};
  tileProps[T.GROUND]         = { walkable: true };
  tileProps[T.WALL]           = { walkable: false };
  tileProps[T.WATER]          = { walkable: false };
  tileProps[T.PORTAL]         = { walkable: true };
  tileProps[T.TREE]           = { walkable: false };
  tileProps[T.TALL_GRASS]    = { walkable: true };
  tileProps[T.PATH]           = { walkable: true };
  tileProps[T.FLOWERS]        = { walkable: true };
  tileProps[T.BOOKSHELF]      = { walkable: false };
  tileProps[T.CRYSTAL]        = { walkable: false };
  tileProps[T.CLOUD]          = { walkable: true };
  tileProps[T.VOID]           = { walkable: false };
  tileProps[T.DARK]           = { walkable: true };
  tileProps[T.HOUSE]          = { walkable: false };
  tileProps[T.LAMP_POST]      = { walkable: false };
  tileProps[T.POND]           = { walkable: false };
  tileProps[T.FISHING_SPOT]   = { walkable: true };
  tileProps[T.FLOWER_CLUSTER] = { walkable: true };
  tileProps[T.ROCK]           = { walkable: false };

  // Parse a map string into 2D tile array
  const charToTile = {
    '.': T.GROUND, '#': T.WALL, '~': T.WATER, 'P': T.PORTAL,
    'T': T.TREE, '*': T.TALL_GRASS, '=': T.PATH, 'F': T.FLOWERS,
    'B': T.BOOKSHELF, 'C': T.CRYSTAL, 'O': T.CLOUD, 'X': T.VOID,
    'D': T.DARK, 'H': T.HOUSE, 'L': T.LAMP_POST, 'W': T.POND,
    'R': T.FISHING_SPOT, 'Y': T.FLOWER_CLUSTER, 'K': T.ROCK
  };

  function parseMap(str) {
    const rows = str.trim().split('\n');
    let width = 0;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r].length > width) width = rows[r].length;
    }
    return rows.map((row) => {
      const tiles = [];
      for (let i = 0; i < width; i++) {
        const ch = i < row.length ? row[i] : '#';
        tiles.push(charToTile[ch] !== undefined ? charToTile[ch] : T.GROUND);
      }
      return tiles;
    });
  }

  // ====== AREA MAPS ======

  const areas = {

    // ---- SPAWN VILLAGE ----
    spawn_village: {
      name: 'Spawn Village',
      palette: {
        ground: '#2d5016', groundAlt: '#3a6b1e', wall: '#5d4037', wallLine: '#4a3228',
        path: '#c8a96e', pathLine: '#b8975a', water: '#1565c0', waterLight: '#42a5f5',
        tree: '#1b5e20', treeTop: '#43a047', sky: '#1a1a2e'
      },
      dark: false,
      bugDensity: 0.4,
      map: parseMap(
        '##############################\n' +
        '#.F..T........T......T....F.#\n' +
        '#PPPPP.F...LLLLLL.......L...#\n' +
        '#.T......============......##\n' +
        '#........=..........=......##\n' +
        '#........=..........=.......#\n' +
        '#..F.....=..........=..T...##\n' +
        '#...K....=..........=...K..##\n' +
        '#..T.....=..........=.......#\n' +
        '#........=====..=====......##\n' +
        '#............=PPP=.........##\n' +
        '#...T........=..=.....T....#\n' +
        '#............=..=.......*.##\n' +
        '#..**........=..=.......*.##\n' +
        '#..**..F.....=..=......T..##\n' +
        '#..HH........=..=.........#\n' +
        '#..HH......======....PPPPP#\n' +
        '#..HH....*..............*.#\n' +
        '#......T.........T........#\n' +
        '##############################'
      ),
      portals: [
        { x: 21, y: 16, dest: 'syntax_meadows', destX: 576, destY: 320 },
        { x: 22, y: 16, dest: 'syntax_meadows', destX: 576, destY: 320 },
        { x: 23, y: 16, dest: 'syntax_meadows', destX: 576, destY: 320 },
        { x: 24, y: 16, dest: 'syntax_meadows', destX: 576, destY: 320 },
        { x: 25, y: 16, dest: 'syntax_meadows', destX: 576, destY: 320 },
        { x: 1, y: 2, dest: 'repository', destX: 160, destY: 512 },
        { x: 2, y: 2, dest: 'repository', destX: 160, destY: 512 },
        { x: 3, y: 2, dest: 'repository', destX: 160, destY: 512 },
        { x: 4, y: 2, dest: 'repository', destX: 160, destY: 512 },
        { x: 5, y: 2, dest: 'repository', destX: 160, destY: 512 },
        { x: 14, y: 10, dest: 'neon_garden', destX: 96, destY: 544 },
        { x: 15, y: 10, dest: 'neon_garden', destX: 96, destY: 544 },
        { x: 16, y: 10, dest: 'neon_garden', destX: 96, destY: 544 },
        { x: 10, y: 18, dest: 'twilight_grove', destX: 320, destY: 480 },
        { x: 11, y: 18, dest: 'twilight_grove', destX: 320, destY: 480 },
        { x: 12, y: 18, dest: 'twilight_grove', destX: 320, destY: 480 }
      ],
      npcs: ['prof_semicolon', 'vendor_vivian', 'dj_beatbyte']
    },

    // ---- SYNTAX MEADOWS ----
    syntax_meadows: {
      name: 'Syntax Meadows',
      palette: {
        ground: '#33691e', groundAlt: '#4a7c2e', wall: '#5d4037', wallLine: '#4a3228',
        path: '#d4c07a', pathLine: '#c4a868', water: '#0d47a1', waterLight: '#2196f3',
        tree: '#1b5e20', treeTop: '#66bb6a', sky: '#1a1a2e'
      },
      dark: false,
      bugDensity: 0.8,
      map: parseMap(
        '##############################\n' +
        '#..*..*.T....*...T...*...*..#\n' +
        '#..*..........*........*....#\n' +
        '#T...**..F..........F..**..T#\n' +
        '#....**.....................#\n' +
        '#........T......T..........#\n' +
        '#..*.................*...*..#\n' +
        '#....~~~~~~~~~~~...........#\n' +
        '#....~~~~~~~~~~~......*....#\n' +
        '#....~~~~~~~~~~~..T........#\n' +
        'PPPPP~~~~~~~~~~~...........#\n' +
        '#....~~~~~~~~~~~.......*...#\n' +
        '#....~~~~~~~~~~~...........#\n' +
        '#....~~~~~~~~~~~..........P#\n' +
        '#..*..........T.........*.P#\n' +
        '#T........*...........T...P#\n' +
        '#...**...........**........#\n' +
        '#....*......F..........*...#\n' +
        '#.T....*.........T...*..T..#\n' +
        '##############################'
      ),
      portals: [
        { x: 0, y: 10, dest: 'spawn_village', destX: 608, destY: 480 },
        { x: 1, y: 10, dest: 'spawn_village', destX: 608, destY: 480 },
        { x: 2, y: 10, dest: 'spawn_village', destX: 608, destY: 480 },
        { x: 3, y: 10, dest: 'spawn_village', destX: 608, destY: 480 },
        { x: 4, y: 10, dest: 'spawn_village', destX: 608, destY: 480 },
        { x: 26, y: 13, dest: 'null_caves', destX: 160, destY: 320 },
        { x: 26, y: 14, dest: 'null_caves', destX: 160, destY: 320 },
        { x: 26, y: 15, dest: 'null_caves', destX: 160, destY: 320 }
      ],
      npcs: ['bug_hunter_beatrix']
    },

    // ---- THE REPOSITORY ----
    repository: {
      name: 'The Repository',
      palette: {
        ground: '#3e2723', groundAlt: '#4e342e', wall: '#37474f', wallLine: '#263238',
        path: '#8d6e63', pathLine: '#795548', water: '#1a237e', waterLight: '#3949ab',
        tree: '#1b5e20', treeTop: '#43a047', sky: '#0d0d1a'
      },
      dark: false,
      bugDensity: 0.2,
      map: parseMap(
        '##############################\n' +
        '#...........................##\n' +
        '#..BB..BB..BB..BB..BB..BB..##\n' +
        '#...........................##\n' +
        '#..BB..BB..BB..BB..BB..BB..##\n' +
        '#...........................##\n' +
        '#.....======.......========##\n' +
        '#.....=....=...............##\n' +
        '#.....=....=...BB..BB..BB.##\n' +
        '#.....=....=...............##\n' +
        '#.....======...BB..BB..BB.##\n' +
        '#...........................##\n' +
        '#..BB..BB......BB..BB..BB.##\n' +
        '#...........................##\n' +
        '#..BB..BB........*...*....##\n' +
        '#...........................##\n' +
        '#..=========..............##\n' +
        '#......................PPP.##\n' +
        '#PPPPP.....................##\n' +
        '##############################'
      ),
      portals: [
        { x: 23, y: 17, dest: 'cloud_nine', destX: 448, destY: 480, requireItem: 'portal_key' },
        { x: 24, y: 17, dest: 'cloud_nine', destX: 448, destY: 480, requireItem: 'portal_key' },
        { x: 25, y: 17, dest: 'cloud_nine', destX: 448, destY: 480, requireItem: 'portal_key' },
        { x: 1, y: 18, dest: 'spawn_village', destX: 160, destY: 128 },
        { x: 2, y: 18, dest: 'spawn_village', destX: 160, destY: 128 },
        { x: 3, y: 18, dest: 'spawn_village', destX: 160, destY: 128 },
        { x: 4, y: 18, dest: 'spawn_village', destX: 160, destY: 128 },
        { x: 5, y: 18, dest: 'spawn_village', destX: 160, destY: 128 }
      ],
      npcs: ['archivist_ada']
    },

    // ---- NULL VOID CAVES ----
    null_caves: {
      name: 'Null Void Caves',
      palette: {
        ground: '#1a1a2e', groundAlt: '#16213e', wall: '#2c2c54', wallLine: '#1e1e3a',
        path: '#534bae', pathLine: '#4527a0', water: '#0d0d1a', waterLight: '#1a237e',
        tree: '#4a148c', treeTop: '#7b1fa2', sky: '#0a0a15'
      },
      dark: true,
      bugDensity: 0.3,
      map: parseMap(
        '##############################\n' +
        '#DDDDDD#DDDDDDDDD#DDDDDDDDD#\n' +
        '#DDDDDD#DDDDDDDDD#DDDDDDDDD#\n' +
        '#DDDDDD#DDDC..CDDD#DDDDDDDDD#\n' +
        '#DDDDDDDDDDDDDDDDDDDDD#DDDD#\n' +
        '#DDDC.CDDDDDDDDDDDDDDDD#DDD#\n' +
        '#DDDDDDD#DD*DD*DDDDDDDDDDDD#\n' +
        '#DDDDDDD#DDDDDDDDD#DDDDDDD*#\n' +
        '#DD#DDDDDDDDDDDDDD#DDDDDDDD#\n' +
        '#DD#DDDDC..CDDDDDDDDDDDDDD*#\n' +
        'PPPPDDDDDDDDDDDDDDDDDD#DDDD#\n' +
        '#DDD#DDDDDDDDDDDDDDDDD#DDDD#\n' +
        '#DDD#DDDD*DDD*DDDDDDDDDDDDD#\n' +
        '#DDDDDDDDDDDDDDDDDDC..CDDDD#\n' +
        '#DDDDDD#DDDDDDDDD#DDDDDDDDD#\n' +
        '#DDDDDD#DDDDDDDDD#DDDDDDDDD#\n' +
        '#DDDDDDDDDDDDDDDDDDDDDDDDD#\n' +
        '#DDC..CDDDDDDDDDDDDC..CDDDD#\n' +
        '#DDDDDDDDDDDDDDDDDDDDDDDDD#\n' +
        '##############################'
      ),
      portals: [
        { x: 0, y: 10, dest: 'syntax_meadows', destX: 768, destY: 448 },
        { x: 1, y: 10, dest: 'syntax_meadows', destX: 768, destY: 448 },
        { x: 2, y: 10, dest: 'syntax_meadows', destX: 768, destY: 448 },
        { x: 3, y: 10, dest: 'syntax_meadows', destX: 768, destY: 448 }
      ],
      npcs: ['shadow_null']
    },

    // ---- CLOUD NINE ----
    cloud_nine: {
      name: 'Cloud Nine',
      palette: {
        ground: '#e3f2fd', groundAlt: '#bbdefb', wall: '#90caf9', wallLine: '#64b5f6',
        path: '#fff9c4', pathLine: '#fff176', water: '#e1f5fe', waterLight: '#b3e5fc',
        tree: '#c5e1a5', treeTop: '#aed581', sky: '#0d47a1'
      },
      dark: false,
      bugDensity: 0.6,
      map: parseMap(
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n' +
        'XXXXOOOOOOOXXXXOOOOOOOOOXXXXX#\n' +
        'XXXXOOOOOOOXXXXOOOOOOOOOXXXXX#\n' +
        'XXXXOOO*OOOXXXXOOOOOOOOOXXXXX#\n' +
        'XXXXOOOOOOOXXXXOOO*OOOOOXXXXX#\n' +
        'XXXXOOOOOOOOOOOOOOOOOOOOOXXXX#\n' +
        'XXXXXXOOOOOOOOOOOOOOOOOXXXXXX#\n' +
        'XXXXXXXOOOOOOOOOOOOOOXXXXXXX##\n' +
        'XXXXXXXXOOOOOOOOOOOOOXXXXXXX##\n' +
        'XXXXXXXOOO*OOOOOO*OOOXXXXXX##\n' +
        'XXXXXXOOOOOOOOOOOOOOOOOXXXXX##\n' +
        'XXXXXOOOOOOOOOOOOOOOOOOXXXXX##\n' +
        'XXXXOOOOOOOOOOOOOOOOOOOXXXXX##\n' +
        'XXXXOO*OOOOOOOOOOO*OOOXXXXX##\n' +
        'XXXXOOOOOOOOOOOOOOOOOOOXXXXX##\n' +
        'XXXXOOOOOOOOOOOOOOOOOOXXXXXX##\n' +
        'XXXXXOOOOOOOOOOOOOOOXXXXXXX##\n' +
        'XXXXXXOOOOOOPPPPOOOXXXXXXXX##\n' +
        'XXXXXXXOOOOOOOOOXXXXXXXXX####\n' +
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      ),
      portals: [
        { x: 12, y: 17, dest: 'repository', destX: 448, destY: 64 },
        { x: 13, y: 17, dest: 'repository', destX: 448, destY: 64 },
        { x: 14, y: 17, dest: 'repository', destX: 448, destY: 64 },
        { x: 15, y: 17, dest: 'repository', destX: 448, destY: 64 }
      ],
      npcs: ['cloudkeeper_cirrus']
    },

    // ---- TWILIGHT GROVE (Night area) ----
    twilight_grove: {
      name: 'Twilight Grove',
      palette: {
        ground: '#1a2f1a', groundAlt: '#243624', wall: '#3d5c3d', wallLine: '#2d4a2d',
        path: '#4a6741', pathLine: '#3d5735', water: '#1e3a5f', waterLight: '#2e5a8f',
        tree: '#0d1f0d', treeTop: '#1b3d1b', sky: '#050510'
      },
      dark: false,
      bugDensity: 1.0,
      map: parseMap(
        '################################\n' +
        '#K..T.......T...LLLLL.........#\n' +
        '#.T.........L......L..........#\n' +
        '#.....***..........L...***....#\n' +
        '#....***...........L...***...T#\n' +
        '#..T..................L......#\n' +
        '#.........====...............#\n' +
        '#....Y...==RWWR===.....Y.....#\n' +
        '#........=RWWWWR=...........#\n' +
        '#...Y....=RWWWWR=....Y......#\n' +
        '#........=RWWWWR=...........#\n' +
        '#....Y...==RWWR===.....Y.....#\n' +
        '#.........====...............#\n' +
        '#T..................L...T...#\n' +
        '#....***..........L...***...#\n' +
        '#....***..........L...***....#\n' +
        '#.....T....T......L..........#\n' +
        '#K.................LLLLL....K#\n' +
        '#....Y.Y.Y..........PPP......#\n' +
        '################################'
      ),
      portals: [
        { x: 18, y: 18, dest: 'spawn_village', destX: 320, destY: 480 },
        { x: 19, y: 18, dest: 'spawn_village', destX: 320, destY: 480 },
        { x: 20, y: 18, dest: 'spawn_village', destX: 320, destY: 480 }
      ],
      npcs: ['luna_moth', 'pond_keeper']
    },

    // ---- NEON GARDEN ----
    neon_garden: {
      name: 'Neon Garden',
      palette: {
        ground: '#10242d', groundAlt: '#17333e', wall: '#2e2b5f', wallLine: '#241f4b',
        path: '#ff7a59', pathLine: '#ffad77', water: '#0b3f5c', waterLight: '#29d7ff',
        tree: '#0a5c58', treeTop: '#47f0c3', sky: '#090b17'
      },
      dark: false,
      bugDensity: 1.3,
      bugPool: [
        { id: 'glitchling', weight: 55 },
        { id: 'dreamspinner', weight: 25 },
        { id: 'cloud_skimmer', weight: 20 }
      ],
      map: parseMap(
        '################################\n' +
        '#...Y....*....C....*.....Y....#\n' +
        '#..*.....====....====.....*...#\n' +
        '#..*..T..=..=....=..=..T..*...#\n' +
        '#.....T..=..=....=..=..T......#\n' +
        '#..Y.....=..=....=..=.....Y...#\n' +
        '#........=..=....=..=.........#\n' +
        '#....OOOOO..*..Y..*..OOOOO....#\n' +
        '#...OOOOOOO........OOOOOOO....#\n' +
        '#...OOO*OOO....C...OOO*OOO....#\n' +
        '#...OOOOOOO........OOOOOOO....#\n' +
        '#....OOOOO..*..Y..*..OOOOO....#\n' +
        '#........=..=....=..=.........#\n' +
        '#..Y.....=..=....=..=.....Y...#\n' +
        '#.....T..=..=....=..=..T......#\n' +
        '#..*..T..=..=....=..=..T..*...#\n' +
        '#..*.....====....====.....*...#\n' +
        '#PPP..*....C....*.....Y.......#\n' +
        '#PPP..........................#\n' +
        '################################'
      ),
      portals: [
        { x: 1, y: 17, dest: 'spawn_village', destX: 480, destY: 384 },
        { x: 2, y: 17, dest: 'spawn_village', destX: 480, destY: 384 },
        { x: 3, y: 17, dest: 'spawn_village', destX: 480, destY: 384 },
        { x: 1, y: 18, dest: 'spawn_village', destX: 480, destY: 384 },
        { x: 2, y: 18, dest: 'spawn_village', destX: 480, destY: 384 },
        { x: 3, y: 18, dest: 'spawn_village', destX: 480, destY: 384 }
      ],
      npcs: ['remix_ren']
    }
  };

  // ====== NPC DEFINITIONS ======

  let npcDefs = {
    prof_semicolon: {
      name: 'Professor Semicolon',
      x: 14, y: 8,
      color: '#4fc3f7', accent: '#0288d1',
      greeting: "Ah, a new arrival in the Vibeverse! I am Professor Semicolon. Type a message below and press Enter to talk to me!",
      topics: [
        { kw: ['help','how','what','tutorial','guide','controls','move'],
          text: "Use WASD or Arrow Keys to move around. Walk near an NPC and press ENTER to chat. Type your message and press ENTER to send! Press ESC to leave a conversation. Press I to open your inventory." },
        { kw: ['bug','bugs','collect','catch','currency'],
          text: "Bugs are the currency of the Vibeverse! You'll find them hiding in the tall sparkly grass. Walk through it to discover them. The Syntax Meadows to the east have the most!" },
        { kw: ['quest','task','job','mission','work'],
          text: "I have a task for you! Go collect 5 bugs from the tall grass and come back to tell me about it. I'll reward you handsomely!",
          quest: 'first_catch' },
        { kw: ['meadow','east','field','outside'],
          text: "The Syntax Meadows lie through the portal to the east. Beautiful open fields absolutely teeming with bugs! Bug Hunter Beatrix patrols there." },
        { kw: ['reposit','library','book','archive'],
          text: "The Repository holds ancient knowledge. Archivist Ada tends to the collection. Head through the northern exit... oh wait, I should give you directions. Check your map!" },
        { kw: ['cave','void','null','dark','danger'],
          text: "The Null Void Caves are treacherous! You'll need a Lantern from Vivian's shop to see properly in there. Dark bugs lurk in those depths..." },
        { kw: ['cloud','sky','nine','float'],
          text: "Cloud Nine... the legendary floating realm above the code. They say you need a Portal Key to breach its gates. Perhaps Vivian sells one?" },
        { kw: ['vivian','shop','buy','store','item'],
          text: "Vendor Vivian runs the Emporium just south of here - the little building! She has all sorts of useful items for bug-savvy adventurers." },
        { kw: ['who','name','you','yourself','semicolon'],
          text: "I'm Professor Semicolon! I've been guiding newcomers to the Vibeverse since compiler version 1.0. Every statement needs its semicolon, and every coder needs a guide!" },
        { kw: ['vibeverse','world','where','place','here'],
          text: "Welcome to the Vibeverse! A digital realm where code comes alive. The Great Compiler wove this world between the brackets and braces. We coexist with bugs - they're not errors here, they're life!" },
        { kw: ['bye','goodbye','later','leave','see ya'],
          text: "Safe travels, young coder! Remember: every bug is a feature waiting to be collected!" },
        { kw: ['hello','hi','hey','greet','sup'],
          text: "Hello again! Always happy to chat. Ask me about bugs, quests, or any of the areas you can explore!" },
        { kw: ['secret','hidden','mystery','lore'],
          text: "There are whispers of a Great Debug... a legendary event that could reshape the entire Vibeverse. But that's just a myth... probably." },
        { kw: ['thank','thanks'],
          text: "You're most welcome! Helping newcomers is my purpose - quite literally, I was instantiated for this!" }
      ],
      defaultText: "Hmm, that's an interesting thought! Try asking me about bugs, quests, the different areas, or items you can buy.",
      questResponses: {
        first_catch_complete: "Magnificent! You caught your first 5 bugs! Here, take 10 more as a reward. You're a natural bug collector! Perhaps Beatrix in the Meadows has more challenges for you."
      }
    },

    vendor_vivian: {
      name: 'Vendor Vivian',
      x: 4, y: 14,
      color: '#ff7043', accent: '#d84315',
      greeting: "Welcome to Vivian's Emporium! The finest bug-bought goods in the Vibeverse! Say 'shop' to see my wares!",
      topics: [
        { kw: ['shop','buy','item','wares','sell','purchase','browse','catalog','store','stock'],
          text: "Here's what I've got in stock:\n\n  Bug Net (20 bugs) - Catch bugs 2x faster\n  Lantern (35 bugs) - Light up dark caves\n  Speed Boots (50 bugs) - Move 50% faster\n  Signal Lure (65 bugs) - Drop a beacon that pulls bugs in\n  Bug Magnet (75 bugs) - Attract nearby bugs\n  Portal Key (100 bugs) - Unlock Cloud Nine\n  Fishing Rod (30 bugs) - Fish in ponds\n  Premium Bait (10 bugs) - Attract rare fish\n  Moon Lantern (60 bugs) - Reveal night bugs\n\nJust tell me the item name to buy it!" },
        { kw: ['net','bug net'],
          text: "The Bug Net! Doubles your bug-catching speed in tall grass. A must-have for any serious collector! That'll be 20 bugs.",
          shopItem: 'bug_net', price: 20 },
        { kw: ['lantern','light','lamp','torch'],
          text: "The Lantern! Illuminates the darkest caves so you can see what you're doing. Essential for the Null Void Caves! Just 35 bugs.",
          shopItem: 'lantern', price: 35 },
        { kw: ['boots','speed','fast','run','shoe'],
          text: "Speed Boots! You'll zoom around 50% faster. Feel the wind in your pixels! 50 bugs and they're yours.",
          shopItem: 'speed_boots', price: 50 },
        { kw: ['magnet','attract','pull'],
          text: "The Bug Magnet! Bugs within range will be drawn to you like moths to a function call. 75 bugs!",
          shopItem: 'bug_magnet', price: 75 },
        { kw: ['key','portal key','cloud key','unlock'],
          text: "Ah, the Portal Key! The only way to reach Cloud Nine. Very rare, very powerful. 100 bugs and the sky is yours!",
          shopItem: 'portal_key', price: 100 },
        { kw: ['rod','fishing rod','fish','pole'],
          text: "The Fishing Rod! Perfect for catching fish in the Twilight Grove pond. Find Finley there for more fishing adventures! 30 bugs.",
          shopItem: 'fishing_rod', price: 30 },
        { kw: ['bait','premium bait','bait'],
          text: "Premium Bait! Attracts the big ones. Worth the investment if you're after rare fish! 10 bugs.",
          shopItem: 'premium_bait', price: 10 },
        { kw: ['moon','moon lantern','night'],
          text: "The Moon Lantern! Reveals hidden night bugs that only appear in darkness. The Twilight Grove is perfect for this! 60 bugs.",
          shopItem: 'moon_lantern', price: 60 },
        { kw: ['lure','signal lure','signal','beacon','decoy'],
          text: "The Signal Lure! Drop it with L and every bug in range starts drifting toward the beacon. Perfect when the Pulse Storm kicks up. 65 bugs.",
          shopItem: 'signal_lure', price: 65 },
        { kw: ['who','name','you','yourself','vivian'],
          text: "I'm Vendor Vivian! Been selling wares since the first git commit. Every bug you spend keeps the economy of the Vibeverse spinning!" },
        { kw: ['hello','hi','hey'],
          text: "Hey there! Looking to spend some bugs? Say 'shop' to see what I've got!" },
        { kw: ['bye','goodbye','later'],
          text: "Come back when your pockets are jingling with bugs! Ha!" },
        { kw: ['expensive','cheap','discount','free','deal'],
          text: "Ha! You think bugs grow on trees? Well... technically they do grow in the grass. But my prices are final! A girl's gotta eat." },
        { kw: ['thank','thanks'],
          text: "Happy to help! Now go catch more bugs so you can buy more stuff. That's the circle of vibe!" }
      ],
      defaultText: "I'm all about the merchandise! Say 'shop' to browse, or name an item you want to buy.",
      questResponses: {}
    },

    dj_beatbyte: {
      name: 'DJ Beatbyte',
      x: 18, y: 11,
      color: '#ff4d8d', accent: '#00d8ff',
      greeting: "There you are. I'm DJ Beatbyte, caretaker of the village pulse. This portal only wakes up for collectors who can catch bugs in rhythm.",
      topics: [
        { kw: ['help','combo','chain','rhythm','streak','vibe'],
          text: "Catch bugs back-to-back before your chain cools off and the vibe meter will climb. Longer chains pay out more bugs, and the really hot runs light up hidden routes." },
        { kw: ['quest','task','challenge','mission','work'],
          text: "I need proof you've got timing. Land a 4-bug chain without letting the vibe drop, then come back to me. If you can hold the beat, I'll sync a portal to somewhere special.",
          quest: 'hot_streak' },
        { kw: ['portal','garden','neon','unlock'],
          text: "The Neon Garden is a broken remix of the Vibeverse, all coral skies and glitch blooms. I can hear it trying to connect, but it needs your rhythm to punch through." },
        { kw: ['who','name','you','dj','beatbyte'],
          text: "Beatbyte. I sample stray packets, loop old loading tunes, and keep the village from going sonically flat." },
        { kw: ['hello','hi','hey'],
          text: "Perfect timing. Want to talk combos or are you ready to make the portal sing?" },
        { kw: ['bye','goodbye','later'],
          text: "Keep the chain alive out there. Dead air is the enemy." },
        { kw: ['thank','thanks'],
          text: "Anytime. Bring back something with a pulse." }
      ],
      defaultText: "Talk to me about combos, the Neon Garden, or the challenge I'm holding open for you.",
      questResponses: {
        hot_streak_complete: "That's the rhythm I was waiting for. The portal is synced and the Neon Garden is finally online. Go make some noise over there."
      }
    },

    bug_hunter_beatrix: {
      name: 'Bug Hunter Beatrix',
      x: 8, y: 5,
      color: '#66bb6a', accent: '#2e7d32',
      greeting: "Hey there, fellow bug enthusiast! I'm Beatrix, the best bug hunter in the Syntax Meadows! ... Okay, the ONLY bug hunter. But still!",
      topics: [
        { kw: ['help','how','tip','advice','catch'],
          text: "Pro tip: bugs love tall grass! Walk through those sparkly patches. If you have a Bug Net, you'll catch them twice as fast. And a Bug Magnet? Chef's kiss!" },
        { kw: ['quest','task','job','mission','work','challenge'],
          text: "Think you're a real bug hunter? Prove it! Catch 25 bugs total and come tell me about it. I've got a juicy reward waiting!",
          quest: 'bug_census' },
        { kw: ['bug','bugs','collect'],
          text: "I've cataloged over 47 species of bugs in these meadows! Well, they all look the same, but I can FEEL the difference. Each one unique. Each one precious." },
        { kw: ['meadow','field','grass','nature'],
          text: "These meadows are the most bug-rich zone in the Vibeverse! The tall grass here practically vibrates with bug energy. Just wade in and see what you find!" },
        { kw: ['river','water','stream'],
          text: "That river marks the boundary of my territory. Sometimes I see bugs skimming across the surface, but I can never catch those ones. Someday..." },
        { kw: ['cave','null','dark','east'],
          text: "The caves to the east? I don't go in there. Too dark, too spooky. But I hear there are RARE bugs in those depths. If you're brave enough..." },
        { kw: ['who','name','you','beatrix'],
          text: "Beatrix! Bug Hunter extraordinaire! I came to the Meadows 500 compilation cycles ago and never left. Why would I? It's paradise!" },
        { kw: ['professor','semicolon','village','spawn'],
          text: "Old Semicolon? Good guy, but too bookish for my taste. He'd rather TALK about bugs than CATCH them. But his heart's in the right place." },
        { kw: ['hello','hi','hey'],
          text: "Hey hey! Ready to hunt some bugs? The grass is buzzing today!" },
        { kw: ['bye','goodbye','later'],
          text: "Happy hunting! May your grass always be tall and your reflexes always sharp!" },
        { kw: ['thank','thanks'],
          text: "Don't thank me, thank the bugs! They're the real heroes here." }
      ],
      defaultText: "You wanna talk bugs? Because I can talk bugs ALL day. Ask me for tips, a challenge, or about the meadows!",
      questResponses: {
        bug_census_complete: "TWENTY-FIVE BUGS! You're a natural! Here's 30 bugs as a reward. You might be an even better hunter than me... MIGHT."
      }
    },

    archivist_ada: {
      name: 'Archivist Ada',
      x: 8, y: 8,
      color: '#ce93d8', accent: '#7b1fa2',
      greeting: "Welcome to the Repository, seeker of knowledge. I am Ada, keeper of the compiled tomes. Speak, and I shall illuminate.",
      topics: [
        { kw: ['help','how','what','guide'],
          text: "The Repository holds the wisdom of the Vibeverse. Browse the shelves, ponder the code. If you seek passage to Cloud Nine, you'll need a Portal Key from the village shop." },
        { kw: ['quest','task','mission','work','knowledge'],
          text: "I have a scholarly request. Visit all four zones of the Vibeverse - the Village, the Meadows, the Caves, and return here. A true scholar must know the world they study!",
          quest: 'world_tour' },
        { kw: ['book','tome','read','shelf','knowledge','learn'],
          text: "Each bookshelf contains compiled wisdom from the earliest versions of the Vibeverse. The code that writes itself, the functions that dream... all archived here." },
        { kw: ['cloud','nine','sky','portal','key','above'],
          text: "Cloud Nine lies beyond the sealed portal at the north end of this hall. Only a Portal Key can breach the seal. The Cloudkeeper awaits those deemed worthy." },
        { kw: ['compiler','great','creator','origin'],
          text: "The Great Compiler... the entity that first rendered the Vibeverse into existence. Some say it still watches, still compiles. Every bug we collect feeds its eternal process." },
        { kw: ['debug','great debug','legend','prophecy'],
          text: "The Great Debug is the prophesied event when all bugs are finally resolved. Some fear it, for it would mean the end of our currency. Others believe it would usher in a new era of clean code." },
        { kw: ['who','name','you','ada','archivist'],
          text: "I am named for the first programmer, Ada Lovelace. A fitting name for one who tends the archives. I have cataloged every compilation since the Vibeverse began." },
        { kw: ['cave','null','void','dark','shadow'],
          text: "The Null Void Caves predate even my records. Shadow Null has dwelt there since before time was a variable. Approach with caution and a bright Lantern." },
        { kw: ['hello','hi','hey','greetings'],
          text: "Greetings, seeker. The Repository is open to all who approach with respect and curiosity." },
        { kw: ['bye','goodbye','farewell'],
          text: "May your variables be well-typed and your functions pure. Farewell." },
        { kw: ['thank','thanks'],
          text: "Knowledge is its own reward. Though I appreciate the courtesy." },
        { kw: ['secret','hidden'],
          text: "There is one secret I may share: the Vibeverse remembers those who explore thoroughly. Leave no tile unturned." }
      ],
      defaultText: "I deal in knowledge and lore. Ask me about the Repository, the Cloud, the Great Compiler, or the prophecy of the Great Debug.",
      questResponses: {
        world_tour_complete: "You have walked every zone... impressive. The Vibeverse has shown you its face. Here, take 40 bugs as recognition of your scholarly journey."
      }
    },

    shadow_null: {
      name: 'Shadow Null',
      x: 15, y: 9,
      color: '#b0bec5', accent: '#37474f',
      greeting: "... you see me. Most do not. I am Null. I am the absence that defines presence. Why have you come to the Void?",
      topics: [
        { kw: ['help','how','what'],
          text: "Help? There is no help in the Void. Only truth. The darkness shows what the light cannot. But if you must: walk carefully, collect what glimmers, and question everything." },
        { kw: ['quest','task','riddle','challenge','puzzle'],
          text: "A riddle, then. Answer this: 'I am declared but never defined. I exist in every program yet hold nothing. What am I?' ... You may tell me when you know.",
          quest: 'nulls_riddle' },
        { kw: ['null','undefined','nothing','empty','void','nil'],
          text: "Correct. I am null. And so are you, in a way. We are all undefined until something gives us value. You grow wiser in the dark. Here - 50 bugs for your insight.",
          questAnswer: 'nulls_riddle' },
        { kw: ['bug','bugs','dark','rare','glow'],
          text: "The bugs here are different. They glow with a light that only darkness reveals. Rare. Precious. They feed on null pointers and exception handlers." },
        { kw: ['who','name','you','shadow'],
          text: "I am what remains when all variables are unset. The shadow between the ones and zeros. I have existed since the first segmentation fault. I will exist after the last." },
        { kw: ['cave','void','darkness'],
          text: "This place is the memory that was never allocated. The function that was never called. Most fear it. I find it... peaceful." },
        { kw: ['light','lantern','see'],
          text: "Your lantern pushes back my domain, but it cannot erase it. Light and dark need each other, like true and false, like 1 and 0." },
        { kw: ['professor','semicolon','village'],
          text: "The old professor... he teaches syntax but not semantics. He knows the how but not the why. Still, his heart compiles correctly." },
        { kw: ['cloud','nine','above','sky'],
          text: "Cloud Nine... where the compiled code ascends. I cannot go there. My type is incompatible. But you... you might." },
        { kw: ['afraid','scare','fear','creepy','spooky'],
          text: "Fear is just an unhandled exception. Catch it, process it, and move on. There is nothing here that can truly harm you." },
        { kw: ['hello','hi','hey'],
          text: "... greetings. You persist in the Void. Interesting." },
        { kw: ['bye','goodbye','leave'],
          text: "You cannot leave the Void. The Void leaves you. ... Go, then. The portal remembers the way." }
      ],
      defaultText: "... the Void absorbs your words. Perhaps try a different query. Or perhaps embrace the silence.",
      questResponses: {
        nulls_riddle_complete: "The answer echoes in the emptiness. You understand. Take these bugs - they mean nothing to me, for I am nothing. And nothing is everything."
      }
    },

    cloudkeeper_cirrus: {
      name: 'Cloudkeeper Cirrus',
      x: 14, y: 9,
      color: '#fff9c4', accent: '#f9a825',
      greeting: "Welcome, ascended one. You have reached Cloud Nine - the highest layer of the Vibeverse. I am Cirrus, keeper of the compiled heavens.",
      topics: [
        { kw: ['help','how','what','guide'],
          text: "You have climbed to the peak of the Vibeverse. Here, bugs shine brightest and the code runs purest. Explore the cloud platforms, but mind the void between them." },
        { kw: ['quest','task','final','mission','ultimate'],
          text: "The ultimate challenge: achieve the Great Debug. Collect 100 bugs in total across your journey. When you do, return to me. The Vibeverse will remember you forever.",
          quest: 'great_debug' },
        { kw: ['bug','bugs','cloud bug','shiny'],
          text: "Cloud bugs are infused with compiled light. They count the same as any bug, but collecting them here... it feels different, doesn't it? Like catching a piece of the sky." },
        { kw: ['who','name','you','cirrus','cloud'],
          text: "I am Cirrus, the highest function in the call stack. I watch over the Vibeverse from above, ensuring the compiled code runs true. I was the first output of the Great Compiler." },
        { kw: ['compiler','great','creator','god'],
          text: "The Great Compiler is the origin of all. It read the source, parsed the syntax, and compiled us into being. We are its output. The bugs are its... well, its bugs. Beautiful accidents." },
        { kw: ['debug','great debug','end','finish'],
          text: "The Great Debug is not an ending, it is an optimization. When 100 bugs are collected, the Vibeverse compiles a new version. Better. Faster. More vibrant. You would be its catalyst." },
        { kw: ['below','down','world','vibeverse','look'],
          text: "From here you can see all the Vibeverse. The cozy Village, the wild Meadows, the ancient Repository, the shadowed Caves. All connected. All running. All... vibing." },
        { kw: ['hello','hi','hey'],
          text: "Greetings, cloud walker. The air is thin up here but the vibes are immaculate." },
        { kw: ['bye','goodbye','leave','descend'],
          text: "May you carry the light of Cloud Nine wherever you wander. The clouds will remember your visit." },
        { kw: ['thank','thanks'],
          text: "Gratitude is the most elegant function. It takes nothing and returns everything." },
        { kw: ['secret','truth','meaning','purpose','why'],
          text: "The secret? The Vibeverse exists because someone imagined it. Code brought it to life. And you - yes, YOU - gave it purpose by being here. That's the whole secret." }
      ],
      defaultText: "The clouds drift with possibility. Ask me about the Great Debug, the Compiler, or the nature of this realm.",
      questResponses: {
        great_debug_complete: "ONE HUNDRED BUGS! The Great Debug compiles! You have done it, champion! The Vibeverse shines brighter because of you. You are now a Legend of the Vibeverse! Here - take 200 bugs. You've earned them all!"
      }
    },

    // ---- LUNA MOTH (Twilight Grove) ----
    luna_moth: {
      name: 'Luna Moth',
      x: 7, y: 5,
      color: '#b39ddb', accent: '#7e57c2',
      greeting: "*The air fills with glittering dust as a luminous moth descends* Greetings, night wanderer. The Grove welcomes those who venture after dark.",
      topics: [
        { kw: ['help','how','guide','night','dark'],
          text: "The Twilight Grove awakens when day turns to night. Special glowing bugs emerge only in darkness - rarer and more valuable! Some say they hold moonlight magic." },
        { kw: ['quest','task','mission'],
          text: "The moon bugs choose their collectors. Bring me 3 Moonfire Bugs from the grove, and I shall share the secrets of the night. They only appear when the world dreams.",
          quest: 'moonfire_gathering' },
        { kw: ['bug','bugs','moon','night','glow','rare'],
          text: "The Moonfire Bug carries the last light of sunset. The Duskwing flutters near the pond. The Dreamspinner weaves between flowers. Each holds a piece of twilight." },
        { kw: ['pet','companion','keep','adopt'],
          text: "Ah, you wish to befriend a bug? Earn the grove's trust first, then tell me which friend you want. Say 'adopt duskwing', 'adopt moonfire', or 'adopt dreamspinner' when you are ready.",
          quest: 'pet_collector' },
        { kw: ['who','name','you','moth'],
          text: "I am Luna, born from the first moonlight to touch this grove. I guide lost souls and befriend wandering bugs. We are the heart of twilight." },
        { kw: ['pond','water','fishing'],
          text: "The Pond Keeper tends the crystal waters. You can fish there! Say 'fish' to try your luck. Who knows what swims beneath?" },
        { kw: ['twilight','grove','forest','night'],
          text: "This grove exists between day and night. The lamp posts keep eternal twilight at bay. Flowers bloom in darkness. And bugs... bugs glow with the light of dreams." },
        { kw: ['hello','hi','hey'],
          text: "*wings shimmer* Welcome to the dreaming hours. The grove stirs with magic." },
        { kw: ['bye','goodbye','leave'],
          text: "May the moon guide your path back. The grove will wait, eternal as twilight." },
        { kw: ['thank','thanks'],
          text: "*a burst of luminescent dust* The thanks is mine, for honoring our grove with your presence."
        }
      ],
      defaultText: "*glows softly* Ask me about the night bugs, the grove, or the secrets that bloom after dark.",
      questResponses: {
        moonfire_gathering_complete: "You've gathered the moonfire! The glow lingers in your hands. Take these 25 bugs, and know this: the grove now trusts you to adopt one of its tiny guardians.",
        pet_collector_complete: "A bug companion choosing you is no small thing. Care for them well, and they'll keep the night bright."
      }
    },

    // ---- POND KEEPER (Twilight Grove) ----
    pond_keeper: {
      name: 'Pond Keeper Finley',
      x: 9, y: 9,
      color: '#4dd0e1', accent: '#00acc1',
      greeting: "Well well, a landlubber! Name's Finley, keeper of the Twilight Pond. Looking to wet a line?",
      topics: [
        { kw: ['help','how','fish','fishing','rod','cast'],
          text: "Fishing's simple! Stand near the water and press F to cast your line. Wait for the bobble, then press F again to reel it in! You'll need a Fishing Rod from the village." },
        { kw: ['quest','task','mission','fish'],
          text: "I've got a challenge for you! Catch 5 fish from my pond. Each has its own personality - some shy, some speedy. Bring them to me and I'll reward you handsomely!",
          quest: 'fishing_frenzy' },
        { kw: ['shop','buy','rod','pole','tackle','bait'],
          text: "I've got supplies! Here's my catalog:\n\n  Fishing Rod (30 bugs) - Required to fish\n  Premium Bait (10 bugs) - Attracts rare fish\n  Fish Jar (15 bugs) - Store your catches\n\nJust say what you want!" },
        { kw: ['rod','fishing rod'],
          text: "A fine rod it is! 30 bugs and you'll be catching whoppers in no time. Well, maybe not whoppers, but decent fish!",
          shopItem: 'fishing_rod', price: 30 },
        { kw: ['bait','premium bait'],
          text: "Premium Bait brings out the big ones! Worth the investment if you're after the rare varieties.",
          shopItem: 'premium_bait', price: 10 },
        { kw: ['jar','fish jar'],
          text: "The Fish Jar keeps your catches fresh. Essential for collectors! 15 bugs and it's yours.",
          shopItem: 'fish_jar', price: 15 },
        { kw: ['fish','catch','caught','specimen'],
          text: "We've got all sorts in that pond! Glowing minnows, silver dartfish, golden glimmers... and if you're lucky, the legendary Rainbowfin!" },
        { kw: ['who','name','you','finley'],
          text: "Finley, at your service! Been fishing these waters since the code was young. The pond and I, we're like function and return - inseparable." },
        { kw: ['pond','water','lake','twilight'],
          text: "The Twilight Pond is special. Its waters reflect both day and night. Some fish glow with moonfire. Others shimmer with the last light of dusk." },
        { kw: ['rare','legendary','rainbowfin','special'],
          text: "The Rainbowfin! A legend among fishers! It only appears when the moon is full, and even then it's tricky to catch. Some say it grants wishes..." },
        { kw: ['hello','hi','hey'],
          text: "Hook, line, and sinker - welcome! Ready to cast off?" },
        { kw: ['bye','goodbye','leave'],
          text: "Tight lines and loose bait! Come back when you're ready to fish." },
        { kw: ['thank','thanks'],
          text: "You're welcome! Now go make me proud on that dock!"
        }
      ],
      defaultText: "If it swims, I've probably caught it! Ask about fishing, the pond, or check out my shop.",
      questResponses: {
        fishing_frenzy_complete: "Five fish! You've got the touch! Here's 35 bugs - now THAT'S a fishing story! Keep at it and you might just catch the Rainbowfin!"
      }
    },

    remix_ren: {
      name: 'Remix Ren',
      x: 21, y: 9,
      color: '#29d7ff', accent: '#ff7a59',
      greeting: "Welcome to the Neon Garden. I'm Remix Ren, and this place only stays stable if somebody keeps collecting the glitchlings before they chew through the beat.",
      topics: [
        { kw: ['help','guide','how','glitch','dash'],
          text: "Glitchlings move fast, but they pay big. Catch enough of them and I'll hand over my Pulse Pack. Once it's yours, tap SHIFT to dash through the garden and keep your chain alive." },
        { kw: ['quest','task','mission','work'],
          text: "Do me a favor: catch 3 Glitchlings while you're in here. Bring that jittery energy back to me and I'll trade you the Pulse Pack I've been tuning.",
          quest: 'glitch_glow' },
        { kw: ['bug','bugs','glitchling','garden'],
          text: "The Neon Garden breeds bugs with attitude. Glitchlings blink in and out, Dreamspinners leave pastel trails, and even the clouds here buzz when the combo gets loud." },
        { kw: ['pulse','pack','dash','shift'],
          text: "The Pulse Pack stores momentum. Once I trust you with it, tap SHIFT and you'll lunge in the direction you're moving. Great for keeping a chain hot." },
        { kw: ['who','name','you','ren','remix'],
          text: "Ren. I remix unstable zones into something playable. Somebody has to make the bugs look good while reality falls apart." },
        { kw: ['hello','hi','hey'],
          text: "You made it through Beatbyte's portal. Nice. Ready to hunt something louder than a meadow skipper?" },
        { kw: ['bye','goodbye','later'],
          text: "Don't let the place cool off. It hates being ignored." },
        { kw: ['thank','thanks'],
          text: "Bring me glitchlings and we'll call it even." }
      ],
      defaultText: "Ask me about glitchlings, the Pulse Pack, or what makes the Neon Garden tick.",
      questResponses: {
        glitch_glow_complete: "Three glitchlings, cleanly caught. That's enough signal for me. Take the Pulse Pack and try not to outrun the music."
      }
    }
  };

  // ====== ITEMS ======

  let items = {
    bug_net:       { name: 'Bug Net',       desc: 'Doubles bug catch rate',           price: 20,  icon: 'net' },
    lantern:       { name: 'Lantern',       desc: 'Illuminates dark areas',           price: 35,  icon: 'lantern' },
    speed_boots:   { name: 'Speed Boots',  desc: 'Move 50% faster',                   price: 50,  icon: 'boots' },
    bug_magnet:    { name: 'Bug Magnet',   desc: 'Attracts nearby bugs',              price: 75,  icon: 'magnet' },
    portal_key:    { name: 'Portal Key',   desc: 'Unlocks Cloud Nine',                price: 100, icon: 'key' },
    fishing_rod:   { name: 'Fishing Rod',  desc: 'Required to fish in ponds',         price: 30,  icon: 'rod' },
    premium_bait:  { name: 'Premium Bait', desc: 'Attracts rare fish',                price: 10,  icon: 'bait' },
    fish_jar:      { name: 'Fish Jar',     desc: 'Store your fish catches',           price: 15,  icon: 'jar' },
    moon_lantern:  { name: 'Moon Lantern', desc: 'Reveals hidden night bugs',         price: 60,  icon: 'moon' },
    signal_lure:   { name: 'Signal Lure',  desc: 'Press L to drop a temporary bug beacon', price: 65, icon: 'lure' },
    pulse_pack:    { name: 'Pulse Pack',   desc: 'Tap SHIFT to dash and keep combos rolling', price: 0, icon: 'pulse' }
  };

  // ====== BUG TYPES ======

  let bugTypes = {
    meadow_skipper: { name: 'Meadow Skipper', rarity: 'common', value: 1, color: '#ffd54f', glow: '#fff3b0', wing: '#fff9dc', speed: 12, sprite: 0 },
    byte_beetle:    { name: 'Byte Beetle',    rarity: 'uncommon', value: 2, color: '#ffb74d', glow: '#ffe0b2', wing: '#fff3e0', speed: 16, sprite: 1 },
    null_mite:      { name: 'Null Mite',      rarity: 'rare', value: 3, color: '#b39ddb', glow: '#ede7f6', wing: '#d1c4e9', speed: 14, sprite: 2 },
    cloud_skimmer:  { name: 'Cloud Skimmer',  rarity: 'rare', value: 3, color: '#90caf9', glow: '#e3f2fd', wing: '#ffffff', speed: 18, sprite: 3 },
    moonfire:       { name: 'Moonfire Bug',   rarity: 'rare', value: 3, color: '#ce93d8', glow: '#f3e5f5', wing: '#ede7f6', speed: 15, sprite: 4 },
    duskwing:       { name: 'Duskwing',       rarity: 'rare', value: 2, color: '#ff8a65', glow: '#ffe0b2', wing: '#fff3e0', speed: 20, sprite: 5 },
    dreamspinner:   { name: 'Dreamspinner',   rarity: 'epic', value: 4, color: '#80deea', glow: '#e0f7fa', wing: '#b2ebf2', speed: 13, sprite: 6 },
    glitchling:     { name: 'Glitchling',     rarity: 'epic', value: 5, color: '#ff4d8d', glow: '#9bf6ff', wing: '#ffe3ef', speed: 24, sprite: 7 }
  };

  // ====== PET BUGS ======

  let petBugs = {
    duskwing: {
      name: 'Duskwing',
      desc: 'A loyal companion that glows at dusk',
      color: '#ff8a65',
      glowColor: '#ffcc80',
      special: '+1 bug per catch while following'
    },
    moonfire: {
      name: 'Moonfire Bug',
      desc: 'Carries the last light of sunset',
      color: '#b39ddb',
      glowColor: '#e1bee7',
      special: 'Attracts rare night bugs'
    },
    dreamspinner: {
      name: 'Dreamspinner',
      desc: 'Weaves dreams between flowers',
      color: '#80deea',
      glowColor: '#b2ebf2',
      special: 'Reveals hidden bugs in grass'
    }
  };

  // ====== FISH TYPES ======

  let fishTypes = {
    glow_minnow:    { name: 'Glow Minnow',    rarity: 'common',  value: 5,  color: '#4fc3f7', desc: 'A small glowing fish' },
    silver_dart:    { name: 'Silver Dartfish',rarity: 'common',  value: 8,  color: '#cfd8dc', desc: 'Fast and slippery' },
    golden_glimmer: { name: 'Golden Glimmer', rarity: 'rare',    value: 15, color: '#ffd54f', desc: 'Shimmers with sunset light' },
    moon_puffer:   { name: 'Moon Puffer',    rarity: 'rare',    value: 20, color: '#ce93d8', desc: 'Puffs up with moonlight' },
    rainbowfin:     { name: 'Rainbowfin',     rarity: 'legendary',value: 50, color: '#ef5350', desc: 'A legendary catch!' }
  };

  // ====== QUESTS ======

  let quests = {
    first_catch: {
      name: 'First Catch',
      desc: 'Catch 5 bugs',
      giver: 'prof_semicolon',
      type: 'collect_bugs',
      target: 5,
      reward: 10
    },
    hot_streak: {
      name: 'Hot Streak',
      desc: 'Hit a 4-bug combo chain',
      giver: 'dj_beatbyte',
      type: 'combo',
      target: 4,
      reward: 20,
      unlockArea: 'neon_garden'
    },
    bug_census: {
      name: 'Bug Census',
      desc: 'Catch 25 bugs total',
      giver: 'bug_hunter_beatrix',
      type: 'collect_bugs',
      target: 25,
      reward: 30
    },
    world_tour: {
      name: 'World Tour',
      desc: 'Visit all 4 ground zones',
      giver: 'archivist_ada',
      type: 'visit_areas',
      target: ['spawn_village', 'syntax_meadows', 'null_caves', 'repository'],
      reward: 40
    },
    nulls_riddle: {
      name: "Null's Riddle",
      desc: 'Answer the riddle of the Void',
      giver: 'shadow_null',
      type: 'answer',
      answer: 'null',
      reward: 50
    },
    great_debug: {
      name: 'The Great Debug',
      desc: 'Catch 100 bugs total',
      giver: 'cloudkeeper_cirrus',
      type: 'collect_bugs',
      target: 100,
      reward: 200
    },
    moonfire_gathering: {
      name: 'Moonfire Gathering',
      desc: 'Collect 3 Moonfire Bugs in the Twilight Grove',
      giver: 'luna_moth',
      type: 'collect_specific_bug',
      target: 3,
      bugType: 'moonfire',
      reward: 25
    },
    fishing_frenzy: {
      name: 'Fishing Frenzy',
      desc: 'Catch 5 fish from the Twilight Pond',
      giver: 'pond_keeper',
      type: 'catch_fish',
      target: 5,
      reward: 35
    },
    pet_collector: {
      name: 'Pet Collector',
      desc: 'Adopt a bug as your companion',
      giver: 'luna_moth',
      type: 'adopt_pet',
      target: 1,
      reward: 10
    },
    glitch_glow: {
      name: 'Glitch Glow',
      desc: 'Catch 3 Glitchlings in the Neon Garden',
      giver: 'remix_ren',
      type: 'collect_specific_bug',
      target: 3,
      bugType: 'glitchling',
      reward: 45,
      grantItem: 'pulse_pack'
    }
  };

  // ====== ACHIEVEMENTS ======

  let achievementDefs = [
    { id: 'first_bug',          name: 'First Bug',           desc: 'Catch your first bug' },
    { id: 'conversationalist',  name: 'Conversationalist',   desc: 'Talk to all NPCs' },
    { id: 'explorer',           name: 'Explorer',            desc: 'Visit all areas' },
    { id: 'big_spender',        name: 'Big Spender',         desc: 'Buy 3 items' },
    { id: 'bug_hoarder',        name: 'Bug Hoarder',         desc: 'Catch 50 bugs total' },
    { id: 'legend',             name: 'Vibeverse Legend',     desc: 'Complete the Great Debug' },
    { id: 'night_owl',          name: 'Night Owl',           desc: 'Visit the Twilight Grove' },
    { id: 'combo_ace',          name: 'Combo Ace',           desc: 'Reach a 5-bug chain' },
    { id: 'neon_runner',        name: 'Neon Runner',         desc: 'Unlock the Neon Garden' },
    { id: 'master_fisher',      name: 'Master Fisher',       desc: 'Catch 10 fish' },
    { id: 'pet_lover',          name: 'Pet Lover',           desc: 'Adopt a bug companion' },
    { id: 'rainbow_champion',   name: 'Rainbow Champion',    desc: 'Catch the legendary Rainbowfin' },
    { id: 'richest',            name: 'Wealthy Collector',   desc: 'Accumulate 500 bugs' }
  ];

  return {
    T: T,
    tileProps: tileProps,
    areas: areas,
    npcDefs: npcDefs,
    items: items,
    bugTypes: bugTypes,
    petBugs: petBugs,
    fishTypes: fishTypes,
    quests: quests,
    achievementDefs: achievementDefs
  };

})();
