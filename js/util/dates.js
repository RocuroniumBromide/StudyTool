/* Date helpers. Dates are stored as plain local 'YYYY-MM-DD' strings so they
   never shift around when a timezone or a backend gets involved later. */
window.App = window.App || {};

App.dates = (function () {
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /** 'YYYY-MM-DD' for a Date (local time). */
  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function today() { return toISO(new Date()); }

  /** Parse 'YYYY-MM-DD' into a local Date at midnight. */
  function parse(iso) {
    var parts = String(iso || '').split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  /** 'DD/MM/YYYY' for display. */
  function toDisplay(iso) {
    var parts = String(iso || '').split('-');
    if (parts.length !== 3) return '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /** Whole days from today to `iso`. Negative for past dates. */
  function daysFromToday(iso) {
    return Math.round((parse(iso) - parse(today())) / MS_PER_DAY);
  }

  /** Whole days between two 'YYYY-MM-DD' dates. */
  function daysBetween(fromISO, toISO_) {
    return Math.round((parse(toISO_) - parse(fromISO)) / MS_PER_DAY);
  }

  /** 'YYYY-MM-DD' a given number of days after `iso`. */
  function addDays(iso, days) {
    var date = parse(iso);
    date.setDate(date.getDate() + days);
    return toISO(date);
  }

  /** Plain day counts, for schedule badges where 'in 2 weeks and 2 days' reads worse. */
  function days(count) { return plural(count, 'day'); }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /** 10 -> '1 week and 3 days'. Used for both countdowns and 'x ago'. */
  function weeksAndDays(days) {
    var weeks = Math.floor(days / 7);
    var rest = days % 7;
    if (weeks && rest) return plural(weeks, 'week') + ' and ' + plural(rest, 'day');
    if (weeks) return plural(weeks, 'week');
    return plural(rest, 'day');
  }

  /** 'Today' / 'in 10 weeks and 4 days' / '18 weeks and 3 days ago'. */
  function relative(iso) {
    var diff = daysFromToday(iso);
    if (diff === 0) return 'Today';
    if (diff > 0) return 'in ' + weeksAndDays(diff);
    return weeksAndDays(-diff) + ' ago';
  }

  /** Same as relative() but without the leading 'in ' (for 'Your exam is ...'). */
  function relativeShort(iso) {
    var diff = daysFromToday(iso);
    if (diff === 0) return 'Today';
    return relative(iso);
  }

  function isPast(iso) { return daysFromToday(iso) < 0; }

  return {
    toISO: toISO,
    today: today,
    parse: parse,
    toDisplay: toDisplay,
    daysFromToday: daysFromToday,
    daysBetween: daysBetween,
    addDays: addDays,
    days: days,
    weeksAndDays: weeksAndDays,
    relative: relative,
    relativeShort: relativeShort,
    isPast: isPast
  };
})();
