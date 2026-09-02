/* Confidence bar: one slice per topic, green -> yellow -> red, with the
   remaining grey showing topics that have not been studied yet. */
window.App = window.App || {};
App.components = App.components || {};

App.components.progressBar = function (entries) {
  var totals = App.model.bandTotals(entries);
  if (!totals.total) return '<div class="progress"></div>';

  var order = [
    { band: 'green', count: totals.green, label: 'high confidence' },
    { band: 'yellow', count: totals.yellow, label: 'medium confidence' },
    { band: 'red', count: totals.red, label: 'low confidence' }
  ];

  var segments = order
    .filter(function (part) { return part.count > 0; })
    .map(function (part) {
      var width = (part.count / totals.total) * 100;
      return '<span class="seg-' + part.band + '" style="width:' + width.toFixed(4) + '%" ' +
        'title="' + part.count + ' of ' + totals.total + ' topics at ' + part.label + '"></span>';
    })
    .join('');

  return '<div class="progress" role="img" aria-label="' +
    totals.green + ' topics high, ' + totals.yellow + ' medium, ' + totals.red +
    ' low, ' + totals.grey + ' not studied">' + segments + '</div>';
};
