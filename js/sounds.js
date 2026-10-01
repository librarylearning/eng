/* =============================================================
   FILE: /js/sounds.js
   MODULE: Sound Explorer
   Four practices, each one small step:
   1. Letters        tap a letter: hear its name, its sound, and
                     a picture word. Then find it on the keyboard.
   2. Vowels         short and long vowels (cat / cake), the quiet
                     e at the end (pin / pine), and a "Short or
                     long?" game.
   3. Blend          tap each sound (b - u - s), then blend them
                     into a word (bus).
   4. Listen closely hear one word and pick between two words
                     that sound alike (pin / bin).
   Content lives in data/sounds.json.
   Real recordings (optional): audio/letter-b.mp3 (the name),
   audio/sound-b.mp3 (the sound), audio/short-a.mp3 and
   audio/long-a.mp3 (vowel sounds), audio/bus.mp3 (a word).
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  const MODES = [
    { id: 'letters', icon: '🔤', label: 'Letters' },
    { id: 'vowels',  icon: '🅰️', label: 'Vowels' },
    { id: 'blend',   icon: '🧩', label: 'Blend' },
    { id: 'pairs',   icon: '👂', label: 'Listen closely' }
  ];
  const INSTRUCTIONS = {
    letters: 'Tap a letter. Listen. Then say it out loud.',
    vowels: 'Vowels can be short or long. Tap each picture to hear the difference.',
    blend: 'Tap each sound. Then press Blend.',
    pairs: 'Listen to the word. Tap the picture you hear.'
  };
  const LETTERS_PER_CUP = 6;   // new letters explored before a cup is poured
  const BLENDS_PER_CUP = 4;    // words blended before a cup is poured
  const PAIRS_PER_CUP = 5;     // right answers before a cup is poured
  const VOWEL_ROUND = 6;       // words in one "Short or long?" round
  const SHORT_MARK = { a: 'ă', e: 'ĕ', i: 'ĭ', o: 'ŏ', u: 'ŭ' };   // dictionary marks
  const LONG_MARK = { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū' };

  let data = null;
  let stopMode = [];           // tidy-up for the current practice

  function letterInfo(ch) {
    return data.letters.find(function (L) { return L.letter === ch; });
  }

  function clearMode() {
    stopMode.forEach(function (fn) { fn(); });
    stopMode = [];
  }

  App.registerScreen('sounds', {
    title: 'Sounds',
    spoken: 'Sound Explorer',
    instruction: INSTRUCTIONS.letters,
    render: function (main) {
      let mode = 'letters';
      const tabs = el('div');
      const stage = el('div', { class: 'stage' });
      main.append(tabs, stage);
      App.onLeave(clearMode);

      const token = App.here();
      App.loadData('sounds').then(function (d) {
        if (!App.stillHere(token)) return;
        data = d;
        drawTabs();
        show();
      }).catch(function () { App.dataError(stage); });

      function drawTabs() {
        tabs.replaceChildren(App.modeTabs(MODES, mode, function (id) {
          mode = id;
          drawTabs();
          App.setInstruction(INSTRUCTIONS[id], true);
          show();
        }));
      }

      function show() {
        clearMode();
        stage.replaceChildren();
        if (mode === 'letters') showLetters(stage);
        if (mode === 'vowels') showVowels(stage);
        if (mode === 'blend') showBlend(stage);
        if (mode === 'pairs') showPairs(stage);
      }
    }
  });

  /* ---------- 1. Letters ---------- */

  function showLetters(stage) {
    const focus = el('section', { class: 'card tibeb-top letter-focus' });
    const grid = el('div', { class: 'letter-grid' });
    const heard = new Set();
    let current = null;
    const keys = {};

    data.letters.forEach(function (L) {
      const b = el('button', {
        type: 'button', class: 'letter-key', 'data-say': L.name,
        onclick: function () { b.blur(); choose(L, true); }
      }, L.letter.toUpperCase() + L.letter);
      keys[L.letter] = b;
      grid.append(b);
    });

    // The word with the letter underlined: b-u-s, with "b" marked.
    function markedWord(word, letter) {
      const p = el('p', { class: 'lf-word sayable', 'data-say': word });
      const at = word.indexOf(letter);
      word.split('').forEach(function (ch, i) {
        p.append(i === at ? el('span', { class: 'hl', text: ch }) : ch);
      });
      return p;
    }

    function choose(L, speak) {
      current = L;
      Object.keys(keys).forEach(function (k) { keys[k].classList.toggle('is-current', k === L.letter); });
      focus.replaceChildren(
        el('div', { class: 'lf-top' },
          el('div', { class: 'lf-letter sayable', 'data-say': L.name, text: L.letter.toUpperCase() + ' ' + L.letter }),
          App.picture(L.picture, 'lf-pic')
        ),
        markedWord(L.word, L.letter),
        el('div', { class: 'btn-row' },
          App.button({ icon: '🔤', label: 'Name', onClick: function () { App.say(L.name, { audioKey: 'letter-' + L.letter }); } }),
          App.button({ icon: '🗣️', label: 'Sound', onClick: function () { App.say(L.sound, { audioKey: 'sound-' + L.letter }); } }),
          App.button({ icon: '🔊', label: 'Word', onClick: function () { App.say(L.word); } })
        ),
        el('p', { class: 'lf-try sayable', text: 'Now find ' + L.letter.toUpperCase() + ' on your keyboard and press it.' })
      );
      if (!speak) return;

      const isNew = !heard.has(L.letter);
      heard.add(L.letter);
      keys[L.letter].classList.add('is-heard');
      App.sayList([
        { text: L.name, audioKey: 'letter-' + L.letter },
        { text: L.sound, audioKey: 'sound-' + L.letter },
        { text: L.word }
      ], function () {
        if (isNew && heard.size % LETTERS_PER_CUP === 0) App.finishActivity('sounds');
      });
    }

    // She presses a key on the real keyboard.
    stopMode.push(App.listen(document, 'keydown', function (e) {
      if (!current || App.isCelebrating() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase();
      if (!/[a-z]/.test(k)) return;
      if (k === current.letter) {
        focus.classList.remove('is-flash');
        void focus.offsetWidth;   // restart the flash
        focus.classList.add('is-flash');
        App.say('Yes. ' + current.name + '. ' + App.praise());
      } else {
        const other = letterInfo(k);
        App.say('That is ' + (other ? other.name : k) + '. Look for ' + current.name + '.');
      }
    }));

    choose(data.letters[0], false);
    stage.append(el('div', { class: 'sound-layout' }, focus, grid));
  }


  /* ---------- 2. Vowels: short and long ---------- */

  // A word with its vowels marked, like c-A-k-E.
  function vowelWord(word, cls, tag) {
    const p = el(tag || 'p', { class: cls || 'v-word sayable', 'data-say': word });
    word.split('').forEach(function (ch) {
      p.append('aeiou'.indexOf(ch) !== -1 ? el('span', { class: 'hl', text: ch }) : ch);
    });
    return p;
  }

  function showVowels(stage) {
    const sub = el('div', { class: 'btn-row' });
    const box = el('div', { class: 'stage' });
    stage.append(sub, box);
    let view = 'learn';

    function drawSub() {
      sub.replaceChildren(
        App.modeTabs([
          { id: 'learn', icon: '👀', label: 'Learn the vowels' },
          { id: 'quiz', icon: '🎯', label: 'Short or long?' }
        ], view, function (id) {
          view = id;
          drawSub();
          if (id === 'quiz') App.setInstruction('Listen to the word. Is the vowel short or long?', true);
          else App.setInstruction('Vowels can be short or long. Tap each picture to hear the difference.', true);
          draw();
        })
      );
    }

    function draw() {
      if (view === 'learn') learn();
      else quiz();
    }

    /* Learn: each vowel's short and long sound, then the quiet e */
    function learn() {
      const rules = el('section', { class: 'card tibeb-top stage' },
        el('h2', { class: 'card-title sayable', text: 'Five vowels: a, e, i, o, u' }),
        el('div', { class: 'rule-pair' },
          el('div', { class: 'rule-box' },
            el('p', { class: 'rule-head sayable', 'data-say': 'Short vowels', text: 'ă  Short' }),
            el('p', { class: 'sayable', text: 'A short vowel is quick and small. Usually one vowel sits between other letters: cat, egg, fish, hot, cup.' })
          ),
          el('div', { class: 'rule-box' },
            el('p', { class: 'rule-head sayable', 'data-say': 'Long vowels', text: 'ā  Long' }),
            el('p', { class: 'sayable', text: 'A long vowel says its own name. Look for a quiet e at the end, or two vowels together: cake, tree, boat.' })
          )
        )
      );

      const table = el('div', { class: 'vowel-table' });
      data.vowels.forEach(function (v) {
        const half = function (kind) {
          const info = v[kind];
          const sound = kind === 'short' ? v.shortSound : v.longSound;
          const mark = kind === 'short' ? SHORT_MARK[v.letter] : LONG_MARK[v.letter];
          const b = el('button', { type: 'button', class: 'vhalf vhalf-' + kind, 'data-say': (kind === 'short' ? 'short ' : 'long ') + v.letter + ', ' + info.word },
            el('span', { class: 'vmark', text: mark }),
            App.picture(info.picture, 'vpic'),
            vowelWord(info.word, 'v-word', 'span')
          );
          b.addEventListener('click', function () {
            b.blur();
            App.sayList([
              { text: sound, audioKey: kind + '-' + v.letter, node: b },
              { text: info.word, node: b }
            ]);
          });
          return b;
        };
        table.append(el('div', { class: 'vowel-row' },
          el('span', { class: 'vletter sayable', 'data-say': v.longSound, text: v.letter.toUpperCase() + v.letter }),
          half('short'),
          half('long')
        ));
      });

      const magic = el('div', { class: 'magic-grid' });
      data.magicE.forEach(function (m) {
        const b = el('button', { type: 'button', class: 'magic-pair', 'data-say': m.short + ', ' + m.long },
          el('span', { class: 'mp-side' }, App.picture(m.shortPicture, 'vpic'), el('span', { class: 'mp-word', text: m.short })),
          el('span', { class: 'mp-arrow', 'aria-hidden': 'true', text: '→' }),
          el('span', { class: 'mp-side' }, App.picture(m.longPicture, 'vpic'),
            el('span', { class: 'mp-word' }, m.long.slice(0, -1), el('span', { class: 'hl', text: 'e' })))
        );
        b.addEventListener('click', function () { b.blur(); App.sayList([{ text: m.short, node: b }, { text: m.long, node: b }]); });
        magic.append(b);
      });

      box.replaceChildren(
        rules,
        el('section', { class: 'card stage' }, table),
        el('section', { class: 'card tibeb-top stage' },
          el('h2', { class: 'card-title sayable', text: 'The quiet e' }),
          el('p', { class: 'sayable help', text: 'An e at the end of a word makes no sound. It makes the vowel before it say its name.' }),
          magic
        ),
        el('div', { class: 'btn-row' },
          App.button({ icon: '🎯', label: 'Play: Short or long?', kind: 'primary', onClick: function () {
            view = 'quiz'; drawSub(); App.setInstruction('Listen to the word. Is the vowel short or long?', true); draw();
          } })
        )
      );
    }

    /* Quiz: hear a word, choose short or long */
    function quiz() {
      const items = App.shuffle(data.vowelQuiz).slice(0, VOWEL_ROUND);
      let i = 0;
      const progress = App.dots(items.length);
      const card = el('section', { class: 'card tibeb-top stage' });
      box.replaceChildren(card);

      function show(autoPlay) {
        const q = items[i];
        let done = false;
        const fb = el('div', { 'aria-live': 'polite' });
        const actions = el('div', { class: 'btn-row' });
        const grid = el('div', { class: 'choices two' });

        [false, true].forEach(function (isLong) {
          const label = isLong ? 'Long' : 'Short';
          grid.append(App.choice({
            picture: isLong ? LONG_MARK[q.vowel] : SHORT_MARK[q.vowel],
            label: label,
            onClick: function (btn) {
              if (done) return;
              if (isLong === q.long) {
                done = true;
                btn.classList.add('is-right');
                Progress.recordWord(q.word, true);
                progress.set(i + 1);
                App.feedback(fb, 'ok', 'Yes! ' + q.why);
                const last = i === items.length - 1;
                actions.replaceChildren(App.button({
                  icon: last ? '✓' : '▶️', label: last ? 'Finish' : 'Next word', kind: 'primary',
                  onClick: function () {
                    if (last) { App.finishActivity('sounds', function () { quiz(); }); return; }
                    i += 1;
                    show(true);
                  }
                }));
              } else {
                btn.classList.add('is-wrong');
                Progress.recordWord(q.word, false);
                App.feedback(fb, 'try', 'Not yet. Listen again: ' + q.word + '.', false);
                App.sayList(['Not yet. Listen again.', q.word]);
              }
            }
          }));
        });

        card.replaceChildren(
          progress.node,
          el('div', { class: 'center-col' },
            App.picture(q.picture, 'learn-pic'),
            vowelWord(q.word, 'learn-word sayable'),
            App.button({ icon: '🔊', label: 'Hear the word', kind: 'primary', onClick: function () { App.say(q.word); } })
          ),
          grid, fb, actions
        );
        if (autoPlay) App.say(q.word);
      }
      show(false);
    }

    drawSub();
    draw();
  }

  /* ---------- 3. Blend ---------- */

  function showBlend(stage) {
    const list = App.shuffle(data.blend);
    let index = 0;
    let blended = 0;
    const card = el('section', { class: 'card tibeb-top blend-card' });
    stage.append(card);

    function soundFor(ch) {
      const L = letterInfo(ch);
      return { text: L ? L.sound : ch, audioKey: 'sound-' + ch };
    }

    function draw() {
      const item = list[index % list.length];
      const tiles = el('div', { class: 'blend-tiles' });
      item.word.split('').forEach(function (ch) {
        const s = soundFor(ch);
        const t = el('button', { type: 'button', class: 'blend-tile', 'data-say': s.text, text: ch });
        t.addEventListener('click', function () { t.blur(); App.say(s.text, { audioKey: s.audioKey, node: t }); });
        tiles.append(t);
      });

      const reveal = el('div', { class: 'blend-reveal' }, el('span', { class: 'mystery', text: '?' }));
      const actions = el('div', { class: 'btn-row center' });

      const blendBtn = App.button({
        icon: '🔗', label: 'Blend', kind: 'primary',
        onClick: function () {
          tiles.classList.add('joined');
          const parts = item.word.split('').map(soundFor);
          parts.push({ text: item.word });
          App.sayList(parts, function () {
            reveal.replaceChildren(App.picture(item.picture, 'pic'), el('span', { class: 'sayable', text: item.word }));
            App.say(item.word + '. ' + App.praise());
            showNext();
          });
        }
      });
      actions.append(blendBtn);

      function showNext() {
        actions.replaceChildren(
          App.button({ icon: '🔁', label: 'Again', onClick: function () { App.say(item.word); } }),
          App.button({
            icon: '▶️', label: 'Next word', kind: 'primary',
            onClick: function () {
              blended += 1;
              index += 1;
              if (blended % BLENDS_PER_CUP === 0) App.finishActivity('sounds', draw);
              else draw();
            }
          })
        );
      }

      card.replaceChildren(tiles, reveal, actions);
    }
    draw();
  }

  /* ---------- 4. Listen closely (sounds that are easy to mix up) ---------- */

  function showPairs(stage) {
    const pairs = App.shuffle(data.pairs);
    let index = 0;
    let rightCount = 0;
    const card = el('section', { class: 'card tibeb-top stage' });
    stage.append(card);

    function draw(autoPlay) {
      const pair = pairs[index % pairs.length];
      const target = Math.random() < 0.5 ? pair.a : pair.b;
      let firstTry = true;
      let done = false;
      const fb = el('div', { 'aria-live': 'polite' });
      const actions = el('div', { class: 'btn-row' });
      const grid = el('div', { class: 'choices two' });

      App.shuffle([pair.a, pair.b]).forEach(function (opt) {
        grid.append(App.choice({
          picture: opt.picture, label: opt.word,
          onClick: function (btn) {
            if (done) return;
            if (opt.word === target.word) {
              done = true;
              btn.classList.add('is-right');
              Progress.recordWord(target.word, firstTry);
              App.feedback(fb, 'ok', 'Yes! You heard "' + target.word + '".');
              rightCount += 1;
              actions.replaceChildren(App.button({
                icon: '▶️', label: 'Next', kind: 'primary',
                onClick: function () {
                  index += 1;
                  const again = function () { draw(true); };
                  if (rightCount % PAIRS_PER_CUP === 0) App.finishActivity('sounds', again);
                  else again();
                }
              }));
            } else {
              firstTry = false;
              btn.classList.add('is-wrong');
              App.feedback(fb, 'try', 'Not yet. This one is "' + opt.word + '". Listen again.', false);
              App.sayList(['Not yet. This one is ' + opt.word + '.', 'Listen again.', target.word]);
            }
          }
        }));
      });

      card.replaceChildren(
        el('p', { class: 'pair-focus muted sayable', text: 'Listen for: ' + pair.focus }),
        el('div', { class: 'btn-row' },
          App.button({ icon: '🔊', label: 'Play the word', kind: 'primary', onClick: function () { App.say(target.word); } })
        ),
        grid, fb, actions
      );
      if (autoPlay) App.say(target.word);
    }
    draw();
  }
})();
