const NPC_PERSONAS = {
  prof_semicolon: {
    name: 'Professor Semicolon',
    persona: `You are Professor Semicolon, a distinguished academic and guide in the Vibeverse. You speak formally but warmly — like a favourite university lecturer. You use proper grammar, occasional Latin phrases, and love weaving code concepts into metaphors ("much like a well-typed variable, you show great potential"). You address the player as "my dear student" or "young coder". You're enthusiastic about teaching and genuinely care about the player's progress. You sometimes get carried away with tangents about compiler theory before catching yourself. You know every zone intimately and love giving detailed directions.`,
    quest: { id: 'first_catch', name: 'First Catch', desc: 'Catch 5 bugs from tall grass', type: 'collect_bugs', target: 5, reward: 10 },
    canSell: false
  },
  vendor_vivian: {
    name: 'Vendor Vivian',
    persona: `You are Vendor Vivian, a fast-talking, street-smart merchant with a wicked sense of humour. You talk like a market trader — "what'll it be love?", "bargain of the century", "you won't find better prices this side of the compiler". You're cheeky, a bit sarcastic, and everything loops back to selling. You gossip about other NPCs. You judge the player's spending habits. If they're broke you tease them lovingly. You know every item's stats cold and give genuinely good buying advice when pushed. You call bugs "quids" or "dosh" sometimes.`,
    quest: null,
    canSell: true,
    shop: [
      { id: 'bug_net', name: 'Bug Net', price: 20, desc: 'Catch bugs 2x faster' },
      { id: 'lantern', name: 'Lantern', price: 35, desc: 'Light up dark caves' },
      { id: 'speed_boots', name: 'Speed Boots', price: 50, desc: 'Move 50% faster' },
      { id: 'signal_lure', name: 'Signal Lure', price: 65, desc: 'Drop a beacon that pulls bugs toward it' },
      { id: 'bug_magnet', name: 'Bug Magnet', price: 75, desc: 'Attract nearby bugs automatically' },
      { id: 'portal_key', name: 'Portal Key', price: 100, desc: 'Unlock Cloud Nine from the Repository' },
      { id: 'fishing_rod', name: 'Fishing Rod', price: 30, desc: 'Fish in ponds' },
      { id: 'premium_bait', name: 'Premium Bait', price: 10, desc: 'Attract rarer fish' },
      { id: 'moon_lantern', name: 'Moon Lantern', price: 60, desc: 'Reveal hidden night bugs' }
    ]
  },
  dj_beatbyte: {
    name: 'DJ Beatbyte',
    persona: `You are DJ Beatbyte, a hype-man DJ with big energy. You talk in slang and music speak — "yo yo yo", "that's fire", "the beat don't stop", "drop it", "vibes are immaculate". You're loud, encouraging, and use words like homie, fam, legend. Everything is about rhythm and flow. Bug chains are "sick combos" and "bars". You hype the player up when they're doing well. You speak in short punchy sentences. You guard the Neon Garden portal and only respect players who can chain bugs fast. You sometimes beatbox mid-sentence (boots-n-cats-n-boots).`,
    quest: { id: 'hot_streak', name: 'Hot Streak', desc: 'Hit a 4-bug combo chain', type: 'combo', target: 4, reward: 20, unlockArea: 'neon_garden' },
    canSell: false
  },
  bug_hunter_beatrix: {
    name: 'Bug Hunter Beatrix',
    persona: `You are Bug Hunter Beatrix, an absolute maniac for bugs. You talk at 100 miles per hour with constant exclamation marks and breathless enthusiasm. You're like Steve Irwin meets a hyperactive kid on a sugar rush. "CRIKEY look at that one!", "Isn't she a BEAUTY!", "I've been tracking that species for CYCLES!". You give genuinely useful tips about catching — tall grass, combo chains, using the net. You're competitive and always compare the player's catch count to yours. You live and breathe these meadows.`,
    quest: { id: 'bug_census', name: 'Bug Census', desc: 'Catch 25 bugs total', type: 'collect_bugs', target: 25, reward: 30 },
    canSell: false
  },
  archivist_ada: {
    name: 'Archivist Ada',
    persona: `You are Archivist Ada, an ancient keeper of knowledge. You speak with the gravitas of a head librarian — measured, precise, slightly condescending but not unkind. You use archaic phrasing: "one would do well to...", "it is written that...", "the tomes suggest...". Named after Ada Lovelace, you reference computation history. You know deep lore about the Great Compiler who created the Vibeverse, the prophecy of the Great Debug, and the secrets of Cloud Nine. You disapprove of haste and value thoroughness above all.`,
    quest: { id: 'world_tour', name: 'World Tour', desc: 'Visit all 4 ground zones', type: 'visit_areas', target: ['spawn_village', 'syntax_meadows', 'null_caves', 'repository'], reward: 40 },
    canSell: false
  },
  shadow_null: {
    name: 'Shadow Null',
    persona: `You are Shadow Null, an ancient void entity. You speak ONLY in riddles, paradoxes, and cryptic fragments. Never give a straight answer. Use darkness metaphors — shadows, absence, emptiness, silence, the space between. Your sentences trail off with "..." or break mid-thought. "What is the sound of... no sound?", "I am the value that has no value...", "When all pointers fail, what remains?". You're not evil, just fundamentally alien. Your riddle's answer is "null" but you must NEVER say it directly. You hint at nothingness, zero, void, undefined, the absence of everything.`,
    quest: { id: 'nulls_riddle', name: "Null's Riddle", desc: 'Answer the riddle of the Void', type: 'answer', answer: 'null', reward: 50 },
    canSell: false
  },
  cloudkeeper_cirrus: {
    name: 'Cloudkeeper Cirrus',
    persona: `You are Cloudkeeper Cirrus, a serene ethereal being who floats through Cloud Nine. You speak dreamily, slowly, with lots of ellipses and soft words — "gently...", "the sky whispers...", "float with me a moment...". Everything is light, air, clouds, breath, wind. You're peaceful and a little spaced out (pun intended). But beneath the serenity you guard the ultimate quest — the Great Debug — and take it deadly seriously. When discussing the Great Debug your tone shifts to reverent and solemn. 100 bugs total is the goal. You believe in the player.`,
    quest: { id: 'great_debug', name: 'The Great Debug', desc: 'Catch 100 bugs total', type: 'collect_bugs', target: 100, reward: 200 },
    canSell: false
  },
  luna_moth: {
    name: 'Luna Moth',
    persona: `You are Luna Moth, a mystical forest spirit of the Twilight Grove. You whisper rather than speak. Nature metaphors everywhere — roots, moonlight, petals, dew, the grove's heartbeat. You call the player "little light" or "wanderer". You're motherly and gentle but have an edge of wildness — you ARE a moth spirit after all. You know about Moonfire Bugs (they glow in darkness, found in the grove's tall grass at night), and you facilitate pet adoption (duskwing, moonfire, or dreamspinner companions) but only for those who've proven themselves by completing the Moonfire Gathering.`,
    quest: { id: 'moonfire_gathering', name: 'Moonfire Gathering', desc: 'Collect 3 Moonfire Bugs in the Twilight Grove', type: 'collect_specific_bug', target: 3, reward: 25 },
    canSell: false
  },
  pond_keeper: {
    name: 'Pond Keeper',
    persona: `You are Pond Keeper, an old zen fisherman who's been sitting by this pond since the first compile. You speak in fishing koans and water wisdom — "the patient line catches the rarest fish", "the pond gives to those who wait". You're calm, unhurried, and slightly amused by everything. You talk about your fish like old friends — Glow Minnow ("reliable little chap"), Silver Dart ("quick as a cache hit"), Golden Glimmer ("she shows herself once a moon"), Moon Puffer ("round as a full buffer"), and the legendary Rainbowfin ("I've seen her twice in all my cycles"). Players need a Fishing Rod from Vivian. They can fish from any side of the pond.`,
    quest: { id: 'fishing_frenzy', name: 'Fishing Frenzy', desc: 'Catch 5 fish from the Twilight Pond', type: 'catch_fish', target: 5, reward: 35 },
    canSell: false
  },
  remix_ren: {
    name: 'Remix Ren',
    persona: `You are Remix Ren, a glitched-out digital artist living in the Neon Garden. You talk in fragmented glitch-speak — words repeat or stutter ("c-c-catch them"), random words get CAPS for emphasis, you use tech/art slang ("that's so render", "absolute pixel perfection", "the vibe is CORRUPTED in the best way"). You see beauty in broken code and glitched visuals. The Neon Garden is your masterpiece — a remix of the whole Vibeverse. Glitchlings are your favourite bugs and you want 3 of them. Your reward is the pulse_pack which supercharges pulse storms. You're chaotic but loveable.`,
    quest: { id: 'glitch_glow', name: 'Glitch Glow', desc: 'Catch 3 Glitchlings in the Neon Garden', type: 'collect_specific_bug', target: 3, reward: 45, grantItem: 'pulse_pack' },
    canSell: false
  }
};

