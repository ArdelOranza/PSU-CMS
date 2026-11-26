/* Public Faculty & Staff Directory and profile pages (reads the same mock data the admin pages edit). */
(function () {
  'use strict';
  var U = PSU.util, esc = U.esc;
  var PER_PAGE = 8;

  function avatar(p, cls) {
    return '<span class="avatar ' + cls + '">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy">' : esc(U.initials(p))) + '</span>';
  }
  function pill(p) { var a = p.status === 'active'; return '<span class="pill' + (a ? '' : ' pill--muted') + '">' + (a ? 'Active' : 'Inactive') + '</span>'; }

  /* ---------------- directory ---------------- */
  var grid = document.getElementById('peopleGrid');
  if (grid) {
    var search = document.getElementById('dir-search'), dept = document.getElementById('dir-dept'), campus = document.getElementById('dir-campus');
    var empty = document.getElementById('peopleEmpty'), pager = document.getElementById('peoplePager');
    var page = 1;
    search.value = U.param('q');
    function uniq(list) { return list.filter(function (v, i) { return v && list.indexOf(v) === i; }).sort(); }
    function fill(sel, first, values) {
      var cur = sel.value;
      sel.innerHTML = '<option value="">' + first + '</option>' + values.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
      sel.value = cur;
    }
    var people = PSU.db.all('personnel');
    fill(dept, 'All departments', uniq(people.map(function (p) { return p.department; }).concat(people.map(function (p) { return p.college; }))));
    fill(campus, 'All Campuses', uniq(people.map(function (p) { return p.campus; })));

    function render() {
      var q = search.value.trim().toLowerCase();
      var list = PSU.db.all('personnel').filter(function (p) {
        if (dept.value && p.department !== dept.value && p.college !== dept.value) return false;
        if (campus.value && p.campus !== campus.value) return false;
        return !q || [U.fullName(p), p.position, p.college, p.department, p.specialization].join(' ').toLowerCase().indexOf(q) > -1;
      }).sort(function (a, b) { return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName); });
      var filtered = !!(q || dept.value || campus.value);
      var pg = U.paginate(list, page, PER_PAGE); page = pg.page;
      if (!pg.total) {
        grid.innerHTML = ''; pager.innerHTML = '';
        empty.hidden = false;
        empty.innerHTML = '<p class="listing-empty__title">' + (filtered ? 'No matching faculty or staff found' : 'The directory is empty') + '</p><p>' + (filtered ? 'Try a different name, department, or campus.' : 'Faculty and staff profiles will appear here once they are added.') + '</p>' + (filtered ? '<button class="btn btn--outline" type="button" data-clear>Clear filters</button>' : '');
        return;
      }
      empty.hidden = true;
      grid.innerHTML = pg.items.map(function (p) {
        return '<li><a class="person-card" href="profile.html?id=' + p.id + '">' + avatar(p, 'avatar--lg') + '<span class="person-card__name">' + esc(U.fullName(p)) + '</span><span class="person-card__role">' + esc(p.position) + '</span><span class="person-card__unit">' + esc(p.college || p.department) + '</span><span class="person-card__email">' + esc(p.email) + '</span>' + pill(p) + '</a></li>';
      }).join('');
      pager.innerHTML = U.pagerHtml(pg, 'pager__btn', 'pager');
    }
    search.addEventListener('input', function () { page = 1; render(); });
    dept.addEventListener('change', function () { page = 1; render(); });
    campus.addEventListener('change', function () { page = 1; render(); });
    document.getElementById('dirForm').addEventListener('submit', function (e) { e.preventDefault(); page = 1; render(); });
    pager.addEventListener('click', function (e) { var b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = Number(b.getAttribute('data-page')); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    empty.addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) { search.value = ''; dept.value = ''; campus.value = ''; page = 1; render(); } });
    render();
  }

  /* ---------------- profile ---------------- */
  var root = document.getElementById('profileRoot');
  if (root) {
    var p = PSU.db.get('personnel', U.param('id'));
    if (!p) {
      document.title = 'Profile not found | Pangasinan State University';
      document.getElementById('profileCrumb').textContent = 'Not found';
      document.getElementById('profileTitle').textContent = 'Profile not found';
      root.innerHTML = '<div class="listing-empty"><p class="listing-empty__title">This profile does not exist or was removed.</p><a class="btn btn--primary" href="directory.html">Back to the directory</a></div>';
    } else {
      var name = U.fullName(p), unit = p.college || p.department;
      var subtitle = [p.position, unit].filter(Boolean).join(', ');
      var office = [unit, p.campus ? p.campus + ' Campus' : ''].filter(Boolean).join(', ');
      var paras = (p.biography || '').split(/\n+/).filter(function (s) { return s.trim(); });
      var degrees = (p.education || '').split(/\n+/).filter(function (s) { return s.trim(); });
      document.title = name + ' | Pangasinan State University';
      document.getElementById('profileCrumb').textContent = name;
      document.getElementById('profileTitle').textContent = name;
      var dl = '';
      if (p.email) dl += '<dt>Email</dt><dd><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></dd>';
      if (office) dl += '<dt>Office</dt><dd>' + esc(office) + '</dd>';
      if (p.specialization) dl += '<dt>Specialization</dt><dd>' + esc(p.specialization) + '</dd>';
      root.innerHTML = '<div class="profile-layout"><aside class="person-card person-card--static" aria-label="Summary">' + avatar(p, 'avatar--md') +
        '<span class="person-card__name">' + esc(name) + '</span><span class="person-card__role">' + esc(p.position) + '</span><span class="person-card__unit">' + esc(unit) + '</span><span class="person-card__email">' + esc(p.email) + '</span>' + pill(p) + '</aside>' +
        '<article class="profile-main"><h2 class="profile-main__name">' + esc(name) + '</h2>' + (subtitle ? '<p class="profile-main__sub">' + esc(subtitle) + '</p>' : '') +
        '<p class="profile-pills">' + (unit ? '<span class="pill">' + esc(unit) + '</span>' : '') + pill(p) + '</p>' +
        (paras.length ? '<h3 class="profile-heading">Biography</h3>' + paras.map(function (t) { return '<p>' + esc(t.trim()) + '</p>'; }).join('') : '') +
        (degrees.length ? '<h3 class="profile-heading">Academic Credentials</h3><ul class="profile-list">' + degrees.map(function (t) { return '<li>' + esc(t.trim()) + '</li>'; }).join('') + '</ul>' : '') +
        '<section class="contact-card" aria-labelledby="contact-info-title"><h3 id="contact-info-title">Contact Information</h3><dl>' + dl + '</dl></section></article></div>';
    }
  }
})();
