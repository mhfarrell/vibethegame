/**
 * Vibe The Game - Game Engine v2
 * Complete rewrite with improved mechanics, visuals, and NPC dialogue
 */
var Game = (function () {

  // ====== CONSTANTS ======
  var TILE = 32;
  var PLAYER_W = 20;
  var PLAYER_H = 14;
  var PLAYER_OFFSET_X = 6;
  var PLAYER_OFFSET_Y = 16;
  var BASE_SPEED = 150;
  var NPC_INTERACT_DIST = 56;
  var BUG_SPAWN_INTERVAL = 4;
  var AUTO_SAVE_INTERVAL = 15;
  var MAGNET_RANGE = 120;
  var MAX_BUGS = 15;
  var BUG_FLEE_DIST = 60;
  var BUG_CATCH_DIST = 28;
  var DAY_DURATION = 120;
  var COMBO_WINDOW = 10;
  var DASH_SPEED = 420;
  var DASH_TIME = 0.16;
  var DASH_COOLDOWN = 1.2;
  var FISHING_CAST_TIME = 1.5;
  var FISHING_CATCH_WINDOW = 0.8;

  // ====== STATE ======
  var canvas, ctx, minimapCanvas, minimapCtx;
  var state = null;
  var keys = {};
  var camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
  var currentMap = null;
  var areaId = '';
  var bugs = [];
  var particles = [];
  var nearestNPC = null;
  var nearestBug = null;
  var dialogueOpen = false;
  var inventoryOpen = false;
  var menuOpen = false;
  var questsOpen = false;
  var currentNPCId = null;
  var lastShopItem = null;
  var lastTimestamp = 0;
  var bugTimer = 0;
  var saveTimer = 0;
  var gameTime = 0;
  var transitioning = false;
  var walkFrame = 0;
  var walkTimer = 0;
  var started = false;
  var cookiesAccepted = false;
  var notifTimer = 0;
  var achieveTimer = 0;
  var npcBobTimer = 0;
  var canvasW = 800;
  var canvasH = 600;
  var scale = 1;
  var audioCtx = null;
  var swingAnim = 0;
  var timeOfDay = 0;
  var fishingState = { active: false, castTime: 0, waiting: false, caught: null };
  var petFollowTimer = 0;
  var comboState = { count: 0, timer: 0, flash: 0, lastGain: 0 };
  var dashState = { active: false, time: 0, cooldown: 0, dx: 0, dy: 0 };
  var art = {};
  var vibeMode = { active: false, beat: 0, intensity: 0 };
  var vibeBeatCount = 0;
  var screenShake = { x: 0, y: 0, intensity: 0, timer: 0 };
  var bestiaryOpen = false;
  var catchFlash = { active: false, timer: 0 };
  var weather = { type: 'none', particles: [], active: false };

  // Noise seed for terrain variation
  var noiseSeed = [];
  for (var ns = 0; ns < 1000; ns++) noiseSeed.push(Math.random());
  function noise(x, y) { return noiseSeed[Math.abs((x * 374761 + y * 668265) % 1000)]; }

  // ====== DOM REFS ======
  var dom = {};

  function loadImage(src) {
    var img = new Image();
    img.src = src;
    return img;
  }

  function loadArt() {
    art.playerSheet = loadImage('assets/sprites/player-sheet.svg');
    art.bugSheet = loadImage('assets/sprites/bug-sheet.svg');
  }

  function isNightTime(value) {
    var t = typeof value === 'number' ? value : timeOfDay;
    return t > 0.5 || t < 0.25;
  }

  function getDefaultBugPool() {
    switch (areaId) {
      case 'syntax_meadows':
        return [
          { id: 'meadow_skipper', weight: 60 },
          { id: 'byte_beetle', weight: 40 }
        ];
      case 'repository':
        return [
          { id: 'byte_beetle', weight: 65 },
          { id: 'meadow_skipper', weight: 35 }
        ];
      case 'null_caves':
        return [
          { id: 'null_mite', weight: 70 },
          { id: 'byte_beetle', weight: 30 }
        ];
      case 'cloud_nine':
        return [
          { id: 'cloud_skimmer', weight: 70 },
          { id: 'meadow_skipper', weight: 30 }
        ];
      case 'twilight_grove':
        if (isNightTime()) {
          return [
            { id: 'moonfire', weight: 35 },
            { id: 'duskwing', weight: 40 },
            { id: 'dreamspinner', weight: 25 }
          ];
        }
        return [
          { id: 'meadow_skipper', weight: 45 },
          { id: 'byte_beetle', weight: 35 },
          { id: 'duskwing', weight: 20 }
        ];
      default:
        return [
          { id: 'meadow_skipper', weight: 80 },
          { id: 'byte_beetle', weight: 20 }
        ];
    }
  }

  function getActiveBugPool() {
    var area = GameData.areas[areaId] || {};
    var pool = isNightTime() && area.nightBugPool ? area.nightBugPool : area.bugPool;
    return pool && pool.length ? pool : getDefaultBugPool();
  }

  function rollBugType() {
    var pool = getActiveBugPool();
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += pool[i].weight;
    var roll = Math.random() * total;
    for (var j = 0; j < pool.length; j++) {
      roll -= pool[j].weight;
      if (roll <= 0) return pool[j].id;
    }
    return pool[0].id;
  }

  function getBugDef(id) {
    return GameData.bugTypes[id] || GameData.bugTypes.meadow_skipper;
  }

  function canDash() {
    return state && state.inventory.indexOf('pulse_pack') !== -1;
  }

  // ====== SOUND ======
  function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  }

  function playSound(type) {
    if (!audioCtx) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var t = audioCtx.currentTime;
      switch (type) {
        case 'collect':
          osc.type = 'square';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.linearRampToValueAtTime(1047, t + 0.08);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.12);
          osc.start(t); osc.stop(t + 0.12);
          break;
        case 'swing':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.linearRampToValueAtTime(400, t + 0.06);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.08);
          osc.start(t); osc.stop(t + 0.08);
          break;
        case 'miss':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(150, t + 0.1);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.12);
          osc.start(t); osc.stop(t + 0.12);
          break;
        case 'talk':
          osc.type = 'square';
          osc.frequency.setValueAtTime(400 + Math.random() * 200, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.04);
          osc.start(t); osc.stop(t + 0.04);
          break;
        case 'portal':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(900, t + 0.3);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.35);
          osc.start(t); osc.stop(t + 0.35);
          break;
        case 'purchase':
          osc.type = 'square';
          osc.frequency.setValueAtTime(660, t);
          osc.frequency.setValueAtTime(880, t + 0.08);
          osc.frequency.setValueAtTime(1100, t + 0.16);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.3);
          osc.start(t); osc.stop(t + 0.3);
          break;
        case 'quest':
          osc.type = 'square';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.setValueAtTime(659, t + 0.1);
          osc.frequency.setValueAtTime(784, t + 0.2);
          osc.frequency.setValueAtTime(1047, t + 0.3);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.5);
          osc.start(t); osc.stop(t + 0.5);
          break;
        case 'achieve':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(784, t);
          osc.frequency.setValueAtTime(1047, t + 0.15);
          osc.frequency.setValueAtTime(1319, t + 0.3);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.6);
          osc.start(t); osc.stop(t + 0.6);
          break;
        case 'fish_cast':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.15);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.2);
          osc.start(t); osc.stop(t + 0.2);
          break;
        case 'fish_bite':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.setValueAtTime(150, t + 0.1);
          osc.frequency.setValueAtTime(250, t + 0.2);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.3);
          osc.start(t); osc.stop(t + 0.3);
          break;
        case 'fish_catch':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.setValueAtTime(659, t + 0.1);
          osc.frequency.setValueAtTime(784, t + 0.2);
          osc.frequency.setValueAtTime(1047, t + 0.3);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.4);
          osc.start(t); osc.stop(t + 0.4);
          break;
        case 'pet_adopt':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.setValueAtTime(1100, t + 0.1);
          osc.frequency.setValueAtTime(1320, t + 0.2);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.35);
          osc.start(t); osc.stop(t + 0.35);
          break;
        case 'day_night':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(400, t + 0.3);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.4);
          osc.start(t); osc.stop(t + 0.4);
          break;
        case 'error':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.linearRampToValueAtTime(100, t + 0.15);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.2);
          osc.start(t); osc.stop(t + 0.2);
          break;
      }
    } catch (e) { }
  }

  function playVibeBeat() {
    if (!audioCtx) return;
    try {
      var t = audioCtx.currentTime;
      vibeBeatCount++;
      // Kick
      var ko = audioCtx.createOscillator(), kg = audioCtx.createGain();
      ko.connect(kg); kg.connect(audioCtx.destination);
      ko.type = 'sine';
      ko.frequency.setValueAtTime(150, t);
      ko.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      kg.gain.setValueAtTime(0.18, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      ko.start(t); ko.stop(t + 0.15);
      // Hi-hat on offbeats
      if (vibeBeatCount % 2 === 0) {
        var ho = audioCtx.createOscillator(), hg = audioCtx.createGain();
        ho.connect(hg); hg.connect(audioCtx.destination);
        ho.type = 'square';
        ho.frequency.setValueAtTime(4000 + Math.random() * 2000, t);
        hg.gain.setValueAtTime(0.03, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        ho.start(t); ho.stop(t + 0.05);
      }
      // Bass synth
      var bo = audioCtx.createOscillator(), bg = audioCtx.createGain();
      bo.connect(bg); bg.connect(audioCtx.destination);
      bo.type = 'sawtooth';
      var notes = [110, 130.81, 146.83, 164.81];
      bo.frequency.setValueAtTime(notes[vibeBeatCount % notes.length], t);
      bg.gain.setValueAtTime(0.05, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      bo.start(t); bo.stop(t + 0.2);
    } catch (e) {}
  }

  // ====== INITIALIZATION ======
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    loadArt();

    dom.hud = document.getElementById('hud');
    dom.bugCount = document.getElementById('bug-count-val');
    dom.areaName = document.getElementById('area-name');
    dom.objectiveDisplay = document.getElementById('objective-display');
    dom.comboDisplay = document.getElementById('combo-display');
    dom.dashDisplay = document.getElementById('dash-display');
    dom.questIndicator = document.getElementById('quest-indicator');
    dom.goldenBugs = document.getElementById('golden-bugs');
    dom.interactPrompt = document.getElementById('interact-prompt');
    dom.dialogueBox = document.getElementById('dialogue-box');
    dom.npcName = document.getElementById('npc-name');
    dom.npcPortrait = document.getElementById('npc-portrait');
    dom.dialogueMessages = document.getElementById('dialogue-messages');
    dom.dialogueInput = document.getElementById('dialogue-input');
    dom.inventoryPanel = document.getElementById('inventory-panel');
    dom.inventoryGrid = document.getElementById('inventory-grid');
    dom.notification = document.getElementById('notification');
    dom.achievePopup = document.getElementById('achievement-popup');
    dom.startScreen = document.getElementById('start-screen');
    dom.menuPanel = document.getElementById('menu-panel');
    dom.questsPanel = document.getElementById('quests-panel');
    dom.transitionOverlay = document.getElementById('transition-overlay');
    dom.cookieBanner = document.getElementById('cookie-banner');
    dom.bestiaryPanel = document.getElementById('bestiary-panel');

    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.getElementById('dialogue-send').addEventListener('click', sendDialogue);
    dom.dialogueInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendDialogue(); }
      e.stopPropagation();
    });
    dom.dialogueInput.addEventListener('keyup', function (e) { e.stopPropagation(); });

    setupMobileControls();

    cookiesAccepted = SaveSystem.hasConsent();
    if (!cookiesAccepted) dom.cookieBanner.style.display = 'block';

    document.getElementById('cookie-accept').addEventListener('click', function () {
      cookiesAccepted = true;
      SaveSystem.giveConsent();
      dom.cookieBanner.style.display = 'none';
    });
    document.getElementById('cookie-decline').addEventListener('click', function () {
      dom.cookieBanner.style.display = 'none';
    });

    document.getElementById('menu-resume').addEventListener('click', toggleMenu);
    document.getElementById('menu-save').addEventListener('click', function () {
      saveGame(); showNotification('Game Saved!');
    });
    document.getElementById('menu-quests').addEventListener('click', function () {
      toggleMenu(); toggleQuests();
    });
    document.getElementById('menu-delete').addEventListener('click', function () {
      if (confirm('Delete all save data? This cannot be undone!')) {
        SaveSystem.clear();
        state = SaveSystem.getDefaultState();
        loadArea(state.player.area);
        toggleMenu();
        showNotification('Save data deleted');
      }
    });

    var saved = SaveSystem.load();
    if (saved) {
      var ci = document.querySelector('.continue-info');
      ci.style.display = 'block';
      ci.textContent = 'Continue from save (' + saved.totalBugsCollected + ' bugs collected)';
    }

    document.querySelector('.start-btn').addEventListener('click', startGame);
    requestAnimationFrame(gameLoop);
  }

  function startGame() {
    if (started) return;
    started = true;
    initAudio();
    dom.startScreen.style.display = 'none';
    dom.hud.style.display = 'flex';
    state = SaveSystem.load() || SaveSystem.getDefaultState();
    timeOfDay = typeof state.timeOfDay === 'number' ? state.timeOfDay : 0;
    loadArea(state.player.area);
    lastTimestamp = performance.now();
  }

  function resizeCanvas() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    scale = Math.min(w / canvasW, h / canvasH);
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = Math.floor(canvasW * scale) + 'px';
    canvas.style.height = Math.floor(canvasH * scale) + 'px';
  }

  // ====== INPUT ======
  function onKeyDown(e) {
    if (dialogueOpen && e.target === dom.dialogueInput) return;
    var key = e.key.toLowerCase();
    keys[key] = true;

    if (key === 'enter') {
      e.preventDefault();
      if (!started) { startGame(); return; }
      if (menuOpen || dialogueOpen) return;
      if (inventoryOpen) { toggleInventory(); return; }
      if (questsOpen) { toggleQuests(); return; }
      if (nearestNPC) openDialogue(nearestNPC);
    }
    if (key === ' ') {
      e.preventDefault();
      if (!started || dialogueOpen || menuOpen || inventoryOpen || questsOpen || bestiaryOpen) return;
      attemptCatchBug();
    }
    if (key === 'escape') {
      e.preventDefault();
      if (dialogueOpen) { closeDialogue(); return; }
      if (inventoryOpen) { toggleInventory(); return; }
      if (questsOpen) { toggleQuests(); return; }
      if (bestiaryOpen) { toggleBestiary(); return; }
      if (started) toggleMenu();
    }
    if (key === 'i' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      if (questsOpen) toggleQuests();
      toggleInventory();
    }
    if (key === 'q' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      if (inventoryOpen) toggleInventory();
      toggleQuests();
    }
    if (key === 'f' && started && !dialogueOpen && !menuOpen && !inventoryOpen && !questsOpen) {
      e.preventDefault();
      attemptFishing();
    }
    if ((key === 'shift' || key === 'shiftleft' || key === 'shiftright') && started &&
        !dialogueOpen && !menuOpen && !inventoryOpen && !questsOpen) {
      e.preventDefault();
      attemptDash();
    }
    if (key === 'b' && started && !dialogueOpen && !menuOpen && !inventoryOpen && !questsOpen) {
      e.preventDefault();
      if (bestiaryOpen) { toggleBestiary(); return; }
      toggleBestiary();
    }
    if (key === 'p' && started && !dialogueOpen && !menuOpen && !inventoryOpen && !questsOpen) {
      e.preventDefault();
      togglePetMenu();
    }
  }

  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

  function setupMobileControls() {
    var dirs = { up: 'w', down: 's', left: 'a', right: 'd' };
    Object.keys(dirs).forEach(function (dir) {
      var btn = document.querySelector('.mobile-dpad .' + dir);
      if (!btn) return;
      btn.addEventListener('touchstart', function (e) { e.preventDefault(); keys[dirs[dir]] = true; });
      btn.addEventListener('touchend', function (e) { e.preventDefault(); keys[dirs[dir]] = false; });
    });
    var actionBtn = document.querySelector('.mobile-action button');
    if (actionBtn) {
      actionBtn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (dialogueOpen) return;
        if (nearestNPC) openDialogue(nearestNPC);
        else attemptCatchBug();
      });
    }
  }

  // ====== AREA MANAGEMENT ======
  function loadArea(id) {
    var area = GameData.areas[id];
    if (!area) return;
    areaId = id;
    currentMap = area.map;
    bugs = [];
    fishingState.active = false;
    fishingState.waiting = false;
    spawnInitialBugs();
    updateHUD();
    drawMinimap();

    if (state.unlockedAreas.indexOf(id) === -1) state.unlockedAreas.push(id);
    if (id === 'twilight_grove' && state.achievements.indexOf('night_owl') === -1) {
      unlockAchievement('night_owl');
    }
    if (id === 'neon_garden' && state.achievements.indexOf('neon_runner') === -1) {
      unlockAchievement('neon_runner');
    }
    if (state.unlockedAreas.length >= 5 && state.achievements.indexOf('explorer') === -1) {
      unlockAchievement('explorer');
    }
  }

  function spawnInitialBugs() {
    var area = GameData.areas[areaId];
    var count = 0;
    for (var y = 0; y < currentMap.length && count < MAX_BUGS; y++) {
      for (var x = 0; x < currentMap[y].length && count < MAX_BUGS; x++) {
        if (currentMap[y][x] === GameData.T.TALL_GRASS && Math.random() < area.bugDensity * 0.5) {
          bugs.push(createBug(x * TILE + TILE / 2, y * TILE + TILE / 2));
          count++;
        }
      }
    }
  }

  function createBug(x, y) {
    var bugType = rollBugType();
    var bugDef = getBugDef(bugType);
    return {
      x: x, y: y,
      homeX: x, homeY: y,
      bobOffset: Math.random() * Math.PI * 2,
      glowPhase: Math.random() * Math.PI * 2,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: Math.random() * 2,
      bugType: bugType,
      value: bugDef.value,
      speed: bugDef.speed,
      fleeing: false,
      fleeTimer: 0,
      caught: false,
      catchAnim: 0
    };
  }

  function registerBugCatch(bug, bugDef) {
    var hadChain = comboState.timer > 0;
    comboState.count = hadChain ? comboState.count + 1 : 1;
    comboState.timer = COMBO_WINDOW;
    comboState.flash = 0.45;

    var comboBonus = Math.min(3, Math.floor((comboState.count - 1) / 2));
    var bugsEarned = bugDef.value + comboBonus;

    if (state.petBug === 'duskwing') bugsEarned += 1;
    if (state.petBug === 'moonfire' && isNightTime() && bug.bugType === 'moonfire') bugsEarned += 1;
    if (state.petBug === 'dreamspinner' && comboState.count >= 3) bugsEarned += 1;
    if (vibeMode.active) bugsEarned = bugsEarned * 2;

    state.bugs += bugsEarned;
    state.totalBugsCollected += bugsEarned;

    // Golden bug chance (10% on catch, 25% in Vibe Mode)
    var goldenChance = vibeMode.active ? 0.25 : 0.1;
    if (Math.random() < goldenChance) {
      state.goldenBugs = (state.goldenBugs || 0) + 1;
      particles.push({
        x: bug.x, y: bug.y - 20, vx: 0, vy: -60,
        life: 1.5, maxLife: 1.5,
        text: '+1 GOLDEN BUG', color: '#ffd700', size: 11
      });
      showNotification('Golden Bug found! (' + state.goldenBugs + '/100)');
      playSound('achieve');
    }

    state.bugLog[bug.bugType] = (state.bugLog[bug.bugType] || 0) + 1;
    if (state.discoveredBugTypes.indexOf(bug.bugType) === -1) {
      state.discoveredBugTypes.push(bug.bugType);
    }
    state.bestCombo = Math.max(state.bestCombo || 0, comboState.count);
    comboState.lastGain = bugsEarned;

    // THE GREAT DEBUG - Collect 100 golden bugs to complete
    if (state.goldenBugs >= 100 && !state.greatDebugTriggered) {
      state.greatDebugTriggered = true;
      showNotification('THE GREAT DEBUG COMPILES...');
      playSound('achieve');
      setTimeout(function() {
        triggerGreatDebugMilestone();
      }, 2000);
    }

    // Vibe Mode activation at 6+ chain
    if (comboState.count >= 6 && !vibeMode.active) {
      vibeMode.active = true;
      vibeMode.beat = 0;
      vibeMode.intensity = 0;
      vibeBeatCount = 0;
      showNotification('VIBE MODE ACTIVATED');
      playSound('achieve');
    }

    // Screen shake on catch
    screenShake.intensity = comboState.count > 1 ? Math.min(5, comboState.count * 0.8) : 2;
    screenShake.timer = 0.12;

    if (state.bestCombo >= 5 && state.achievements.indexOf('combo_ace') === -1) {
      unlockAchievement('combo_ace');
    }
    if (state.bugs >= 500 && state.achievements.indexOf('richest') === -1) {
      unlockAchievement('richest');
    }
    return bugsEarned;
  }

  function attemptDash() {
    if (!canDash() || dashState.active || dashState.cooldown > 0) return;

    var dx = 0;
    var dy = 0;
    if (keys['w'] || keys['arrowup']) dy = -1;
    if (keys['s'] || keys['arrowdown']) dy = 1;
    if (keys['a'] || keys['arrowleft']) dx = -1;
    if (keys['d'] || keys['arrowright']) dx = 1;

    if (!dx && !dy) {
      if (state.player.dir === 0) dy = 1;
      else if (state.player.dir === 1) dy = -1;
      else if (state.player.dir === 2) dx = -1;
      else dx = 1;
    }
    if (dx && dy) {
      dx *= 0.707;
      dy *= 0.707;
    }

    dashState.active = true;
    dashState.time = DASH_TIME;
    dashState.cooldown = DASH_COOLDOWN;
    dashState.dx = dx;
    dashState.dy = dy;
    comboState.timer = Math.max(comboState.timer, 1.2);

    for (var i = 0; i < 6; i++) {
      particles.push({
        x: state.player.x + 16,
        y: state.player.y + 18,
        vx: -dx * (80 + i * 15) + (Math.random() - 0.5) * 30,
        vy: -dy * (80 + i * 15) + (Math.random() - 0.5) * 30,
        life: 0.3 + i * 0.03,
        maxLife: 0.3 + i * 0.03,
        color: '#29d7ff',
        size: 3
      });
    }
    playSound('portal');
    updateHUD();
  }

  // ====== BUG CATCHING MECHANIC ======
  function attemptCatchBug() {
    if (swingAnim > 0) return;
    swingAnim = 0.3;
    playSound('swing');

    var px = state.player.x + TILE / 2;
    var py = state.player.y + PLAYER_OFFSET_Y;
    var hasNet = state.inventory.indexOf('bug_net') !== -1;
    var catchDist = hasNet ? BUG_CATCH_DIST * 1.8 : BUG_CATCH_DIST;
    var caught = false;

    // Find and catch nearest bug in range
    var bestDist = catchDist;
    var bestIdx = -1;
    for (var i = 0; i < bugs.length; i++) {
      var b = bugs[i];
      var dx = px - b.x;
      var dy = py - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      var b = bugs[bestIdx];
      var bugDef = getBugDef(b.bugType);
      bugs.splice(bestIdx, 1);
      var bugsEarned = registerBugCatch(b, bugDef);
      playSound('collect');
      catchFlash.active = true;
      catchFlash.timer = 0.4;

      // Juicy burst particles - more and varied
      var burstCount = vibeMode.active ? 16 : (comboState.count > 2 ? 12 : 8);
      for (var p = 0; p < burstCount; p++) {
        var angle = (p / burstCount) * Math.PI * 2 + Math.random() * 0.3;
        var spd = 60 + Math.random() * 60;
        particles.push({
          x: b.x, y: b.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 40,
          life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
          color: p % 2 === 0 ? bugDef.glow : bugDef.color,
          size: 2 + Math.random() * 3
        });
      }
      // Value text - bigger for combos
      var textSize = vibeMode.active ? 14 : (comboState.count > 2 ? 12 : 10);
      particles.push({
        x: b.x, y: b.y - 16, vx: 0, vy: -50,
        life: 1.2, maxLife: 1.2,
        text: '+' + bugsEarned + ' BUG' + (bugsEarned > 1 ? 'S' : ''), color: bugDef.glow, size: textSize
      });
      if (comboState.count > 1) {
        var chainColor = vibeMode.active ? '#ff4d8d' : '#ff9f68';
        particles.push({
          x: b.x, y: b.y - 32, vx: 0, vy: -35,
          life: 1.1, maxLife: 1.1,
          text: 'CHAIN x' + comboState.count, color: chainColor, size: vibeMode.active ? 11 : 8
        });
      }

      updateHUD();

      if (state.totalBugsCollected === 1 && state.achievements.indexOf('first_bug') === -1) {
        unlockAchievement('first_bug');
      }
      if (state.totalBugsCollected >= 50 && state.achievements.indexOf('bug_hoarder') === -1) {
        unlockAchievement('bug_hoarder');
      }
      checkQuestProgress();
      caught = true;
    }

    if (!caught) {
      playSound('miss');
      if (vibeMode.active) { vibeMode.active = false; }
      comboState.count = 0;
      comboState.timer = 0;
      comboState.flash = 0;
      updateHUD();
      // Scare nearby bugs
      for (var i = 0; i < bugs.length; i++) {
        var b = bugs[i];
        var dx = px - b.x;
        var dy = py - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BUG_FLEE_DIST * 1.5) {
          b.fleeing = true;
          b.fleeTimer = 1.5;
          b.wanderAngle = Math.atan2(b.y - py, b.x - px) + (Math.random() - 0.5) * 0.5;
        }
      }
    }
  }

  // ====== GAME LOOP ======
  function gameLoop(timestamp) {
    var dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    if (started && !transitioning) {
      gameTime += dt;
      npcBobTimer += dt;
      if (swingAnim > 0) swingAnim = Math.max(0, swingAnim - dt);
      if (dashState.cooldown > 0) dashState.cooldown = Math.max(0, dashState.cooldown - dt);
      if (comboState.timer > 0) {
        comboState.timer = Math.max(0, comboState.timer - dt);
        if (comboState.timer === 0 && comboState.count > 0) {
          if (vibeMode.active) { vibeMode.active = false; }
          comboState.count = 0;
          comboState.flash = 0;
          updateHUD();
        }
      }
      if (comboState.flash > 0) comboState.flash = Math.max(0, comboState.flash - dt);

      // Screen shake update
      if (screenShake.timer > 0) {
        screenShake.timer -= dt;
        var shakeAmt = screenShake.intensity * (screenShake.timer / 0.12);
        screenShake.x = (Math.random() - 0.5) * shakeAmt * 2;
        screenShake.y = (Math.random() - 0.5) * shakeAmt * 2;
        if (screenShake.timer <= 0) { screenShake.x = 0; screenShake.y = 0; }
      }

      // Catch flash update
      if (catchFlash.active && catchFlash.timer > 0) {
        catchFlash.timer = Math.max(0, catchFlash.timer - dt);
        if (catchFlash.timer <= 0) catchFlash.active = false;
      }

      // Vibe mode update
      if (vibeMode.active) {
        vibeMode.intensity = Math.min(1, vibeMode.intensity + dt * 2);
        vibeMode.beat += dt;
        if (vibeMode.beat >= 60 / 140) {
          vibeMode.beat -= 60 / 140;
          playVibeBeat();
          for (var vp = 0; vp < 3; vp++) {
            var va = Math.random() * Math.PI * 2;
            var vd = 30 + Math.random() * 50;
            particles.push({
              x: state.player.x + TILE / 2 + Math.cos(va) * vd,
              y: state.player.y + TILE / 2 + Math.sin(va) * vd,
              vx: Math.cos(va) * 20, vy: -40 + Math.random() * 20,
              life: 0.6, maxLife: 0.6,
              color: ['#ff4d8d','#29d7ff','#ffd54f','#66bb6a'][vp % 4],
              size: 2 + Math.random() * 2
            });
          }
        }
      } else {
        vibeMode.intensity = Math.max(0, vibeMode.intensity - dt * 3);
      }

      timeOfDay = (timeOfDay + dt / DAY_DURATION) % 1;
      var wasNight = isNightTime();
      state.timeOfDay = timeOfDay;
      if (wasNight !== isNightTime()) {
        playSound('day_night');
      }

      if (!dialogueOpen && !inventoryOpen && !menuOpen && !questsOpen && !bestiaryOpen) {
        updatePlayer(dt);
        updateBugs(dt);
        checkNPCProximity();
        checkPortals();

        bugTimer += dt;
        if (bugTimer > BUG_SPAWN_INTERVAL) {
          spawnRandomBug();
          bugTimer = 0;
        }

        saveTimer += dt;
        if (saveTimer > AUTO_SAVE_INTERVAL && cookiesAccepted) {
          state.playTime += AUTO_SAVE_INTERVAL;
          saveGame();
          saveTimer = 0;
        }
      }

      updateParticles(dt);
      updateWeather(dt);

      if (notifTimer > 0) {
        notifTimer -= dt;
        if (notifTimer <= 0) dom.notification.style.display = 'none';
      }
      if (achieveTimer > 0) {
        achieveTimer -= dt;
        if (achieveTimer <= 0) dom.achievePopup.style.display = 'none';
      }
    }

    render();
    requestAnimationFrame(gameLoop);
  }

    // ====== PLAYER UPDATE ======
    var playerMoved = false;
  function updatePlayer(dt) {
    var speed = BASE_SPEED;
    if (state.inventory.indexOf('speed_boots') !== -1) speed *= 1.5;

    var dx = 0, dy = 0;
    if (dashState.active) {
      dx = dashState.dx;
      dy = dashState.dy;
      speed = DASH_SPEED;
      dashState.time -= dt;
      if (dashState.time <= 0) dashState.active = false;
    } else {
      if (keys['w'] || keys['arrowup']) dy = -1;
      if (keys['s'] || keys['arrowdown']) dy = 1;
      if (keys['a'] || keys['arrowleft']) dx = -1;
      if (keys['d'] || keys['arrowright']) dx = 1;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    }

    if (dx !== 0 || dy !== 0) {
      playerMoved = true;
      if (Math.abs(dx) > Math.abs(dy)) state.player.dir = dx > 0 ? 3 : 2;
      else state.player.dir = dy > 0 ? 0 : 1;
      walkTimer += dt;
      if (walkTimer > 0.15) { walkFrame = (walkFrame + 1) % 4; walkTimer = 0; }
    } else {
      walkFrame = 0; walkTimer = 0;
    }

    var newX = state.player.x + dx * speed * dt;
    var newY = state.player.y + dy * speed * dt;
    if (!isColliding(newX, state.player.y)) state.player.x = newX;
    if (!isColliding(state.player.x, newY)) state.player.y = newY;

    camera.targetX = state.player.x - canvasW / 2 + TILE / 2;
    camera.targetY = state.player.y - canvasH / 2 + TILE / 2;
    var mapW = currentMap[0].length * TILE;
    var mapH = currentMap.length * TILE;
    camera.targetX = Math.max(0, Math.min(camera.targetX, mapW - canvasW));
    camera.targetY = Math.max(0, Math.min(camera.targetY, mapH - canvasH));
    camera.x += (camera.targetX - camera.x) * 8 * dt;
    camera.y += (camera.targetY - camera.y) * 8 * dt;

    if (state.petBug && playerMoved) {
      petFollowTimer += dt;
      if (petFollowTimer > 0.3) {
        spawnPetParticle();
        petFollowTimer = 0;
      }
    }

    updateFishing(dt);

    // Find nearest bug for UI indicator
    var px = state.player.x + TILE / 2;
    var py = state.player.y + PLAYER_OFFSET_Y;
    nearestBug = null;
    var minBugDist = BUG_CATCH_DIST * 2;
    for (var i = 0; i < bugs.length; i++) {
      var bx = bugs[i].x - px, by = bugs[i].y - py;
      var d = Math.sqrt(bx * bx + by * by);
      if (d < minBugDist) { minBugDist = d; nearestBug = bugs[i]; }
    }
  }

  function isColliding(px, py) {
    var left = px + PLAYER_OFFSET_X;
    var top = py + PLAYER_OFFSET_Y;
    var right = left + PLAYER_W;
    var bottom = top + PLAYER_H;
    var corners = [[left, top], [right - 1, top], [left, bottom - 1], [right - 1, bottom - 1]];
    for (var i = 0; i < corners.length; i++) {
      var tx = Math.floor(corners[i][0] / TILE);
      var ty = Math.floor(corners[i][1] / TILE);
      if (ty < 0 || tx < 0 || ty >= currentMap.length || tx >= currentMap[ty].length) return true;
      var t = currentMap[ty][tx];
      if (t === undefined || !GameData.tileProps[t] || !GameData.tileProps[t].walkable) return true;
    }
    return false;
  }

  // ====== BUG SYSTEM ======
  function isTileWalkable(wx, wy) {
    var tx = Math.floor(wx / TILE);
    var ty = Math.floor(wy / TILE);
    if (ty < 0 || tx < 0 || ty >= currentMap.length || tx >= currentMap[0].length) return false;
    var t = currentMap[ty][tx];
    return t !== undefined && GameData.tileProps[t] && GameData.tileProps[t].walkable;
  }

  function updateBugs(dt) {
    var hasMagnet = state.inventory.indexOf('bug_magnet') !== -1;
    var px = state.player.x + TILE / 2;
    var py = state.player.y + TILE / 2;
    var mapW = currentMap[0].length * TILE;
    var mapH = currentMap.length * TILE;

    for (var i = 0; i < bugs.length; i++) {
      var b = bugs[i];
      b.bobOffset += dt * 3;
      b.glowPhase += dt * 2;

      var bx = px - b.x, by = py - b.y;
      var playerDist = Math.sqrt(bx * bx + by * by);

      // Vibe Mode: bugs dance instead of fleeing
      if (vibeMode.active) {
        b.fleeing = false;
        b.fleeTimer = 0;
        b.wanderAngle += dt * 6;
        var nx2 = b.x + Math.cos(b.wanderAngle) * 25 * dt;
        var ny2 = b.y + Math.sin(b.wanderAngle) * 25 * dt;
        if (isTileWalkable(nx2, ny2)) { b.x = nx2; b.y = ny2; }
        b.bobOffset += dt * 8;
        continue;
      }

      // Flee from player when close
      if (playerDist < BUG_FLEE_DIST && !hasMagnet) {
        b.fleeing = true;
        b.fleeTimer = 1.0;
        b.wanderAngle = Math.atan2(b.y - py, b.x - px);
      }

      if (b.fleeTimer > 0) {
        b.fleeTimer -= dt;
        if (b.fleeTimer <= 0) b.fleeing = false;
      }

      var speed = b.fleeing ? 70 : (b.speed || 12);

      // Wander
      b.wanderTimer -= dt;
      if (b.wanderTimer <= 0 && !b.fleeing) {
        b.wanderAngle = Math.random() * Math.PI * 2;
        b.wanderTimer = 1.5 + Math.random() * 3;
      }

      var nx = b.x + Math.cos(b.wanderAngle) * speed * dt;
      var ny = b.y + Math.sin(b.wanderAngle) * speed * dt;

      // Clamp to map and walkable tiles
      nx = Math.max(TILE, Math.min(nx, mapW - TILE));
      ny = Math.max(TILE, Math.min(ny, mapH - TILE));
      if (isTileWalkable(nx, ny)) {
        b.x = nx;
        b.y = ny;
      } else {
        // Bounce off wall
        b.wanderAngle += Math.PI * 0.5 + Math.random() * Math.PI;
        b.fleeing = false;
        b.fleeTimer = 0;
      }

      // Return toward home if too far
      if (!b.fleeing) {
        var hdx = b.homeX - b.x, hdy = b.homeY - b.y;
        var homeDist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (homeDist > TILE * 4) {
          b.wanderAngle = Math.atan2(hdy, hdx);
        }
      }

      // Magnet pull
      if (hasMagnet && playerDist < MAGNET_RANGE && playerDist > 5) {
        b.x += (bx / playerDist) * 80 * dt;
        b.y += (by / playerDist) * 80 * dt;
        b.fleeing = false;
      }
    }
  }

  function spawnRandomBug() {
    if (bugs.length >= MAX_BUGS) return;
    var grassTiles = [];
    for (var y = 0; y < currentMap.length; y++) {
      for (var x = 0; x < currentMap[y].length; x++) {
        if (currentMap[y][x] === GameData.T.TALL_GRASS) grassTiles.push([x, y]);
      }
    }
    if (grassTiles.length === 0) return;
    var tile = grassTiles[Math.floor(Math.random() * grassTiles.length)];
    bugs.push(createBug(tile[0] * TILE + TILE / 2, tile[1] * TILE + TILE / 2));
  }

  // ====== PET SYSTEM ======
  function spawnPetParticle() {
    if (!state.petBug) return;
    var pet = GameData.petBugs[state.petBug];
    if (!pet) return;
    particles.push({
      x: state.player.x + TILE / 2 + (Math.random() - 0.5) * 20,
      y: state.player.y + TILE / 2 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 20,
      vy: -30 + (Math.random() - 0.5) * 10,
      life: 0.6,
      maxLife: 0.6,
      color: pet.glowColor,
      size: 2
    });
  }

  function togglePetMenu() {
    if (!state.petBug) {
      showNotification('No pet! Talk to Luna Moth to adopt one.');
      return;
    }
    var pet = GameData.petBugs[state.petBug];
    showNotification('Pet: ' + pet.name + ' - ' + pet.special);
  }

  function adoptPet(bugType) {
    if (state.petBug) {
      return 'You already have a companion fluttering beside you.';
    }
    if (!GameData.petBugs[bugType]) return 'That bug spirit is not answering right now.';
    state.petBug = bugType;
    playSound('pet_adopt');
    var pet = GameData.petBugs[bugType];
    showNotification('You adopted ' + pet.name + '!');
    updateHUD();

    if (state.achievements.indexOf('pet_lover') === -1) {
      unlockAchievement('pet_lover');
    }
    checkQuestProgress();
    return 'The grove answers your call. ' + pet.name + ' will follow you from now on.';
  }

  function isAtFishingSpot() {
    var tx = Math.floor((state.player.x + TILE / 2) / TILE);
    var ty = Math.floor((state.player.y + PLAYER_OFFSET_Y) / TILE);
    return !!(currentMap[ty] && currentMap[ty][tx] === GameData.T.FISHING_SPOT);
  }

  // ====== FISHING SYSTEM ======
  function attemptFishing() {
    if (state.inventory.indexOf('fishing_rod') === -1) {
      showNotification('You need a Fishing Rod! Visit Finley in the Twilight Grove.');
      return;
    }

    if (isAtFishingSpot()) {
      if (fishingState.active) {
        finishFishing();
      } else {
        startFishing();
      }
    } else {
      showNotification('Stand on a dock tile beside the pond to fish.');
    }
  }

  function startFishing() {
    fishingState.active = true;
    fishingState.castTime = gameTime;
    fishingState.waiting = true;
    playSound('fish_cast');
    showNotification('Cast your line... wait for the bite!');
  }

  function finishFishing() {
    if (!fishingState.active) return;

    var reactionTime = gameTime - fishingState.castTime;
    var perfect = reactionTime <= FISHING_CATCH_WINDOW;

    var fishRoll = Math.random();
    if (state.inventory.indexOf('premium_bait') !== -1) fishRoll *= 0.75;
    var fishType = null;

    if (perfect && fishRoll < 0.15) {
      fishType = 'rainbowfin';
    } else if (perfect && fishRoll < 0.4) {
      var rareRoll = Math.random();
      fishType = rareRoll < 0.5 ? 'moon_puffer' : 'golden_glimmer';
    } else if (fishRoll < 0.4) {
      fishType = 'silver_dart';
    } else {
      fishType = 'glow_minnow';
    }

    var fish = GameData.fishTypes[fishType];
    state.fishCaught.push(fishType);
    state.totalFishCaught++;
    state.bugs += fish.value;
    state.totalBugsCollected += fish.value;

    playSound('fish_catch');
    showNotification('Caught a ' + fish.name + '! +' + fish.value + ' bugs');
    checkQuestProgress();

    if (fishType === 'rainbowfin' && state.achievements.indexOf('rainbow_champion') === -1) {
      unlockAchievement('rainbow_champion');
    }

    if (state.totalFishCaught >= 10 && state.achievements.indexOf('master_fisher') === -1) {
      unlockAchievement('master_fisher');
    }

    fishingState.active = false;
    fishingState.waiting = false;
    updateHUD();
  }

  function updateFishing(dt) {
    if (!fishingState.active) return;

    if (fishingState.waiting && gameTime - fishingState.castTime > FISHING_CAST_TIME) {
      playSound('fish_bite');
      fishingState.waiting = false;
      fishingState.castTime = gameTime;
      showNotification('Something bit! Press F now!');
    } else if (!fishingState.waiting && gameTime - fishingState.castTime > FISHING_CATCH_WINDOW) {
      fishingState.active = false;
      showNotification('Too slow! The fish got away.');
    }
  }

  // ====== NPC SYSTEM ======
  function checkNPCProximity() {
    var area = GameData.areas[areaId];
    var px = state.player.x + TILE / 2;
    var py = state.player.y + TILE / 2;
    nearestNPC = null;
    var minDist = NPC_INTERACT_DIST;
    for (var i = 0; i < area.npcs.length; i++) {
      var npcId = area.npcs[i];
      var npc = GameData.npcDefs[npcId];
      if (!npc) continue;
      var dx = px - (npc.x * TILE + TILE / 2);
      var dy = py - (npc.y * TILE + TILE / 2);
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; nearestNPC = npcId; }
    }
    dom.interactPrompt.style.display = nearestNPC && !dialogueOpen ? 'block' : 'none';
    // Update prompt text
    if (nearestNPC && !dialogueOpen) {
      dom.interactPrompt.textContent = 'Press ENTER to talk';
    } else if (nearestBug && !nearestNPC && !dialogueOpen) {
      dom.interactPrompt.textContent = 'Press SPACE to catch bug';
      dom.interactPrompt.style.display = 'block';
    } else if (areaId === 'twilight_grove' && isAtFishingSpot()) {
      dom.interactPrompt.textContent = 'Press F to fish';
      dom.interactPrompt.style.display = 'block';
    }
  }

  function openDialogue(npcId) {
    dialogueOpen = true;
    currentNPCId = npcId;
    lastShopItem = null;
    var npc = GameData.npcDefs[npcId];

    dom.dialogueBox.style.display = 'block';
    dom.npcName.textContent = npc.name;
    dom.npcPortrait.style.borderColor = npc.color;
    dom.npcPortrait.style.background = npc.color + '22';
    dom.npcPortrait.textContent = npc.name.charAt(0);
    dom.npcPortrait.style.color = npc.color;
    dom.dialogueMessages.innerHTML = '';
    dom.interactPrompt.style.display = 'none';

    if (!state.npcMemory[npcId]) state.npcMemory[npcId] = { talked: true, visits: 1 };
    else { state.npcMemory[npcId].talked = true; state.npcMemory[npcId].visits = (state.npcMemory[npcId].visits || 0) + 1; }

    var allNpcs = Object.keys(GameData.npcDefs);
    var talkedAll = allNpcs.every(function (id) { return state.npcMemory[id] && state.npcMemory[id].talked; });
    if (talkedAll && state.achievements.indexOf('conversationalist') === -1) unlockAchievement('conversationalist');

    // Contextual greeting
    var greeting = npc.greeting;
    var visits = state.npcMemory[npcId].visits;
    if (visits > 1 && visits <= 3) greeting = "Welcome back! " + greeting;
    else if (visits > 3) greeting = "Good to see you again, friend! What can I do for you?";

    addMessage('npc', greeting);
    playSound('talk');
    setTimeout(function () { dom.dialogueInput.focus(); }, 100);
  }

  function closeDialogue() {
    dialogueOpen = false;
    currentNPCId = null;
    dom.dialogueBox.style.display = 'none';
    dom.dialogueInput.value = '';
  }

  function addMessage(type, text) {
    var div = document.createElement('div');
    div.className = 'msg msg-' + type;
    div.textContent = text;
    dom.dialogueMessages.appendChild(div);
    dom.dialogueMessages.scrollTop = dom.dialogueMessages.scrollHeight;
  }

  // ====== IMPROVED DIALOGUE MATCHING ======
  function matchScore(input, keywords) {
    var lower = input.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    var words = lower.split(/\s+/);
    var score = 0;

    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      // Exact substring match (highest score)
      if (lower.indexOf(kw) !== -1) {
        score += 10 + kw.length;
        continue;
      }
      // Word-level match
      for (var w = 0; w < words.length; w++) {
        if (words[w] === kw) { score += 8; break; }
        // Starts with
        if (words[w].indexOf(kw) === 0 || kw.indexOf(words[w]) === 0) { score += 5; break; }
        // Fuzzy - Levenshtein distance 1
        if (words[w].length > 3 && kw.length > 3 && levenshtein(words[w], kw) <= 1) { score += 3; break; }
      }
    }
    return score;
  }

  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) matrix[i] = [i];
    for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        var cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[b.length][a.length];
  }

  function finishQuest(qId, npc, response) {
    var quest = GameData.quests[qId];
    var extraMessages = [];
    if (!quest) return;

    state.completedQuests.push(qId);
    delete state.activeQuests[qId];
    state.bugs += quest.reward;
    state.totalBugsCollected += quest.reward;

    if (quest.grantItem && state.inventory.indexOf(quest.grantItem) === -1) {
      state.inventory.push(quest.grantItem);
      extraMessages.push('Received item: ' + GameData.items[quest.grantItem].name + '!');
    }
    if (quest.unlockArea && state.unlockedAreas.indexOf(quest.unlockArea) === -1) {
      state.unlockedAreas.push(quest.unlockArea);
      extraMessages.push(GameData.areas[quest.unlockArea].name + ' is now reachable from Spawn Village.');
    }

    updateHUD();
    addMessage('npc', response || (npc && npc.questResponses[qId + '_complete']) || "Quest complete! Here's your reward!");
    addMessage('system', 'Quest completed: ' + quest.name + '! +' + quest.reward + ' bugs!');
    for (var i = 0; i < extraMessages.length; i++) addMessage('system', extraMessages[i]);

    if (qId === 'great_debug' && state.achievements.indexOf('legend') === -1) {
      unlockAchievement('legend');
    }
  }

  function detectPetType(lower) {
    if (lower.indexOf('duskwing') !== -1) return 'duskwing';
    if (lower.indexOf('moonfire') !== -1) return 'moonfire';
    if (lower.indexOf('dreamspinner') !== -1 || lower.indexOf('dream spinner') !== -1) return 'dreamspinner';
    return '';
  }

  function sendDialogue() {
    var input = dom.dialogueInput.value.trim();
    if (!input || !currentNPCId) return;
    dom.dialogueInput.value = '';
    addMessage('player', input);
    playSound('talk');

    var npc = GameData.npcDefs[currentNPCId];
    var lower = input.toLowerCase();
    var response = null;

    if (currentNPCId === 'luna_moth' && lower.indexOf('adopt') !== -1) {
      if (state.completedQuests.indexOf('moonfire_gathering') === -1) {
        addMessage('npc', 'The grove is not ready yet. Bring me 3 Moonfire Bugs first, then the night spirits will listen.');
        return;
      }
      var chosenPet = detectPetType(lower);
      if (!chosenPet) {
        addMessage('npc', "Tell me exactly who you wish to adopt: duskwing, moonfire, or dreamspinner.");
        return;
      }
      addMessage('npc', adoptPet(chosenPet));
      return;
    }

    // 1. Check quest answer (riddle)
    for (var t = 0; t < npc.topics.length; t++) {
      var topic = npc.topics[t];
      if (topic.questAnswer && state.activeQuests[topic.questAnswer] && !isQuestComplete(topic.questAnswer)) {
        if (matchScore(input, topic.kw) >= 8) {
          response = npc.questResponses[topic.questAnswer + '_complete'] || topic.text;
          playSound('quest');
          finishQuest(topic.questAnswer, npc, response);
          return;
        }
      }
    }

    // 2. Shop confirmation
    if (lastShopItem && lower.match(/\b(yes|yeah|sure|ok|buy|purchase|deal|take|want|please|yep|yup|definitely|absolutely)\b/)) {
      var itemDef = GameData.items[lastShopItem];
      if (state.inventory.indexOf(lastShopItem) !== -1) {
        response = "You already own the " + itemDef.name + "!";
      } else if (state.bugs >= itemDef.price) {
        state.bugs -= itemDef.price;
        state.inventory.push(lastShopItem);
        response = "Sold! One " + itemDef.name + " is yours! " + itemDef.desc + ". You have " + state.bugs + " bugs left.";
        playSound('purchase');
        var sysMsg = 'Purchased: ' + itemDef.name + '!';
        if (lastShopItem === 'portal_key' && state.unlockedAreas.indexOf('cloud_nine') === -1) {
          state.unlockedAreas.push('cloud_nine');
          sysMsg += ' Cloud Nine is now accessible from the Repository!';
        } else if (lastShopItem === 'fishing_rod') {
          sysMsg += ' Head to the Twilight Grove and press F to fish!';
        }
        addMessage('npc', response);
        addMessage('system', sysMsg);
        lastShopItem = null;
        updateHUD();
        if (state.inventory.length >= 3 && state.achievements.indexOf('big_spender') === -1) unlockAchievement('big_spender');
        return;
      } else {
        response = "Not enough bugs! You need " + itemDef.price + " but have " + state.bugs + ". Go catch some more!";
      }
      lastShopItem = null;
      addMessage('npc', response);
      return;
    }

    if (lower.match(/\b(no|nah|nope|nevermind|cancel|nvm)\b/) && lastShopItem) {
      lastShopItem = null;
      addMessage('npc', "No worries! Anything else catch your eye?");
      return;
    }

    // 3. Check quest turn-in
    for (var qId in state.activeQuests) {
      if (isQuestComplete(qId)) {
        var quest = GameData.quests[qId];
        if (quest.giver === currentNPCId) {
          response = npc.questResponses[qId + '_complete'] || "Quest complete! Here's your reward!";
          playSound('quest');
          finishQuest(qId, npc, response);
          return;
        }
      }
    }

    // 4. Topic matching with scoring
    var bestScore = 0;
    var bestTopic = null;
    for (var t = 0; t < npc.topics.length; t++) {
      var topic = npc.topics[t];
      if (topic.questAnswer) continue;
      var score = matchScore(input, topic.kw);
      if (score > bestScore) { bestScore = score; bestTopic = topic; }
    }

    if (bestTopic && bestScore >= 3) {
      response = bestTopic.text;

      // Quest trigger
      if (bestTopic.quest) {
        var qId = bestTopic.quest;
        if (state.completedQuests.indexOf(qId) !== -1) {
          response = "You've already completed that quest! Well done!";
        } else if (!state.activeQuests[qId]) {
          state.activeQuests[qId] = { started: Date.now(), readyNotified: false };
          addMessage('npc', response);
          addMessage('system', 'New quest: ' + GameData.quests[qId].name + ' - ' + GameData.quests[qId].desc);
          playSound('quest');
          updateHUD();
          return;
        }
      }

      // Shop item
      if (bestTopic.shopItem) {
        lastShopItem = bestTopic.shopItem;
        if (state.inventory.indexOf(lastShopItem) !== -1) {
          response = "You already have the " + GameData.items[lastShopItem].name + "!";
          lastShopItem = null;
        } else {
          response += "\n\nSay 'yes' to buy or 'no' to pass!";
        }
      }
    }

    // 5. Context-aware fallback responses
    if (!response) {
      response = getSmartFallback(npc, input, lower);
    }

    addMessage('npc', response);
  }

  function getSmartFallback(npc, input, lower) {
    // Try to give a contextual fallback rather than a generic one
    var words = lower.split(/\s+/);

    // Detect question patterns
    if (lower.match(/\b(where|how do i|how can|what should|which way)\b/)) {
      return "Hmm, I might not know exactly what you mean. Try asking about specific places like 'meadows', 'caves', 'repository', or 'cloud'. You can also ask about 'bugs', 'quests', or 'items'!";
    }
    if (lower.match(/\b(who are you|what are you|tell me about yourself)\b/)) {
      var nameKw = npc.topics.filter(function(t) { return t.kw.indexOf('who') !== -1 || t.kw.indexOf('name') !== -1; });
      if (nameKw.length > 0) return nameKw[0].text;
    }
    if (lower.match(/\b(what can i do|what now|bored|nothing|idk|help me)\b/)) {
      if (Object.keys(state.activeQuests).length > 0) {
        return "You've got active quests! Check your quest log with Q. Or explore new areas - have you been everywhere yet?";
      }
      return "Try asking me for a quest! Or explore the world - there are secrets, bug chains, fishing spots, and hidden zones to uncover. Say 'quest' to get started!";
    }
    if (lower.match(/\b(love|like|hate|feel|think|believe)\b/)) {
      return "That's a thoughtful sentiment! I appreciate you sharing. But I'm better with practical questions - try asking about quests, bugs, items, or the different areas!";
    }
    if (lower.match(/\b(joke|funny|laugh|lol|haha)\b/)) {
      var jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! Speaking of which, have you caught any lately?",
        "What's a bug's favorite music? The Beatles, naturally!",
        "I told a bug it was being collected... it said 'that's a feature, not a bug!'",
        "How many bugs does it take to change a lightbulb? None - they ARE the lightbulb in the Vibeverse!"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (words.length <= 2) {
      return "Could you tell me more? I respond best to questions about bugs, quests, items, places, or the world. Try 'help' for a rundown!";
    }

    return npc.defaultText;
  }

  // ====== QUEST SYSTEM ======
  function isQuestComplete(questId) {
    var q = GameData.quests[questId];
    if (!q) return false;
    switch (q.type) {
      case 'collect_bugs': return state.totalBugsCollected >= q.target;
      case 'visit_areas': return q.target.every(function (a) { return state.unlockedAreas.indexOf(a) !== -1; });
      case 'answer': return state.completedQuests.indexOf(questId) !== -1;
      case 'collect_specific_bug': return (state.bugLog[q.bugType] || 0) >= q.target;
      case 'catch_fish': return state.totalFishCaught >= q.target;
      case 'adopt_pet': return !!state.petBug;
      case 'combo': return (state.bestCombo || 0) >= q.target;
      default: return false;
    }
  }

  function checkQuestProgress() {
    for (var qId in state.activeQuests) {
      if (isQuestComplete(qId)) {
        var q = GameData.quests[qId];
        if (!state.activeQuests[qId].readyNotified) {
          state.activeQuests[qId].readyNotified = true;
          showNotification('Quest ready: ' + q.name + '! Talk to ' + GameData.npcDefs[q.giver].name);
        }
      }
    }
  }

  function getQuestProgressText(qId) {
    var q = GameData.quests[qId];
    if (!q) return '';
    if (isQuestComplete(qId)) return 'Ready to turn in';

    switch (q.type) {
      case 'collect_bugs':
        return state.totalBugsCollected + '/' + q.target + ' bugs';
      case 'visit_areas':
        var visited = q.target.filter(function (a) { return state.unlockedAreas.indexOf(a) !== -1; }).length;
        return visited + '/' + q.target.length + ' areas';
      case 'collect_specific_bug':
        return (state.bugLog[q.bugType] || 0) + '/' + q.target + ' ' + GameData.bugTypes[q.bugType].name;
      case 'catch_fish':
        return state.totalFishCaught + '/' + q.target + ' fish';
      case 'adopt_pet':
        return state.petBug ? 'Companion chosen' : 'No companion yet';
      case 'combo':
        return (state.bestCombo || 0) + '/' + q.target + ' chain';
      default:
        return 'In progress...';
    }
  }

  function getActiveObjectiveText() {
    var activeIds = Object.keys(state.activeQuests);
    if (activeIds.length > 0) {
      var q = GameData.quests[activeIds[0]];
      return q.name + ': ' + getQuestProgressText(activeIds[0]);
    }
    if (state.completedQuests.indexOf('first_catch') === -1) return 'Talk to Professor Semicolon to get started.';
    if (state.completedQuests.indexOf('hot_streak') === -1) return 'DJ Beatbyte wants a 4-bug chain.';
    if (state.unlockedAreas.indexOf('neon_garden') !== -1 && state.completedQuests.indexOf('glitch_glow') === -1) {
      return 'Visit the Neon Garden and help Remix Ren.';
    }
    if (canDash()) return 'Dash with SHIFT to keep your chains alive.';
    return 'Explore, fish, adopt a bug pal, and chase bigger combos.';
  }

  // ====== PORTAL SYSTEM ======
  function checkPortals() {
    var area = GameData.areas[areaId];
    var tx = Math.floor((state.player.x + TILE / 2) / TILE);
    var ty = Math.floor((state.player.y + PLAYER_OFFSET_Y) / TILE);
    for (var i = 0; i < area.portals.length; i++) {
      var p = area.portals[i];
      if (p.x === tx && p.y === ty) {
        if (p.requireItem && state.inventory.indexOf(p.requireItem) === -1) {
          showNotification('You need a ' + GameData.items[p.requireItem].name + ' to enter!');
          state.player.x -= (state.player.dir === 3 ? 5 : state.player.dir === 2 ? -5 : 0);
          state.player.y -= (state.player.dir === 0 ? 5 : state.player.dir === 1 ? -5 : 0);
          return;
        }
        if (GameData.areas[p.dest] && state.unlockedAreas.indexOf(p.dest) === -1) {
          showNotification('This area is locked!');
          state.player.x -= (state.player.dir === 3 ? 5 : state.player.dir === 2 ? -5 : 0);
          state.player.y -= (state.player.dir === 0 ? 5 : state.player.dir === 1 ? -5 : 0);
          return;
        }
        transition(p.dest, p.destX, p.destY);
        return;
      }
    }
  }

  function transition(destArea, destX, destY) {
    if (transitioning) return;
    transitioning = true;
    playSound('portal');
    dom.transitionOverlay.style.opacity = '1';
    setTimeout(function () {
      state.player.x = destX;
      state.player.y = destY;
      state.player.area = destArea;
      camera.x = destX - canvasW / 2;
      camera.y = destY - canvasH / 2;
      camera.targetX = camera.x;
      camera.targetY = camera.y;
      loadArea(destArea);
      setTimeout(function () {
        dom.transitionOverlay.style.opacity = '0';
        transitioning = false;
      }, 300);
    }, 300);
  }

  // ====== PARTICLES ======
  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vy !== undefined && !p.text) p.vy += 120 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ====== RENDERING ======
  function render() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (!started) { renderStartBG(); return; }

    if (!areaId || !currentMap) {
      return;
    }

    var area = GameData.areas[areaId];
    if (!area) { renderStartBG(); return; }
    var pal = area.palette;

    // Apply screen shake
    ctx.save();
    ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y));

    var startCol = Math.floor(camera.x / TILE);
    var endCol = Math.ceil((camera.x + canvasW) / TILE);
    var startRow = Math.floor(camera.y / TILE);
    var endRow = Math.ceil((camera.y + canvasH) / TILE);

    for (var row = startRow; row <= endRow; row++) {
      for (var col = startCol; col <= endCol; col++) {
        if (row < 0 || col < 0 || row >= currentMap.length || col >= currentMap[0].length) continue;
        var tile = currentMap[row][col];
        var sx = Math.floor(col * TILE - camera.x);
        var sy = Math.floor(row * TILE - camera.y);
        drawTile(tile, sx, sy, col, row, pal);
      }
    }

    // Render bugs
    for (var i = 0; i < bugs.length; i++) drawBugSprite(bugs[i]);

    // Render NPCs
    for (var i = 0; i < area.npcs.length; i++) drawNPC(area.npcs[i]);

    // Render player
    drawPlayer();

    // Render particles
    for (var i = 0; i < particles.length; i++) drawParticle(particles[i]);

    // Render pet bug
    if (state.petBug) drawPetBug();

    // Dark overlay for caves
    if (area.dark) drawDarkness();

    // Day/night overlay
    drawDayNightOverlay();

    ctx.restore();

    // Weather effects (not affected by screen shake)
    drawWeather();

    // Catch flash effect
    if (catchFlash.active && catchFlash.timer > 0) {
      var flashAlpha = Math.min(0.3, catchFlash.timer * 0.8);
      var gradient = ctx.createRadialGradient(canvasW/2, canvasH/2, 0, canvasW/2, canvasH/2, canvasW * 0.7);
      gradient.addColorStop(0, 'rgba(102, 187, 106, ' + flashAlpha + ')');
      gradient.addColorStop(0.5, 'rgba(41, 215, 255, ' + (flashAlpha * 0.5) + ')');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // Vibe mode overlay (not shaken)
    drawVibeOverlay();
  }

  function drawDayNightOverlay() {
    var isNight = isNightTime();
    if (!isNight && areaId !== 'twilight_grove') return;

    var darkness = isNight ? 0.4 : 0.15;
    if (areaId === 'twilight_grove') darkness = 0.25;

    ctx.fillStyle = 'rgba(10, 10, 30, ' + darkness + ')';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (isNight) {
      ctx.fillStyle = 'rgba(255, 255, 200, 0.03)';
      for (var s = 0; s < 30; s++) {
        var sx = ((s * 137) % canvasW);
        var sy = ((s * 89 + gameTime * 5) % canvasH);
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPetBug() {
    if (!state.petBug) return;
    var pet = GameData.petBugs[state.petBug];
    if (!pet) return;
    var petBugDef = getBugDef(state.petBug);

    var sx = state.player.x - camera.x + 24;
    var sy = state.player.y - camera.y + 8;
    var bob = Math.sin(gameTime * 4) * 2;

    var glowAlpha = 0.3 + Math.sin(gameTime * 3) * 0.15;
    var rgb = hexToRgb(pet.glowColor);
    ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + glowAlpha + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();

    if (art.bugSheet && art.bugSheet.complete && art.bugSheet.naturalWidth) {
      var petFrame = Math.floor((gameTime * 8) % 2);
      ctx.drawImage(
        art.bugSheet,
        petBugDef.sprite * 32, petFrame * 32, 32, 32,
        Math.floor(sx - 14), Math.floor(sy - 14 + bob), 28, 28
      );
      return;
    }

    ctx.fillStyle = pet.color;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    var wingF = Math.sin(gameTime * 8) * 0.4;
    ctx.fillStyle = pet.glowColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(sx - 3, sy - 2, 3, 5, -0.5 + wingF, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy - 2, 3, 5, 0.5 - wingF, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  function renderStartBG() {
    var t = performance.now() / 1000;
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvasW, canvasH);
    for (var i = 0; i < 40; i++) {
      var x = ((i * 137 + t * 20) % canvasW);
      var y = ((i * 97 + Math.sin(t + i) * 30 + t * 10) % canvasH);
      var alpha = 0.2 + Math.sin(t * 2 + i) * 0.15;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(102,187,106,' + alpha + ')' :
                      i % 3 === 1 ? 'rgba(79,195,247,' + alpha + ')' :
                                    'rgba(255,213,79,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(x, y, 2 + Math.sin(t + i) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ====== TILE RENDERING (IMPROVED) ======
  function drawTile(tile, sx, sy, col, row, pal) {
    var n = noise(col, row);

    switch (tile) {
      case GameData.T.GROUND:
        // Rich ground with variation
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Pebbles and details
        if (n > 0.8) {
          ctx.fillStyle = pal.groundAlt;
          ctx.fillRect(sx + 8 + (n * 12 | 0), sy + 6 + (n * 8 | 0), 3, 2);
          ctx.fillRect(sx + 20 + (n * 6 | 0), sy + 20 + (n * 4 | 0), 2, 2);
        }
        if (n > 0.6 && n < 0.7) {
          // Small dirt patch
          ctx.fillStyle = pal.path || '#8d6e63';
          ctx.globalAlpha = 0.15;
          ctx.fillRect(sx + 4, sy + 4, 12, 8);
          ctx.globalAlpha = 1;
        }
        // Tiny grass tufts
        if (n < 0.3) {
          ctx.fillStyle = pal.treeTop || '#43a047';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(sx + 14 + (n * 10 | 0), sy + 22, 2, 4);
          ctx.fillRect(sx + 18 + (n * 6 | 0), sy + 24, 2, 3);
          ctx.globalAlpha = 1;
        }
        break;

      case GameData.T.WALL:
        ctx.fillStyle = pal.wall;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Better brick pattern
        ctx.strokeStyle = pal.wallLine;
        ctx.lineWidth = 1;
        var brickH = TILE / 3;
        for (var br = 0; br < 3; br++) {
          var bOffset = br % 2 === 0 ? 0 : TILE / 2;
          ctx.strokeRect(sx + bOffset, sy + br * brickH, TILE / 2, brickH);
          ctx.strokeRect(sx + bOffset + TILE / 2, sy + br * brickH, TILE / 2, brickH);
        }
        // Highlight top edge
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(sx, sy, TILE, 2);
        // Shadow bottom edge
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        break;

      case GameData.T.WATER:
        var wt = gameTime * 2 + col * 0.5 + row * 0.3;
        ctx.fillStyle = pal.water;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Multiple wave lines
        ctx.fillStyle = pal.waterLight;
        var wave1 = Math.sin(wt) * 3;
        var wave2 = Math.sin(wt + 1.5) * 2;
        ctx.fillRect(sx + 4 + wave1, sy + 6, 8, 2);
        ctx.fillRect(sx + 18 - wave1, sy + 14, 10, 2);
        ctx.fillRect(sx + 8 + wave2, sy + 22, 6, 2);
        // Shimmer
        if (Math.sin(wt * 3) > 0.8) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(sx + 12 + wave1, sy + 10, 3, 2);
        }
        break;

      case GameData.T.PORTAL:
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        var pt = gameTime * 3 + col + row;
        // Swirling portal effect
        ctx.save();
        ctx.translate(sx + TILE / 2, sy + TILE / 2);
        for (var pr = 0; pr < 3; pr++) {
          var angle = pt + pr * 2.1;
          var radius = 8 + Math.sin(pt * 2 + pr) * 3;
          ctx.fillStyle = 'rgba(102, 187, 106, ' + (0.3 - pr * 0.08) + ')';
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // Arrow hint
        ctx.fillStyle = 'rgba(102, 187, 106, 0.6)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u2728', sx + TILE / 2, sy + TILE / 2 + 5);
        ctx.textAlign = 'left';
        break;

      case GameData.T.TREE:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(sx + 16, sy + 28, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(sx + 13, sy + 18, 6, 14);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(sx + 13, sy + 18, 2, 14);
        // Canopy layers
        ctx.fillStyle = pal.treeTop;
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 14, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.tree;
        ctx.beginPath();
        ctx.arc(sx + 13, sy + 12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.treeTop;
        ctx.beginPath();
        ctx.arc(sx + 19, sy + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(sx + 12, sy + 10, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case GameData.T.TALL_GRASS:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Dense grass blades
        var gt = gameTime * 2 + col * 0.7;
        var sway = Math.sin(gt) * 2;
        ctx.lineWidth = 2;
        for (var g = 0; g < 5; g++) {
          var gx = sx + 3 + g * 6;
          var gy = sy + TILE;
          var h = 12 + (g % 3) * 4;
          var hue = g % 2 === 0 ? '#66bb6a' : '#81c784';
          ctx.strokeStyle = hue;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + sway + (g % 2 ? 3 : -3), gy - h * 0.6, gx + sway * 1.5, gy - h);
          ctx.stroke();
        }
        // Sparkle particles
        var sparkle = Math.sin(gt * 1.5 + row * 3.7);
        if (sparkle > 0.6) {
          ctx.fillStyle = 'rgba(255, 255, 255, ' + ((sparkle - 0.6) * 2) + ')';
          ctx.fillRect(sx + 10 + Math.sin(gt * 2) * 6, sy + 8 + Math.cos(gt) * 4, 2, 2);
          ctx.fillRect(sx + 22 + Math.cos(gt * 1.3) * 4, sy + 14 + Math.sin(gt * 0.8) * 3, 2, 2);
        }
        break;

      case GameData.T.PATH:
        ctx.fillStyle = pal.path;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Stone texture
        ctx.fillStyle = pal.pathLine;
        if (n > 0.5) {
          ctx.fillRect(sx + 6, sy + 4, 8, 6);
          ctx.fillRect(sx + 16, sy + 14, 10, 8);
          ctx.fillRect(sx + 2, sy + 18, 8, 6);
        } else {
          ctx.fillRect(sx + 12, sy + 2, 10, 6);
          ctx.fillRect(sx + 2, sy + 10, 8, 8);
          ctx.fillRect(sx + 18, sy + 22, 8, 6);
        }
        // Subtle edge lines
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, TILE, 1);
        ctx.fillRect(sx, sy, 1, TILE);
        break;

      case GameData.T.FLOWERS:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        var colors = ['#ef5350', '#ffd54f', '#ce93d8', '#4fc3f7', '#ff7043'];
        // Stems first
        ctx.strokeStyle = '#43a047';
        ctx.lineWidth = 1;
        for (var f = 0; f < 4; f++) {
          var fx = sx + 5 + f * 7 + (n * 3 | 0);
          var fy = sy + TILE - 2;
          var fh = 10 + f * 3;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + (f % 2 ? 1 : -1), fy - fh);
          ctx.stroke();
          // Flower
          ctx.fillStyle = colors[(col + row + f) % colors.length];
          ctx.beginPath();
          ctx.arc(fx + (f % 2 ? 1 : -1), fy - fh, 3, 0, Math.PI * 2);
          ctx.fill();
          // Center dot
          ctx.fillStyle = '#fff9c4';
          ctx.beginPath();
          ctx.arc(fx + (f % 2 ? 1 : -1), fy - fh, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case GameData.T.BOOKSHELF:
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(sx, sy, TILE, TILE);
        // Better books
        var bookColors = ['#e53935', '#42a5f5', '#66bb6a', '#ffd54f', '#ab47bc', '#ff7043'];
        for (var shelf = 0; shelf < 2; shelf++) {
          var shY = sy + shelf * (TILE / 2) + 2;
          for (var bk = 0; bk < 5; bk++) {
            var bw = 4 + (n * 2 | 0);
            var bh = TILE / 2 - 5;
            ctx.fillStyle = bookColors[(col + row + bk + shelf * 3) % bookColors.length];
            ctx.fillRect(sx + 2 + bk * 6, shY, bw, bh);
          }
        }
        // Shelf divider
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(sx, sy + TILE / 2 - 1, TILE, 3);
        // Wood grain
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        break;

      case GameData.T.CRYSTAL:
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        var ct = gameTime * 1.5 + col + row;
        var glow = 0.5 + Math.sin(ct) * 0.3;
        // Crystal body
        ctx.fillStyle = 'rgba(149, 117, 205, ' + glow + ')';
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 2);
        ctx.lineTo(sx + 26, sy + 18);
        ctx.lineTo(sx + 20, sy + 30);
        ctx.lineTo(sx + 12, sy + 30);
        ctx.lineTo(sx + 6, sy + 18);
        ctx.closePath();
        ctx.fill();
        // Highlight facet
        ctx.fillStyle = 'rgba(206, 147, 216, ' + (glow * 0.6) + ')';
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 2);
        ctx.lineTo(sx + 22, sy + 14);
        ctx.lineTo(sx + 16, sy + 20);
        ctx.lineTo(sx + 10, sy + 14);
        ctx.closePath();
        ctx.fill();
        // Point of light
        ctx.fillStyle = 'rgba(255,255,255,' + (glow * 0.4) + ')';
        ctx.fillRect(sx + 14, sy + 8, 3, 3);
        break;

      case GameData.T.CLOUD:
        ctx.fillStyle = '#e3f2fd';
        ctx.fillRect(sx, sy, TILE, TILE);
        if (n > 0.4) {
          ctx.fillStyle = '#bbdefb';
          ctx.beginPath();
          ctx.arc(sx + 10 + n * 12, sy + 10 + n * 12, 6 + n * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // Cloud edge glow
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(sx, sy, TILE, 2);
        break;

      case GameData.T.VOID:
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(sx, sy, TILE, TILE);
        // Stars
        if (n > 0.85) {
          var st = gameTime + col * row * 0.1;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(st * 2) * 0.2) + ')';
          ctx.fillRect(sx + (n * 24 | 0), sy + (n * 20 | 0), 2, 2);
        }
        if (n > 0.7 && n < 0.75) {
          ctx.fillStyle = 'rgba(79,195,247,0.15)';
          ctx.fillRect(sx + 8, sy + 12, 4, 1);
        }
        break;

      case GameData.T.DARK:
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx, sy, TILE, TILE);
        if (n > 0.7) {
          ctx.fillStyle = '#16213e';
          ctx.fillRect(sx + (n * 20 | 0), sy + (n * 16 | 0), 4, 3);
        }
        // Scattered rocks
        if (n < 0.15) {
          ctx.fillStyle = '#2c2c54';
          ctx.fillRect(sx + 10, sy + 20, 6, 4);
        }
        break;

      case GameData.T.HOUSE:
        // Proper building wall with roof
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(sx, sy + 6, TILE, TILE - 6);
        // Roof
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(sx - 2, sy, TILE + 4, 8);
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(sx - 2, sy + 6, TILE + 4, 2);
        // Window
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(sx + 10, sy + 12, 12, 10);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 10, sy + 12, 12, 10);
        // Window cross
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 12);
        ctx.lineTo(sx + 16, sy + 22);
        ctx.moveTo(sx + 10, sy + 17);
        ctx.lineTo(sx + 22, sy + 17);
        ctx.stroke();
        // Window glow
        ctx.fillStyle = 'rgba(255, 249, 196, 0.3)';
        ctx.fillRect(sx + 11, sy + 13, 4, 3);
        break;

      case GameData.T.LAMP_POST:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Post
        ctx.fillStyle = '#455a64';
        ctx.fillRect(sx + 14, sy + 12, 4, 20);
        ctx.fillRect(sx + 12, sy + 10, 8, 4);
        // Light glow
        var lampTime = gameTime * 2 + col * 0.5;
        var lampGlow = 0.4 + Math.sin(lampTime) * 0.15;
        ctx.fillStyle = 'rgba(255, 213, 79, ' + lampGlow + ')';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 213, 79, ' + (lampGlow * 0.3) + ')';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 16, 0, Math.PI * 2);
        ctx.fill();
        break;

      case GameData.T.POND:
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        var pt = gameTime * 1.5 + col + row;
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        // Water ripples
        ctx.fillStyle = '#2e5a8f';
        var rx1 = Math.sin(pt) * 2;
        var ry1 = Math.cos(pt) * 2;
        ctx.beginPath();
        ctx.ellipse(sx + 10 + rx1, sy + 10 + ry1, 4, 2, pt * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 22 - rx1, sy + 20 - ry1, 3, 1.5, -pt * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Lily pads
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(sx + 8, sy + 16, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 24, sy + 8, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case GameData.T.FLOWER_CLUSTER:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        var fcolors = ['#e91e63', '#9c27b0', '#ff5722', '#ffeb3b'];
        for (var fc = 0; fc < 4; fc++) {
          var fx = sx + 4 + fc * 7 + (n * 4 | 0);
          var fy = sy + TILE - 4;
          ctx.fillStyle = '#43a047';
          ctx.fillRect(fx - 1, fy - 8, 2, 8);
          ctx.fillStyle = fcolors[(col + row + fc) % fcolors.length];
          ctx.beginPath();
          ctx.arc(fx, fy - 10, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff9c4';
          ctx.beginPath();
          ctx.arc(fx, fy - 10, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case GameData.T.ROCK:
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Rock body
        ctx.fillStyle = '#546e7a';
        ctx.beginPath();
        ctx.ellipse(sx + 16, sy + 20, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.ellipse(sx + 14, sy + 18, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // ====== ENTITY RENDERING ======
  function drawBugSprite(bug) {
    var bugDef = getBugDef(bug.bugType);
    var sx = Math.floor(bug.x - camera.x);
    var sy = Math.floor(bug.y - camera.y + Math.sin(bug.bobOffset) * 3);

    // Glow
    var glowAlpha = 0.15 + Math.sin(bug.glowPhase) * 0.1;
    var glow = hexToRgb(bugDef.glow);
    ctx.fillStyle = 'rgba(' + glow.r + ',' + glow.g + ',' + glow.b + ',' + glowAlpha + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.fill();

    if (art.bugSheet && art.bugSheet.complete && art.bugSheet.naturalWidth) {
      var frame = Math.floor((gameTime * 10 + bug.bobOffset) % 2);
      ctx.drawImage(
        art.bugSheet,
        bugDef.sprite * 32, frame * 32, 32, 32,
        Math.floor(sx - 16), Math.floor(sy - 16), 32, 32
      );
      if (bug.fleeing) {
        ctx.fillStyle = 'rgba(255,82,82,0.7)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', sx, sy - 12);
        ctx.textAlign = 'left';
      }
      return;
    }

    // Wings (animated)
    var wingAngle = Math.sin(bug.bobOffset * 6) * 0.3;
    var wing = hexToRgb(bugDef.wing);
    ctx.fillStyle = 'rgba(' + wing.r + ',' + wing.g + ',' + wing.b + ',0.5)';
    ctx.beginPath();
    ctx.ellipse(sx - 3, sy - 3, 4, 6, -0.5 + wingAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy - 3, 4, 6, 0.5 - wingAngle, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bug.fleeing ? '#ff8a65' : bugDef.color;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stripes
    ctx.fillStyle = bug.fleeing ? '#e64a19' : bugDef.glow;
    ctx.fillRect(sx - 2, sy - 1, 4, 1);
    ctx.fillRect(sx - 3, sy + 1, 6, 1);

    // Head
    ctx.fillStyle = bug.fleeing ? '#e64a19' : bugDef.color;
    ctx.beginPath();
    ctx.arc(sx - 5, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx - 7, sy - 2, 2, 2);
    ctx.fillRect(sx - 5, sy - 2, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - 7, sy - 1, 1, 1);
    ctx.fillRect(sx - 4, sy - 1, 1, 1);

    // Legs
    ctx.strokeStyle = bug.fleeing ? '#e64a19' : '#f9a825';
    ctx.lineWidth = 1;
    var legWave = Math.sin(bug.bobOffset * 4) * 2;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy + 3); ctx.lineTo(sx - 5, sy + 6 + legWave);
    ctx.moveTo(sx + 1, sy + 3); ctx.lineTo(sx + 4, sy + 6 - legWave);
    ctx.moveTo(sx + 3, sy + 2); ctx.lineTo(sx + 7, sy + 5 + legWave);
    ctx.stroke();

    // Antennae
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy - 2); ctx.lineTo(sx - 10, sy - 7);
    ctx.moveTo(sx - 5, sy - 3); ctx.lineTo(sx - 8, sy - 8);
    ctx.stroke();

    // Flee indicator
    if (bug.fleeing) {
      ctx.fillStyle = 'rgba(255,82,82,0.7)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - 12);
      ctx.textAlign = 'left';
    }
  }

  function drawNPC(npcId) {
    var npc = GameData.npcDefs[npcId];
    if (!npc) return;
    var sx = Math.floor(npc.x * TILE - camera.x);
    var sy = Math.floor(npc.y * TILE - camera.y);
    var bob = Math.sin(npcBobTimer * 1.5 + npc.x) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 30, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = npc.color;
    ctx.fillRect(sx + 8, sy + 14 + bob, 16, 14);
    // Body shading
    ctx.fillStyle = npc.accent;
    ctx.fillRect(sx + 8, sy + 14 + bob, 4, 14);

    // Head
    ctx.fillStyle = '#ffe0b2';
    ctx.fillRect(sx + 9, sy + 4 + bob, 14, 12);
    // Cheeks
    ctx.fillStyle = 'rgba(255,138,101,0.3)';
    ctx.fillRect(sx + 9, sy + 10 + bob, 3, 3);
    ctx.fillRect(sx + 20, sy + 10 + bob, 3, 3);

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(sx + 12, sy + 8 + bob, 3, 3);
    ctx.fillRect(sx + 18, sy + 8 + bob, 3, 3);
    // Eye highlights
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx + 13, sy + 8 + bob, 1, 1);
    ctx.fillRect(sx + 19, sy + 8 + bob, 1, 1);

    // Mouth
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(sx + 14, sy + 12 + bob, 5, 1);

    // Hair/hat
    ctx.fillStyle = npc.accent;
    ctx.fillRect(sx + 8, sy + 2 + bob, 16, 5);
    ctx.fillRect(sx + 7, sy + 5 + bob, 18, 2);

    // Feet
    ctx.fillStyle = npc.accent;
    ctx.fillRect(sx + 9, sy + 28 + bob, 6, 3);
    ctx.fillRect(sx + 17, sy + 28 + bob, 6, 3);

    // Name tag when near
    if (nearestNPC === npcId) {
      ctx.font = '8px "Press Start 2P", monospace';
      var nameW = ctx.measureText(npc.name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(sx + 16 - nameW / 2 - 6, sy - 14 + bob, nameW + 12, 16);
      ctx.fillStyle = npc.color;
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, sx + 16, sy - 2 + bob);
      ctx.textAlign = 'left';
    }

    // Quest indicator (!)
    var hasQuest = false;
    Object.keys(GameData.quests).forEach(function (qId) {
      var q = GameData.quests[qId];
      if (q.giver === npcId) {
        if (state.completedQuests.indexOf(qId) === -1 && !state.activeQuests[qId]) hasQuest = true;
        if (state.activeQuests[qId] && isQuestComplete(qId)) hasQuest = true;
      }
    });
    if (hasQuest && nearestNPC !== npcId) {
      var excBob = Math.sin(gameTime * 4) * 3;
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx + 16, sy - 4 + excBob + bob);
      ctx.textAlign = 'left';
    }
  }

  function drawPlayer() {
    var sx = Math.floor(state.player.x - camera.x);
    var sy = Math.floor(state.player.y - camera.y);
    var bob = walkFrame % 2 === 1 ? -1 : 0;
    var dir = state.player.dir;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 30, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (art.playerSheet && art.playerSheet.complete && art.playerSheet.naturalWidth) {
      var spriteFrame = walkFrame === 1 || walkFrame === 3 ? 1 : 0;
      var frameIndex = dir * 2 + spriteFrame;
      ctx.drawImage(
        art.playerSheet,
        frameIndex * 32, 0, 32, 32,
        sx, sy + bob, 32, 32
      );
    } else {

      // Body
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(sx + 8, sy + 14 + bob, 16, 14);
      ctx.fillStyle = '#039be5';
      ctx.fillRect(sx + 8, sy + 14 + bob, 4, 14);

      // Belt
      ctx.fillStyle = '#0288d1';
      ctx.fillRect(sx + 8, sy + 22 + bob, 16, 2);

      // Head
      ctx.fillStyle = '#ffe0b2';
      ctx.fillRect(sx + 9, sy + 4 + bob, 14, 12);

      // Eyes based on direction
      ctx.fillStyle = '#1a1a2e';
      if (dir === 1) {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(sx + 9, sy + 6 + bob, 14, 4);
      } else if (dir === 2) {
        ctx.fillRect(sx + 10, sy + 8 + bob, 3, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 11, sy + 8 + bob, 1, 1);
      } else if (dir === 3) {
        ctx.fillRect(sx + 19, sy + 8 + bob, 3, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 20, sy + 8 + bob, 1, 1);
      } else {
        ctx.fillRect(sx + 12, sy + 8 + bob, 3, 3);
        ctx.fillRect(sx + 18, sy + 8 + bob, 3, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 13, sy + 8 + bob, 1, 1);
        ctx.fillRect(sx + 19, sy + 8 + bob, 1, 1);
      }

      // Hair
      ctx.fillStyle = '#5c6bc0';
      ctx.fillRect(sx + 8, sy + 2 + bob, 16, 5);
      ctx.fillRect(sx + 7, sy + 4 + bob, 2, 4);

      // Feet (animated)
      ctx.fillStyle = '#37474f';
      if (walkFrame === 1) {
        ctx.fillRect(sx + 7, sy + 28, 7, 3);
        ctx.fillRect(sx + 18, sy + 28, 7, 3);
      } else if (walkFrame === 3) {
        ctx.fillRect(sx + 10, sy + 28, 7, 3);
        ctx.fillRect(sx + 15, sy + 28, 7, 3);
      } else {
        ctx.fillRect(sx + 9, sy + 28, 6, 3);
        ctx.fillRect(sx + 17, sy + 28, 6, 3);
      }
    }

    // Net swing animation
    if (swingAnim > 0) {
      var swingAngle = (1 - swingAnim / 0.3) * Math.PI * 0.8 - 0.4;
      ctx.save();
      ctx.translate(sx + 16, sy + 16 + bob);
      ctx.rotate(swingAngle);
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(20, -10);
      ctx.stroke();
      // Net circle
      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(22, -12, 8, 0, Math.PI * 2);
      ctx.stroke();
      // Net mesh lines
      ctx.strokeStyle = 'rgba(165, 214, 167, 0.4)';
      ctx.beginPath();
      ctx.moveTo(18, -18); ctx.lineTo(26, -6);
      ctx.moveTo(16, -12); ctx.lineTo(28, -12);
      ctx.stroke();
      ctx.restore();
    }

    // Lantern glow in caves
    if (state.inventory.indexOf('lantern') !== -1 && GameData.areas[areaId].dark) {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.06)';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 16, 130, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticle(p) {
    var sx = Math.floor(p.x - camera.x);
    var sy = Math.floor(p.y - camera.y);
    var alpha = p.life / p.maxLife;

    if (p.text) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = 'bold ' + p.size + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, sx, sy);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      var s = p.size * alpha;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  function drawDarkness() {
    var hasLantern = state.inventory.indexOf('lantern') !== -1;
    var px = Math.floor(state.player.x + 16 - camera.x);
    var py = Math.floor(state.player.y + 16 - camera.y);
    var innerR = hasLantern ? 70 : 35;
    var outerR = hasLantern ? 220 : 110;
    var darkness = hasLantern ? 0.8 : 0.93;
    var grad = ctx.createRadialGradient(px, py, innerR, px, py, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,' + (darkness * 0.5) + ')');
    grad.addColorStop(1, 'rgba(0,0,0,' + darkness + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ====== MINIMAP ======
  function drawMinimap() {
    if (!currentMap) return;
    var mw = currentMap[0].length;
    var mh = currentMap.length;
    var s = 3;
    minimapCanvas.width = mw * s;
    minimapCanvas.height = mh * s;
    for (var y = 0; y < mh; y++) {
      for (var x = 0; x < mw; x++) {
        var tile = currentMap[y][x];
        switch (tile) {
          case GameData.T.WALL: minimapCtx.fillStyle = '#444'; break;
          case GameData.T.WATER: minimapCtx.fillStyle = '#1565c0'; break;
          case GameData.T.TREE: minimapCtx.fillStyle = '#2e7d32'; break;
          case GameData.T.TALL_GRASS: minimapCtx.fillStyle = '#43a047'; break;
          case GameData.T.PATH: minimapCtx.fillStyle = '#c8a96e'; break;
          case GameData.T.PORTAL: minimapCtx.fillStyle = '#66bb6a'; break;
          case GameData.T.BOOKSHELF: minimapCtx.fillStyle = '#5d4037'; break;
          case GameData.T.CRYSTAL: minimapCtx.fillStyle = '#7b1fa2'; break;
          case GameData.T.CLOUD: minimapCtx.fillStyle = '#bbdefb'; break;
          case GameData.T.VOID: minimapCtx.fillStyle = '#0a0a15'; break;
          case GameData.T.DARK: minimapCtx.fillStyle = '#16213e'; break;
          case GameData.T.HOUSE: minimapCtx.fillStyle = '#6d4c41'; break;
          case GameData.T.FLOWERS: minimapCtx.fillStyle = '#4a7c2e'; break;
          default: minimapCtx.fillStyle = '#2d5016'; break;
        }
        minimapCtx.fillRect(x * s, y * s, s, s);
      }
    }
    var area = GameData.areas[areaId];
    area.npcs.forEach(function (npcId) {
      var npc = GameData.npcDefs[npcId];
      if (!npc) return;
      minimapCtx.fillStyle = npc.color;
      minimapCtx.fillRect(npc.x * s, npc.y * s, s, s);
    });
  }

  function updateMinimapPlayer() {
    if (!minimapCtx || !currentMap) return;
    drawMinimap();
    var px = Math.floor(state.player.x / TILE) * 3;
    var py = Math.floor(state.player.y / TILE) * 3;
    minimapCtx.fillStyle = '#ff5252';
    minimapCtx.fillRect(px, py, 3, 3);
  }

  // ====== VIBE OVERLAY ======
  function drawVibeOverlay() {
    if (vibeMode.intensity <= 0) return;
    var a = vibeMode.intensity;
    var pulse = 0.3 + Math.sin(gameTime * 8) * 0.15;
    var edge = 60 * a;
    var grad;
    // Top - cyan
    grad = ctx.createLinearGradient(0, 0, 0, edge);
    grad.addColorStop(0, 'rgba(41,215,255,' + (pulse * a) + ')');
    grad.addColorStop(1, 'rgba(41,215,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvasW, edge);
    // Bottom - magenta
    grad = ctx.createLinearGradient(0, canvasH, 0, canvasH - edge);
    grad.addColorStop(0, 'rgba(255,77,141,' + (pulse * a) + ')');
    grad.addColorStop(1, 'rgba(255,77,141,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, canvasH - edge, canvasW, edge);
    // Left - green
    grad = ctx.createLinearGradient(0, 0, edge, 0);
    grad.addColorStop(0, 'rgba(102,187,106,' + (pulse * a * 0.7) + ')');
    grad.addColorStop(1, 'rgba(102,187,106,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, edge, canvasH);
    // Right - gold
    grad = ctx.createLinearGradient(canvasW, 0, canvasW - edge, 0);
    grad.addColorStop(0, 'rgba(255,213,79,' + (pulse * a * 0.7) + ')');
    grad.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = grad; ctx.fillRect(canvasW - edge, 0, edge, canvasH);
    // Text
    if (vibeMode.active) {
      var tp = 0.7 + Math.sin(gameTime * 6) * 0.3;
      ctx.globalAlpha = tp * a;
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#29d7ff'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff4d8d';
      ctx.fillText('VIBE MODE', canvasW / 2, 46);
      ctx.fillStyle = '#29d7ff';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('x2 BUGS \u2022 CHAIN ' + comboState.count, canvasW / 2, 62);
      ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  // ====== WEATHER SYSTEM ======
  function updateWeather(dt) {
    // Only spawn weather in outdoor areas
    var noWeatherAreas = ['null_caves', 'repository', 'cloud_nine'];
    if (noWeatherAreas.indexOf(areaId) !== -1) {
      weather.active = false;
      weather.particles = [];
      return;
    }
    
    if (!weather.active) {
      var seed = Math.floor(gameTime / 30);
      if (seed % 3 === 0) {
        weather.type = 'rain';
        weather.active = true;
        weather.duration = 15 + Math.random() * 10;
        weather.particles = [];
      } else if (seed % 7 === 0) {
        weather.type = 'snow';
        weather.active = true;
        weather.duration = 12 + Math.random() * 8;
        weather.particles = [];
      }
    }
    
    if (weather.active) {
      weather.duration -= dt;
      if (weather.duration <= 0) {
        weather.active = false;
        weather.particles = [];
      } else {
        while (weather.particles.length < 50) {
          weather.particles.push({
            x: Math.random() * canvasW,
            y: -10,
            speed: 2 + Math.random() * 3,
            drift: (Math.random() - 0.5) * 0.5
          });
        }
      }
    }
    
    for (var i = 0; i < weather.particles.length; i++) {
      var p = weather.particles[i];
      p.y += p.speed;
      p.x += p.drift;
    }
    weather.particles = weather.particles.filter(function(p) { return p.y < canvasH + 10; });
  }

  function drawWeather() {
    if (!weather.active) return;
    
    if (weather.type === 'rain') {
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < weather.particles.length; i++) {
        var p = weather.particles[i];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 2, p.y + 15);
      }
      ctx.stroke();
    } else if (weather.type === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (var j = 0; j < weather.particles.length; j++) {
        var s = weather.particles[j];
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ====== BESTIARY ======
  function toggleBestiary() {
    bestiaryOpen = !bestiaryOpen;
    dom.bestiaryPanel.style.display = bestiaryOpen ? 'block' : 'none';
    if (bestiaryOpen) renderBestiary();
  }

  function renderBestiary() {
    var grid = dom.bestiaryPanel.querySelector('.bestiary-grid');
    var progress = dom.bestiaryPanel.querySelector('.bestiary-progress');
    grid.innerHTML = '';
    var allBugs = Object.keys(GameData.bugTypes);
    var discovered = state.discoveredBugTypes || [];
    progress.textContent = discovered.length + ' / ' + allBugs.length + ' species discovered';
    allBugs.forEach(function (bugId) {
      var def = GameData.bugTypes[bugId];
      var found = discovered.indexOf(bugId) !== -1;
      var count = state.bugLog[bugId] || 0;
      var div = document.createElement('div');
      div.className = 'bestiary-entry' + (found ? '' : ' undiscovered');
      var colorBg = found ? def.glow + '33' : '#222';
      div.innerHTML =
        '<div class="bestiary-bug-icon" style="background:' + colorBg + '">' +
          '<span style="font-size:18px;color:' + (found ? def.color : '#333') + '">' + (found ? '\uD83D\uDC1B' : '?') + '</span>' +
        '</div>' +
        '<div class="bestiary-info">' +
          '<div class="bestiary-name">' + (found ? def.name : '???') + '</div>' +
          '<div class="bestiary-meta">' +
            (found ? '<span class="rarity-' + def.rarity + '">' + def.rarity + '</span> \u00B7 ' + def.value + ' bug' + (def.value > 1 ? 's' : '') + ' \u00B7 spd ' + def.speed : 'Not yet discovered') +
          '</div>' +
        '</div>' +
        (found ? '<div class="bestiary-count">x' + count + '</div>' : '');
      grid.appendChild(div);
    });
  }

  // ====== UI ======
  function updateHUD() {
    if (!state) return;
    dom.bugCount.textContent = state.bugs;
    dom.areaName.textContent = GameData.areas[areaId] ? GameData.areas[areaId].name : '';
    if (dom.objectiveDisplay) dom.objectiveDisplay.textContent = getActiveObjectiveText();
    if (dom.comboDisplay) {
      dom.comboDisplay.textContent = comboState.count > 1 ? 'Chain x' + comboState.count : 'Chain Ready';
      dom.comboDisplay.dataset.hot = comboState.count > 1 ? 'true' : 'false';
    }
    if (dom.dashDisplay) {
      if (!canDash()) dom.dashDisplay.textContent = 'Dash Locked';
      else if (dashState.cooldown > 0) dom.dashDisplay.textContent = 'Dash ' + dashState.cooldown.toFixed(1) + 's';
      else dom.dashDisplay.textContent = 'Dash Ready';
      dom.dashDisplay.dataset.state = !canDash() ? 'locked' : (dashState.cooldown > 0 ? 'cooldown' : 'ready');
    }
    var activeCount = Object.keys(state.activeQuests).length;
    if (activeCount > 0) {
      dom.questIndicator.style.display = 'block';
      dom.questIndicator.textContent = activeCount + ' quest' + (activeCount > 1 ? 's' : '');
    } else {
      dom.questIndicator.style.display = 'none';
    }
    if (dom.goldenBugs) {
      var gb = state.goldenBugs || 0;
      dom.goldenBugs.textContent = gb + ' Golden';
      dom.goldenBugs.style.display = gb > 0 ? 'block' : 'none';
    }
    updateMinimapPlayer();
  }

  function showNotification(text) {
    dom.notification.textContent = text;
    dom.notification.style.display = 'block';
    notifTimer = 3;
  }

  function triggerGreatDebugMilestone() {
    transitioning = true;
    var overlay = dom.transitionOverlay;
    overlay.style.transition = 'opacity 2s';
    overlay.style.opacity = '1';
    
    setTimeout(function() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      
      var glTitle = document.createElement('div');
      glTitle.id = 'great-debug-title';
      glTitle.innerHTML = '<span>THE</span><span>GREAT</span><span>DEBUG</span>';
      glTitle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-pixel);font-size:32px;color:#66bb6a;text-align:center;animation:glowPulse 2s infinite;';
      document.getElementById('game-container').appendChild(glTitle);
      
      var style = document.createElement('style');
      style.textContent = '@keyframes glowPulse{0%,100%{text-shadow:0 0 20px #66bb6a,0 0 40px #66bb6a}50%{text-shadow:0 0 40px #66bb6a,0 0 80px #66bb6a,0 0 120px #29d7ff}}';
      document.head.appendChild(style);
      
      showNotification('You are now a Legend of the Vibeverse!');
      
      setTimeout(function() {
        state.achievements.push('legend');
        unlockAchievement('legend');
        transitioning = false;
        overlay.style.transition = 'opacity 1s';
        overlay.style.opacity = '0';
        if (glTitle.parentNode) glTitle.parentNode.removeChild(glTitle);
      }, 4000);
    }, 2000);
  }

  function triggerGreatDebugEnding() {
    transitioning = true;
    var overlay = dom.transitionOverlay;
    overlay.style.transition = 'opacity 2s';
    overlay.style.opacity = '1';
    
    setTimeout(function() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      
      var glTitle = document.createElement('div');
      glTitle.id = 'great-debug-title';
      glTitle.innerHTML = '<span>THE</span><span>GREAT</span><span>DEBUG</span>';
      glTitle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-pixel);font-size:32px;color:#66bb6a;text-align:center;animation:glowPulse 2s infinite;';
      document.getElementById('game-container').appendChild(glTitle);
      
      var style = document.createElement('style');
      style.textContent = '@keyframes glowPulse{0%,100%{text-shadow:0 0 20px #66bb6a,0 0 40px #66bb6a}50%{text-shadow:0 0 40px #66bb6a,0 0 80px #66bb6a,0 0 120px #29d7ff}}';
      document.head.appendChild(style);
      
      showNotification('You have optimized the Vibeverse. You are now a Legend.');
      
      setTimeout(function() {
        state.achievements.push('legend');
        unlockAchievement('legend');
        transitioning = false;
        overlay.style.transition = 'opacity 1s';
        overlay.style.opacity = '0';
        if (glTitle.parentNode) glTitle.parentNode.removeChild(glTitle);
      }, 4000);
    }, 2000);
  }

  function unlockAchievement(id) {
    state.achievements.push(id);
    var def = GameData.achievementDefs.find(function (a) { return a.id === id; });
    if (!def) return;
    dom.achievePopup.querySelector('.ach-name').textContent = def.name;
    dom.achievePopup.style.display = 'block';
    achieveTimer = 4;
    playSound('achieve');
    showNotification(def.desc);
  }

  function toggleInventory() {
    inventoryOpen = !inventoryOpen;
    dom.inventoryPanel.style.display = inventoryOpen ? 'block' : 'none';
    if (inventoryOpen) renderInventory();
  }

  function renderInventory() {
    dom.inventoryGrid.innerHTML = '';
    if (state.inventory.length === 0) {
      dom.inventoryGrid.innerHTML = '<div id="inventory-empty">No items yet. Visit Vendor Vivian in Spawn Village!</div>';
    } else {
      var icons = { 
        bug_net: '\uD83E\uDD8B', 
        lantern: '\uD83D\uDD26', 
        speed_boots: '\uD83D\uDC62', 
        bug_magnet: '\uD83E\uDDF2', 
        portal_key: '\uD83D\uDD11',
        fishing_rod: '\uD83C\uDFA3',
        premium_bait: '\uD83E\uDD7E',
        fish_jar: '\uD83E\uDED9',
        moon_lantern: '\uD83C\uDF19',
        pulse_pack: '\u26A1'
      };
      state.inventory.forEach(function (itemId) {
        var item = GameData.items[itemId];
        if (!item) return;
        var div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = '<div class="inv-item-icon">' + (icons[itemId] || '?') + '</div>' +
          '<div class="inv-item-name">' + item.name + '</div>' +
          '<div class="inv-item-desc">' + item.desc + '</div>';
        dom.inventoryGrid.appendChild(div);
      });
    }

    if (state.discoveredBugTypes && state.discoveredBugTypes.length > 0) {
      var codexDiv = document.createElement('div');
      codexDiv.className = 'inv-item';
      codexDiv.style.borderColor = '#ff9f68';
      codexDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDCD6</div>' +
        '<div class="inv-item-name">Bug Codex</div>' +
        '<div class="inv-item-desc">' + state.discoveredBugTypes.length + ' species found</div>';
      dom.inventoryGrid.appendChild(codexDiv);
    }

    if (state.petBug) {
      var pet = GameData.petBugs[state.petBug];
      var petDiv = document.createElement('div');
      petDiv.className = 'inv-item';
      petDiv.style.borderColor = pet.color;
      petDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDC1F</div>' +
        '<div class="inv-item-name">' + pet.name + '</div>' +
        '<div class="inv-item-desc">' + pet.special + '</div>';
      dom.inventoryGrid.appendChild(petDiv);
    }

    if (state.fishCaught && state.fishCaught.length > 0) {
      var fishCount = {};
      state.fishCaught.forEach(function(f) { fishCount[f] = (fishCount[f] || 0) + 1; });
      var fishDiv = document.createElement('div');
      fishDiv.className = 'inv-item';
      fishDiv.style.borderColor = '#4dd0e1';
      var fishList = Object.keys(fishCount).map(function(f) { 
        return GameData.fishTypes[f].name + ' x' + fishCount[f]; 
      }).join(', ');
      fishDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDC1F</div>' +
        '<div class="inv-item-name">Fish Collection</div>' +
        '<div class="inv-item-desc">' + fishList + '</div>';
      dom.inventoryGrid.appendChild(fishDiv);
    }

    var stats = dom.inventoryPanel.querySelector('.inv-stats');
    var timeStr = isNightTime() ? 'Night' : 'Day';
    if (stats) {
      stats.innerHTML = '<span>Bugs: ' + state.bugs + '</span>' +
        '<span>Total: ' + state.totalBugsCollected + '</span>' +
        '<span>Best Chain: ' + (state.bestCombo || 0) + '</span>' +
        '<span>' + timeStr + '</span>';
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    dom.menuPanel.style.display = menuOpen ? 'block' : 'none';
  }

  function toggleQuests() {
    questsOpen = !questsOpen;
    dom.questsPanel.style.display = questsOpen ? 'block' : 'none';
    if (questsOpen) renderQuests();
  }

  function renderQuests() {
    var container = dom.questsPanel.querySelector('.quests-list');
    if (!container) return;
    container.innerHTML = '';
    var hasAny = false;
    for (var qId in state.activeQuests) {
      hasAny = true;
      var q = GameData.quests[qId];
      var complete = isQuestComplete(qId);
      var div = document.createElement('div');
      div.className = 'quest-item' + (complete ? ' completed' : '');
      div.innerHTML = '<div class="quest-name">' + q.name + '</div>' +
        '<div class="quest-desc">' + q.desc + '</div>' +
        '<div class="quest-status">' + getQuestProgressText(qId) + '</div>';
      container.appendChild(div);
    }
    state.completedQuests.forEach(function (qId) {
      hasAny = true;
      var q = GameData.quests[qId];
      if (!q) return;
      var div = document.createElement('div');
      div.className = 'quest-item completed';
      div.innerHTML = '<div class="quest-name">\u2713 ' + q.name + '</div>' +
        '<div class="quest-desc">' + q.desc + '</div>' +
        '<div class="quest-status">Completed!</div>';
      container.appendChild(div);
    });
    if (!hasAny) {
      container.innerHTML = '<div style="text-align:center; color:#888; padding:20px; font-size:10px;">No quests yet. Talk to NPCs to get started!</div>';
    }
  }

  function formatTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function saveGame() { if (cookiesAccepted) SaveSystem.save(state); }

  // ====== INIT ON LOAD ======
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };

})();
