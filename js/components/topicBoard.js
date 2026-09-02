/* The study-session board: grey chips for topics with no sessions yet, then a
   coloured card per studied topic. Shared by exam study and general study. */
window.App = window.App || {};
App.components = App.components || {};

App.components.topicBoard = (function () {
  var esc = App.dom.esc;
  var fmt = App.format;

  function quizBadge(quiz) {
    return '<span class="quiz-badge">' + esc(quiz.type) +
      '<span class="val conf-' + fmt.scoreBand(quiz.fraction) + '">' +
      fmt.percent(quiz.fraction) + '</span></span>';
  }

  function sessionQuizBadges(session) {
    return (session.quizzes || [])
      .filter(function (quiz) { return quiz.total > 0; })
      .slice()
      .sort(function (a, b) {
        return fmt.QUIZ_TYPES.indexOf(a.type) - fmt.QUIZ_TYPES.indexOf(b.type);
      })
      .map(function (quiz) {
        return quizBadge({ type: quiz.type, fraction: quiz.correct / quiz.total });
      })
      .join('');
  }

  /* Loud when something is owed, quiet when it is not - the point of the
     board is to answer "what now", not to narrate every topic's timetable. */
  function dueBadge(entry) {
    if (!entry.due || entry.dueIn === null) return '';
    if (entry.dueIn < 0) {
      return '<span class="due-badge overdue">' +
        esc(App.dates.days(Math.abs(entry.dueIn))) + ' overdue</span>';
    }
    if (entry.dueIn === 0) return '<span class="due-badge today">Due today</span>';
    return '<span class="due-badge upcoming">Due in ' + esc(App.dates.days(entry.dueIn)) + '</span>';
  }

  function addButton(entry, options) {
    return '<a class="icon-btn" href="' + esc(options.sessionHref(entry.topic.id)) +
      '" title="Record a session for ' + esc(entry.topic.name) + '" aria-label="Record a session for ' +
      esc(entry.topic.name) + '">+</a>';
  }

  function chip(entry, options) {
    return '<div class="topic-chip">' +
      '<span>' + esc(entry.topic.name) + ' (' + esc(entry.topic.subjectName) + ')</span>' +
      addButton(entry, options) +
      '</div>';
  }

  function sessionRow(session, entry) {
    var confidence = fmt.confidence(session.confidence);
    var wasEarly = entry.earlyIds && entry.earlyIds[session.id];
    return '<div class="session-row">' +
      '<span class="session-when">' + esc(App.dates.relative(session.date)) +
        '<span class="date">(' + esc(App.dates.toDisplay(session.date)) + ')</span></span>' +
      // Say why an early review changed nothing, rather than leaving the
      // unmoved due date looking like a bug.
      (wasEarly ? '<span class="early-note">reviewed early &ndash; schedule unchanged</span>' : '') +
      '<span class="spacer"></span>' +
      sessionQuizBadges(session) +
      '<span class="pill conf-' + (confidence ? confidence.band : 'grey') + '">' +
        esc(confidence ? confidence.label : '') + ' confidence</span>' +
      '<button class="x-btn" data-delete-session="' + esc(session.id) + '" ' +
        'title="Delete this session" aria-label="Delete this session">&#10005;</button>' +
      (session.notes ? '<p class="session-note">' + esc(session.notes) + '</p>' : '') +
      '</div>';
  }

  function card(entry, options) {
    var count = entry.sessions.length;
    return '<div class="topic-card conf-' + entry.band + '">' +
      '<div class="topic-card-head">' +
        '<div>' +
          '<div class="topic-card-title">' + esc(entry.topic.name) + ' (' + esc(entry.topic.subjectName) + ')</div>' +
          '<div class="topic-card-sub">' + count + ' session' + (count === 1 ? '' : 's') + '</div>' +
        '</div>' +
        '<div class="topic-card-tools">' +
          dueBadge(entry) +
          entry.quizzes.map(quizBadge).join('') +
          addButton(entry, options) +
        '</div>' +
      '</div>' +
      '<div class="session-list">' + entry.sessions.map(function (session) {
        return sessionRow(session, entry);
      }).join('') + '</div>' +
      '</div>';
  }

  /**
   * entries: output of App.model.buildBoard
   * options.sessionHref(topicId): route for the + button
   */
  function render(entries, options) {
    if (!entries.length) {
      return '<div class="empty">No topics selected yet.</div>';
    }
    var chips = entries.filter(function (entry) { return !entry.latest; });
    var cards = entries.filter(function (entry) { return entry.latest; });

    var html = '';
    if (chips.length) {
      html += '<div class="chip-grid">' + chips.map(function (entry) {
        return chip(entry, options);
      }).join('') + '</div>';
    }
    html += cards.map(function (entry) { return card(entry, options); }).join('');
    return html;
  }

  return { render: render, quizBadge: quizBadge };
})();
