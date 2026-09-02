/* Storage backend: this browser's localStorage.
   Used when the app is opened straight from a file, with no server behind it. */
window.App = window.App || {};

App.LocalRepo = (function () {
  var STORAGE_KEY = 'studytool.data.v1';

  function backend() {
    var warned = false;

    return {
      load: function () {
        var raw = null;
        try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      },

      save: function (data) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
          console.error('Could not save to localStorage', e);
          // Silently losing a study session would be worse than an interruption,
          // so say so once rather than on every keystroke.
          if (!warned) {
            warned = true;
            window.alert('StudyTool could not save your changes.\n\n' +
              'Browser storage is unavailable or full, so anything you do now will be ' +
              'lost when you close the page.');
          }
        }
      }
    };
  }

  function create() { return App.BlobRepo.create(backend()); }

  return { create: create, STORAGE_KEY: STORAGE_KEY };
})();
