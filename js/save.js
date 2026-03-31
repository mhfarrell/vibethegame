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
    try { return JSON.parse(data); } catch (e) { return null; }
  },

  clear() {
    this.deleteCookie(this.COOKIE_NAME);
    try { localStorage.removeItem(this.COOKIE_NAME); } catch (e) { }
  },

  getDefaultState() {
    return {
      player: { x: 448, y: 480, area: 'spawn_village', dir: 0 },
      bugs: 0,
      totalBugsCollected: 0,
      inventory: [],
      activeQuests: {},
      completedQuests: [],
      unlockedAreas: ['spawn_village', 'syntax_meadows'],
      npcMemory: {},
      achievements: [],
      playTime: 0,
      version: 2,
      // New features
      timeOfDay: 0,
      petBug: null,
      fishCaught: [],
      totalFishCaught: 0,
      fishJarCount: 0
    };
  }
};
