/* All Personnel (list) and Add / Edit Personnel (form). */
(function () {
  'use strict';
  var A = window.PSUAdmin, U = PSU.util, esc = A.esc;
  var PER_PAGE = 8;

  /* ---------------- list ---------------- */
  var rowsEl = document.getElementById('personnelRows');
  if (rowsEl) {
    var search = A.$('#personnelSearch'), college = A.$('#filterCollege'), dept = A.$('#filterDepartment');
    var tableWrap = A.$('#personnelTable'), footer = A.$('#personnelFooter'), empty = A.$('#personnelEmpty');
    var page = 1;

    function fillFilters() {
      var people = PSU.db.all('personnel');
      CMS.ui.setOptions(college, [{ value: '', label: 'All Colleges' }].concat(A.unique(people.map(function (p) { return p.college; })).map(function (c) { return { value: c, label: c }; })), college.value);
      CMS.ui.setOptions(dept, [{ value: '', label: 'All Departments' }].concat(A.unique(people.map(function (p) { return p.department; })).map(function (c) { return { value: c, label: c }; })), dept.value);
    }

    function render() {
      var q = search.value.trim().toLowerCase();
      var list = PSU.db.all('personnel').filter(function (p) {
        if (college.value && p.college !== college.value) return false;
        if (dept.value && p.department !== dept.value) return false;
        if (!q) return true;
        return [U.fullName(p), p.position, p.email, p.college, p.department].join(' ').toLowerCase().indexOf(q) > -1;
      }).sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
      var filtered = !!(q || college.value || dept.value);
      var pg = U.paginate(list, page, PER_PAGE);
      page = pg.page;
      if (!pg.total) {
        tableWrap.hidden = true; footer.innerHTML = '';
        empty.innerHTML = A.emptyHtml('No personnel available', 'Items you add will appear here.',
          '');
        return;
      }
      empty.innerHTML = ''; tableWrap.hidden = false;
      rowsEl.innerHTML = pg.items.map(function (p) {
        var name = U.fullName(p), active = p.status === 'active';
        var thumb = p.photo ? '<img class="cms-thumb res-person-thumb" src="' + esc(p.photo) + '" alt="">' : '<span class="cms-thumb res-person-thumb res-person-initials" aria-hidden="true">' + esc(U.initials(p)) + '</span>';
        return '<tr><td>' + thumb + '</td><td>' + esc(name) + '</td><td>' + esc(p.position) + '</td><td>' + esc(U.unitLabel(p)) + '</td><td>' + esc(p.email) + '</td>' +
          '<td><span class="cms-status ' + (active ? 'cms-status-green' : 'cms-status-gray') + '">' + (active ? 'Active' : 'Inactive') + '</span></td>' +
          '<td><div class="cms-actions"><a class="cms-action" href="../client/profile.html?id=' + p.id + '" target="_blank" rel="noopener">View</a>' +
          '<a class="cms-action" href="personnel-form.html?id=' + p.id + '">Edit</a>' +
          '<button type="button" class="cms-action cms-action-danger" data-delete="' + p.id + '">Delete</button></div></td></tr>';
      }).join('');
      footer.innerHTML = A.footerHtml(pg);
    }

    function refresh(resetPage) { if (resetPage) page = 1; render(); }
    fillFilters();
    search.addEventListener('input', A.debounce(function () { refresh(true); }, 150));
    college.addEventListener('change', function () { refresh(true); });
    dept.addEventListener('change', function () { refresh(true); });
    A.$('#personnelFilters').addEventListener('submit', function (e) { e.preventDefault(); refresh(true); });
    A.onPager(footer, function (n) { page = n; render(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) { search.value = ''; college.value = ''; dept.value = ''; CMS.ui.syncSelect(college); CMS.ui.syncSelect(dept); refresh(true); return; }
      var del = e.target.closest('[data-delete]');
      if (!del) return;
      var p = PSU.db.get('personnel', del.getAttribute('data-delete'));
      if (!p) return;
      CMS.ui.confirmDelete({ text: 'Delete ' + U.fullName(p) + '? This removes the profile from the public directory.' }).then(function (ok) {
        if (!ok) return;
        PSU.db.remove('personnel', p.id);
        CMS.ui.toast('Personnel record deleted.', 'deleted');
        fillFilters(); render();
      });
    });
    render();
  }

  /* ---------------- form ---------------- */
  var form = document.getElementById('personnelForm');
  if (form) {
    var id = Number(U.param('id')) || 0;
    var rec = id ? PSU.db.get('personnel', id) : null;
    if (id && !rec) { A.go('That personnel record no longer exists.', 'all-personnel.html', 'error'); return; }
    var photoData = rec ? rec.photo : '';
    var preview = A.$('#photoPreview'), fileInput = A.$('#f_photo');

    function opts(list, blank) { return [{ value: '', label: blank }].concat(list.map(function (v) { return { value: v, label: v }; })); }
    var colleges = Object.keys(PSU.COLLEGES).concat(PSU.UNITS), depts = PSU.DEPARTMENTS.slice();
    if (rec && rec.college && colleges.indexOf(rec.college) < 0) colleges.push(rec.college);
    if (rec && rec.department && depts.indexOf(rec.department) < 0) depts.push(rec.department);
    CMS.ui.setOptions(A.$('#f_college'), opts(colleges, 'Select college'), rec ? rec.college : '');
    CMS.ui.setOptions(A.$('#f_department'), opts(depts, 'Select department'), rec ? rec.department : '');

    var map = { firstName: 'f_firstName', middleName: 'f_middleName', lastName: 'f_lastName', position: 'f_position', email: 'f_email', phone: 'f_phone', education: 'f_education', biography: 'f_biography' };
    Object.keys(map).forEach(function (k) { if (rec) A.$('#' + map[k]).value = rec[k] || ''; });
    if (!rec) A.$('#f_phone').value = '+63 9';

    function showPhoto() {
      preview.innerHTML = photoData ? '<img src="' + esc(photoData) + '" alt="Profile picture preview">' : '<i class="bi bi-person" aria-hidden="true"></i>';
    }
    showPhoto();
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (!f) return;
      var ext = A.extOf(f.name);
      var msg = ['jpg', 'png', 'gif', 'webp'].indexOf(ext) < 0 ? 'Choose a JPG, PNG, GIF or WebP image.' : (f.size > PSU.MAX_BYTES ? 'The image is larger than 12 MB.' : '');
      A.setFieldError('err_photo', msg);
      if (msg) { fileInput.value = ''; return; }
      U.readImage(f, 360, function (r) {
        if (!r) { A.setFieldError('err_photo', 'That image could not be read.'); return; }
        photoData = r.dataUrl; showPhoto();
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      CMS.ui.clearErrors(form);
      var v = {}; Object.keys(map).forEach(function (k) { v[k] = A.$('#' + map[k]).value.trim(); });
      var bad = 0;
      function err(field, msg) { CMS.ui.setError(A.$('#' + field), msg); bad++; }
      if (!v.firstName) err('f_firstName', 'First name is required.');
      if (!v.lastName) err('f_lastName', 'Last name is required.');
      if (!v.position) err('f_position', 'Position / designation is required.');
      if (v.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) err('f_email', 'Enter a valid email address.');
        else if (PSU.db.all('personnel').some(function (p) { return p.id !== id && p.email.toLowerCase() === v.email.toLowerCase(); })) err('f_email', 'Another personnel record already uses this email address.');
      }
      var phone = /^\+?63\s*9?\s*$/.test(v.phone) ? '' : v.phone;
      if (phone && !/^\+?[0-9][0-9\s().-]{6,30}$/.test(phone)) err('f_phone', 'Enter a valid contact number, for example +63 912 345 6789.');
      if (bad) { var first = form.querySelector('.has-error input, .has-error textarea'); if (first) first.focus(); CMS.ui.toast('Please fix the highlighted fields.', 'error'); return; }
      var out = rec ? Object.assign({}, rec) : {};
      Object.keys(v).forEach(function (k) { out[k] = v[k]; });
      out.phone = phone; out.college = A.$('#f_college').value; out.department = A.$('#f_department').value; 
      out.status = out.status || 'active'; out.photo = photoData;
      if (!PSU.db.put('personnel', out)) { CMS.ui.toast('The browser could not store this record (storage is full). Try a smaller photo.', 'error'); return; }
      A.go(rec ? 'Personnel record updated.' : 'Personnel added.', 'all-personnel.html');
    });
  }
})();
