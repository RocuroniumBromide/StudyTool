/* Quiz scores entered as a fraction (e.g. 1 / 6) and shown back as a
   percentage everywhere else in the app. Any number of scores per session. */
window.App = window.App || {};
App.components = App.components || {};

App.components.quizEditor = (function () {
  var esc = App.dom.esc;

  function rowHtml(quiz) {
    var value = quiz || { type: App.format.QUIZ_TYPES[0], correct: '', total: '' };
    var options = App.format.QUIZ_TYPES.map(function (type) {
      return '<option value="' + esc(type) + '"' +
        (type === value.type ? ' selected' : '') + '>' + esc(type) + '</option>';
    }).join('');

    return '<div class="quiz-row" data-quiz-row>' +
      '<select data-quiz-type aria-label="Quiz type">' + options + '</select>' +
      '<input type="number" min="0" step="any" data-quiz-correct placeholder="Score" ' +
        'aria-label="Marks scored" value="' + esc(value.correct) + '">' +
      '<span class="slash">/</span>' +
      '<input type="number" min="0" step="any" data-quiz-total placeholder="Total" ' +
        'aria-label="Marks available" value="' + esc(value.total) + '">' +
      '<span class="pct" data-quiz-pct></span>' +
      '<button type="button" class="tiny-btn del" data-quiz-remove title="Remove this score">&#10005;</button>' +
      '</div>';
  }

  function render() {
    return '<div class="field">' +
      '<span class="field-label">Add quiz scores (optional):</span>' +
      '<p class="hint">Enter the fraction you scored - it is shown as a percentage on the topic.</p>' +
      '<div class="quiz-rows" data-quiz-rows></div>' +
      '<button type="button" class="btn secondary small" data-quiz-add>+ Add quiz score</button>' +
      '</div>';
  }

  function updatePercent(row) {
    var correct = parseFloat(row.querySelector('[data-quiz-correct]').value);
    var total = parseFloat(row.querySelector('[data-quiz-total]').value);
    var out = row.querySelector('[data-quiz-pct]');
    out.textContent = (isNaN(correct) || isNaN(total) || total <= 0)
      ? ''
      : App.format.percent(correct / total);
  }

  function bind(root) {
    var rows = root.querySelector('[data-quiz-rows]');
    if (!rows) return;

    root.querySelector('[data-quiz-add]').addEventListener('click', function () {
      rows.insertAdjacentHTML('beforeend', rowHtml(null));
      var added = rows.lastElementChild;
      added.querySelector('[data-quiz-correct]').focus();
    });

    App.dom.on(rows, 'click', '[data-quiz-remove]', function (event, button) {
      button.closest('[data-quiz-row]').remove();
    });

    App.dom.on(rows, 'input', 'input', function (event, input) {
      updatePercent(input.closest('[data-quiz-row]'));
    });
  }

  /** Completed rows only; an unfinished row is ignored rather than saved as 0. */
  function value(root) {
    return App.dom.qsa(root, '[data-quiz-row]').map(function (row) {
      return {
        type: row.querySelector('[data-quiz-type]').value,
        correct: parseFloat(row.querySelector('[data-quiz-correct]').value),
        total: parseFloat(row.querySelector('[data-quiz-total]').value)
      };
    }).filter(function (quiz) {
      return !isNaN(quiz.correct) && !isNaN(quiz.total) && quiz.total > 0;
    });
  }

  /** Message describing the first invalid row, or null when everything is fine. */
  function validate(root) {
    var problem = null;
    App.dom.qsa(root, '[data-quiz-row]').forEach(function (row) {
      if (problem) return;
      var correctRaw = row.querySelector('[data-quiz-correct]').value.trim();
      var totalRaw = row.querySelector('[data-quiz-total]').value.trim();
      if (!correctRaw && !totalRaw) return;               // blank row, ignored
      var correct = parseFloat(correctRaw);
      var total = parseFloat(totalRaw);
      if (isNaN(correct) || isNaN(total) || total <= 0) {
        problem = 'Each quiz score needs a mark and a total greater than zero.';
      } else if (correct > total) {
        problem = 'A quiz score cannot be higher than the total.';
      } else if (correct < 0) {
        problem = 'A quiz score cannot be negative.';
      }
    });
    return problem;
  }

  return { render: render, bind: bind, value: value, validate: validate };
})();
