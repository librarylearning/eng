/* =============================================================
   FILE: /js/voice.js
   WHAT IT DOES: Makes the website talk.

   1. REAL RECORDINGS FIRST: if an MP3 file for the word or
      sentence is in the /audio/ folder, it plays that.
   2. COMPUTER VOICE SECOND: if there is no recording, it uses
      the browser's built-in voice (the Web Speech API) and picks
      a female English (US) voice.

   HOW TO NAME A RECORDING (very important):
   - all small letters
   - words joined with a dash  -
   - no punctuation, ending in .mp3
     "Good morning!"   ->  audio/good-morning.mp3
     "coffee"          ->  audio/coffee.mp3
     "I'm ready."      ->  audio/im-ready.mp3
   The "For Teacher" page has a box that shows you the exact name.

   HOW OTHER FILES USE IT:
     Voice.speak("Hello");                       // just say it
     Voice.speak("Hello", { onEnd: fn });        // do fn when finished
     Voice.speak(text, { onWord: fn });          // fn(charIndex) for each word,
                                                 // used to light up words
     Voice.speak("b", { audioKey: "sound-b" });  // use audio/sound-b.mp3
     Voice.stop();                               // be quiet now
   ============================================================= */
const Voice = (function () {
  'use strict';

  // Voices we like best, checked from top to bottom. The first one
  // this computer has is used. Part of a name is enough.
  // To prefer a different voice, move it higher in the list.
  const PREFERRED_VOICES = [
    'Microsoft Aria Online (Natural)',     // Microsoft Edge (very natural)
    'Microsoft Jenny Online (Natural)',    // Microsoft Edge
    'Microsoft Ava Online (Natural)',      // Microsoft Edge
    'Microsoft Emma Online (Natural)',     // Microsoft Edge
    'Microsoft Michelle Online (Natural)', // Microsoft Edge
    'Samantha',                            // Apple Mac
    'Ava (Premium)', 'Ava (Enhanced)', 'Allison', 'Susan',  // Apple Mac
    'Google US English',                   // Chrome (needs internet)
    'Microsoft Zira'                       // Windows (works offline)
  ];

  // First names of common female English voices. Used only to put
  // a star ★ next to them in the Settings list.
  const FEMALE_NAMES = [
    'aria', 'jenny', 'ava', 'emma', 'michelle', 'samantha', 'allison',
    'susan', 'zira', 'karen', 'moira', 'tessa', 'victoria', 'serena',
    'fiona', 'sonia', 'libby', 'natasha', 'clara', 'nancy', 'sara',
    'zoe', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy', 'hazel',
    'catherine', 'heera', 'neerja', 'jane', 'emily', 'ashley', 'cora',
    'elizabeth', 'monica', 'amber', 'ana', 'jessa', 'molly'
  ];

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  let voices = [];          // every voice this computer has
  let chosen = null;        // the voice we are using
  let listener = null;      // Settings page wants to know when voices load
  let speakToken = 0;       // goes up each time we start or stop speaking
  let utterance = null;     // keep a reference (avoids a Chrome bug)
  let audioEl = null;       // the MP3 playing right now
  let timers = [];          // timers for lighting up words
  let speaking = false;
  const missing = new Set(); // recordings we already know are not there

  /* ---------- Loading and choosing voices ---------- */

  function init() {
    if (!supported) return;
    loadVoices();
    // Chrome loads voices a moment after the page opens.
    speechSynthesis.onvoiceschanged = loadVoices;
    let tries = 0;
    const poll = setInterval(function () {
      loadVoices();
      tries += 1;
      if (voices.length || tries > 20) clearInterval(poll);
    }, 250);
  }

  function loadVoices() {
    if (!supported) return;
    const list = speechSynthesis.getVoices();
    if (!list.length) return;
    voices = list;
    chooseVoice();
    if (listener) listener();
  }

  function isEnglish(v) {
    return /^en([-_]|$)/i.test(v.lang);
  }

  function findPreferred() {
    for (let i = 0; i < PREFERRED_VOICES.length; i++) {
      const wanted = PREFERRED_VOICES[i];
      const match = voices.find(function (v) {
        return v.name.indexOf(wanted) !== -1 && isEnglish(v);
      });
      if (match) return match;
    }
    return null;
  }

  // Order of choice: the one picked in Settings, then our favorites,
  // then any US English voice, then any English voice.
  function chooseVoice() {
    const saved = Store.getSetting('voiceName');
    chosen =
      (saved && voices.find(function (v) { return v.name === saved; })) ||
      findPreferred() ||
      voices.find(function (v) { return /^en[-_]US/i.test(v.lang); }) ||
      voices.find(isEnglish) ||
      null;
  }

  function looksFemale(name) {
    const lower = name.toLowerCase();
    if (lower.indexOf('google us english') !== -1) return true;
    const words = lower.split(/[^a-z]+/);
    return FEMALE_NAMES.some(function (n) { return words.indexOf(n) !== -1; });
  }

  // A list of English voices for the Settings menu, best ones first.
  function englishVoices() {
    const rank = function (v) {
      const p = PREFERRED_VOICES.findIndex(function (w) { return v.name.indexOf(w) !== -1; });
      if (p !== -1) return p;
      return looksFemale(v.name) ? 100 : 200;
    };
    return voices
      .filter(isEnglish)
      .map(function (v) {
        return { name: v.name, lang: v.lang, recommended: looksFemale(v.name), rank: rank(v) };
      })
      .sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
  }

  function setVoice(name) {
    Store.setSetting('voiceName', name || '');
    chooseVoice();
  }

  function currentVoiceName() {
    return chosen ? chosen.name : '';
  }

  function setVoicesListener(fn) {
    listener = fn;
  }

  /* ---------- File names for recordings ---------- */

  // "Good morning!" -> "good-morning"
  function fileNameFor(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  /* ---------- Speaking ---------- */

  function setSpeaking(on) {
    speaking = on;
    document.body.classList.toggle('is-speaking', on);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // Called once when the speech finishes by itself.
  function finish(opts, token) {
    if (token !== speakToken) return;
    clearTimers();
    setSpeaking(false);
    if (opts.onEnd) opts.onEnd();
  }

  function speak(text, opts) {
    opts = opts || {};
    text = String(text || '').trim();
    if (!text) return;
    stop();
    const token = speakToken;
    setSpeaking(true);
    const key = opts.audioKey || fileNameFor(text);
    playRecording(key, text, opts, token).then(function (played) {
      if (!played && token === speakToken) speakWithComputer(text, opts, token);
    });
  }

  // Try audio/<key>.mp3. Answers true if it played, false if not.
  function playRecording(key, text, opts, token) {
    if (!key || opts.noRecording || missing.has(key)) return Promise.resolve(false);

    return new Promise(function (resolve) {
      const audio = new Audio();
      let settled = false;

      function settle(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(waitTimer);
        resolve(ok);
      }

      // If the file takes too long (slow internet), use the computer voice.
      const waitTimer = setTimeout(function () {
        settle(false);
        audio.removeAttribute('src');
      }, 2500);

      audio.addEventListener('error', function () {
        if (!settled) missing.add(key);   // no such file: remember that
        settle(false);
      });

      audio.addEventListener('canplaythrough', function () {
        if (settled) return;
        if (token !== speakToken) { settle(true); return; }  // something newer was tapped
        audioEl = audio;
        audio.play().then(function () {
          settle(true);
          if (opts.onWord) {
            const ms = isFinite(audio.duration) ? audio.duration * 1000 : estimateMs(text, 1);
            guessWordTimes(text, ms, opts, token);
          }
        }).catch(function () { settle(false); });
      }, { once: true });

      audio.addEventListener('ended', function () { finish(opts, token); });

      audio.preload = 'auto';
      audio.src = 'audio/' + key + '.mp3';
    });
  }

  function speakWithComputer(text, opts, token) {
    if (!supported) { finish(opts, token); return; }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (chosen) u.voice = chosen;
    u.rate = opts.rate || Store.getSetting('rate') || 0.8;
    u.pitch = 1;

    // Some voices tell us exactly which word they are on ("boundary").
    // Others don't, so we also guess the timing and switch to the
    // real signal if it arrives.
    let realWords = false;

    u.onstart = function () {
      if (token !== speakToken || !opts.onWord) return;
      opts.onWord(0);
      guessWordTimes(text, estimateMs(text, u.rate), opts, token);
    };
    u.onboundary = function (e) {
      if (token !== speakToken || !opts.onWord) return;
      if (e.name && e.name !== 'word') return;
      if (!realWords) { realWords = true; clearTimers(); }
      opts.onWord(e.charIndex);
    };
    u.onend = function () { finish(opts, token); };
    u.onerror = function () { finish(opts, token); };

    utterance = u;
    speechSynthesis.cancel();
    // A tiny pause after cancel() helps Chrome start reliably.
    setTimeout(function () {
      if (token !== speakToken) return;
      speechSynthesis.resume();
      speechSynthesis.speak(utterance);
    }, 60);
  }

  // Rough guess of how long a sentence takes to say, in milliseconds.
  function estimateMs(text, rate) {
    const words = (text.match(/\S+/g) || []).length;
    return (text.length * 62 + words * 90) / (rate || 1);
  }

  // Light up each word at a guessed time. Longer words get more time.
  function guessWordTimes(text, totalMs, opts, token) {
    clearTimers();
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) words.push({ at: m.index, weight: m[0].length + 3 });
    const sum = words.reduce(function (a, w) { return a + w.weight; }, 0) || 1;
    let t = 0;
    words.forEach(function (w) {
      const when = t;
      timers.push(setTimeout(function () {
        if (token === speakToken) opts.onWord(w.at);
      }, when));
      t += totalMs * w.weight / sum;
    });
  }

  function stop() {
    speakToken += 1;
    clearTimers();
    if (supported) speechSynthesis.cancel();
    if (audioEl) { audioEl.pause(); audioEl = null; }
    setSpeaking(false);
  }

  function isSpeaking() {
    return speaking;
  }

  return {
    supported: supported,
    init: init,
    speak: speak,
    stop: stop,
    isSpeaking: isSpeaking,
    englishVoices: englishVoices,
    setVoice: setVoice,
    currentVoiceName: currentVoiceName,
    setVoicesListener: setVoicesListener,
    fileNameFor: fileNameFor
  };
})();
