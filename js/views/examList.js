/* Exam study landing page: upcoming and past exams. */
window.App = window.App || {};
App.views = App.views || {};

App.views.examList = function (root, params, query) {
  var esc = App.dom.esc;
  var tab = query && query.tab === 'past' ? 'past' : 'upcoming';

  function draw() {
    return App.repo.listExams().then(function (exams) {
      var upcoming = exams.filter(function (exam) { return !App.dates.isPast(exam.date); })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var past = exams.filter(function (exam) { return App.dates.isPast(exam.date); })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

      var shown = tab === 'past' ? past : upcoming;

      root.innerHTML =
        '<h1>Exams</h1>' +
        '<div class="toggle">' +
          '<button data-tab="upcoming"' + (tab === 'upcoming' ? ' class="active"' : '') + '>Upcoming</button>' +
          '<button data-tab="past"' + (tab === 'past' ? ' class="active"' : '') + '>Past</button>' +
        '</div>' +
        (shown.length
          ? shown.map(tab === 'past' ? pastCard : upcomingCard).join('')
          : '<div class="empty">No ' + tab + ' exams.</div>') +
        '<div style="margin-top:24px"><a class="btn" href="#/exams/new">Add new exam</a></div>';
    });
  }

  function upcomingCard(exam) {
    return '<div class="exam-card" data-open="' + esc(exam.id) + '" role="link" tabindex="0">' +
      '<div class="exam-card-top">' +
        '<span class="exam-card-name">' + esc(exam.name) + '</span>' +
        '<span class="meta-line" style="margin:0">' + App.dom.icons.clock +
          esc(App.dates.relativeShort(exam.date)) + '</span>' +
      '</div>' +
      '<div class="exam-card-bottom muted" style="font-weight:400">' +
        esc(App.dates.toDisplay(exam.date)) + ' &middot; ' +
        exam.topicIds.length + ' topic' + (exam.topicIds.length === 1 ? '' : 's') +
      '</div>' +
      '</div>';
  }

  function pastCard(exam) {
    var hasScore = typeof exam.score === 'number';
    var passed = hasScore && exam.score >= exam.passMark;
    var state = hasScore ? (passed ? 'pass' : 'fail') : 'none';
    var label = hasScore ? (passed ? 'Passed' : 'Failed') : 'No result';

    return '<div class="exam-card ' + state + '" data-open="' + esc(exam.id) + '" role="link" tabindex="0">' +
      '<div class="exam-card-top">' +
        '<span class="exam-card-name">' +
          '<span class="badge ' + state + '">' + label + '</span>' + esc(exam.name) +
        '</span>' +
        '<span class="meta-line" style="margin:0">' + App.dom.icons.clock +
          esc(App.dates.relative(exam.date)) + '</span>' +
      '</div>' +
      '<div class="exam-card-bottom" data-score-wrap>' +
        App.dom.icons.pencil +
        '<input class="score-edit" data-score="' + esc(exam.id) + '" ' +
          'value="' + (hasScore ? esc(exam.score) : '') + '" placeholder="--" ' +
          'title="Your result, as a percentage (pass mark ' + esc(exam.passMark) + '%)" ' +
          'aria-label="Result percentage for ' + esc(exam.name) + '">%' +
      '</div>' +
      '</div>';
  }

  function bind() {
    App.dom.on(root, 'click', '[data-tab]', function (event, button) {
      tab = button.getAttribute('data-tab');
      draw();
    });

    App.dom.on(root, 'click', '[data-open]', function (event, card) {
      if (event.target.closest('[data-score-wrap]')) return;
      App.router.go('/exams/' + card.getAttribute('data-open'));
    });

    App.dom.on(root, 'keydown', '[data-open]', function (event, card) {
      if (event.key !== 'Enter' || event.target.closest('[data-score-wrap]')) return;
      App.router.go('/exams/' + card.getAttribute('data-open'));
    });

    App.dom.on(root, 'change', '[data-score]', function (event, input) {
      var raw = input.value.trim();
      var score = raw === '' ? null : parseFloat(raw);
      if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
        window.alert('Enter a result between 0 and 100, or leave it blank.');
        return draw();
      }
      App.repo.updateExam(input.getAttribute('data-score'), { score: score }).then(draw);
    });
  }

  // Bound once for the life of the view; draw() only replaces the markup.
  bind();
  return draw();
};
