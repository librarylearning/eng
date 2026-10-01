/* =============================================================
   FILE: /js/teacher.js
   MODULE: For Teacher
   - Her progress on this computer (practices, flowers, days)
   - Practice by area, and the words she finds hardest
   - Recording names: the exact MP3 file names for every word,
     sentence, letter, and sound, so you can add a real voice
   - How to add your own words and stories
   - Start over (erase progress)
   Nothing here is sent anywhere. It only reads this browser.
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  // Names for the activity counts
  const AREAS = [
    { prefix: 'sounds',    label: 'Sounds' },
    { prefix: 'words',     label: 'Words' },
    { prefix: 'grammar',   label: 'Grammar' },
    { prefix: 'story:',    label: 'Stories' },
    { prefix: 'typing',    label: 'Typing' },
    { prefix: 'computer:', label: 'Computer' },
    { prefix: 'review',    label: 'Review' }
  ];

  App.registerScreen('teacher', {
    title: 'For Teacher',
    instruction: 'Progress and tools for the teacher.',
    render: function (main) {
      const s = Progress.summary();

      /* ----- At a glance ----- */
      const stat = function (num, label) {
        return el('div', { class: 'stat' },
          el('span', { class: 'stat-num', text: String(num) }),
          el('span', { class: 'stat-label', text: label }));
      };
      const glance = el('section', { class: 'card setting' },
        el('h2', { text: 'At a glance' }),
        el('div', { class: 'stats' },
          stat(s.total, 'practices finished'),
          stat(s.flowers, 'flowers grown'),
          stat(s.daysPracticed, 'days practiced'),
          stat(s.wordsMet, 'words met'),
          stat(s.dueToday, 'words due for review today')
        )
      );

      /* ----- By area ----- */
      const areaRows = AREAS.map(function (a) {
        let count = 0;
        Object.keys(s.activities).forEach(function (k) {
          if (k === a.prefix || k.indexOf(a.prefix) === 0) count += s.activities[k];
        });
        return el('tr', {}, el('td', { text: a.label }), el('td', { class: 'num', text: String(count) }));
      });
      const byArea = el('section', { class: 'card setting' },
        el('h2', { text: 'Practice by area' }),
        el('div', { class: 't-table-wrap' },
          el('table', { class: 't-table' },
            el('thead', {}, el('tr', {}, el('th', { text: 'Area' }), el('th', { text: 'Finished' }))),
            el('tbody', {}, areaRows)
          )
        )
      );

      /* ----- Hard words ----- */
      const hard = Progress.hardWords(15);
      const hardCard = el('section', { class: 'card setting' },
        el('h2', { text: 'Words to practice more' }),
        hard.length
          ? el('div', { class: 't-table-wrap' },
              el('table', { class: 't-table' },
                el('thead', {}, el('tr', {}, el('th', { text: 'Word' }), el('th', { text: 'Right' }), el('th', { text: 'Not yet' }))),
                el('tbody', {}, hard.map(function (h) {
                  return el('tr', {}, el('td', { text: h.word }), el('td', { class: 'num', text: String(h.right) }), el('td', { class: 'num', text: String(h.wrong) }));
                }))
              ))
          : el('p', { class: 'help', text: 'No hard words yet. Words she misses in Match, Spell, Review, Typing, and Listen closely will show here.' }),
        el('p', { class: 'help', text: 'These words come back more often in Review on their own.' })
      );

      /* ----- Recording names ----- */
      const recInput = el('input', { id: 'rec-text', class: 'field', type: 'text', placeholder: 'Type a word or sentence', 'aria-label': 'Word or sentence to record' });
      const recOut = el('p', { class: 'filename', text: 'audio/….mp3' });
      recInput.addEventListener('input', function () {
        const n = Voice.fileNameFor(recInput.value);
        recOut.textContent = n ? 'audio/' + n + '.mp3' : 'audio/….mp3';
      });

      const listSelect = el('select', { id: 'rec-list', class: 'field', 'aria-label': 'Choose a list' },
        el('option', { value: '', text: 'Choose a list…' }));
      const listOut = el('pre', { class: 'code', text: 'The file names will appear here.' });
      const copyBtn = App.button({
        icon: '📋', label: 'Copy list',
        onClick: function () {
          const text = listOut.textContent;
          const done = function () { App.say('Copied.'); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(selectIt);
          } else {
            selectIt();
          }
          function selectIt() {
            const range = document.createRange();
            range.selectNodeContents(listOut);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });

      const recCard = el('section', { class: 'card setting' },
        el('h2', { text: 'Add a real voice' }),
        el('p', { class: 'help', text: 'Record a word or sentence, save it as an MP3 with the exact name below, and put it in the audio folder. The site will play your recording instead of the computer voice.' }),
        recInput, recOut,
        el('p', { class: 'help', text: 'Or pick a list to see every file name for a story, a word group, or the letters:' }),
        el('div', { class: 'field-row' }, listSelect, copyBtn),
        listOut
      );

      const token = App.here();
      Promise.all([App.loadData('words'), App.loadData('stories'), App.loadData('sounds'), App.loadData('grammar')]).then(function (res) {
        if (!App.stillHere(token)) return;
        const words = res[0], stories = res[1], sounds = res[2], grammar = res[3];
        const lists = {};
        const row = function (text, key) { return 'audio/' + (key || Voice.fileNameFor(text)) + '.mp3   ←  "' + text + '"'; };

        lists.letters = sounds.letters.map(function (L) {
          return [row(L.name, 'letter-' + L.letter), row(L.sound, 'sound-' + L.letter), row(L.word)].join('\n');
        }).join('\n');
        listSelect.append(el('option', { value: 'letters', text: 'Letters and sounds' }));

        lists.vowels = sounds.vowels.map(function (v) {
          return [row(v.shortSound, 'short-' + v.letter), row(v.longSound, 'long-' + v.letter), row(v.short.word), row(v.long.word)].join('\n');
        }).join('\n');
        listSelect.append(el('option', { value: 'vowels', text: 'Vowels: short and long' }));

        lists.verbs = grammar.verbs.map(function (v) {
          return [row(v.base), row(v.past), row(v.sentence)].join('\n');
        }).join('\n');
        listSelect.append(el('option', { value: 'verbs', text: 'Grammar: verbs' }));

        lists.kinds = grammar.kinds.map(function (k) { return [row(k.name), row(k.meaning), row(k.tip)].join('\n'); }).join('\n');
        listSelect.append(el('option', { value: 'kinds', text: 'Grammar: word kinds' }));

        stories.stories.forEach(function (st) {
          const lines = [row(st.title)].concat(st.sentences.map(function (x) { return row(x); }), st.questions.map(function (q) { return row(q.question); }));
          lists['story:' + st.id] = lines.join('\n');
          listSelect.append(el('option', { value: 'story:' + st.id, text: 'Story: ' + st.title }));
        });

        words.themes.forEach(function (t) {
          const lines = [];
          t.words.forEach(function (w) {
            lines.push(row(w.word));
            if (w.definition) lines.push(row(w.definition));
            lines.push(row(w.sentence));
          });
          lists['theme:' + t.id] = lines.join('\n');
          listSelect.append(el('option', { value: 'theme:' + t.id, text: (t.group && t.group.indexOf('Ventures') === 0 ? t.group.replace('Ventures 3 · ', 'V3 ') + ': ' : 'Words: ') + t.name }));
        });

        listSelect.addEventListener('change', function () {
          listOut.textContent = lists[listSelect.value] || 'The file names will appear here.';
        });
      }).catch(function () { /* lists stay empty */ });

      /* ----- Adding words and stories ----- */
      const howTo = el('section', { class: 'card setting' },
        el('h2', { text: 'Add your own words and stories' }),
        el('ol', { class: 'steps' },
          el('li', { text: 'On GitHub, open the data folder.' }),
          el('li', { text: 'Click words.json (or stories.json), then the pencil ✏️ to edit.' }),
          el('li', { text: 'Copy a line that already works, paste it below, and change the words.' }),
          el('li', { text: 'Keep the commas between items. The last item in a list has no comma after it.' }),
          el('li', { text: 'Click "Commit changes". Wait one minute, then refresh the site.' })
        ),
        el('p', { class: 'help', text: 'A new word (inside a group\'s "words" list):' }),
        el('pre', { class: 'code', text: '{ "word": "spoon", "syllables": "spoon", "pos": "noun", "definition": "A small tool for eating soup or stirring tea.", "picture": "🥄", "sentence": "I stir my tea with a spoon." },' }),
        el('p', { class: 'help', text: 'syllables: write the word with a dot (·) between syllables, like res·tau·rant. Copy the dot from merriam-webster.com or from another word in the file. Add "abstract": true for a word with no clear picture; the games will ask about its meaning instead.' }),
        el('p', { class: 'help', text: 'About the word data: syllable breaks follow Merriam-Webster. Where the dictionary does not split off a one-letter syllable (alone, imagine, career, ocean), the site follows the dictionary\'s pronunciation so every spoken beat shows (a·lone). Definitions are short, plain-English meanings based on Merriam-Webster, written for this learner.' }),
        el('p', { class: 'help', text: 'A picture can also be your own photo: put it in the images folder and write "picture": "images/spoon.jpg".' }),
        el('p', { class: 'help', text: 'A new story (inside the "stories" list):' }),
        el('pre', { class: 'code', text:
          '{\n' +
          '  "id": "park-walk",\n' +
          '  "title": "A Walk in the Park",\n' +
          '  "picture": "🌳",\n' +
          '  "sentences": [\n' +
          '    "Grace walks in the park.",\n' +
          '    "The sun is warm.",\n' +
          '    "She sits on a bench."\n' +
          '  ],\n' +
          '  "questions": [\n' +
          '    { "type": "yesno", "question": "Is the sun warm?", "answer": true, "explain": "Yes. The sun is warm." },\n' +
          '    { "type": "choice", "question": "Where does she sit?",\n' +
          '      "options": [ { "text": "on a bench", "picture": "🪑" }, { "text": "in a car", "picture": "🚗" } ],\n' +
          '      "answer": 0, "explain": "She sits on a bench." }\n' +
          '  ]\n' +
          '},'
        }),
        el('p', { class: 'help', text: 'If a page says "could not load" after an edit, a comma or quote mark is usually missing. Paste the file into jsonlint.com to find it.' })
      );

      /* ----- Start over ----- */
      const resetArea = el('div', { class: 'btn-row' });
      function showStart() {
        resetArea.replaceChildren(App.button({ icon: '🔄', label: 'Erase progress', onClick: showAsk }));
      }
      function showAsk() {
        resetArea.replaceChildren(
          el('p', { class: 'warn', text: 'Erase all cups, flowers, and word history? The name and settings stay.' }),
          App.button({ icon: '🗑️', label: 'Yes, erase', kind: 'danger', onClick: function () { Store.resetProgress(); App.go('teacher'); App.say('Progress erased.'); } }),
          App.button({ icon: '↩️', label: 'Keep it', onClick: showStart })
        );
      }
      showStart();
      const resetCard = el('section', { class: 'card setting' },
        el('h2', { text: 'Start over' }),
        el('p', { class: 'help', text: 'Progress is saved only in this browser on this computer.' }),
        resetArea
      );

      main.append(glance, byArea, hardCard, recCard, howTo, resetCard);
    }
  });
})();
