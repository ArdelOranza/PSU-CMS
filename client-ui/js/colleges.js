/* colleges.js — Colleges directory (client-ui/academics/colleges.html)
   Search by college name + campus filter. Card counts come from PSUAcademics. */
(function () {
  'use strict';
  var D = window.PSUAcademics, U = window.PSUAcademicsUI;
  var grid = document.getElementById('collegeGrid');
  if (!grid) return;

  U.fillSelect(document.getElementById('collegeCampus'),
    [{ value: '', label: 'All Campuses' }].concat(D.campuses.map(function (c) { return { value: c, label: c }; })));

  function card(c) {
    var s = D.collegeStats(c.id);
    var href = 'college-details.html?id=' + encodeURIComponent(c.id);
    return U.el('article', { class: 'ac-card ac-card--college' }, [
      U.collegeLogo(c),
      U.el('h2', { class: 'ac-card__title', text: c.name }),
      U.el('p', { class: 'ac-card__meta', text: 'Dean: ' + c.deanName }),
      U.el('p', { class: 'ac-card__meta', text: U.plural(s.programs, 'program') + ' · ' + U.plural(s.departments, 'department') }),
      // the whole card is clickable (stretched link); the hidden text gives the link a unique name
      U.el('a', { class: 'ac-card__link', href: href }, ['View college', U.el('span', { class: 'visually-hidden', text: ': ' + c.name }), U.icon('arrow-right')])
    ]);
  }

  var controller = U.listController({
    fields: { q: U.textField(document.getElementById('collegeSearch')), campus: U.selectField(document.getElementById('collegeCampus')) },
    items: function () { return D.colleges(); },
    match: function (c, s) {
      var q = s.q.toLowerCase();
      if (s.campus && c.campuses.indexOf(s.campus) === -1) return false;
      return !q || c.name.toLowerCase().indexOf(q) !== -1 || c.abbreviation.toLowerCase().indexOf(q) !== -1;
    },
    pageSize: 12,
    render: function (list) { U.clear(grid); list.forEach(function (c) { grid.appendChild(card(c)); }); },
    status: document.getElementById('collegeStatus'), pager: document.getElementById('collegePager'),
    empty: document.getElementById('collegeEmpty'), listEl: grid
  });
  document.getElementById('collegeReset').addEventListener('click', controller.reset);
})();
