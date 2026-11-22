/*
 * Mock data layer (frontend only). Everything is kept in the browser's localStorage so the admin pages
 * and the public pages share the same sample data. No server, database or API is involved.
 * Reset the sample data with PSU.db.reset() in the console, or via the link on index.html.
 */
window.PSU = window.PSU || {};
(function (PSU) {
  'use strict';

  var VERSION = 'v1';
  var K = { personnel: 'psu.personnel', categories: 'psu.categories', documents: 'psu.documents', media: 'psu.media', layout: 'psu.layout', seeded: 'psu.seeded' };

  PSU.COLLEGES = {
    'College of Engineering and Architecture': 'CEA', 'College of Computing': 'COC', 'College of Arts and Education': 'CAE',
    'College of Engineering': 'COE', 'College of Education': 'CED', 'College of Arts and Sciences': 'CAS', 'College of Fisheries': 'CF'
  };
  PSU.UNITS = ['Office of the President', 'Registrar\u2019s Office', 'University Library'];
  PSU.DEPARTMENTS = ['Civil Engineering', 'Information Technology', 'Architecture', 'Computer Science', 'Education', 'Elementary Education', 'Secondary Education', 'Mechanical Engineering', 'Fisheries Science', 'Library Services', 'Records'];
  PSU.CAMPUSES = ['Lingayen', 'Urdaneta', 'Bayambang', 'Alaminos City', 'Asingan', 'Binmaley', 'Infanta', 'San Carlos City', 'Santa Maria'];
  PSU.DOC_TYPES = { pdf: 'PDF', docx: 'DOCX', doc: 'DOC', txt: 'TXT', zip: 'ZIP' };
  PSU.MEDIA_TYPES = { jpg: 'JPG', png: 'PNG', gif: 'GIF', webp: 'WEBP', svg: 'SVG' };
  PSU.MAX_BYTES = 12 * 1024 * 1024;
  PSU.SECTIONS = { banner: 'Banner', featured_news: 'Featured News', announcements: 'Announcements', events: 'Events', about: 'About PSU' };
  PSU.HEADER_LAYOUTS = { 'logo-left': 'Logo left, menu right', 'logo-center': 'Logo centered, menu below' };
  PSU.FOOTER_LAYOUTS = { 'three-columns': 'Three columns', 'two-columns': 'Two columns', simple: 'Single column' };
  PSU.MENU_LAYOUTS = { primary: 'Primary Menu', compact: 'Compact Menu (without Academics)' };

  function d(y, m, day) { return new Date(y, m - 1, day, 9, 0, 0).toISOString(); }
  function person(id, f, mi, l, pos, col, dep, campus, email, status, extra) {
    var p = { id: id, firstName: f, middleName: mi, lastName: l, position: pos, college: col, department: dep, campus: campus, email: email, phone: '+63 912 345 ' + (1000 + id), specialization: '', education: '', biography: '', status: status, photo: '', createdAt: d(2026, 10, 30 - id) };
    for (var k in (extra || {})) p[k] = extra[k];
    return p;
  }
  function seed() {
    var people = [
      person(1, 'Dr. Mari', 'I.', 'Mar', 'Dean', 'College of Computing', 'Information Technology', 'Lingayen', 'mariimar@psu.edu.ph', 'active', { specialization: 'Software Engineering, Databases', education: 'Doctor of Philosophy in Information Technology\nMaster of Science in Computer Science\nBachelor of Science in Information Technology', biography: 'This is placeholder text. Replace it with the content written in the CMS. Keep paragraphs short so they are easy to read on desktop and mobile.\nAnother paragraph goes here. This page only displays what is saved in the CMS.' }),
      person(2, 'Prof. JD', '', 'Cruz', 'Associate Professor', 'College of Engineering', 'Civil Engineering', 'Urdaneta', 'jdcruz@psu.edu.ph', 'active', { specialization: 'Structural Engineering' }),
      person(3, 'Dr. Ana', '', 'Riyz', 'Department Chair', 'College of Education', 'Education', 'Bayambang', 'anariyz@psu.edu.ph', 'inactive'),
      person(4, 'Engr. Pedro', '', 'Rams', 'Instructor', 'College of Engineering', 'Mechanical Engineering', 'Alaminos City', 'pedrorams@psu.edu.ph', 'active'),
      person(5, 'Prof. Liza', '', 'Mendz', 'Professor', 'College of Arts and Sciences', 'Computer Science', 'Lingayen', 'lizamendz@psu.edu.ph', 'active'),
      person(6, 'Mr. Carl', '', 'Bautizy', 'Administrative Aide', 'Registrar\u2019s Office', 'Records', 'Lingayen', 'carlbautizy@psu.edu.ph', 'active'),
      person(7, 'Dr. Grace', '', 'Villain', 'Director', 'College of Fisheries', 'Fisheries Science', 'Binmaley', 'gracevillain@psu.edu.ph', 'inactive'),
      person(8, 'Ms. Rhea', '', 'Doming', 'Librarian', 'University Library', 'Library Services', 'Lingayen', 'rheadoming@psu.edu.ph', 'active'),
      person(9, 'Dr. Roberto', '', 'Lim', 'Dean', 'College of Engineering and Architecture', 'Civil Engineering', 'Lingayen', 'rlim@psu.edu.ph', 'active'),
      person(10, 'Dr. Lara', '', 'Gomez', 'Department Head', 'College of Computing', 'Information Technology', 'Urdaneta', 'lgomez@psu.edu.ph', 'active'),
      person(11, 'Prof. Ana', '', 'Reyes', 'Assoc. Professor', 'College of Education', 'Education', 'Santa Maria', 'areyes@psu.edu.ph', 'active'),
      person(12, 'Mr. Pedro', '', 'Cruz', 'Administrative Aide', 'Office of the President', '', 'Lingayen', 'pcruz@psu.edu.ph', 'inactive')
    ];
    var cats = [
      { id: 1, name: 'Handbooks', description: 'Student and employee handbooks' },
      { id: 2, name: 'Forms', description: 'Downloadable forms' },
      { id: 3, name: 'Reports', description: 'Annual and financial reports' },
      { id: 4, name: 'Calendars', description: 'Academic calendars' },
      { id: 5, name: 'Policies', description: 'University policies and guidelines' },
      { id: 6, name: 'Memoranda', description: 'Official memoranda' }
    ];
    function doc(id, title, cat, ext, kb, date, by, downloads, vis) {
      return { id: id, title: title, description: '', categoryId: cat, fileName: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.' + ext, ext: ext, size: Math.round(kb * 1024), visibility: vis || 'public', status: 'published', downloads: downloads, uploadedBy: by, createdAt: date };
    }
    var docs = [
      doc(1, 'Student Handbook 2026', 1, 'pdf', 4300, d(2026, 10, 25), 'Admin Mo', 312),
      doc(2, 'Academic Calendar AY 2026-2027', 4, 'pdf', 820, d(2026, 10, 12), 'Registrar', 540),
      doc(3, 'Student Handbook', 5, 'pdf', 3480, d(2026, 10, 7), 'Admin Mo', 1204),
      doc(4, 'Application Form for College Admission Test', 2, 'pdf', 480, d(2026, 10, 2), 'Registrar', 860),
      doc(5, 'Scholarship Application Form', 2, 'docx', 95, d(2026, 9, 30), 'Mosh Perez', 410),
      doc(6, 'Annual Accomplishment Report', 3, 'pdf', 5222, d(2026, 9, 28), 'Admin Jay', 342),
      doc(7, 'Faculty Evaluation Guidelines', 5, 'pdf', 1126, d(2026, 9, 20), 'Admin Jay', 0, 'staff'),
      doc(8, 'Memorandum on Class Schedule', 6, 'pdf', 220, d(2026, 9, 15), 'Registrar', 128),
      doc(9, 'Annual Report 2025', 3, 'pdf', 12902, d(2026, 9, 10), 'Admin Jay', 77)
    ];
    function med(id, name, ext, kb, date) { return { id: id, title: name, fileName: name, ext: ext, size: kb * 1024, width: 0, height: 0, altText: '', caption: '', description: '', dataUrl: '', createdAt: date }; }
    var media = [
      med(1, 'campus-gate.jpg', 'jpg', 120, d(2026, 10, 10)), med(2, 'library.png', 'png', 203, d(2026, 10, 11)),
      med(3, 'logo.svg', 'svg', 286, d(2026, 10, 12)), med(4, 'graduation.jpg', 'jpg', 369, d(2026, 10, 13)),
      med(5, 'gym.jpg', 'jpg', 452, d(2026, 10, 14)), med(6, 'lab.png', 'png', 535, d(2026, 10, 15)),
      med(7, 'banner-1.jpg', 'jpg', 618, d(2026, 10, 16)), med(8, 'seal.png', 'png', 701, d(2026, 10, 17))
    ];
    return { personnel: people, categories: cats, documents: docs, media: media };
  }

  function read(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  PSU.db = {
    init: function () {
      if (read(K.seeded, '') === VERSION) return;
      var s = seed();
      write(K.personnel, s.personnel); write(K.categories, s.categories); write(K.documents, s.documents); write(K.media, s.media);
      write(K.seeded, VERSION);
    },
    reset: function () {
      Object.keys(K).forEach(function (k) { try { localStorage.removeItem(K[k]); } catch (e) {} });
      try { sessionStorage.removeItem('psu.staff'); } catch (e) {}
      PSU.db.init();
    },
    all: function (name) { return read(K[name], []); },
    save: function (name, list) { return write(K[name], list); },
    get: function (name, id) {
      id = Number(id);
      return PSU.db.all(name).filter(function (r) { return r.id === id; })[0] || null;
    },
    /* inserts (no id) or replaces (id) a record; returns false if the browser refused to store it */
    put: function (name, rec) {
      var list = PSU.db.all(name);
      if (!rec.id) {
        rec.id = list.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1;
        rec.createdAt = rec.createdAt || new Date().toISOString();
        list.push(rec);
      } else {
        list = list.map(function (r) { return r.id === rec.id ? rec : r; });
      }
      return PSU.db.save(name, list) ? rec : false;
    },
    remove: function (name, id) {
      id = Number(id);
      PSU.db.save(name, PSU.db.all(name).filter(function (r) { return r.id !== id; }));
    },
    layout: function () {
      var l = read(K.layout, null) || {};
      var order = Object.keys(PSU.SECTIONS);
      var saved = (l.sections || []).filter(function (k) { return PSU.SECTIONS[k]; });
      order.forEach(function (k) { if (saved.indexOf(k) < 0) saved.push(k); });
      return { sections: saved, header: PSU.HEADER_LAYOUTS[l.header] ? l.header : 'logo-center', footer: PSU.FOOTER_LAYOUTS[l.footer] ? l.footer : 'three-columns', menu: PSU.MENU_LAYOUTS[l.menu] ? l.menu : 'primary' };
    },
    saveLayout: function (l) { return write(K.layout, l); }
  };

  PSU.util = {
    esc: function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
    fmtSize: function (b) {
      if (b >= 1048576) return (Math.round(b / 104857.6) / 10) + ' MB';
      if (b >= 1024) return Math.round(b / 1024) + ' KB';
      return b + ' B';
    },
    fmtDate: function (iso) {
      var dt = new Date(iso);
      return isNaN(dt) ? '' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fullName: function (p) {
      var mid = (p.middleName || '').trim();
      return [p.firstName, mid ? mid.charAt(0).toUpperCase() + '.' : '', p.lastName].filter(Boolean).join(' ').replace(/\.\./g, '.');
    },
    initials: function (p) {
      var words = (p.firstName || '').split(/\s+/).filter(function (w) { return w && !/^[A-Za-z]{1,5}\.$/.test(w); });
      var f = (words[0] || p.firstName || '').charAt(0);
      return ((f + (p.lastName || '').charAt(0)).toUpperCase()) || '?';
    },
    collegeCode: function (c) { return PSU.COLLEGES[c] || ''; },
    unitLabel: function (p) {
      var left = p.college ? (PSU.util.collegeCode(p.college) || p.college) : '';
      return [left, p.department].filter(Boolean).join(' / ');
    },
    /* "Showing 1-4 of 24" + page buttons. cls: button class, nav: wrapper class */
    paginate: function (list, page, per) {
      var pages = Math.max(1, Math.ceil(list.length / per));
      page = Math.min(Math.max(1, page), pages);
      return { items: list.slice((page - 1) * per, page * per), page: page, pages: pages, total: list.length, from: list.length ? (page - 1) * per + 1 : 0, to: Math.min(list.length, page * per) };
    },
    pagerHtml: function (pg, btnClass, navClass) {
      if (pg.pages <= 1) return '';
      var out = '<nav class="' + navClass + '" aria-label="Pagination">';
      out += '<button type="button" class="' + btnClass + '" data-page="' + (pg.page - 1) + '" aria-label="Previous page"' + (pg.page === 1 ? ' disabled' : '') + '>&lsaquo;</button>';
      for (var i = 1; i <= pg.pages; i++) {
        out += '<button type="button" class="' + btnClass + (i === pg.page ? ' is-active' : '') + '" data-page="' + i + '"' + (i === pg.page ? ' aria-current="page"' : '') + ' aria-label="Page ' + i + '">' + i + '</button>';
      }
      out += '<button type="button" class="' + btnClass + '" data-page="' + (pg.page + 1) + '" aria-label="Next page"' + (pg.page === pg.pages ? ' disabled' : '') + '>&rsaquo;</button>';
      return out + '</nav>';
    },
    param: function (name) { return new URLSearchParams(location.search).get(name) || ''; },
    /* resize an image file to a small data URL so it fits in localStorage */
    readImage: function (file, maxSide, cb) {
      var reader = new FileReader();
      reader.onerror = function () { cb(null); };
      reader.onload = function () {
        if (/svg/.test(file.type)) { cb({ dataUrl: reader.result, width: 0, height: 0 }); return; }
        var img = new Image();
        img.onerror = function () { cb(null); };
        img.onload = function () {
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          cb({ dataUrl: c.toDataURL('image/jpeg', 0.82), width: img.width, height: img.height });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    isStaff: function () { try { return sessionStorage.getItem('psu.staff') === '1'; } catch (e) { return false; } }
  };

  PSU.db.init();
})(window.PSU);
