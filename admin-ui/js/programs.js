/* ==========================================================================
   programs.js — Academic Programs list (academic-programs.html) and
   Add/Edit Program form (program-form.html, edit mode via ?id=).
   A program stores collegeId + departmentId + degreeLevel. The department
   options always depend on the selected college.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.programs;

  /* ======================= Academic Programs (list) ======================= */
  function initList() {
    var collegeSel = document.getElementById('programFilterCollege');
    var levelSel = document.getElementById('programFilterLevel');
    S.fillFilter(collegeSel, 'All Colleges', S.colleges().map(function (c) { return { value: c.id, label: c.name }; }));
    S.fillFilter(levelSel, 'All Levels', CMS.config.degreeLevels.map(function (l) { return { value: l, label: l }; }));

    function buildRow(p, refresh) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [el('span', { class: 'cms-cell-title', text: p.name })]));
      tr.appendChild(el('td', { text: p.code }));
      tr.appendChild(el('td', { text: p.degreeLevel }));
      tr.appendChild(el('td', { text: S.collegeCode(p.collegeId) }));
      tr.appendChild(el('td', { text: S.departmentName(p.departmentId) }));
      tr.appendChild(el('td', { text: p.description || '' }));
      tr.appendChild(el('td', {}, [S.statusBadge(p.status)]));
      tr.appendChild(S.actions(p.name, 'program-form.html?id=' + encodeURIComponent(p.id),
        function () { showProgram(p); }, function () { removeProgram(p, refresh); }));
      return tr;
    }

    /* Read-only program detail (public-site preview). Empty optional fields are skipped. */
    function showProgram(p) {
      ui.showDetails({
        title: p.name,
        rows: [
          ['Code', p.code], ['Degree level', p.degreeLevel], ['College', S.collegeName(p.collegeId)],
          ['Department', S.departmentName(p.departmentId)], ['Campus', p.campus], ['Description', p.description],
          ['Career prospects', p.careerProspects], ['Admission criteria', p.admissionCriteria],
          ['Accreditation', p.accreditation], ['Syllabus file', p.syllabusFileName], ['Status', S.statusBadge(p.status)]
        ]
      });
    }

    function removeProgram(p, refresh) {
      ui.confirmDialog({ title: 'Delete program', message: 'Delete \u201C' + p.name + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(p.id)) { ui.toast('Program deleted.', 'success'); refresh(); }
          else ui.toast('The program could not be deleted.', 'error');
        });
    }

    S.listPage({
      body: document.getElementById('programTableBody'), wrap: document.getElementById('programTableWrap'),
      emptyBox: document.getElementById('programEmpty'), footer: document.getElementById('programFooter'),
      search: document.getElementById('programSearch'),
      filters: [{ select: collegeSel, key: 'college' }, { select: levelSel, key: 'level' }],
      pageSize: CMS.config.pageSize.programs, all: function () { return db.list(); },
      match: function (p, q, f) {
        if (f.college && p.collegeId !== f.college) return false;
        if (f.level && p.degreeLevel !== f.level) return false;
        return !q || (p.name + ' ' + p.code + ' ' + S.departmentName(p.departmentId) + ' ' + S.collegeCode(p.collegeId)).toLowerCase().indexOf(q) !== -1;
      },
      row: buildRow,
      emptyNone: { title: 'No academic programs yet', text: 'Programs you add will appear here.', actionLabel: '+ Add Academic Program', actionHref: 'program-form.html' },
      emptyFiltered: { title: 'No matching programs found', text: 'Try a different search or filter.' }
    });
  }

  /* ======================= Add / Edit Academic Program (form) ======================= */
  function initForm() {
    var form = document.getElementById('programForm');
    var f = {
      name: document.getElementById('programName'), code: document.getElementById('programCode'),
      level: document.getElementById('programLevel'), college: document.getElementById('programCollege'),
      department: document.getElementById('programDepartment'), description: document.getElementById('programDescription')
    };
    var v = S.validator(form);

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That program was not found.', 'error'); window.location.href = 'academic-programs.html'; return; }
      document.title = 'Edit Academic Program | PSU CMS';
    }

    ui.setOptions(f.level, CMS.config.degreeLevels.map(function (l) { return { value: l, label: l }; }), editing ? editing.degreeLevel : CMS.config.degreeLevels[0]);

    /* departments depend on the selected college */
    function fillDepartments(collegeId, selected) {
      var list = collegeId ? S.departmentsOf(collegeId) : [];
      var placeholder = !collegeId ? 'Select a college first' : list.length ? 'Select a department' : 'No departments in this college';
      ui.setOptions(f.department, [{ value: '', label: placeholder }].concat(list.map(function (d) { return { value: d.id, label: d.name }; })), selected || '');
    }
    var colleges = S.colleges();
    if (colleges.length) {
      var selCollege = editing && S.college(editing.collegeId) ? editing.collegeId : '';
      ui.setOptions(f.college, [{ value: '', label: 'Select a college' }].concat(colleges.map(function (c) { return { value: c.id, label: c.name }; })), selCollege);
      fillDepartments(selCollege, editing ? editing.departmentId : '');
    } else {
      ui.setOptions(f.college, [{ value: '', label: 'No colleges yet' }], '');
      fillDepartments('', '');
      document.getElementById('programCollegeHint').hidden = false;
    }
    f.college.addEventListener('change', function () { fillDepartments(f.college.value, ''); });

    if (editing) { f.name.value = editing.name; f.code.value = editing.code; f.description.value = editing.description || ''; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      v.reset();
      var name = f.name.value.trim(), code = f.code.value.trim();
      var others = db.list().filter(function (p) { return !editing || p.id !== editing.id; });
      var dept = S.department(f.department.value);

      if (!name) v.fail(f.name, 'Enter the program name.');
      else if (others.some(function (p) { return p.departmentId === f.department.value && S.same(p.name, name); })) v.fail(f.name, 'This department already has a program with this name.');
      if (!code) v.fail(f.code, 'Enter the program code.');
      else if (!/^[A-Za-z0-9 .-]{1,16}$/.test(code)) v.fail(f.code, 'Use letters and numbers only (max 16).');
      else if (others.some(function (p) { return S.same(p.code, code); })) v.fail(f.code, 'This program code is already used.');
      if (!CMS.config.degreeLevels.includes(f.level.value)) v.fail(f.level, 'Choose a degree level.');
      if (!f.college.value || !S.college(f.college.value)) v.fail(f.college, 'Choose an existing college.');
      if (!dept) v.fail(f.department, 'Choose a department.');
      else if (dept.collegeId !== f.college.value) v.fail(f.department, 'That department does not belong to the selected college.');
      if (!v.ok()) { ui.toast('Please fix the highlighted fields.', 'error'); return; }

      var record = { name: name, code: code, degreeLevel: f.level.value, collegeId: f.college.value, departmentId: dept.id, description: f.description.value.trim() };
      if (editing) record.id = editing.id;
      else Object.assign(record, { status: 'active', campus: '', careerProspects: '', admissionCriteria: '', accreditation: '', syllabusFileName: '' });
      var res = db.save(record);
      if (!res.ok) { S.saveFailed(); return; }
      ui.flash(editing ? 'Program updated.' : 'Program added.', 'success');
      window.location.href = 'academic-programs.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('programForm')) initForm();
    else if (document.getElementById('programTableBody')) initList();
  });
})();
