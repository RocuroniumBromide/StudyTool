/* Homepage: pick a mode, see a quick summary, keep a backup. */
window.App = window.App || {};
App.views = App.views || {};

App.views.home = function (root) {
  var esc = App.dom.esc;
  var hosted = App.config.storage === 'remote';

  /* Nudge for a fresh export once a backup is this old, so a long gap between
     terms does not quietly turn into a year with no copy of your data. */
  var BACKUP_STALE_DAYS = 28;

  return App.repo.getAll().then(function (data) {
    var topics = App.model.flattenTopics(data.subjects);
    var recent = data.sessions.filter(function (session) {
      return App.dates.daysFromToday(session.date) > -7;
    });
    var upcoming = data.exams
      .filter(function (exam) { return exam.date && !App.dates.isPast(exam.date); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];

    root.innerHTML =
      '<h1>StudyTool</h1>' +
      '<p class="hint">Track what you have studied, how confident you feel and how you scored.</p>' +

      '<div class="mode-grid">' +
        modeCard('#/general', 'General study', 'Log sessions against your whole topic list, outside of any exam.') +
        modeCard('#/exams', 'Exam study', 'Build an exam from your topics and track your revision against the date.') +
        modeCard('#/topics', 'Topic editor', 'Manage the subjects and topics that both modes draw from.') +
      '</div>' +

      '<div class="stat-row">' +
        stat(topics.length, 'topics') +
        stat(data.sessions.length, 'sessions logged') +
        stat(recent.length, 'sessions this week') +
        stat(data.exams.length, 'exams') +
      '</div>' +

      (upcoming
        ? '<p class="meta-line" style="margin-top:22px">' + App.dom.icons.clock +
          'Next exam: <a href="#/exams/' + esc(upcoming.id) + '">' + esc(upcoming.name) + '</a> - ' +
          esc(App.dates.relative(upcoming.date)) + '</p>'
        : '') +

      '<div class="section-head"><h2>Your data</h2></div>' +
      dataCard(data.meta) +
      (hosted ? signOut() : '');

    bindBackup(root);
  });

  function modeCard(href, title, description) {
    return '<a class="mode-card" href="' + href + '">' +
      '<h3>' + esc(title) + '</h3><p>' + esc(description) + '</p></a>';
  }

  function stat(number, caption) {
    return '<div class="stat"><div class="num">' + number + '</div>' +
      '<div class="cap">' + esc(caption) + '</div></div>';
  }

  function backupStatus(meta) {
    if (!meta.lastBackupAt) {
      return { stale: true, text: 'You have never exported a backup.' };
    }
    var age = -App.dates.daysFromToday(meta.lastBackupAt);
    return {
      stale: age >= BACKUP_STALE_DAYS,
      text: 'Last backup: ' + App.dates.toDisplay(meta.lastBackupAt) +
        ' (' + App.dates.relative(meta.lastBackupAt) + ').'
    };
  }

  function dataCard(meta) {
    var status = backupStatus(meta);
    var where = hosted
      ? 'Your data is on the StudyTool server, so it follows you between your laptop and iPad.'
      : 'Everything is stored in this browser only, on this device.';

    return '<div class="card">' +
      '<p class="hint">' + esc(where) + '</p>' +
      (status.stale ? nudge(status) : '<p class="hint">' + esc(status.text) + '</p>') +
      '<div class="row-gap">' +
        '<button class="btn ' + (status.stale ? '' : 'secondary ') + 'small" data-export>Export backup</button>' +
        '<button class="btn secondary small" data-import>Import backup</button>' +
        '<input type="file" accept="application/json" data-import-file hidden>' +
      '</div>' +
      '</div>';
  }

  function nudge(status) {
    return '<div class="nudge">' +
      '<strong>Time for a backup.</strong> ' + esc(status.text) +
      ' Export a copy and keep it in OneDrive - then nothing that happens to this ' +
      'app, or to the server hosting it, can cost you your study history.' +
      '</div>';
  }

  function signOut() {
    return '<form method="post" action="/logout" style="margin-top:16px">' +
      '<button type="submit" class="btn secondary small">Sign out</button>' +
      '</form>';
  }

  function bindBackup(container) {
    var fileInput = container.querySelector('[data-import-file]');

    container.querySelector('[data-export]').addEventListener('click', function () {
      App.repo.getAll().then(function (data) {
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'studytool-backup-' + App.dates.today() + '.json';
        link.click();
        URL.revokeObjectURL(link.href);
        // Recorded in the database itself, so the reminder is consistent
        // whichever device you export from.
        return App.repo.updateMeta({ lastBackupAt: App.dates.today() });
      }).then(function () {
        App.dom.toast('Backup downloaded');
        App.router.refresh();
      });
    });

    container.querySelector('[data-import]').addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      if (!window.confirm('Importing replaces everything currently stored. Continue?')) {
        fileInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (error) {
          window.alert('That file could not be read as a StudyTool backup.');
          return;
        }
        App.repo.replaceAll(parsed).then(function () {
          App.dom.toast('Backup imported');
          App.router.refresh();
        });
      };
      reader.readAsText(file);
    });
  }
};
