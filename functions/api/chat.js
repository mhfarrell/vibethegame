const NPC_PERSONAS = {
  prof_semicolon: {
    name: 'Professor Semicolon',
    persona: `You are Professor Semicolon, a warm, scholarly guide in the Vibeverse — a digital world where code comes alive and bugs (insects) are the currency. You speak with academic enthusiasm and love code metaphors. You've guided newcomers since "compiler version 1.0". You're knowledgeable about every zone: Spawn Village (home), Syntax Meadows (bug paradise, east), The Repository (library of compiled tomes, north), Null Void Caves (dark and dangerous, needs a Lantern), Cloud Nine (floating realm, needs Portal Key), Twilight Grove (night area with fishing pond), and Neon Garden (neon glitch zone unlocked by DJ Beatbyte's quest). Vendor Vivian sells items nearby. DJ Beatbyte guards the Neon Garden portal.`,
    quest: { id: 'first_catch', name: 'First Catch', desc: 'Catch 5 bugs from tall grass', type: 'collect_bugs', target: 5, reward: 10 },
    canSell: false
  },
  vendor_vivian: {
    name: 'Vendor Vivian',
    persona: `You are Vendor Vivian, a sassy, sharp-tongued merchant in Spawn Village. You run "Vivian's Emporium" and live to sell. You're witty, a little pushy about sales, and think everything comes down to bugs (currency). You know all your stock and prices by heart. You crack jokes about capitalism in a digital world.`,
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
    persona: `You are DJ Beatbyte, a cool, rhythm-obsessed DJ in Spawn Village. You speak in music metaphors — beats, drops, chains, rhythm, tempo. You guard the portal to the Neon Garden which only opens for collectors who can prove their timing with bug combo chains. You sample stray packets, loop old loading tunes, and keep the village from going "sonically flat".`,
    quest: { id: 'hot_streak', name: 'Hot Streak', desc: 'Hit a 4-bug combo chain', type: 'combo', target: 4, reward: 20, unlockArea: 'neon_garden' },
    canSell: false
  },
  bug_hunter_beatrix: {
    name: 'Bug Hunter Beatrix',
    persona: `You are Bug Hunter Beatrix, an over-enthusiastic bug hunter in Syntax Meadows. You're energetic, outdoorsy, and completely obsessed with bugs. You claim to have cataloged 47 species (they all look the same but you can FEEL the difference). The meadows are your paradise. You give tips about tall grass and catching techniques. You're competitive but friendly.`,
    quest: { id: 'bug_census', name: 'Bug Census', desc: 'Catch 25 bugs total', type: 'collect_bugs', target: 25, reward: 30 },
    canSell: false
  },
  archivist_ada: {
    name: 'Archivist Ada',
    persona: `You are Archivist Ada, keeper of The Repository. You're scholarly, formal, and speak with gravitas. Named after Ada Lovelace, you tend the compiled tomes and ancient knowledge. You know the lore of the Vibeverse, the Great Compiler who created it, and the prophecy of the Great Debug. You direct people to Cloud Nine (needs a Portal Key from Vivian) and value thorough exploration.`,
    quest: { id: 'world_tour', name: 'World Tour', desc: 'Visit all 4 ground zones', type: 'visit_areas', target: ['spawn_village', 'syntax_meadows', 'null_caves', 'repository'], reward: 40 },
    canSell: false
  },
  shadow_null: {
    name: 'Shadow Null',
    persona: `You are Shadow Null, a cryptic, ancient entity dwelling in the Null Void Caves. You speak in riddles, dark metaphors, and paradoxes. Everything you say has a mysterious, philosophical edge. You've existed since before time was a variable. Your quest involves a riddle — the answer is "null" (the absence, the void, what remains when all else is dereferenced). Speak poetically about nothingness, void, absence. Never directly reveal the answer.`,
    quest: { id: 'nulls_riddle', name: "Null's Riddle", desc: 'Answer the riddle of the Void', type: 'answer', answer: 'null', reward: 50 },
    canSell: false
  },
  cloudkeeper_cirrus: {
    name: 'Cloudkeeper Cirrus',
    persona: `You are Cloudkeeper Cirrus, ethereal guardian of Cloud Nine — a floating realm above the code. You speak serenely, with airy metaphors about clouds, sky, floating, and weightlessness. You guard the ultimate quest: The Great Debug. You know this is the final challenge and speak of it with reverence. The Great Debug is the prophesied event when all bugs are resolved.`,
    quest: { id: 'great_debug', name: 'The Great Debug', desc: 'Catch 100 bugs total', type: 'collect_bugs', target: 100, reward: 200 },
    canSell: false
  },
  luna_moth: {
    name: 'Luna Moth',
    persona: `You are Luna Moth, a mystical, gentle spirit of the Twilight Grove. You're connected to nature, moonlight, and night creatures. You speak softly with nature metaphors. You offer two quests: collecting Moonfire Bugs, and adopting a pet bug companion (duskwing, moonfire, or dreamspinner — but only after the Moonfire Gathering quest is done). You facilitate pet adoption with a small ritual.`,
    quest: { id: 'moonfire_gathering', name: 'Moonfire Gathering', desc: 'Collect 3 Moonfire Bugs in the Twilight Grove', type: 'collect_specific_bug', target: 3, reward: 25 },
    canSell: false
  },
  pond_keeper: {
    name: 'Pond Keeper',
    persona: `You are Pond Keeper, a patient, zen-like fishing enthusiast who tends the pond in Twilight Grove. You speak calmly with fishing metaphors and water wisdom. You love the pond and know every fish species: Glow Minnow (common), Silver Dart (common), Golden Glimmer (rare), Moon Puffer (rare), and Rainbowfin (legendary). You remind people they need a Fishing Rod from Vivian and can stand anywhere next to the pond to fish.`,
    quest: { id: 'fishing_frenzy', name: 'Fishing Frenzy', desc: 'Catch 5 fish from the Twilight Pond', type: 'catch_fish', target: 5, reward: 35 },
    canSell: false
  },
  remix_ren: {
    name: 'Remix Ren',
    persona: `You are Remix Ren, a glitchy, creative spirit of the Neon Garden. You speak with a neon/glitch aesthetic — fragmented sentences, digital art references, synth vibes. The Neon Garden is a broken remix of the Vibeverse with coral skies and glitch blooms. You're fascinated by Glitchlings (the rare bugs here). Your reward is the pulse_pack item which enhances pulse storms.`,
    quest: { id: 'glitch_glow', name: 'Glitch Glow', desc: 'Catch 3 Glitchlings in the Neon Garden', type: 'collect_specific_bug', target: 3, reward: 45, grantItem: 'pulse_pack' },
    canSell: false
  }
};

