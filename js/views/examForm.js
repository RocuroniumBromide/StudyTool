/* Create or edit an exam: name, date, pass mark and the topics it covers. */
window.App = window.App || {};
App.views = App.views || {};

App.views.examForm = function (root, params) {
  var esc = App.dom.esc;
  var examId = params.examId || null;

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

    root.innerHTML =
      '<h1>' + (exam ? 'Edit exam' : 'Add new exam') + '</h1>' +
      '<form data-exam-form novalidate>' +
        '<div class="field">' +
          '<label for="exam-name">Exam name:</label>' +
          '<input type="text" id="exam-name" data-name value="' + esc(exam ? exam.name : '') + '" ' +
            'placeholder="e.g. Semester 1" style="max-width:340px">' +
        '</div>' +

        '<div class="field">' +
          '<label for="exam-date">Exam date:</label>' +
          '<input type="date" id="exam-date" data-date value="' + esc(exam ? exam.date : '') + '">' +
        '</div>' +

        '<div class="field">' +
          '<label for="exam-pass">Pass mark (%):</label>' +
          '<input type="number" id="exam-pass" data-pass min="0" max="100" step="any" ' +
            'value="' + esc(exam ? exam.passMark : 50) + '" style="width:100px">' +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Choose the topics you need for this exam:</span>' +
          App.components.topicPicker.render(subjects, exam ? exam.topicIds : []) +
        '</div>' +

        '<p class="error" data-error hidden></p>' +
        '<div class="form-actions">' +
          '<button type="submit" class="btn">Save</button>' +
          '<a class="btn secondary" href="' + (exam ? '#/exams/' + esc(exam.id) : '#/exams') + '">Cancel</a>' +
        '</div>' +
      '</form>';

    App.components.topicPicker.bind(root);

    var form = root.querySelector('[data-exam-form]');
    var errorBox = root.querySelector('[data-error]');

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var name = root.querySelector('[data-name]').value.trim();
      var date = root.querySelector('[data-date]').value;
      var passRaw = root.querySelector('[data-pass]').value.trim();
      var passMark = passRaw === '' ? 50 : parseFloat(passRaw);
      var topicIds = App.components.topicPicker.value(root);

      var problem = null;
      if (!name) problem = 'Give the exam a name.';
      else if (!date) problem = 'Choose an exam date.';
      else if (isNaN(passMark) || passMark < 0 || passMark > 100) problem = 'The pass mark must be between 0 and 100.';
      else if (!topicIds.length) problem = 'Select at least one topic.';

      if (problem) {
        errorBox.textContent = problem;
        errorBox.hidden = false;
        return;
      }

      var payload = { name: name, date: date, passMark: passMark, topicIds: topicIds };
      var saving = exam
        ? App.repo.updateExam(exam.id, payload)
        : App.repo.createExam(payload);

      saving.then(function (saved) {
        App.dom.toast(exam ? 'Exam updated' : 'Exam created');
        App.router.go('/exams/' + (exam ? exam.id : saved.id));
      });
    });
  });
};
