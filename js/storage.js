/* =============================================================
   FILE: /js/storage.js
   WHAT IT DOES: Saves and loads information in THIS browser
   only (using "localStorage"). Nothing is sent anywhere.

   WHAT WE SAVE (nothing else):
   - her first name
   - settings (voice, speed, read-aloud choices)
   - practice progress (cups, flowers, which words were easy/hard)

   NOTE: If someone clears the browser's history/site data,
   this information is erased. Different browsers (Chrome vs
   Edge) and different computers each keep their own copy.
   ============================================================= */
const Store = (function () {
  'use strict';

  // The name of the "drawer" we save into. Change it only if you
  // want to start everyone fresh.
  const KEY = 'coffee-letters-v1';

  // What a brand-new learner starts with.
  const DEFAULTS = {
    name: '',
    settings: {
      voiceName: '',     // empty = pick the best female voice automatically
      rate: 0.8,         // speaking speed: 0.5 is very slow, 1 is normal
      autoRead: true,    // read each page's instruction when it opens
      hoverRead: true    // read a button when the mouse rests on it
    },
    progress: {
      total: 0,          // how many practices she has finished
      days: {},          // practices per day, like { "2026-10-01": 3 }
      words: {},         // word memory for review (see progress.js)
      activities: {}     // practices per area, like { "sounds": 4 }
    }
  };

  let data = load();

  // Make a fresh copy of an object (so we never change DEFAULTS).
  function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Put saved values on top of the defaults, so new settings added
  // in a later version still get a sensible starting value.
  function fill(base, saved) {
    Object.keys(saved || {}).forEach(function (k) {
      const b = base[k];
      const s = saved[k];
      if (b && s && typeof b === 'object' && typeof s === 'object' && !Array.isArray(b)) {
        fill(b, s);
      } else {
        base[k] = s;
      }
    });
    return base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? fill(copy(DEFAULTS), JSON.parse(raw)) : copy(DEFAULTS);
    } catch (e) {
      // Storage is blocked (private window, etc.). Work without saving.
      return copy(DEFAULTS);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ----- First name -----
  function getName() {
    return data.name || '';
  }
  function setName(name) {
    // Keep letters, spaces, apostrophes and dashes. Max 30 characters.
    data.name = String(name || '')
      .replace(/[^\p{L}\p{M}' -]/gu, '')
      .trim()
      .slice(0, 30);
    save();
  }

  // ----- Settings -----
  function getSetting(key) {
    return key in data.settings ? data.settings[key] : DEFAULTS.settings[key];
  }
  function setSetting(key, value) {
    data.settings[key] = value;
    save();
  }

  // ----- Erase progress (keeps the name and settings) -----
  function resetProgress() {
    data.progress = copy(DEFAULTS.progress);
    save();
  }

  return {
    get data() { return data; },
    save: save,
    getName: getName,
    setName: setName,
    getSetting: getSetting,
    setSetting: setSetting,
    resetProgress: resetProgress
  };
})();
