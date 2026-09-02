/* Subject / topic checkbox tree used when creating or editing an exam.
   The subject checkbox selects everything under it and shows a mixed state
   when only some of its topics are ticked. */
window.App = window.App || {};
App.components = App.components || {};

App.components.topicPicker = (function () {
  var esc = App.dom.esc;

  function render(subjects, selectedIds) {
    if (!subjects.length) {
      return '<div class="empty">No topics yet. Add some in the ' +
        '<a href="#/topics">topic editor</a> first.</div>';
    }

    var selected = selectedIds || [];

    return '<div class="picker" data-topic-picker>' + subjects.map(function (subject) {
      var topics = subject.topics.map(function (topic) {
        var checked = selected.indexOf(topic.id) !== -1 ? ' checked' : '';
        return '<div class="check-row">' +
          '<input type="checkbox" id="pick_' + esc(topic.id) + '" data-topic-check ' +
          'data-subject="' + esc(subject.id) + '" value="' + esc(topic.id) + '"' + checked + '>' +
          '<label for="pick_' + esc(topic.id) + '">' + esc(topic.name) + '</label>' +
          '</div>';
      }).join('');

      return '<div class="picker-subject" data-subject-block="' + esc(subject.id) + '">' +
        '<div class="check-row">' +
          '<input type="checkbox" id="picksub_' + esc(subject.id) + '" data-subject-check ' +
          'value="' + esc(subject.id) + '">' +
          '<label for="picksub_' + esc(subject.id) + '">' + esc(subject.name) + '</label>' +
        '</div>' +
        '<div class="picker-topics">' + (topics || '<p class="hint">No topics in this subject.</p>') + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /** Wire up the parent/child checkbox behaviour inside `root`. */
  function bind(root) {
    var picker = root.querySelector('[data-topic-picker]');
    if (!picker) return;

    function topicsOf(subjectId) {
      return App.dom.qsa(picker, '[data-topic-check][data-subject="' + subjectId + '"]');
    }

    function refreshSubject(subjectId) {
      var box = picker.querySelector('[data-subject-check][value="' + subjectId + '"]');
      var topics = topicsOf(subjectId);
      var checked = topics.filter(function (t) { return t.checked; }).length;
      box.checked = topics.length > 0 && checked === topics.length;
      box.indeterminate = checked > 0 && checked < topics.length;
    }

    App.dom.qsa(picker, '[data-subject-check]').forEach(function (box) {
      refreshSubject(box.value);
      box.addEventListener('change', function () {
        topicsOf(box.value).forEach(function (topic) { topic.checked = box.checked; });
        box.indeterminate = false;
      });
    });

    App.dom.on(picker, 'change', '[data-topic-check]', function (event, box) {
      refreshSubject(box.getAttribute('data-subject'));
    });
  }

  /** Ticked topic ids, in the order they appear. */
  function value(root) {
    return App.dom.qsa(root, '[data-topic-check]')
      .filter(function (box) { return box.checked; })
      .map(function (box) { return box.value; });
  }

  return { render: render, bind: bind, value: value };
})();
