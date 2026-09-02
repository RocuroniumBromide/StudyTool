/* Record a study session - used by both general study and exam study.
   In exam mode only the topics chosen for that exam can be selected. */
window.App = window.App || {};
App.views = App.views || {};

App.views.sessionForm = function (root, params, query) {
  var esc = App.dom.esc;
  var examId = params.examId || null;
  var preselected = (query && query.topic) || '';

  return Promise.all([
    App.repo.listSubjects(),
    examId ? App.repo.getExam(examId) : Promise.resolve(null)
  ]).then(function (results) {
    var subjects = results[0];
    var exam = results[1];

    if (examId && !exam) {
      root.innerHTML = '<h1>Exam not found</h1><p><a href="#/exams">Back to exams</a></p>';
      return;
    }

    var backHref = exam ? '#/exams/' + exam.id : '#/general';
    var allowed = exam ? exam.topicIds : null;
    var groups = subjects.map(function (subject) {
      return {
        name: subject.name,
        topics: subject.topics.filter(function (topic) {
          return !allowed || allowed.indexOf(topic.id) !== -1;
        })
      };
    }).filter(function (group) { return group.topics.length; });

    if (!groups.length) {
      root.innerHTML = '<h1>Record study session</h1>' +
        '<div class="empty">There are no topics to record against yet.</div>' +
        '<p><a href="' + backHref + '">Go back</a></p>';
      return;
    }

    var hasPreselected = groups.some(function (group) {
      return group.topics.some(function (topic) { return topic.id === preselected; });
    });

    root.innerHTML =
      '<p><a href="' + backHref + '">&larr; Back</a></p>' +
      '<h1>Record study session</h1>' +
      (exam ? '<p class="hint">For <strong>' + esc(exam.name) + '</strong></p>' : '') +
      '<form data-session-form novalidate>' +

        '<div class="field">' +
          '<label for="session-date">Session date:</label>' +
          '<input type="date" id="session-date" data-date value="' + esc(App.dates.today()) + '">' +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Select topic studied:</span>' +
          groups.map(function (group) {
            return '<p class="hint" style="margin:10px 0 2px">' + esc(group.name) + '</p>' +
              group.topics.map(function (topic) {
                var checked = topic.id === preselected && hasPreselected ? ' checked' : '';
                return '<div class="radio-row">' +
                  '<input type="radio" name="topic" id="t_' + esc(topic.id) + '" ' +
                    'value="' + esc(topic.id) + '"' + checked + '>' +
                  '<label for="t_' + esc(topic.id) + '">' + esc(topic.name) + '</label>' +
                  '</div>';
              }).join('');
          }).join('') +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Rate your confidence on this topic:</span>' +
          App.format.CONFIDENCE.map(function (level) {
            return '<div class="radio-row">' +
              '<input type="radio" name="confidence" id="c_' + level.value + '" value="' + level.value + '">' +
              '<label for="c_' + level.value + '">' + esc(level.label) + '</label>' +
              '</div>';
          }).join('') +
        '</div>' +

        '<div class="field">' +
          '<label for="session-notes">Add brief notes (optional):</label>' +
          '<textarea id="session-notes" data-notes></textarea>' +
        '</div>' +

        App.components.quizEditor.render() +

        '<p class="error" data-error hidden></p>' +
        '<div class="form-actions">' +
          '<button type="submit" class="btn">Save</button>' +
          '<a class="btn secondary" href="' + backHref + '">Cancel</a>' +
        '</div>' +
      '</form>';

    App.components.quizEditor.bind(root);

    var errorBox = root.querySelector('[data-error]');

    root.querySelector('[data-session-form]').addEventListener('submit', function (event) {
      event.preventDefault();

      var date = root.querySelector('[data-date]').value;
      var topic = root.querySelector('input[name="topic"]:checked');
      var confidence = root.querySelector('input[name="confidence"]:checked');

      var problem = null;
      if (!date) problem = 'Choose the date you studied.';
      else if (!topic) problem = 'Select the topic you studied.';
      else if (!confidence) problem = 'Rate your confidence on the topic.';
      else problem = App.components.quizEditor.validate(root);

      if (problem) {
        errorBox.textContent = problem;
        errorBox.hidden = false;
        return;
      }

      App.repo.createSession({
        examId: examId,
        topicId: topic.value,
        date: date,
        confidence: Number(confidence.value),
        notes: root.querySelector('[data-notes]').value.trim(),
        quizzes: App.components.quizEditor.value(root)
      }).then(function () {
        App.dom.toast('Session saved');
        App.router.go(exam ? '/exams/' + exam.id : '/general');
      });
    });
  });
};
