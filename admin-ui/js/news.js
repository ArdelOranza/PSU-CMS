/* ==========================================================================
   news.js — All News (list) and Add / Edit News (form).
   Runs on both pages; <body data-page="all-news"> or "add-news" picks which.
   PHP: render the table rows with a foreach and replace CMS.db.news calls
   with queries; keep the same fields.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.news;

  function statusLabel(value) {
    for (var i = 0; i < cfg.newsStatuses.length; i++) if (cfg.newsStatuses[i].value === value) return cfg.newsStatuses[i].label;
    return value;
  }
  function categoryList(extra) {
    var list = cfg.newsCategories.slice();
    db.list().forEach(function (n) { if (n.category && list.indexOf(n.category) === -1) list.push(n.category); });
    if (extra && list.indexOf(extra) === -1) list.push(extra);
    return list;
  }
  function isoDaysAgo(days) {
    var d = new Date(); d.setDate(d.getDate() - days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ======================= All News (list) ======================= */
  function initList() {
    var state = { q: '', category: '', status: '', date: '', campus: '', page: 1 };
    var body = document.getElementById('newsTableBody');
    var tableWrap = document.getElementById('newsTableWrap');
    var emptyBox = document.getElementById('newsEmpty');
    var footer = document.getElementById('newsFooter');
    var searchInput = document.getElementById('newsSearch');
    var catSel = document.getElementById('newsFilterCategory');
    var statusSel = document.getElementById('newsFilterStatus');
    var dateSel = document.getElementById('newsFilterDate');
    var campusSel = document.getElementById('newsFilterCampus');

    ui.setOptions(catSel, [{ value: '', label: 'All Categories' }].concat(categoryList().map(function (c) { return { value: c, label: c }; })), '');
    ui.setOptions(statusSel, [{ value: '', label: 'All Status' }].concat(cfg.newsStatuses), '');
    ui.setOptions(dateSel, [
      { value: '', label: 'Any Date' }, { value: '7', label: 'Last 7 Days' }, { value: '30', label: 'Last 30 Days' },
      { value: '90', label: 'Last 90 Days' }, { value: 'year', label: 'This Year' }], '');
    if (campusSel) ui.setOptions(campusSel, [{ value: '', label: 'All Campuses' }].concat(ui.campusChoices().map(function (c) { return { value: c, label: c }; })), '');

    function matches(n) {
      if (state.category && n.category !== state.category) return false;
      if (state.status && n.status !== state.status) return false;
      if (state.campus && n.campus !== state.campus && n.campus !== cfg.allCampuses) return false;
      if (state.date) {
        var p = n.publishedAt || '';
        if (state.date === 'year') { if (p.slice(0, 4) !== ui.todayISO().slice(0, 4)) return false; }
        else if (!p || p < isoDaysAgo(parseInt(state.date, 10))) return false;
      }
      if (state.q) {
        var hay = [n.title, n.author, n.category, n.shortDescription, n.campus].join(' ').toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function buildRow(n) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [n.image ? el('img', { class: 'cms-thumb', src: n.image, alt: '' }) : el('span', { class: 'cms-thumb', 'aria-hidden': 'true' })]));
      var titleCell = el('td', { class: 'cms-cell-title' }, [n.title]);
      if (cfg.features.campus && n.campus) titleCell.appendChild(el('span', { class: 'cms-cell-sub news-campus', text: n.campus }));
      tr.appendChild(titleCell);
      tr.appendChild(el('td', { text: n.category }));
      tr.appendChild(el('td', { text: n.author }));
      tr.appendChild(el('td', { text: ui.formatDate(n.publishedAt) }));
      tr.appendChild(el('td', {}, [ui.badge(n.status, statusLabel(n.status))]));

      var view = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View ' + n.title, text: 'View' });
      var edit = el('a', { class: 'cms-action', href: 'add-news.html?id=' + encodeURIComponent(n.id), 'aria-label': 'Edit ' + n.title, text: 'Edit' });
      var del = el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete ' + n.title, text: 'Delete' });
      view.addEventListener('click', function () { showNews(n); });
      del.addEventListener('click', function () { removeNews(n); });
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [view, edit, del])]));
      return tr;
    }

    function render() {
      var all = db.list();
      var rows = all.filter(matches);
      var size = cfg.pageSize.news;
      var pages = Math.max(1, Math.ceil(rows.length / size));
      state.page = Math.min(state.page, pages);
      ui.clear(body);
      ui.clear(footer);
      if (!rows.length) {
        tableWrap.hidden = true;
        emptyBox.hidden = false;
        if (!all.length) ui.renderEmpty(emptyBox, { title: 'No news articles yet', text: 'Items you add will appear here.', actionLabel: '+ Add New News', actionHref: 'add-news.html' });
        else ui.renderEmpty(emptyBox, { title: 'No matching news found', text: 'Try a different search or filter.' });
        return;
      }
      tableWrap.hidden = false;
      emptyBox.hidden = true;
      rows.slice((state.page - 1) * size, state.page * size).forEach(function (n) { body.appendChild(buildRow(n)); });
      ui.renderFooter(footer, { page: state.page, pageSize: size, total: rows.length, onPage: function (p) { state.page = p; render(); } });
    }

    function showNews(n) {
      var rows = [['Title', n.title], ['Category', n.category], ['Author', n.author]];
      if (cfg.features.campus) rows.push(['Campus', n.campus]);
      rows.push(['Date published', ui.formatDate(n.publishedAt)], ['Status', statusLabel(n.status)], ['Summary', n.shortDescription]);
      ui.showDetails({ title: 'News article', cover: n.image, rows: rows, contentHtml: n.content });
    }

    function removeNews(n) {
      ui.confirmDialog({ title: 'Delete news article', message: 'Delete \u201C' + n.title + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(n.id)) { ui.toast('News article deleted.', 'success'); render(); }
          else ui.toast('The article could not be deleted.', 'error');
        });
    }

    function bind(select, key) {
      select.addEventListener('change', function () { state[key] = select.value; state.page = 1; render(); });
    }
    bind(catSel, 'category'); bind(statusSel, 'status'); bind(dateSel, 'date');
    if (campusSel) bind(campusSel, 'campus');
    searchInput.addEventListener('input', ui.debounce(function () { state.q = searchInput.value.trim(); state.page = 1; render(); }, 180));
    render();
  }

  /* ======================= Add / Edit News (form) ======================= */
  function initForm() {
    var form = document.getElementById('newsForm');
    var f = {
      title: document.getElementById('newsTitle'), category: document.getElementById('newsCategory'),
      author: document.getElementById('newsAuthor'), campus: document.getElementById('newsCampus'),
      date: document.getElementById('newsDate'), summary: document.getElementById('newsSummary'),
      status: document.getElementById('newsStatus')
    };
    var editor = CMS.richtext.init(document.getElementById('newsContentEditor'));
    var preview = document.getElementById('newsImagePreview');
    var imageInput = document.getElementById('newsImageInput');
    var removeBtn = document.getElementById('newsImageRemove');
    var image = '';

    /* edit mode: ?id=... */
    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That news article was not found.', 'error'); window.location.href = 'all-news.html'; return; }
      document.getElementById('newsPageTitle').textContent = 'Edit News';
      document.getElementById('newsPageSub').textContent = 'Update this news article.';
      document.getElementById('newsCrumb').textContent = 'Edit News';
      document.title = 'Edit News | PSU CMS';
    }

    ui.setOptions(f.category, categoryList(editing && editing.category), editing ? editing.category : cfg.newsCategories[0]);
    ui.setOptions(f.status, cfg.newsStatuses, editing ? editing.status : 'draft');
    if (f.campus) {
      var choices = ui.campusChoices();
      var opts = [{ value: '', label: 'Select campus' }].concat(choices.map(function (c) { return { value: c, label: c }; }));
      if (editing && editing.campus && choices.indexOf(editing.campus) === -1) opts.push({ value: editing.campus, label: editing.campus });
      ui.setOptions(f.campus, opts, editing ? editing.campus : (choices.length === 1 ? choices[0] : ''));
    }
    f.author.value = editing ? editing.author : cfg.currentUser.name;
    if (editing) {
      f.title.value = editing.title; f.date.value = editing.publishedAt || ''; f.summary.value = editing.shortDescription || '';
      editor.setHtml(editing.content || ''); image = editing.image || '';
    }

    /* featured image preview */
    function renderPreview() {
      ui.clear(preview);
      if (image) preview.appendChild(el('img', { src: image, alt: 'Featured image preview' }));
      else preview.appendChild(el('span', { text: 'Featured Image' }));
      removeBtn.hidden = !image;
    }
    document.getElementById('newsImageBtn').addEventListener('click', function () { imageInput.click(); });
    imageInput.addEventListener('change', function () {
      var file = imageInput.files[0];
      if (!file) return;
      ui.readImage(file).then(function (dataUrl) { image = dataUrl; renderPreview(); })
        .catch(function (err) { ui.toast(err.message, 'error'); })
        .then(function () { imageInput.value = ''; });
    });
    removeBtn.addEventListener('click', function () { image = ''; renderPreview(); });
    renderPreview();

    /* clear an error as soon as the user fixes the field */
    [f.title, f.category, f.campus, f.date].forEach(function (input) {
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
      if (!f.title.value.trim()) fail(f.title, 'Please enter a news title.');
      if (!f.category.value) fail(f.category, 'Please choose a category.');
      if (f.campus && !f.campus.value) fail(f.campus, 'Please select a campus.');
      if (status === 'published' && editor.isEmpty()) fail(editor.area, 'Please write the article content before publishing.');
      if (first) { first.focus(); ui.toast('Please fix the highlighted fields.', 'error'); }
      return !first;
    }

    /* Publish -> Published. Save as Draft -> the chosen status, unless it says Published. */
    function save(mode) {
      var status = mode === 'publish' ? 'published' : (f.status.value === 'published' ? 'draft' : f.status.value);
      if (!validate(status)) return;
      var record = {
        title: f.title.value.trim(), category: f.category.value, author: f.author.value.trim() || cfg.currentUser.name,
        campus: f.campus ? f.campus.value : (editing ? editing.campus : cfg.allCampuses),
        publishedAt: f.date.value || (status === 'published' ? ui.todayISO() : ''),
        shortDescription: f.summary.value.trim(), content: editor.getHtml(), image: image, status: status
      };
      if (editing) record.id = editing.id;
      var res = db.save(record);
      if (!res.ok) { ui.toast('Could not save. Browser storage may be full \u2014 try a smaller image.', 'error'); return; }
      ui.flash(status === 'published' ? 'News article published.' : editing ? 'News article updated.' : 'News article saved.', 'success');
      window.location.href = 'all-news.html';
    }
    document.getElementById('newsSaveDraft').addEventListener('click', function () { save('draft'); });
    document.getElementById('newsPublish').addEventListener('click', function () { save('publish'); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });   // Enter key must not reload the page
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (page === 'all-news') initList();
    else if (page === 'add-news') initForm();
  });
})();
