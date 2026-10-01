/* =============================================================
   FILE: /js/questions.js
   MODULE: Questions (used after each story)
   Shows one question at a time with big picture answers.
   - Right answer: green, a kind word, and the reason.
   - Not yet: a soft mark and "look again". After two tries,
     the right answer gently glows. She can try as long as she likes.
   Questions are written in data/stories.json.

   HOW TO USE:  Questions.run(box, story.questions, whenFinished);
   ============================================================= */
const Questions = (function () {
  'use strict';
  const el = App.el;

  function run(box, list, onDone) {
    let i = 0;
    const progress = App.dots(list.length);

    function show() {
      const q = list[i];
      let misses = 0;
      let done = false;
      const fb = el('div', { 'aria-live': 'polite' });
      const actions = el('div', { class: 'btn-row' });

      // Yes/no questions get two big buttons.
      const options = q.type === 'yesno'
        ? [{ text: 'Yes', picture: '👍🏾', value: true }, { text: 'No', picture: '👎🏾', value: false }]
        : q.options.map(function (o, n) { return { text: o.text, picture: o.picture, value: n }; });
      const rightText = q.type === 'yesno' ? (q.answer ? 'Yes' : 'No') : q.options[q.answer].text;

      const grid = el('div', { class: 'choices' + (options.length === 2 ? ' two' : '') });
      const buttons = [];
      options.forEach(function (o) {
        const b = App.choice({
          picture: o.picture, label: o.text,
          onClick: function (btn) {
            if (done) return;
            if (o.value === q.answer) {
              done = true;
              btn.classList.remove('is-hint');
              btn.classList.add('is-right');
              progress.set(i + 1);
              const why = q.explain ? ' ' + q.explain : '';
              App.feedback(fb, 'ok', App.praise() + why);
              const last = i === list.length - 1;
              actions.replaceChildren(App.button({
                icon: last ? '✓' : '▶️',
                label: last ? 'Finish' : 'Next question',
                kind: 'primary',
                onClick: function () {
                  if (last) { onDone(); return; }
                  i += 1;
                  show();
                  App.say(list[i].question);
                }
              }));
            } else {
              misses += 1;
              btn.classList.add('is-wrong');
              if (misses >= 2) {
                buttons.forEach(function (x) { if (x.value === q.answer) x.btn.classList.add('is-hint'); });
                App.feedback(fb, 'try', 'Look at the glowing picture. The answer is "' + rightText + '".');
              } else {
                App.feedback(fb, 'try', 'Not yet. Look again and try another one.');
              }
            }
          }
        });
        buttons.push({ btn: b, value: o.value });
        grid.append(b);
      });

      box.replaceChildren(
        progress.node,
        el('h2', { class: 'q-text sayable', text: q.question }),
        el('div', { class: 'btn-row' },
          App.button({ icon: '🔊', label: 'Hear the question', onClick: function () { App.say(q.question); } })
        ),
        grid, fb, actions
      );
    }

    show();
  }

  return { run: run };
})();
