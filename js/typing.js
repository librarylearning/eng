/* =============================================================
   FILE: /js/typing.js
   MODULE: Typing Practice
   An on-screen keyboard shows the next key in gold.
   Small steps: single letters -> her name -> words -> sentences.
   Each right letter turns green. A wrong key gets a soft mark
   and a gentle hint; she can try as many times as she likes.
   Capital letters are not required (a = A) to keep it simple.
   Words come from data/words.json; sentences from its "typing" list.
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  const MODES = [
    { id: 'letters',   icon: '🔤', label: 'Letters' },
    { id: 'name',      icon: '🙂', label: 'My name' },
    { id: 'words',     icon: '🧺', label: 'Words' },
    { id: 'sentences', icon: '📝', label: 'Sentences' }
  ];
  const INSTRUCTIONS = {
    letters: 'Find the gold key on your keyboard. Press it.',
    name: 'Type your name. Follow the gold keys.',
    words: 'Look at the picture. Type the word.',
    sentences: 'Type the sentence. Press the long space bar between words.'
  };
  const ROUND = { letters: 8, name: 3, words: 6, sentences: 3 };  // items before a cup
  const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm,.'];

  let words = null;
  let sounds = null;

  function letterName(ch) {
    const L = sounds && sounds.letters.find(function (x) { return x.letter === ch.toLowerCase(); });
    return L ? L.name : ch;
  }

  App.registerScreen('typing', {
    title: 'Typing',
    spoken: 'Typing Practice',
    instruction: INSTRUCTIONS.letters,
    render: function (main) {
      let mode = 'letters';
      const tabs = el('div');
      const stage = el('div', { class: 'stage' });
      main.append(tabs, stage);

      let stopKeys = null;
      let runId = 0;        // changes when a new round starts
      const token = App.here();
      Promise.all([App.loadData('words'), App.loadData('sounds')]).then(function (res) {
        if (!App.stillHere(token)) return;
        words = res[0];
        sounds = res[1];
        drawTabs();
        start();
      }).catch(function () { App.dataError(stage); });

      function drawTabs() {
        tabs.replaceChildren(App.modeTabs(MODES, mode, function (id) {
          mode = id;
          drawTabs();
          App.setInstruction(INSTRUCTIONS[id], true);
          start();
        }));
      }

      // Make the list of things to type for this round.
      function makeItems() {
        if (mode === 'letters') {
          return App.shuffle(words.typing.letters.split('')).slice(0, ROUND.letters).map(function (c) { return { text: c }; });
        }
        if (mode === 'name') {
          const n = Store.getName().toLowerCase();
          return n ? [1, 2, 3].map(function () { return { text: n }; }) : [];
        }
        if (mode === 'words') {
          const all = [];
          words.themes.forEach(function (t) {
            t.words.forEach(function (w) { if (w.word.indexOf(' ') === -1 && w.word.length <= 6) all.push({ text: w.word, picture: w.picture }); });
          });
          return App.shuffle(all).slice(0, ROUND.words);
        }
        return App.shuffle(words.typing.sentences).slice(0, ROUND.sentences).map(function (s) { return { text: s }; });
      }

      function start() {
        if (stopKeys) stopKeys();
        runId += 1;
        const myRun = runId;
        const pageToken = App.here();
        stage.replaceChildren();
        const items = makeItems();

        if (!items.length) {
          stage.append(el('section', { class: 'card setting' },
            el('h2', { class: 'sayable', text: 'Add a first name first.' }),
            el('p', { class: 'help sayable', text: 'Ask your teacher to type your first name in Settings. Then come back here.' }),
            el('div', { class: 'btn-row' }, App.button({ icon: '⚙️', label: 'Settings', onClick: function () { App.go('settings'); } }))
          ));
          return;
        }

        let idx = 0;
        let pos = 0;
        let mistakes = 0;
        let lastHint = 0;
        let busy = false;     // a short pause between items

        const progress = App.dots(items.length);
        const pic = el('div', { class: 'type-pic', 'aria-hidden': 'true' });
        const line = el('p', { class: 'type-line' });
        const msg = el('p', { class: 'type-msg sayable', 'aria-live': 'polite' });
        const kb = el('div', { class: 'kb' });
        const keyEls = {};

        ROWS.forEach(function (row) {
          const r = el('div', { class: 'kb-row' });
          row.split('').forEach(function (ch) {
            const k = el('button', { type: 'button', class: 'kb-key', tabindex: '-1', 'data-say': ch === ',' ? 'comma' : ch === '.' ? 'period' : letterName(ch), text: ch.toUpperCase() });
            k.addEventListener('click', function () { k.blur(); press(ch); });
            keyEls[ch] = k;
            r.append(k);
          });
          kb.append(r);
        });
        const spaceKey = el('button', { type: 'button', class: 'kb-key space', tabindex: '-1', 'data-say': 'space bar', text: 'space' });
        spaceKey.addEventListener('click', function () { spaceKey.blur(); press(' '); });
        keyEls[' '] = spaceKey;
        kb.append(el('div', { class: 'kb-row' }, spaceKey));

        const actions = el('div', { class: 'btn-row center' },
          App.button({ icon: '🔊', label: 'Hear it', onClick: function () { App.say(items[idx].text); } }),
          App.button({ icon: '↺', label: 'Start this again', onClick: function () { drawItem(true); } })
        );

        stage.append(el('section', { class: 'card tibeb-top type-card' }, progress.node, pic, line, msg, kb, actions));

        function drawItem(speak) {
          const item = items[idx];
          pos = 0;
          mistakes = 0;
          line.replaceChildren();
          line.classList.toggle('single', item.text.length === 1);
          item.text.split('').forEach(function (ch) {
            line.append(el('span', { class: 'ch' + (ch === ' ' ? ' space' : ''), text: ch === ' ' ? ' ' : ch }));
          });
          pic.replaceChildren(item.picture ? App.picture(item.picture, 'pic') : '');
          msg.textContent = '';
          markNow();
          if (!speak) return;
          if (mode === 'letters') App.say('Press ' + letterName(item.text) + '.');
          else App.say(item.text);
        }

        function markNow() {
          const spans = line.children;
          for (let i = 0; i < spans.length; i++) {
            spans[i].classList.toggle('done', i < pos);
            spans[i].classList.toggle('now', i === pos);
          }
          Object.keys(keyEls).forEach(function (k) { keyEls[k].classList.remove('is-next'); });
          const next = items[idx].text[pos];
          if (next !== undefined) {
            const key = keyEls[next.toLowerCase()];
            if (key) key.classList.add('is-next');
          }
        }

        function flash(key, cls) {
          if (!key) return;
          key.classList.add(cls);
          setTimeout(function () { key.classList.remove(cls); }, 350);
        }

        function press(ch) {
          if (busy || App.isCelebrating()) return;
          const item = items[idx];
          const want = item.text[pos];
          if (ch.toLowerCase() === want.toLowerCase()) {
            flash(keyEls[ch.toLowerCase()], 'is-hit');
            pos += 1;
            markNow();
            if (mode === 'letters') App.say(letterName(want));
            if (pos === item.text.length) itemDone();
          } else {
            mistakes += 1;
            flash(keyEls[ch.toLowerCase()], 'is-miss');
            const hint = want === ' ' ? 'Press the long space bar.' : 'Look for the gold key: ' + letterName(want) + '.';
            msg.textContent = hint;
            msg.setAttribute('data-say', hint);
            if (Date.now() - lastHint > 4000) { App.say(hint); lastHint = Date.now(); }
          }
        }

        function itemDone() {
          busy = true;
          const item = items[idx];
          if (mode === 'words') Progress.recordWord(item.text, mistakes === 0);
          progress.set(idx + 1);
          msg.textContent = App.praise();
          msg.setAttribute('data-say', msg.textContent);
          if (mode === 'letters') App.say(msg.textContent);
          else App.say(item.text + '. ' + msg.textContent);
          setTimeout(function () {
            if (myRun !== runId || !App.stillHere(pageToken)) return;
            busy = false;
            idx += 1;
            if (idx >= items.length) {
              App.finishActivity('typing', start);   // a new round after the celebration
            } else {
              drawItem(true);
            }
          }, 1600);
        }

        // Keys on the real keyboard
        stopKeys = App.listen(document, 'keydown', function (e) {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key.length !== 1) return;            // ignore Shift, arrows, and so on
          if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
          e.preventDefault();
          press(e.key);
        });

        drawItem(false);
      }
    }
  });
})();
