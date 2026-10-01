/* =============================================================
   FILE: /js/progress.js
   WHAT IT DOES: Keeps track of practice in a gentle way.

   THE COFFEE TRAY: each finished practice pours one cup.
   When all three cups are full, a golden flower grows in her
   garden and the tray starts again. Flowers never go away.
   There are no scores, no streaks, and nothing to "lose".

   WORD MEMORY (spaced repetition): every word she practices
   sits in a "box" from 1 to 5.
   - Right answer: the word moves up one box and comes back later.
   - Not yet: the word goes back to box 1 and comes back today.
   Box 1 = today, 2 = tomorrow, 3 = in 3 days, 4 = in a week,
   5 = in two weeks. She never sees the boxes.
   ============================================================= */
const Progress = (function () {
  'use strict';

  const BOX_WAIT_DAYS = [0, 0, 1, 3, 7, 14];  // index = box number

  function data() {
    return Store.data.progress;
  }

  // A date as text, like "2026-10-01" (in her own time zone).
  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function today() {
    return dateKey(new Date());
  }
  function daysFromToday(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return dateKey(d);
  }

  /* ---------- Coffee cups and flowers ---------- */

  // Call when she finishes one practice. Tells you which cup was
  // poured (1, 2 or 3) and whether a new flower grew.
  function completeActivity(activityId) {
    const p = data();
    p.total = (p.total || 0) + 1;
    const k = today();
    p.days[k] = (p.days[k] || 0) + 1;
    if (activityId) p.activities[activityId] = (p.activities[activityId] || 0) + 1;
    Store.save();
    const cupNumber = ((p.total - 1) % 3) + 1;
    return { cupNumber: cupNumber, newFlower: cupNumber === 3, flowers: flowers() };
  }

  // How many cups on the tray are full right now (0 to 3).
  function cupsFilled() {
    const t = data().total || 0;
    return t === 0 ? 0 : ((t - 1) % 3) + 1;
  }

  function flowers() {
    return Math.floor((data().total || 0) / 3);
  }

  function timesDone(activityId) {
    return data().activities[activityId] || 0;
  }

  /* ---------- Word memory ---------- */

  function blank() {
    return { box: 1, right: 0, wrong: 0, due: today(), last: '' };
  }

  // She has seen this word for the first time (Learn cards).
  function introduceWord(word) {
    const key = String(word || '').toLowerCase().trim();
    if (!key || data().words[key]) return;
    data().words[key] = blank();
    Store.save();
  }

  // correct = true when she got it right, false when "not yet".
  function recordWord(word, correct) {
    const key = String(word || '').toLowerCase().trim();
    if (!key) return;
    const all = data().words;
    const w = all[key] || blank();
    if (correct) {
      w.right += 1;
      w.box = Math.min(5, w.box + 1);
    } else {
      w.wrong += 1;
      w.box = 1;
    }
    w.due = daysFromToday(BOX_WAIT_DAYS[w.box]);
    w.last = today();
    all[key] = w;
    Store.save();
  }

  function entries() {
    return Object.keys(data().words).map(function (k) {
      return { word: k, info: data().words[k] };
    });
  }

  // Words ready to review today, the ones needing most help first.
  function wordsToReview(limit) {
    const t = today();
    return entries()
      .filter(function (x) { return x.info.due <= t; })
      .sort(function (a, b) { return a.info.box - b.info.box || (a.info.due < b.info.due ? -1 : 1); })
      .slice(0, limit || 10)
      .map(function (x) { return x.word; });
  }

  // Every word she has met, lowest box first.
  function knownWords() {
    return entries()
      .sort(function (a, b) { return a.info.box - b.info.box; })
      .map(function (x) { return x.word; });
  }

  // Words she finds hardest (for the Teacher page).
  function hardWords(limit) {
    return entries()
      .filter(function (x) { return x.info.wrong > 0; })
      .map(function (x) {
        return { word: x.word, right: x.info.right, wrong: x.info.wrong, score: x.info.wrong - x.info.right * 0.5 };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 10);
  }

  // A summary for the Teacher page.
  function summary() {
    const p = data();
    return {
      total: p.total || 0,
      flowers: flowers(),
      cups: cupsFilled(),
      daysPracticed: Object.keys(p.days).length,
      wordsMet: Object.keys(p.words).length,
      dueToday: wordsToReview(999).length,
      activities: p.activities || {}
    };
  }

  return {
    completeActivity: completeActivity,
    cupsFilled: cupsFilled,
    flowers: flowers,
    timesDone: timesDone,
    introduceWord: introduceWord,
    recordWord: recordWord,
    wordsToReview: wordsToReview,
    knownWords: knownWords,
    hardWords: hardWords,
    summary: summary
  };
})();
