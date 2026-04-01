/**
 * Vibe The Game - Save System v3
 * Uses IndexedDB first, with local browser storage fallbacks.
 */
export const SaveSystem = {
  DB_NAME: 'VibeTheGame',
  DB_VERSION: 1,
  STORE_NAME: 'gameSave',
  SAVE_ID: 'gameState',
  COOKIE_NAME: 'vibeGameSave',
  CONSENT_COOKIE: 'vibeCookieConsent',
  COOKIE_DAYS: 365,
  db: null,
  readyPromise: null,

  init() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to browser storage');
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
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
          this.readyPromise = null;
        };
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });

    return this.readyPromise;
  },

  async ensureReady() {
    return this.init();
  },

  setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; expires=' + expires + '; path=/; SameSite=Lax';
  },

  getCookie(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (let i = 0; i < cookies.length; i++) {
      const separator = cookies[i].indexOf('=');
      const cookieName = separator === -1 ? cookies[i] : cookies[i].slice(0, separator);
      if (cookieName === name) {
        return decodeURIComponent(separator === -1 ? '' : cookies[i].slice(separator + 1));
      }
    }
    return null;
  },

  deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  },

  hasConsent() {
    return this.getCookie(this.CONSENT_COOKIE) === 'true';
  },

  giveConsent() {
    this.setCookie(this.CONSENT_COOKIE, 'true', this.COOKIE_DAYS);
  },

  async save(state) {
    const data = JSON.stringify(state);
    await this.ensureReady();

    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        store.put({ id: this.SAVE_ID, data: data, timestamp: Date.now() });
        return await this.waitForTransaction(tx);
      } catch (error) {
        console.warn('IndexedDB save failed:', error);
      }
    }

    return this.saveFallback(data);
  },

  saveFallback(data) {
    this.setCookie(this.COOKIE_NAME, data, this.COOKIE_DAYS);
    try {
      localStorage.setItem(this.COOKIE_NAME, data);
    } catch (error) {
      console.warn('localStorage save failed:', error);
    }
    return true;
  },

  async load() {
    await this.ensureReady();

    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get(this.SAVE_ID);

        return await new Promise((resolve) => {
          request.onsuccess = () => {
            if (!request.result) {
              resolve(this.loadFallback());
              return;
            }

            try {
              resolve(this.normalizeState(JSON.parse(request.result.data)));
            } catch (error) {
              console.warn('IndexedDB data was invalid, using fallback storage:', error);
              resolve(this.loadFallback());
            }
          };
          request.onerror = () => resolve(this.loadFallback());
        });
      } catch (error) {
        console.warn('IndexedDB load failed:', error);
      }
    }

    return this.loadFallback();
  },

  loadFallback() {
    let data = this.getCookie(this.COOKIE_NAME);
    if (!data) {
      try {
        data = localStorage.getItem(this.COOKIE_NAME);
      } catch (error) {
        console.warn('localStorage load failed:', error);
      }
    }
    if (!data) return null;

    try {
      return this.normalizeState(JSON.parse(data));
    } catch (error) {
      console.warn('Fallback save data was invalid:', error);
      return null;
    }
  },

  async clear() {
    await this.ensureReady();

    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(this.SAVE_ID);
        await this.waitForTransaction(tx);
      } catch (error) {
        console.warn('IndexedDB clear failed:', error);
      }
    }

    this.deleteCookie(this.COOKIE_NAME);
    try {
      localStorage.removeItem(this.COOKIE_NAME);
    } catch (error) {
      console.warn('localStorage clear failed:', error);
    }
  },

  waitForTransaction(tx) {
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  },

  normalizeState(state) {
    const defaults = this.getDefaultState();
    if (!state || typeof state !== 'object') return defaults;

    const normalized = {
      player: Object.assign({}, defaults.player, state.player || {}),
      bugs: typeof state.bugs === 'number' ? state.bugs : defaults.bugs,
      totalBugsCollected: typeof state.totalBugsCollected === 'number' ? state.totalBugsCollected : defaults.totalBugsCollected,
      totalBugsCaught: typeof state.totalBugsCaught === 'number'
        ? state.totalBugsCaught
        : (typeof state.totalBugsCollected === 'number' ? state.totalBugsCollected : defaults.totalBugsCaught),
      goldenBugs: typeof state.goldenBugs === 'number' ? state.goldenBugs : defaults.goldenBugs,
      inventory: Array.isArray(state.inventory) ? state.inventory.slice() : defaults.inventory.slice(),
      activeQuests: state.activeQuests && typeof state.activeQuests === 'object' ? state.activeQuests : {},
      completedQuests: Array.isArray(state.completedQuests) ? state.completedQuests.slice() : [],
      unlockedAreas: Array.isArray(state.unlockedAreas) ? state.unlockedAreas.slice() : defaults.unlockedAreas.slice(),
      npcMemory: state.npcMemory && typeof state.npcMemory === 'object' ? state.npcMemory : {},
      achievements: Array.isArray(state.achievements) ? state.achievements.slice() : [],
      playTime: typeof state.playTime === 'number' ? state.playTime : defaults.playTime,
      version: 5,
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

    return normalized;
  },

  getDefaultState() {
    return {
      player: { x: 448, y: 480, area: 'spawn_village', dir: 0 },
      bugs: 0,
      totalBugsCollected: 0,
      totalBugsCaught: 0,
      goldenBugs: 0,
      inventory: [],
      activeQuests: {},
      completedQuests: [],
      unlockedAreas: ['spawn_village', 'syntax_meadows'],
      npcMemory: {},
      achievements: [],
      playTime: 0,
      version: 5,
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

if (typeof window !== 'undefined') {
  void SaveSystem.init();
}
