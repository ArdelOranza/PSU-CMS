/* ==========================================================================
   messages.js — the three list pages of Contact & Feedback:
     <body data-page="all-messages">     every message + feedback, status filter
     <body data-page="unread-messages">  only status "unread"
     <body data-page="feedback">         only type "feedback", category filter
   All three read CMS.messages (one shared dataset) and re-render after any
   change, so a status change on one page is visible on the others.
   PHP: render the rows with a foreach over a SELECT on the messages table;
   keep the same buttons (View = link, Mark as Read / Delete = POST forms).
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, store = CMS.messages;
  var page = document.body.getAttribute('data-page');

  var MODES = {
    'all-messages': {
      size: 'messages', csvName: 'messages', filter: 'status',
      scope: function () { return true; },
      emptyTitle: 'No messages found', emptyText: 'Items you add will appear here.'
    },
    'unread-messages': {
      size: 'unread', csvName: 'unread-messages', filter: null,
      scope: function (m) { return m.status === 'unread'; },
      emptyTitle: 'No unread messages', emptyText: 'You\u2019re all caught up.'
    },
    'feedback': {
      size: 'feedback', csvName: 'feedback', filter: 'category',
      scope: function (m) { return m.type === 'feedback'; },
      emptyTitle: 'No feedback found', emptyText: 'Feedback submitted through the website will appear here.'
    }
  };
  var mode = MODES[page];
  if (!mode) return;

  var isFeedback = page === 'feedback';
  var state = { q: '', filter: '', page: 1 };

  var body = document.getElementById('messageTableBody');
  var tableWrap = document.getElementById('messageTableWrap');
  var emptyBox = document.getElementById('messageEmpty');
  var footer = document.getElementById('messageFooter');
  var statsBox = document.getElementById('messageStats');
  var searchInput = document.getElementById('messageSearch');
  var filterSel = document.getElementById('messageFilter');
  var exportBtn = document.getElementById('messageExport');

  /* ---------- filtering ---------- */
  function scoped() { return store.all().filter(mode.scope); }

  function matches(m) {
    if (state.filter) {
      if (mode.filter === 'status' && m.status !== state.filter) return false;
      if (mode.filter === 'category' && m.category !== state.filter) return false;
    }
    if (state.q) {
      var hay = [m.fullName, m.email, m.subject, m.campusDepartment, m.message, m.category].join(' ').toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function setupFilter() {
    if (!filterSel) return;
    if (mode.filter === 'status') {
      ui.setOptions(filterSel, [{ value: '', label: 'All Status' }].concat(cfg.messageStatuses), '');
    } else {
      var cats = cfg.feedbackCategories.slice();
      scoped().forEach(function (m) { if (m.category && cats.indexOf(m.category) === -1) cats.push(m.category); });
      ui.setOptions(filterSel, [{ value: '', label: 'All Categories' }].concat(cats.map(function (c) { return { value: c, label: c }; })), '');
    }
    filterSel.addEventListener('change', function () { state.filter = filterSel.value; state.page = 1; render(); });
  }

  /* ---------- rows ---------- */
  function viewLink(m) {
    /* the Feedback list has its own details screen (Feedback Details) */
    var target = isFeedback ? 'feedback-details.html' : 'message-details.html';
    return el('a', { class: 'cms-action', href: target + '?id=' + encodeURIComponent(m.id), 'aria-label': 'View ' + (isFeedback ? 'feedback' : 'message') + ' from ' + m.fullName, text: 'View' });
  }
  function deleteBtn(m) {
    var b = el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete message from ' + m.fullName, text: 'Delete' });
    b.addEventListener('click', function () { removeMessage(m); });
    return b;
  }
  function markReadBtn(m) {
    var b = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'Mark message from ' + m.fullName + ' as read', text: 'Mark as Read' });
    if (m.status !== 'unread') { b.disabled = true; return b; }     // already read / responded
    b.addEventListener('click', function () { markRead(m); });
    return b;
  }

  function buildRow(m) {
    var tr = el('tr', { class: m.status === 'unread' ? 'message-row-unread' : null });
    if (isFeedback) {
      tr.appendChild(el('td', { class: 'message-cell-name', text: m.fullName }));
      tr.appendChild(el('td', { text: m.category || '\u2014' }));
      tr.appendChild(el('td', {}, [m.rating ? el('span', { class: 'feedback-stars', 'aria-label': m.rating + ' out of 5', text: store.stars(m.rating) }) : '\u2014']));
      tr.appendChild(el('td', {}, [el('span', { class: 'feedback-text', text: m.message })]));
      tr.appendChild(el('td', { text: ui.formatDate(m.submittedAt) }));
      tr.appendChild(el('td', {}, [store.statusBadge(m, true)]));
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [viewLink(m), deleteBtn(m)])]));
    } else {
      tr.appendChild(el('td', { class: 'message-cell-name', text: m.fullName }));
      tr.appendChild(el('td', { text: m.email }));
      tr.appendChild(el('td', { class: 'message-cell-subject' }, [el('span', { text: m.subject })]));
      tr.appendChild(el('td', { text: ui.formatDate(m.submittedAt) }));
      tr.appendChild(el('td', {}, [store.statusBadge(m, false)]));
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [viewLink(m), markReadBtn(m), deleteBtn(m)])]));
    }
    return tr;
  }

  function renderStats(c) {
    if (!statsBox) return;
    ui.clear(statsBox);
    if (!c.total) { statsBox.hidden = true; return; }            // the empty-state design has no stat cards
    statsBox.hidden = false;
    [['Total Messages', c.total], ['Unread Messages', c.unread], ['Responded Messages', c.responded]].forEach(function (s) {
      statsBox.appendChild(el('div', { class: 'cms-card message-stat' }, [
        el('div', { class: 'message-stat-label', text: s[0] }),
        el('div', { class: 'message-stat-value', text: String(s[1]) })
      ]));
    });
  }

  /* ---------- render ---------- */
  var lastRows = [];
  function render() {
    var base = scoped();
    var rows = base.filter(matches);
    lastRows = rows;
    var size = cfg.pageSize[mode.size];
    var pages = Math.max(1, Math.ceil(rows.length / size));
    state.page = Math.min(state.page, pages);

    renderStats(store.counts());
    ui.clear(body);
    ui.clear(footer);
    if (exportBtn) exportBtn.disabled = !rows.length;

    if (!rows.length) {
      tableWrap.hidden = true;
      emptyBox.hidden = false;
      if (!base.length) ui.renderEmpty(emptyBox, { title: mode.emptyTitle, text: mode.emptyText });
      else ui.renderEmpty(emptyBox, { title: 'No matching ' + (isFeedback ? 'feedback' : 'messages') + ' found', text: 'Try a different search or filter.' });
      return;
    }
    tableWrap.hidden = false;
    emptyBox.hidden = true;
    rows.slice((state.page - 1) * size, state.page * size).forEach(function (m) { body.appendChild(buildRow(m)); });
    ui.renderFooter(footer, { page: state.page, pageSize: size, total: rows.length, onPage: function (p) { state.page = p; render(); } });
  }

  /* ---------- actions ---------- */
  function markRead(m) {
    if (store.setStatus(m.id, 'read')) { ui.toast('Message from ' + m.fullName + ' marked as read.', 'success'); render(); }
    else ui.toast('The status could not be updated.', 'error');
  }
  function removeMessage(m) {
    store.confirmDelete()
      .then(function (yes) {
        if (!yes) return;
        if (store.remove(m.id)) { ui.toast('Deleted.', 'success'); render(); }
        else ui.toast('The record could not be deleted.', 'error');
      });
  }

  /* ---------- wiring ---------- */
  setupFilter();
  searchInput.addEventListener('input', ui.debounce(function () { state.q = searchInput.value.trim(); state.page = 1; render(); }, 180));
  if (exportBtn) exportBtn.addEventListener('click', function () {
    if (!lastRows.length) { ui.toast('There are no records to export.', 'info'); return; }
    store.exportCsv(lastRows, mode.csvName);                      // only the currently filtered rows
    ui.toast('Exported ' + lastRows.length + ' record' + (lastRows.length === 1 ? '' : 's') + ' to CSV.', 'success');
  });
  /* another tab changed the data */
  window.addEventListener('storage', function (e) { if (e.key === cfg.storagePrefix + 'messages') render(); });
  render();
})();
