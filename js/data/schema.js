/* The data shape, plus the derived values every view needs.
   Nothing in here touches storage, so the same logic works unchanged
   against localStorage today or a REST backend later. */
window.App = window.App || {};

App.model = (function () {
  var SCHEMA_VERSION = 1;

  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function emptyData() {
    return { version: SCHEMA_VERSION, meta: emptyMeta(), subjects: [], exams: [], sessions: [] };
  }

  /* Days until a topic comes back, by the confidence you gave it.
     Starting points, not settled fact - they are editable in Settings, and
     rule 2 below stretches them towards what actually works for you. */
  var DEFAULT_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 16 };
  var DEFAULT_MAX_INTERVAL = 90;

  function emptyMeta() {
    return {
      lastBackupAt: null,
      intervals: {
        1: DEFAULT_INTERVALS[1],
        2: DEFAULT_INTERVALS[2],
        3: DEFAULT_INTERVALS[3],
        4: DEFAULT_INTERVALS[4]
      },
      maxInterval: DEFAULT_MAX_INTERVAL
    };
  }

  function normaliseMeta(raw) {
    var meta = raw || {};
    var source = meta.intervals || {};
    var intervals = {};

    [1, 2, 3, 4].forEach(function (level) {
      var value = Number(source[level]);
      intervals[level] = (isFinite(value) && value >= 1)
        ? Math.round(value)
        : DEFAULT_INTERVALS[level];
    });

    var max = Number(meta.maxInterval);
    return {
      lastBackupAt: meta.lastBackupAt || null,
      intervals: intervals,
      maxInterval: (isFinite(max) && max >= 1) ? Math.round(max) : DEFAULT_MAX_INTERVAL
    };
  }

  /** Defensive fill-in so a hand-edited or older export still loads. */
  function normalise(raw) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var out = emptyData();

    out.meta = normaliseMeta(data.meta);

    out.subjects = (data.subjects || []).map(function (s, i) {
      return {
        id: s.id || newId('sub'),
        name: s.name || 'Untitled subject',
        order: typeof s.order === 'number' ? s.order : i,
        topics: (s.topics || []).map(function (t, j) {
          return {
            id: t.id || newId('top'),
            name: t.name || 'Untitled topic',
            order: typeof t.order === 'number' ? t.order : j
          };
        })
      };
    });

    out.exams = (data.exams || []).map(function (e, i) {
      return {
        id: e.id || newId('exam'),
        name: e.name || 'Untitled exam',
        date: e.date || '',
        topicIds: e.topicIds || [],
        passMark: typeof e.passMark === 'number' ? e.passMark : 50,
        score: typeof e.score === 'number' ? e.score : null,
        createdAt: e.createdAt || new Date().toISOString(),
        order: typeof e.order === 'number' ? e.order : i
      };
    });

    out.sessions = (data.sessions || []).map(function (s) {
      return {
        id: s.id || newId('ses'),
        examId: s.examId || null,
        topicId: s.topicId,
        date: s.date || '',
        confidence: Number(s.confidence) || 3,
        notes: s.notes || '',
        quizzes: (s.quizzes || []).map(function (q) {
          return { type: q.type || 'MCQ', correct: Number(q.correct) || 0, total: Number(q.total) || 0 };
        }),
        createdAt: s.createdAt || new Date().toISOString()
      };
    });

    return out;
  }

  /** Example structure offered on an empty topic editor. */
  function starterSubjects() {
    function subject(name, topics) {
      return {
        id: newId('sub'),
        name: name,
        order: 0,
        topics: topics.map(function (t, i) { return { id: newId('top'), name: t, order: i }; })
      };
    }
    var list = [
      subject('Accounting', ['Financial Reporting', 'Management Accounting', 'Audit & Assurance', 'Taxation']),
      subject('Finance', ['Corporate Finance', 'Investments', 'Financial Markets', 'Valuation']),
      subject('Quantitative Methods', ['Statistics', 'Econometrics', 'Excel & Modelling'])
    ];
    list.forEach(function (s, i) { s.order = i; });
    return list;
  }

  /* ---------------- derived ---------------- */

  function bySort(a, b) { return (a.order || 0) - (b.order || 0); }

  /** All topics as a flat list carrying their subject, in editor order. */
  function flattenTopics(subjects) {
    var out = [];
    subjects.slice().sort(bySort).forEach(function (subject) {
      subject.topics.slice().sort(bySort).forEach(function (topic) {
        out.push({
          id: topic.id,
          name: topic.name,
          subjectId: subject.id,
          subjectName: subject.name
        });
      });
    });
    return out;
  }

  function topicIndex(subjects) {
    var map = {};
    flattenTopics(subjects).forEach(function (t) { map[t.id] = t; });
    return map;
  }

  /** Newest first: by session date, then by the order they were entered. */
  function sortSessionsDesc(sessions) {
    return sessions.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  /** Most recent score per quiz type, in MCQ / SQ / WA order. */
  function latestQuizzes(sessionsDesc) {
    var seen = {};
    sessionsDesc.forEach(function (session) {
      (session.quizzes || []).forEach(function (quiz) {
        if (!seen[quiz.type] && quiz.total > 0) {
          seen[quiz.type] = { type: quiz.type, fraction: quiz.correct / quiz.total };
        }
      });
    });
    return App.format.QUIZ_TYPES
      .filter(function (type) { return seen[type]; })
      .map(function (type) { return seen[type]; });
  }

  /**
   * When is this topic next due?
   *
   * Replayed from the session history rather than stored, so editing your
   * intervals in Settings immediately re-dates everything, and there is no
   * derived field that can drift out of step with the sessions themselves.
   *
   * Two rules, applied to each session in date order:
   *
   *  1. Rated Very low or Low - reset to the bottom of the ladder, whether
   *     you were early, on time or late. This takes precedence over
   *     everything: discovering early that you have lost a topic is the most
   *     useful thing the schedule can learn, so it must act on it.
   *  2. Rated Medium or High - credit in proportion to the share of the wait
   *     you actually completed, and the due date never moves earlier.
   *
   * Rule 2 covers early, on time and late as one continuous function, because
   * that is the shape of the thing being modelled: the spacing curve is flat
   * near its optimum and retrieval strength decays smoothly, so there is no
   * point at which "early" abruptly becomes "on time". Reviewing on day 15 of
   * 16 should not be worth categorically less than day 16.
   *
   *   share    = elapsed / the wait you were scheduled to do (capped at 1)
   *   interval = max(your interval x share, elapsed)
   *   new due  = the later of the existing due date and this one
   *
   * Waiting the full time or longer gives share = 1, which reduces to
   * max(interval, elapsed) - the late bonus, unchanged. Coming back very
   * early earns a small share of a small interval, which cannot beat the date
   * already set, so the schedule holds. Break-even sits around half the wait.
   *
   * Returns the due date, plus a note per early session so the board can say
   * what happened rather than leaving an unmoved date looking like a bug.
   */
  function schedule(sessions, meta) {
    var ordered = sessions.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    });

    var due = null;
    var previousDate = null;
    var earlyNotes = {};

    ordered.forEach(function (session) {
      var dueBefore = due;
      var wasEarly = Boolean(due && session.date < due);
      var table = meta.intervals[session.confidence] || DEFAULT_INTERVALS[3];

      if (session.confidence <= 2) {
        // Rule 1. Note this may pull the due date *earlier* - that is the
        // point, you have just found out you cannot recall it.
        due = App.dates.addDays(session.date, Math.min(table, meta.maxInterval));
      } else {
        var interval;

        if (!previousDate || !due) {
          interval = table;
        } else {
          var elapsed = App.dates.daysBetween(previousDate, session.date);
          var scheduledWait = App.dates.daysBetween(previousDate, due);
          var share = scheduledWait > 0 ? Math.min(1, elapsed / scheduledWait) : 1;
          interval = Math.max(table * share, elapsed);
        }

        interval = Math.max(1, Math.round(Math.min(interval, meta.maxInterval)));
        var candidate = App.dates.addDays(session.date, interval);
        due = (due && candidate < due) ? due : candidate;
      }

      if (wasEarly) {
        earlyNotes[session.id] = session.confidence <= 2
          ? 'reset'
          : (due === dueBefore ? 'unchanged' : 'partial');
      }

      previousDate = session.date;
    });

    return { due: due, earlyNotes: earlyNotes };
  }

  /**
   * One board entry per topic: its sessions (newest first), the confidence
   * of the most recent session, the latest quiz score per type, and when it
   * is next due.
   */
  function buildBoard(topics, sessions, meta) {
    var grouped = {};
    sessions.forEach(function (session) {
      (grouped[session.topicId] = grouped[session.topicId] || []).push(session);
    });

    var settings = normaliseMeta(meta);

    var entries = topics.map(function (topic) {
      var list = sortSessionsDesc(grouped[topic.id] || []);
      var latest = list[0] || null;
      // A topic you have never studied is not "overdue" - it has no schedule
      // yet. It stays a grey chip, so entering a term's worth of topics does
      // not greet you with fifty overdue items on day one.
      var plan = latest ? schedule(list, settings) : { due: null, earlyNotes: {} };

      return {
        topic: topic,
        sessions: list,
        latest: latest,
        confidence: latest ? latest.confidence : null,
        band: latest ? App.format.confidenceBand(latest.confidence) : 'grey',
        lastStudied: latest ? latest.date : null,
        quizzes: latestQuizzes(list),
        due: plan.due,
        dueIn: plan.due ? App.dates.daysFromToday(plan.due) : null,
        earlyNotes: plan.earlyNotes
      };
    });

    // Due first, most overdue at the top. Within the not-yet-due, soonest
    // first - which lands close to weakest-first anyway, because a low
    // confidence rating earns a short interval.
    entries.sort(function (a, b) {
      if (!a.latest && !b.latest) return 0;
      if (!a.latest) return -1;
      if (!b.latest) return 1;
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      if (a.confidence !== b.confidence) return a.confidence - b.confidence;
      if (a.lastStudied !== b.lastStudied) return a.lastStudied < b.lastStudied ? -1 : 1;
      return 0;
    });

    return entries;
  }

  /** Topics due today or overdue. Never-studied topics are not counted. */
  function countDue(entries) {
    return entries.filter(function (entry) {
      return entry.latest && entry.dueIn !== null && entry.dueIn <= 0;
    }).length;
  }

  /** Share of topics in each band, for the progress bar. */
  function bandTotals(entries) {
    var totals = { green: 0, yellow: 0, red: 0, grey: 0 };
    entries.forEach(function (entry) { totals[entry.band] += 1; });
    totals.total = entries.length;
    return totals;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_INTERVALS: DEFAULT_INTERVALS,
    DEFAULT_MAX_INTERVAL: DEFAULT_MAX_INTERVAL,
    newId: newId,
    emptyData: emptyData,
    emptyMeta: emptyMeta,
    normalise: normalise,
    normaliseMeta: normaliseMeta,
    schedule: schedule,
    countDue: countDue,
    starterSubjects: starterSubjects,
    flattenTopics: flattenTopics,
    topicIndex: topicIndex,
    sortSessionsDesc: sortSessionsDesc,
    latestQuizzes: latestQuizzes,
    buildBoard: buildBoard,
    bandTotals: bandTotals
  };
})();
