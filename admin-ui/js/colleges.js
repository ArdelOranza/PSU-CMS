/* ==========================================================================
   colleges.js — Colleges list (colleges.html), College Details
   (college-details.html?id=) and Add/Edit College (college-form.html, edit via ?id=).
   Data: CMS.db.colleges. A college is the parent of departments and programs.
   PHP: the list becomes a SELECT with a COUNT of departments; the form posts
   to a save handler. Re-check every rule below on the server.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.colleges;

  /* A college with departments or programs can't be deleted (no cascade in this demo). */
  function blockReason(c) {
    var d = S.departmentsOf(c.id).length, p = S.programsOfCollege(c.id).length;
    if (!d && !p) return null;
    return { title: 'Cannot delete college', message: '\u201C' + c.name + '\u201D still has ' + d + ' department' + (d === 1 ? '' : 's') +
      ' and ' + p + ' program' + (p === 1 ? '' : 's') + '. Delete or move them first.' };
  }
  function deleteCollege(c, done) { S.deleteFlow({ repo: db, id: c.id, blocked: blockReason(c), done: done }); }
  function editHref(c) { return 'college-form.html?id=' + encodeURIComponent(c.id); }

  /* ======================= Colleges (list) ======================= */
  function initList() {
    function buildRow(c, refresh) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [c.image ? el('img', { class: 'cms-thumb', src: c.image, alt: '' }) : el('span', { class: 'cms-thumb', 'aria-hidden': 'true' })]));
      tr.appendChild(el('td', {}, [el('span', { class: 'cms-cell-title', text: c.name })]));
      tr.appendChild(el('td', { text: c.code }));
      tr.appendChild(el('td', { text: c.deanName || '\u2014' }));
      tr.appendChild(el('td', { text: String(S.departmentsOf(c.id).length) }));
      tr.appendChild(el('td', {}, [S.statusBadge(c.status)]));
      tr.appendChild(S.actions(c.name, 'college-details.html?id=' + encodeURIComponent(c.id), editHref(c), function () {
        deleteCollege(c, function () { S.toast('Item deleted successfully.', 'deleted'); refresh(); });
      }));
      return tr;
    }
    S.listPage({
      body: document.getElementById('collegeTableBody'), wrap: document.getElementById('collegeTableWrap'), emptyBox: document.getElementById('collegeEmpty'),
      footer: document.getElementById('collegeFooter'), search: document.getElementById('collegeSearch'),
      pageSize: CMS.config.pageSize.colleges, all: function () { return db.list(); },
      match: function (c, q) { return !q || (c.name + ' ' + c.code + ' ' + c.deanName).toLowerCase().indexOf(q) !== -1; },
      row: buildRow,
      emptyNone: { title: 'No colleges yet', text: 'Colleges you add will appear here.', actionLabel: '+ Add College', actionHref: 'college-form.html' },
      emptyFiltered: { title: 'No matching colleges found', text: 'Try a different search.' }
    });
  }

  /* ======================= College Details ======================= */
  function initDetails() {
    var c = db.get(ui.getParam('id'));
    if (!c) { S.flash('That college was not found.', 'error'); window.location.href = 'colleges.html'; return; }
    document.title = 'College Details | PSU CMS';
    document.getElementById('collegeEdit').href = editHref(c);
    S.renderDetail(document.getElementById('collegeDetail'), {
      title: c.name, status: c.status, media: true, image: c.image,
      fields: [['Code', c.code], ['Dean', c.deanName], ['Departments', String(S.departmentsOf(c.id).length)]]
    });
    document.getElementById('collegeDelete').addEventListener('click', function () {
      deleteCollege(c, function () { S.flash('Item deleted successfully.', 'deleted'); window.location.href = 'colleges.html'; });
    });
  }

  /* ======================= Add / Edit College (form) ======================= */
  function initForm() {
    var form = document.getElementById('collegeForm');
    var f = {
      name: document.getElementById('collegeName'), code: document.getElementById('collegeCode'),
      description: document.getElementById('collegeDescription'), dean: document.getElementById('collegeDean'),
      email: document.getElementById('collegeEmail')
    };
    var image = S.imageField({
      preview: document.getElementById('collegeImagePreview'), button: document.getElementById('collegeImageBtn'),
      remove: document.getElementById('collegeImageRemove'),
      placeholder: 'College Image', alt: 'College image preview', maxWidth: CMS.config.collegeImageMaxWidth
    });
    var v = S.validator(form);

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { S.flash('That college was not found.', 'error'); window.location.href = 'colleges.html'; return; }
      document.title = 'Edit College | PSU CMS';
      f.name.value = editing.name; f.code.value = editing.code; f.description.value = editing.description || '';
      f.dean.value = editing.deanName || ''; f.email.value = editing.contactEmail || ''; image.set(editing.image);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      v.reset();
      var name = f.name.value.trim(), code = f.code.value.trim().toUpperCase(), email = f.email.value.trim();
      var others = db.list().filter(function (c) { return !editing || c.id !== editing.id; });

      if (!name) v.fail(f.name, 'Enter the college name.');
      else if (others.some(function (c) { return S.same(c.name, name); })) v.fail(f.name, 'A college with this name already exists.');
      if (!code) v.fail(f.code, 'Enter the college code.');
      else if (!/^[A-Z0-9-]{1,12}$/.test(code)) v.fail(f.code, 'Use letters, numbers or hyphens only (max 12).');
      else if (others.some(function (c) { return S.same(c.code, code); })) v.fail(f.code, 'This college code is already used.');
      if (email && !S.isEmail(email)) v.fail(f.email, 'Enter a valid email address.');
      if (!v.ok()) { S.toast('Please fix the highlighted fields.', 'error'); return; }

      var record = { name: name, code: code, description: f.description.value.trim(), deanName: f.dean.value.trim(), contactEmail: email, image: image.get() };
      if (editing) record.id = editing.id;
      else Object.assign(record, { status: 'active', vision: '', mission: '', contactNumber: '', headerImage: '' });
      var res = db.save(record);
      if (!res.ok) { S.saveFailed(); return; }
      S.flash('Changes saved successfully.', 'success');
      window.location.href = 'colleges.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* data-page only picks the sidebar link (every College screen highlights "Colleges") */
    if (document.getElementById('collegeForm')) initForm();
    else if (document.getElementById('collegeDetail')) initDetails();
    else if (document.getElementById('collegeTableBody')) initList();
  });
})();
