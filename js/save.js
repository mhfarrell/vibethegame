/**
 * Vibe The Game - Save System v2
 * Uses IndexedDB for robust persistent storage with cookie fallback
 */
const SaveSystem = {
  DB_NAME: 'VibeTheGame',
  DB_VERSION: 1,
  STORE_NAME: 'gameSave',
  COOKIE_NAME: 'vibeGameSave',
  CONSENT_COOKIE: 'vibeCookieConsent',
  COOKIE_DAYS: 365,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to cookies');
        resolve(false);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

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

  async save(state) {
    const data = JSON.stringify(state);
    
    // Try IndexedDB first
    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        store.put({ id: 'gameState', data: data, timestamp: Date.now() });
        return new Promise((resolve) => {
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('IndexedDB save failed:', e);
      }
    }
    
    // Fallback to cookies + localStorage
    this.setCookie(this.COOKIE_NAME, data, this.COOKIE_DAYS);
    try { localStorage.setItem(this.COOKIE_NAME, data); } catch (e) { }
    return true;
  },

  async load() {
    // Try IndexedDB first
    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get('gameState');
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            if (request.result) {
              try {
                const parsed = JSON.parse(request.result.data);
                resolve(this.normalizeState(parsed));
              } catch (e) {
                resolve(this.loadFallback());
              }
            } else {
              resolve(this.loadFallback());
            }
          };
          request.onerror = () => resolve(this.loadFallback());
        });
      } catch (e) {
        console.warn('IndexedDB load failed:', e);
      }
    }
    
    return this.loadFallback();
  },

  loadFallback() {
    let data = this.getCookie(this.COOKIE_NAME);
    if (!data) {
      try { data = localStorage.getItem(this.COOKIE_NAME); } catch (e) { }
    }
    if (!data) return null;
    try { return this.normalizeState(JSON.parse(data)); } catch (e) { return null; }
  },

  async clear() {
    // Clear IndexedDB
    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        store.delete('gameState');
      } catch (e) {
        console.warn('IndexedDB clear failed:', e);
      }
    }
    
    // Clear cookies and localStorage
    this.deleteCookie(this.COOKIE_NAME);
    try { localStorage.removeItem(this.COOKIE_NAME); } catch (e) { }
  },

  normalizeState(state) {
    const defaults = this.getDefaultState();
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

// Initialize on load
if (typeof window !== 'undefined') {
  SaveSystem.init();
}