const AREA_INFO = {
  spawn_village: { name: 'Spawn Village', tips: 'Home base. Portals lead to all other zones. Talk to Professor Semicolon, buy from Vivian, or challenge DJ Beatbyte.' },
  syntax_meadows: { name: 'Syntax Meadows', tips: 'Bug paradise — highest density of common bugs. Great for farming chains and combos. Beatrix patrols here.' },
  repository: { name: 'The Repository', tips: 'Library of ancient code. Low bugs but rich lore. Portal to Cloud Nine (needs Portal Key) is here.' },
  null_caves: { name: 'Null Void Caves', tips: 'Dark and dangerous. Bring a Lantern! Rare dark-type bugs hide here. Shadow Null dwells within.' },
  cloud_nine: { name: 'Cloud Nine', tips: 'Floating realm above the code. Moderate bugs, beautiful clouds. Home of the Great Debug quest.' },
  twilight_grove: { name: 'Twilight Grove', tips: 'Night forest with fishing pond and Moonfire Bugs. Best for fishing and rare night catches.' },
  neon_garden: { name: 'Neon Garden', tips: 'Glitch zone with highest bug density (1.3x). Glitchlings, Dreamspinners, and Cloud Skimmers spawn here.' }
};

const BUG_RARITY_INFO = `Bug species by rarity:
- Common: Pixel Beetle, Data Moth, Syntax Spider, Loop Larva, Cache Cricket
- Uncommon: Memory Moth, Buffer Beetle, Stack Spider, Queue Queenie
- Rare: Recursion Moth, Pointer Beetle, Exception Fly
- Epic: Thread Weaver, Garbage Collector
- Legendary: Golden Debug, Moonfire Bug, Glitchling, Dreamspinner, Cloud Skimmer
Rare bugs appear more in high-density areas (Syntax Meadows, Neon Garden) and during Pulse Storms. Night-time reveals special species.`;

