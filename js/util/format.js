/* Formatting rules that the whole app shares: percentages, confidence levels
   and the red / yellow / green banding used for cards and the progress bar. */
window.App = window.App || {};

App.format = (function () {
  /** 0.1666 -> '16.67%'. Trailing zeros are trimmed: 1 -> '100%'. */
  function percent(fraction) {
    if (fraction == null || isNaN(fraction)) return '';
    var value = Math.round(fraction * 10000) / 100;
    return String(parseFloat(value.toFixed(2))) + '%';
  }

  /** correct/total as a percentage string, guarding against total = 0. */
  function scorePercent(correct, total) {
    if (!total) return '';
    return percent(correct / total);
  }

  var CONFIDENCE = [
    { value: 1, label: 'Very low', band: 'red' },
    { value: 2, label: 'Low', band: 'red' },
    { value: 3, label: 'Medium', band: 'yellow' },
    { value: 4, label: 'High', band: 'green' }
  ];

  function confidence(value) {
    return CONFIDENCE.filter(function (c) { return c.value === Number(value); })[0] || null;
  }

  function confidenceLabel(value) {
    var c = confidence(value);
    return c ? c.label : '';
  }

  /** Card / bar colour for a confidence value. */
  function confidenceBand(value) {
    var c = confidence(value);
    return c ? c.band : 'grey';
  }

  /** Colour band for a score fraction, so quiz badges read at a glance. */
  function scoreBand(fraction) {
    if (fraction == null || isNaN(fraction)) return 'grey';
    if (fraction >= 0.7) return 'green';
    if (fraction >= 0.4) return 'yellow';
    return 'red';
  }

  var QUIZ_TYPES = ['MCQ', 'SQ', 'WA'];

  return {
    percent: percent,
    scorePercent: scorePercent,
    CONFIDENCE: CONFIDENCE,
    QUIZ_TYPES: QUIZ_TYPES,
    confidence: confidence,
    confidenceLabel: confidenceLabel,
    confidenceBand: confidenceBand,
    scoreBand: scoreBand
  };
})();
