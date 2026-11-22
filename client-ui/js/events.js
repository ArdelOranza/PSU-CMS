/* ==========================================================================
   events.js — public Events page: List view (search, campus, category chips, status
   tabs, paging) and Calendar view (month grid). Only published events are shown;
   Upcoming / Ongoing / Completed are worked out from the dates (CMS.eventRules).
   The view, filters and month are kept in the address, e.g. ?view=calendar&month=2026-10
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.events;
  var PER_PAGE = 6;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var STATUS_TABS = [{ value: '', label: 'All' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'ongoing', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }];
  var STATUS_PILL = { upcoming: 'tint', ongoing: 'accent', completed: 'gray' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function currentMonth() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }

  function init() {
    var params = ui.getParams();
    var month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('month') || '') ? params.get('month') : currentMonth();
    var state = { q: params.get('q') || '', campus: params.get('campus') || '', category: params.get('category') || '', status: params.get('status') || '',
                  page: parseInt(params.get('page'), 10) || 1, view: params.get('view') === 'calendar' ? 'calendar' : 'list', month: month };
    var search = document.getElementById('eventSearch');
    var campus = document.getElementById('eventCampus');
    var listFilters = document.getElementById('eventListFilters');
    var chips = document.getElementById('eventChips');
    var tabs = document.getElementById('eventTabs');
    var results = document.getElementById('eventResults');
    var grid = document.getElementById('eventGrid');
    var empty = document.getElementById('eventEmpty');
    var pager = document.getElementById('eventPagination');
    var calendar = document.getElementById('eventCalendar');
    var calBody = document.getElementById('calBody');
    var subtitle = document.getElementById('eventsSubtitle');

    search.value = state.q;
    ui.fillCampusSelect(campus, state.campus);

    /* ----- list view ----- */
    function card(e) {
      var status = data.status(e);
      var d = e.startDate.split('-');
      var time = ui.formatTime(e.startTime);
      var meta = data.campus(e) + (time ? ' \u00B7 ' + time : '');
      return el('article', { class: 'event-card' }, [
        el('div', { class: 'event-date', 'aria-hidden': 'true' }, [
          el('span', { class: 'event-date-month', text: MONTHS[parseInt(d[1], 10) - 1].slice(0, 3) }),
          el('span', { class: 'event-date-day', text: d[2] })
        ]),
        el('div', { class: 'event-card-body' }, [
          el('div', { class: 'event-pills' }, [ui.pill(data.categoryName(e), 'tint'), ui.pill(data.statusLabel(status), STATUS_PILL[status])]),
          el('h2', { class: 'event-card-title' }, [el('a', { href: 'event-details.php?id=' + encodeURIComponent(e.id), text: e.title })]),
          el('p', { class: 'event-card-meta', text: meta })
        ])
      ]);
    }

    function renderTabs() {
      tabs.replaceChildren();
      STATUS_TABS.forEach(function (t) {
        var on = t.value === state.status;
        var b = el('button', { type: 'button', class: on ? 'is-active' : null, 'aria-pressed': on ? 'true' : 'false', text: t.label });
        b.addEventListener('click', function () { state.status = t.value; state.page = 1; render(); });
        tabs.appendChild(b);
      });
    }

    function renderList() {
      ui.renderChips(chips, [{ value: '', label: 'All Events' }].concat(data.categories()), state.category, function (value) { state.category = value; state.page = 1; render(); });
      renderTabs();
      var rows = data.list({ q: state.q, campus: state.campus, category: state.category, status: state.status });
      var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
      state.page = Math.min(Math.max(1, state.page), pages);
      grid.replaceChildren();
      if (!rows.length) {
        grid.hidden = true;
        ui.renderEmpty(empty, { title: 'No events found', text: 'Try a different campus, category or status.', actionLabel: 'Clear filters', onAction: function () {
          state.q = ''; state.campus = ''; state.category = ''; state.status = ''; state.page = 1; search.value = ''; campus.value = ''; render();
        } });
        pager.replaceChildren();
        return;
      }
      grid.hidden = false; empty.replaceChildren();
      rows.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE).forEach(function (e) { grid.appendChild(card(e)); });
      ui.renderPagination(pager, { page: state.page, pages: pages, onChange: function (p) { state.page = p; render(); } });
    }

    /* ----- calendar view ----- */
    function renderCalendar() {
      var y = parseInt(state.month.slice(0, 4), 10), m = parseInt(state.month.slice(5), 10) - 1;
      document.getElementById('calTitle').textContent = MONTHS[m] + ' ' + y;
      var rows = data.list({ q: state.q, campus: state.campus });
      var offset = new Date(y, m, 1).getDay();
      var weeks = Math.ceil((offset + new Date(y, m + 1, 0).getDate()) / 7);
      var today = isoOf(new Date());
      calBody.replaceChildren();
      for (var w = 0; w < weeks; w++) {
        var tr = el('tr');
        for (var i = 0; i < 7; i++) {
          var date = new Date(y, m, 1 - offset + w * 7 + i), iso = isoOf(date);
          var td = el('td', { class: (date.getMonth() !== m ? 'is-outside' : '') + (iso === today ? ' is-today' : ''), 'aria-current': iso === today ? 'date' : null });
          td.appendChild(el('span', { class: 'calendar-day', text: String(date.getDate()) }));
          rows.filter(function (e) {
            var end = e.endDate && e.endDate >= e.startDate ? e.endDate : e.startDate;
            return e.startDate <= iso && iso <= end;
          }).sort(function (a, b) { return String(a.startTime || '').localeCompare(String(b.startTime || '')); }).forEach(function (e) {
            td.appendChild(el('a', { class: 'calendar-event is-' + data.status(e), href: 'event-details.php?id=' + encodeURIComponent(e.id),
                                     title: e.title + ' (' + data.statusLabel(data.status(e)) + ')', text: e.title }));
          });
          tr.appendChild(td);
        }
        calBody.appendChild(tr);
      }
    }

    function shiftMonth(by) {
      var d = new Date(parseInt(state.month.slice(0, 4), 10), parseInt(state.month.slice(5), 10) - 1 + by, 1);
      state.month = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      render();
    }

    function render() {
      var cal = state.view === 'calendar';
      document.getElementById('viewList').classList.toggle('is-active', !cal);
      document.getElementById('viewCalendar').classList.toggle('is-active', cal);
      document.getElementById('viewList').setAttribute('aria-pressed', cal ? 'false' : 'true');
      document.getElementById('viewCalendar').setAttribute('aria-pressed', cal ? 'true' : 'false');
      subtitle.textContent = cal ? 'Browse events by date.' : 'Upcoming activities, programs, and celebrations.';
      listFilters.hidden = cal; results.hidden = cal; calendar.hidden = !cal;
      ui.setParams({ view: cal ? 'calendar' : '', q: state.q, campus: state.campus, category: cal ? '' : state.category, status: cal ? '' : state.status,
                     page: !cal && state.page > 1 ? String(state.page) : '', month: cal && state.month !== currentMonth() ? state.month : '' });
      if (cal) renderCalendar(); else renderList();
    }

    search.addEventListener('input', ui.debounce(function () { state.q = search.value.trim(); state.page = 1; render(); }, 200));
    campus.addEventListener('change', function () { state.campus = campus.value; state.page = 1; render(); });
    document.getElementById('viewList').addEventListener('click', function () { state.view = 'list'; render(); });
    document.getElementById('viewCalendar').addEventListener('click', function () { state.view = 'calendar'; render(); });
    document.getElementById('calPrev').addEventListener('click', function () { shiftMonth(-1); });
    document.getElementById('calNext').addEventListener('click', function () { shiftMonth(1); });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
