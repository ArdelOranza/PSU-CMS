/* ==========================================================================
   events.js — All Events (list view, calendar view, empty state) and Add / Edit Event.
   <body data-page="all-events"> or "add-event" picks the page.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.events, cats = CMS.db.eventCategories, rules = CMS.eventRules;

  /* ======================= All Events (list + calendar) ======================= */
  function initList() {
    var VIEW_KEY = cfg.storagePrefix + 'ui.eventsView';      // remembers the last view used
    var body = document.getElementById('eventTableBody');
    var tableWrap = document.getElementById('eventTableWrap');
    var emptyBox = document.getElementById('eventEmpty');
    var footer = document.getElementById('eventFooter');
    var calWrap = document.getElementById('eventCalendarWrap');
    var searchInput = document.getElementById('eventSearch');
    var statusSel = document.getElementById('eventFilterStatus');
    var viewSel = document.getElementById('eventViewSelect');
    var crumb = document.getElementById('eventCrumb');
    var crumbView = document.getElementById('eventCrumbView');
    var state = { q: '', status: '', page: 1, view: startView() };
    var calendar = CMS.eventCalendar.init({
      root: calWrap,
      /* the calendar shows published events only (drafts are not in its legend) */
      getEvents: function () { return db.list().filter(function (ev) { return ev.state === 'published' && matches(ev); }); },
      onOpen: function (ev) { showEvent(ev); },
      onMore: function (iso, list) { showDay(iso, list); }
    });

    /* ?view=list or ?view=calendar wins; otherwise the last view used */
    function startView() {
      var v = ui.getParam('view');
      if (v === 'list' || v === 'calendar') { saveView(v); return v; }
      try { if (window.localStorage.getItem(VIEW_KEY) === 'calendar') return 'calendar'; } catch (e) { /* ignore */ }
      return 'list';
    }
    function saveView(v) { try { window.localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ } }
    function syncUrl() {
      try { window.history.replaceState(null, '', window.location.pathname + (state.view === 'calendar' ? '?view=calendar' : '')); } catch (e) { /* file:// in some browsers */ }
    }

    function setStatusOptions() {
      var items = [{ value: '', label: 'All Status' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'ongoing', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }];
      if (state.view === 'list') items.push({ value: 'draft', label: 'Draft' });
      else if (state.status === 'draft') state.status = '';      // drafts are not shown on the calendar
      ui.setOptions(statusSel, items, state.status);
    }
    ui.setOptions(viewSel, [{ value: 'list', label: 'List View' }, { value: 'calendar', label: 'Calendar View' }], state.view);
    setStatusOptions();

    function matches(ev) {
      if (state.status && rules.effectiveStatus(ev) !== state.status) return false;
      if (state.q) {
        var hay = [ev.title, ev.venue, ev.organizer, ev.description, rules.categoryName(ev.categoryId)].join(' ').toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function buildRow(ev) {
      var status = rules.effectiveStatus(ev);
      var tr = el('tr');
      tr.appendChild(el('td', { class: 'cms-cell-title', text: ev.title }));
      var dateCell = el('td', { text: rules.dateText(ev) });
      if (ev.endDate && ev.endDate !== ev.startDate) dateCell.appendChild(el('span', { class: 'cms-cell-sub', text: 'to ' + ui.formatDate(ev.endDate) }));
      tr.appendChild(dateCell);
      tr.appendChild(el('td', { text: rules.timeText(ev) }));
      tr.appendChild(el('td', { text: ev.venue }));
      tr.appendChild(el('td', { text: ev.organizer }));
      tr.appendChild(el('td', {}, [ui.badge(status, rules.statusLabel(status))]));
      var view = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View ' + ev.title, text: 'View' });
      var edit = el('a', { class: 'cms-action', href: 'add-event.html?id=' + encodeURIComponent(ev.id), 'aria-label': 'Edit ' + ev.title, text: 'Edit' });
      var del = el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete ' + ev.title, text: 'Delete' });
      view.addEventListener('click', function () { showEvent(ev); });
      del.addEventListener('click', function () { removeEvent(ev); });
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [view, edit, del])]));
      return tr;
    }

    /* Breadcrumb: "All Events" (or "All Events – Empty State"), or "All Events / Calendar View" */
    function updateCrumb(total) {
      ui.clear(crumb);
      if (state.view === 'calendar') {
        crumb.appendChild(el('a', { href: 'all-events.html?view=list', text: 'All Events' }));
        crumb.removeAttribute('aria-current');
        crumbView.hidden = false; crumbView.setAttribute('aria-current', 'page');
      } else {
        crumb.textContent = total ? 'All Events' : 'All Events \u2013 Empty State';   // the design labels the empty page
        crumb.setAttribute('aria-current', 'page');
        crumbView.hidden = true; crumbView.removeAttribute('aria-current');
      }
    }

    function renderList(all) {
      var rows = all.filter(matches);
      var size = cfg.pageSize.events;
      var pages = Math.max(1, Math.ceil(rows.length / size));
      state.page = Math.min(state.page, pages);
      ui.clear(body); ui.clear(footer);
      if (!rows.length) {
        tableWrap.hidden = true; emptyBox.hidden = false;
        if (!all.length) ui.renderEmpty(emptyBox, { title: 'No events scheduled', text: 'Items you add will appear here.' });
        else ui.renderEmpty(emptyBox, { title: 'No matching events found', text: 'Try a different search or filter.' });
        return;
      }
      tableWrap.hidden = false; emptyBox.hidden = true;
      rows.slice((state.page - 1) * size, state.page * size).forEach(function (ev) { body.appendChild(buildRow(ev)); });
      ui.renderFooter(footer, { page: state.page, pageSize: size, total: rows.length, onPage: function (p) { state.page = p; render(); } });
    }

    function render() {
      var all = db.list();
      var isCalendar = state.view === 'calendar';
      updateCrumb(all.length);
      calWrap.hidden = !isCalendar;
      if (isCalendar) {
        tableWrap.hidden = true; emptyBox.hidden = true; ui.clear(footer);
        calendar.render();
      } else {
        renderList(all);
      }
    }

    function showEvent(ev) {
      var status = rules.effectiveStatus(ev);
      var dateRange = ui.formatDate(ev.startDate) + (ev.endDate && ev.endDate !== ev.startDate ? ' \u2013 ' + ui.formatDate(ev.endDate) : '');
      ui.showDetails({
        title: 'Event', cover: ev.banner,
        rows: [['Title', ev.title], ['Category', rules.categoryName(ev.categoryId)], ['Date', dateRange], ['Time', rules.timeText(ev)],
               ['Venue', ev.venue], ['Organizer', ev.organizer], ['Status', rules.statusLabel(status)], ['Description', ev.description]]
      });
    }

    /* "+N more": every event of a busy day in one list */
    function showDay(iso, list) {
      var pending = null;
      var ul = el('ul', { class: 'event-day-list' });
      list.forEach(function (ev) {
        var status = rules.effectiveStatus(ev), time = rules.timeText(ev);
        var open = el('button', { type: 'button', class: 'event-day-open', text: ev.title });
        open.addEventListener('click', function () { pending = ev; modal.hide(); });
        ul.appendChild(el('li', {}, [open, el('span', { class: 'event-day-meta', text: time }), ui.badge(status, rules.statusLabel(status))]));
      });
      var closeBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Close' });
      var modalEl = ui.modalShell('Events on ' + ui.formatDate(iso), [ul], [closeBtn]);
      var modal = ui.openModal(modalEl);
      modalEl.addEventListener('hidden.bs.modal', function () { if (pending) showEvent(pending); });
    }

    function removeEvent(ev) {
      ui.confirmDialog({ title: 'Delete event', message: 'Delete \u201C' + ev.title + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(ev.id)) { ui.toast('Event deleted.', 'success'); render(); }
          else ui.toast('The event could not be deleted.', 'error');
        });
    }

    viewSel.addEventListener('change', function () {
      state.view = viewSel.value === 'calendar' ? 'calendar' : 'list';
      saveView(state.view); syncUrl(); setStatusOptions(); state.page = 1; render();
    });
    statusSel.addEventListener('change', function () { state.status = statusSel.value; state.page = 1; render(); });
    searchInput.addEventListener('input', ui.debounce(function () { state.q = searchInput.value.trim(); state.page = 1; render(); }, 180));
    render();
  }

  /* ======================= Add / Edit Event (form) ======================= */
  function initForm() {
    var form = document.getElementById('eventForm');
    var f = {
      title: document.getElementById('eventTitle'), description: document.getElementById('eventDescription'),
      category: document.getElementById('eventCategory'), venue: document.getElementById('eventVenue'),
      startDate: document.getElementById('eventStartDate'), endDate: document.getElementById('eventEndDate'),
      startTime: document.getElementById('eventStartTime'), endTime: document.getElementById('eventEndTime'),
      organizer: document.getElementById('eventOrganizer'), status: document.getElementById('eventStatus')
    };
    var preview = document.getElementById('eventBannerPreview');
    var imageInput = document.getElementById('eventBannerInput');
    var removeBtn = document.getElementById('eventBannerRemove');
    var banner = '';

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That event was not found.', 'error'); window.location.href = 'all-events.html'; return; }
      document.getElementById('eventPageTitle').textContent = 'Edit Event';
      document.getElementById('eventPageSub').textContent = 'Update this university event.';
      document.getElementById('eventCrumb').textContent = 'Edit Event';
      document.title = 'Edit Event | PSU CMS';
    }

    /* categories come from the Event Categories page */
    var catList = cats.list();
    var hasCategories = catList.length > 0;
    if (hasCategories) {
      var selected = editing && cats.get(editing.categoryId) ? editing.categoryId : catList[0].id;
      ui.setOptions(f.category, catList.map(function (c) { return { value: c.id, label: c.name }; }), selected);
    } else {
      ui.setOptions(f.category, [{ value: '', label: 'No categories yet' }], '');
      document.getElementById('eventCategoryHint').hidden = false;
    }
    ui.setOptions(f.status, cfg.eventStates, editing ? editing.state : 'draft');

    if (editing) {
      f.title.value = editing.title; f.description.value = editing.description || ''; f.venue.value = editing.venue || '';
      f.startDate.value = editing.startDate || ''; f.endDate.value = editing.endDate || ''; f.startTime.value = editing.startTime || '';
      f.endTime.value = editing.endTime || ''; f.organizer.value = editing.organizer || ''; banner = editing.banner || '';
    }

    function renderPreview() {
      ui.clear(preview);
      if (banner) preview.appendChild(el('img', { src: banner, alt: 'Event banner preview' }));
      else preview.appendChild(el('span', { text: 'Event Banner' }));
      removeBtn.hidden = !banner;
    }
    document.getElementById('eventBannerBtn').addEventListener('click', function () { imageInput.click(); });
    imageInput.addEventListener('change', function () {
      var file = imageInput.files[0];
      if (!file) return;
      ui.readImage(file).then(function (dataUrl) { banner = dataUrl; renderPreview(); })
        .catch(function (err) { ui.toast(err.message, 'error'); })
        .then(function () { imageInput.value = ''; });
    });
    removeBtn.addEventListener('click', function () { banner = ''; renderPreview(); });
    renderPreview();

    Object.keys(f).forEach(function (k) {
      var input = f[k];
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
        var field = input.closest('.cms-field'); if (field) field.classList.remove('has-error');
        (input._cmsButton || input).classList.remove('is-invalid');
      });
    });

    function validate(state) {
      ui.clearErrors(form);
      var first = null;
      function fail(input, msg) { ui.setError(input, msg); if (!first) first = input._cmsButton || input; }
      if (!f.title.value.trim()) fail(f.title, 'Please enter an event title.');
      if (!f.category.value) fail(f.category, hasCategories ? 'Please choose a category.' : 'Add an event category first.');
      if (state === 'published') {
        if (!f.venue.value.trim()) fail(f.venue, 'Please enter the venue.');
        if (!f.startDate.value) fail(f.startDate, 'Please choose a start date.');
        if (!f.startTime.value) fail(f.startTime, 'Please choose a start time.');
      }
      if (f.startDate.value && f.endDate.value && f.endDate.value < f.startDate.value) fail(f.endDate, 'The end date cannot be before the start date.');
      else if (f.startTime.value && f.endTime.value && (!f.endDate.value || f.endDate.value === f.startDate.value) && f.endTime.value <= f.startTime.value) fail(f.endTime, 'The end time must be after the start time.');
      if (first) { first.focus(); ui.toast('Please fix the highlighted fields.', 'error'); }
      return !first;
    }

    function save(mode) {
      var state = mode === 'publish' ? 'published' : 'draft';
      if (!validate(state)) return;
      var record = {
        title: f.title.value.trim(), description: f.description.value.trim(), categoryId: f.category.value, banner: banner,
        venue: f.venue.value.trim(), startDate: f.startDate.value, endDate: f.endDate.value || f.startDate.value,
        startTime: f.startTime.value, endTime: f.endTime.value, organizer: f.organizer.value.trim(), state: state
      };
      if (editing) record.id = editing.id;
      var res = db.save(record);
      if (!res.ok) { ui.toast('Could not save. Browser storage may be full \u2014 try a smaller image.', 'error'); return; }
      ui.flash(state === 'published' ? 'Event published.' : editing ? 'Event updated.' : 'Event saved as a draft.', 'success');
      window.location.href = 'all-events.html';
    }
    document.getElementById('eventSaveDraft').addEventListener('click', function () { save('draft'); });
    document.getElementById('eventPublish').addEventListener('click', function () { save('publish'); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (page === 'all-events') initList();
    else if (page === 'add-event') initForm();
  });
})();
