/* departments.js — Departments directory (client-ui/academics/departments.html)
   Search by department name + college filter + campus filter, 9 cards per page (3 x 3).
   A department is available at the campuses of its college. */
(function () {
  'use strict';
  var D = window.PSUAcademics, U = window.PSUAcademicsUI;
  var grid = document.getElementById('departmentGrid');
  if (!grid) return;

  U.fillSelect(document.getElementById('departmentCollege'),
    [{ value: '', label: 'All colleges' }].concat(D.colleges().map(function (c) { return { value: c.id, label: c.name }; })));
  U.fillSelect(document.getElementById('departmentCampus'),
    [{ value: '', label: 'All Campuses' }].concat(D.campuses.map(function (c) { return { value: c, label: c }; })));

  function card(d) {
    var college = D.college(d.collegeId), s = D.departmentStats(d.id);
    var href = 'department-details.html?id=' + encodeURIComponent(d.id);
    return U.el('article', { class: 'ac-card ac-card--department' }, [
      U.el('span', { class: 'ac-pill', title: college.name, text: college.abbreviation }),
      U.el('h2', { class: 'ac-card__title', text: d.name }),
      U.el('p', { class: 'ac-card__meta', text: 'Chairperson: ' + (d.chairperson || 'To be announced') }),
      U.el('p', { class: 'ac-card__meta', text: U.plural(s.faculty, 'faculty', 'faculty') + ' · ' + U.plural(s.programs, 'program') }),
      U.el('a', { class: 'ac-card__link', href: href }, ['View department', U.el('span', { class: 'visually-hidden', text: ': ' + d.name }), U.icon('arrow-right')])
    ]);
  }

  var controller = U.listController({
    fields: {
      q: U.textField(document.getElementById('departmentSearch')),
      college: U.selectField(document.getElementById('departmentCollege')),
      campus: U.selectField(document.getElementById('departmentCampus'))
    },
    items: function () { return D.departments(); },
    match: function (d, s) {
      if (s.college && d.collegeId !== s.college) return false;
      if (s.campus && D.departmentCampuses(d).indexOf(s.campus) === -1) return false;
      return !s.q || d.name.toLowerCase().indexOf(s.q.toLowerCase()) !== -1;
    },
    pageSize: 9,
    render: function (list) { U.clear(grid); list.forEach(function (d) { grid.appendChild(card(d)); }); },
    status: document.getElementById('departmentStatus'), pager: document.getElementById('departmentPager'),
    empty: document.getElementById('departmentEmpty'), listEl: grid
  });
  document.getElementById('departmentReset').addEventListener('click', controller.reset);
})();
