import { GameData } from './data.js';
import { SaveSystem } from './save.js';

/**
 * Vibe The Game - Game Engine v3
 * Refactored with ES6+, improved mechanics, and error handling
 */
const Game = (() => {

  // ====== CONSTANTS ======
  const TILE = 32;
  const PLAYER_W = 20;
  const PLAYER_H = 14;
  const PLAYER_OFFSET_X = 6;
  const PLAYER_OFFSET_Y = 16;
  const BASE_SPEED = 150;
  const NPC_INTERACT_DIST = 56;
  const BUG_SPAWN_INTERVAL = 4;
  const AUTO_SAVE_INTERVAL = 15;
  const MAGNET_RANGE = 120;
  const MAX_BUGS = 15;
  const BUG_FLEE_DIST = 60;
  const BUG_CATCH_DIST = 28;
  const DAY_DURATION = 120;
  const COMBO_WINDOW = 10;
  const DASH_SPEED = 420;
  const DASH_TIME = 0.16;
  const DASH_COOLDOWN = 1.2;
  const FISHING_CAST_TIME = 1.5;
  const FISHING_CATCH_WINDOW = 0.8;
  const PULSE_STORM_INTERVAL = 42;
  const PULSE_STORM_DURATION = 18;
  const PULSE_STORM_BEAT = 0.82;
  const SIGNAL_LURE_DURATION = 10;
  const SIGNAL_LURE_COOLDOWN = 18;
  const SIGNAL_LURE_RANGE = 170;
  const CANVAS_FONT_STACK = '"Consolas", "Lucida Console", "Courier New", monospace';

  // ====== STATE ======
  let canvas, ctx, minimapCanvas, minimapCtx;
  let state = null;
  const keys = {};
  let camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let currentMap = null;
  let areaId = '';
  let bugs = [];
  let particles = [];
  let nearestNPC = null;
  let nearestBug = null;
  let dialogueOpen = false;
  let inventoryOpen = false;
  let menuOpen = false;
  let questsOpen = false;
  let currentNPCId = null;
  let lastShopItem = null;
  let lastTimestamp = 0;
  let bugTimer = 0;
  let saveTimer = 0;
  let gameTime = 0;
  let transitioning = false;
  let portalCooldown = 0;
  let npcChatHistory = {};
  let aiDialogueInFlight = false;
  let walkFrame = 0;
  let walkTimer = 0;
  let started = false;
  let cookiesAccepted = false;
  let notifTimer = 0;
  let achieveTimer = 0;
  let npcBobTimer = 0;
  const canvasW = 800;
  const canvasH = 600;
  let scale = 1;
  let audioCtx = null;
  let swingAnim = 0;
  let timeOfDay = 0;
  let fishingState = { active: false, castTime: 0, waiting: false, caught: null };
  let petFollowTimer = 0;
  let comboState = { count: 0, timer: 0, flash: 0, lastGain: 0 };
  let dashState = { active: false, time: 0, cooldown: 0, dx: 0, dy: 0 };
  const art = {};
  let vibeMode = { active: false, beat: 0, intensity: 0 };
  let vibeBeatCount = 0;
  let screenShake = { x: 0, y: 0, intensity: 0, timer: 0 };
  let bestiaryOpen = false;
  let scannerOpen = false;
  let catchFlash = { active: false, timer: 0 };
  let weather = { type: 'none', particles: [], active: false };
  let scannerRefreshTimer = 0;
  let pulseStorm = { active: false, timer: 0, beat: 0, phase: 'calm', flash: 0 };
  let signalLure = { active: false, x: 0, y: 0, timer: 0, cooldown: 0, pulse: 0 };

  // Noise seed for terrain variation
  const noiseSeed = [];
  for (let ns = 0; ns < 1000; ns++) noiseSeed.push(Math.random());
  function noise(x, y) { return noiseSeed[Math.abs((x * 374761 + y * 668265) % 1000)]; }

  // ====== DOM REFS ======
  const dom = {};
  let savePreviewPromise = null;

  function getSavePreview() {
    if (!savePreviewPromise) {
      savePreviewPromise = SaveSystem.load().catch(function (error) {
        console.warn('Unable to preload save preview:', error);
        return null;
      });
    }
    return savePreviewPromise;
  }

  function getTotalBugCatches(sourceState) {
    if (!sourceState) return 0;
    if (typeof sourceState.totalBugsCaught === 'number') return sourceState.totalBugsCaught;
    return typeof sourceState.totalBugsCollected === 'number' ? sourceState.totalBugsCollected : 0;
  }

  function setVisibility(element, visible, displayValue) {
    if (!element) return;
    element.hidden = !visible;
    element.style.display = visible ? (displayValue || 'block') : 'none';
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function renderContinueInfo(savedState) {
    const continueInfo = document.querySelector('.continue-info');
    if (!continueInfo) return;
    if (!savedState) {
      setVisibility(continueInfo, false);
      continueInfo.textContent = '';
      return;
    }

    continueInfo.textContent = 'Continue from save (' + getTotalBugCatches(savedState) + ' bugs caught)';
    setVisibility(continueInfo, true, 'block');
  }

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function loadArt() {
    art.playerSheet = loadImage('assets/sprites/player-sheet.svg');
    art.bugSheet = loadImage('assets/sprites/bug-sheet.svg');
  }

  function isNightTime(value) {
    const t = typeof value === 'number' ? value : timeOfDay;
    return t > 0.5 || t < 0.25;
  }

  function cloneBugPool(pool) {
    const copy = [];
    for (let i = 0; i < pool.length; i++) {
      copy.push({ id: pool[i].id, weight: pool[i].weight });
    }
    return copy;
  }

  function addPoolWeight(pool, bugId, weight) {
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].id === bugId) {
        pool[i].weight += weight;
        return;
      }
    }
    pool.push({ id: bugId, weight: weight });
  }

  function getStormAdjustedBugPool(basePool) {
    if (!pulseStorm.active) return basePool;
    const adjusted = cloneBugPool(basePool);
    for (let i = 0; i < adjusted.length; i++) {
      if (adjusted[i].id === 'glitchling') adjusted[i].weight += 30;
      else adjusted[i].weight = Math.max(8, Math.round(adjusted[i].weight * 0.8));
    }
    addPoolWeight(adjusted, 'glitchling', areaId === 'neon_garden' ? 38 : 24);
    return adjusted;
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
    const area = GameData.areas[areaId] || {};
    const pool = isNightTime() && area.nightBugPool ? area.nightBugPool : area.bugPool;
    const activePool = pool && pool.length ? pool : getDefaultBugPool();
    return getStormAdjustedBugPool(activePool);
  }

  function rollBugType() {
    const pool = getActiveBugPool();
    let total = 0;
    for (let i = 0; i < pool.length; i++) total += pool[i].weight;
    let roll = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
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

  function canUseSignalLure() {
    return state && state.inventory.indexOf('signal_lure') !== -1;
  }

  function resetPulseStormCountdown(initial) {
    pulseStorm.active = false;
    pulseStorm.beat = 0;
    pulseStorm.phase = 'calm';
    pulseStorm.flash = 0;
    pulseStorm.timer = (initial ? PULSE_STORM_INTERVAL * 0.55 : PULSE_STORM_INTERVAL) + Math.random() * 8;
  }

  function getBugFocusTarget() {
    if (signalLure.active) {
      return { x: signalLure.x, y: signalLure.y };
    }
    return {
      x: state.player.x + TILE / 2,
      y: state.player.y + PLAYER_OFFSET_Y
    };
  }

  function electrifyBug(bug) {
    if (!bug) return;
    bug.stormCharged = true;
    bug.glowPhase += 0.8;
  }

  function startPulseStorm() {
    pulseStorm.active = true;
    pulseStorm.timer = PULSE_STORM_DURATION;
    pulseStorm.beat = 0;
    pulseStorm.phase = 'pull';
    pulseStorm.flash = 0.6;
    for (let i = 0; i < bugs.length; i++) electrifyBug(bugs[i]);
    showNotification(signalLure.active ? 'PULSE STORM // lure signal amplified' : 'PULSE STORM // catch the surge');
    playSound('storm');
    updateHUD();
  }

  function endPulseStorm() {
    pulseStorm.active = false;
    pulseStorm.phase = 'calm';
    pulseStorm.beat = 0;
    pulseStorm.flash = 0.25;
    resetPulseStormCountdown(false);
    showNotification('Pulse Storm dissipated');
    updateHUD();
  }

  function updatePulseStorm(dt) {
    if (!started || !state) return;
    if (pulseStorm.active) {
      pulseStorm.timer = Math.max(0, pulseStorm.timer - dt);
      pulseStorm.beat += dt;
      pulseStorm.flash = Math.max(0, pulseStorm.flash - dt * 1.4);
      if (pulseStorm.beat >= PULSE_STORM_BEAT) {
        pulseStorm.beat -= PULSE_STORM_BEAT;
        pulseStorm.phase = pulseStorm.phase === 'pull' ? 'scatter' : 'pull';
        pulseStorm.flash = 0.24;
        const focus = getBugFocusTarget();
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2 + gameTime * 0.6;
          particles.push({
            x: focus.x + Math.cos(angle) * 18,
            y: focus.y + Math.sin(angle) * 18,
            vx: Math.cos(angle) * 18,
            vy: Math.sin(angle) * 18,
            life: 0.35,
            maxLife: 0.35,
            color: pulseStorm.phase === 'pull' ? '#29d7ff' : '#ff4d8d',
            size: 2.5
          });
        }
      }
      if (pulseStorm.timer <= 0) endPulseStorm();
    } else {
      pulseStorm.timer -= dt;
      if (pulseStorm.timer <= 0) startPulseStorm();
    }
  }

  function deploySignalLure() {
    if (!canUseSignalLure()) {
      showNotification('You need Vivian\'s Signal Lure first.');
      return;
    }
    if (signalLure.cooldown > 0) {
      showNotification('Signal Lure recharging: ' + signalLure.cooldown.toFixed(1) + 's');
      return;
    }
    signalLure.active = true;
    signalLure.x = state.player.x + TILE / 2;
    signalLure.y = state.player.y + PLAYER_OFFSET_Y;
    signalLure.timer = SIGNAL_LURE_DURATION;
    signalLure.cooldown = SIGNAL_LURE_DURATION + SIGNAL_LURE_COOLDOWN;
    signalLure.pulse = 0;
    playSound('lure');
    showNotification(pulseStorm.active ? 'Signal Lure deployed // storm synced' : 'Signal Lure deployed');
    updateHUD();
  }

  function updateSignalLure(dt) {
    if (signalLure.cooldown > 0) {
      signalLure.cooldown = Math.max(0, signalLure.cooldown - dt);
    }
    if (!signalLure.active) return;
    signalLure.timer = Math.max(0, signalLure.timer - dt);
    signalLure.pulse += dt * (pulseStorm.active ? 9 : 6);
    if (signalLure.timer <= 0) {
      signalLure.active = false;
      showNotification('Signal Lure burnt out');
      updateHUD();
    }
  }

  // ====== SOUND ======
  function initAudio() {
    try { 
      audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
    } catch (e) { 
      console.warn('Audio not supported:', e); 
    }
  }

  function playSound(type) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime;
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
        case 'storm':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, t);
          osc.frequency.linearRampToValueAtTime(260, t + 0.12);
          osc.frequency.linearRampToValueAtTime(120, t + 0.35);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.38);
          osc.start(t); osc.stop(t + 0.38);
          break;
        case 'lure':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, t);
          osc.frequency.linearRampToValueAtTime(780, t + 0.08);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.18);
          osc.start(t); osc.stop(t + 0.18);
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
    } catch (e) { 
      console.warn('Audio play error:', e); 
    }
  }

  function playVibeBeat() {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      vibeBeatCount++;
      // Kick
      const ko = audioCtx.createOscillator(), kg = audioCtx.createGain();
      ko.connect(kg); kg.connect(audioCtx.destination);
      ko.type = 'sine';
      ko.frequency.setValueAtTime(150, t);
      ko.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      kg.gain.setValueAtTime(0.18, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      ko.start(t); ko.stop(t + 0.15);
      // Hi-hat on offbeats
      if (vibeBeatCount % 2 === 0) {
        const ho = audioCtx.createOscillator(), hg = audioCtx.createGain();
        ho.connect(hg); hg.connect(audioCtx.destination);
        ho.type = 'square';
        ho.frequency.setValueAtTime(4000 + Math.random() * 2000, t);
        hg.gain.setValueAtTime(0.03, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        ho.start(t); ho.stop(t + 0.05);
      }
      // Bass synth
      const bo = audioCtx.createOscillator(), bg = audioCtx.createGain();
      bo.connect(bg); bg.connect(audioCtx.destination);
      bo.type = 'sawtooth';
      const notes = [110, 130.81, 146.83, 164.81];
      bo.frequency.setValueAtTime(notes[vibeBeatCount % notes.length], t);
      bg.gain.setValueAtTime(0.05, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      bo.start(t); bo.stop(t + 0.2);
    } catch (e) {
      console.warn('Vibe beat error:', e);
    }
  }

  // ====== INITIALIZATION ======
  async function init() {
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
    dom.lureDisplay = document.getElementById('lure-display');
    dom.stormDisplay = document.getElementById('storm-display');
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
    dom.startButton = document.querySelector('.start-btn');
    dom.menuPanel = document.getElementById('menu-panel');
    dom.questsPanel = document.getElementById('quests-panel');
    dom.transitionOverlay = document.getElementById('transition-overlay');
    dom.cookieBanner = document.getElementById('cookie-banner');
    dom.bestiaryPanel = document.getElementById('bestiary-panel');
    dom.scannerPanel = document.getElementById('scanner-panel');

    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.getElementById('dialogue-send').addEventListener('click', sendDialogue);
    document.getElementById('dialogue-close').addEventListener('click', closeDialogue);

    // Tappable interact prompt for mobile
    dom.interactPrompt.addEventListener('click', function () {
      if (nearestNPC && !dialogueOpen) openDialogue(nearestNPC);
      else if (isAtFishingSpot()) attemptFishing();
      else if (nearestBug) attemptCatchBug();
    });
    dom.inventoryPanel.querySelector('.inv-close').addEventListener('click', toggleInventory);
    dom.questsPanel.querySelector('.quests-close').addEventListener('click', toggleQuests);
    dom.bestiaryPanel.querySelector('.bestiary-close').addEventListener('click', toggleBestiary);
    dom.scannerPanel.querySelector('.scanner-close').addEventListener('click', toggleScanner);
    dom.menuPanel.querySelector('.menu-close').addEventListener('click', toggleMenu);
    dom.dialogueInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendDialogue(); }
      e.stopPropagation();
    });
    dom.dialogueInput.addEventListener('keyup', function (e) { e.stopPropagation(); });

    setupMobileControls();

    cookiesAccepted = SaveSystem.hasConsent();
    setVisibility(dom.cookieBanner, !cookiesAccepted, 'block');

    document.getElementById('cookie-accept').addEventListener('click', function () {
      cookiesAccepted = true;
      SaveSystem.giveConsent();
      setVisibility(dom.cookieBanner, false);
      if (state) {
        void saveGame();
        showNotification('Local saving enabled.');
      }
    });
    document.getElementById('cookie-decline').addEventListener('click', function () {
      setVisibility(dom.cookieBanner, false);
    });

    document.getElementById('menu-resume').addEventListener('click', toggleMenu);
    document.getElementById('menu-save').addEventListener('click', async function () {
      const didSave = await saveGame();
      showNotification(didSave ? 'Game Saved!' : 'Enable local saving first to store progress.');
    });
    document.getElementById('menu-quests').addEventListener('click', function () {
      toggleMenu(); toggleQuests();
    });
    document.getElementById('menu-scanner').addEventListener('click', function () {
      toggleMenu(); toggleScanner();
    });
    document.getElementById('menu-delete').addEventListener('click', async function () {
      if (confirm('Delete all local save data? This cannot be undone!')) {
        await SaveSystem.clear();
        savePreviewPromise = Promise.resolve(null);
        state = SaveSystem.getDefaultState();
        loadArea(state.player.area);
        toggleMenu();
        showNotification('Save data deleted');
        renderContinueInfo(null);
      }
    });

    renderContinueInfo(await getSavePreview());

    dom.startButton.addEventListener('click', startGame);
    requestAnimationFrame(gameLoop);
  }

  async function startGame() {
    if (started) return;
    started = true;
    initAudio();
    setVisibility(dom.startScreen, false);
    setVisibility(dom.hud, true, 'flex');
    state = await getSavePreview() || SaveSystem.getDefaultState();
    timeOfDay = typeof state.timeOfDay === 'number' ? state.timeOfDay : 0;
    resetPulseStormCountdown(true);
    signalLure.active = false;
    signalLure.cooldown = 0;
    signalLure.timer = 0;
    signalLure.pulse = 0;
    scannerRefreshTimer = 0;
    loadArea(state.player.area);
    lastTimestamp = performance.now();
  }

  function resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    scale = Math.min(w / canvasW, h / canvasH);
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = Math.floor(canvasW * scale) + 'px';
    canvas.style.height = Math.floor(canvasH * scale) + 'px';
  }

  // ====== PANEL MANAGEMENT ======
  function closeGamePanels(except) {
    if (inventoryOpen && except !== 'inventory') toggleInventory();
    if (questsOpen && except !== 'quests') toggleQuests();
    if (bestiaryOpen && except !== 'bestiary') toggleBestiary();
    if (scannerOpen && except !== 'scanner') toggleScanner();
  }

  function anyPanelOpen() {
    return dialogueOpen || menuOpen || inventoryOpen || questsOpen || bestiaryOpen || scannerOpen;
  }

  // ====== INPUT ======
  function onKeyDown(e) {
    if (dialogueOpen && e.target === dom.dialogueInput) return;
    let key = e.key.toLowerCase();
    keys[key] = true;

    if (key === 'enter') {
      e.preventDefault();
      if (!started) { startGame(); return; }
      if (anyPanelOpen()) return;
      if (nearestNPC) openDialogue(nearestNPC);
    }
    if (key === ' ') {
      e.preventDefault();
      if (!started || anyPanelOpen()) return;
      attemptCatchBug();
    }
    if (key === 'escape') {
      e.preventDefault();
      if (dialogueOpen) { closeDialogue(); return; }
      if (inventoryOpen) { toggleInventory(); return; }
      if (questsOpen) { toggleQuests(); return; }
      if (bestiaryOpen) { toggleBestiary(); return; }
      if (scannerOpen) { toggleScanner(); return; }
      if (started) toggleMenu();
    }
    if (key === 'i' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      closeGamePanels('inventory');
      toggleInventory();
    }
    if (key === 'q' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      closeGamePanels('quests');
      toggleQuests();
    }
    if (key === 'f' && started && !anyPanelOpen()) {
      e.preventDefault();
      attemptFishing();
    }
    if ((key === 'shift' || key === 'shiftleft' || key === 'shiftright') && started && !anyPanelOpen()) {
      e.preventDefault();
      attemptDash();
    }
    if (key === 'b' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      closeGamePanels('bestiary');
      toggleBestiary();
    }
    if (key === 'p' && started && !anyPanelOpen()) {
      e.preventDefault();
      togglePetMenu();
    }
    if (key === 'l' && started && !anyPanelOpen()) {
      e.preventDefault();
      deploySignalLure();
    }
    if (key === 'm' && started && !dialogueOpen && !menuOpen) {
      e.preventDefault();
      closeGamePanels('scanner');
      toggleScanner();
    }
  }

  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

  function bindPointerButton(button, onPress, onRelease) {
    if (!button) return;

    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (onPress) onPress(event);
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (eventName) {
      button.addEventListener(eventName, function (event) {
        event.preventDefault();
        if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
        if (onRelease) onRelease(event);
      });
    });
  }

  function setupMobileControls() {
    let dirs = { up: 'w', down: 's', left: 'a', right: 'd' };
    Object.keys(dirs).forEach(function (dir) {
      let btn = document.querySelector('.mobile-dpad .' + dir);
      if (!btn) return;
      bindPointerButton(btn, function () {
        keys[dirs[dir]] = true;
      }, function () {
        keys[dirs[dir]] = false;
      });
    });
    let actionBtn = document.querySelector('.mobile-action .act');
    if (actionBtn) {
      bindPointerButton(actionBtn, function () {
        if (dialogueOpen) return;
        if (nearestNPC) openDialogue(nearestNPC);
        else attemptCatchBug();
      });
    }
    let lureBtn = document.querySelector('.mobile-action .lure');
    if (lureBtn) {
      bindPointerButton(lureBtn, function () {
        if (!dialogueOpen && !menuOpen) deploySignalLure();
      });
    }
    let scanBtn = document.querySelector('.mobile-action .scan');
    if (scanBtn) {
      bindPointerButton(scanBtn, function () {
        if (!dialogueOpen && !menuOpen) toggleScanner();
      });
    }
  }

  // ====== AREA MANAGEMENT ======
  function loadArea(id) {
    let area = GameData.areas[id];
    if (!area) return;
    areaId = id;
    currentMap = area.map;
    bugs = [];
    bugTimer = 0;
    fishingState.active = false;
    fishingState.waiting = false;
    signalLure.active = false;
    signalLure.timer = 0;
    spawnInitialBugs();
    updateHUD();
    drawMinimap();
    if (scannerOpen) renderScanner();

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
    let area = GameData.areas[areaId];
    let count = 0;
    for (let y = 0; y < currentMap.length && count < MAX_BUGS; y++) {
      for (let x = 0; x < currentMap[y].length && count < MAX_BUGS; x++) {
        if (currentMap[y][x] === GameData.T.TALL_GRASS && Math.random() < area.bugDensity * 0.5) {
          bugs.push(createBug(x * TILE + TILE / 2, y * TILE + TILE / 2));
          count++;
        }
      }
    }
  }

  function createBug(x, y) {
    let bugType = rollBugType();
    let bugDef = getBugDef(bugType);
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
      catchAnim: 0,
      stormCharged: pulseStorm.active
    };
  }

  function registerBugCatch(bug, bugDef) {
    let hadChain = comboState.timer > 0;
    comboState.count = hadChain ? comboState.count + 1 : 1;
    comboState.timer = COMBO_WINDOW;
    comboState.flash = 0.45;

    let comboBonus = Math.min(3, Math.floor((comboState.count - 1) / 2));
    let bugsEarned = bugDef.value + comboBonus;

    if (state.petBug === 'duskwing') bugsEarned += 1;
    if (state.petBug === 'moonfire' && isNightTime() && bug.bugType === 'moonfire') bugsEarned += 1;
    if (state.petBug === 'dreamspinner' && comboState.count >= 3) bugsEarned += 1;
    if (bug.stormCharged) bugsEarned += bug.bugType === 'glitchling' ? 2 : 1;
    if (vibeMode.active) bugsEarned = bugsEarned * 2;

    state.bugs += bugsEarned;
    state.totalBugsCollected += bugsEarned;
    state.totalBugsCaught = getTotalBugCatches(state) + 1;

    // Golden bug chance (10% on catch, 25% in Vibe Mode)
    let goldenChance = vibeMode.active ? 0.25 : 0.1;
    if (bug.stormCharged) goldenChance += 0.08;
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
    if (bug.stormCharged) comboState.timer = Math.min(COMBO_WINDOW + 2, comboState.timer + 0.8);

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

    let dx = 0;
    let dy = 0;
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

    for (let i = 0; i < 6; i++) {
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

    let px = state.player.x + TILE / 2;
    let py = state.player.y + PLAYER_OFFSET_Y;
    let hasNet = state.inventory.indexOf('bug_net') !== -1;
    let catchDist = hasNet ? BUG_CATCH_DIST * 1.8 : BUG_CATCH_DIST;
    let caught = false;

    // Find and catch nearest bug in range
    let bestDist = catchDist;
    let bestIdx = -1;
    for (let i = 0; i < bugs.length; i++) {
      let b = bugs[i];
      let dx = px - b.x;
      let dy = py - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      let b = bugs[bestIdx];
      let bugDef = getBugDef(b.bugType);
      bugs.splice(bestIdx, 1);
      let bugsEarned = registerBugCatch(b, bugDef);
      playSound('collect');
      catchFlash.active = true;
      catchFlash.timer = 0.4;

      // Juicy burst particles - more and varied
      let burstCount = vibeMode.active ? 16 : (comboState.count > 2 ? 12 : 8);
      for (let p = 0; p < burstCount; p++) {
        let angle = (p / burstCount) * Math.PI * 2 + Math.random() * 0.3;
        let spd = 60 + Math.random() * 60;
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
      let textSize = vibeMode.active ? 14 : (comboState.count > 2 ? 12 : 10);
      particles.push({
        x: b.x, y: b.y - 16, vx: 0, vy: -50,
        life: 1.2, maxLife: 1.2,
        text: '+' + bugsEarned + ' BUG' + (bugsEarned > 1 ? 'S' : ''), color: bugDef.glow, size: textSize
      });
      if (comboState.count > 1) {
        let chainColor = vibeMode.active ? '#ff4d8d' : '#ff9f68';
        particles.push({
          x: b.x, y: b.y - 32, vx: 0, vy: -35,
          life: 1.1, maxLife: 1.1,
          text: 'CHAIN x' + comboState.count, color: chainColor, size: vibeMode.active ? 11 : 8
        });
      }

      updateHUD();

      if (getTotalBugCatches(state) === 1 && state.achievements.indexOf('first_bug') === -1) {
        unlockAchievement('first_bug');
      }
      if (getTotalBugCatches(state) >= 50 && state.achievements.indexOf('bug_hoarder') === -1) {
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
      for (let i = 0; i < bugs.length; i++) {
        let b = bugs[i];
        let dx = px - b.x;
        let dy = py - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
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
    let dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    if (started && !transitioning) {
      gameTime += dt;
      npcBobTimer += dt;
      if (swingAnim > 0) swingAnim = Math.max(0, swingAnim - dt);
      if (dashState.cooldown > 0) dashState.cooldown = Math.max(0, dashState.cooldown - dt);
      if (comboState.timer > 0) {
        comboState.timer = Math.max(0, comboState.timer - dt);
        if (comboState.timer <= 0 && comboState.count > 0) {
          if (vibeMode.active) { vibeMode.active = false; }
          comboState.count = 0;
          comboState.flash = 0;
          updateHUD();
        }
      }
      if (comboState.flash > 0) comboState.flash = Math.max(0, comboState.flash - dt);
      if (portalCooldown > 0) portalCooldown -= dt;

      // Screen shake update
      if (screenShake.timer > 0) {
        screenShake.timer -= dt;
        let shakeAmt = screenShake.intensity * (screenShake.timer / 0.12);
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
          for (let vp = 0; vp < 3; vp++) {
            let va = Math.random() * Math.PI * 2;
            let vd = 30 + Math.random() * 50;
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

      updatePulseStorm(dt);
      updateSignalLure(dt);

      let wasNight = isNightTime(timeOfDay);
      timeOfDay = (timeOfDay + dt / DAY_DURATION) % 1;
      state.timeOfDay = timeOfDay;
      if (wasNight !== isNightTime(timeOfDay)) {
        playSound('day_night');
      }

      if (!dialogueOpen && !inventoryOpen && !menuOpen && !questsOpen && !bestiaryOpen && !scannerOpen) {
        updatePlayer(dt);
        updateBugs(dt);
        checkNPCProximity();
        checkPortals();

        bugTimer += dt;
        let spawnInterval = pulseStorm.active ? BUG_SPAWN_INTERVAL * 0.45 : BUG_SPAWN_INTERVAL;
        if (bugTimer > spawnInterval) {
          spawnRandomBug();
          if (pulseStorm.active && Math.random() < 0.55) spawnRandomBug();
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
        if (notifTimer <= 0) setVisibility(dom.notification, false);
      }
      if (achieveTimer > 0) {
        achieveTimer -= dt;
        if (achieveTimer <= 0) setVisibility(dom.achievePopup, false);
      }
      updateHUD();
      if (scannerOpen) {
        scannerRefreshTimer -= dt;
        if (scannerRefreshTimer <= 0) {
          renderScanner();
          scannerRefreshTimer = 0.25;
        }
      }
    }

    render();
    requestAnimationFrame(gameLoop);
  }

    // ====== PLAYER UPDATE ======
    let playerMoved = false;
  function updatePlayer(dt) {
    let speed = BASE_SPEED;
    if (state.inventory.indexOf('speed_boots') !== -1) speed *= 1.5;

    let dx = 0, dy = 0;
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

    playerMoved = dx !== 0 || dy !== 0;
    if (playerMoved) {
      if (Math.abs(dx) > Math.abs(dy)) state.player.dir = dx > 0 ? 3 : 2;
      else state.player.dir = dy > 0 ? 0 : 1;
      walkTimer += dt;
      if (walkTimer > 0.15) { walkFrame = (walkFrame + 1) % 4; walkTimer = 0; }
    } else {
      walkFrame = 0; walkTimer = 0;
    }

    let newX = state.player.x + dx * speed * dt;
    let newY = state.player.y + dy * speed * dt;
    if (!isColliding(newX, state.player.y)) state.player.x = newX;
    if (!isColliding(state.player.x, newY)) state.player.y = newY;

    camera.targetX = state.player.x - canvasW / 2 + TILE / 2;
    camera.targetY = state.player.y - canvasH / 2 + TILE / 2;
    let mapW = currentMap[0].length * TILE;
    let mapH = currentMap.length * TILE;
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
    let px = state.player.x + TILE / 2;
    let py = state.player.y + PLAYER_OFFSET_Y;
    nearestBug = null;
    let minBugDist = BUG_CATCH_DIST * 2;
    for (let i = 0; i < bugs.length; i++) {
      let bx = bugs[i].x - px, by = bugs[i].y - py;
      let d = Math.sqrt(bx * bx + by * by);
      if (d < minBugDist) { minBugDist = d; nearestBug = bugs[i]; }
    }
  }

  function isColliding(px, py) {
    let left = px + PLAYER_OFFSET_X;
    let top = py + PLAYER_OFFSET_Y;
    let right = left + PLAYER_W;
    let bottom = top + PLAYER_H;
    let corners = [[left, top], [right - 1, top], [left, bottom - 1], [right - 1, bottom - 1]];
    for (let i = 0; i < corners.length; i++) {
      let tx = Math.floor(corners[i][0] / TILE);
      let ty = Math.floor(corners[i][1] / TILE);
      if (ty < 0 || tx < 0 || ty >= currentMap.length || tx >= currentMap[ty].length) return true;
      let t = currentMap[ty][tx];
      if (t === undefined || !GameData.tileProps[t] || !GameData.tileProps[t].walkable) return true;
    }
    return false;
  }

  // ====== BUG SYSTEM ======
  function isTileWalkable(wx, wy) {
    let tx = Math.floor(wx / TILE);
    let ty = Math.floor(wy / TILE);
    if (ty < 0 || tx < 0 || ty >= currentMap.length || tx >= currentMap[0].length) return false;
    let t = currentMap[ty][tx];
    return t !== undefined && GameData.tileProps[t] && GameData.tileProps[t].walkable;
  }

  function updateBugs(dt) {
    let hasMagnet = state.inventory.indexOf('bug_magnet') !== -1;
    let px = state.player.x + TILE / 2;
    let py = state.player.y + TILE / 2;
    let mapW = currentMap[0].length * TILE;
    let mapH = currentMap.length * TILE;
    let focus = getBugFocusTarget();
    let fx = focus.x;
    let fy = focus.y;

    for (let i = 0; i < bugs.length; i++) {
      let b = bugs[i];
      b.bobOffset += dt * 3;
      b.glowPhase += dt * 2;

      let bx = px - b.x, by = py - b.y;
      let playerDist = Math.sqrt(bx * bx + by * by);
      let tx = fx - b.x, ty = fy - b.y;
      let targetDist = Math.sqrt(tx * tx + ty * ty);

      if (pulseStorm.active) {
        electrifyBug(b);
        let direction = pulseStorm.phase === 'pull' ? 1 : -1;
        let stormSpeed = (pulseStorm.phase === 'pull' ? 92 : 124) + (b.speed || 12) * 3;
        if (targetDist > 4) {
          let stormX = b.x + (tx / targetDist) * stormSpeed * dt * direction;
          let stormY = b.y + (ty / targetDist) * stormSpeed * dt * direction;
          stormX = Math.max(TILE, Math.min(stormX, mapW - TILE));
          stormY = Math.max(TILE, Math.min(stormY, mapH - TILE));
          if (isTileWalkable(stormX, stormY)) {
            b.x = stormX;
            b.y = stormY;
          } else {
            b.wanderAngle += Math.PI * 0.7;
          }
        }
        b.fleeing = pulseStorm.phase === 'scatter' && targetDist < BUG_FLEE_DIST * 1.6;
        b.wanderAngle += dt * (pulseStorm.phase === 'pull' ? 4 : 7);
        b.bobOffset += dt * 8;
        continue;
      }

      if (signalLure.active && targetDist < SIGNAL_LURE_RANGE && targetDist > 4) {
        b.wanderAngle = Math.atan2(ty, tx);
        let lureSpeed = 44 + (b.speed || 12) * 2.2;
        let lureX = b.x + (tx / targetDist) * lureSpeed * dt;
        let lureY = b.y + (ty / targetDist) * lureSpeed * dt;
        lureX = Math.max(TILE, Math.min(lureX, mapW - TILE));
        lureY = Math.max(TILE, Math.min(lureY, mapH - TILE));
        if (isTileWalkable(lureX, lureY)) {
          b.x = lureX;
          b.y = lureY;
          b.fleeing = false;
          continue;
        }
      }

      // Vibe Mode: bugs dance instead of fleeing
      if (vibeMode.active) {
        b.fleeing = false;
        b.fleeTimer = 0;
        b.wanderAngle += dt * 6;
        let nx2 = b.x + Math.cos(b.wanderAngle) * 25 * dt;
        let ny2 = b.y + Math.sin(b.wanderAngle) * 25 * dt;
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

      let speed = b.fleeing ? 70 : (b.speed || 12);

      // Wander
      b.wanderTimer -= dt;
      if (b.wanderTimer <= 0 && !b.fleeing) {
        b.wanderAngle = Math.random() * Math.PI * 2;
        b.wanderTimer = 1.5 + Math.random() * 3;
      }

      let nx = b.x + Math.cos(b.wanderAngle) * speed * dt;
      let ny = b.y + Math.sin(b.wanderAngle) * speed * dt;

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
        let hdx = b.homeX - b.x, hdy = b.homeY - b.y;
        let homeDist = Math.sqrt(hdx * hdx + hdy * hdy);
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
    let grassTiles = [];
    for (let y = 0; y < currentMap.length; y++) {
      for (let x = 0; x < currentMap[y].length; x++) {
        if (currentMap[y][x] === GameData.T.TALL_GRASS) grassTiles.push([x, y]);
      }
    }
    if (grassTiles.length === 0) return;
    let tile = grassTiles[Math.floor(Math.random() * grassTiles.length)];
    bugs.push(createBug(tile[0] * TILE + TILE / 2, tile[1] * TILE + TILE / 2));
  }

  // ====== PET SYSTEM ======
  function spawnPetParticle() {
    if (!state.petBug) return;
    let pet = GameData.petBugs[state.petBug];
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
    let pet = GameData.petBugs[state.petBug];
    showNotification('Pet: ' + pet.name + ' - ' + pet.special);
  }

  function adoptPet(bugType) {
    if (state.petBug) {
      return 'You already have a companion fluttering beside you.';
    }
    if (!GameData.petBugs[bugType]) return 'That bug spirit is not answering right now.';
    state.petBug = bugType;
    playSound('pet_adopt');
    let pet = GameData.petBugs[bugType];
    showNotification('You adopted ' + pet.name + '!');
    updateHUD();

    if (state.achievements.indexOf('pet_lover') === -1) {
      unlockAchievement('pet_lover');
    }
    checkQuestProgress();
    return 'The grove answers your call. ' + pet.name + ' will follow you from now on.';
  }

  function isAtFishingSpot() {
    let tx = Math.floor((state.player.x + TILE / 2) / TILE);
    let ty = Math.floor((state.player.y + PLAYER_OFFSET_Y) / TILE);
    if (currentMap[ty] && currentMap[ty][tx] === GameData.T.FISHING_SPOT) return true;
    // Fish from any walkable tile adjacent to a pond
    let tile = currentMap[ty] ? currentMap[ty][tx] : undefined;
    if (tile === undefined || !GameData.tileProps[tile] || !GameData.tileProps[tile].walkable) return false;
    let offsets = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let i = 0; i < offsets.length; i++) {
      let nx = tx + offsets[i][0], ny = ty + offsets[i][1];
      if (currentMap[ny] && currentMap[ny][nx] === GameData.T.POND) return true;
    }
    return false;
  }

  // ====== FISHING SYSTEM ======
  function attemptFishing() {
    if (state.inventory.indexOf('fishing_rod') === -1) {
      showNotification('You need a Fishing Rod! Buy one from Vivian in Spawn Village.');
      return;
    }

    if (isAtFishingSpot()) {
      if (fishingState.active) {
        finishFishing();
      } else {
        startFishing();
      }
    } else {
      showNotification('Stand next to the pond to fish.');
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

    let reactionTime = gameTime - fishingState.castTime;
    let perfect = reactionTime <= FISHING_CATCH_WINDOW;

    let fishRoll = Math.random();
    if (state.inventory.indexOf('premium_bait') !== -1) fishRoll *= 0.75;
    let fishType = null;

    if (perfect && fishRoll < 0.15) {
      fishType = 'rainbowfin';
    } else if (perfect && fishRoll < 0.4) {
      let rareRoll = Math.random();
      fishType = rareRoll < 0.5 ? 'moon_puffer' : 'golden_glimmer';
    } else if (fishRoll < 0.4) {
      fishType = 'silver_dart';
    } else {
      fishType = 'glow_minnow';
    }

    let fish = GameData.fishTypes[fishType];
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
    let area = GameData.areas[areaId];
    let px = state.player.x + TILE / 2;
    let py = state.player.y + TILE / 2;
    nearestNPC = null;
    let minDist = NPC_INTERACT_DIST;
    for (let i = 0; i < area.npcs.length; i++) {
      let npcId = area.npcs[i];
      let npc = GameData.npcDefs[npcId];
      if (!npc) continue;
      let dx = px - (npc.x * TILE + TILE / 2);
      let dy = py - (npc.y * TILE + TILE / 2);
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; nearestNPC = npcId; }
    }
    dom.interactPrompt.style.display = nearestNPC && !dialogueOpen ? 'block' : 'none';
    // Update prompt text with quest context
    if (nearestNPC && !dialogueOpen) {
      let promptText = 'Press ENTER to talk';
      Object.keys(GameData.quests).forEach(function(qId) {
        let q = GameData.quests[qId];
        if (q.giver === nearestNPC) {
          if (state.activeQuests[qId] && isQuestComplete(qId)) {
            promptText = 'Press ENTER - Quest ready!';
          } else if (state.completedQuests.indexOf(qId) === -1 && !state.activeQuests[qId]) {
            promptText = 'Press ENTER - New quest!';
          }
        }
      });
      dom.interactPrompt.textContent = promptText;
    } else if (nearestBug && !nearestNPC && !dialogueOpen) {
      dom.interactPrompt.textContent = 'Press SPACE to catch bug';
      dom.interactPrompt.style.display = 'block';
    } else if (isAtFishingSpot() && !dialogueOpen) {
      dom.interactPrompt.textContent = 'Press F to fish';
      dom.interactPrompt.style.display = 'block';
    }
  }

  function openDialogue(npcId) {
    dialogueOpen = true;
    currentNPCId = npcId;
    lastShopItem = null;
    let npc = GameData.npcDefs[npcId];

    setVisibility(dom.dialogueBox, true, 'block');
    dom.npcName.textContent = npc.name;
    dom.npcPortrait.style.borderColor = npc.color;
    dom.npcPortrait.style.background = npc.color + '22';
    dom.npcPortrait.textContent = npc.name.charAt(0);
    dom.npcPortrait.style.color = npc.color;
    dom.dialogueMessages.innerHTML = '';
    dom.interactPrompt.style.display = 'none';

    if (!state.npcMemory[npcId]) state.npcMemory[npcId] = { talked: true, visits: 1 };
    else { state.npcMemory[npcId].talked = true; state.npcMemory[npcId].visits = (state.npcMemory[npcId].visits || 0) + 1; }

    let allNpcs = Object.keys(GameData.npcDefs);
    let talkedAll = allNpcs.every(function (id) { return state.npcMemory[id] && state.npcMemory[id].talked; });
    if (talkedAll && state.achievements.indexOf('conversationalist') === -1) unlockAchievement('conversationalist');

    // Check quest state for this NPC first
    let questGreeting = null;
    Object.keys(GameData.quests).forEach(function(qId) {
      let q = GameData.quests[qId];
      if (q.giver === npcId && !questGreeting) {
        if (state.activeQuests[qId] && isQuestComplete(qId)) {
          questGreeting = "You've done it! Want to complete your quest? (" + q.name + ")";
        } else if (state.activeQuests[qId]) {
          questGreeting = q.name + ': ' + getQuestProgressText(qId) + '. Keep going!';
        } else if (state.completedQuests.indexOf(qId) === -1) {
          questGreeting = "I have a quest for you! Say 'yes' to accept, or 'quest' for details.";
        }
      }
    });

    if (questGreeting) {
      addMessage('npc', questGreeting);
    } else {
      let greeting = npc.greeting;
      let visits = state.npcMemory[npcId].visits;
      if (visits > 1 && visits <= 3) greeting = "Welcome back! " + greeting;
      else if (visits > 3) greeting = "Good to see you again, friend! What can I do for you?";
      addMessage('npc', greeting);
    }

    playSound('talk');
    setTimeout(function () { dom.dialogueInput.focus(); }, 100);
  }

  function closeDialogue() {
    dialogueOpen = false;
    currentNPCId = null;
    setVisibility(dom.dialogueBox, false);
    dom.dialogueInput.value = '';
  }

  function addMessage(type, text) {
    let div = document.createElement('div');
    div.className = 'msg msg-' + type;
    div.textContent = text;
    dom.dialogueMessages.appendChild(div);
    dom.dialogueMessages.scrollTop = dom.dialogueMessages.scrollHeight;
  }

  // ====== IMPROVED DIALOGUE MATCHING ======
  function matchScore(input, keywords) {
    let lower = input.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    let words = lower.split(/\s+/);
    let score = 0;

    for (let k = 0; k < keywords.length; k++) {
      let kw = keywords[k].toLowerCase();
      // Exact substring match (highest score)
      if (lower.indexOf(kw) !== -1) {
        score += 10 + kw.length;
        continue;
      }
      // Word-level match
      for (let w = 0; w < words.length; w++) {
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
    let matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        let cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[b.length][a.length];
  }

  function finishQuest(qId, npc, response) {
    let quest = GameData.quests[qId];
    let extraMessages = [];
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
    for (let i = 0; i < extraMessages.length; i++) addMessage('system', extraMessages[i]);

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

  function buildGameContext() {
    let questProgress = {};
    let questReady = {};
    for (let qId in state.activeQuests) {
      questProgress[qId] = getQuestProgressText(qId);
      questReady[qId] = isQuestComplete(qId);
    }
    return {
      bugs: state.bugs,
      inventory: state.inventory,
      activeQuests: state.activeQuests,
      questProgress: questProgress,
      questReady: questReady,
      completedQuests: state.completedQuests,
      area: areaId,
      unlockedAreas: state.unlockedAreas,
      totalBugsCaught: getTotalBugCatches(state),
      bestCombo: state.bestCombo || 0,
      totalFishCaught: state.totalFishCaught || 0,
      petBug: state.petBug || null,
      bugLog: state.bugLog || {},
      timeOfDay: isNightTime() ? 'night' : 'day',
      weather: pulseStorm.active ? 'pulse storm (bugs everywhere, catch fast!)' : 'calm',
      bugsNearby: bugs.length,
      currentCombo: comboState.count,
      comboActive: comboState.timer > 0,
      areaName: GameData.areas[areaId] ? GameData.areas[areaId].name : areaId,
      areaBugDensity: GameData.areas[areaId] ? GameData.areas[areaId].bugDensity : 0,
      hasDash: canDash(),
      hasLure: state.inventory.indexOf('signal_lure') !== -1,
      lureActive: signalLure.active || false,
      playTime: Math.floor(gameTime / 60)
    };
  }

  function processAIActions(actions) {
    for (let i = 0; i < actions.length; i++) {
      let act = actions[i];
      if (!act || !act.type) continue;

      if (act.type === 'quest_start' && act.id) {
        let q = GameData.quests[act.id];
        if (q && !state.activeQuests[act.id] && state.completedQuests.indexOf(act.id) === -1) {
          state.activeQuests[act.id] = { started: Date.now(), readyNotified: false };
          addMessage('system', 'New quest: ' + q.name + ' — ' + q.desc);
          playSound('quest');
          updateHUD();
        }
      }

      if (act.type === 'quest_complete' && act.id) {
        let q = GameData.quests[act.id];
        let npc = GameData.npcDefs[currentNPCId];
        if (q && state.activeQuests[act.id]) {
          playSound('quest');
          finishQuest(act.id, npc);
        }
      }

      if (act.type === 'shop_buy' && act.id) {
        let itemDef = GameData.items[act.id];
        if (itemDef && state.inventory.indexOf(act.id) === -1 && state.bugs >= itemDef.price) {
          state.bugs -= itemDef.price;
          state.inventory.push(act.id);
          playSound('purchase');
          addMessage('system', 'Purchased: ' + itemDef.name + '!');
          if (act.id === 'portal_key' && state.unlockedAreas.indexOf('cloud_nine') === -1) {
            state.unlockedAreas.push('cloud_nine');
            addMessage('system', 'Cloud Nine is now accessible from the Repository!');
          }
          updateHUD();
          if (state.inventory.length >= 3 && state.achievements.indexOf('big_spender') === -1) unlockAchievement('big_spender');
        }
      }

      if (act.type === 'adopt_pet' && act.id) {
        adoptPet(act.id);
      }

      if (act.type === 'unlock_area' && act.id) {
        if (state.unlockedAreas.indexOf(act.id) === -1) {
          state.unlockedAreas.push(act.id);
          addMessage('system', GameData.areas[act.id].name + ' is now accessible!');
          updateHUD();
        }
      }
    }
  }

  async function sendDialogue() {
    let input = dom.dialogueInput.value.trim();
    if (!input || !currentNPCId || aiDialogueInFlight) return;
    dom.dialogueInput.value = '';
    addMessage('player', input);
    playSound('talk');

    // Initialise chat history for this NPC
    if (!npcChatHistory[currentNPCId]) npcChatHistory[currentNPCId] = [];
    npcChatHistory[currentNPCId].push({ role: 'user', content: input });

    // Show typing indicator
    aiDialogueInFlight = true;
    dom.dialogueInput.disabled = true;
    let typingMsg = document.createElement('div');
    typingMsg.className = 'msg msg-npc msg-typing';
    typingMsg.textContent = '...';
    dom.dialogueMessages.appendChild(typingMsg);
    dom.dialogueMessages.scrollTop = dom.dialogueMessages.scrollHeight;

    try {
      let res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: currentNPCId,
          message: input,
          history: npcChatHistory[currentNPCId].slice(-12),
          gameState: buildGameContext()
        })
      });

      if (!res.ok) throw new Error('AI unavailable');
      let data = await res.json();
      if (data.error) throw new Error(data.error);

      typingMsg.remove();
      addMessage('npc', data.message);
      npcChatHistory[currentNPCId].push({ role: 'assistant', content: data.message });

      if (data.actions && data.actions.length > 0) {
        processAIActions(data.actions);
      }
    } catch (e) {
      typingMsg.remove();
      console.warn('AI dialogue failed:', e.message);
      addMessage('system', '[AI offline — using local dialogue]');
      sendDialogueFallback(input);
    }

    aiDialogueInFlight = false;
    dom.dialogueInput.disabled = false;
    if (dialogueOpen) dom.dialogueInput.focus();
  }

  // NPC personality pools for when nothing else matches
  const npcFallbackLines = {
    prof_semicolon: [
      "Every good coder starts with questions! Ask me about quests, bugs, the different areas, or what items you should buy.",
      "The Vibeverse has so much to explore! Meadows to the east, the Repository up north, dark caves beyond... what catches your interest?",
      "You remind me of a young function — full of potential but not yet called! Try asking about a quest, or head east to the Syntax Meadows for bug hunting.",
      "Between you and me, the best bug chains happen in the tall grass near the meadows. But first, got any questions about quests or items?"
    ],
    vendor_vivian: [
      "You browsing or buying? Say 'shop' and I'll show you what's in stock. Everything a bug collector could need!",
      "Bugs burning a hole in your pocket? I've got nets, boots, lanterns, lures... name your price range!",
      "Window shopping, are we? My best seller is the Bug Net — 20 bugs and you catch twice as fast. Say the word!",
      "I don't do small talk for free, but I DO sell things for bugs! What do you need — speed, light, fishing gear?"
    ],
    dj_beatbyte: [
      "You wanna talk rhythm or just stand there? Catch bugs back-to-back for a combo chain. Get a 4-chain and we'll really be cooking.",
      "The beat waits for no one. If you want the Neon Garden portal open, show me a 4-bug chain. Ask about the quest if you're ready.",
      "Every chain starts with one catch. Get out there, find some tall grass, and show me what your timing looks like.",
      "The portal hums but it needs your frequency. Ask me about the combo challenge when you're ready to prove yourself."
    ],
    bug_hunter_beatrix: [
      "Bugs bugs BUGS! That's all I care about! Ask me for tips, take on my challenge, or just wade into the tall grass and start catching!",
      "See those sparkly patches in the grass? That's where the bugs hide! Walk through and they'll pop out. Wanna hear about my quest?",
      "I've caught more bugs than lines in a legacy codebase! If you want a real challenge, ask me about the Bug Census.",
      "The meadows are alive today! Perfect conditions for catching. Want some tips, or ready to take on my challenge?"
    ],
    archivist_ada: [
      "Knowledge awaits those who seek it. Ask about the Repository, the zones of the Vibeverse, Cloud Nine, or my scholarly quest.",
      "These shelves hold the compiled wisdom of ages. If you seek passage to Cloud Nine, you'll need a Portal Key from Vivian's shop.",
      "A true scholar explores every corner. Have you visited all four ground zones? I have a quest for the thorough explorer.",
      "The Great Compiler's work surrounds us. Ask me about the lore, the prophecy, or how to reach Cloud Nine."
    ],
    shadow_null: [
      "Silence speaks louder than noise in the void. But if you seek my riddle, ask for it... if you dare.",
      "The darkness holds many questions. What is the thing that has no value, yet gives meaning to all others?",
      "You stumble through my caves without purpose. Ask about the riddle, the void, or what lies beyond the null.",
      "Everything here was once something. Now it is... less. If you seek my challenge, speak of quests or riddles."
    ],
    cloudkeeper_cirrus: [
      "The clouds drift, and so does time. You've reached the highest point in the Vibeverse. Ask about the Great Debug if you seek the final challenge.",
      "Up here, bugs float on thermals and the code compiles itself. Are you ready for the ultimate quest?",
      "Few reach Cloud Nine. Fewer still complete what awaits here. Ask me about the Great Debug when you're ready.",
      "The sky remembers every bug ever caught. Tell me... are you here for the final challenge?"
    ],
    luna_moth: [
      "The grove whispers tonight. Moonfire Bugs dance in the dark grass — catch 3 and the night spirits will notice you. Ask about my quest.",
      "Gentle soul, the twilight holds many secrets. Would you like to hear about the Moonfire Gathering, or perhaps... adopting a companion?",
      "The night creatures trust those who walk softly. Catch Moonfire Bugs to prove your heart, then we'll talk about adoption.",
      "Every rustle in the grove is a story. Ask me about the moonfire quest, fishing in the pond, or what creatures call this place home."
    ],
    pond_keeper: [
      "The pond is calm today. If you've got a Fishing Rod, stand at the water's edge and press F. I can teach you more if you ask about fishing.",
      "Patience is the first lesson of the angler. The second is having a Fishing Rod — Vivian sells them for 30 bugs. Ready to hear about my quest?",
      "Five fish. That's all I ask. Catch five and you'll understand why I never leave this pond. Ask about the Fishing Frenzy.",
      "The water holds Glow Minnows, Silver Darts, and if you're lucky... a Rainbowfin. Want to take on my fishing challenge?"
    ],
    remix_ren: [
      "G-g-glitch in the signal! The Neon Garden pulses with rare Glitchlings. Catch 3 and I'll rewire your pulse tech. Ask about the quest!",
      "You feel that static? That's the garden breathing. The Glitchlings are out there — catch them and I'll make it worth your while.",
      "Everything here is a remix of a remix. The bugs glow different, the sky hums different. Wanna chase some Glitchlings for me?",
      "The garden responds to those who collect its creatures. Ask about the Glitch Glow quest and I'll hook you up with something special."
    ]
  };

  function sendDialogueFallback(input) {
    let npc = GameData.npcDefs[currentNPCId];
    let lower = input.toLowerCase();
    let response = null;
    let isAgreeing = !!lower.match(/\b(yes|yeah|sure|ok|okay|accept|yep|yup|definitely|absolutely|lets go|let's go|do it|ready|bring it|go ahead|i accept|sounds good|why not|hell yeah|alright)\b/);
    let isDeclining = !!lower.match(/\b(no|nah|nope|nevermind|cancel|nvm|pass|decline|not now|maybe later)\b/);

    // Pet adoption (Luna Moth special)
    if (currentNPCId === 'luna_moth' && lower.indexOf('adopt') !== -1) {
      if (state.completedQuests.indexOf('moonfire_gathering') === -1) {
        addMessage('npc', 'The grove is not ready yet. Bring me 3 Moonfire Bugs first, then the night spirits will listen.');
        return;
      }
      let chosenPet = detectPetType(lower);
      if (!chosenPet) {
        addMessage('npc', "Which companion calls to you? Say 'adopt duskwing', 'adopt moonfire', or 'adopt dreamspinner'.");
        return;
      }
      addMessage('npc', adoptPet(chosenPet));
      return;
    }

    // 1. Quest turn-in (active + complete + talking to giver)
    for (let qId in state.activeQuests) {
      if (isQuestComplete(qId)) {
        let quest = GameData.quests[qId];
        if (quest.giver === currentNPCId) {
          response = npc.questResponses[qId + '_complete'] || "Quest complete! Here's your reward!";
          playSound('quest');
          finishQuest(qId, npc, response);
          return;
        }
      }
    }

    // 2. Quest acceptance — if NPC has a quest and player agrees or says quest-related words
    let availableQuest = null;
    for (let t = 0; t < npc.topics.length; t++) {
      if (npc.topics[t].quest) {
        let qId = npc.topics[t].quest;
        if (state.completedQuests.indexOf(qId) === -1 && !state.activeQuests[qId]) {
          availableQuest = { topic: npc.topics[t], questId: qId };
          break;
        }
      }
    }

    if (availableQuest && (isAgreeing || lower.match(/\b(quest|task|job|mission|challenge|work|what do you need|give me)\b/))) {
      let qId = availableQuest.questId;
      state.activeQuests[qId] = { started: Date.now(), readyNotified: false };
      addMessage('npc', availableQuest.topic.text);
      addMessage('system', 'New quest: ' + GameData.quests[qId].name + ' — ' + GameData.quests[qId].desc);
      playSound('quest');
      updateHUD();
      return;
    }

    if (availableQuest && isDeclining) {
      addMessage('npc', "No pressure! Come back when you're ready. I'll be here.");
      return;
    }

    // 3. Shop confirmation
    if (lastShopItem && isAgreeing) {
      let itemDef = GameData.items[lastShopItem];
      if (state.inventory.indexOf(lastShopItem) !== -1) {
        response = "You already own the " + itemDef.name + "!";
      } else if (state.bugs >= itemDef.price) {
        state.bugs -= itemDef.price;
        state.inventory.push(lastShopItem);
        response = "Sold! " + itemDef.name + " is yours! You have " + state.bugs + " bugs left.";
        playSound('purchase');
        addMessage('npc', response);
        addMessage('system', 'Purchased: ' + itemDef.name + '!');
        if (lastShopItem === 'portal_key' && state.unlockedAreas.indexOf('cloud_nine') === -1) {
          state.unlockedAreas.push('cloud_nine');
          addMessage('system', 'Cloud Nine is now accessible from the Repository!');
        }
        lastShopItem = null;
        updateHUD();
        if (state.inventory.length >= 3 && state.achievements.indexOf('big_spender') === -1) unlockAchievement('big_spender');
        return;
      } else {
        response = "Not enough bugs! You need " + itemDef.price + " but only have " + state.bugs + ". Go catch more!";
      }
      lastShopItem = null;
      addMessage('npc', response);
      return;
    }

    if (isDeclining && lastShopItem) {
      lastShopItem = null;
      addMessage('npc', "No worries! Anything else catch your eye?");
      return;
    }

    // 4. Riddle quest answer check
    for (let t = 0; t < npc.topics.length; t++) {
      let topic = npc.topics[t];
      if (topic.questAnswer && state.activeQuests[topic.questAnswer] && !isQuestComplete(topic.questAnswer)) {
        if (matchScore(input, topic.kw) >= 5) {
          response = npc.questResponses[topic.questAnswer + '_complete'] || topic.text;
          playSound('quest');
          finishQuest(topic.questAnswer, npc, response);
          return;
        }
      }
    }

    // 5. Topic matching (lower threshold)
    let bestScore = 0;
    let bestTopic = null;
    for (let t = 0; t < npc.topics.length; t++) {
      let topic = npc.topics[t];
      if (topic.questAnswer) continue;
      let score = matchScore(input, topic.kw);
      if (score > bestScore) { bestScore = score; bestTopic = topic; }
    }

    if (bestTopic && bestScore >= 2) {
      response = bestTopic.text;
      if (bestTopic.shopItem) {
        lastShopItem = bestTopic.shopItem;
        if (state.inventory.indexOf(lastShopItem) !== -1) {
          response = "You already have the " + GameData.items[lastShopItem].name + "!";
          lastShopItem = null;
        } else {
          response += "\n\nWant to buy it? Say 'yes' or 'no'!";
        }
      }
      addMessage('npc', response);
      return;
    }

    // 6. Context-aware smart fallback
    response = getSmartFallback(npc, input, lower);
    addMessage('npc', response);
  }

  function getSmartFallback(npc, input, lower) {
    // Active quest progress
    for (let qId in state.activeQuests) {
      let q = GameData.quests[qId];
      if (q && q.giver === currentNPCId && !isQuestComplete(qId)) {
        return "You're working on " + q.name + " — " + getQuestProgressText(qId) + ". Keep at it!";
      }
    }

    // Who are you
    if (lower.match(/\b(who|name|you|yourself|about you)\b/)) {
      let nameKw = npc.topics.filter(function(t) { return t.kw.indexOf('who') !== -1 || t.kw.indexOf('name') !== -1; });
      if (nameKw.length > 0) return nameKw[0].text;
    }

    // Greeting
    if (lower.match(/\b(hello|hi|hey|sup|yo|greetings|hiya|howdy)\b/)) {
      let greetKw = npc.topics.filter(function(t) { return t.kw.indexOf('hello') !== -1 || t.kw.indexOf('hi') !== -1; });
      if (greetKw.length > 0) return greetKw[0].text;
    }

    // Thanks
    if (lower.match(/\b(thanks?|cheers|appreciate|ty)\b/)) {
      let thankKw = npc.topics.filter(function(t) { return t.kw.indexOf('thank') !== -1 || t.kw.indexOf('thanks') !== -1; });
      if (thankKw.length > 0) return thankKw[0].text;
    }

    // Goodbye
    if (lower.match(/\b(bye|goodbye|later|see ya|cya|leaving|gotta go)\b/)) {
      let byeKw = npc.topics.filter(function(t) { return t.kw.indexOf('bye') !== -1 || t.kw.indexOf('goodbye') !== -1; });
      if (byeKw.length > 0) return byeKw[0].text;
    }

    // Help/what do I do
    if (lower.match(/\b(help|what now|what do|bored|idk|stuck|lost|confused|how|where)\b/)) {
      let activeCount = Object.keys(state.activeQuests).length;
      if (activeCount > 0) {
        return "You've got " + activeCount + " active quest" + (activeCount > 1 ? 's' : '') + "! Press Q to check progress. Or ask me about anything — bugs, areas, items.";
      }
      let helpKw = npc.topics.filter(function(t) { return t.kw.indexOf('help') !== -1; });
      if (helpKw.length > 0) return helpKw[0].text;
      return "I can help with quests, give you info about the world, or point you in the right direction. What do you need?";
    }

    // Jokes
    if (lower.match(/\b(joke|funny|laugh|lol|haha|humor)\b/)) {
      let jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "What's a bug's favorite music? The Beatles, naturally!",
        "I told a bug it was being collected... it said 'that's a feature, not a bug!'",
        "A null walked into a bar. The bar crashed."
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // Personality fallback — pick a random line from this NPC's pool
    let lines = npcFallbackLines[currentNPCId];
    if (lines && lines.length > 0) {
      return lines[Math.floor(Math.random() * lines.length)];
    }

    return npc.defaultText;
  }

  // ====== QUEST SYSTEM ======
  function isQuestComplete(questId) {
    let q = GameData.quests[questId];
    if (!q) return false;
    switch (q.type) {
      case 'collect_bugs': return getTotalBugCatches(state) >= q.target;
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
    for (let qId in state.activeQuests) {
      if (isQuestComplete(qId)) {
        let q = GameData.quests[qId];
        if (!state.activeQuests[qId].readyNotified) {
          state.activeQuests[qId].readyNotified = true;
          showNotification('Quest ready: ' + q.name + '! Talk to ' + GameData.npcDefs[q.giver].name);
        }
      }
    }
  }

  function getQuestProgressText(qId) {
    let q = GameData.quests[qId];
    if (!q) return '';
    if (isQuestComplete(qId)) return 'Ready to turn in';

    switch (q.type) {
      case 'collect_bugs':
        return getTotalBugCatches(state) + '/' + q.target + ' bugs';
      case 'visit_areas':
        let visited = q.target.filter(function (a) { return state.unlockedAreas.indexOf(a) !== -1; }).length;
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
    let activeIds = Object.keys(state.activeQuests);
    if (activeIds.length > 0) {
      let q = GameData.quests[activeIds[0]];
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
    if (portalCooldown > 0) return;
    let area = GameData.areas[areaId];
    let tx = Math.floor((state.player.x + TILE / 2) / TILE);
    let ty = Math.floor((state.player.y + PLAYER_OFFSET_Y) / TILE);
    for (let i = 0; i < area.portals.length; i++) {
      let p = area.portals[i];
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

    // Inward spiral particles at entry
    let px = state.player.x + TILE / 2;
    let py = state.player.y + TILE / 2;
    for (let i = 0; i < 14; i++) {
      let a = (i / 14) * Math.PI * 2;
      let d = 70 + Math.random() * 30;
      particles.push({
        x: px + Math.cos(a) * d,
        y: py + Math.sin(a) * d,
        vx: -Math.cos(a) * 140,
        vy: -Math.sin(a) * 140,
        life: 0.4, maxLife: 0.4,
        color: i % 3 === 0 ? '#66bb6a' : i % 3 === 1 ? '#4fd5f7' : '#fff',
        size: 2.5 + Math.random() * 2
      });
    }

    // Radial wipe overlay
    dom.transitionOverlay.style.background = 'radial-gradient(circle, rgba(123,224,127,0.3), #000 70%)';
    dom.transitionOverlay.style.opacity = '1';

    setTimeout(function () {
      dom.transitionOverlay.style.background = '#000';

      state.player.x = destX;
      state.player.y = destY;
      state.player.area = destArea;
      camera.x = destX - canvasW / 2;
      camera.y = destY - canvasH / 2;
      camera.targetX = camera.x;
      camera.targetY = camera.y;
      loadArea(destArea);

      // Outward burst particles at destination
      for (let i = 0; i < 14; i++) {
        let a = (i / 14) * Math.PI * 2;
        particles.push({
          x: destX + TILE / 2,
          y: destY + TILE / 2,
          vx: Math.cos(a) * (80 + Math.random() * 60),
          vy: Math.sin(a) * (80 + Math.random() * 60),
          life: 0.6, maxLife: 0.6,
          color: i % 3 === 0 ? '#66bb6a' : i % 3 === 1 ? '#4fd5f7' : '#fff',
          size: 2.5 + Math.random() * 2
        });
      }

      setTimeout(function () {
        dom.transitionOverlay.style.opacity = '0';
        dom.transitionOverlay.style.background = '#000';
        transitioning = false;
        portalCooldown = 0.5;
      }, 350);
    }, 400);
  }

  // ====== PARTICLES ======
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
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

    let area = GameData.areas[areaId];
    if (!area) { renderStartBG(); return; }
    let pal = area.palette;

    // Apply screen shake
    ctx.save();
    ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y));

    let startCol = Math.floor(camera.x / TILE);
    let endCol = Math.ceil((camera.x + canvasW) / TILE);
    let startRow = Math.floor(camera.y / TILE);
    let endRow = Math.ceil((camera.y + canvasH) / TILE);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row < 0 || col < 0 || row >= currentMap.length || col >= currentMap[0].length) continue;
        let tile = currentMap[row][col];
        let sx = Math.floor(col * TILE - camera.x);
        let sy = Math.floor(row * TILE - camera.y);
        drawTile(tile, sx, sy, col, row, pal);
      }
    }

    if (signalLure.active) drawSignalLure();

    // Render bugs
    for (let i = 0; i < bugs.length; i++) drawBugSprite(bugs[i]);

    // Render NPCs
    for (let i = 0; i < area.npcs.length; i++) drawNPC(area.npcs[i]);

    // Render player
    drawPlayer();

    // Render particles
    for (let i = 0; i < particles.length; i++) drawParticle(particles[i]);

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
      let flashAlpha = Math.min(0.3, catchFlash.timer * 0.8);
      let gradient = ctx.createRadialGradient(canvasW/2, canvasH/2, 0, canvasW/2, canvasH/2, canvasW * 0.7);
      gradient.addColorStop(0, 'rgba(102, 187, 106, ' + flashAlpha + ')');
      gradient.addColorStop(0.5, 'rgba(41, 215, 255, ' + (flashAlpha * 0.5) + ')');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // Vibe mode overlay (not shaken)
    drawVibeOverlay();
    drawPulseStormOverlay();
  }

  function drawDayNightOverlay() {
    let isNight = isNightTime();
    if (!isNight && areaId !== 'twilight_grove') return;

    let darkness = isNight ? 0.4 : 0.15;
    if (areaId === 'twilight_grove') darkness = 0.25;

    ctx.fillStyle = 'rgba(10, 10, 30, ' + darkness + ')';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (isNight) {
      ctx.fillStyle = 'rgba(255, 255, 200, 0.03)';
      for (let s = 0; s < 30; s++) {
        let sx = ((s * 137) % canvasW);
        let sy = ((s * 89 + gameTime * 5) % canvasH);
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPetBug() {
    if (!state.petBug) return;
    let pet = GameData.petBugs[state.petBug];
    if (!pet) return;
    let petBugDef = getBugDef(state.petBug);

    let sx = state.player.x - camera.x + 24;
    let sy = state.player.y - camera.y + 8;
    let bob = Math.sin(gameTime * 4) * 2;

    let glowAlpha = 0.3 + Math.sin(gameTime * 3) * 0.15;
    let rgb = hexToRgb(pet.glowColor);
    ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + glowAlpha + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();

    if (art.bugSheet && art.bugSheet.complete && art.bugSheet.naturalWidth) {
      let petFrame = Math.floor((gameTime * 8) % 2);
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

    let wingF = Math.sin(gameTime * 8) * 0.4;
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

  function drawSignalLure() {
    if (!signalLure.active) return;
    let sx = Math.floor(signalLure.x - camera.x);
    let sy = Math.floor(signalLure.y - camera.y);
    let pulse = 12 + Math.sin(signalLure.pulse) * 4;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(41, 215, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(sx, sy, pulse + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = '#29d7ff';
    ctx.fillRect(sx - 2, sy - 12, 4, 6);
    ctx.restore();
  }

  function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  function renderStartBG() {
    let t = performance.now() / 1000;
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvasW, canvasH);
    for (let i = 0; i < 40; i++) {
      let x = ((i * 137 + t * 20) % canvasW);
      let y = ((i * 97 + Math.sin(t + i) * 30 + t * 10) % canvasH);
      let alpha = 0.2 + Math.sin(t * 2 + i) * 0.15;
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
    let n = noise(col, row);

    switch (tile) {
      case GameData.T.GROUND: {
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
      }

      case GameData.T.WALL: {
        ctx.fillStyle = pal.wall;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Better brick pattern
        ctx.strokeStyle = pal.wallLine;
        ctx.lineWidth = 1;
        let brickH = TILE / 3;
        for (let br = 0; br < 3; br++) {
          let bOffset = br % 2 === 0 ? 0 : TILE / 2;
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
      }

      case GameData.T.WATER: {
        let wt = gameTime * 2 + col * 0.5 + row * 0.3;
        ctx.fillStyle = pal.water;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Multiple wave lines
        ctx.fillStyle = pal.waterLight;
        let wave1 = Math.sin(wt) * 3;
        let wave2 = Math.sin(wt + 1.5) * 2;
        ctx.fillRect(sx + 4 + wave1, sy + 6, 8, 2);
        ctx.fillRect(sx + 18 - wave1, sy + 14, 10, 2);
        ctx.fillRect(sx + 8 + wave2, sy + 22, 6, 2);
        // Shimmer
        if (Math.sin(wt * 3) > 0.8) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(sx + 12 + wave1, sy + 10, 3, 2);
        }
        break;
      }

      case GameData.T.PORTAL: {
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        let pt = gameTime * 2 + col * 0.3 + row * 0.3;
        let pcx = sx + TILE / 2;
        let pcy = sy + TILE / 2;
        let pr = 22; // big radius, bleeds into neighbours
        ctx.save();
        ctx.translate(pcx, pcy);
        // Outer glow halo
        let glow = ctx.createRadialGradient(0, 0, pr * 0.6, 0, 0, pr + 8);
        glow.addColorStop(0, 'rgba(102, 187, 106, 0)');
        glow.addColorStop(0.5, 'rgba(102, 187, 106, 0.08)');
        glow.addColorStop(1, 'rgba(102, 187, 106, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, pr + 8, 0, Math.PI * 2);
        ctx.fill();
        // Dark void
        let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pr);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
        grad.addColorStop(0.4, 'rgba(8, 4, 22, 0.8)');
        grad.addColorStop(0.75, 'rgba(40, 20, 80, 0.35)');
        grad.addColorStop(1, 'rgba(102, 187, 106, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, pr, 0, Math.PI * 2);
        ctx.fill();
        // Outer ring
        ctx.strokeStyle = 'rgba(102, 187, 106, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, pr - 2 + Math.sin(pt * 1.5) * 1.5, pt, pt + Math.PI * 1.4);
        ctx.stroke();
        // Mid ring (counter-rotate)
        ctx.strokeStyle = 'rgba(79, 213, 247, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pr * 0.6 + Math.sin(pt * 2), -pt * 1.3, -pt * 1.3 + Math.PI * 1.1);
        ctx.stroke();
        // Inner ring
        ctx.strokeStyle = 'rgba(123, 224, 127, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, pr * 0.35, pt * 2, pt * 2 + Math.PI * 0.8);
        ctx.stroke();
        // Orbiting sparks
        for (let sp = 0; sp < 6; sp++) {
          let sa = pt * 1.5 + sp * Math.PI / 3;
          let sr = pr * 0.7 + Math.sin(pt * 3 + sp * 1.2) * 3;
          let alpha = 0.5 + Math.sin(pt * 4 + sp) * 0.3;
          ctx.fillStyle = sp % 2 === 0
            ? 'rgba(123, 224, 127, ' + alpha + ')'
            : 'rgba(79, 213, 247, ' + alpha + ')';
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center glow pulse
        let pp = 0.35 + Math.sin(pt * 2.5) * 0.2;
        ctx.fillStyle = 'rgba(123, 224, 127, ' + pp + ')';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case GameData.T.TREE: {
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
      }

      case GameData.T.TALL_GRASS: {
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Dense grass blades
        let gt = gameTime * 2 + col * 0.7;
        let sway = Math.sin(gt) * 2;
        ctx.lineWidth = 2;
        for (let g = 0; g < 5; g++) {
          let gx = sx + 3 + g * 6;
          let gy = sy + TILE;
          let h = 12 + (g % 3) * 4;
          let hue = g % 2 === 0 ? '#66bb6a' : '#81c784';
          ctx.strokeStyle = hue;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + sway + (g % 2 ? 3 : -3), gy - h * 0.6, gx + sway * 1.5, gy - h);
          ctx.stroke();
        }
        // Sparkle particles
        let sparkle = Math.sin(gt * 1.5 + row * 3.7);
        if (sparkle > 0.6) {
          ctx.fillStyle = 'rgba(255, 255, 255, ' + ((sparkle - 0.6) * 2) + ')';
          ctx.fillRect(sx + 10 + Math.sin(gt * 2) * 6, sy + 8 + Math.cos(gt) * 4, 2, 2);
          ctx.fillRect(sx + 22 + Math.cos(gt * 1.3) * 4, sy + 14 + Math.sin(gt * 0.8) * 3, 2, 2);
        }
        break;
      }

      case GameData.T.PATH: {
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
      }

      case GameData.T.FLOWERS: {
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        let colors = ['#ef5350', '#ffd54f', '#ce93d8', '#4fc3f7', '#ff7043'];
        // Stems first
        ctx.strokeStyle = '#43a047';
        ctx.lineWidth = 1;
        for (let f = 0; f < 4; f++) {
          let fx = sx + 5 + f * 7 + (n * 3 | 0);
          let fy = sy + TILE - 2;
          let fh = 10 + f * 3;
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
      }

      case GameData.T.BOOKSHELF: {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(sx, sy, TILE, TILE);
        // Better books
        let bookColors = ['#e53935', '#42a5f5', '#66bb6a', '#ffd54f', '#ab47bc', '#ff7043'];
        for (let shelf = 0; shelf < 2; shelf++) {
          let shY = sy + shelf * (TILE / 2) + 2;
          for (let bk = 0; bk < 5; bk++) {
            let bw = 4 + (n * 2 | 0);
            let bh = TILE / 2 - 5;
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
      }

      case GameData.T.CRYSTAL: {
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        let ct = gameTime * 1.5 + col + row;
        let glow = 0.5 + Math.sin(ct) * 0.3;
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
      }

      case GameData.T.CLOUD: {
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
      }

      case GameData.T.VOID: {
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(sx, sy, TILE, TILE);
        // Stars
        if (n > 0.85) {
          let st = gameTime + col * row * 0.1;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(st * 2) * 0.2) + ')';
          ctx.fillRect(sx + (n * 24 | 0), sy + (n * 20 | 0), 2, 2);
        }
        if (n > 0.7 && n < 0.75) {
          ctx.fillStyle = 'rgba(79,195,247,0.15)';
          ctx.fillRect(sx + 8, sy + 12, 4, 1);
        }
        break;
      }

      case GameData.T.DARK: {
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
      }

      case GameData.T.HOUSE: {
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
      }

      case GameData.T.LAMP_POST: {
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Post
        ctx.fillStyle = '#455a64';
        ctx.fillRect(sx + 14, sy + 12, 4, 20);
        ctx.fillRect(sx + 12, sy + 10, 8, 4);
        // Light glow
        let lampTime = gameTime * 2 + col * 0.5;
        let lampGlow = 0.4 + Math.sin(lampTime) * 0.15;
        ctx.fillStyle = 'rgba(255, 213, 79, ' + lampGlow + ')';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 213, 79, ' + (lampGlow * 0.3) + ')';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 16, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case GameData.T.POND: {
        ctx.fillStyle = pal.ground;
        ctx.fillRect(sx, sy, TILE, TILE);
        let pt = gameTime * 1.5 + col + row;
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        // Water ripples
        ctx.fillStyle = '#2e5a8f';
        let rx1 = Math.sin(pt) * 2;
        let ry1 = Math.cos(pt) * 2;
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
      }

      case GameData.T.FLOWER_CLUSTER: {
        ctx.fillStyle = n < 0.5 ? pal.ground : pal.groundAlt;
        ctx.fillRect(sx, sy, TILE, TILE);
        let fcolors = ['#e91e63', '#9c27b0', '#ff5722', '#ffeb3b'];
        for (let fc = 0; fc < 4; fc++) {
          let fx = sx + 4 + fc * 7 + (n * 4 | 0);
          let fy = sy + TILE - 4;
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
      }

      case GameData.T.ROCK: {
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
  }

  // ====== ENTITY RENDERING ======
  function drawBugSprite(bug) {
    let bugDef = getBugDef(bug.bugType);
    let sx = Math.floor(bug.x - camera.x);
    let sy = Math.floor(bug.y - camera.y + Math.sin(bug.bobOffset) * 3);

    // Glow
    let glowAlpha = 0.15 + Math.sin(bug.glowPhase) * 0.1;
    let glow = hexToRgb(bugDef.glow);
    ctx.fillStyle = 'rgba(' + glow.r + ',' + glow.g + ',' + glow.b + ',' + glowAlpha + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.fill();
    if (bug.stormCharged) {
      ctx.strokeStyle = 'rgba(41, 215, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 14 + Math.sin(gameTime * 10 + bug.bobOffset) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (art.bugSheet && art.bugSheet.complete && art.bugSheet.naturalWidth) {
      let frame = Math.floor((gameTime * 10 + bug.bobOffset) % 2);
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
    let wingAngle = Math.sin(bug.bobOffset * 6) * 0.3;
    let wing = hexToRgb(bugDef.wing);
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
    let legWave = Math.sin(bug.bobOffset * 4) * 2;
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
    let npc = GameData.npcDefs[npcId];
    if (!npc) return;
    let sx = Math.floor(npc.x * TILE - camera.x);
    let sy = Math.floor(npc.y * TILE - camera.y);
    let bob = Math.sin(npcBobTimer * 1.5 + npc.x) * 2;

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
      ctx.font = '8px ' + CANVAS_FONT_STACK;
      let nameW = ctx.measureText(npc.name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(sx + 16 - nameW / 2 - 6, sy - 14 + bob, nameW + 12, 16);
      ctx.fillStyle = npc.color;
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, sx + 16, sy - 2 + bob);
      ctx.textAlign = 'left';
    }

    // Quest indicator: green ? for ready, yellow ! for new
    let hasNewQuest = false;
    let hasReadyQuest = false;
    Object.keys(GameData.quests).forEach(function (qId) {
      let q = GameData.quests[qId];
      if (q.giver === npcId) {
        if (state.activeQuests[qId] && isQuestComplete(qId)) hasReadyQuest = true;
        else if (state.completedQuests.indexOf(qId) === -1 && !state.activeQuests[qId]) hasNewQuest = true;
      }
    });
    if (nearestNPC !== npcId) {
      if (hasReadyQuest) {
        let excBob = Math.sin(gameTime * 4) * 3;
        ctx.fillStyle = '#66bb6a';
        ctx.font = 'bold 16px ' + CANVAS_FONT_STACK;
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + 16, sy - 4 + excBob + bob);
        ctx.textAlign = 'left';
      } else if (hasNewQuest) {
        let excBob = Math.sin(gameTime * 4) * 3;
        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 14px ' + CANVAS_FONT_STACK;
        ctx.textAlign = 'center';
        ctx.fillText('!', sx + 16, sy - 4 + excBob + bob);
        ctx.textAlign = 'left';
      }
    }
  }

  function drawPlayer() {
    let sx = Math.floor(state.player.x - camera.x);
    let sy = Math.floor(state.player.y - camera.y);
    let bob = walkFrame % 2 === 1 ? -1 : 0;
    let dir = state.player.dir;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 30, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (art.playerSheet && art.playerSheet.complete && art.playerSheet.naturalWidth) {
      let spriteFrame = walkFrame === 1 || walkFrame === 3 ? 1 : 0;
      let frameIndex = dir * 2 + spriteFrame;
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
      let swingAngle = (1 - swingAnim / 0.3) * Math.PI * 0.8 - 0.4;
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
    let sx = Math.floor(p.x - camera.x);
    let sy = Math.floor(p.y - camera.y);
    let alpha = p.life / p.maxLife;

    if (p.text) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = 'bold ' + p.size + 'px ' + CANVAS_FONT_STACK;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, sx, sy);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      let s = p.size * alpha;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  function drawDarkness() {
    let hasLantern = state.inventory.indexOf('lantern') !== -1;
    let px = Math.floor(state.player.x + 16 - camera.x);
    let py = Math.floor(state.player.y + 16 - camera.y);
    let innerR = hasLantern ? 70 : 35;
    let outerR = hasLantern ? 220 : 110;
    let darkness = hasLantern ? 0.8 : 0.93;
    let grad = ctx.createRadialGradient(px, py, innerR, px, py, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,' + (darkness * 0.5) + ')');
    grad.addColorStop(1, 'rgba(0,0,0,' + darkness + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ====== MINIMAP ======
  function drawMinimap() {
    if (!currentMap) return;
    let mw = currentMap[0].length;
    let mh = currentMap.length;
    let s = 3;
    minimapCanvas.width = mw * s;
    minimapCanvas.height = mh * s;
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        let tile = currentMap[y][x];
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
    let area = GameData.areas[areaId];
    area.npcs.forEach(function (npcId) {
      let npc = GameData.npcDefs[npcId];
      if (!npc) return;
      minimapCtx.fillStyle = npc.color;
      minimapCtx.fillRect(npc.x * s, npc.y * s, s, s);
    });
  }

  function updateMinimapPlayer() {
    if (!minimapCtx || !currentMap) return;
    drawMinimap();
    let px = Math.floor(state.player.x / TILE) * 3;
    let py = Math.floor(state.player.y / TILE) * 3;
    minimapCtx.fillStyle = '#ff5252';
    minimapCtx.fillRect(px, py, 3, 3);
  }

  // ====== VIBE OVERLAY ======
  function drawVibeOverlay() {
    if (vibeMode.intensity <= 0) return;
    let a = vibeMode.intensity;
    let pulse = 0.3 + Math.sin(gameTime * 8) * 0.15;
    let edge = 60 * a;
    let grad;
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
      let tp = 0.7 + Math.sin(gameTime * 6) * 0.3;
      ctx.globalAlpha = tp * a;
      ctx.font = 'bold 14px ' + CANVAS_FONT_STACK;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#29d7ff'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff4d8d';
      ctx.fillText('VIBE MODE', canvasW / 2, 46);
      ctx.fillStyle = '#29d7ff';
      ctx.font = '8px ' + CANVAS_FONT_STACK;
      ctx.fillText('x2 BUGS // CHAIN ' + comboState.count, canvasW / 2, 62);
      ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  function drawPulseStormOverlay() {
    if (!pulseStorm.active && pulseStorm.flash <= 0) return;
    let flash = pulseStorm.active ? 0.12 + pulseStorm.flash * 0.4 : pulseStorm.flash * 0.2;
    let tintTop = pulseStorm.phase === 'scatter' ? '255,77,141' : '41,215,255';
    let tintBottom = pulseStorm.phase === 'scatter' ? '255,213,79' : '255,122,89';
    let gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
    gradient.addColorStop(0, 'rgba(' + tintTop + ',' + flash + ')');
    gradient.addColorStop(1, 'rgba(' + tintBottom + ',' + (flash * 0.35) + ')');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (!pulseStorm.active) return;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvasH; y += 20) {
      let offset = Math.sin(gameTime * 6 + y * 0.06) * 18;
      ctx.beginPath();
      ctx.moveTo(offset, y);
      ctx.lineTo(canvasW + offset, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.85;
    ctx.font = '8px ' + CANVAS_FONT_STACK;
    ctx.textAlign = 'center';
    ctx.fillStyle = pulseStorm.phase === 'scatter' ? '#ffd54f' : '#29d7ff';
    ctx.fillText('PULSE STORM // ' + pulseStorm.phase.toUpperCase(), canvasW / 2, canvasH - 28);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // ====== WEATHER SYSTEM ======
  function updateWeather(dt) {
    // Only spawn weather in outdoor areas
    let noWeatherAreas = ['null_caves', 'repository', 'cloud_nine'];
    if (noWeatherAreas.indexOf(areaId) !== -1) {
      weather.active = false;
      weather.particles = [];
      return;
    }
    
    if (!weather.active) {
      let seed = Math.floor(gameTime / 30);
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
    
    for (let i = 0; i < weather.particles.length; i++) {
      let p = weather.particles[i];
      p.y += p.speed * dt * 60;
      p.x += p.drift * dt * 60;
    }
    weather.particles = weather.particles.filter(function(p) { return p.y < canvasH + 10; });
  }

  function drawWeather() {
    if (!weather.active) return;
    
    if (weather.type === 'rain') {
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < weather.particles.length; i++) {
        let p = weather.particles[i];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 2, p.y + 15);
      }
      ctx.stroke();
    } else if (weather.type === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let j = 0; j < weather.particles.length; j++) {
        let s = weather.particles[j];
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ====== BESTIARY ======
  function toggleBestiary() {
    bestiaryOpen = !bestiaryOpen;
    setVisibility(dom.bestiaryPanel, bestiaryOpen, 'block');
    if (bestiaryOpen) renderBestiary();
  }

  function renderBestiary() {
    let grid = dom.bestiaryPanel.querySelector('.bestiary-grid');
    let progress = dom.bestiaryPanel.querySelector('.bestiary-progress');
    grid.innerHTML = '';
    let allBugs = Object.keys(GameData.bugTypes);
    let discovered = state.discoveredBugTypes || [];
    progress.textContent = discovered.length + ' / ' + allBugs.length + ' species discovered';

    if (discovered.length === 0) {
      grid.innerHTML = '<div class="bestiary-empty">No species discovered yet. Catch bugs in the tall grass with SPACE to fill your bestiary!</div>';
      return;
    }

    allBugs.forEach(function (bugId) {
      let def = GameData.bugTypes[bugId];
      let found = discovered.indexOf(bugId) !== -1;
      let count = state.bugLog[bugId] || 0;
      let div = document.createElement('div');
      div.className = 'bestiary-entry' + (found ? '' : ' undiscovered');
      let colorBg = found ? def.glow + '33' : '#222';
      let rarityClass = found ? ' rarity-' + def.rarity : '';
      div.innerHTML =
        '<div class="bestiary-bug-icon" style="background:' + colorBg + '">' +
          '<span style="font-size:18px;color:' + (found ? def.color : '#333') + '">' + (found ? '\uD83D\uDC1B' : '?') + '</span>' +
        '</div>' +
        '<div class="bestiary-info">' +
          '<div class="bestiary-name">' + (found ? def.name : '???') + '</div>' +
          '<div class="bestiary-meta">' +
            (found ? '<span class="rarity-badge' + rarityClass + '">' + def.rarity + '</span> <span class="bestiary-stat">' + def.value + ' bug' + (def.value > 1 ? 's' : '') + '</span> <span class="bestiary-stat">spd ' + def.speed + '</span>' : 'Not yet discovered') +
          '</div>' +
        '</div>' +
        (found ? '<div class="bestiary-count">x' + count + '</div>' : '');
      grid.appendChild(div);
    });
  }

  function getAreaScannerHint() {
    switch (areaId) {
      case 'spawn_village':
        return 'Central hub. Good place to restock, talk to Vivian, and watch storm routes open toward the outer zones.';
      case 'syntax_meadows':
        return 'High grass, dense bug traffic, and wide lanes. Best place to set a lure before a storm flips to pull.';
      case 'repository':
        return 'Low spawn pressure, but the route data here is clean. Use the scanner to plan the next portal hop.';
      case 'null_caves':
        return 'Tight corridors turn scatter phases dangerous. Stay mobile and keep bugs from pinning you in.';
      case 'cloud_nine':
        return 'Fast skimmers and exposed lanes. Great for combo extension once the storm starts feeding glitchlings in.';
      case 'twilight_grove':
        return 'Night bugs spike after dusk, and the pond gives you a safer lane when the storm gets noisy.';
      case 'neon_garden':
        return 'Storm-native territory. Expect harder swings, denser glitchlings, and the best returns for aggressive chains.';
      default:
        return 'Scan the field, watch the routes, and follow the strongest signal.';
    }
  }

  function getWeatherLabel() {
    if (!weather.active) return 'Clear';
    return weather.type === 'snow' ? 'Snowfall' : 'Rain';
  }

  function getSignalLureLabel() {
    if (!canUseSignalLure()) return 'Locked';
    if (signalLure.active) return 'Active for ' + Math.ceil(signalLure.timer) + 's';
    if (signalLure.cooldown > 0) return 'Recharging ' + signalLure.cooldown.toFixed(1) + 's';
    return 'Ready';
  }

  function getStormLabel() {
    if (pulseStorm.active) {
      return 'ACTIVE // ' + pulseStorm.phase.toUpperCase() + ' // ' + Math.ceil(pulseStorm.timer) + 's';
    }
    return 'Calm // next surge in ' + Math.ceil(pulseStorm.timer) + 's';
  }

  function toggleScanner() {
    scannerOpen = !scannerOpen;
    setVisibility(dom.scannerPanel, scannerOpen, 'block');
    if (scannerOpen) dom.interactPrompt.style.display = 'none';
    else if (started) checkNPCProximity();
    scannerRefreshTimer = 0;
    if (scannerOpen) renderScanner();
  }

  function renderScanner() {
    if (!dom.scannerPanel || !state) return;
    let grid = dom.scannerPanel.querySelector('.scanner-grid');
    if (!grid) return;

    let area = GameData.areas[areaId];
    if (!area) {
      grid.innerHTML = '';
      return;
    }

    let pool = getActiveBugPool();
    let totalWeight = 0;
    for (let i = 0; i < pool.length; i++) totalWeight += pool[i].weight;

    let speciesHtml = '';
    for (let p = 0; p < pool.length; p++) {
      let entry = pool[p];
      let def = getBugDef(entry.id);
      let seen = state.bugLog[entry.id] || 0;
      let percent = totalWeight > 0 ? Math.round((entry.weight / totalWeight) * 100) : 0;
      speciesHtml +=
        '<div class="scanner-row">' +
          '<span class="scanner-row-name" style="color:' + def.color + '">' + def.name + '</span>' +
          '<span class="scanner-row-meta">' + percent + '% &middot; seen ' + seen + '</span>' +
        '</div>';
    }
    if (!speciesHtml) speciesHtml = '<div class="scanner-empty">No viable bug signatures found.</div>';

    let routeSeen = {};
    let routesHtml = '';
    for (let r = 0; r < area.portals.length; r++) {
      let portal = area.portals[r];
      if (routeSeen[portal.dest]) continue;
      routeSeen[portal.dest] = true;
      let destArea = GameData.areas[portal.dest];
      let routeState = 'online';
      let routeText = 'Online';
      if (portal.requireItem && state.inventory.indexOf(portal.requireItem) === -1) {
        routeState = 'requirement';
        routeText = 'Need ' + GameData.items[portal.requireItem].name;
      } else if (state.unlockedAreas.indexOf(portal.dest) === -1) {
        routeState = 'locked';
        routeText = 'Locked';
      }
      routesHtml +=
        '<div class="scanner-row">' +
          '<span class="scanner-row-name">' + (destArea ? destArea.name : portal.dest) + '</span>' +
          '<span class="scanner-state scanner-state-' + routeState + '">' + routeText + '</span>' +
        '</div>';
    }
    if (!routesHtml) routesHtml = '<div class="scanner-empty">No route signatures in this zone.</div>';

    grid.innerHTML =
      '<section class="scanner-card">' +
        '<div class="scanner-kicker">Zone</div>' +
        '<div class="scanner-title">' + area.name + '</div>' +
        '<div class="scanner-body">' + getAreaScannerHint() + '</div>' +
        '<div class="scanner-pill-row">' +
          '<span class="scanner-pill">' + (isNightTime() ? 'Night Cycle' : 'Day Cycle') + '</span>' +
          '<span class="scanner-pill">' + getWeatherLabel() + '</span>' +
        '</div>' +
      '</section>' +
      '<section class="scanner-card">' +
        '<div class="scanner-kicker">Bug Forecast</div>' +
        '<div class="scanner-list">' + speciesHtml + '</div>' +
      '</section>' +
      '<section class="scanner-card">' +
        '<div class="scanner-kicker">Routes</div>' +
        '<div class="scanner-list">' + routesHtml + '</div>' +
      '</section>' +
      '<section class="scanner-card">' +
        '<div class="scanner-kicker">Systems</div>' +
        '<div class="scanner-stack">' +
          '<div><strong>Objective:</strong> ' + getActiveObjectiveText() + '</div>' +
          '<div><strong>Storm:</strong> ' + getStormLabel() + '</div>' +
          '<div><strong>Signal Lure:</strong> ' + getSignalLureLabel() + '</div>' +
          '<div><strong>Chain:</strong> x' + comboState.count + ' now &middot; best x' + (state.bestCombo || 0) + '</div>' +
        '</div>' +
      '</section>';
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
    if (dom.lureDisplay) {
      if (!canUseSignalLure()) {
        dom.lureDisplay.textContent = 'Lure Locked';
        dom.lureDisplay.dataset.state = 'locked';
      } else if (signalLure.active) {
        dom.lureDisplay.textContent = 'Lure ' + Math.ceil(signalLure.timer) + 's';
        dom.lureDisplay.dataset.state = 'active';
      } else if (signalLure.cooldown > 0) {
        dom.lureDisplay.textContent = 'Lure ' + signalLure.cooldown.toFixed(1) + 's';
        dom.lureDisplay.dataset.state = 'cooldown';
      } else {
        dom.lureDisplay.textContent = 'Lure Ready';
        dom.lureDisplay.dataset.state = 'ready';
      }
    }
    if (dom.stormDisplay) {
      if (pulseStorm.active) {
        dom.stormDisplay.textContent = 'Storm ' + pulseStorm.phase.toUpperCase() + ' ' + Math.ceil(pulseStorm.timer) + 's';
        dom.stormDisplay.dataset.state = pulseStorm.phase;
      } else {
        dom.stormDisplay.textContent = 'Calm ' + Math.ceil(pulseStorm.timer) + 's';
        dom.stormDisplay.dataset.state = 'calm';
      }
    }
    let activeCount = Object.keys(state.activeQuests).length;
    if (activeCount > 0) {
      setVisibility(dom.questIndicator, true, 'block');
      dom.questIndicator.textContent = activeCount + ' quest' + (activeCount > 1 ? 's' : '');
    } else {
      setVisibility(dom.questIndicator, false);
    }
    if (dom.goldenBugs) {
      let gb = state.goldenBugs || 0;
      dom.goldenBugs.textContent = gb + ' Golden';
      setVisibility(dom.goldenBugs, gb > 0, 'block');
    }
    updateMinimapPlayer();
  }

  function showNotification(text) {
    dom.notification.textContent = text;
    setVisibility(dom.notification, true, 'block');
    notifTimer = 3;
  }

  function triggerGreatDebugMilestone(message) {
    transitioning = true;
    let overlay = dom.transitionOverlay;
    overlay.style.transition = 'opacity 2s';
    overlay.style.opacity = '1';
    
    setTimeout(function() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      
      let glTitle = document.createElement('div');
      glTitle.id = 'great-debug-title';
      glTitle.innerHTML = '<span>THE</span><span>GREAT</span><span>DEBUG</span>';
      glTitle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-pixel);font-size:32px;color:#66bb6a;text-align:center;animation:glowPulse 2s infinite;';
      document.getElementById('game-container').appendChild(glTitle);
      
      let style = document.createElement('style');
      style.textContent = '@keyframes glowPulse{0%,100%{text-shadow:0 0 20px #66bb6a,0 0 40px #66bb6a}50%{text-shadow:0 0 40px #66bb6a,0 0 80px #66bb6a,0 0 120px #29d7ff}}';
      document.head.appendChild(style);
      
      showNotification(message || 'You are now a Legend of the Vibeverse!');
      
      setTimeout(function() {
        unlockAchievement('legend');
        transitioning = false;
        overlay.style.transition = 'opacity 1s';
        overlay.style.opacity = '0';
        if (glTitle.parentNode) glTitle.parentNode.removeChild(glTitle);
      }, 4000);
    }, 2000);
  }

  function unlockAchievement(id) {
    if (!state || state.achievements.indexOf(id) !== -1) return;
    state.achievements.push(id);
    let def = GameData.achievementDefs.find(function (a) { return a.id === id; });
    if (!def) return;
    dom.achievePopup.querySelector('.ach-name').textContent = def.name;
    setVisibility(dom.achievePopup, true, 'block');
    achieveTimer = 4;
    playSound('achieve');
    showNotification(def.desc);
  }

  function toggleInventory() {
    inventoryOpen = !inventoryOpen;
    setVisibility(dom.inventoryPanel, inventoryOpen, 'block');
    if (inventoryOpen) renderInventory();
  }

  function renderInventory() {
    dom.inventoryGrid.innerHTML = '';
    if (state.inventory.length === 0) {
      dom.inventoryGrid.innerHTML = '<div id="inventory-empty">No items yet. Visit Vendor Vivian in Spawn Village!</div>';
    } else {
      let icons = { 
        bug_net: '\uD83E\uDD8B', 
        lantern: '\uD83D\uDD26', 
        speed_boots: '\uD83D\uDC62', 
        signal_lure: '\uD83D\uDCE1',
        bug_magnet: '\uD83E\uDDF2', 
        portal_key: '\uD83D\uDD11',
        fishing_rod: '\uD83C\uDFA3',
        premium_bait: '\uD83E\uDD7E',
        fish_jar: '\uD83E\uDED9',
        moon_lantern: '\uD83C\uDF19',
        pulse_pack: '\u26A1'
      };
      state.inventory.forEach(function (itemId) {
        let item = GameData.items[itemId];
        if (!item) return;
        let div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = '<div class="inv-item-icon">' + (icons[itemId] || '?') + '</div>' +
          '<div class="inv-item-name">' + item.name + '</div>' +
          '<div class="inv-item-desc">' + item.desc + '</div>';
        dom.inventoryGrid.appendChild(div);
      });
    }

    if (state.discoveredBugTypes && state.discoveredBugTypes.length > 0) {
      let codexDiv = document.createElement('div');
      codexDiv.className = 'inv-item';
      codexDiv.style.borderColor = '#ff9f68';
      codexDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDCD6</div>' +
        '<div class="inv-item-name">Bug Codex</div>' +
        '<div class="inv-item-desc">' + state.discoveredBugTypes.length + ' species found</div>';
      dom.inventoryGrid.appendChild(codexDiv);
    }

    if (state.petBug) {
      let pet = GameData.petBugs[state.petBug];
      let petDiv = document.createElement('div');
      petDiv.className = 'inv-item';
      petDiv.style.borderColor = pet.color;
      petDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDC1F</div>' +
        '<div class="inv-item-name">' + pet.name + '</div>' +
        '<div class="inv-item-desc">' + pet.special + '</div>';
      dom.inventoryGrid.appendChild(petDiv);
    }

    if (state.fishCaught && state.fishCaught.length > 0) {
      let fishCount = {};
      state.fishCaught.forEach(function(f) { fishCount[f] = (fishCount[f] || 0) + 1; });
      let fishDiv = document.createElement('div');
      fishDiv.className = 'inv-item';
      fishDiv.style.borderColor = '#4dd0e1';
      let fishList = Object.keys(fishCount).map(function(f) { 
        return GameData.fishTypes[f].name + ' x' + fishCount[f]; 
      }).join(', ');
      fishDiv.innerHTML = '<div class="inv-item-icon">\uD83D\uDC1F</div>' +
        '<div class="inv-item-name">Fish Collection</div>' +
        '<div class="inv-item-desc">' + fishList + '</div>';
      dom.inventoryGrid.appendChild(fishDiv);
    }

    let stats = dom.inventoryPanel.querySelector('.inv-stats');
    let timeStr = isNightTime() ? 'Night' : 'Day';
    if (stats) {
      stats.innerHTML = '<span>Bugs: ' + state.bugs + '</span>' +
        '<span>Caught: ' + getTotalBugCatches(state) + '</span>' +
        '<span>Earned: ' + state.totalBugsCollected + '</span>' +
        '<span>Best Chain: ' + (state.bestCombo || 0) + '</span>' +
        '<span>' + timeStr + '</span>';
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    setVisibility(dom.menuPanel, menuOpen, 'block');
  }

  function toggleQuests() {
    questsOpen = !questsOpen;
    setVisibility(dom.questsPanel, questsOpen, 'block');
    if (questsOpen) renderQuests();
  }

  function renderQuests() {
    let container = dom.questsPanel.querySelector('.quests-list');
    if (!container) return;
    container.innerHTML = '';
    let hasAny = false;
    for (let qId in state.activeQuests) {
      hasAny = true;
      let q = GameData.quests[qId];
      let complete = isQuestComplete(qId);
      let div = document.createElement('div');
      div.className = 'quest-item' + (complete ? ' completed' : '');
      div.innerHTML = '<div class="quest-name">' + q.name + '</div>' +
        '<div class="quest-desc">' + q.desc + '</div>' +
        '<div class="quest-status">' + getQuestProgressText(qId) + '</div>';
      container.appendChild(div);
    }
    state.completedQuests.forEach(function (qId) {
      hasAny = true;
      let q = GameData.quests[qId];
      if (!q) return;
      let div = document.createElement('div');
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
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  async function saveGame() {
    if (!cookiesAccepted || !state) return false;
    const saved = await SaveSystem.save(state);
    if (saved) {
      savePreviewPromise = Promise.resolve(state);
      renderContinueInfo(state);
    }
    return !!saved;
  }

  // ====== INIT ON LOAD ======
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { void init(); });
  } else {
    void init();
  }

  return { init: init };

})();
