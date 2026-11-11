/* ==========================================================================
   colleges.js — Colleges list (colleges.html) and Add/Edit College form
   (college-form.html, edit mode via ?id=).
   Data: CMS.db.colleges. A college is the parent of departments and programs.
   PHP: the list becomes a SELECT with a COUNT of departments; the form posts
   to a save handler. Re-check every rule below on the server.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.colleges;

  /* ======================= Colleges (list) ======================= */
  function initList() {
    var body = document.getElementById('collegeTableBody');

    function buildRow(c, refresh) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [c.image ? el('img', { class: 'cms-thumb', src: c.image, alt: '' }) : el('span', { class: 'cms-thumb', 'aria-hidden': 'true' })]));
      tr.appendChild(el('td', {}, [el('span', { class: 'cms-cell-title', text: c.name })]));
      tr.appendChild(el('td', { text: c.code }));
      tr.appendChild(el('td', { text: c.deanName || '\u2014' }));
      tr.appendChild(el('td', { text: String(S.departmentsOf(c.id).length) }));
      tr.appendChild(el('td', {}, [S.statusBadge(c.status)]));
      tr.appendChild(S.actions(c.name, 'college-form.html?id=' + encodeURIComponent(c.id),
        function () { showCollege(c); }, function () { removeCollege(c, refresh); }));
      return tr;
    }

    /* Read-only college profile: shows how the data will appear on the public site */
    function showCollege(c) {
      var depts = S.departmentsOf(c.id), progs = S.programsOfCollege(c.id);
      ui.showDetails({
        title: c.name, cover: c.headerImage || c.image,
        rows: [
          ['Code', c.code], ['Dean', c.deanName], ['Contact email', c.contactEmail], ['Contact number', c.contactNumber],
          ['Description', c.description], ['Vision', c.vision], ['Mission', c.mission],
          ['Status', S.statusBadge(c.status)],
          ['Departments', S.listOf(depts.map(function (d) { return d.name + ' (' + d.code + ')'; }), 'No departments yet')],
          ['Programs', S.listOf(progs.map(function (p) { return p.name + ' (' + p.code + ')'; }), 'No programs yet')]
        ]
      });
    }

    function removeCollege(c, refresh) {
      var d = S.departmentsOf(c.id).length, p = S.programsOfCollege(c.id).length;
      if (d || p) {   // parent records with dependents cannot be deleted
        S.blocked('Cannot delete college', '\u201C' + c.name + '\u201D still has ' + d + ' department' + (d === 1 ? '' : 's') +
          ' and ' + p + ' program' + (p === 1 ? '' : 's') + '. Delete or move them first.');
        return;
      }
      ui.confirmDialog({ title: 'Delete college', message: 'Delete \u201C' + c.name + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(c.id)) { ui.toast('College deleted.', 'success'); refresh(); }
          else ui.toast('The college could not be deleted.', 'error');
        });
    }

    S.listPage({
      body: body, wrap: document.getElementById('collegeTableWrap'), emptyBox: document.getElementById('collegeEmpty'),
      footer: document.getElementById('collegeFooter'), search: document.getElementById('collegeSearch'),
      pageSize: CMS.config.pageSize.colleges, all: function () { return db.list(); },
      match: function (c, q) { return !q || (c.name + ' ' + c.code + ' ' + c.deanName).toLowerCase().indexOf(q) !== -1; },
      row: buildRow,
      emptyNone: { title: 'No colleges yet', text: 'Colleges you add will appear here.', actionLabel: '+ Add College', actionHref: 'college-form.html' },
      emptyFiltered: { title: 'No matching colleges found', text: 'Try a different search.' }
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
      remove: document.getElementById('collegeImageRemove'), input: document.getElementById('collegeImageInput'),
      placeholder: 'College Image', alt: 'College image preview', maxWidth: CMS.config.collegeImageMaxWidth
    });
    var v = S.validator(form);

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That college was not found.', 'error'); window.location.href = 'colleges.html'; return; }
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
      if (!v.ok()) { ui.toast('Please fix the highlighted fields.', 'error'); return; }

      var record = { name: name, code: code, description: f.description.value.trim(), deanName: f.dean.value.trim(), contactEmail: email, image: image.get() };
      if (editing) record.id = editing.id;
      else Object.assign(record, { status: 'active', vision: '', mission: '', contactNumber: '', headerImage: '' });
      var res = db.save(record);
      if (!res.ok) { S.saveFailed(); return; }
      ui.flash(editing ? 'College updated.' : 'College added.', 'success');
      window.location.href = 'colleges.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* data-page only picks the sidebar link (both screens highlight "Colleges") */
    if (document.getElementById('collegeForm')) initForm();
    else if (document.getElementById('collegeTableBody')) initList();
  });
})();
