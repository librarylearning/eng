/* =============================================================
   FILE: /js/stories.js
   MODULE: Story Corner
   1. Choose a story.
   2. "Read to me": each word lights up as it is read.
      Tap any word to hear it alone. Vocabulary words (dotted
      underline) also open a word card with syllables and meaning.
   3. Answer 2 or 3 picture questions (js/questions.js).
   Stories are in data/stories.json. To use a real voice for a
   sentence, record it and name it like the sentence
   (the Teacher page lists every file name).
   ============================================================= */
(function () {
  'use strict';
  const el = App.el;

  App.registerScreen('stories', {
    title: 'Stories',
    spoken: 'Story Corner',
    instruction: 'Choose a story.',
    render: function (main) {
      const stage = el('div', { class: 'stage' });
      main.append(stage);
      const token = App.here();
      Promise.all([App.loadData('stories'), Dict.ready()]).then(function (res) {
        if (!App.stillHere(token)) return;
        showList(res[0].stories);
      }).catch(function () { App.dataError(stage); });

      function header(story) {
        return el('div', { class: 'story-head' },
          el('span', { class: 'mark', html: Art.medallion() }, el('span', { class: 'mark-icon', 'aria-hidden': 'true', text: story.picture })),
          el('h2', { class: 'story-title sayable', text: story.title })
        );
      }

      /* ----- The list of stories ----- */
      function showList(stories) {
        App.stopTalking();
        // one heading per group (Everyday stories, Ventures 3 units...)
        const sections = [];
        const byGroup = {};
        stories.forEach(function (story) {
          const g = story.group || 'Stories';
          if (!byGroup[g]) {
            byGroup[g] = el('div', { class: 'story-list' });
            sections.push(el('section', { class: 'group-section' },
              el('h2', { class: 'group-title sayable', text: g }), byGroup[g]));
          }
          const grid = byGroup[g];
          const times = Progress.timesDone('story:' + story.id);
          grid.append(el('button', {
            type: 'button', class: 'story-card', 'data-say': story.title,
            onclick: function () { showStory(story, stories); }
          },
            el('span', { class: 'mark', html: Art.medallion() }, el('span', { class: 'mark-icon', 'aria-hidden': 'true', text: story.picture })),
            el('span', {},
              el('span', { class: 'story-name', text: story.title }),
              times ? el('span', { class: 'story-done', text: ' ✓ read' }) : null
            )
          ));
        });
        stage.replaceChildren.apply(stage, sections);
        App.setInstruction('Choose a story.');
      }

      /* ----- One story ----- */
      function showStory(story, stories) {
        App.stopTalking();
        App.setInstruction('Press "Read to me". Tap any word to hear it.', true);
        Dict.close();
        const readings = story.sentences.map(function (s) {
          const r = App.readingText(s);
          Dict.annotate(r.spans);   // mark vocabulary words
          return r;
        });
        const text = el('div', { class: 'story-text' }, readings.map(function (r) { return r.node; }));

        const questionsBtn = App.button({
          icon: '❓', label: 'Questions',
          onClick: function () { showQuestions(story, stories); }
        });

        const card = el('section', { class: 'card tibeb-top stage' },
          header(story),
          text,
          el('div', { class: 'btn-row' },
            App.button({
              icon: '▶️', label: 'Read to me', kind: 'primary',
              onClick: function () {
                App.readAll(readings, function () {
                  questionsBtn.classList.add('is-glow');
                  App.say('Now, let us answer some questions.');
                });
              }
            }),
            questionsBtn,
            App.button({ icon: '📚', label: 'All stories', kind: 'quiet', onClick: function () { showList(stories); } })
          )
        );
        stage.replaceChildren(card);
        window.scrollTo(0, 0);
      }

      /* ----- Questions after the story ----- */
      function showQuestions(story, stories) {
        App.stopTalking();
        App.setInstruction('Look at the pictures. Tap the answer.');
        const box = el('div', { class: 'stage' });
        const card = el('section', { class: 'card tibeb-top stage' },
          header(story),
          box,
          el('div', { class: 'btn-row' },
            App.button({ icon: '📖', label: 'Read the story again', kind: 'quiet', onClick: function () { showStory(story, stories); } })
          )
        );
        stage.replaceChildren(card);
        window.scrollTo(0, 0);

        Questions.run(box, story.questions, function () {
          App.finishActivity('story:' + story.id, function () { finished(story, stories); });
        });
        App.say(story.questions[0].question);
      }

      function finished(story, stories) {
        App.setInstruction('You finished the story. Choose what to do next.', true);
        const index = stories.indexOf(story);
        const nextStory = stories[(index + 1) % stories.length];
        stage.replaceChildren(el('section', { class: 'card tibeb-top center-col' },
          header(story),
          el('p', { class: 'sayable', text: 'You read the story and answered every question.' }),
          el('div', { class: 'btn-row center' },
            App.button({ icon: '▶️', label: 'Next story', kind: 'primary', onClick: function () { showStory(nextStory, stories); } }),
            App.button({ icon: '📖', label: 'Read it again', onClick: function () { showStory(story, stories); } }),
            App.button({ icon: '📚', label: 'All stories', onClick: function () { showList(stories); } })
          )
        ));
      }
    }
  });
})();
