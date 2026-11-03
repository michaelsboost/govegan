/* Compact, local-date advocacy spotlight on the Go Vegan homepage. */
(() => {
  'use strict';
  const section = document.getElementById('home-advocacy-spotlight');
  const data = window.GO_VEGAN_CALENDAR_DATA;
  const dates = window.GoVeganCalendarUtils;
  if (!section || !data?.observances || !dates) return;

  const $ = id => document.getElementById(id);
  const updateSpotlight = () => {
  const day = new Date();
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const nextDay = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + 1);
  const events = dates.buildEvents(data, day.getFullYear())
    .concat(dates.buildEvents(data, day.getFullYear() + 1))
    .filter(e => e.start && e.end);
  const priority = {'vegan':0, 'animal-rights':1, 'plant-based':2, 'animal-awareness':3, 'environment':4};
  const rank = (a,b) => (priority[a.category] ?? 5) - (priority[b.category] ?? 5) || a.title.localeCompare(b.title);
  const active = events.filter(e => e.start < nextDay && e.end > midnight);
  const todayEvents = active.filter(e => e.rule.type !== 'month').sort(rank);
  const monthEvents = active.filter(e => e.rule.type === 'month').sort(rank);
  const upcoming = events.filter(e => e.start >= nextDay)
    .sort((a,b) => a.start - b.start || rank(a,b));
  const current = todayEvents[0] || monthEvents[0] || upcoming[0];
  if (!current) return;

  const fmt = (date, opts) => new Intl.DateTimeFormat('en-US', opts).format(date);
  const dateLabel = (ev) => fmt(ev.start, {month:'short', day:'numeric'});
  const isToday = todayEvents.length > 0;
  const isMonthly = !isToday && monthEvents.length > 0;
  const label = isToday ? 'Today in advocacy' : isMonthly ? 'This month in advocacy' : 'Coming up in advocacy';
  $('home-advocacy-kicker').textContent = `${label} · ${isMonthly ? fmt(midnight, {month:'long'}) : dateLabel(current)}`;
  $('home-advocacy-title').textContent = current.title;
  $('home-advocacy-description').textContent = current.description;
  const details = [];
  if (isToday && todayEvents.length > 1) details.push(`Also today: ${todayEvents.slice(1,3).map(e=>e.title).join(' · ')}`);
  if (monthEvents.length && !isMonthly) details.push(`This month: ${monthEvents.slice(0,2).map(e=>e.title).join(' · ')}`);
  if (!isMonthly && !details.length && upcoming.length) details.push(`Next: ${dateLabel(upcoming[0])} · ${upcoming[0].title}`);
  if (isMonthly && upcoming.length) details.push(`Next: ${dateLabel(upcoming[0])} · ${upcoming[0].title}`);
  $('home-advocacy-extra').textContent = details.slice(0,2).join('   •   ');
  const link = $('home-advocacy-link');
  link.href = '#/calendar/' + encodeURIComponent(current.id);
  link.onclick = (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('go-vegan-calendar-open', {detail:{id:current.id}}));
  };
  link.setAttribute('aria-label', `View ${current.title} in the advocacy calendar`);
  section.hidden = false;
  };
  updateSpotlight();
  // Update the note without reloading or disturbing the user's place in the app.
  document.addEventListener('visibilitychange', () => {if (!document.hidden) updateSpotlight();});
})();
