/* =============================================================
   FILE: /js/grammar.js
   MODULE: Grammar
   Three parts. Each starts with short, hearable lessons, then
   a gentle practice game:
   1. Word kinds   noun, verb, adjective, adverb, pronoun,
                   preposition, article. Each kind has a color;
                   sentences show every word in its color.
   2. a, an, the   when to use each one.
   3. Verbs: past  regular verbs add -ed (walk -> walked);
                   irregular verbs change (go -> went).
   Content lives in data/grammar.json.
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  const MODES = [
    { id: 'kinds',    icon: '🏷️', label: 'Word kinds' },
    { id: 'articles', icon: '🔤', label: 'a, an, the' },
    { id: 'verbs',    icon: '⏪', label: 'Verbs: the past' }
  ];
  const INSTRUCTIONS = {
    kinds: 'Every word has a job. Learn each kind of word.',
    articles: 'Learn when to say a, an, or the.',
    verbs: 'Learn how verbs talk about yesterday.'
  };
  const ROUND = 6;   // questions in one practice round

  let data = null;

  function kindById(id) {
    return data.kinds.find(function (k) { return k.id === id; });
  }

  // "a noun", "an adjective"
  function withArticle(name) {
    return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name.toLowerCase();
  }

  // Help the computer voice read endings like -ed and -ly.
  function speakable(text) {
    return text
      .replace(/-ied\b/g, ' i e d')
      .replace(/-ed\b/g, ' e d')
      .replace(/-ly\b/g, ' l y')
      .replace(/-d\b/g, ' d');
  }

  function cleanWord(w) {
    return w.replace(/[^A-Za-z']/g, '');
  }

  App.registerScreen('grammar', {
    title: 'Grammar',
    spoken: 'Grammar',
    instruction: INSTRUCTIONS.kinds,
    render: function (main) {
      let mode = 'kinds';
      const tabs = el('div');
      const stage = el('div', { class: 'stage' });
      main.append(tabs, stage);

      const token = App.here();
      App.loadData('grammar').then(function (d) {
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
        App.stopTalking();
        stage.replaceChildren();
        if (mode === 'kinds') kindsLessons(stage);
        if (mode === 'articles') articleLessons(stage);
        if (mode === 'verbs') verbLessons(stage);
      }
    }
  });

  /* =========================================================
     Shared: a practice round of picture/word choices
     ========================================================= */

  // ask(i) must return { top: [elements], options: [{picture, label, right}],
  //                      rightText, onRight(), wrongText(option) }
  function practiceRound(box, count, ask, activityId, again, backToLessons) {
    let i = 0;
    const progress = App.dots(count);

    function show(autoSay) {
      const q = ask(i);
      let misses = 0;
      let done = false;
      const fb = el('div', { 'aria-live': 'polite' });
      const actions = el('div', { class: 'btn-row' });
      const grid = el('div', { class: 'choices' + (q.options.length === 2 ? ' two' : '') });
      const buttons = [];

      q.options.forEach(function (o) {
        const b = App.choice({
          picture: o.picture, label: o.label, say: o.say,
          onClick: function (btn) {
            if (done) return;
            if (o.right) {
              done = true;
              btn.classList.remove('is-hint');
              btn.classList.add('is-right');
              progress.set(i + 1);
              if (q.onRight) q.onRight(misses === 0);
              App.feedback(fb, 'ok', 'Yes! ' + q.rightText, speakable('Yes! ' + q.rightText));
              const last = i === count - 1;
              actions.replaceChildren(App.button({
                icon: last ? '✓' : '▶️', label: last ? 'Finish' : 'Next', kind: 'primary',
                onClick: function () {
                  if (last) { App.finishActivity(activityId, again); return; }
                  i += 1;
                  show(true);
                }
              }));
            } else {
              misses += 1;
              btn.classList.add('is-wrong');
              if (misses >= 2) {
                buttons.forEach(function (x) { if (x.right) x.btn.classList.add('is-hint'); });
              }
              const text = q.wrongText(o, misses);
              App.feedback(fb, 'try', text, speakable(text));
            }
          }
        });
        buttons.push({ btn: b, right: o.right });
        grid.append(b);
      });

      box.replaceChildren(
        el('div', { class: 'btn-row' },
          App.button({ icon: '📖', label: 'Back to the lessons', kind: 'quiet', onClick: backToLessons })
        ),
        progress.node
      );
      q.top.forEach(function (n) { box.append(n); });
      box.append(grid, fb, actions);
      if (autoSay && q.say) App.say(q.say);
    }
    show(false);
  }

  // A simple "Back / Next" pager for lesson pages.
  function pager(box, pages, onPractice) {
    let page = 0;
    function draw(speak) {
      const progress = App.dots(pages.length);
      progress.set(page + 1);
      const last = page === pages.length - 1;
      const content = pages[page]();
      box.replaceChildren(progress.node);
      content.nodes.forEach(function (n) { box.append(n); });
      box.append(el('div', { class: 'btn-row' },
        App.button({ icon: '◀️', label: 'Back', disabled: page === 0, onClick: function () { page -= 1; draw(true); } }),
        last
          ? App.button({ icon: '🎯', label: 'Practice', kind: 'primary', onClick: onPractice })
          : App.button({ icon: '▶️', label: 'Next', kind: 'primary', onClick: function () { page += 1; draw(true); } }),
        last ? null : App.button({ icon: '🎯', label: 'Skip to practice', kind: 'quiet', onClick: onPractice })
      ));
      if (speak && content.say) App.say(speakable(content.say));
      window.scrollTo(0, 0);
    }
    draw(false);
  }

  // A small button that says something when tapped.
  function chip(text, say, cls) {
    const b = el('button', { type: 'button', class: 'chip' + (cls ? ' ' + cls : ''), 'data-say': say || text, text: text });
    b.addEventListener('click', function () { b.blur(); App.say(speakable(say || text), { node: b }); });
    return b;
  }

  /* =========================================================
     1. WORD KINDS
     ========================================================= */

  function kindsLessons(stage) {
    const box = el('section', { class: 'card tibeb-top stage' });
    stage.append(box);

    const pages = data.kinds.map(function (k) {
      return function () {
        const examples = el('div', { class: 'example-row' });
        k.examples.forEach(function (ex) {
          const b = el('button', { type: 'button', class: 'example k-' + k.id, 'data-say': ex.word },
            App.picture(ex.picture, 'ex-pic'),
            el('span', { class: 'ex-word', text: ex.word })
          );
          b.addEventListener('click', function () { b.blur(); App.say(ex.word, { node: b }); });
          examples.append(b);
        });
        return {
          say: k.name + '. ' + k.meaning,
          nodes: [
            el('div', { class: 'kind-head' },
              el('span', { class: 'kind-icon', 'aria-hidden': 'true', text: k.icon }),
              el('h2', { class: 'kind-name sayable k-' + k.id, text: k.name })
            ),
            el('p', { class: 'kind-meaning sayable', 'data-say': speakable(k.meaning), text: k.meaning }),
            el('p', { class: 'kind-tip sayable', text: k.tip }),
            examples
          ]
        };
      };
    });

    // Last page: whole sentences, every word in its kind's color.
    pages.push(function () {
      const legend = el('div', { class: 'legend' });
      data.kinds.forEach(function (k) {
        legend.append(el('span', { class: 'gword sayable k-' + k.id, 'data-say': k.name + '. ' + speakable(k.meaning), text: k.name }));
      });
      const list = el('div', { class: 'stage' });
      data.sentences.forEach(function (sn) {
        const p = el('p', { class: 'g-sentence' });
        sn.words.forEach(function (w, idx) {
          if (idx) p.append(' ');
          const kind = kindById(w[1]);
          p.append(el('span', { class: 'gword sayable k-' + w[1], 'data-say': w[0] + '. ' + (kind ? kind.name : w[1]) + '.', text: w[0] }));
        });
        p.append(sn.end);
        const full = sn.words.map(function (w) { return w[0]; }).join(' ') + sn.end;
        list.append(el('div', { class: 'g-sentence-row' },
          App.button({ icon: '🔊', label: 'Hear', onClick: function () { App.say(full); } }),
          p
        ));
      });
      return {
        say: 'Words working together. Each color is a kind of word. Tap a word to hear its kind.',
        nodes: [
          el('h2', { class: 'card-title sayable', text: 'Words working together' }),
          el('p', { class: 'help sayable', text: 'Each color is a kind of word. Tap a word to hear its kind.' }),
          legend,
          list
        ]
      };
    });

    function practice() {
      App.setInstruction('Look at the word in gold. What kind of word is it?', true);
      const items = App.shuffle(data.kindQuiz).slice(0, ROUND);
      practiceRound(box, items.length, function (i) {
        const q = items[i];
        const kind = kindById(q.kind);
        const others = App.shuffle(data.kinds.filter(function (k) { return k.id !== q.kind; })).slice(0, 2);
        const options = App.shuffle([kind].concat(others)).map(function (k) {
          return { picture: k.icon, label: k.name, say: k.name, right: k.id === q.kind, kind: k };
        });

        // The sentence, with the word to think about marked in gold.
        const sentence = el('p', { class: 'g-quiz-sentence sayable', 'data-say': q.sentence });
        let marked = false;
        q.sentence.split(' ').forEach(function (part, idx) {
          if (idx) sentence.append(' ');
          if (!marked && cleanWord(part) === q.word) {
            marked = true;
            const clean = cleanWord(part);
            sentence.append(el('span', { class: 'target', text: clean }), part.slice(clean.length));
          } else {
            sentence.append(part);
          }
        });

        return {
          say: q.sentence,
          top: [
            sentence,
            el('p', { class: 'q-text sayable', text: 'What kind of word is "' + q.word + '"?' })
          ],
          options: options,
          rightText: '"' + q.word + '" is ' + withArticle(kind.name) + '. ' + kind.meaning,
          onRight: function (first) { Progress.recordWord(q.word, first); },
          wrongText: function (o, misses) {
            return misses >= 2
              ? 'Look at the glowing answer. "' + q.word + '" is ' + withArticle(kind.name) + '.'
              : 'Not yet. "' + q.word + '" is not ' + withArticle(o.label) + '. ' + kind.tip;
          }
        };
      }, 'grammar', function () { practice(); }, lessons);
    }

    function lessons() {
      App.setInstruction(INSTRUCTIONS.kinds);
      pager(box, pages, practice);
    }
    lessons();
  }

  /* =========================================================
     2. A, AN, THE
     ========================================================= */

  function articleLessons(stage) {
    const box = el('section', { class: 'card tibeb-top stage' });
    stage.append(box);

    function lessons() {
      App.setInstruction(INSTRUCTIONS.articles);
      const cards = el('div', { class: 'rule-cards' });
      data.articleRules.forEach(function (r) {
        const examples = el('div', { class: 'chips' });
        r.examples.forEach(function (ex) { examples.append(chip(ex)); });
        cards.append(el('div', { class: 'rule-card' },
          el('p', { class: 'rule-word sayable', text: r.word }),
          el('p', { class: 'sayable', text: r.meaning }),
          examples
        ));
      });
      box.replaceChildren(
        el('h2', { class: 'card-title sayable', text: 'Three small words: a, an, the' }),
        cards,
        el('p', { class: 'tip-box sayable', text: '💡 ' + data.articleTip, 'data-say': data.articleTip }),
        el('div', { class: 'btn-row' },
          App.button({ icon: '🎯', label: 'Practice', kind: 'primary', onClick: practice })
        )
      );
    }

    function practice() {
      App.setInstruction('Which small word fits? Tap it.', true);
      const items = App.shuffle(data.articles).slice(0, ROUND);
      practiceRound(box, items.length, function (i) {
        const q = items[i];
        const blank = el('span', { class: 'blank', 'aria-label': 'blank' }, ' ');
        const full = q.before + ' ' + q.answer + ' ' + q.after;
        return {
          say: q.before + ', blank, ' + q.after,
          top: [
            el('div', { class: 'center-col' },
              App.picture(q.picture, 'learn-pic'),
              el('p', { class: 'g-quiz-sentence sayable', 'data-say': q.before + ', blank, ' + q.after },
                q.before + ' ', blank, ' ' + q.after),
              App.button({ icon: '🔊', label: 'Hear it', onClick: function () { App.say(q.before + ', blank, ' + q.after); } })
            )
          ],
          options: q.options.map(function (opt) {
            return { picture: opt, say: opt, right: opt === q.answer };
          }),
          rightText: full + ' ' + q.why,
          onRight: function () {
            blank.textContent = q.answer;
            blank.classList.add('is-filled');
          },
          wrongText: function (o, misses) {
            return misses >= 2
              ? 'Look at the glowing answer. ' + q.why
              : 'Not yet. Listen to the first sound of the next word, and try the other one.';
          }
        };
      }, 'grammar', function () { practice(); }, lessons);
    }

    lessons();
  }

  /* =========================================================
     3. VERBS: THE PAST (regular and irregular)
     ========================================================= */

  // "walked" with the -ed ending marked in green
  function pastWithEnding(v) {
    const span = el('span', { class: 'past' });
    if (v.type !== 'regular') {
      span.classList.add('past-irr');
      span.textContent = v.past;
      return span;
    }
    const m = v.past.match(/(ied|ed|d)$/);
    const end = m ? m[1] : '';
    span.append(v.past.slice(0, v.past.length - end.length), el('span', { class: 'ed', text: end }));
    return span;
  }

  function verbLessons(stage) {
    const box = el('section', { class: 'card tibeb-top stage' });
    stage.append(box);
    const regular = data.verbs.filter(function (v) { return v.type === 'regular'; });
    const irregular = data.verbs.filter(function (v) { return v.type !== 'regular'; });

    function verbCard(v) {
      const b = el('button', { type: 'button', class: 'verb-card', 'data-say': v.base + ', ' + v.past },
        App.picture(v.picture, 'vpic'),
        el('span', { class: 'verb-pair' },
          el('span', { text: v.base }),
          el('span', { class: 'arrow', 'aria-hidden': 'true', text: ' → ' }),
          pastWithEnding(v)
        )
      );
      b.addEventListener('click', function () {
        b.blur();
        App.sayList([{ text: v.base, node: b }, { text: v.past, node: b }, { text: v.sentence, node: b }]);
      });
      return b;
    }

    const pages = [
      // Today and yesterday
      function () {
        return {
          say: 'Verbs change to talk about the past. Today I walk. Yesterday I walked.',
          nodes: [
            el('h2', { class: 'card-title sayable', text: 'Today and yesterday' }),
            el('p', { class: 'kind-meaning sayable', text: 'A verb changes when we talk about the past.' }),
            el('div', { class: 'rule-cards' },
              el('div', { class: 'rule-card' },
                el('p', { class: 'rule-head sayable', text: 'Today' }),
                chip('I walk to the store.'),
                chip('I eat bread.')
              ),
              el('div', { class: 'rule-card' },
                el('p', { class: 'rule-head sayable', text: 'Yesterday' }),
                chip('I walked to the store.'),
                chip('I ate bread.')
              )
            ),
            el('p', { class: 'kind-tip sayable', text: 'Walk follows the rule: it adds -ed. We call it regular. Eat changes in its own way. We call it irregular.', 'data-say': speakable('Walk follows the rule: it adds -ed. We call it regular. Eat changes in its own way. We call it irregular.') })
          ]
        };
      },
      // Regular verbs: the spelling rules
      function () {
        const rules = el('div', { class: 'stage' });
        data.verbRules.forEach(function (r) {
          const ex = el('div', { class: 'chips' });
          r.examples.forEach(function (pair) {
            ex.append(chip(pair[0] + ' → ' + pair[1], pair[0] + ', ' + pair[1]));
          });
          rules.append(el('div', { class: 'rule-card' },
            el('p', { class: 'rule-title sayable', 'data-say': speakable(r.title), text: r.title }),
            ex
          ));
        });
        return {
          say: 'Regular verbs add -ed for the past.',
          nodes: [
            el('h2', { class: 'card-title sayable', 'data-say': 'Regular verbs', text: 'Regular verbs: add -ed' }),
            el('p', { class: 'help sayable', text: 'Most verbs follow these rules.' }),
            rules
          ]
        };
      },
      // The three sounds of -ed
      function () {
        const sounds = el('div', { class: 'rule-cards' });
        data.edSounds.forEach(function (s) {
          sounds.append(el('div', { class: 'rule-card center-col' },
            el('p', { class: 'rule-word', text: '/' + s.sound + '/' }),
            chip(s.example),
            el('p', { class: 'sayable help', text: s.note })
          ));
        });
        const examples = el('div', { class: 'verb-grid' });
        regular.forEach(function (v) { examples.append(verbCard(v)); });
        return {
          say: 'The -ed ending has three sounds. Listen: walked. called. wanted.',
          nodes: [
            el('h2', { class: 'card-title sayable', 'data-say': speakable('Three sounds of -ed'), text: 'Three sounds of -ed' }),
            el('p', { class: 'help sayable', text: 'We write -ed, but we say it three ways. Tap to listen.', 'data-say': speakable('We write -ed, but we say it three ways. Tap to listen.') }),
            sounds,
            el('p', { class: 'help sayable', text: 'More regular verbs. Tap each one:' }),
            examples
          ]
        };
      },
      // Irregular verbs
      function () {
        const grid = el('div', { class: 'verb-grid' });
        irregular.forEach(function (v) { grid.append(verbCard(v)); });
        return {
          say: 'Irregular verbs do not add -ed. They change in their own way. We learn them one by one.',
          nodes: [
            el('h2', { class: 'card-title sayable', text: 'Irregular verbs: they change' }),
            el('p', { class: 'kind-meaning sayable', text: 'Some verbs do not add -ed. They change in their own way.', 'data-say': speakable('Some verbs do not add -ed. They change in their own way.') }),
            el('p', { class: 'kind-tip sayable', text: 'We learn them one by one. Tap a card to hear it in a sentence.' }),
            grid
          ]
        };
      }
    ];

    function practice() {
      App.setInstruction('Choose the word for the past.', true);
      const items = App.shuffle(data.verbs).slice(0, ROUND);
      practiceRound(box, items.length, function (i) {
        const v = items[i];
        const isRegular = v.type === 'regular';
        const why = isRegular
          ? v.base + ' plus -ed is ' + v.past + '. ' + v.base + ' is a regular verb.'
          : v.base + ' changes to ' + v.past + '. ' + v.base + ' is an irregular verb.';

        if (i % 2 === 0) {
          // Type A: fill in the past word
          const blank = el('span', { class: 'blank' }, ' ');
          const parts = v.sentence.split(new RegExp('\\b' + v.past + '\\b'));
          return {
            say: parts[0] + ', blank, ' + parts[1],
            top: [
              el('div', { class: 'center-col' },
                App.picture(v.picture, 'learn-pic'),
                el('p', { class: 'g-quiz-sentence sayable', 'data-say': parts[0] + ', blank, ' + parts[1] }, parts[0], blank, parts[1]),
                el('p', { class: 'hint-word sayable', 'data-say': 'The verb is ' + v.base, text: '( ' + v.base + ' )' })
              )
            ],
            options: App.shuffle([
              { picture: v.past, say: v.past, right: true },
              { picture: v.base, say: v.base, right: false }
            ]),
            rightText: why,
            onRight: function (first) {
              blank.textContent = v.past;
              blank.classList.add('is-filled');
              Progress.recordWord(v.base, first);
            },
            wrongText: function () {
              return 'Not yet. This happened in the past, so the verb must change. Try the other word.';
            }
          };
        }

        // Type B: regular or irregular?
        return {
          say: v.base + ', ' + v.past + '. Regular or irregular?',
          top: [
            el('div', { class: 'center-col' },
              App.picture(v.picture, 'learn-pic'),
              el('p', { class: 'g-quiz-sentence sayable', 'data-say': v.base + ', ' + v.past },
                v.base, el('span', { class: 'arrow', text: ' → ' }), pastWithEnding(v)),
              el('p', { class: 'q-text sayable', text: 'Regular or irregular?' })
            )
          ],
          options: [
            { picture: '+ed', label: 'Regular', say: 'Regular. It adds e d.', right: isRegular },
            { picture: '🔀', label: 'Irregular', say: 'Irregular. It changes.', right: !isRegular }
          ],
          rightText: why,
          onRight: function (first) { Progress.recordWord(v.base, first); },
          wrongText: function () {
            return isRegular
              ? 'Not yet. Look at the end of ' + v.past + '. Does it end in -ed?'
              : 'Not yet. ' + v.past + ' does not end in -ed. It changes.';
          }
        };
      }, 'grammar', function () { practice(); }, lessons);
    }

    function lessons() {
      App.setInstruction(INSTRUCTIONS.verbs);
      pager(box, pages, practice);
    }
    lessons();
  }
})();
