/* Topic editor: the single source of topics for general study and for exams. */
window.App = window.App || {};
App.views = App.views || {};

App.views.topicEditor = function (root) {
  var esc = App.dom.esc;

  function draw() {
    return App.repo.getAll().then(function (data) {
      var subjects = data.subjects.slice().sort(function (a, b) { return a.order - b.order; });
      subjects.forEach(function (s) { s.topics.sort(function (a, b) { return a.order - b.order; }); });

      var usage = {};
      data.sessions.forEach(function (session) {
        usage[session.topicId] = (usage[session.topicId] || 0) + 1;
      });

      root.innerHTML =
        '<h1>Topic editor</h1>' +
        '<p class="hint">Subjects hold topics. Both general study and exams pick from this list.</p>' +

        (subjects.length
          ? subjects.map(function (subject) { return subjectBlock(subject, usage); }).join('')
          : '<div class="empty"><p>No subjects yet.</p>' +
            '<button class="btn secondary small" data-starter>Add example subjects</button></div>') +

        '<div class="card" style="margin-top:18px">' +
          '<span class="field-label">Add a subject</span>' +
          '<div class="row-gap">' +
            '<input type="text" data-new-subject placeholder="e.g. Financial Accounting" style="max-width:300px">' +
            '<button class="btn small" data-add-subject>Add subject</button>' +
          '</div>' +
        '</div>';
    });
  }

  function subjectBlock(subject, usage) {
    var topics = subject.topics.map(function (topic) {
      var count = usage[topic.id] || 0;
      return '<div class="topic-row">' +
        '<input type="text" value="' + esc(topic.name) + '" data-rename-topic="' + esc(topic.id) + '">' +
        (count ? '<span class="hint" style="margin:0">' + count + ' session' + (count === 1 ? '' : 's') + '</span>' : '') +
        '<span class="spacer" style="flex:1"></span>' +
        '<button class="tiny-btn" data-move-topic="' + esc(topic.id) + '" data-delta="-1" title="Move up">&#9650;</button>' +
        '<button class="tiny-btn" data-move-topic="' + esc(topic.id) + '" data-delta="1" title="Move down">&#9660;</button>' +
        '<button class="tiny-btn del" data-delete-topic="' + esc(topic.id) + '" ' +
          'data-name="' + esc(topic.name) + '" data-count="' + count + '" title="Delete topic">&#10005;</button>' +
        '</div>';
    }).join('');

    return '<div class="subject-block">' +
      '<div class="subject-head">' +
        '<input type="text" value="' + esc(subject.name) + '" data-rename-subject="' + esc(subject.id) + '">' +
        '<span style="flex:1"></span>' +
        '<button class="tiny-btn" data-move-subject="' + esc(subject.id) + '" data-delta="-1" title="Move up">&#9650;</button>' +
        '<button class="tiny-btn" data-move-subject="' + esc(subject.id) + '" data-delta="1" title="Move down">&#9660;</button>' +
        '<button class="tiny-btn del" data-delete-subject="' + esc(subject.id) + '" ' +
          'data-name="' + esc(subject.name) + '" title="Delete subject">&#10005;</button>' +
      '</div>' +
      '<div class="topic-rows">' +
        (topics || '<p class="hint">No topics yet.</p>') +
        '<div class="topic-row" style="margin-top:8px">' +
          '<input type="text" placeholder="New topic name" data-new-topic="' + esc(subject.id) + '">' +
          '<button class="btn secondary small" data-add-topic="' + esc(subject.id) + '">Add topic</button>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  // Bound once for the life of the view; draw() only replaces the markup.
  function bind() {
    App.dom.on(root, 'click', '[data-starter]', function () {
      App.repo.getAll().then(function (data) {
        data.subjects = App.model.starterSubjects();
        return App.repo.replaceAll(data);
      }).then(draw);
    });

    function addSubject() {
      var input = root.querySelector('[data-new-subject]');
      var name = input.value.trim();
      if (!name) return;
      App.repo.createSubject(name).then(draw);
    }
    App.dom.on(root, 'click', '[data-add-subject]', addSubject);
    App.dom.on(root, 'keydown', '[data-new-subject]', function (event) {
      if (event.key === 'Enter') addSubject();
    });

    App.dom.on(root, 'click', '[data-add-topic]', function (event, button) {
      var subjectId = button.getAttribute('data-add-topic');
      var input = root.querySelector('[data-new-topic="' + subjectId + '"]');
      var name = input.value.trim();
      if (!name) return;
      App.repo.createTopic(subjectId, name).then(draw);
    });

    App.dom.on(root, 'keydown', '[data-new-topic]', function (event, input) {
      if (event.key !== 'Enter') return;
      var name = input.value.trim();
      if (!name) return;
      App.repo.createTopic(input.getAttribute('data-new-topic'), name).then(draw);
    });

    // Renames save on blur so typing is never interrupted by a redraw.
    App.dom.on(root, 'change', '[data-rename-subject]', function (event, input) {
      var name = input.value.trim();
      if (!name) return draw();
      App.repo.renameSubject(input.getAttribute('data-rename-subject'), name)
        .then(function () { App.dom.toast('Subject renamed'); });
    });

    App.dom.on(root, 'change', '[data-rename-topic]', function (event, input) {
      var name = input.value.trim();
      if (!name) return draw();
      App.repo.renameTopic(input.getAttribute('data-rename-topic'), name)
        .then(function () { App.dom.toast('Topic renamed'); });
    });

    App.dom.on(root, 'click', '[data-move-subject]', function (event, button) {
      App.repo.moveSubject(button.getAttribute('data-move-subject'),
        Number(button.getAttribute('data-delta'))).then(draw);
    });

    App.dom.on(root, 'click', '[data-move-topic]', function (event, button) {
      App.repo.moveTopic(button.getAttribute('data-move-topic'),
        Number(button.getAttribute('data-delta'))).then(draw);
    });

    App.dom.on(root, 'click', '[data-delete-topic]', function (event, button) {
      var count = Number(button.getAttribute('data-count'));
      var message = 'Delete "' + button.getAttribute('data-name') + '"?';
      if (count) message += '\n\nIts ' + count + ' study session' + (count === 1 ? '' : 's') +
        ' will be deleted too, and it will be removed from any exam that uses it.';
      if (!window.confirm(message)) return;
      App.repo.deleteTopic(button.getAttribute('data-delete-topic')).then(draw);
    });

    App.dom.on(root, 'click', '[data-delete-subject]', function (event, button) {
      var message = 'Delete the subject "' + button.getAttribute('data-name') + '"?' +
        '\n\nAll of its topics, their study sessions, and their place in any exam will be deleted too.';
      if (!window.confirm(message)) return;
      App.repo.deleteSubject(button.getAttribute('data-delete-subject')).then(draw);
    });
  }

  bind();
  return draw();
};
