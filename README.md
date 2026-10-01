# Coffee & Letters

A warm, patient learning website for one adult learner:
English sounds, words, stories, typing, and computer skills.

It is a plain static site for GitHub Pages (HTML, CSS, JavaScript).
There is no server and no login. Progress is saved only in her browser.

## Files

| File | What it does |
|---|---|
| `index.html` | The one web page. Module scripts are listed at the bottom. |
| `css/style.css` | Colors, sizes, woven borders. Change colors in `:root`. |
| `js/storage.js` | Saves first name, settings, and progress in this browser. |
| `js/voice.js` | Speaking: MP3 recordings first, then the computer voice. |
| `js/progress.js` | Coffee cups, flowers, and word review (spaced repetition). |
| `js/art.js` | Drawings: coffee scene, cups, flowers, basket medallions. |
| `js/app.js` | Pages, Home, Settings, celebrations, shared tools. |
| `js/dictionary.js` | Word lookup: syllables that light up when spoken, the word card in stories. |
| `js/sounds.js` | Sound Explorer: letters, short and long vowels, blending, sounds that sound alike. |
| `js/words.js` | Word Builder (learn, match, meaning, spell) and Review. |
| `js/grammar.js` | Grammar: kinds of words, a / an / the, regular and irregular verbs. |
| `js/stories.js` | Story Corner: read-along stories. |
| `js/questions.js` | Picture questions after each story. |
| `js/typing.js` | Typing Practice with an on-screen keyboard. |
| `js/computer.js` | Computer Skills: click, double-click, scroll, drag, keys, icons. |
| `js/teacher.js` | For Teacher: progress, hard words, recording names. |
| `sw.js` | Lets the site open without internet after the first visit. |
| `data/words.json` | Word groups (Everyday words, Ventures 3 Welcome Unit and Unit 1) with syllables, part of speech, and definitions; typing sentences. |
| `data/stories.json` | Stories and their questions, grouped (Everyday, Ventures 3 units). |
| `data/sounds.json` | Letters, vowels, blending words, and sound pairs. |
| `data/grammar.json` | Word kinds, a / an / the practice, and verbs. |
| `audio/` | Real voice recordings (see `audio/README.txt`). |
| `images/` | Your own pictures (see `images/README.txt`). |

## Testing

Test on the GitHub Pages link, not by double-clicking `index.html`.
Browsers block the data files when a page is opened straight from a folder.

## Word data

Syllable breaks follow Merriam-Webster. Where the dictionary's line-break
dots leave out a one-letter syllable (alone, imagine, career, ocean), the
site follows the dictionary's pronunciation so every spoken beat shows.
Definitions are short, plain-English meanings based on Merriam-Webster.
