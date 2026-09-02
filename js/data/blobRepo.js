/* The repository logic, written once.
   It works on the whole database as a single object and delegates only two
   things to a backend: how to load it and how to save it. localStorage and the
   server API are both just backends, so the rules below cannot drift apart. */
window.App = window.App || {};

App.BlobRepo = (function () {
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  /**
   * backend.load()      -> Promise of the stored object (or null when empty)
   * backend.save(data)  -> Promise, resolved once the data is safely stored
   */
  function create(backend) {
    var ready = null;

    /** Loads once, then reuses the in-memory copy. */
    function db() {
      if (!ready) {
        ready = Promise.resolve(backend.load()).then(function (raw) {
          return App.model.normalise(raw || App.model.emptyData());
        });
      }
      return ready;
    }

    /** Persist, then hand back a copy so callers cannot mutate our cache. */
    function commit(data, result) {
      return Promise.resolve(backend.save(data)).then(function () {
        return result === undefined ? null : clone(result);
      });
    }

    function read(fn) {
      return db().then(function (data) { return clone(fn(data)); });
    }

    function write(fn) {
      return db().then(function (data) {
        var result = fn(data);
        return commit(data, result);
      });
    }

    /* ---------- lookups inside the loaded database ---------- */

    function findSubject(data, id) {
      return data.subjects.filter(function (s) { return s.id === id; })[0] || null;
    }

    function findTopic(data, id) {
      var found = null;
      data.subjects.forEach(function (subject) {
        subject.topics.forEach(function (topic) {
          if (topic.id === id) found = { subject: subject, topic: topic };
        });
      });
      return found;
    }

    function findExam(data, id) {
      return data.exams.filter(function (e) { return e.id === id; })[0] || null;
    }

    function reindex(list) { list.forEach(function (item, i) { item.order = i; }); }

    function move(list, index, delta) {
      var target = index + delta;
      if (index < 0 || target < 0 || target >= list.length) return false;
      list.splice(target, 0, list.splice(index, 1)[0]);
      reindex(list);
      return true;
    }

    function byOrder(a, b) { return a.order - b.order; }

    /** Remove deleted topics from exams and drop their study sessions. */
    function detachTopics(data, topicIds) {
      data.exams.forEach(function (exam) {
        exam.topicIds = exam.topicIds.filter(function (id) { return topicIds.indexOf(id) === -1; });
      });
      data.sessions = data.sessions.filter(function (s) { return topicIds.indexOf(s.topicId) === -1; });
    }

    return {
      /* ---------- whole database ---------- */
      getAll: function () { return read(function (data) { return data; }); },

      replaceAll: function (incoming) {
        ready = Promise.resolve(App.model.normalise(incoming));
        return ready.then(function (data) { return commit(data, data); });
      },

      /** Small top-level settings, e.g. when a backup was last exported. */
      updateMeta: function (patch) {
        return write(function (data) {
          Object.keys(patch).forEach(function (key) { data.meta[key] = patch[key]; });
          return data.meta;
        });
      },

      /* ---------- subjects & topics ---------- */
      listSubjects: function () {
        return read(function (data) {
          var subjects = data.subjects.slice().sort(byOrder);
          subjects.forEach(function (s) { s.topics.sort(byOrder); });
          return subjects;
        });
      },

      createSubject: function (name) {
        return write(function (data) {
          var subject = { id: App.model.newId('sub'), name: name, order: data.subjects.length, topics: [] };
          data.subjects.push(subject);
          return subject;
        });
      },

      renameSubject: function (id, name) {
        return write(function (data) {
          var subject = findSubject(data, id);
          if (subject) subject.name = name;
          return subject;
        });
      },

      moveSubject: function (id, delta) {
        return write(function (data) {
          data.subjects.sort(byOrder);
          var index = data.subjects.map(function (s) { return s.id; }).indexOf(id);
          return move(data.subjects, index, delta);
        });
      },

      deleteSubject: function (id) {
        return write(function (data) {
          var subject = findSubject(data, id);
          if (!subject) return false;
          var topicIds = subject.topics.map(function (t) { return t.id; });
          data.subjects = data.subjects.filter(function (s) { return s.id !== id; });
          reindex(data.subjects);
          detachTopics(data, topicIds);
          return true;
        });
      },

      createTopic: function (subjectId, name) {
        return write(function (data) {
          var subject = findSubject(data, subjectId);
          if (!subject) return null;
          var topic = { id: App.model.newId('top'), name: name, order: subject.topics.length };
          subject.topics.push(topic);
          return topic;
        });
      },

      renameTopic: function (id, name) {
        return write(function (data) {
          var found = findTopic(data, id);
          if (found) found.topic.name = name;
          return found ? found.topic : null;
        });
      },

      moveTopic: function (id, delta) {
        return write(function (data) {
          var found = findTopic(data, id);
          if (!found) return false;
          found.subject.topics.sort(byOrder);
          var index = found.subject.topics.map(function (t) { return t.id; }).indexOf(id);
          return move(found.subject.topics, index, delta);
        });
      },

      deleteTopic: function (id) {
        return write(function (data) {
          var found = findTopic(data, id);
          if (!found) return false;
          found.subject.topics = found.subject.topics.filter(function (t) { return t.id !== id; });
          reindex(found.subject.topics);
          detachTopics(data, [id]);
          return true;
        });
      },

      /* ---------- exams ---------- */
      listExams: function () { return read(function (data) { return data.exams; }); },

      getExam: function (id) { return read(function (data) { return findExam(data, id); }); },

      createExam: function (payload) {
        return write(function (data) {
          var exam = {
            id: App.model.newId('exam'),
            name: payload.name,
            date: payload.date,
            topicIds: payload.topicIds || [],
            passMark: typeof payload.passMark === 'number' ? payload.passMark : 50,
            score: null,
            createdAt: new Date().toISOString(),
            order: data.exams.length
          };
          data.exams.push(exam);
          return exam;
        });
      },

      updateExam: function (id, patch) {
        return write(function (data) {
          var exam = findExam(data, id);
          if (!exam) return null;
          Object.keys(patch).forEach(function (key) { exam[key] = patch[key]; });
          return exam;
        });
      },

      deleteExam: function (id) {
        return write(function (data) {
          data.exams = data.exams.filter(function (e) { return e.id !== id; });
          data.sessions = data.sessions.filter(function (s) { return s.examId !== id; });
          return true;
        });
      },

      /* ---------- study sessions ---------- */
      /** filter: { examId } - pass null for general-study sessions, omit for all. */
      listSessions: function (filter) {
        return read(function (data) {
          var sessions = data.sessions;
          if (filter && Object.prototype.hasOwnProperty.call(filter, 'examId')) {
            sessions = sessions.filter(function (s) { return s.examId === filter.examId; });
          }
          if (filter && filter.topicId) {
            sessions = sessions.filter(function (s) { return s.topicId === filter.topicId; });
          }
          return sessions;
        });
      },

      createSession: function (payload) {
        return write(function (data) {
          var session = {
            id: App.model.newId('ses'),
            examId: payload.examId || null,
            topicId: payload.topicId,
            date: payload.date,
            confidence: Number(payload.confidence),
            notes: payload.notes || '',
            quizzes: (payload.quizzes || []).map(function (q) {
              return { type: q.type, correct: Number(q.correct), total: Number(q.total) };
            }),
            createdAt: new Date().toISOString()
          };
          data.sessions.push(session);
          return session;
        });
      },

      deleteSession: function (id) {
        return write(function (data) {
          data.sessions = data.sessions.filter(function (s) { return s.id !== id; });
          return true;
        });
      }
    };
  }

  return { create: create };
})();
