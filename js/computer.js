/* =============================================================
   FILE: /js/computer.js
   MODULE: Computer Skills
   Seven short, guided lessons. Each one praises every step and
   never hurries her:
     Click, Double-click, Scroll, Drag, Type in a box,
     Special keys (Backspace, Enter, Shift), and Common icons.
   To change a lesson's words, edit the text in quotes below.
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  const LESSONS = [
    { id: 'click',  icon: '👆🏾', label: 'Click',           intro: 'Move the mouse until the arrow is on the cup. Then press the left button one time.' },
    { id: 'double', icon: '📂', label: 'Double-click',    intro: 'Point at the folder. Press the left button two times, quickly.' },
    { id: 'scroll', icon: '🖱️', label: 'Scroll',          intro: 'Roll the wheel on the mouse toward you to go down. On a touchpad, slide two fingers.' },
    { id: 'drag',   icon: '✋🏾', label: 'Drag',            intro: 'Press and hold the button on a cup. Move it onto the tray. Then let go.' },
    { id: 'type',   icon: '✏️', label: 'Type in a box',   intro: 'First click inside the white box. Then type.' },
    { id: 'keys',   icon: '⌨️', label: 'Special keys',    intro: 'Practice three important keys: Backspace, Enter, and Shift.' },
    { id: 'icons',  icon: '🔍', label: 'Common icons',    intro: 'Tap each picture to hear what it means.' }
  ];

  // Little helper: say something kind at most every few seconds.
  function gentle() {
    let last = 0;
    return function (text) {
      if (Date.now() - last < 4000) return;
      last = Date.now();
      App.say(text);
    };
  }

  App.registerScreen('computer', {
    title: 'Computer',
    spoken: 'Computer Skills',
    instruction: 'Choose a lesson.',
    render: function (main) {
      const stage = el('div', { class: 'stage' });
      main.append(stage);
      let lessonStops = [];
      let lessonRun = 0;     // changes when a lesson ends, so old timers do nothing
      function stopLesson() {
        lessonStops.forEach(function (fn) { fn(); });
        lessonStops = [];
        lessonRun += 1;
      }
      App.onLeave(stopLesson);

      function showList() {
        stopLesson();
        App.stopTalking();
        App.setInstruction('Choose a lesson.');
        const grid = el('div', { class: 'lesson-grid' });
        LESSONS.forEach(function (L) {
          const done = Progress.timesDone('computer:' + L.id) > 0;
          grid.append(el('button', {
            type: 'button', class: 'lesson-card', 'data-say': L.label,
            onclick: function () { openLesson(L); }
          },
            el('span', { class: 'lesson-icon', 'aria-hidden': 'true', text: L.icon }),
            el('span', { class: 'lesson-name', text: L.label },
              done ? el('span', { class: 'lesson-done', text: '✓ practiced' }) : null)
          ));
        });
        stage.replaceChildren(grid);
      }

      function openLesson(L) {
        stopLesson();
        App.setInstruction(L.intro, true);
        const area = el('div', { class: 'stage' });
        stage.replaceChildren(
          el('div', { class: 'btn-row' },
            App.button({ icon: '◀️', label: 'All lessons', kind: 'quiet', onClick: showList })
          ),
          el('section', { class: 'card tibeb-top stage' },
            el('h2', { class: 'card-title sayable', text: L.label }),
            area
          )
        );
        const myRun = lessonRun;
        const pageToken = App.here();
        const finish = function () {
          if (myRun !== lessonRun || !App.stillHere(pageToken)) return;
          stopLesson();
          App.finishActivity('computer:' + L.id, function () { lessonDone(L); });
        };
        RUNNERS[L.id](area, finish, lessonStops);
      }

      function lessonDone(L) {
        App.setInstruction('Lesson finished. Choose what to do next.', true);
        const index = LESSONS.indexOf(L);
        const next = LESSONS[(index + 1) % LESSONS.length];
        stage.replaceChildren(el('section', { class: 'card tibeb-top center-col' },
          el('p', { class: 'learn-pic', 'aria-hidden': 'true', text: L.icon }),
          el('h2', { class: 'card-title sayable', text: 'You finished: ' + L.label }),
          el('div', { class: 'btn-row center' },
            App.button({ icon: '▶️', label: 'Next: ' + next.label, kind: 'primary', onClick: function () { openLesson(next); } }),
            App.button({ icon: '🔁', label: 'Do it again', onClick: function () { openLesson(L); } }),
            App.button({ icon: '📋', label: 'All lessons', onClick: showList })
          )
        ));
      }

      showList();
    }
  });

  /* ---------- The lessons ---------- */

  const RUNNERS = {

    /* 1. Click the cup five times. It moves each time. */
    click: function (area, finish, stops) {
      const total = 5;
      let n = 0;
      const hint = gentle();
      const progress = App.dots(total);
      const field = el('div', { class: 'playfield' });
      const target = el('button', { type: 'button', class: 'pf-target', 'data-say': 'the cup', html: Art.cup(1) });
      field.append(target);
      area.append(progress.node, field);

      function move() {
        target.style.left = (4 + Math.random() * 66) + '%';
        target.style.top = (6 + Math.random() * 52) + '%';
      }
      target.addEventListener('click', function (e) {
        e.stopPropagation();
        target.blur();
        n += 1;
        progress.set(n);
        if (n >= total) { finish(); return; }
        App.say(App.praise() + ' Find the cup again.');
        move();
      });
      field.addEventListener('click', function () { hint('Almost. Move the arrow onto the cup, then click.'); });
      move();
    },

    /* 2. Double-click the folder to open it, three times. */
    double: function (area, finish, stops) {
      const total = 3;
      let n = 0;
      let timer = null;
      const hint = gentle();
      const progress = App.dots(total);
      const field = el('div', { class: 'playfield' });
      const folder = el('button', { type: 'button', class: 'pf-target', 'data-say': 'the folder', text: '📁' });
      field.append(folder);
      area.append(progress.node, field);

      function move() {
        folder.textContent = '📁';
        folder.style.left = (6 + Math.random() * 62) + '%';
        folder.style.top = (8 + Math.random() * 48) + '%';
      }
      folder.addEventListener('click', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { hint('That was one click. Now click two times, quickly.'); }, 600);
      });
      folder.addEventListener('dblclick', function () {
        clearTimeout(timer);
        folder.blur();
        folder.textContent = '📂';
        n += 1;
        progress.set(n);
        App.say('It opened! ' + App.praise());
        if (n >= total) { setTimeout(finish, 1200); return; }
        setTimeout(move, 1400);
      });
      stops.push(function () { clearTimeout(timer); });
      move();
    },

    /* 3. Scroll down to find the flower, then back up to the cup. */
    scroll: function (area, finish, stops) {
      const box = el('div', { class: 'scrollbox', tabindex: '0' });
      const top = el('div', { class: 'scroll-mark', html: Art.cup(1) });
      const flower = el('div', { class: 'scroll-mark', html: Art.flower() });
      const inner = el('div', { class: 'scroll-inner' },
        top,
        el('p', { class: 'scroll-label', text: '⬇️ Roll the wheel toward you.' }),
        el('p', { class: 'scroll-mark', 'aria-hidden': 'true', text: '🌿' }),
        el('p', { class: 'scroll-label', text: '⬇️ Keep going down.' }),
        el('p', { class: 'scroll-mark', 'aria-hidden': 'true', text: '🌿' }),
        flower,
        el('p', { class: 'scroll-label', text: 'You found the flower!' })
      );
      box.append(inner);
      const status = el('p', { class: 'sayable', text: 'Step 1: Scroll down to find the flower.' });
      area.append(status, box);

      let step = 1;
      const watch = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          if (step === 1 && en.target === flower) {
            step = 2;
            status.textContent = 'Step 2: Now scroll up to find the cup.';
            App.say('You found the flower! Now roll the wheel away from you, to go back up to the cup.');
          } else if (step === 2 && en.target === top) {
            step = 3;
            watch.disconnect();
            App.say('You are back at the top. ' + App.praise());
            setTimeout(finish, 1500);
          }
        });
      }, { root: box, threshold: 0.9 });
      watch.observe(flower);
      watch.observe(top);
      stops.push(function () { watch.disconnect(); });
    },

    /* 4. Drag three cups onto the tray. */
    drag: function (area, finish, stops) {
      const total = 3;
      let placed = 0;
      const hint = gentle();
      const progress = App.dots(total);
      const field = el('div', { class: 'playfield' });
      const tray = el('div', { class: 'pf-tray', 'data-say': 'the tray' });
      field.append(tray);
      area.append(progress.node, field);

      for (let i = 0; i < total; i++) {
        const cup = el('div', { class: 'pf-cup', 'data-say': 'a cup', html: Art.cup(1) });
        cup.style.left = '4%';
        cup.style.top = (6 + i * 31) + '%';
        field.append(cup);
        makeDraggable(cup);
      }

      function makeDraggable(cup) {
        let start = null;
        cup.addEventListener('pointerdown', function (e) {
          if (cup.classList.contains('is-placed')) return;
          e.preventDefault();
          cup.setPointerCapture(e.pointerId);
          start = { x: e.clientX, y: e.clientY, left: cup.offsetLeft, top: cup.offsetTop };
          cup.classList.add('is-dragging');
        });
        cup.addEventListener('pointermove', function (e) {
          if (!start) return;
          cup.style.left = (start.left + e.clientX - start.x) + 'px';
          cup.style.top = (start.top + e.clientY - start.y) + 'px';
        });
        cup.addEventListener('pointerup', function (e) {
          if (!start) return;
          const moved = Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y);
          start = null;
          cup.classList.remove('is-dragging');
          const c = cup.getBoundingClientRect();
          const t = tray.getBoundingClientRect();
          const cx = c.left + c.width / 2;
          const cy = c.top + c.height / 2;
          if (cx > t.left && cx < t.right && cy > t.top && cy < t.bottom) {
            cup.classList.add('is-placed');
            // line the cups up neatly on the tray
            const f = field.getBoundingClientRect();
            const slotLeft = (t.left - f.left) + 12 + placed * ((t.width - 24) / total);
            cup.style.left = slotLeft + 'px';
            cup.style.top = (t.top - f.top + 22) + 'px';
            placed += 1;
            progress.set(placed);
            if (placed >= total) { App.say('All the cups are on the tray. ' + App.praise()); setTimeout(finish, 1300); }
            else App.say(App.praise());
          } else if (moved < 10) {
            hint('Hold the button down while you move the mouse.');
          } else {
            hint('Almost. Bring the cup all the way onto the tray.');
          }
        });
      }
    },

    /* 5. Click into a box, then type two words. */
    type: function (area, finish, stops) {
      const name = Store.getName();
      const targets = name ? ['tea', name.toLowerCase()] : ['tea', 'coffee'];
      let step = 0;
      const status = el('p', { class: 'q-text sayable', text: 'Click inside the white box.' });
      const input = el('input', { id: 'cs-type', class: 'big-input is-waiting', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Typing box' });
      area.append(status, input);

      input.addEventListener('focus', function () {
        if (step !== 0) return;
        step = 1;
        input.classList.remove('is-waiting');
        ask();
      });
      function ask() {
        const word = targets[step - 1];
        const text = 'Good. Now type: ' + word;
        status.textContent = text;
        status.setAttribute('data-say', text);
        App.say(text);
      }
      input.addEventListener('input', function () {
        if (step === 0) return;
        const want = targets[step - 1];
        if (input.value.trim().toLowerCase() === want) {
          App.say(App.praise());
          if (step >= targets.length) { setTimeout(finish, 1200); return; }
          step += 1;
          setTimeout(function () { input.value = ''; input.focus(); ask(); }, 900);
        }
      });
    },

    /* 6. Backspace, Enter, and Shift. */
    keys: function (area, finish, stops) {
      let step = 1;
      const status = el('p', { class: 'q-text sayable' });
      const keycap = el('p', { class: 'btn-row' });
      const input = el('input', { id: 'cs-keys', class: 'big-input', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Typing box' });
      const chat = el('div', { class: 'stage' });
      area.append(keycap, status, input, chat);

      function setStep(n) {
        step = n;
        let text = '';
        if (n === 1) {
          keycap.replaceChildren(el('span', { class: 'keycap', text: '⌫ Backspace' }));
          text = 'The word milk has an extra k. Press Backspace one time to erase it.';
          input.value = 'milkk';
        } else if (n === 2) {
          keycap.replaceChildren(el('span', { class: 'keycap', text: '⏎ Enter' }));
          text = 'Press Enter to send the message.';
          input.value = 'Hello!';
        } else {
          keycap.replaceChildren(el('span', { class: 'keycap', text: '⇧ Shift' }), el('span', { class: 'keycap', text: 'A' }));
          text = 'Hold down Shift. Then press A. You will see a big A.';
          input.value = '';
        }
        status.textContent = text;
        status.setAttribute('data-say', text);
        App.say(text);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }

      input.addEventListener('input', function () {
        if (step === 1) {
          if (input.value === 'milk') { App.say('Yes! Now it says milk. ' + App.praise()); setTimeout(function () { setStep(2); }, 1600); }
          else if (input.value.length < 4) App.say('That erased a little too much. Type it back: milk.');
        }
        if (step === 3) {
          if (input.value.indexOf('A') !== -1) { App.say('A big A! ' + App.praise()); setTimeout(finish, 1400); }
          else if (input.value.indexOf('a') !== -1) { App.say('That is a small a. Hold Shift down first, then press A.'); input.value = ''; }
        }
      });
      input.addEventListener('keydown', function (e) {
        if (step === 2 && e.key === 'Enter') {
          e.preventDefault();
          chat.append(el('p', { class: 'sent-bubble', text: input.value || 'Hello!' }));
          input.value = '';
          App.say('Sent! ' + App.praise());
          setTimeout(function () { setStep(3); }, 1600);
        }
      });

      setTimeout(function () { setStep(1); }, 50);
    },

    /* 7. Learn common icons, then a short quiz. */
    icons: function (area, finish, stops) {
      const ICONS = [
        { glyph: '🔍', name: 'Search', meaning: 'Search. Use it to find something.' },
        { glyph: '✖️', name: 'Close', meaning: 'Close. It closes a window.' },
        { glyph: '⬅️', name: 'Back', meaning: 'Back. It goes to the page before.' },
        { glyph: '🏠', name: 'Home', meaning: 'Home. It goes to the first page.' },
        { glyph: '☰', name: 'Menu', meaning: 'Menu. Three lines open a list of choices.' },
        { glyph: '⚙️', name: 'Settings', meaning: 'Settings. Change how things work.' },
        { glyph: '🗑️', name: 'Delete', meaning: 'Delete. It throws something away.' },
        { glyph: '🖨️', name: 'Print', meaning: 'Print. It puts the page on paper.' },
        { glyph: '🔊', name: 'Sound', meaning: 'Sound. Turn the sound up or down.' },
        { glyph: '✉️', name: 'Email', meaning: 'Email. Read and send messages.' }
      ];

      function learn() {
        const grid = el('div', { class: 'icon-grid' });
        ICONS.forEach(function (ic) {
          const b = el('button', { type: 'button', class: 'icon-card', 'data-say': ic.name },
            el('span', { class: 'glyph', 'aria-hidden': 'true', text: ic.glyph }), ic.name);
          b.addEventListener('click', function () { b.blur(); App.say(ic.meaning, { node: b }); });
          grid.append(b);
        });
        area.replaceChildren(grid, el('div', { class: 'btn-row' },
          App.button({ icon: '🧩', label: 'Try the quiz', kind: 'primary', onClick: quiz })
        ));
      }

      function quiz() {
        const asks = App.shuffle(ICONS).slice(0, 5);
        let i = 0;
        const progress = App.dots(asks.length);
        function show() {
          const ic = asks[i];
          let done = false;
          const fb = el('div', { 'aria-live': 'polite' });
          const actions = el('div', { class: 'btn-row' });
          const options = App.shuffle([ic].concat(App.shuffle(ICONS.filter(function (x) { return x !== ic; })).slice(0, 2)));
          const grid = el('div', { class: 'choices' });
          options.forEach(function (o) {
            grid.append(App.choice({
              picture: o.glyph, say: '',
              onClick: function (btn) {
                if (done) return;
                if (o === ic) {
                  done = true;
                  btn.classList.add('is-right');
                  progress.set(i + 1);
                  App.feedback(fb, 'ok', 'Yes! ' + ic.meaning);
                  const last = i === asks.length - 1;
                  actions.replaceChildren(App.button({
                    icon: last ? '✓' : '▶️', label: last ? 'Finish' : 'Next', kind: 'primary',
                    onClick: function () { if (last) { finish(); return; } i += 1; show(); App.say('Which one means ' + asks[i].name + '?'); }
                  }));
                } else {
                  btn.classList.add('is-wrong');
                  App.feedback(fb, 'try', 'Not yet. That one means ' + o.name + '.');
                }
              }
            }));
          });
          area.replaceChildren(progress.node, el('h2', { class: 'q-text sayable', text: 'Which one means ' + ic.name + '?' }), grid, fb, actions);
        }
        show();
        App.say('Which one means ' + asks[0].name + '?');
      }

      learn();
    }
  };
})();
