/**
 * Vibe The Game - Save System
 * Uses cookies + localStorage for persistent game progress
 */
const SaveSystem = {
  COOKIE_NAME: 'vibeGameSave',
  CONSENT_COOKIE: 'vibeCookieConsent',
  COOKIE_DAYS: 365,

  setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; expires=' + expires + '; path=/; SameSite=Lax';
  },

  getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },

  deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  },

  hasConsent() {
    return this.getCookie(this.CONSENT_COOKIE) === 'true';
  },

  giveConsent() {
    this.setCookie(this.CONSENT_COOKIE, 'true', this.COOKIE_DAYS);
  },

  save(state) {
    var data = JSON.stringify(state);
    this.setCookie(this.COOKIE_NAME, data, this.COOKIE_DAYS);
    try { localStorage.setItem(this.COOKIE_NAME, data); } catch (e) { }
  },

  load() {
    var data = this.getCookie(this.COOKIE_NAME);
    if (!data) {
      try { data = localStorage.getItem(this.COOKIE_NAME); } catch (e) { }
    }
    if (!data) return null;
    try { return this.normalizeState(JSON.parse(data)); } catch (e) { return null; }
  },

  clear() {
    this.deleteCookie(this.COOKIE_NAME);
    try { localStorage.removeItem(this.COOKIE_NAME); } catch (e) { }
  },

  normalizeState(state) {
    var defaults = this.getDefaultState();
    if (!state || typeof state !== 'object') return defaults;
    return {
      player: Object.assign({}, defaults.player, state.player || {}),
      bugs: typeof state.bugs === 'number' ? state.bugs : defaults.bugs,
      totalBugsCollected: typeof state.totalBugsCollected === 'number' ? state.totalBugsCollected : defaults.totalBugsCollected,
      goldenBugs: typeof state.goldenBugs === 'number' ? state.goldenBugs : defaults.goldenBugs,
      inventory: Array.isArray(state.inventory) ? state.inventory.slice() : defaults.inventory.slice(),
      activeQuests: state.activeQuests && typeof state.activeQuests === 'object' ? state.activeQuests : {},
      completedQuests: Array.isArray(state.completedQuests) ? state.completedQuests.slice() : [],
      unlockedAreas: Array.isArray(state.unlockedAreas) ? state.unlockedAreas.slice() : defaults.unlockedAreas.slice(),
      npcMemory: state.npcMemory && typeof state.npcMemory === 'object' ? state.npcMemory : {},
      achievements: Array.isArray(state.achievements) ? state.achievements.slice() : [],
      playTime: typeof state.playTime === 'number' ? state.playTime : defaults.playTime,
      version: 4,
      timeOfDay: typeof state.timeOfDay === 'number' ? state.timeOfDay : defaults.timeOfDay,
      petBug: typeof state.petBug === 'string' ? state.petBug : defaults.petBug,
      fishCaught: Array.isArray(state.fishCaught) ? state.fishCaught.slice() : [],
      totalFishCaught: typeof state.totalFishCaught === 'number' ? state.totalFishCaught : defaults.totalFishCaught,
      fishJarCount: typeof state.fishJarCount === 'number' ? state.fishJarCount : defaults.fishJarCount,
      bugLog: state.bugLog && typeof state.bugLog === 'object' ? state.bugLog : {},
      bestCombo: typeof state.bestCombo === 'number' ? state.bestCombo : defaults.bestCombo,
      discoveredBugTypes: Array.isArray(state.discoveredBugTypes) ? state.discoveredBugTypes.slice() : [],
      lastObjectiveHint: typeof state.lastObjectiveHint === 'string' ? state.lastObjectiveHint : defaults.lastObjectiveHint,
      greatDebugTriggered: !!state.greatDebugTriggered
    };
  },

  getDefaultState() {
    return {
      player: { x: 448, y: 480, area: 'spawn_village', dir: 0 },
      bugs: 0,
      totalBugsCollected: 0,
      goldenBugs: 0,
      inventory: [],
      activeQuests: {},
      completedQuests: [],
      unlockedAreas: ['spawn_village', 'syntax_meadows'],
      npcMemory: {},
      achievements: [],
      playTime: 0,
      version: 4,
      // New features
      timeOfDay: 0,
      petBug: null,
      fishCaught: [],
      totalFishCaught: 0,
      fishJarCount: 0,
      bugLog: {},
      bestCombo: 0,
      discoveredBugTypes: [],
      lastObjectiveHint: 'Talk to Professor Semicolon',
      greatDebugTriggered: false
    };
  }
};
