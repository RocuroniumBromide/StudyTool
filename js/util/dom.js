/* Small DOM helpers shared by every view. Kept dependency-free on purpose. */
window.App = window.App || {};

App.dom = (function () {
  /** Escape a value for safe interpolation into an HTML template string. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Delegated listener: fires when the event target is inside `selector`. */
  function on(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (event) {
      var match = event.target.closest(selector);
      if (match && root.contains(match)) handler(event, match);
    });
  }

  function qs(root, selector) { return root.querySelector(selector); }
  function qsa(root, selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); }

  /** Brief confirmation message, bottom of the screen. */
  function toast(message) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  var icons = {
    clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z"/></svg>'
  };

  return { esc: esc, on: on, qs: qs, qsa: qsa, toast: toast, icons: icons };
})();