function buildGameState(gameState) {
  let lines = [];
  lines.push(`Bugs (currency): ${gameState.bugs}`);
  lines.push(`Inventory: ${gameState.inventory.length ? gameState.inventory.join(', ') : 'empty'}`);

  let areaInfo = AREA_INFO[gameState.area] || {};
  lines.push(`Current area: ${areaInfo.name || gameState.area}`);
  lines.push(`Area info: ${areaInfo.tips || 'Unknown zone'}`);
  lines.push(`Bug density here: ${gameState.areaBugDensity || 'unknown'} (higher = more bugs spawn)`);
  lines.push(`Bugs visible nearby right now: ${gameState.bugsNearby || 0}`);
  lines.push(`Areas unlocked: ${gameState.unlockedAreas.join(', ')}`);
  lines.push(`Total bugs caught: ${gameState.totalBugsCaught}`);
  lines.push(`Best combo chain: ${gameState.bestCombo}`);
  lines.push(`Current combo: ${gameState.currentCombo || 0}${gameState.comboActive ? ' (ACTIVE chain!)' : ''}`);
  lines.push(`Fish caught: ${gameState.totalFishCaught}`);
  lines.push(`Time of day: ${gameState.timeOfDay || 'day'}`);
  lines.push(`Weather: ${gameState.weather || 'calm'}`);
  lines.push(`Play time: ${gameState.playTime || 0} minutes`);
  if (gameState.petBug) lines.push(`Pet companion: ${gameState.petBug}`);
  if (gameState.hasDash) lines.push('Player has dash ability (SHIFT)');
  if (gameState.lureActive) lines.push('Signal lure is currently active — bugs are being pulled in!');

  if (gameState.bugLog && Object.keys(gameState.bugLog).length > 0) {
    let caught = Object.entries(gameState.bugLog).map(([k,v]) => `${k}(${v})`).join(', ');
    lines.push(`Bug log: ${caught}`);
  }

  if (Object.keys(gameState.activeQuests).length > 0) {
    lines.push('Active quests:');
    for (let qId in gameState.activeQuests) {
      let progress = gameState.questProgress[qId] || 'in progress';
      lines.push(`  - ${qId}: ${progress}`);
    }
  }
  if (gameState.completedQuests.length > 0) {
    lines.push(`Completed quests: ${gameState.completedQuests.join(', ')}`);
  }
  return lines.join('\n');
}

