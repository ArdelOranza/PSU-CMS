/* ==========================================================================
   announcements.js — All Announcements (list) and Add / Edit Announcement.
   <body data-page="all-announcements"> or "add-announcement" picks the page.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.announcements, rules = CMS.announcementRules;
  var INLINE_FILE_LIMIT = 300 * 1024;   // small files are kept so "Download" can be demonstrated
  var ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];

  function categoryList(extra) {
    var list = cfg.announcementCategories.slice();
    db.list().forEach(function (a) { if (a.category && list.indexOf(a.category) === -1) list.push(a.category); });
    if (extra && list.indexOf(extra) === -1) list.push(extra);
    return list;
  }
  function isoDaysAgo(days) {
    var d = new Date(); d.setDate(d.getDate() - days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function priorityLabel(v) { return v === 'urgent' ? 'Urgent' : 'Normal'; }
  function fileLink(att) {
    if (!att) return '';
    var text = att.name + (att.size ? ' (' + ui.formatSize(att.size) + ')' : '');
    if (att.data) return el('a', { href: att.data, download: att.name, text: text });
    return text + ' \u2014 file content is not stored in this prototype';
  }

  /* ======================= All Announcements (list) ======================= */
  function initList() {
    var state = { q: '', category: '', status: '', date: '', campus: '', priority: '', page: 1 };
    var body = document.getElementById('announcementTableBody');
    var tableWrap = document.getElementById('announcementTableWrap');
    var emptyBox = document.getElementById('announcementEmpty');
    var footer = document.getElementById('announcementFooter');
    var searchInput = document.getElementById('announcementSearch');
    var catSel = document.getElementById('announcementFilterCategory');
    var statusSel = document.getElementById('announcementFilterStatus');
    var dateSel = document.getElementById('announcementFilterDate');
    var campusSel = document.getElementById('announcementFilterCampus');
    var prioritySel = document.getElementById('announcementFilterPriority');

    ui.setOptions(catSel, [{ value: '', label: 'All Categories' }].concat(categoryList().map(function (c) { return { value: c, label: c }; })), '');
    ui.setOptions(statusSel, [{ value: '', label: 'All Status' }].concat(cfg.announcementStatuses.slice(0, 3), [{ value: 'expired', label: 'Expired' }], cfg.announcementStatuses.slice(3)), '');
    ui.setOptions(dateSel, [
      { value: '', label: 'Any Date' }, { value: '7', label: 'Last 7 Days' }, { value: '30', label: 'Last 30 Days' },
      { value: '90', label: 'Last 90 Days' }, { value: 'year', label: 'This Year' }], '');
    if (campusSel) ui.setOptions(campusSel, [{ value: '', label: 'All Campuses' }].concat(ui.campusChoices().map(function (c) { return { value: c, label: c }; })), '');
    if (prioritySel) ui.setOptions(prioritySel, [{ value: '', label: 'All Priorities' }, { value: 'normal', label: 'Normal' }, { value: 'urgent', label: 'Urgent' }], '');

    function matches(a) {
      if (state.category && a.category !== state.category) return false;
      if (state.status && rules.effectiveStatus(a) !== state.status) return false;
      if (state.priority && (a.priority || 'normal') !== state.priority) return false;
      if (state.campus && a.campus !== state.campus && a.campus !== cfg.allCampuses) return false;
      if (state.date) {
        var p = a.publishedAt || '';
        if (state.date === 'year') { if (p.slice(0, 4) !== ui.todayISO().slice(0, 4)) return false; }
        else if (!p || p < isoDaysAgo(parseInt(state.date, 10))) return false;
      }
      if (state.q) {
        var hay = [a.title, a.author, a.category, a.campus, CMS.sanitize.text(a.content)].join(' ').toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function buildRow(a) {
      var status = rules.effectiveStatus(a);
      var tr = el('tr');
      var titleCell = el('td', { class: 'cms-cell-title' }, [a.title]);
      if (cfg.features.priority && a.priority === 'urgent') titleCell.appendChild(el('span', { class: 'cms-status cms-status-red announcement-urgent', text: 'Urgent' }));
      if (cfg.features.campus && a.campus) titleCell.appendChild(el('span', { class: 'cms-cell-sub', text: a.campus }));
      tr.appendChild(titleCell);
      tr.appendChild(el('td', { text: a.category }));
      tr.appendChild(el('td', { text: a.author }));
      tr.appendChild(el('td', { text: ui.formatDate(a.publishedAt) }));
      tr.appendChild(el('td', { text: a.expiresAt ? ui.formatDate(a.expiresAt) : '\u2014' }));
      tr.appendChild(el('td', {}, [ui.badge(status, rules.statusLabel(status))]));
      var view = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View ' + a.title, text: 'View' });
      var edit = el('a', { class: 'cms-action', href: 'add-announcement.html?id=' + encodeURIComponent(a.id), 'aria-label': 'Edit ' + a.title, text: 'Edit' });
      var del = el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete ' + a.title, text: 'Delete' });
      view.addEventListener('click', function () { showAnnouncement(a); });
      del.addEventListener('click', function () { removeAnnouncement(a); });
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [view, edit, del])]));
      return tr;
    }

    function render() {
      var all = db.list();
      var rows = all.filter(matches);
      var size = cfg.pageSize.announcements;
      var pages = Math.max(1, Math.ceil(rows.length / size));
      state.page = Math.min(state.page, pages);
      ui.clear(body); ui.clear(footer);
      if (!rows.length) {
        tableWrap.hidden = true; emptyBox.hidden = false;
        if (!all.length) ui.renderEmpty(emptyBox, { title: 'No announcements yet', text: 'Items you add will appear here.', actionLabel: '+ Add New Announcement', actionHref: 'add-announcement.html' });
        else ui.renderEmpty(emptyBox, { title: 'No matching announcements found', text: 'Try a different search or filter.' });
        return;
      }
      tableWrap.hidden = false; emptyBox.hidden = true;
      rows.slice((state.page - 1) * size, state.page * size).forEach(function (a) { body.appendChild(buildRow(a)); });
      ui.renderFooter(footer, { page: state.page, pageSize: size, total: rows.length, onPage: function (p) { state.page = p; render(); } });
    }

    function showAnnouncement(a) {
      var status = rules.effectiveStatus(a);
      var rows = [['Title', a.title], ['Category', a.category], ['Author', a.author]];
      if (cfg.features.campus) rows.push(['Campus', a.campus]);
      if (cfg.features.priority) rows.push(['Priority', priorityLabel(a.priority)]);
      rows.push(['Date posted', ui.formatDate(a.publishedAt)], ['Expiration', a.expiresAt ? ui.formatDate(a.expiresAt) : 'No expiration'],
                ['Status', rules.statusLabel(status)], ['Attachment', fileLink(a.attachment)]);
      ui.showDetails({ title: 'Announcement', rows: rows, contentHtml: a.content });
    }

    function removeAnnouncement(a) {
      ui.confirmDialog({ title: 'Delete announcement', message: 'Delete \u201C' + a.title + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(a.id)) { ui.toast('Announcement deleted.', 'success'); render(); }
          else ui.toast('The announcement could not be deleted.', 'error');
        });
    }

    [[catSel, 'category'], [statusSel, 'status'], [dateSel, 'date'], [campusSel, 'campus'], [prioritySel, 'priority']].forEach(function (pair) {
      if (!pair[0]) return;
      pair[0].addEventListener('change', function () { state[pair[1]] = pair[0].value; state.page = 1; render(); });
    });
    searchInput.addEventListener('input', ui.debounce(function () { state.q = searchInput.value.trim(); state.page = 1; render(); }, 180));
    render();
  }

  /* ======================= Add / Edit Announcement (form) ======================= */
  function initForm() {
    var form = document.getElementById('announcementForm');
    var f = {
      title: document.getElementById('announcementTitle'), category: document.getElementById('announcementCategory'),
      status: document.getElementById('announcementStatus'), campus: document.getElementById('announcementCampus'),
      priority: document.getElementById('announcementPriority'), published: document.getElementById('announcementPublished'),
      expires: document.getElementById('announcementExpires')
    };
    var editor = CMS.richtext.init(document.getElementById('announcementContentEditor'));
    var dropzone = document.getElementById('announcementDropzone');
    var fileInput = document.getElementById('announcementFile');
    var fileList = document.getElementById('announcementFileList');
    var targetNote = document.getElementById('announcementTarget');
    var attachment = null;

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That announcement was not found.', 'error'); window.location.href = 'all-announcements.html'; return; }
      document.getElementById('announcementPageTitle').textContent = 'Edit Announcement';
      document.getElementById('announcementPageSub').textContent = 'Update this announcement.';
      document.getElementById('announcementCrumb').textContent = 'Edit Announcement';
      document.title = 'Edit Announcement | PSU CMS';
    }

    ui.setOptions(f.category, categoryList(editing && editing.category), editing ? editing.category : cfg.announcementCategories[0]);
    ui.setOptions(f.status, cfg.announcementStatuses, editing ? editing.status : 'draft');
    if (f.priority) ui.setOptions(f.priority, [{ value: 'normal', label: 'Normal' }, { value: 'urgent', label: 'Urgent' }], editing ? (editing.priority || 'normal') : 'normal');
    if (f.campus) {
      var choices = ui.campusChoices();
      var opts = [{ value: '', label: 'Select campus' }].concat(choices.map(function (c) { return { value: c, label: c }; }));
      if (editing && editing.campus && choices.indexOf(editing.campus) === -1) opts.push({ value: editing.campus, label: editing.campus });
      ui.setOptions(f.campus, opts, editing ? editing.campus : (choices.length === 1 ? choices[0] : ''));
    }
    if (editing) {
      f.title.value = editing.title; f.published.value = editing.publishedAt || ''; f.expires.value = editing.expiresAt || '';
      editor.setHtml(editing.content || ''); attachment = editing.attachment || null;
    }

    /* dynamic target preview */
    function updateTarget() {
      if (!targetNote) return;
      var c = f.campus.value;
      var text = !c ? 'Select a campus to see who will receive this announcement.'
        : c === cfg.allCampuses ? 'Visible to: all campuses (university-wide).'
        : 'Visible to: ' + c + ' campus only.';
      var icon = ui.icon(c === cfg.allCampuses ? 'globe2' : 'geo-alt');
      targetNote.replaceChildren(icon, document.createTextNode(' ' + text));
    }
    if (f.campus) { f.campus.addEventListener('change', updateTarget); updateTarget(); }

    /* attachment */
    function renderAttachment() {
      ui.clear(fileList);
      if (!attachment) return;
      var remove = el('button', { type: 'button', 'aria-label': 'Remove attachment' }, [ui.icon('x-lg')]);
      remove.addEventListener('click', function () { attachment = null; renderAttachment(); });
      fileList.appendChild(el('span', { class: 'cms-file-chip' }, [ui.icon('paperclip'), el('span', { text: attachment.name + (attachment.size ? ' (' + ui.formatSize(attachment.size) + ')' : '') }), remove]));
    }
    function takeFile(file) {
      if (!file) return;
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ALLOWED_EXT.indexOf(ext) === -1) { ui.toast('That file type is not allowed. Use PDF, Office documents, TXT, PNG or JPG.', 'error'); return; }
      if (file.size > cfg.documentMaxFileBytes) { ui.toast('That file is larger than ' + ui.formatSize(cfg.documentMaxFileBytes) + '.', 'error'); return; }
      var meta = { name: file.name, size: file.size, type: file.type || ext };
      if (file.size > INLINE_FILE_LIMIT) { attachment = meta; renderAttachment(); return; }
      var reader = new FileReader();
      reader.onload = function () { meta.data = reader.result; attachment = meta; renderAttachment(); };
      reader.onerror = function () { attachment = meta; renderAttachment(); };
      reader.readAsDataURL(file);
    }
    document.getElementById('announcementBrowse').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { takeFile(fileInput.files[0]); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('is-over'); }); });
    dropzone.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files[0]); });
    renderAttachment();

    /* clear errors while typing */
    [f.title, f.category, f.campus, f.published, f.expires].forEach(function (input) {
      if (!input) return;
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
        var field = input.closest('.cms-field'); if (field) field.classList.remove('has-error');
        (input._cmsButton || input).classList.remove('is-invalid');
      });
    });
    editor.area.addEventListener('input', function () {
      var field = editor.area.closest('.cms-field'); if (field) field.classList.remove('has-error');
      editor.area.closest('.cms-richtext').classList.remove('is-invalid');
    });

    function validate(status) {
      ui.clearErrors(form);
      var first = null;
      function fail(input, msg) { ui.setError(input, msg); if (!first) first = input._cmsButton || input; }
      if (!f.title.value.trim()) fail(f.title, 'Please enter an announcement title.');
      if (!f.category.value) fail(f.category, 'Please choose a category.');
      if (f.campus && !f.campus.value) fail(f.campus, 'Please select a campus.');
      if (status === 'published' && editor.isEmpty()) fail(editor.area, 'Please write the announcement before publishing.');
      if (f.published.value && f.expires.value && f.expires.value < f.published.value) fail(f.expires, 'The expiration date cannot be before the publication date.');
      else if (status === 'published' && f.expires.value && f.expires.value < ui.todayISO()) fail(f.expires, 'This expiration date has already passed. Choose a later date or save as a draft.');
      if (first) { first.focus(); ui.toast('Please fix the highlighted fields.', 'error'); }
      return !first;
    }

    function save(mode) {
      var status = mode === 'publish' ? 'published' : (f.status.value === 'published' ? 'draft' : f.status.value);
      if (!validate(status)) return;
      var record = {
        title: f.title.value.trim(), category: f.category.value, author: editing ? editing.author : cfg.currentUser.name,
        campus: f.campus ? f.campus.value : (editing ? editing.campus : cfg.allCampuses),
        priority: f.priority ? f.priority.value : (editing ? editing.priority : 'normal'),
        publishedAt: f.published.value || (status === 'published' ? ui.todayISO() : ''), expiresAt: f.expires.value || '',
        content: editor.getHtml(), attachment: attachment, status: status
      };
      if (editing) record.id = editing.id;
      var res = db.save(record);
      if (!res.ok) { ui.toast('Could not save. Browser storage may be full.', 'error'); return; }
      ui.flash(status === 'published' ? 'Announcement published.' : editing ? 'Announcement updated.' : 'Announcement saved.', 'success');
      window.location.href = 'all-announcements.html';
    }
    document.getElementById('announcementSaveDraft').addEventListener('click', function () { save('draft'); });
    document.getElementById('announcementPublish').addEventListener('click', function () { save('publish'); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (page === 'all-announcements') initList();
    else if (page === 'add-announcement') initForm();
  });
})();
