/* Shared calendar date calculations for the calendar and homepage spotlight. */
(() => {
  'use strict';
  const dateAt = (y, m, d) => new Date(y, m - 1, d);
  const parseDay = s => {
    const [year, month, day] = s.split('-').map(Number);
    return dateAt(year, month, day);
  };
  function nthWeekday(year, month, weekday, nth) {
    const first = dateAt(year, month, 1).getDay();
    return dateAt(year, month, 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7);
  }
  function lastWeekday(year, month, weekday) {
    const end = new Date(year, month, 0);
    return dateAt(year, month, end.getDate() - ((end.getDay() - weekday + 7) % 7));
  }
  function resolveDate(rule, year) {
    if (!rule) return null;
    switch (rule.type) {
      case 'fixed': return dateAt(year, rule.month, rule.day);
      case 'month': return dateAt(year, rule.month, 1);
      case 'nthWeekday': return nthWeekday(year, rule.month, rule.weekday, rule.nth);
      case 'lastWeekday': return lastWeekday(year, rule.month, rule.weekday);
      case 'relative': {
        const base = resolveDate(rule.anchor, year);
        if (!base) return null;
        base.setDate(base.getDate() + rule.offset);
        return base;
      }
      case 'organizerDates': return rule.dates?.[String(year)] ? parseDay(rule.dates[String(year)]) : null;
      default: return null;
    }
  }
  function buildEvents(data, year) {
    return data.observances.map(item => {
      const start = resolveDate(item.rule, year);
      const end = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() +
        (item.rule.type === 'month' ? new Date(year, item.rule.month, 0).getDate() : 1)) : null;
      return {...item, start, end, month: item.rule.month};
    });
  }
  window.GoVeganCalendarUtils = Object.freeze({resolveDate, nthWeekday, lastWeekday, buildEvents});
})();
