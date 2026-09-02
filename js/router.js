/* Hash router. Hash routes keep the app working straight from the file system
   today, and still map cleanly onto real URLs if it is ever hosted. */
window.App = window.App || {};

App.router = (function () {
  var routes = [];
  var outlet = null;

  function define(list) { routes = list; }

  function parseHash() {
    var raw = window.location.hash.replace(/^#/, '') || '/';
    var split = raw.indexOf('?');
    var path = split === -1 ? raw : raw.slice(0, split);
    var query = {};
    if (split !== -1) {
      new URLSearchParams(raw.slice(split + 1)).forEach(function (value, key) {
        query[key] = value;
      });
    }
    if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
    return { path: path, query: query };
  }

  function match(path) {
    for (var i = 0; i < routes.length; i++) {
      var found = routes[i].pattern.exec(path);
      if (found) {
        var params = {};
        (routes[i].keys || []).forEach(function (key, index) {
          params[key] = decodeURIComponent(found[index + 1]);
        });
        return { route: routes[i], params: params };
      }
    }
    return null;
  }

  function highlightNav(path) {
    App.dom.qsa(document, '.topnav a').forEach(function (link) {
      var target = link.getAttribute('href').replace(/^#/, '');
      var active = path === target || path.indexOf(target + '/') === 0;
      link.classList.toggle('active', active);
    });
  }

  function render() {
    var parsed = parseHash();
    var hit = match(parsed.path);
    highlightNav(parsed.path);
    window.scrollTo(0, 0);

    // Each render gets a brand new host element, so any listeners a view
    // attached to its root leave with it instead of piling up on #app.
    outlet.innerHTML = '';
    var host = document.createElement('div');
    outlet.appendChild(host);

    if (!hit) {
      host.innerHTML = '<h1>Page not found</h1><p><a href="#/">Back to the homepage</a></p>';
      return;
    }

    Promise.resolve(hit.route.view(host, hit.params, parsed.query)).catch(function (error) {
      console.error(error);
      host.innerHTML = '<h1>Something went wrong</h1><p class="error">' +
        App.dom.esc(error.message || error) + '</p>';
    });
  }

  function start(element) {
    outlet = element;
    window.addEventListener('hashchange', render);
    render();
  }

  /** Navigate; re-renders even when the target is the current route. */
  function go(path) {
    if (window.location.hash === '#' + path) render();
    else window.location.hash = path;
  }

  function refresh() { render(); }

  return { define: define, start: start, go: go, refresh: refresh };
})();
