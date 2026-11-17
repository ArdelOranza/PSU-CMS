/* ==========================================================================
   categories.js — Event Categories: list, search, add / edit (dialog), view
   (opens the details page) and delete. Names must be unique (case-insensitive)
   and a category that still has events cannot be deleted, so every event keeps
   a valid category. Event counts are calculated from the events data.
   The add / edit dialog is also used by the Event Category Details page:
   CMS.eventCategoryDialog.open(category | null, onSaved)
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.eventCategories, events = CMS.db.events;

  function eventsIn(catId) { return events.list().filter(function (e) { return e.categoryId === catId; }); }

  /* ---------- Add / Edit Category dialog ---------- */
  function openDialog(c, onSaved) {
    var nameInput = el('input', { class: 'cms-input', id: 'categoryName', type: 'text', maxlength: '60', placeholder: 'Enter category name', value: c ? c.name : null });
    var descInput = el('textarea', { class: 'cms-textarea', id: 'categoryDescription', rows: '3', maxlength: '150', placeholder: 'Enter a short description' });
    if (c) descInput.value = c.description || '';
    var nameField = el('div', { class: 'cms-field' }, [el('label', { class: 'cms-label', for: 'categoryName', text: 'Category Name' }), nameInput, el('p', { class: 'cms-field-error' })]);
    var descField = el('div', { class: 'cms-field' }, [el('label', { class: 'cms-label', for: 'categoryDescription', text: 'Description' }), descInput]);
    var cancel = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Cancel' });
    var saveBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-primary', text: 'Save Category' });
    var modalEl = ui.dialogShell({ title: c ? 'Edit Category' : 'Add Category', text: 'Categories help organize events on the website.',
                                   body: [nameField, descField], actions: [cancel, saveBtn] });
    var modal = ui.openModal(modalEl);
    modalEl.addEventListener('shown.bs.modal', function () { nameInput.focus(); });
    nameInput.addEventListener('input', function () { nameField.classList.remove('has-error'); nameInput.classList.remove('is-invalid'); });

    function submit() {
      ui.clearErrors(modalEl);
      var name = nameInput.value.trim().replace(/\s+/g, ' ');
      if (!name) { ui.setError(nameInput, 'Please enter a category name.'); nameInput.focus(); return; }
      var duplicate = db.list().some(function (x) { return (!c || x.id !== c.id) && x.name.trim().toLowerCase() === name.toLowerCase(); });
      if (duplicate) { ui.setError(nameInput, 'A category with this name already exists.'); nameInput.focus(); return; }
      var record = { name: name, description: descInput.value.trim() };
      if (c) record.id = c.id;
      var res = db.save(record);
      if (!res.ok) { ui.toast('The category could not be saved.', 'error'); return; }
      modal.hide();
      ui.toast(ui.MSG.saved, 'success');
      if (onSaved) onSaved();
    }
    saveBtn.addEventListener('click', submit);
    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }
  CMS.eventCategoryDialog = { open: openDialog };

  /* ---------- Event Categories page ---------- */
  function init() {
    var state = { q: '', page: 1 };
    var body = document.getElementById('categoryTableBody');
    var tableWrap = document.getElementById('categoryTableWrap');
    var emptyBox = document.getElementById('categoryEmpty');
    var footer = document.getElementById('categoryFooter');
    var searchInput = document.getElementById('categorySearch');

    function matches(c) {
      if (!state.q) return true;
      return (c.name + ' ' + (c.description || '')).toLowerCase().indexOf(state.q.toLowerCase()) !== -1;
    }

    function buildRow(c) {
      var tr = el('tr');
      tr.appendChild(el('td', { class: 'cms-cell-title', text: c.name }));
      tr.appendChild(el('td', { text: c.description || '' }));
      tr.appendChild(el('td', { text: String(eventsIn(c.id).length) }));
      var view = el('a', { class: 'cms-action', href: 'event-category-details.html?id=' + encodeURIComponent(c.id), 'aria-label': 'View ' + c.name, text: 'View' });
      var edit = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'Edit ' + c.name, text: 'Edit' });
      var del = el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete ' + c.name, text: 'Delete' });
      edit.addEventListener('click', function () { openDialog(c, render); });
      del.addEventListener('click', function () { removeCategory(c); });
      tr.appendChild(el('td', {}, [el('div', { class: 'cms-actions' }, [view, edit, del])]));
      return tr;
    }

    function render() {
      var all = db.list();
      var rows = all.filter(matches);
      var size = cfg.pageSize.categories;
      var pages = Math.max(1, Math.ceil(rows.length / size));
      state.page = Math.min(state.page, pages);
      ui.clear(body); ui.clear(footer);
      if (!rows.length) {
        tableWrap.hidden = true; emptyBox.hidden = false;
        if (!all.length) ui.renderEmpty(emptyBox, { title: 'No categories yet', text: 'Items you add will appear here.' });
        else ui.renderEmpty(emptyBox, { title: 'No matching categories found', text: 'Try a different search.' });
        return;
      }
      tableWrap.hidden = false; emptyBox.hidden = true;
      rows.slice((state.page - 1) * size, state.page * size).forEach(function (c) { body.appendChild(buildRow(c)); });
      ui.renderFooter(footer, { page: state.page, pageSize: size, total: rows.length, onPage: function (p) { state.page = p; render(); } });
    }

    function removeCategory(c) {
      var inUse = eventsIn(c.id).length;
      if (inUse) {
        ui.notice({ title: 'Category in use', text: '\u201C' + c.name + '\u201D is used by ' + inUse + (inUse === 1 ? ' event' : ' events') +
                    '. Move those events to another category or delete them first.' });
        return;
      }
      ui.confirmDelete().then(function (yes) {
        if (!yes) return;
        if (db.remove(c.id)) { ui.toast(ui.MSG.deleted, 'deleted'); render(); }
        else ui.toast('The category could not be deleted.', 'error');
      });
    }

    document.getElementById('categoryAdd').addEventListener('click', function () { openDialog(null, render); });
    searchInput.addEventListener('input', ui.debounce(function () { state.q = searchInput.value.trim(); state.page = 1; render(); }, 180));
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') === 'event-categories' && document.getElementById('categoryTableBody')) init();
  });
})();
