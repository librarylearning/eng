/* =============================================================
   FILE: /js/app.js
   WHAT IT DOES: The "frame" of the website.
   - Draws the Home page (coffee scene + six practice panels)
   - Moves between pages
   - Makes any instruction or word speak when it is tapped
   - Reads a button out loud when the mouse rests on it
   - Shows the coffee cup celebration after a practice
   - Gives the module files shared tools (buttons, picture
     choices, gentle feedback, loading the data files)

   HOW A MODULE PLUGS IN:
     App.registerScreen('sounds', {
       title: 'Sounds',                       // shown at the top
       spoken: 'Sound Explorer',              // said out loud
       instruction: 'Tap a letter. Listen.',  // the line under the bar
       render: function (main) { ... }        // draw the page
     });
   ============================================================= */
const App = (function () {
  'use strict';

  const SITE_NAME = 'Coffee & Letters';

  /* ---------- 1. The panels on the Home page ----------
     Move lines up or down to change the order. The last panel
     is drawn wide, so it fills the end of the row.
     tint: green, gold, wood, red, sky, coffee, or paper. */
  const MODULES = [
    { id: 'sounds',   label: 'Sounds',   spoken: 'Sound Explorer',  sub: 'Letters and their sounds', icon: '🗣️', tint: 'green' },
    { id: 'words',    label: 'Words',    spoken: 'Word Builder',    sub: 'Pictures and new words',  icon: '🧺', tint: 'gold' },
    { id: 'grammar',  label: 'Grammar',  spoken: 'Grammar',         sub: 'How words work together', icon: '🧱', tint: 'wood' },
    { id: 'stories',  label: 'Stories',  spoken: 'Story Corner',    sub: 'Read, listen, answer',    icon: '📖', tint: 'red' },
    { id: 'typing',   label: 'Typing',   spoken: 'Typing Practice', sub: 'Find the keys',           icon: '⌨️', tint: 'sky' },
    { id: 'computer', label: 'Computer', spoken: 'Computer Skills', sub: 'Mouse and keyboard',      icon: '🖱️', tint: 'coffee' },
    { id: 'review',   label: 'Review',   spoken: 'Review my words', sub: 'Words to remember',       icon: '🔁', tint: 'paper' }
  ];

  // Kind words. Add your own.
  const PRAISE = ['Well done.', 'Beautiful work.', 'Very good.', 'You did it.', 'Wonderful.', 'Excellent.'];

  let main, titleEl, homeBtn;
  let userActed = false;       // browsers only allow sound after a first click
  let renderToken = 0;         // changes every time a new page is drawn
  let leaveFns = [];           // things to tidy up when leaving a page

  /* ---------- 2. Building blocks ---------- */

  // el('p', { class: 'x', text: 'Hi' }, child1, child2) makes an element.
  function el(tag, props) {
    const node = document.createElement(tag);
    const kids = Array.prototype.slice.call(arguments, 2);
    Object.keys(props || {}).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      node.append(kid.nodeType ? kid : document.createTextNode(kid));
    });
    return node;
  }

  // A big button with a picture and a word.
  // kind: 'primary' (green), 'danger' (red), 'quiet', or nothing.
  function button(o) {
    return el('button', {
      type: 'button',
      id: o.id,
      class: 'btn' + (o.kind ? ' btn-' + o.kind : '') + (o.extra ? ' ' + o.extra : ''),
      'data-say': o.say || o.label,
      disabled: o.disabled,
      onclick: function (e) { if (o.onClick) o.onClick(e); }
    },
      el('span', { class: 'icon', 'aria-hidden': 'true', text: o.icon || '' }),
      el('span', { class: 'label', text: o.label })
    );
  }

  // A picture: an emoji, or a file from /images/ (e.g. "images/bus.jpg").
  function picture(pic, cls) {
    const isFile = /\.(png|jpe?g|gif|svg|webp)$/i.test(pic || '');
    return el('span', { class: cls || 'pic', 'aria-hidden': 'true' },
      isFile ? el('img', { src: pic, alt: '' }) : (pic || ''));
  }

  // A big picture button for answering. onClick(button) is called.
  function choice(o) {
    const b = el('button', { type: 'button', class: 'choice', 'data-say': o.say || o.label || '' },
      picture(o.picture, 'choice-pic'),
      o.label ? el('span', { class: 'choice-label', text: o.label }) : null
    );
    b.addEventListener('click', function () { b.blur(); if (o.onClick) o.onClick(b); });
    return b;
  }

  // A row of mode buttons inside a module. onPick(id) is called.
  function modeTabs(modes, current, onPick) {
    const nav = el('nav', { class: 'tabs', 'aria-label': 'Choose a practice' });
    modes.forEach(function (m) {
      const b = button({ icon: m.icon, label: m.label, onClick: function () { onPick(m.id); } });
      b.setAttribute('aria-pressed', String(m.id === current));
      nav.append(b);
    });
    return nav;
  }

  // Gentle feedback. kind 'ok' (green) or 'try' (warm gold).
  function feedback(box, kind, text, speak) {
    box.replaceChildren(el('p', { class: 'feedback ' + (kind === 'ok' ? 'is-ok' : 'is-try') },
      el('span', { class: 'icon', 'aria-hidden': 'true', text: kind === 'ok' ? '✓' : '↻' }),
      el('span', { text: text })
    ));
    if (speak !== false) say(typeof speak === 'string' ? speak : text);
  }

  // Little circles showing how far she is through a round.
  function dots(total) {
    const node = el('div', { class: 'dots', 'aria-hidden': 'true' });
    for (let i = 0; i < total; i++) node.append(el('span', { class: 'dot' }));
    return {
      node: node,
      set: function (n) {
        Array.prototype.forEach.call(node.children, function (d, i) { d.classList.toggle('is-done', i < n); });
      }
    };
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function praise() {
    return pick(PRAISE);
  }

  // The words to say for an element (emoji removed).
  function textOf(node) {
    const t = node.getAttribute('data-say') || node.textContent || '';
    return t.replace(/[\p{Extended_Pictographic}️‍\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/\s+/g, ' ').trim();
  }

  // "coffee," -> "coffee"
  function cleanWord(w) {
    // quote marks and commas at the edges go; don't keeps its apostrophe
    return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }

  /* ---------- 3. Loading the data files (words, stories, sounds) ---------- */

  const dataCache = {};
  function loadData(name) {
    if (!dataCache[name]) {
      dataCache[name] = fetch('data/' + name + '.json').then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.json();
      }).catch(function (err) {
        delete dataCache[name];
        throw err;
      });
    }
    return dataCache[name];
  }

  function dataError(box) {
    box.replaceChildren(el('p', { class: 'notice', text: 'The practice list could not load. Please check the internet and refresh the page. (Teacher: check the files in the data folder.)' }));
  }

  /* ---------- 4. Speaking ---------- */

  let sayingNode = null;
  let chainId = 0;   // stops a list of sentences when something else is said

  function clearSaying() {
    if (sayingNode) sayingNode.classList.remove('is-saying');
    sayingNode = null;
  }

  function speakOne(text, opts) {
    clearSaying();
    if (opts.node) {
      sayingNode = opts.node;
      sayingNode.classList.add('is-saying');
    }
    Voice.speak(text, {
      audioKey: opts.audioKey,
      onWord: opts.onWord,
      onEnd: function () {
        clearSaying();
        if (opts.onEnd) opts.onEnd();
      }
    });
  }

  // Say something. opts: node (glows), audioKey, onWord, onEnd.
  function say(text, opts) {
    chainId += 1;
    speakOne(text, opts || {});
  }

  // Say several things in a row, with a short pause between.
  // Items are text, or { text, audioKey }.
  function sayList(items, onEnd) {
    chainId += 1;
    const my = chainId;
    let i = 0;
    (function next() {
      if (my !== chainId) return;
      if (i >= items.length) { if (onEnd) onEnd(); return; }
      const it = typeof items[i] === 'string' ? { text: items[i] } : items[i];
      i += 1;
      speakOne(it.text, {
        audioKey: it.audioKey,
        node: it.node,
        onEnd: function () { setTimeout(next, it.pause || 350); }
      });
    })();
  }

  function stopTalking() {
    chainId += 1;
    Voice.stop();
    clearSaying();
  }

  // The instruction line at the top of each page.
  function instructionBar(text) {
    const p = el('p', { class: 'sayable', id: 'instruction', tabindex: '0', 'data-say': text, text: text });
    const listen = button({
      icon: '🔊', label: 'Listen',
      onClick: function () { say(p.getAttribute('data-say'), { node: p }); }
    });
    return el('div', { class: 'instruct' }, listen, p);
  }

  // Change the instruction (and say it, if speakNow is true).
  function setInstruction(text, speakNow) {
    const p = document.getElementById('instruction');
    if (!p) return;
    p.textContent = text;
    p.setAttribute('data-say', text);
    if (speakNow) say(text, { node: p });
  }

  // A sentence made of words she can tap one at a time.
  function readingText(text) {
    const node = el('p', { class: 'reading' });
    const spans = [];
    const re = /\S+/g;
    let m;
    let last = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) node.append(text.slice(last, m.index));
      const span = el('span', { class: 'word', text: m[0], 'data-word': cleanWord(m[0]) });
      span.dataset.start = m.index;
      spans.push(span);
      node.append(span);
      last = m.index + m[0].length;
    }
    return { node: node, spans: spans, text: text };
  }

  function highlightAt(spans, charIndex) {
    let current = null;
    for (let i = 0; i < spans.length; i++) {
      if (Number(spans[i].dataset.start) <= charIndex) current = spans[i];
      else break;
    }
    spans.forEach(function (s) { s.classList.toggle('is-now', s === current); });
  }

  // Read one sentence aloud, lighting up each word.
  function readAloud(reading, onDone) {
    const unlight = function () { reading.spans.forEach(function (s) { s.classList.remove('is-now'); }); };
    unlight();
    say(reading.text, {
      onWord: function (i) { highlightAt(reading.spans, i); },
      onEnd: function () { unlight(); if (onDone) onDone(); }
    });
  }

  // Read several sentences, one after another.
  function readAll(readings, onDone) {
    chainId += 1;
    const my = chainId;
    let i = 0;
    (function next() {
      if (my !== chainId) return;
      if (i >= readings.length) { if (onDone) onDone(); return; }
      const r = readings[i];
      i += 1;
      const unlight = function () { r.spans.forEach(function (s) { s.classList.remove('is-now'); }); };
      speakOne(r.text, {
        onWord: function (c) { highlightAt(r.spans, c); },
        onEnd: function () { unlight(); setTimeout(next, 400); }
      });
    })();
  }

  /* ---------- 5. Pages ---------- */

  const screens = {};

  function registerScreen(id, def) {
    screens[id] = def;
  }

  function currentId() {
    return (location.hash || '').replace('#', '') || 'home';
  }

  function go(id) {
    if (currentId() === id) render(true);
    else location.hash = id;
  }

  // Run something when she leaves this page (e.g. stop listening for keys).
  function onLeave(fn) {
    leaveFns.push(fn);
  }

  // Listen for an event until she leaves the page. Returns a "stop" function.
  function listen(target, type, fn) {
    target.addEventListener(type, fn);
    const stop = function () { target.removeEventListener(type, fn); };
    onLeave(stop);
    return stop;
  }

  // For slow loading: is she still on the same page?
  function here() { return renderToken; }
  function stillHere(token) { return token === renderToken; }

  function render(announce) {
    stopTalking();
    leaveFns.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    leaveFns = [];
    renderToken += 1;

    const id = currentId();
    const def = screens[id] || screens.home;
    const title = typeof def.title === 'function' ? def.title() : def.title;

    titleEl.textContent = title;
    titleEl.setAttribute('data-say', title);
    document.title = id === 'home' ? SITE_NAME : title + ' · ' + SITE_NAME;
    homeBtn.classList.toggle('is-current', id === 'home');

    main.replaceChildren();
    if (!Voice.supported) {
      main.append(el('p', { class: 'notice', text: 'This browser cannot speak. Please open this website in Google Chrome or Microsoft Edge.' }));
    }
    const instruction = typeof def.instruction === 'function' ? def.instruction() : def.instruction;
    if (instruction) main.append(instructionBar(instruction));
    def.render(main);
    window.scrollTo(0, 0);

    if (announce && userActed && Store.getSetting('autoRead')) {
      say((def.spoken || title) + '. ' + (instruction || ''));
    }
  }

  /* ----- Home ----- */

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function sceneWords(cups, flowers) {
    const c = cups === 0 ? 'The cups are waiting for you.'
      : cups === 1 ? 'One cup is full.'
      : cups === 2 ? 'Two cups are full.'
      : 'All three cups are full.';
    const f = flowers === 0 ? 'Your first flower is coming.'
      : flowers === 1 ? 'You have one flower.'
      : 'You have ' + flowers + ' flowers.';
    return c + ' ' + f;
  }

  function renderHome(m) {
    const name = Store.getName();
    const hello = greeting() + (name ? ', ' + name : '') + '.';
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const cups = Progress.cupsFilled();
    const flowers = Progress.flowers();

    const hero = el('section', { class: 'hero' },
      el('div', { class: 'hero-text' },
        el('p', { class: 'hero-date sayable', text: date }),
        el('h2', { class: 'hero-greet sayable', text: hello }),
        el('p', { class: 'hero-note sayable', text: 'Each practice pours a cup of coffee. Three cups grow a flower.' })
      ),
      el('div', {
        class: 'hero-art sayable', tabindex: '0',
        'data-say': sceneWords(cups, flowers),
        html: Art.trayScene(cups, flowers)
      })
    );

    const tiles = el('div', { class: 'tiles' });
    MODULES.forEach(function (mod) {
      tiles.append(el('button', {
        type: 'button', class: 'tile tint-' + mod.tint, 'data-say': mod.spoken,
        onclick: function () { go(mod.id); }
      },
        el('span', { class: 'mark', html: Art.medallion() }, el('span', { class: 'mark-icon', 'aria-hidden': 'true', text: mod.icon })),
        el('span', { class: 'tile-words' },
          el('span', { class: 'tile-label', text: mod.label }),
          el('span', { class: 'tile-sub', text: mod.sub })
        )
      ));
    });

    const footer = el('nav', { class: 'home-footer', 'aria-label': 'More' },
      button({ icon: '⚙️', label: 'Settings', onClick: function () { go('settings'); } }),
      button({ icon: '📋', label: 'For Teacher', onClick: function () { go('teacher'); } })
    );

    m.append(hero, tiles, footer);
  }

  /* ----- Settings ----- */

  function renderSettings(m) {
    const nameInput = el('input', {
      id: 'set-name', class: 'field', type: 'text', maxlength: '30',
      autocomplete: 'off', value: Store.getName(), 'aria-label': 'First name'
    });
    const nameCard = el('section', { class: 'card setting' },
      el('h2', { class: 'sayable', text: 'First name' }),
      el('p', { class: 'help sayable', text: 'Only the first name is saved, and only on this computer.' }),
      el('div', { class: 'field-row' }, nameInput,
        button({
          icon: '💾', label: 'Save name', kind: 'primary',
          onClick: function () {
            Store.setName(nameInput.value);
            nameInput.value = Store.getName();
            say(Store.getName() ? 'Saved. Hello, ' + Store.getName() + '.' : 'Saved.');
          }
        })
      )
    );

    const select = el('select', { id: 'set-voice', class: 'field', 'aria-label': 'Voice' });
    function fillVoices() {
      const list = Voice.englishVoices();
      select.replaceChildren();
      if (!list.length) {
        select.append(el('option', { value: '', text: 'Computer default voice' }));
        return;
      }
      list.forEach(function (v) {
        const opt = el('option', { value: v.name, text: (v.recommended ? '★ ' : '') + v.name });
        if (v.name === Voice.currentVoiceName()) opt.selected = true;
        select.append(opt);
      });
    }
    fillVoices();
    Voice.setVoicesListener(fillVoices);
    onLeave(function () { Voice.setVoicesListener(null); });
    select.addEventListener('change', function () {
      Voice.setVoice(select.value);
      Voice.speak('Hello. This is my voice.', { noRecording: true });
    });
    const voiceCard = el('section', { class: 'card setting' },
      el('h2', { class: 'sayable', text: 'Voice' }),
      el('p', { class: 'help sayable', text: 'Voices with a star are female voices. The most natural voices are in Microsoft Edge. Look for one that says Natural.' }),
      el('div', { class: 'field-row' }, select,
        button({ icon: '▶️', label: 'Test voice', onClick: function () { Voice.speak('Good morning. Would you like some coffee?', { noRecording: true }); } })
      )
    );

    const rate = el('input', {
      id: 'set-rate', class: 'range', type: 'range', min: '0.5', max: '1', step: '0.05',
      value: String(Store.getSetting('rate')), 'aria-label': 'Speaking speed'
    });
    rate.addEventListener('change', function () {
      Store.setSetting('rate', parseFloat(rate.value));
      Voice.speak('This is my speaking speed.', { noRecording: true });
    });
    const speedCard = el('section', { class: 'card setting' },
      el('h2', { class: 'sayable', text: 'Speed' }),
      el('div', { class: 'range-wrap' },
        el('span', { class: 'range-end sayable', 'data-say': 'Slow', text: '🐢 Slow' }),
        rate,
        el('span', { class: 'range-end sayable', 'data-say': 'Normal', text: 'Normal 🚶🏾‍♀️' })
      )
    );

    function toggleRow(label, key) {
      const btn = el('button', { type: 'button', class: 'btn btn-toggle' });
      function paint() {
        const on = !!Store.getSetting(key);
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('data-say', on ? 'On' : 'Off');
        btn.replaceChildren(
          el('span', { class: 'icon', 'aria-hidden': 'true', text: on ? '✓' : '○' }),
          el('span', { class: 'label', text: on ? 'On' : 'Off' })
        );
      }
      btn.addEventListener('click', function () {
        Store.setSetting(key, !Store.getSetting(key));
        paint();
        say(Store.getSetting(key) ? 'On' : 'Off');
      });
      paint();
      return el('div', { class: 'toggle-row' }, el('p', { class: 'sayable', text: label }), btn);
    }
    const choicesCard = el('section', { class: 'card setting' },
      el('h2', { class: 'sayable', text: 'Reading out loud' }),
      toggleRow('Read each page out loud when it opens.', 'autoRead'),
      toggleRow('Read a button when the mouse rests on it.', 'hoverRead')
    );

    m.append(nameCard, voiceCard, speedCard, choicesCard,
      el('div', { class: 'btn-row center' },
        button({ icon: '🏠', label: 'Done', kind: 'primary', onClick: function () { go('home'); } })
      )
    );
  }

  /* ---------- 6. Celebration ---------- */

  // Call when she finishes a practice. onClose runs after "Continue".
  function finishActivity(activityId, onClose) {
    const result = Progress.completeActivity(activityId);
    celebrate(result, onClose);
  }

  let afterCelebrate = null;

  function celebrate(result, onClose) {
    afterCelebrate = onClose || null;
    const box = document.getElementById('celebrate');
    const line1 = praise();
    const line2 = result.newFlower
      ? 'All three cups are full.'
      : result.cupNumber === 1 ? 'The first cup is poured.' : 'The second cup is poured.';
    const line3 = result.newFlower ? 'A new flower is growing in your garden.' : '';

    const card = el('div', { class: 'celebrate-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'celebrate-title' },
      el('div', { class: 'celebrate-art', html: Art.cup(1, { pour: true }) + (result.newFlower ? Art.flower({ bloom: true }) : '') }),
      el('h2', { id: 'celebrate-title', class: 'sayable', text: line1 }),
      el('p', { class: 'sayable', text: line2 }),
      line3 ? el('p', { class: 'sayable', text: line3 }) : null,
      el('div', { class: 'btn-row center' },
        button({ id: 'celebrate-ok', icon: '✓', label: 'Continue', kind: 'primary', onClick: closeCelebrate })
      )
    );
    box.replaceChildren(card);
    box.hidden = false;
    document.getElementById('celebrate-ok').focus();
    say([line1, line2, line3].join(' '));
  }

  function closeCelebrate() {
    const box = document.getElementById('celebrate');
    box.hidden = true;
    box.replaceChildren();
    stopTalking();
    const fn = afterCelebrate;
    afterCelebrate = null;
    if (fn) fn();
  }

  function isCelebrating() {
    return !document.getElementById('celebrate').hidden;
  }

  /* ---------- 7. Tap-to-hear, hover-to-hear, keyboard ---------- */

  function onTap(e) {
    const word = e.target.closest('.word');
    if (word) {
      // a vocabulary word: say it and show its syllables and meaning
      if (word.hasAttribute('data-entry') && typeof Dict !== 'undefined') {
        Dict.open(word.getAttribute('data-entry'), word);
        return;
      }
      say(word.getAttribute('data-word') || textOf(word), { node: word });
      return;
    }
    const s = e.target.closest('.sayable');
    if (s && !e.target.closest('button, a, input, select, textarea')) {
      say(textOf(s), { node: s });
    }
  }

  let hoverTimer = null;
  let hoverTarget = null;
  function onHover(e) {
    const t = e.target.closest('[data-say], .sayable, .word');
    if (t === hoverTarget) return;
    clearTimeout(hoverTimer);
    hoverTarget = t;
    if (!t || !Store.getSetting('hoverRead')) return;
    hoverTimer = setTimeout(function () {
      if (Voice.isSpeaking()) return;   // never interrupt
      say(t.classList.contains('word') ? (t.getAttribute('data-word') || textOf(t)) : textOf(t));
    }, 800);
  }

  function onKey(e) {
    if (e.key === 'Escape' && isCelebrating()) { closeCelebrate(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.sayable, .word')) {
      e.preventDefault();
      e.target.click();
    }
  }

  /* ---------- 8. Start ---------- */

  registerScreen('home', { title: 'Home', instruction: 'Choose a picture to begin.', render: renderHome });
  registerScreen('settings', { title: 'Settings', instruction: 'Choose the voice and the speed.', render: renderSettings });

  function start() {
    main = document.getElementById('screen');
    titleEl = document.getElementById('screen-title');
    homeBtn = document.getElementById('home-btn');

    Voice.init();

    homeBtn.addEventListener('click', function () {
      if (isCelebrating()) closeCelebrate();
      if (currentId() === 'home') say('You are on the Home page.');
      else go('home');
    });

    const markActed = function () { userActed = true; };
    document.addEventListener('pointerdown', markActed, true);
    document.addEventListener('keydown', markActed, true);
    document.addEventListener('click', onTap);
    document.addEventListener('mouseover', onHover);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { render(true); });

    render(false);

    // Save the site for offline use (works on GitHub Pages).
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* not available here */ });
    }
  }

  document.addEventListener('DOMContentLoaded', start);

  // Tools the module files can use.
  return {
    MODULES: MODULES,
    registerScreen: registerScreen,
    go: go,
    el: el,
    button: button,
    picture: picture,
    choice: choice,
    modeTabs: modeTabs,
    feedback: feedback,
    dots: dots,
    shuffle: shuffle,
    pick: pick,
    praise: praise,
    loadData: loadData,
    dataError: dataError,
    say: say,
    sayList: sayList,
    stopTalking: stopTalking,
    setInstruction: setInstruction,
    readingText: readingText,
    readAloud: readAloud,
    readAll: readAll,
    finishActivity: finishActivity,
    isCelebrating: isCelebrating,
    onLeave: onLeave,
    listen: listen,
    here: here,
    stillHere: stillHere
  };
})();
