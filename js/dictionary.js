/* =============================================================
   FILE: /js/dictionary.js
   WHAT IT DOES: Knows every word in data/words.json:
   its syllables, its part of speech, and its meaning.

   - Dict.say(entry, row)     says a word and lights up each
                              syllable while it is spoken
   - Dict.syllableRow(entry)  draws the syllables: res · tau · rant
   - Dict.annotate(spans)     finds vocabulary words in a story
                              (plans -> plan, taking out -> take out)
   - Dict.open(key, node)     shows the word card at the bottom of
                              the screen with syllables and meaning

   Syllable breaks follow Merriam-Webster. Definitions are short,
   plain-English meanings based on Merriam-Webster.
   ============================================================= */
const Dict = (function () {
  'use strict';
  const el = App.el;

  // Past tense and other forms that do not follow the rules.
  const IRREGULAR = {
    go: ['goes', 'went', 'gone', 'going'], take: ['takes', 'took', 'taken', 'taking'],
    eat: ['eats', 'ate', 'eaten', 'eating'], read: ['reads', 'reading'],
    find: ['finds', 'found', 'finding'], think: ['thinks', 'thought', 'thinking'],
    feel: ['feels', 'felt', 'feeling'], meet: ['meets', 'met'],
    sing: ['sings', 'sang', 'sung', 'singing'], pay: ['pays', 'paid', 'paying'],
    seek: ['seeks', 'sought', 'seeking'], stand: ['stands', 'stood', 'standing'],
    spend: ['spends', 'spent', 'spending'], fit: ['fits', 'fitting'],
    buy: ['bought'], make: ['made'], give: ['gave'], sit: ['sat'], see: ['saw']
  };

  let entries = {};      // "restaurant" -> the word's information
  let forms = {};        // "plans" -> "plan"
  let phrases = {};      // "taking out" -> "take out"
  let readyPromise = null;
  let card = null;
  let timers = [];

  function norm(w) {
    return String(w || '').toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  }

  // Normal forms of one word: plan -> plans, planned, planning...
  function variants(word) {
    const w = word.toLowerCase();
    const out = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing']);
    if (/e$/.test(w)) out.add(w.slice(0, -1) + 'ing');
    if (/[^aeiou][aeiou][bdgmnpt]$/.test(w)) { out.add(w + w.slice(-1) + 'ed'); out.add(w + w.slice(-1) + 'ing'); }
    if (/[^aeiou]y$/.test(w)) { out.add(w.slice(0, -1) + 'ies'); out.add(w.slice(0, -1) + 'ied'); }
    (IRREGULAR[w] || []).forEach(function (f) { out.add(f); });
    return Array.from(out);
  }

  function build(data) {
    entries = {}; forms = {}; phrases = {};
    data.themes.forEach(function (t) {
      t.words.forEach(function (w) {
        const key = w.word.toLowerCase();
        if (!entries[key]) entries[key] = w;
      });
    });
    Object.keys(entries).forEach(function (key) {
      const parts = key.split(' ');
      if (parts.length === 1) {
        variants(key).forEach(function (f) { if (!entries[f] && !forms[f]) forms[f] = key; });
      } else {
        // phrases: change the first word (taking out) or the last word (Web pages)
        variants(parts[0]).forEach(function (f) { phrases[[f].concat(parts.slice(1)).join(' ')] = key; });
        variants(parts[parts.length - 1]).forEach(function (f) { phrases[parts.slice(0, -1).concat([f]).join(' ')] = key; });
      }
    });
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = App.loadData('words').then(function (d) { build(d); return true; })
        .catch(function () { readyPromise = null; return false; });
    }
    return readyPromise;
  }

  function lookupKey(text) {
    const t = norm(text);
    if (entries[t]) return t;
    if (forms[t]) return forms[t];
    if (phrases[t]) return phrases[t];
    return null;
  }

  function get(keyOrWord) {
    const k = lookupKey(keyOrWord);
    return k ? entries[k] : null;
  }

  /* ---------- Syllables ---------- */

  // "salt-and-pep·per hair" -> pieces and the marks between them
  function pieces(entry) {
    const text = entry.syllables || entry.word;
    return text.split(/([·\-\s])/).filter(function (p) { return p !== ''; });
  }

  function count(entry) {
    return pieces(entry).filter(function (p) { return !/^[·\-\s]$/.test(p); }).length;
  }

  function syllableRow(entry, cls) {
    const row = el('p', { class: 'syl-row ' + (cls || ''), 'aria-label': (entry.syllables || entry.word).replace(/·/g, ' ') });
    pieces(entry).forEach(function (p) {
      if (p === '·') row.append(el('span', { class: 'syl-dot', 'aria-hidden': 'true', text: '·' }));
      else if (p === '-') row.append(el('span', { class: 'syl-dash', 'aria-hidden': 'true', text: '-' }));
      else if (/^\s$/.test(p)) row.append(el('span', { class: 'syl-gap', 'aria-hidden': 'true' }));
      else row.append(el('span', { class: 'syl', text: p }));
    });
    return row;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // Light up each syllable in turn, about as fast as the voice speaks.
  function lightSyllables(row) {
    clearTimers();
    if (!row) return;
    const syls = row.querySelectorAll('.syl');
    const rate = Store.getSetting('rate') || 0.8;
    const step = 330 / rate;
    syls.forEach(function (s, i) {
      timers.push(setTimeout(function () {
        syls.forEach(function (x) { x.classList.toggle('is-now', x === s); });
      }, i * step));
    });
    timers.push(setTimeout(function () {
      syls.forEach(function (x) { x.classList.remove('is-now'); });
    }, syls.length * step + 250));
  }

  // Say a word; its syllables light up while it is spoken.
  function say(entry, row, node, onEnd) {
    let started = false;
    App.say(entry.word, {
      node: node,
      onWord: function () {
        if (started) return;
        started = true;
        lightSyllables(row);
      },
      onEnd: function () {
        if (!started) lightSyllables(row);   // a recording with no word signal
        if (onEnd) onEnd();
      }
    });
  }

  /* ---------- Find vocabulary words in a story ---------- */

  function annotate(spans) {
    const toks = spans.map(function (s) { return norm(s.getAttribute('data-word') || s.textContent); });
    let i = 0;
    while (i < toks.length) {
      let matched = false;
      for (let n = 3; n >= 2; n--) {
        if (i + n > toks.length) continue;
        const key = phrases[toks.slice(i, i + n).join(' ')];
        if (key) {
          for (let j = i; j < i + n; j++) mark(spans[j], key);
          i += n;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      const k = lookupKey(toks[i]);
      if (k) mark(spans[i], k);
      i += 1;
    }
  }

  function mark(span, key) {
    span.classList.add('vocab');
    span.setAttribute('data-entry', key);
  }

  /* ---------- The word card ---------- */

  function close() {
    clearTimers();
    if (card) card.hidden = true;
  }

  function open(key, node) {
    const entry = entries[key];
    if (!entry) return;
    if (!card) {
      card = el('aside', { class: 'word-card', role: 'dialog', 'aria-label': 'Word card' });
      card.hidden = true;
      document.body.append(card);
      window.addEventListener('hashchange', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    const row = syllableRow(entry, 'syl-row-card');
    const n = count(entry);
    const def = el('p', { class: 'wc-def sayable', text: entry.definition || '' });
    card.replaceChildren(
      el('div', { class: 'wc-top' },
        App.picture(entry.picture, 'wc-pic'),
        el('div', { class: 'wc-words' },
          row,
          el('p', { class: 'wc-meta' },
            el('span', { class: 'pos-chip', text: entry.pos || '' }),
            el('span', { class: 'wc-count', text: n === 1 ? '1 syllable' : n + ' syllables' })
          )
        )
      ),
      def,
      el('div', { class: 'btn-row' },
        App.button({ icon: '🔊', label: 'Hear it', kind: 'primary', onClick: function () { say(entry, row); } }),
        App.button({ icon: '📖', label: 'Meaning', onClick: function () { App.say(entry.definition, { node: def }); } }),
        App.button({ icon: '✕', label: 'Close', kind: 'quiet', onClick: close })
      )
    );
    card.hidden = false;
    say(entry, row, node);
  }

  return {
    ready: ready,
    get: get,
    lookupKey: lookupKey,
    count: count,
    syllableRow: syllableRow,
    say: say,
    annotate: annotate,
    open: open,
    close: close
  };
})();
