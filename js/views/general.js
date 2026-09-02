/* General study: the same board as an exam, but across every topic you have
   and counting every session, whether it was logged here or under an exam. */
window.App = window.App || {};
App.views = App.views || {};

App.views.general = function (root) {
  function draw() {
    return App.repo.getAll().then(function (data) {
      var topics = App.model.flattenTopics(data.subjects);

      if (!topics.length) {
        root.innerHTML = '<h1>General study</h1>' +
          '<div class="empty"><p>You have no topics yet.</p>' +
          '<p><a class="btn small" href="#/topics">Open the topic editor</a></p></div>';
        return;
      }

      var entries = App.model.buildBoard(topics, data.sessions, data.meta);
      var due = App.model.countDue(entries);

      root.innerHTML =
        '<div class="page-head"><h1>General study</h1>' +
          '<span style="flex:1"></span>' +
          '<a class="btn secondary small" href="#/settings">Schedule settings</a>' +
        '</div>' +
        '<p class="hint">' +
          (due
            ? '<strong>' + due + ' topic' + (due === 1 ? '' : 's') + ' due.</strong> '
            : 'Nothing due. ') +
          'Due first, then everything else soonest-first.</p>' +
        App.components.progressBar(entries) +
        '<div class="section-head">' +
          '<h2>Study sessions</h2>' +
          '<a class="btn" href="#/general/session">Record new study session</a>' +
        '</div>' +
        App.components.topicBoard.render(entries, {
          sessionHref: function (topicId) { return '#/general/session?topic=' + topicId; }
        });
    });
  }

  // Bound once for the life of the view; draw() only replaces the markup.
  App.dom.on(root, 'click', '[data-delete-session]', function (event, button) {
    App.repo.deleteSession(button.getAttribute('data-delete-session')).then(function () {
      App.dom.toast('Session deleted');
      draw();
    });
  });

  return draw();
};
