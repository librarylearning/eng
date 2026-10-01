/* =============================================================
   FILE: /js/words.js
   MODULES: Word Builder and Review

   WORD BUILDER: choose a group (Family, Food, Ventures 3 units...):
   - Learn:   picture, word, syllables (res · tau · rant), part of
              speech, meaning, and an example sentence. The syllables
              light up while the word is spoken.
   - Match:   hear (or read) a word, tap the right picture. Words
              with no clear picture ask for the meaning instead.
   - Meaning: read or hear a meaning, tap the word.
   - Spell:   look and listen, then build the word from letter tiles
              (tap the tiles or type on the keyboard).
   Words from earlier lessons that are due for review are mixed
   into Match, so old words keep coming back.

   REVIEW: the words her memory needs most today (spaced
   repetition, see js/progress.js), as a picture-matching game.

   Words live in data/words.json.
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  const MATCH_ROUND = 6;    // questions in one Match round
  const SPELL_ROUND = 5;    // words in one Spell round
  const MODES = [
    { id: 'learn', icon: '👀', label: 'Learn' },
    { id: 'match', icon: '🧩', label: 'Match' },
    { id: 'meaning', icon: '📖', label: 'Meaning' },
    { id: 'spell', icon: '✏️', label: 'Spell' }
  ];
  const INSTRUCTIONS = {
    themes: 'Choose a group of words.',
    learn: 'Look. Listen. Say the word out loud.',
    match: 'Listen or read. Tap the matching picture.',
    meaning: 'Read the meaning. Tap the word it belongs to.',
    spell: 'Look and listen. Tap the letters in order.'
  };

  let lettersInfo = null;   // letter names, from sounds.json

  function allWords(data) {
    const list = [];
    data.themes.forEach(function (t) { t.words.forEach(function (w) { list.push(w); }); });
    return list;
  }

  function letterName(ch) {
    const L = lettersInfo && lettersInfo.find(function (x) { return x.letter === ch; });
    return L ? L.name : ch;
  }

  /* =========================================================
     A Match round (used by Word Builder and Review)
     items: the words to ask.  pool: words to pick wrong answers from.
     allMeaning: true = every question shows a meaning and word choices.
     Otherwise words marked "abstract" (no clear picture) ask for the
     meaning, and the rest show pictures.
     ========================================================= */
  function matchRound(box, items, pool, activityId, onRoundDone, allMeaning) {
    let i = 0;
    const progress = App.dots(items.length);

    function show(autoSay) {
      const item = items[i];
      const byMeaning = allMeaning || item.abstract;
      const byEar = !byMeaning && i % 2 === 0;   // pictures: every other one is heard
      let firstTry = true;
      let misses = 0;
      let done = false;
      const fb = el('div', { 'aria-live': 'polite' });
      const after = el('div', { class: 'center-col' });
      const actions = el('div', { class: 'btn-row' });

      const others = App.shuffle(pool.filter(function (w) {
        return w.word !== item.word && (byMeaning || w.picture !== item.picture);
      })).slice(0, 2);
      const options = App.shuffle([item].concat(others));
      const grid = el('div', { class: 'choices' });
      const btns = [];

      options.forEach(function (o) {
        const b = App.choice({
          picture: byMeaning ? '' : o.picture,   // pictures have no label: hovering must not give the answer away
          label: byMeaning ? o.word : '',
          say: byMeaning ? o.word : '',
          onClick: function (btn) {
            if (done) return;
            if (o.word === item.word) {
              done = true;
              btn.classList.remove('is-hint');
              btn.classList.add('is-right');
              if (!byMeaning) btn.append(el('span', { class: 'choice-label', text: o.word }));
              Progress.recordWord(item.word, firstTry);
              progress.set(i + 1);
              App.feedback(fb, 'ok', 'Yes! That is "' + item.word + '".', false);
              // show the syllables and say the word
              const row = Dict.syllableRow(item);
              after.replaceChildren(row, el('p', { class: 'say-hint sayable', text: item.definition || '' }));
              Dict.say(item, row);
              const last = i === items.length - 1;
              actions.replaceChildren(App.button({
                icon: last ? '✓' : '▶️', label: last ? 'Finish' : 'Next', kind: 'primary',
                onClick: function () {
                  if (last) { App.finishActivity(activityId, onRoundDone); return; }
                  i += 1;
                  show(true);
                }
              }));
            } else {
              firstTry = false;
              misses += 1;
              btn.classList.add('is-wrong');
              if (!byMeaning) btn.append(el('span', { class: 'choice-label', text: o.word }));
              if (misses >= 2) {
                btns.forEach(function (x) { if (x.word === item.word) x.btn.classList.add('is-hint'); });
              }
              App.feedback(fb, 'try', byMeaning
                ? 'Not yet. "' + o.word + '" means: ' + o.definition
                : 'Not yet. That one is "' + o.word + '". Try again.');
            }
          }
        });
        if (byMeaning) b.classList.add('choice-text');
        btns.push({ btn: b, word: o.word });
        grid.append(b);
      });

      let prompt;
      if (byMeaning) {
        const def = el('p', { class: 'prompt-meaning sayable', text: item.definition });
        prompt = el('div', { class: 'stage' },
          el('p', { class: 'q-text sayable', text: 'Which word means this?' }),
          def,
          el('div', { class: 'btn-row' },
            App.button({ icon: '🔊', label: 'Hear the meaning', kind: 'primary', onClick: function () { App.say(item.definition, { node: def }); } }))
        );
      } else if (byEar) {
        prompt = el('div', { class: 'btn-row' }, App.button({ icon: '🔊', label: 'Hear the word', kind: 'primary', onClick: function () { App.say(item.word); } }));
      } else {
        prompt = el('p', { class: 'prompt-word sayable', text: item.word });
      }

      box.replaceChildren(progress.node, prompt, grid, fb, after, actions);
      if (autoSay) App.say(byMeaning ? item.definition : item.word);
    }
    show(false);
  }

  /* =========================================================
     WORD BUILDER
     ========================================================= */
  App.registerScreen('words', {
    title: 'Words',
    spoken: 'Word Builder',
    instruction: INSTRUCTIONS.themes,
    render: function (main) {
      const stage = el('div', { class: 'stage' });
      main.append(stage);
      let data = null;
      let stopKeys = null;
      App.onLeave(function () { if (stopKeys) stopKeys(); });

      const token = App.here();
      Promise.all([App.loadData('words'), App.loadData('sounds'), Dict.ready()]).then(function (res) {
        if (!App.stillHere(token)) return;
        data = res[0];
        lettersInfo = res[1].letters;
        showThemes();
      }).catch(function () { App.dataError(stage); });

      function showThemes() {
        if (stopKeys) { stopKeys(); stopKeys = null; }
        App.stopTalking();
        App.setInstruction(INSTRUCTIONS.themes);
        // one heading per group (Everyday words, Ventures 3 units...)
        const sections = [];
        const byGroup = {};
        data.themes.forEach(function (t) {
          const g = t.group || 'Words';
          if (!byGroup[g]) {
            byGroup[g] = el('div', { class: 'theme-grid' });
            sections.push(el('section', { class: 'group-section' },
              el('h2', { class: 'group-title sayable', text: g }), byGroup[g]));
          }
          byGroup[g].append(el('button', {
            type: 'button', class: 'theme-card', 'data-say': t.name,
            onclick: function () { openTheme(t, 'learn'); }
          },
            el('span', { class: 'mark', html: Art.medallion() }, el('span', { class: 'mark-icon', 'aria-hidden': 'true', text: t.picture })),
            el('span', { class: 'theme-name', text: t.name }),
            el('span', { class: 'theme-count', text: t.words.length + ' words' })
          ));
        });
        stage.replaceChildren.apply(stage, sections);
      }

      function openTheme(theme, mode) {
        if (stopKeys) { stopKeys(); stopKeys = null; }
        App.stopTalking();
        App.setInstruction(INSTRUCTIONS[mode], true);
        const box = el('div', { class: 'stage' });
        stage.replaceChildren(
          el('div', { class: 'btn-row' },
            App.button({ icon: '◀️', label: 'All groups', kind: 'quiet', onClick: showThemes }),
            App.modeTabs(MODES, mode, function (id) { openTheme(theme, id); })
          ),
          el('section', { class: 'card tibeb-top stage' },
            el('div', {},
              theme.group ? el('p', { class: 'group-label', text: theme.group }) : null,
              el('h2', { class: 'card-title sayable', text: theme.name })
            ),
            box
          )
        );
        if (mode === 'learn') learn(theme, box);
        if (mode === 'match') match(theme, box, false);
        if (mode === 'meaning') match(theme, box, true);
        if (mode === 'spell') spell(theme, box);
      }

      /* ----- Learn: one card at a time ----- */
      function learn(theme, box) {
        let i = 0;
        const seen = new Set();
        let rewarded = false;

        function show(speak) {
          const w = theme.words[i];
          seen.add(i);
          Progress.introduceWord(w.word);
          const reading = App.readingText(w.sentence);
          const progress = App.dots(theme.words.length);
          progress.set(seen.size);
          const row = Dict.syllableRow(w, 'syl-row-learn');
          const n = Dict.count(w);
          const def = el('p', { class: 'learn-def sayable', text: w.definition || '' });

          // word (syllables light up) -> short pause -> example sentence
          function hearIt() {
            Dict.say(w, row, null, function () {
              setTimeout(function () { App.say(w.sentence); }, 300);
            });
          }

          box.replaceChildren(el('div', { class: 'learn-card' },
            progress.node,
            App.picture(w.picture, 'learn-pic'),
            el('p', { class: 'learn-word sayable', text: w.word }),
            row,
            el('p', { class: 'learn-meta' },
              el('span', { class: 'pos-chip', text: w.pos || '' }),
              el('span', { class: 'wc-count sayable', text: n === 1 ? '1 syllable' : n + ' syllables' })
            ),
            def,
            reading.node,
            el('p', { class: 'say-hint sayable', text: 'Now say it out loud: ' + w.word + '.' }),
            el('div', { class: 'btn-row center' },
              App.button({ icon: '◀️', label: 'Back', disabled: i === 0, onClick: function () { i -= 1; show(true); } }),
              App.button({ icon: '🔊', label: 'Hear it', onClick: hearIt }),
              App.button({ icon: '📖', label: 'Meaning', onClick: function () { App.say(w.definition, { node: def }); } }),
              App.button({
                icon: '▶️', label: i === theme.words.length - 1 ? 'Start again' : 'Next', kind: 'primary',
                onClick: function () {
                  i = (i + 1) % theme.words.length;
                  if (!rewarded && seen.size === theme.words.length) {
                    rewarded = true;
                    App.finishActivity('words', function () { show(true); });
                  } else {
                    show(true);
                  }
                }
              })
            )
          ));
          Dict.annotate(reading.spans);   // vocabulary words in the sentence can be tapped
          if (speak) hearIt();
        }
        show(false);
      }

      /* ----- Match and Meaning: theme words + a few older words due for review ----- */
      function match(theme, box, allMeaning) {
        const everyWord = allWords(data);
        const due = Progress.wordsToReview(10)
          .map(function (k) { return everyWord.find(function (w) { return w.word.toLowerCase() === k; }); })
          .filter(function (w) { return w && theme.words.indexOf(w) === -1; })
          .slice(0, 2);
        const items = App.shuffle(App.shuffle(theme.words).slice(0, MATCH_ROUND - due.length).concat(due));
        const pool = theme.words.concat(due);
        matchRound(box, items, pool.length >= 3 ? pool : everyWord, 'words', function () { match(theme, box, allMeaning); }, allMeaning);
      }

      /* ----- Spell: tap letter tiles in order ----- */
      function spell(theme, box) {
        const candidates = theme.words.filter(function (w) { return /^[a-z]+$/.test(w.word) && w.word.length <= 8; });
        const items = App.shuffle(candidates).slice(0, SPELL_ROUND);
        let i = 0;
        const progress = App.dots(items.length);

        function show(speak) {
          if (stopKeys) { stopKeys(); stopKeys = null; }
          const w = items[i];
          const letters = w.word.toLowerCase().split('');
          let pos = 0;
          let misses = 0;
          let mistakesTotal = 0;
          const fb = el('div', { 'aria-live': 'polite' });
          const actions = el('div', { class: 'btn-row center' });

          const slots = el('div', { class: 'spell-slots', 'aria-hidden': 'true' });
          letters.forEach(function () { slots.append(el('span', { class: 'slot' })); });

          // Tiles: the word's letters plus two extra letters, mixed up.
          const extra = App.shuffle('abcdefghijklmnopqrstuvwxyz'.split('').filter(function (c) { return letters.indexOf(c) === -1; })).slice(0, 2);
          const tileLetters = App.shuffle(letters.concat(extra));
          const tilesBox = el('div', { class: 'spell-tiles' });
          const tiles = tileLetters.map(function (ch) {
            const t = el('button', { type: 'button', class: 'spell-tile', 'data-say': letterName(ch), text: ch });
            t.addEventListener('click', function () { t.blur(); tryLetter(ch, t); });
            tilesBox.append(t);
            return t;
          });

          function tryLetter(ch, tile) {
            if (pos >= letters.length || App.isCelebrating()) return;
            if (!tile) tile = tiles.find(function (t) { return !t.disabled && t.textContent === ch; });
            if (ch === letters[pos] && tile) {
              tile.disabled = true;
              tile.classList.remove('is-hint');
              const slot = slots.children[pos];
              slot.textContent = ch;
              slot.classList.add('is-filled');
              pos += 1;
              misses = 0;
              if (pos === letters.length) {
                done();
              } else {
                App.say(letterName(ch));
              }
            } else {
              misses += 1;
              mistakesTotal += 1;
              if (tile) {
                tile.classList.remove('is-wrong');
                void tile.offsetWidth;
                tile.classList.add('is-wrong');
              }
              if (misses >= 2) {
                const right = tiles.find(function (t) { return !t.disabled && t.textContent === letters[pos]; });
                if (right) right.classList.add('is-hint');
                App.feedback(fb, 'try', 'Look at the glowing letter: ' + letters[pos] + '.', 'Look at the glowing letter. ' + letterName(letters[pos]) + '.');
              } else {
                App.feedback(fb, 'try', 'Not that one. Listen again.', false);
                App.sayList(['Not that one.', w.word]);
              }
            }
          }

          function done() {
            if (stopKeys) { stopKeys(); stopKeys = null; }
            Progress.recordWord(w.word, mistakesTotal === 0);
            progress.set(i + 1);
            const spelled = letters.map(letterName).join(', ');
            App.feedback(fb, 'ok', App.praise() + ' ' + w.word + '.', false);
            const row = Dict.syllableRow(w);
            fb.append(row);
            App.sayList([spelled + '.', App.praise()], function () { Dict.say(w, row); });
            const last = i === items.length - 1;
            actions.replaceChildren(App.button({
              icon: last ? '✓' : '▶️', label: last ? 'Finish' : 'Next word', kind: 'primary',
              onClick: function () {
                if (last) { App.finishActivity('words', function () { spell(theme, box); }); return; }
                i += 1;
                show(true);
              }
            }));
          }

          box.replaceChildren(
            progress.node,
            el('div', { class: 'center-col' },
              App.picture(w.picture, 'learn-pic'),
              App.button({ icon: '🔊', label: 'Hear the word', kind: 'primary', onClick: function () { App.say(w.word); } }),
              slots,
              tilesBox
            ),
            fb,
            actions
          );

          // She can also type the letters on the keyboard.
          stopKeys = App.listen(document, 'keydown', function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
            if (!/[a-z]/i.test(e.key)) return;
            e.preventDefault();
            tryLetter(e.key.toLowerCase(), null);
          });

          if (speak) App.say(w.word);
        }
        show(false);
      }
    }
  });

  /* =========================================================
     REVIEW
     ========================================================= */
  App.registerScreen('review', {
    title: 'Review',
    spoken: 'Review my words',
    instruction: 'Tap the matching picture or word.',
    render: function (main) {
      const stage = el('div', { class: 'stage' });
      main.append(stage);
      const token = App.here();
      Promise.all([App.loadData('words'), Dict.ready()]).then(function (res) {
        if (!App.stillHere(token)) return;
        start(res[0]);
      }).catch(function () { App.dataError(stage); });

      function start(data) {
        const everyWord = allWords(data);
        const find = function (k) { return everyWord.find(function (w) { return w.word.toLowerCase() === k; }); };
        let items = Progress.wordsToReview(MATCH_ROUND).map(find).filter(Boolean);
        if (items.length < 4) {
          // Not much is due today: add other words she has met.
          Progress.knownWords().map(find).filter(Boolean).forEach(function (w) {
            if (items.length < MATCH_ROUND && items.indexOf(w) === -1) items.push(w);
          });
        }

        if (items.length < 3) {
          stage.replaceChildren(el('section', { class: 'card tibeb-top center-col' },
            el('p', { class: 'learn-pic', 'aria-hidden': 'true', text: '🧺' }),
            el('h2', { class: 'card-title sayable', text: 'Learn a few words first.' }),
            el('p', { class: 'sayable', text: 'Words you learn will come back here to practice.' }),
            App.button({ icon: '🧺', label: 'Go to Words', kind: 'primary', onClick: function () { App.go('words'); } })
          ));
          return;
        }

        items = App.shuffle(items);
        const box = el('div', { class: 'stage' });
        stage.replaceChildren(el('section', { class: 'card tibeb-top stage' },
          el('h2', { class: 'card-title sayable', text: 'Words to remember' }),
          box
        ));
        matchRound(box, items, everyWord, 'review', function () { start(data); });
      }
    }
  });
})();
