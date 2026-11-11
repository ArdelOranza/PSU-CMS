/* ==========================================================================
   departments.js — Departments list (departments.html) and Add/Edit
   Department form (department-form.html, edit mode via ?id=).
   Each department belongs to one college (collegeId) and may have a head
   chosen from the faculty directory (CMS.db.faculty) via a searchable dropdown.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.departments;

  /* ======================= Departments (list) ======================= */
  function initList() {
    var collegeSel = document.getElementById('departmentFilterCollege');
    S.fillFilter(collegeSel, 'All Colleges', S.colleges().map(function (c) { return { value: c.id, label: c.name }; }));

    function buildRow(d, refresh) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [el('span', { class: 'cms-cell-title', text: d.name })]));
      tr.appendChild(el('td', { text: d.code }));
      tr.appendChild(el('td', { text: S.collegeCode(d.collegeId) }));
      tr.appendChild(el('td', { text: d.headName || '\u2014' }));
      tr.appendChild(el('td', { text: d.description || '' }));
      tr.appendChild(el('td', {}, [S.statusBadge(d.status)]));
      tr.appendChild(S.actions(d.name, 'department-form.html?id=' + encodeURIComponent(d.id),
        function () { showDepartment(d); }, function () { removeDepartment(d, refresh); }));
      return tr;
    }

    /* Read-only department profile (public-site preview) */
    function showDepartment(d) {
      ui.showDetails({
        title: d.name,
        rows: [
          ['Code', d.code], ['College', S.collegeName(d.collegeId)], ['Head', d.headName],
          ['Contact email', d.contactEmail], ['Office', d.officeLocation], ['Hours', d.operationalHours],
          ['Description', d.description], ['Status', S.statusBadge(d.status)],
          ['Programs', S.listOf(S.programsOfDepartment(d.id).map(function (p) { return p.name + ' (' + p.code + ')'; }), 'No programs yet')],
          ['Staff', S.listOf(S.staffOf(d).map(function (f) { return f.name + (f.position ? ' \u2014 ' + f.position : ''); }), 'No staff listed')]
        ]
      });
    }

    function removeDepartment(d, refresh) {
      var p = S.programsOfDepartment(d.id).length;
      if (p) {
        S.blocked('Cannot delete department', '\u201C' + d.name + '\u201D still has ' + p + ' academic program' + (p === 1 ? '' : 's') + '. Delete or move them first.');
        return;
      }
      ui.confirmDialog({ title: 'Delete department', message: 'Delete \u201C' + d.name + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(d.id)) { ui.toast('Department deleted.', 'success'); refresh(); }
          else ui.toast('The department could not be deleted.', 'error');
        });
    }

    S.listPage({
      body: document.getElementById('departmentTableBody'), wrap: document.getElementById('departmentTableWrap'),
      emptyBox: document.getElementById('departmentEmpty'), footer: document.getElementById('departmentFooter'),
      search: document.getElementById('departmentSearch'), filters: [{ select: collegeSel, key: 'college' }],
      pageSize: CMS.config.pageSize.departments, all: function () { return db.list(); },
      match: function (d, q, f) {
        if (f.college && d.collegeId !== f.college) return false;
        return !q || (d.name + ' ' + d.code + ' ' + (d.headName || '') + ' ' + S.collegeName(d.collegeId) + ' ' + S.collegeCode(d.collegeId)).toLowerCase().indexOf(q) !== -1;
      },
      row: buildRow,
      emptyNone: { title: 'No departments yet', text: 'Departments you add will appear here.', actionLabel: '+ Add Department', actionHref: 'department-form.html' },
      emptyFiltered: { title: 'No matching departments found', text: 'Try a different search or filter.' }
    });
  }

  /* ======================= Add / Edit Department (form) ======================= */
  function initForm() {
    var form = document.getElementById('departmentForm');
    var f = {
      name: document.getElementById('departmentName'), code: document.getElementById('departmentCode'),
      college: document.getElementById('departmentCollege'), head: document.getElementById('departmentHead'),
      description: document.getElementById('departmentDescription')
    };
    var v = S.validator(form);

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That department was not found.', 'error'); window.location.href = 'departments.html'; return; }
      document.title = 'Edit Department | PSU CMS';
    }

    /* parent colleges come from the Colleges dataset */
    var colleges = S.colleges();
    if (colleges.length) {
      var sel = editing && S.college(editing.collegeId) ? editing.collegeId : '';
      ui.setOptions(f.college, [{ value: '', label: 'Select a college' }].concat(colleges.map(function (c) { return { value: c.id, label: c.name }; })), sel);
    } else {
      ui.setOptions(f.college, [{ value: '', label: 'No colleges yet' }], '');
      document.getElementById('departmentCollegeHint').hidden = false;
    }

    /* searchable faculty dropdown */
    var head = CMS.combobox.create(document.getElementById('departmentHeadBox'), {
      items: function () {
        return CMS.db.faculty.list().sort(function (a, b) { return a.name.localeCompare(b.name); })
          .map(function (p) { return { id: p.id, label: p.name, sub: [p.position, p.department].filter(Boolean).join(' \u00B7 ') }; });
      },
      emptyText: 'No matching faculty', clearLabel: 'Clear department head'
    });

    if (editing) {
      f.name.value = editing.name; f.code.value = editing.code; f.description.value = editing.description || '';
      if (editing.headName) head.setValue({ id: editing.headId, label: editing.headName });   // snapshot keeps the name if the faculty record was removed
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      v.reset();
      var name = f.name.value.trim(), code = f.code.value.trim().toUpperCase(), collegeId = f.college.value;
      var siblings = db.list().filter(function (d) { return d.collegeId === collegeId && (!editing || d.id !== editing.id); });

      if (!collegeId || !S.college(collegeId)) v.fail(f.college, 'Choose an existing parent college.');
      if (!name) v.fail(f.name, 'Enter the department name.');
      else if (siblings.some(function (d) { return S.same(d.name, name); })) v.fail(f.name, 'This college already has a department with this name.');
      if (!code) v.fail(f.code, 'Enter the department code.');
      else if (!/^[A-Z0-9-]{1,12}$/.test(code)) v.fail(f.code, 'Use letters, numbers or hyphens only (max 12).');
      else if (siblings.some(function (d) { return S.same(d.code, code); })) v.fail(f.code, 'This code is already used in the selected college.');
      if (!v.ok()) { ui.toast('Please fix the highlighted fields.', 'error'); return; }

      var h = head.getValue();
      var record = { name: name, code: code, collegeId: collegeId, description: f.description.value.trim(), headId: h ? h.id : '', headName: h ? h.label : '' };
      if (editing) record.id = editing.id;
      else Object.assign(record, { status: 'active', contactEmail: '', officeLocation: '', operationalHours: '' });
      var res = db.save(record);
      if (!res.ok) { S.saveFailed(); return; }
      S.syncProgramsWithDepartment(res.record);   // keep programs under the same college as their department
      ui.flash(editing ? 'Department updated.' : 'Department added.', 'success');
      window.location.href = 'departments.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('departmentForm')) initForm();
    else if (document.getElementById('departmentTableBody')) initList();
  });
})();