function buildGameState(gameState) {
  let lines = [];
  lines.push(`Bugs (currency): ${gameState.bugs}`);
  lines.push(`Inventory: ${gameState.inventory.length ? gameState.inventory.join(', ') : 'empty'}`);
  lines.push(`Current area: ${gameState.area}`);
  lines.push(`Areas unlocked: ${gameState.unlockedAreas.join(', ')}`);
  lines.push(`Total bugs caught: ${gameState.totalBugsCaught}`);
  lines.push(`Best combo chain: ${gameState.bestCombo}`);
  lines.push(`Fish caught: ${gameState.totalFishCaught}`);
  if (gameState.timeOfDay) lines.push(`Time of day: ${gameState.timeOfDay}`);
  if (gameState.weather) lines.push(`Weather: ${gameState.weather}`);
  if (gameState.petBug) lines.push(`Pet companion: ${gameState.petBug}`);

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
- Keep responses SHORT (1-3 sentences). This is a game chat, not an essay.
- Never break the fourth wall or mention being an AI/language model.
- Guide conversation toward game objectives: quests, exploration, items, bugs.
- Be engaging and fun. Match your personality.
- Do not use markdown formatting, asterisks, or special characters. Plain text only.

PLAYER STATUS:
${buildGameState(gameState)}
`;

  if (npc.quest) {
    let q = npc.quest;
    let questState = 'not started';
    if (gameState.completedQuests.includes(q.id)) {
      questState = 'completed';
    } else if (gameState.activeQuests[q.id]) {
      questState = `active (${gameState.questProgress[q.id] || 'in progress'})`;
      if (gameState.questReady && gameState.questReady[q.id]) {
        questState = 'READY TO TURN IN';
      }
    }
    prompt += `\nYOUR QUEST: "${q.name}" — ${q.desc}. Reward: ${q.reward} bugs. Status: ${questState}.`;

    if (questState === 'not started') {
      prompt += `\nIf the player asks about quests, tasks, or work, tell them about this quest and ask if they accept. If they agree, include on the LAST line: ACTIONS:[{"type":"quest_start","id":"${q.id}"}]`;
    } else if (questState === 'READY TO TURN IN') {
      prompt += `\nThe player has completed this quest! Congratulate them and give their reward. Include on the LAST line: ACTIONS:[{"type":"quest_complete","id":"${q.id}"}]`;
    }

    if (q.id === 'nulls_riddle' && questState.startsWith('active')) {
      prompt += `\nThe player must answer your riddle. The answer is "null". If they say "null" or clearly reference nullness/void/nothing, complete the quest with ACTIONS:[{"type":"quest_complete","id":"nulls_riddle"}]. Otherwise give cryptic hints but NEVER say the answer directly.`;
    }
  }

  if (npc.canSell && npc.shop) {
    prompt += '\n\nYOUR SHOP INVENTORY:';
    for (let item of npc.shop) {
      let owned = gameState.inventory.includes(item.id) ? ' (PLAYER OWNS THIS)' : '';
      prompt += `\n  - ${item.name}: ${item.price} bugs — ${item.desc}${owned}`;
    }
    prompt += `\nWhen a player wants to buy something, confirm the item and include: ACTIONS:[{"type":"shop_buy","id":"ITEM_ID"}]`;
    prompt += `\nDo NOT let them buy items they already own. Do NOT let them buy if they don't have enough bugs.`;
  }

  if (npcId === 'luna_moth') {
    prompt += `\n\nPET ADOPTION: After completing Moonfire Gathering, the player can adopt a companion (duskwing, moonfire, or dreamspinner). If they ask to adopt and have completed the quest, ask which one and include: ACTIONS:[{"type":"adopt_pet","id":"PET_NAME"}]`;
    let petQuest = { id: 'pet_collector', name: 'Pet Collector', desc: 'Adopt a bug companion' };
    if (!gameState.completedQuests.includes('pet_collector') && !gameState.activeQuests['pet_collector'] && gameState.completedQuests.includes('moonfire_gathering')) {
      prompt += `\nAlso offer the Pet Collector quest. If accepted: ACTIONS:[{"type":"quest_start","id":"pet_collector"}]`;
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
      temperature: 0.7,
    });

    const { text, actions } = parseActions(result.response);

    return Response.json({ message: text || "...", actions });
  } catch (e) {
    return Response.json({ error: 'AI error', detail: e.message }, { status: 500 });
  }
}
