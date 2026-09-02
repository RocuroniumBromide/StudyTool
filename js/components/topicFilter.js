/* One mutually-exclusive filter row for the topic board.
   Deliberately not two independent filters: combining confidence with due
   state produces queries you never want and empty results you cannot tell
   apart from a bug. You only ever want one of these questions at a time.

   The choice is held by the view and reset on every visit - a sticky "Due"
   filter you have forgotten about is a very good way to open the app, see
   three cards, and conclude you are on top of things. */
window.App = window.App || {};
App.components = App.components || {};

App.components.topicFilter = (function () {
  var esc = App.dom.esc;

  var FILTERS = [
    {
      id: 'all',
      label: 'All',
      match: function () { return true; },
      empty: 'No topics yet.'
    },
    {
      id: 'due',
      label: 'Due',
      match: function (entry) { return entry.latest && entry.dueIn !== null && entry.dueIn <= 0; },
      empty: 'Nothing is due. Everything you have studied is still inside its interval.'
    },
    {
      id: 'new',
      label: 'Not started',
      match: function (entry) { return !entry.latest; },
      empty: 'Every topic has at least one session.'
    },
    {
      id: 'low',
      label: 'Low',
      match: function (entry) { return entry.band === 'red'; },
      empty: 'Nothing is sitting at low confidence.'
    },
    {
      id: 'medium',
      label: 'Medium',
      match: function (entry) { return entry.band === 'yellow'; },
      empty: 'Nothing is sitting at medium confidence.'
    },
    {
      id: 'high',
      label: 'High',
      match: function (entry) { return entry.band === 'green'; },
      empty: 'Nothing is at high confidence yet.'
    }
  ];

  function find(id) {
    return FILTERS.filter(function (filter) { return filter.id === id; })[0] || FILTERS[0];
  }

  /** Subtracts only - the board keeps its due-first ordering. */
  function apply(entries, id) {
    return entries.filter(find(id).match);
  }

  /**
   * Counts always describe the whole board, not the filtered view, and every
   * pill is rendered even at zero so the row does not reshuffle under you.
   */
  function render(entries, activeId) {
    var pills = FILTERS.map(function (filter) {
      var count = entries.filter(filter.match).length;
      var active = filter.id === activeId;
      var classes = 'filter-pill' + (active ? ' active' : '') + (!count && !active ? ' empty' : '');
      return '<button class="' + classes + '" data-filter="' + esc(filter.id) + '"' +
        (!count && !active ? ' disabled' : '') + '>' +
        esc(filter.label) + ' <span class="count">' + count + '</span></button>';
    }).join('');

    return '<div class="filter-row" role="group" aria-label="Filter topics">' + pills + '</div>';
  }

  function emptyMessage(id) {
    return '<div class="empty"><p>' + esc(find(id).empty) + '</p>' +
      (id === 'all' ? '' : '<button class="btn secondary small" data-filter="all">Show all topics</button>') +
      '</div>';
  }

  return { apply: apply, render: render, emptyMessage: emptyMessage };
})();
