/* ==========================================================================
   event-calendar.js — month grid for the "Calendar View" on All Events.
   It only draws the calendar. The page (events.js) decides WHICH events to
   show and what happens when one is clicked:
     CMS.eventCalendar.init({
       root,                       // the element that holds the calendar markup
       getEvents: function () {},  // returns the (already filtered) events to draw
       onOpen: function (ev) {},   // an event chip was clicked
       onMore: function (iso, list) {}  // the "+N more" link of a busy day was clicked
     })  ->  { render(), goToday() }
   Event status colors come from CMS.eventRules (Upcoming / Ongoing / Completed).
   An event that spans several days is drawn on every day it covers.
   PHP: the same grid can be built on the server; keep the class names.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.eventCalendar = (function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MAX_CHIPS = 3;      // a day with more events shows 2 chips + "+N more"

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function init(opts) {
    var ui = CMS.ui, el = ui.el, rules = CMS.eventRules, root = opts.root;
    var titleEl = root.querySelector('[data-cal="title"]');
    var body = root.querySelector('[data-cal="body"]');
    var statusEl = root.querySelector('[data-cal="status"]');
    var now = new Date();
    var view = { year: now.getFullYear(), month: now.getMonth() };

    function eventsOn(iso, list) {
      return list.filter(function (ev) {
        var end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
        return ev.startDate && ev.startDate <= iso && iso <= end;
      }).sort(function (a, b) {
        return String(a.startTime || '').localeCompare(String(b.startTime || '')) || String(a.title).localeCompare(String(b.title));
      });
    }

    function chip(ev) {
      var status = rules.effectiveStatus(ev), time = rules.timeText(ev);
      var label = ev.title + ' (' + rules.statusLabel(status) + (time ? ', ' + time : '') + ')';
      var b = el('button', { type: 'button', class: 'event-chip event-chip-' + status, text: ev.title, title: label, 'aria-label': label });
      b.addEventListener('click', function () { opts.onOpen(ev); });
      return b;
    }

    function dayCell(date, list, today) {
      var iso = isoOf(date), outside = date.getMonth() !== view.month;
      var td = el('td', { class: 'event-calendar-day' + (outside ? ' is-outside' : '') + (iso === today ? ' is-today' : ''), 'aria-current': iso === today ? 'date' : null });
      td.appendChild(el('span', { class: 'event-calendar-num', text: String(date.getDate()) }));
      var dayEvents = eventsOn(iso, list);
      var shown = dayEvents.length > MAX_CHIPS ? MAX_CHIPS - 1 : dayEvents.length;
      dayEvents.slice(0, shown).forEach(function (ev) { td.appendChild(chip(ev)); });
      if (dayEvents.length > shown) {
        var more = el('button', { type: 'button', class: 'event-calendar-more', text: '+' + (dayEvents.length - shown) + ' more',
                                  'aria-label': (dayEvents.length - shown) + ' more events on ' + ui.formatDate(iso) });
        more.addEventListener('click', function () { opts.onMore(iso, dayEvents); });
        td.appendChild(more);
      }
      return td;
    }

    function render() {
      var list = opts.getEvents();
      var first = new Date(view.year, view.month, 1);
      var offset = first.getDay();                                         // Sunday first
      var daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
      var weeks = Math.ceil((offset + daysInMonth) / 7);
      var today = ui.todayISO();
      titleEl.textContent = MONTHS[view.month] + ' ' + view.year;
      ui.clear(body);
      for (var w = 0; w < weeks; w++) {
        var tr = el('tr');
        for (var d = 0; d < 7; d++) tr.appendChild(dayCell(new Date(view.year, view.month, 1 - offset + w * 7 + d), list, today));
        body.appendChild(tr);
      }
      /* screen readers: how many events fall inside this month */
      var monthStart = view.year + '-' + pad(view.month + 1) + '-01', monthEnd = view.year + '-' + pad(view.month + 1) + '-' + pad(daysInMonth);
      var count = list.filter(function (ev) {
        var end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
        return ev.startDate && ev.startDate <= monthEnd && end >= monthStart;
      }).length;
      statusEl.textContent = titleEl.textContent + ': ' + count + (count === 1 ? ' event' : ' events');
    }

    function shift(by) {
      var d = new Date(view.year, view.month + by, 1);
      view.year = d.getFullYear(); view.month = d.getMonth();
      render();
    }
    function goToday() { var t = new Date(); view.year = t.getFullYear(); view.month = t.getMonth(); render(); }

    root.querySelector('[data-cal="prev"]').addEventListener('click', function () { shift(-1); });
    root.querySelector('[data-cal="next"]').addEventListener('click', function () { shift(1); });
    root.querySelector('[data-cal="today"]').addEventListener('click', goToday);

    return { render: render, goToday: goToday };
  }

  return { init: init };
})();
