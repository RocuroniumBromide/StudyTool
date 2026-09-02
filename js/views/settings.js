/* Settings: how long until a topic comes back.
   The numbers are deliberately plain and editable - no hidden algorithm, and
   nothing here profiles you. What adapts is each topic, from your own ratings. */
window.App = window.App || {};
App.views = App.views || {};

App.views.settings = function (root) {
  var esc = App.dom.esc;

  function draw() {
    return App.repo.getMeta().then(function (meta) {
      root.innerHTML =
        '<p><a href="#/">&larr; Home</a></p>' +
        '<h1>Study schedule</h1>' +
        '<p class="hint">How many days until a topic is due again, based on the ' +
        'confidence you gave it.</p>' +

        '<form data-settings-form novalidate>' +
          '<div class="card">' +
            App.format.CONFIDENCE.map(function (level) {
              return '<div class="setting-row">' +
                '<label for="int_' + level.value + '">' +
                  '<span class="pill conf-' + level.band + '">' + esc(level.label) + '</span>' +
                '</label>' +
                '<input type="number" id="int_' + level.value + '" min="1" max="365" step="1" ' +
                  'data-interval="' + level.value + '" value="' + esc(meta.intervals[level.value]) + '">' +
                '<span class="muted">days</span>' +
                '</div>';
            }).join('') +

            '<div class="setting-row" style="margin-top:14px">' +
              '<label for="int_max"><strong>Maximum interval</strong></label>' +
              '<input type="number" id="int_max" min="1" max="3650" step="1" ' +
                'data-max-interval value="' + esc(meta.maxInterval) + '">' +
              '<span class="muted">days</span>' +
            '</div>' +
            '<p class="hint" style="margin-top:6px">Nothing is ever scheduled further ' +
            'out than this, so a well-known topic cannot disappear past an exam.</p>' +
          '</div>' +

          '<p class="error" data-error hidden></p>' +
          '<div class="form-actions">' +
            '<button type="submit" class="btn">Save</button>' +
            '<button type="button" class="btn secondary" data-reset>Reset to defaults</button>' +
          '</div>' +
        '</form>' +

        rulesCard();

      bind();
    });
  }

  /* Written out because a scheduler you cannot predict is one you stop
     trusting, and a rule you cannot see is one you argue with. */
  function rulesCard() {
    return '<div class="section-head"><h2>How the dates are worked out</h2></div>' +
      '<div class="card">' +
        '<p class="hint">Every time you record a session, the next due date is set by ' +
        'one of three rules:</p>' +
        '<ol class="rules">' +
          '<li><strong>Rated Very low or Low</strong> &ndash; back to the bottom of the ' +
          'ladder. How late you were tells us nothing extra; the rating already said it.</li>' +
          '<li><strong>Rated Medium or High, on time or late</strong> &ndash; the next gap ' +
          'is the larger of your interval above and the gap you just survived. Recalling ' +
          'something after 30 days is evidence of 30-day retention, so it counts.</li>' +
          '<li><strong>Rated Medium or High but reviewed early</strong> &ndash; the due date ' +
          'does not move. Studying early is always fine, but recalling something you had ' +
          'not begun to forget has not demonstrated anything new.</li>' +
        '</ol>' +
        '<p class="hint">Changing the numbers above re-dates every topic straight away, ' +
        'because due dates are worked out from your session history rather than stored.</p>' +
      '</div>';
  }

  function bind() {
    var errorBox = root.querySelector('[data-error]');

    root.querySelector('[data-settings-form]').addEventListener('submit', function (event) {
      event.preventDefault();

      var intervals = {};
      var problem = null;

      App.dom.qsa(root, '[data-interval]').forEach(function (input) {
        var value = parseInt(input.value, 10);
        if (!isFinite(value) || value < 1) problem = 'Every interval must be at least 1 day.';
        intervals[input.getAttribute('data-interval')] = value;
      });

      var maxInterval = parseInt(root.querySelector('[data-max-interval]').value, 10);
      if (!problem && (!isFinite(maxInterval) || maxInterval < 1)) {
        problem = 'The maximum interval must be at least 1 day.';
      }

      if (!problem && intervals[1] > intervals[4]) {
        problem = 'Very low should come back sooner than High, not later.';
      }

      if (problem) {
        errorBox.textContent = problem;
        errorBox.hidden = false;
        return;
      }

      App.repo.updateMeta({ intervals: intervals, maxInterval: maxInterval })
        .then(function () {
          App.dom.toast('Schedule saved');
          App.router.go('/general');
        });
    });

    root.querySelector('[data-reset]').addEventListener('click', function () {
      App.repo.updateMeta({
        intervals: App.model.emptyMeta().intervals,
        maxInterval: App.model.DEFAULT_MAX_INTERVAL
      }).then(function () {
        App.dom.toast('Defaults restored');
        draw();
      });
    });
  }

  return draw();
};
