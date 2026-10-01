/* =============================================================
   FILE: /js/art.js
   WHAT IT DOES: Draws the pictures, all in code (SVG), so there
   are no image files to download and nothing is copyrighted:
   - Art.trayScene(cups, flowers)  the coffee scene on Home
   - Art.medallion()               a round basket-lid pattern
   - Art.cup(level)                one coffee cup
   - Art.flower()                  one golden flower
   - Art.jebena()                  a small coffee pot
   Colors come from css/style.css (the "art-", "sc-", "md-" names).
   ============================================================= */
const Art = (function () {
  'use strict';

  let uid = 0;   // gives each clip shape its own id
  const CUP_SHAPE = 'M8 18 H52 L46.5 49 Q45.5 54 40 54 H20 Q14.5 54 13.5 49 Z';
  const JEBENA_BODY = 'M27 29 L26 10 Q32 6 38 10 L37 29 C50 33 52 49 46 59 C40 67 24 67 18 59 C12 49 14 33 27 29 Z';
  const JEBENA_SPOUT = 'M19 49 L5 34 L9 30.5 L24 43 Z';

  function round(n) { return Math.round(n * 10) / 10; }

  /* ---------- One coffee cup (used in the celebration) ----------
     level: 0 = empty, 1 = full.  opts.pour: animate the pouring. */
  function cup(level, opts) {
    opts = opts || {};
    uid += 1;
    const clipId = 'cup-clip-' + uid;
    const top = 22 + (1 - level) * 32;
    const steam = level >= 1
      ? '<path class="art-steam" d="M24 12 q-4 -4 0 -8 q4 -4 0 -8"/><path class="art-steam s2" d="M35 12 q-4 -4 0 -8 q4 -4 0 -8"/>'
      : '';
    return '<svg class="art-cup' + (opts.pour ? ' pour' : '') + '" viewBox="0 -8 60 72" aria-hidden="true" focusable="false">' +
      '<ellipse class="art-saucer" cx="30" cy="58" rx="27" ry="5"/>' +
      '<path class="art-cup-body" d="' + CUP_SHAPE + '"/>' +
      '<defs><clipPath id="' + clipId + '"><path d="' + CUP_SHAPE + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + clipId + ')"><rect class="art-coffee" x="0" y="' + top + '" width="60" height="60" style="--from:' + (54 - top) + 'px"/></g>' +
      '<path class="art-band" d="M10.5 26 H49.5"/>' +
      '<path class="art-cup-line" d="' + CUP_SHAPE + '"/>' +
      '<path class="art-rim" d="M8 18 H52"/>' +
      steam + '</svg>';
  }

  /* ---------- The flower's parts (stem, leaves, 12 petals) ---------- */
  function flowerParts() {
    let petals = '';
    for (let i = 0; i < 12; i++) {
      petals += '<ellipse cx="30" cy="16" rx="4.6" ry="12" transform="rotate(' + (i * 30) + ' 30 28)"/>';
    }
    return '<path class="art-stem" d="M30 38 C29 54 31 66 30 84"/>' +
      '<path class="art-leaf" d="M30 66 C21 60 15 62 10 55 C19 52 26 57 30 66 Z"/>' +
      '<path class="art-leaf" d="M30 58 C38 52 44 54 49 48 C40 46 33 50 30 58 Z"/>' +
      '<g class="art-head"><g class="art-petals">' + petals + '</g>' +
      '<circle class="art-eye" cx="30" cy="28" r="7"/><circle class="art-eye2" cx="30" cy="28" r="3.5"/></g>';
  }

  function flower(opts) {
    opts = opts || {};
    return '<svg class="art-flower' + (opts.bloom ? ' bloom' : '') + '" viewBox="0 0 60 84" aria-hidden="true" focusable="false">' +
      flowerParts() + '</svg>';
  }

  /* ---------- A small jebena for the top bar ---------- */
  function jebena() {
    return '<svg class="art-jebena" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
      '<path class="art-jb-handle" d="M38 16 C52 14 55 34 45 46"/>' +
      '<path class="art-jb" d="' + JEBENA_SPOUT + '"/>' +
      '<path class="art-jb" d="' + JEBENA_BODY + '"/>' +
      '<path class="art-jb-band" d="M16 47 Q32 54 48 47"/>' +
      '<ellipse class="art-jb-shine" cx="23" cy="45" rx="2.6" ry="6.5"/>' +
      '</svg>';
  }

  /* ---------- A round basket-lid medallion ----------
     Rings and a band of woven triangles, like the top of a
     hand-woven basket. Its colors come from the tile it sits in. */
  function medallion() {
    const teeth = 18;
    let tri = '';
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 1) / teeth) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      tri += 'M' + round(49 * Math.cos(a0)) + ' ' + round(49 * Math.sin(a0)) +
        'L' + round(49 * Math.cos(a1)) + ' ' + round(49 * Math.sin(a1)) +
        'L' + round(37 * Math.cos(am)) + ' ' + round(37 * Math.sin(am)) + 'Z';
    }
    return '<svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">' +
      '<circle class="md-outer" r="49"/>' +
      '<path class="md-teeth" d="' + tri + '"/>' +
      '<circle class="md-ring" r="35.5"/>' +
      '<circle class="md-inner" r="33"/>' +
      '</svg>';
  }

  /* ---------- The coffee scene on the Home page ----------
     A wooden tray holding three cups, a jebena on its woven
     stand, and a meadow where her flowers grow.
     cupsFull: 0 to 3.  flowerCount: how many flowers she has. */
  function trayScene(cupsFull, flowerCount) {
    let s = '<svg class="art-scene" viewBox="0 0 560 330" aria-hidden="true" focusable="false">';

    // Steam rising from the jebena's spout
    s += '<path class="sc-smoke" d="M420 176 q-8 -12 0 -24 q8 -12 0 -24"/>' +
         '<path class="sc-smoke s2" d="M432 170 q-8 -12 0 -24 q8 -12 0 -24"/>';

    // The jebena on its woven ring stand
    s += '<ellipse class="sc-stand" cx="478" cy="252" rx="44" ry="11"/>' +
         '<ellipse class="sc-stand-line" cx="478" cy="250" rx="36" ry="7"/>' +
         '<g transform="translate(407.6 107) scale(2.2)">' +
           '<path class="sc-jb-handle" d="M38 16 C52 14 55 34 45 46" style="stroke-width:2.3"/>' +
           '<path class="sc-jebena" d="' + JEBENA_SPOUT + '" style="stroke-width:1"/>' +
           '<path class="sc-jebena" d="' + JEBENA_BODY + '" style="stroke-width:1"/>' +
           '<path class="sc-jb-band" d="M16 47 Q32 54 48 47" style="stroke-width:1.5"/>' +
           '<path class="sc-jb-band" d="M26 14 H38" style="stroke-width:1.2"/>' +
         '</g>';

    // The wooden tray: top, front, carved band, and legs
    s += '<path class="sc-tray-top" d="M48 176 H392 L406 192 H34 Z"/>' +
         '<rect class="sc-tray-front" x="34" y="192" width="372" height="40" rx="4"/>';
    for (let x = 52, i = 0; x <= 390; x += 26, i++) {
      s += '<path class="' + (i % 2 ? 'sc-carve2' : 'sc-carve') + '" d="M' + x + ' 212 l8 -8 l8 8 l-8 8 z"/>';
    }
    s += '<rect class="sc-tray-front" x="52" y="232" width="18" height="18"/>' +
         '<rect class="sc-tray-front" x="370" y="232" width="18" height="18"/>';

    // Three cups on the tray (full ones are filled and steaming)
    [120, 220, 320].forEach(function (cx, i) {
      const full = i < cupsFull;
      uid += 1;
      const clipId = 'sc-clip-' + uid;
      const sc = 1.6;
      s += '<g transform="translate(' + (cx - 30 * sc) + ' ' + round(184 - 58 * sc) + ') scale(' + sc + ')">' +
        '<ellipse class="sc-saucer" cx="30" cy="58" rx="27" ry="5"/>' +
        '<path class="sc-cup-body" d="' + CUP_SHAPE + '"/>' +
        (full
          ? '<defs><clipPath id="' + clipId + '"><path d="' + CUP_SHAPE + '"/></clipPath></defs>' +
            '<g clip-path="url(#' + clipId + ')"><rect class="sc-coffee" x="0" y="22" width="60" height="40"/></g>' +
            '<path class="sc-steam" d="M24 12 q-4 -4 0 -8 q4 -4 0 -8"/><path class="sc-steam s2" d="M35 12 q-4 -4 0 -8 q4 -4 0 -8"/>'
          : '') +
        '<path class="sc-band" d="M10.5 26 H49.5"/>' +
        '<path class="sc-cup-line" d="' + CUP_SHAPE + '" style="stroke-width:1.6"/>' +
        '</g>';
    });

    // The meadow: grass blades along the bottom
    for (let i = 0; i < 46; i++) {
      const x = (i * 53 + (i % 3) * 7) % 560;
      const h = 12 + ((i * 7) % 18);
      const lean = (i % 2 ? 1 : -1) * (3 + (i % 4));
      s += '<path class="' + (i % 3 ? 'sc-blade' : 'sc-blade2') + '" d="M' + x + ' 330 q' + lean + ' -' + (h / 2) + ' ' + (lean * 2) + ' -' + h + '"/>';
    }

    // Her flowers (up to 14 are drawn; hover/tap tells the full count)
    const show = Math.min(flowerCount, 14);
    for (let i = 0; i < show; i++) {
      const slot = 520 / Math.max(show, 1);
      const x = 20 + slot * i + slot / 2 + ((i * 17) % 13) - 6;
      const scale = 0.62 + ((i * 5) % 4) * 0.05;
      s += '<g transform="translate(' + round(x - 30 * scale) + ' ' + round(330 - 84 * scale) + ') scale(' + scale + ')">' +
        flowerParts() + '</g>';
    }

    return s + '</svg>';
  }

  return { cup: cup, flower: flower, jebena: jebena, medallion: medallion, trayScene: trayScene };
})();
