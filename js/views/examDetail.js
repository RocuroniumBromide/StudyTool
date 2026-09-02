/* One exam: countdown, confidence bar and the study sessions logged for it. */
window.App = window.App || {};
App.views = App.views || {};

App.views.examDetail = function (root, params) {
  var esc = App.dom.esc;
  var examId = params.examId;
  // Reset on every visit, never stored - see the note in topicFilter.js.
  var filter = 'all';

  function draw() {
    return Promise.all([
      App.repo.getExam(examId),
      App.repo.listSubjects(),
      App.repo.listSessions({ examId: examId }),
      App.repo.getMeta()
    ]).then(function (results) {
      var exam = results[0];
      var subjects = results[1];
      var sessions = results[2];
      var meta = results[3];

      if (!exam) {
        root.innerHTML = '<h1>Exam not found</h1><p><a href="#/exams">Back to exams</a></p>';
        return;
      }

      var index = App.model.topicIndex(subjects);
      var topics = exam.topicIds
        .map(function (id) { return index[id]; })
        .filter(Boolean);
      var entries = App.model.buildBoard(topics, sessions, meta);
      var shown = App.components.topicFilter.apply(entries, filter);
      var past = App.dates.isPast(exam.date);

      root.innerHTML =
        '<p><a href="#/exams">&larr; All exams</a></p>' +
        '<div class="page-head">' +
          '<h1>' + esc(exam.name) + '</h1>' +
          '<a class="btn secondary small" href="#/exams/' + esc(exam.id) + '/edit">Edit</a>' +
          '<span style="flex:1"></span>' +
          '<button class="btn danger small" data-delete-exam="' + esc(exam.name) + '">Delete exam</button>' +
        '</div>' +
        '<p class="meta-line">' + App.dom.icons.clock +
          (past
            ? 'Your exam was ' + esc(App.dates.relative(exam.date))
            : 'Your exam is ' + esc(App.dates.relativeShort(exam.date))) +
          ' (' + esc(App.dates.toDisplay(exam.date)) + ')</p>' +

        App.components.progressBar(entries) +

        (past ? resultBox(exam) : '') +

        '<div class="section-head">' +
          '<h2>Study sessions</h2>' +
          '<a class="btn" href="#/exams/' + esc(exam.id) + '/session">Record new study session</a>' +
        '</div>' +

        App.components.topicFilter.render(entries, filter) +
        (shown.length
          ? App.components.topicBoard.render(shown, {
              sessionHref: function (topicId) {
                return '#/exams/' + exam.id + '/session?topic=' + topicId;
              }
            })
          : App.components.topicFilter.emptyMessage(filter));
    });
  }

  function resultBox(exam) {
    var hasScore = typeof exam.score === 'number';
    var passed = hasScore && exam.score >= exam.passMark;
    return '<div class="card" style="margin-top:18px">' +
      '<span class="field-label">Result</span>' +
      '<div class="row-gap">' +
        '<input type="number" min="0" max="100" step="any" data-result placeholder="--" ' +
          'value="' + (hasScore ? esc(exam.score) : '') + '" style="width:100px"> %' +
        '<span class="hint" style="margin:0">pass mark ' + esc(exam.passMark) + '%</span>' +
        (hasScore
          ? '<span class="badge ' + (passed ? 'pass' : 'fail') + '">' + (passed ? 'Passed' : 'Failed') + '</span>'
          : '') +
      '</div>' +
      '</div>';
  }

  // Bound once for the life of the view; draw() only replaces the markup.
  function bind() {
    App.dom.on(root, 'click', '[data-delete-exam]', function (event, button) {
      var name = button.getAttribute('data-delete-exam');
      if (!window.confirm('Delete "' + name + '"?\n\nIts study sessions will be deleted too.')) return;
      App.repo.deleteExam(examId).then(function () {
        App.dom.toast('Exam deleted');
        App.router.go('/exams');
      });
    });

    App.dom.on(root, 'change', '[data-result]', function (event, input) {
      var raw = input.value.trim();
      var score = raw === '' ? null : parseFloat(raw);
      if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
        window.alert('Enter a result between 0 and 100, or leave it blank.');
        return draw();
      }
      App.repo.updateExam(examId, { score: score }).then(function () {
        App.dom.toast('Result saved');
        draw();
      });
    });

    App.dom.on(root, 'click', '[data-filter]', function (event, button) {
      filter = button.getAttribute('data-filter');
      draw();
    });

    App.dom.on(root, 'click', '[data-delete-session]', function (event, button) {
      App.repo.deleteSession(button.getAttribute('data-delete-session')).then(function () {
        App.dom.toast('Session deleted');
        draw();
      });
    });
  }

  bind();
  return draw();
};
