/* ==========================================================================
   structure-db.js — datasets and shared helpers for University Structure
   (Colleges, Departments, Academic Programs) and User Management
   (All Users, Add New User, User Roles).

   Load order: config.js, seed-data.js, storage.js, structure-seed.js,
   structure-db.js, ui.js. It only ADDS to the shared CMS.db object, so
   storage.js and seed-data.js stay untouched and CMS.dev.clearAll() /
   resetAll() automatically include these datasets.

   Relationships (all by ID):
     department.collegeId  -> college.id
     program.collegeId     -> college.id      program.departmentId -> department.id
     department.headId     -> faculty.id (CMS.db.faculty, owned by the Faculty module)
     user.roleId           -> role.id
   These are front-end simulations. They are NOT real database constraints and
   NOT real access control. PHP: enforce every rule again on the server.
   ========================================================================== */
window.CMS = window.CMS || {};

(function () {
  var st = CMS.storage, seed = CMS.seedStructure;

  CMS.db.colleges    = st.createRepo('colleges', 'col', seed.colleges);
  CMS.db.departments = st.createRepo('departments', 'dept', seed.departments);
  CMS.db.programs    = st.createRepo('programs', 'prog', seed.programs);
  CMS.db.roles       = st.createRepo('roles', 'role', seed.roles);
  CMS.db.users       = st.createRepo('users', 'usr', seed.users);

  /* Rows per page, taken from the screenshots (same convention as the other modules). */
  CMS.config.pageSize = Object.assign({ colleges: 3, departments: 4, programs: 3, users: 4 }, CMS.config.pageSize);
  CMS.config.degreeLevels = ['Bachelor', 'Master', 'Doctorate'];
  CMS.config.recordStatuses = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];
  CMS.config.userStatuses = [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }];
  CMS.config.avatarMaxWidth = 256;     // profile pictures are kept small (localStorage is ~5 MB)
  CMS.config.collegeImageMaxWidth = 800;

  /* ---------- Faculty directory: add the sample department heads once ---------- */
  var FACULTY_FLAG = CMS.config.storagePrefix + 'structureFacultySeeded';
  function mergeSampleFaculty() {
    try {
      if (window.localStorage.getItem(FACULTY_FLAG)) return;
      seed.faculty().forEach(function (f) { if (!CMS.db.faculty.get(f.id)) CMS.db.faculty.save(f); });
      window.localStorage.setItem(FACULTY_FLAG, '1');
    } catch (e) { /* storage unavailable: heads fall back to the saved headName */ }
  }
  mergeSampleFaculty();
  /* keep the console helper working: resetAll() restores the faculty list, so merge again */
  if (CMS.dev && CMS.dev.resetAll) {
    var originalReset = CMS.dev.resetAll;
    CMS.dev.resetAll = function () {
      originalReset();
      try { window.localStorage.removeItem(FACULTY_FLAG); } catch (e) { /* ignore */ }
      mergeSampleFaculty();
    };
  }

  /* ======================================================================
     CMS.structure — lookups, rules and small UI helpers shared by the pages
     ====================================================================== */
  var S = CMS.structure = {};

  function byName(a, b) { return String(a.name).localeCompare(String(b.name)); }
  function same(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
  S.same = same;

  /* ---------- Lookups (always read from the datasets, never hard-coded) ---------- */
  S.colleges = function () { return CMS.db.colleges.list().sort(byName); };
  S.departments = function () { return CMS.db.departments.list().sort(byName); };
  S.roles = function () { return CMS.db.roles.list(); };
  S.departmentsOf = function (collegeId) { return S.departments().filter(function (d) { return d.collegeId === collegeId; }); };
  S.programsOfCollege = function (collegeId) { return CMS.db.programs.list().filter(function (p) { return p.collegeId === collegeId; }); };
  S.programsOfDepartment = function (deptId) { return CMS.db.programs.list().filter(function (p) { return p.departmentId === deptId; }); };
  S.usersOfRole = function (roleId) { return CMS.db.users.list().filter(function (u) { return u.roleId === roleId; }); };
  S.college = function (id) { return CMS.db.colleges.get(id); };
  S.department = function (id) { return CMS.db.departments.get(id); };
  S.role = function (id) { return CMS.db.roles.get(id); };
  S.collegeCode = function (id) { var c = S.college(id); return c ? c.code : '\u2014'; };
  S.collegeName = function (id) { var c = S.college(id); return c ? c.name : 'Unknown college'; };
  S.departmentName = function (id) { var d = S.department(id); return d ? d.name : 'Unknown department'; };
  S.roleName = function (id) { var r = S.role(id); return r ? r.name : 'Unassigned'; };
  /* staff of a department: the head plus faculty whose directory "department" text matches */
  S.staffOf = function (dept) {
    return CMS.db.faculty.list().filter(function (f) { return f.id === dept.headId || same(f.department, dept.name); });
  };

  /* ---------- Rules used by several pages ---------- */
  S.isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  /* A department that moves to another college drags its programs along, so
     program.collegeId never disagrees with its department. */
  S.syncProgramsWithDepartment = function (dept) {
    S.programsOfDepartment(dept.id).forEach(function (p) {
      if (p.collegeId !== dept.collegeId) CMS.db.programs.save({ id: p.id, collegeId: dept.collegeId });
    });
  };

  /* ---------- Display helpers ---------- */
  S.statusBadge = function (status) {
    var map = { active: ['green', 'Active'], inactive: ['gray', 'Inactive'], suspended: ['red', 'Suspended'] };
    var m = map[status] || ['gray', status || '\u2014'];
    return CMS.ui.el('span', { class: 'cms-status cms-status-' + m[0], text: m[1] });
  };
  /* '2026-10-28' -> 'Oct 28'; today/yesterday are spelled out; empty -> 'Never' */
  S.formatLastLogin = function (iso) {
    if (!iso) return 'Never';
    var d = new Date(); function ymd(x) { return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
    if (iso === ymd(d)) return 'Today';
    d.setDate(d.getDate() - 1);
    if (iso === ymd(d)) return 'Yesterday';
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);   // design shows e.g. "Oct 02"
    var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m ? names[parseInt(m[1], 10) - 1] + ' ' + m[2] : '';
  };
  S.listOf = function (items, emptyText) {
    if (!items.length) return CMS.ui.el('span', { class: 'structure-none', text: emptyText || 'None' });
    return CMS.ui.el('ul', { class: 'structure-list' }, items.map(function (t) { return CMS.ui.el('li', { text: t }); }));
  };

  /* ---------- Dialogs ---------- */
  /* Message-only dialog for "can't delete because ..." */
  S.blocked = function (title, message) {
    var ui = CMS.ui;
    var closeBtn = ui.el('button', { type: 'button', class: 'cms-btn cms-btn-primary', 'data-bs-dismiss': 'modal', text: 'OK' });
    return ui.openModal(ui.modalShell(title, [ui.el('p', { text: message })], [closeBtn]));
  };
  S.saveFailed = function () {
    CMS.ui.toast('Could not save. The browser storage may be full or disabled \u2014 try a smaller image.', 'error');
  };

  /* ---------- Images (data URLs only: the site CSP blocks blob: URLs) ---------- */
  /* Shrinks an existing data URL so many images fit in localStorage. */
  S.shrinkImage = function (dataUrl, maxWidth) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onerror = function () { resolve(dataUrl); };
      img.onload = function () {
        if (img.width <= maxWidth) { resolve(dataUrl); return; }
        var scale = maxWidth / img.width, c = document.createElement('canvas');
        c.width = maxWidth; c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', CMS.config.imageQuality));
      };
      img.src = dataUrl;
    });
  };
  /* Wires "preview + Upload/Replace + Remove" markup. Returns { get, set }. */
  S.imageField = function (o) {
    var ui = CMS.ui, value = '';
    function render() {
      ui.clear(o.preview);
      if (value) o.preview.appendChild(ui.el('img', { src: value, alt: o.alt || 'Preview' }));
      else o.preview.appendChild(ui.el('span', { text: o.placeholder }));
      o.button.textContent = value ? 'Replace Image' : 'Upload Image';
      o.remove.hidden = !value;
    }
    o.button.addEventListener('click', function () { o.input.click(); });
    o.input.addEventListener('change', function () {
      var file = o.input.files[0];
      if (!file) return;
      ui.readImage(file).then(function (url) { return S.shrinkImage(url, o.maxWidth); })
        .then(function (url) { value = url; render(); })
        .catch(function (err) { ui.toast(err.message, 'error'); })
        .then(function () { o.input.value = ''; });
    });
    o.remove.addEventListener('click', function () { value = ''; render(); });
    render();
    return { get: function () { return value; }, set: function (v) { value = v || ''; render(); } };
  };

  /* ---------- Form validation helper ---------- */
  /* var v = S.validator(form); v.fail(input, 'msg'); if (!v.ok()) return; */
  S.validator = function (form) {
    var ui = CMS.ui, first = null;
    /* typing in a field clears its error */
    form.addEventListener('input', function (e) { S.clearFieldError(e.target); });
    form.addEventListener('change', function (e) { S.clearFieldError(e.target); });
    return {
      reset: function () { ui.clearErrors(form); first = null; },
      fail: function (input, msg) { ui.setError(input, msg); if (!first) first = input._cmsButton || input; },
      /* true when nothing failed; otherwise focuses the first bad field */
      ok: function () { if (first) { first.focus(); return false; } return true; }
    };
  };
  S.clearFieldError = function (input) {
    var field = input.closest && input.closest('.cms-field');
    if (field) field.classList.remove('has-error');
    input.classList.remove('is-invalid');
    if (input._cmsButton) input._cmsButton.classList.remove('is-invalid');
    input.removeAttribute && input.removeAttribute('aria-invalid');
  };

  /* ---------- Generic list page: search + filters + pagination + empty states ----------
     o = { body, wrap, emptyBox, footer, search, filters:[{ select, key }], pageSize,
           all(), match(item, q, filters), row(item, refresh),
           emptyNone:{...}, emptyFiltered:{...} }                                      */
  S.listPage = function (o) {
    var ui = CMS.ui, state = { page: 1, q: '', f: {} };
    o.filters = o.filters || [];
    o.filters.forEach(function (f) { state.f[f.key] = ''; });

    function render() {
      var all = o.all();
      var rows = all.filter(function (it) { return o.match(it, state.q.toLowerCase(), state.f); });
      var pages = Math.max(1, Math.ceil(rows.length / o.pageSize));
      state.page = Math.min(state.page, pages);
      ui.clear(o.body); ui.clear(o.footer);
      if (!rows.length) {
        o.wrap.hidden = true; o.emptyBox.hidden = false;
        ui.renderEmpty(o.emptyBox, all.length ? o.emptyFiltered : o.emptyNone);
        return;
      }
      o.wrap.hidden = false; o.emptyBox.hidden = true;
      rows.slice((state.page - 1) * o.pageSize, state.page * o.pageSize).forEach(function (it) { o.body.appendChild(o.row(it, render)); });
      ui.renderFooter(o.footer, { page: state.page, pageSize: o.pageSize, total: rows.length, onPage: function (p) { state.page = p; render(); } });
    }
    o.search.addEventListener('input', ui.debounce(function () { state.q = o.search.value.trim(); state.page = 1; render(); }, 180));
    o.filters.forEach(function (f) {
      f.select.addEventListener('change', function () { state.f[f.key] = f.select.value; state.page = 1; render(); });
    });
    render();
    return { render: render };
  };

  /* Row action buttons: View (button), Edit (link), Delete (button). */
  S.actions = function (label, editHref, onView, onDelete) {
    var ui = CMS.ui;
    var view = ui.el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View ' + label, text: 'View' });
    var edit = ui.el('a', { class: 'cms-action', href: editHref, 'aria-label': 'Edit ' + label, text: 'Edit' });
    var del = ui.el('button', { type: 'button', class: 'cms-action cms-action-danger', 'aria-label': 'Delete ' + label, text: 'Delete' });
    view.addEventListener('click', onView);
    del.addEventListener('click', onDelete);
    return ui.el('td', {}, [ui.el('div', { class: 'cms-actions' }, [view, edit, del])]);
  };
  /* Fills a filter <select> from a dataset: first option is the "All ..." choice. */
  S.fillFilter = function (select, allLabel, items) {
    CMS.ui.setOptions(select, [{ value: '', label: allLabel }].concat(items), '');
  };
})();
