/* programs.js — Academic Programs directory (client-ui/academics/academic-programs.html)
   All / Undergraduate / Graduate tabs + search by program name + college + campus, 8 rows per page.
   All filters work together and the state is kept in the URL (?level=&q=&college=&campus=&page=). */
(function () {
  'use strict';
  var D = window.PSUAcademics, U = window.PSUAcademicsUI;
  var body = document.getElementById('programBody');
  if (!body) return;

  U.fillSelect(document.getElementById('programCollege'),
    [{ value: '', label: 'All colleges' }].concat(D.colleges().map(function (c) { return { value: c.id, label: c.name }; })));
  U.fillSelect(document.getElementById('programCampus'),
    [{ value: '', label: 'All Campuses' }].concat(D.campuses.map(function (c) { return { value: c, label: c }; })));

  /* Degree-level tabs act as one more filter: '' (All) | 'Undergraduate' | 'Graduate' */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-level]')), level = '';
  var levelField = {
    get: function () { return level; },
    set: function (v) {
      level = D.levels.indexOf(v) === -1 ? '' : v;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-level') === level;
        t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', String(on));
      });
    },
    bind: function (cb) {
      tabs.forEach(function (t) { t.addEventListener('click', function () { levelField.set(t.getAttribute('data-level')); cb(); }); });
    }
  };

  function row(p) {
    var href = 'program-details.html?id=' + encodeURIComponent(p.id);
    return U.el('tr', { class: 'ac-row', 'data-href': href }, [
      U.el('td', { class: 'ac-cell ac-cell--program', 'data-label': 'Program' }, [U.el('a', { class: 'ac-row__link', href: href, text: p.name })]),
      U.el('td', { class: 'ac-cell ac-cell--college', 'data-label': 'College', text: D.college(p.collegeId).name }),
      U.el('td', { class: 'ac-cell ac-cell--level', 'data-label': 'Level', text: p.degreeLevel }),
      U.el('td', { class: 'ac-cell ac-cell--go' }, [U.icon('arrow-right')])
    ]);
  }
  // Whole row is clickable; the program-name link stays the keyboard/screen-reader target.
  body.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a')) window.location.href = tr.getAttribute('data-href');
  });

  var controller = U.listController({
    fields: {
      level: levelField,
      q: U.textField(document.getElementById('programSearch')),
      college: U.selectField(document.getElementById('programCollege')),
      campus: U.selectField(document.getElementById('programCampus'))
    },
    items: function () { return D.programs(); },
    match: function (p, s) {
      if (s.level && p.degreeLevel !== s.level) return false;
      if (s.college && p.collegeId !== s.college) return false;
      if (s.campus && p.campuses.indexOf(s.campus) === -1) return false;
      return !s.q || p.name.toLowerCase().indexOf(s.q.toLowerCase()) !== -1;
    },
    pageSize: 8,
    render: function (list) { U.clear(body); list.forEach(function (p) { body.appendChild(row(p)); }); },
    status: document.getElementById('programStatus'), pager: document.getElementById('programPager'),
    empty: document.getElementById('programEmpty'), listEl: document.getElementById('programTableCard')
  });
  document.getElementById('programReset').addEventListener('click', controller.reset);
})();
