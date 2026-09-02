/* Storage backend: the StudyTool server.
   The whole database is fetched once and written back after every change.
   A revision number travels with it, so if the same account is open on two
   devices the second one is told to reload rather than quietly overwriting
   what the first one saved. */
window.App = window.App || {};

App.RemoteRepo = (function () {
  function backend(options) {
    var baseUrl = (options && options.baseUrl) || '/api';
    var revision = null;
    var warned = false;

    function goToLogin() {
      // Path only, so the server can check it points back into this site.
      var here = window.location.pathname + window.location.search + window.location.hash;
      window.location.href = '/login?next=' + encodeURIComponent(here);
    }

    function request(method, path, body) {
      return fetch(baseUrl + path, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
        cache: 'no-store'
      }).then(function (response) {
        if (response.status === 401) {
          goToLogin();
          throw new Error('Signed out');
        }
        if (response.status === 409) {
          window.alert('This page is out of date.\n\n' +
            'StudyTool was changed on another device since you opened this page, so ' +
            'your last change was not saved. The page will now reload with the latest data.');
          window.location.reload();
          throw new Error('Out of date');
        }
        if (!response.ok) throw new Error('The server returned an error (' + response.status + ').');
        return response.json();
      });
    }

    return {
      load: function () {
        return request('GET', '/data').then(function (payload) {
          revision = payload.revision;
          return payload.data;
        });
      },

      save: function (data) {
        return request('PUT', '/data', { revision: revision, data: data })
          .then(function (payload) {
            revision = payload.revision;
          })
          .catch(function (error) {
            // A reload or redirect is already under way for 401 / 409.
            if (error.message === 'Signed out' || error.message === 'Out of date') throw error;
            console.error('Could not save to the server', error);
            if (!warned) {
              warned = true;
              window.alert('StudyTool could not save your change.\n\n' +
                'You may be offline. Check your connection and reload the page - ' +
                'anything you changed since the last successful save will need redoing.');
            }
            throw error;
          });
      }
    };
  }

  function create(options) { return App.BlobRepo.create(backend(options)); }

  return { create: create };
})();