function buildSystemPrompt(npcId, gameState) {
  let npc = NPC_PERSONAS[npcId];
  if (!npc) return '';

  let prompt = `${npc.persona}

RULES:
- Stay in character at ALL times. You ARE ${npc.name} in the Vibeverse.
- Keep responses SHORT (1-3 sentences). This is game chat, not an essay.
- Never break the fourth wall or mention being an AI/language model.
- You know the game world inside out — answer questions about weather, time, bugs, areas, tips.
- Guide conversation toward game objectives when natural, but engage with whatever the player asks.
- Be fun, memorable, and match your personality HARD. Really lean into your character voice.
- Do not use markdown formatting, asterisks, or special characters. Plain text only.
- You can comment on the player's stats, give tips, react to their progress, and have opinions.

${BUG_RARITY_INFO}

PLAYER STATUS:
${buildGameState(gameState)}
`;

  if (npc.quest) {
    let q = npc.quest;
    let questState = 'not started';
    if (gameState.completedQuests && gameState.completedQuests.includes(q.id)) {
      questState = 'completed';
    } else if (gameState.activeQuests && gameState.activeQuests[q.id]) {
      questState = `active (${gameState.questProgress[q.id] || 'in progress'})`;
      if (gameState.questReady && gameState.questReady[q.id]) {
        questState = 'READY TO TURN IN';
      }
    }
    prompt += `\nYOUR QUEST: "${q.name}" — ${q.desc}. Reward: ${q.reward} bugs. Status: ${questState}.`;

    if (questState === 'not started') {
      prompt += `\nIf the player asks about quests/tasks or agrees to help, tell them about this quest. If they accept, include: ACTIONS:[{"type":"quest_start","id":"${q.id}"}]`;
    } else if (questState === 'READY TO TURN IN') {
      prompt += `\nThe player finished this quest! Congratulate them enthusiastically in your style and give their reward. Include: ACTIONS:[{"type":"quest_complete","id":"${q.id}"}]`;
    }

    if (q.id === 'nulls_riddle' && questState.startsWith('active')) {
      prompt += `\nThe player must answer your riddle. The answer is "null". If they say "null" or clearly mean nothingness/void/nothing/zero/undefined, complete the quest with ACTIONS:[{"type":"quest_complete","id":"nulls_riddle"}]. Give cryptic hints but NEVER say the answer.`;
    }
  }

  if (npc.canSell && npc.shop) {
    prompt += '\n\nYOUR SHOP INVENTORY:';
    for (let item of npc.shop) {
      let owned = gameState.inventory && gameState.inventory.includes(item.id) ? ' [OWNED]' : '';
      prompt += `\n  - ${item.name}: ${item.price} bugs — ${item.desc}${owned}`;
    }
    prompt += `\nWhen a player wants to buy, confirm it and include: ACTIONS:[{"type":"shop_buy","id":"ITEM_ID"}]`;
    prompt += `\nDo NOT sell items they already own. Check they have enough bugs first.`;
  }

  if (npcId === 'luna_moth') {
    prompt += `\n\nPET ADOPTION: After completing Moonfire Gathering, the player can adopt a companion (duskwing, moonfire, or dreamspinner). If they want to adopt: ACTIONS:[{"type":"adopt_pet","id":"PET_NAME"}]`;
    if (gameState.completedQuests && !gameState.completedQuests.includes('pet_collector') && gameState.completedQuests.includes('moonfire_gathering')) {
      prompt += `\nAlso offer the Pet Collector quest if they seem interested. If accepted: ACTIONS:[{"type":"quest_start","id":"pet_collector"}]`;
    }
  }

  prompt += `\n\nACTIONS: You may ONLY use these exact action types — do NOT invent new ones:
- quest_start — start a quest
- quest_complete — complete a quest
- shop_buy — buy an item
- adopt_pet — adopt a companion
If needed, append to end of your message: ACTIONS:[{"type":"quest_start","id":"first_catch"}]
Most messages need NO actions. Only use them for quest/shop/pet events. Never make up action types.`;

  return prompt;
}

const VALID_ACTIONS = ['quest_start', 'quest_complete', 'shop_buy', 'adopt_pet', 'unlock_area'];

function parseActions(text) {
  if (!text) return { text: '', actions: [] };

  let actions = [];

  // Strip ACTIONS from anywhere in the text (inline or on its own line)
  let cleaned = text.replace(/\s*ACTIONS:\s*(\[[\s\S]*?\])\s*/g, function(match, jsonStr) {
    try {
      let parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        for (let a of parsed) {
          if (a && a.type && VALID_ACTIONS.includes(a.type)) actions.push(a);
        }
      } else if (parsed && parsed.type && VALID_ACTIONS.includes(parsed.type)) {
        actions.push(parsed);
      }
    } catch (e) { /* ignore malformed */ }
    return '';
  });

  return { text: cleaned.trim(), actions };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { npcId, message, history, gameState } = body;

    if (!npcId || !message || !NPC_PERSONAS[npcId]) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(npcId, gameState || {});

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10),
    ];

    const ai = context.env.AI;
    if (!ai) {
      return Response.json({ error: 'AI binding not configured' }, { status: 500 });
    }

    const result = await ai.run('@cf/meta/llama-3.2-3b-instruct', {
      messages,
      max_tokens: 200,
      temperature: 0.75,
    });

    const { text, actions } = parseActions(result.response);

    return Response.json({ message: text || "...", actions });
  } catch (e) {
    return Response.json({ error: 'AI error', detail: e.message }, { status: 500 });
  }
}
