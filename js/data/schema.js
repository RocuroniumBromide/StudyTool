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

  function emptyMeta() {
    return { lastBackupAt: null };
  }

  /** Defensive fill-in so a hand-edited or older export still loads. */
  function normalise(raw) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var out = emptyData();

    out.meta = {
      lastBackupAt: (data.meta && data.meta.lastBackupAt) || null
    };

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
   * One board entry per topic: its sessions (newest first), the confidence
   * of the most recent session and the latest quiz score per type.
   */
  function buildBoard(topics, sessions) {
    var grouped = {};
    sessions.forEach(function (session) {
      (grouped[session.topicId] = grouped[session.topicId] || []).push(session);
    });

    var entries = topics.map(function (topic) {
      var list = sortSessionsDesc(grouped[topic.id] || []);
      var latest = list[0] || null;
      return {
        topic: topic,
        sessions: list,
        latest: latest,
        confidence: latest ? latest.confidence : null,
        band: latest ? App.format.confidenceBand(latest.confidence) : 'grey',
        lastStudied: latest ? latest.date : null,
        quizzes: latestQuizzes(list)
      };
    });

    // Weakest work first: unstudied, then lowest confidence, then least recent.
    entries.sort(function (a, b) {
      if (!a.latest && !b.latest) return 0;
      if (!a.latest) return -1;
      if (!b.latest) return 1;
      if (a.confidence !== b.confidence) return a.confidence - b.confidence;
      if (a.lastStudied !== b.lastStudied) return a.lastStudied < b.lastStudied ? -1 : 1;
      return 0;
    });

    return entries;
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
    newId: newId,
    emptyData: emptyData,
    normalise: normalise,
    starterSubjects: starterSubjects,
    flattenTopics: flattenTopics,
    topicIndex: topicIndex,
    sortSessionsDesc: sortSessionsDesc,
    latestQuizzes: latestQuizzes,
    buildBoard: buildBoard,
    bandTotals: bandTotals
  };
})();
