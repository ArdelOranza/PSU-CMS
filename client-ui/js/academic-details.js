/* academic-details.js — renders the three detail pages from PSUAcademics:
     college-details.html?id=...   department-details.html?id=...   program-details.html?id=...
   <body data-page="college|department|program"> chooses the renderer.
   Everything shown depends on the record picked by ?id= (nothing is the same static text for every page).
   Unknown or missing ids show a "not found" message instead of an empty page. */
(function () {
  'use strict';
  var D = window.PSUAcademics, U = window.PSUAcademicsUI, el = U.el;
  var page = document.body.getAttribute('data-page');
  var hero = document.getElementById('detailHero'), body = document.getElementById('detailBody');
  if (!hero || !body) return;

  var HOME = '../../index.php';
  var PLACEHOLDER_PDF = '../assets/documents/curriculum/placeholder-curriculum.pdf';
  var SITE = ' | Pangasinan State University';

  /* ------------------------------------------------------------ shared bits */
  function h2(text, cls) { return el('h2', { class: 'ac-h2' + (cls ? ' ' + cls : ''), text: text }); }
  function note(text) { return el('p', { class: 'ac-note', text: text }); }
  function paragraphs(list) { return el('div', { class: 'ac-prose' }, list.map(function (t) { return el('p', { text: t }); })); }
  function bullets(list) { return el('ul', { class: 'ac-bullets' }, list.map(function (t) { return el('li', { text: t }); })); }
  function panel(children, cls) { return el('div', { class: 'ac-panel' + (cls ? ' ' + cls : '') }, children); }
  /* label/value rows used by Contact, Department Information and Program Information */
  function infoList(rows) {
    return el('dl', { class: 'ac-info' }, rows.reduce(function (acc, r) {
      acc.push(el('dt', { text: r[0] }));
      acc.push(el('dd', {}, [r[1] ? (typeof r[1] === 'string' ? r[1] : r[1]) : el('span', { class: 'ac-muted', text: 'Not yet provided' })]));
      return acc;
    }, []));
  }
  function mail(address) { return address ? el('a', { href: 'mailto:' + address, text: address }) : null; }
  function setHero(nodes) { var inner = hero.querySelector('.container'); U.clear(inner); nodes.forEach(function (n) { inner.appendChild(n); }); }
  function layout(main, aside) {
    U.clear(body);
    body.appendChild(el('div', { class: 'ac-detail__main' }, main));
    body.appendChild(el('aside', { class: 'ac-detail__aside' }, aside));
  }
  function notFound(what, listLabel, listHref) {
    document.title = what + ' not found' + SITE;
    setHero([U.breadcrumb([{ label: 'Home', href: HOME }, { label: 'Academics' }, { label: listLabel, href: listHref }, { label: 'Not found' }]),
             el('h1', { class: 'page-title', text: what + ' not found' }),
             el('p', { class: 'page-lead', text: 'The record you are looking for does not exist or has been removed.' })]);
    U.clear(body);
    body.appendChild(el('div', { class: 'ac-empty ac-empty--wide' }, [
      el('p', { class: 'ac-empty__title', text: 'Nothing to show here' }),
      el('a', { class: 'btn btn--primary', href: listHref, text: 'Back to ' + listLabel })]));
  }

  /* ---------------------------------------------------------------- College */
  function renderCollege() {
    var c = D.college(U.param('id'));
    if (!c) return notFound('College', 'Colleges', 'colleges.html');
    document.title = c.name + SITE;

    var hasLogoCol = U.collegeLogo(c, 'lg');
    setHero([el('div', { class: 'ac-hero__row' }, [hasLogoCol, el('div', {}, [
      U.breadcrumb([{ label: 'Home', href: HOME }, { label: 'Academics' }, { label: 'Colleges', href: 'colleges.html' }, { label: c.name }]),
      el('h1', { class: 'page-title page-title--detail', text: c.name }),
      el('p', { class: 'ac-hero__meta', text: 'Offered at: ' + c.campuses.join(', ') })
    ])])]);

    var depts = D.departmentsOfCollege(c.id), progs = D.programsOfCollege(c.id);
    var main = [
      el('div', { class: 'ac-twocol' }, [
        panel([el('h2', { class: 'ac-panel__title ac-panel__title--accent', text: 'Vision' }), el('p', { class: 'ac-panel__text', text: c.vision })]),
        panel([el('h2', { class: 'ac-panel__title ac-panel__title--accent', text: 'Mission' }), el('p', { class: 'ac-panel__text', text: c.mission })])
      ]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'deptHeading' }, [
        el('h2', { class: 'ac-h2', id: 'deptHeading', text: 'Departments' }),
        depts.length ? el('ul', { class: 'ac-linklist' }, depts.map(function (d) {
          return el('li', {}, [el('a', { class: 'ac-linklist__item', href: 'department-details.html?id=' + encodeURIComponent(d.id) },
            [el('span', { class: 'ac-linklist__name', text: d.name }), U.icon('arrow-right')])]);
        })) : note('No departments are listed for this college yet.')
      ]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'progHeading' }, [
        el('h2', { class: 'ac-h2', id: 'progHeading', text: 'Academic Programs' }),
        progs.length ? el('ul', { class: 'ac-linklist' }, progs.map(function (p) {
          return el('li', {}, [el('a', { class: 'ac-linklist__item', href: 'program-details.html?id=' + encodeURIComponent(p.id) },
            [el('span', { class: 'ac-linklist__name', text: p.name }), el('span', { class: 'ac-pill', text: p.degreeLevel })])]);
        })) : note('No academic programs are listed for this college yet.')
      ])
    ];

    var dean = panel([
      el('div', { class: 'ac-avatar ac-avatar--lg', 'aria-hidden': 'true', text: U.initials(c.deanName) }),
      el('p', { class: 'ac-profile__name', text: c.deanName }),
      el('p', { class: 'ac-profile__role', text: 'Dean' }),
      el('p', { class: 'ac-profile__college', text: c.name }),
      c.deanEmail ? el('p', { class: 'ac-profile__email' }, [mail(c.deanEmail)]) : null,
      el('span', { class: 'ac-pill', text: 'Active' })
    ], 'ac-profile');
    var contact = panel([el('h2', { class: 'ac-panel__title', text: 'Contact' }),
      infoList([['Email', mail(c.contactEmail)], ['Phone', c.contactNumber], ['Office', c.officeLocation]])]);
    layout(main, [el('h2', { class: 'ac-h2 ac-h2--side', text: 'College Dean' }), dean, contact]);
  }

  /* ------------------------------------------------------------- Department */
  function renderDepartment() {
    var d = D.department(U.param('id'));
    if (!d) return notFound('Department', 'Departments', 'departments.html');
    var c = D.college(d.collegeId);
    document.title = d.name + SITE;

    setHero([
      U.breadcrumb([{ label: 'Home', href: HOME }, { label: 'Colleges', href: 'colleges.html' },
                    { label: c.name, href: 'college-details.html?id=' + encodeURIComponent(c.id) }, { label: d.name }]),
      el('h1', { class: 'page-title page-title--detail', text: d.name }),
      el('p', { class: 'ac-hero__meta' }, ['Part of the ', el('a', { href: 'college-details.html?id=' + encodeURIComponent(c.id), text: c.name }), '.'])
    ]);

    var people = D.facultyOfDepartment(d.id), news = D.newsOfDepartment(d.id);
    var main = [
      el('section', { class: 'ac-section ac-section--first', 'aria-labelledby': 'aboutHeading' }, [
        el('h2', { class: 'ac-h2', id: 'aboutHeading', text: 'About the Department' }), paragraphs(d.description)]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'facultyHeading' }, [
        el('h2', { class: 'ac-h2', id: 'facultyHeading', text: 'Faculty & Staff' }),
        el('p', { class: 'ac-sub', text: 'Showing personnel in this department' }),
        people.length ? el('ul', { class: 'ac-people' }, people.map(function (f) {
          var fc = D.college(f.collegeId);
          return el('li', { class: 'ac-person' }, [
            el('div', { class: 'ac-avatar', 'aria-hidden': 'true', text: U.initials(f.fullName) }),
            el('h3', { class: 'ac-person__name', text: f.fullName }),
            el('p', { class: 'ac-person__role', text: f.position }),
            el('a', { class: 'ac-person__college', href: 'college-details.html?id=' + encodeURIComponent(fc.id), text: fc.name }),
            f.email ? el('p', { class: 'ac-person__email', text: f.email }) : null,
            el('span', { class: 'ac-pill', text: f.status })
          ]);
        })) : note('No faculty or staff are listed for this department yet.')
      ]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'newsHeading' }, [
        el('h2', { class: 'ac-h2', id: 'newsHeading', text: 'Department News & Announcements' }),
        news.length ? el('ul', { class: 'ac-news' }, news.map(function (n) {
          var title = n.link ? el('a', { href: n.link, text: n.title }) : el('span', { text: n.title });
          return el('li', { class: 'ac-news__item' }, [el('time', { class: 'ac-news__date', datetime: n.date, text: U.formatDate(n.date) }),
            el('p', { class: 'ac-news__title' }, [title])]);
        })) : note('No news or announcements for this department yet.')
      ])
    ];
    var info = panel([el('h2', { class: 'ac-panel__title', text: 'Department Information' }),
      infoList([['Chairperson', d.chairperson], ['Contact email', mail(d.contactEmail)], ['Office location', d.officeLocation], ['Operational hours', d.operationalHours]])]);
    layout(main, [info]);
  }

  /* ---------------------------------------------------------------- Program */
  function accordion(curriculum) {
    var root = el('div', { class: 'ac-accordion' }), buttons = [];
    curriculum.forEach(function (sem, i) {
      var id = 'sem' + i, open = i === 0;
      var btn = el('button', { type: 'button', class: 'ac-accordion__btn', id: id + 'Btn', 'aria-expanded': String(open), 'aria-controls': id + 'Panel' },
        [el('span', { text: sem.year + ', ' + sem.semester }), U.icon('chevron-down', 'ac-accordion__chev')]);
      var content = sem.subjects.length
        ? el('ul', { class: 'ac-subjects' }, sem.subjects.map(function (s) {
            return el('li', { class: 'ac-subject' }, [el('span', { class: 'ac-subject__code', text: s.code }), el('span', { class: 'ac-subject__name', text: s.name }),
              el('span', { class: 'ac-subject__units', text: U.plural(s.units, 'unit') })]);
          }))
        : el('p', { class: 'ac-note ac-note--pad', text: 'Subjects for this semester will be listed once the curriculum is published.' });
      var panelEl = el('div', { class: 'ac-accordion__panel', id: id + 'Panel', role: 'region', 'aria-labelledby': id + 'Btn', hidden: !open }, [content]);
      btn.addEventListener('click', function () {
        var expand = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(expand)); panelEl.hidden = !expand;
      });
      buttons.push(btn);
      root.appendChild(el('div', { class: 'ac-accordion__item' }, [el('h3', { class: 'ac-accordion__head' }, [btn]), panelEl]));
    });
    // Keyboard: Up/Down move between headings, Home/End jump to first/last (Enter/Space toggle natively)
    root.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i === -1) return;
      var next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : e.key === 'ArrowUp' ? (i - 1 + buttons.length) % buttons.length
        : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
      if (next !== -1) { e.preventDefault(); buttons[next].focus(); }
    });
    return root;
  }

  function renderProgram() {
    var p = D.program(U.param('id'));
    if (!p) return notFound('Program', 'Academic Programs', 'academic-programs.html');
    var c = D.college(p.collegeId), d = D.department(p.departmentId);
    var collegeHref = 'college-details.html?id=' + encodeURIComponent(c.id), deptHref = 'department-details.html?id=' + encodeURIComponent(d.id);
    document.title = p.name + SITE;

    setHero([
      U.breadcrumb([{ label: 'Home', href: HOME }, { label: 'Academics' }, { label: 'Programs', href: 'academic-programs.html' }, { label: p.name }]),
      el('div', { class: 'ac-badges' }, [el('span', { class: 'ac-badge', text: p.degreeLevel }),
        p.accreditation ? el('span', { class: 'ac-badge ac-badge--accent', text: p.accreditation }) : null]),
      el('h1', { class: 'page-title page-title--detail', text: p.name }),
      el('p', { class: 'ac-hero__meta' }, [el('a', { href: collegeHref, text: c.name }), ' · ', el('a', { href: deptHref, text: d.name })])
    ]);

    var main = [
      el('section', { class: 'ac-section ac-section--first', 'aria-labelledby': 'descHeading' }, [
        el('h2', { class: 'ac-h2', id: 'descHeading', text: 'Program Description' }), paragraphs(p.description)]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'careerHeading' }, [
        el('h2', { class: 'ac-h2', id: 'careerHeading', text: 'Career Prospects' }),
        p.careerProspects.length ? bullets(p.careerProspects) : note('Career prospects have not been published yet.')]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'admissionHeading' }, [
        el('h2', { class: 'ac-h2', id: 'admissionHeading', text: 'Admission Criteria' }),
        p.admissionCriteria.length ? bullets(p.admissionCriteria) : note('Admission criteria have not been published yet.')]),
      el('section', { class: 'ac-section', 'aria-labelledby': 'curriculumHeading' }, [
        el('h2', { class: 'ac-h2', id: 'curriculumHeading', text: 'Curriculum' }),
        p.curriculum.length ? accordion(p.curriculum) : note('The curriculum for this program has not been published yet.')])
    ];

    /* Download: the real PDF when curriculumFile is set; otherwise a clearly marked placeholder file. */
    var hasFile = !!p.curriculumFile;
    var file = hasFile ? '../' + p.curriculumFile : PLACEHOLDER_PDF;
    var download = panel([
      el('h2', { class: 'ac-panel__title', text: 'Curriculum' }),
      el('p', { class: 'ac-panel__text', text: 'Download the full curriculum of this program.' }),
      el('a', { class: 'btn btn--primary btn--block', id: 'curriculumDownload', href: file, download: p.id + '-curriculum.pdf', text: 'Download curriculum (PDF)' }),
      hasFile ? null : el('p', { class: 'ac-panel__note', text: 'Placeholder file: the official curriculum PDF has not been supplied yet.' })
    ]);
    var info = panel([el('h2', { class: 'ac-panel__title', text: 'Program Information' }),
      infoList([['College', el('a', { href: collegeHref, text: c.name })], ['Department', el('a', { href: deptHref, text: d.name })],
                ['Level', p.degreeLevel], [p.campuses.length === 1 ? 'Offered at' : 'Offered at', p.campuses.join(', ')]])]);
    layout(main, [download, info]);
  }

  ({ college: renderCollege, department: renderDepartment, program: renderProgram })[page]();
})();
