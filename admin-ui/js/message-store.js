/* ==========================================================================
   message-store.js — data layer for Contact & Feedback.
   One dataset (CMS.db.messages) feeds All Messages, Unread Messages,
   Feedback, Message Details and the public contact form, so a change made
   on one page shows on all of them. Pages never touch localStorage directly.

   Record shape (see README "Messages, Feedback & Settings"):
     id, fullName, email, subject, campusDepartment, message,
     status  : 'unread' | 'read' | 'responded'
     type    : 'inquiry' | 'feedback'      (feedback also has rating + category)
     submittedAt : 'YYYY-MM-DDTHH:MM:SS' (local time)
     reply   : { subject, body, sentAt } | null   (simulated reply, never emailed)

   PHP: replace CMS.db.messages calls with queries on a `messages` table
   (status ENUM('unread','read','responded'), type ENUM('inquiry','feedback')).
   ========================================================================== */
window.CMS = window.CMS || {};

(function () {
  var cfg = CMS.config;

  /* rows per page — taken from the screenshots, like the other modules */
  cfg.pageSize.messages = 4;
  cfg.pageSize.unread = 2;
  cfg.pageSize.feedback = 3;

  cfg.messageStatuses = [
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
    { value: 'responded', label: 'Responded' }
  ];
  cfg.feedbackCategories = ['Website', 'Services', 'Facilities', 'Other'];

  var STATUS_COLOR = { unread: 'amber', read: 'green', responded: 'blue' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function str(v) { return v === null || v === undefined ? '' : String(v); }

  /* 'YYYY-MM-DDTHH:MM:SS' in local time */
  function nowLocalISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
           pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ---------- sample data (first run only) ---------- */
  function seedMessages() {
    /* [name, email, subject, campus, message, status, 'YYYY-MM-DDTHH:MM'] */
    var inquiries = [
      ['Zed Santos', 'zedzed@gmail.com', 'Inquiry on admission requirements', 'Urdaneta', 'Good day! I would like to ask about the admission requirements and deadlines for incoming first-year students for the next academic year. Thank you.', 'unread', '2026-10-29T09:14'],
      ['Vice Goove', 'vgoove@yahoo.com', 'Request for transcript', 'Urdaneta', 'Good afternoon. How can I request an official transcript of records, and how long does processing usually take?', 'read', '2026-10-27T14:05'],
      ['Liza Arinate', 'liza.m@psu.edu.ph', 'Website issue on events page', 'Lingayen', 'The events page shows the wrong date for the Research Congress. Please check.', 'responded', '2026-10-25T11:30'],
      ['Naice Won', 'naicewon@gmail.com', 'Scholarship follow-up', 'Urdaneta', 'I submitted my scholarship requirements two weeks ago. May I know the status of my application?', 'unread', '2026-10-24T16:42'],
      ['Mark Reyes', 'mark.reyes@gmail.com', 'Graduate program schedule', 'Lingayen', 'Is the graduate program schedule for next semester already available?', 'read', '2026-10-23T10:10'],
      ['Ana Dizon', 'ana.dizon@yahoo.com', 'Dormitory availability', 'Bayambang', 'Are there still dormitory slots for transferees this term?', 'unread', '2026-10-22T08:55'],
      ['Carlo Mendoza', 'carlo.m@gmail.com', 'Request for certificate of enrollment', 'Urdaneta', 'I need a certificate of enrollment for a scholarship renewal. What are the steps?', 'responded', '2026-10-21T13:20'],
      ['Joy Bautista', 'joy.bautista@psu.edu.ph', 'Faculty directory correction', 'Alaminos City', 'My department is listed incorrectly in the faculty directory. Kindly update it.', 'read', '2026-10-19T15:00'],
      ['Ramon Cabrera', 'ramon.cabrera@gmail.com', 'Entrance exam schedule', 'Asingan', 'When is the next entrance examination, and where can I register?', 'unread', '2026-10-18T09:35'],
      ['Trisha Lim', 'trisha.lim@gmail.com', 'Library access for alumni', 'Binmaley', 'Can alumni still borrow books or use the digital collection?', 'responded', '2026-10-16T10:45'],
      ['Paolo Garcia', 'paolo.g@yahoo.com', 'Tuition payment options', 'Infanta', 'Do you accept installment payments for tuition? Please share the available options.', 'unread', '2026-10-15T14:25'],
      ['Mina Flores', 'mina.flores@gmail.com', 'Broken link on news page', 'San Carlos City', 'The \u201CRead more\u201D link on the intramurals article leads to an error page.', 'read', '2026-10-13T17:10'],
      ['Noel Ramos', 'noel.ramos@gmail.com', 'Campus visit request', 'Santa Maria', 'Our senior high class would like to visit the campus next month. Who should we contact?', 'unread', '2026-10-12T09:00'],
      ['Grace Tan', 'grace.tan@psu.edu.ph', 'Event photo permission', 'Urdaneta', 'May we use photos from the pinning ceremony in the college newsletter?', 'responded', '2026-10-10T11:15']
    ];
    /* [name, email, category, rating, message, status, when, campus] */
    var feedback = [
      ['Vyse Gauv', 'vyse.gauv@gmail.com', 'Website', 5, 'Very easy to navigate!', 'unread', '2026-10-28T10:20', 'Urdaneta'],
      ['Sarah Cruz', 'sarah.cruz@gmail.com', 'Services', 3, 'Enrollment page is slow.', 'read', '2026-10-26T13:40', 'Lingayen'],
      ['Indie Tan', 'indie.tan@yahoo.com', 'Facilities', 4, 'Clean campus, thanks.', 'read', '2026-10-20T09:50', 'Urdaneta'],
      ['Leo Park', 'leo.park@gmail.com', 'Services', 2, 'The registrar queue takes too long.', 'unread', '2026-10-17T15:05', 'Bayambang'],
      ['Hana Ortiz', 'hana.ortiz@gmail.com', 'Website', 4, 'Love the new announcements page.', 'unread', '2026-10-14T08:30', 'Urdaneta'],
      ['Ben Salonga', 'ben.salonga@yahoo.com', 'Facilities', 3, 'We need more study areas.', 'read', '2026-10-11T16:20', 'Binmaley'],
      ['Cathy Uy', 'cathy.uy@gmail.com', 'Other', 5, 'The staff were very helpful.', 'responded', '2026-10-09T10:00', 'Asingan'],
      ['Dan Velasco', 'dan.velasco@gmail.com', 'Website', 2, 'Search results are hard to read on mobile.', 'unread', '2026-10-08T19:10', 'Infanta'],
      ['Ella Navarro', 'ella.navarro@yahoo.com', 'Services', 4, 'Online forms are very convenient.', 'read', '2026-10-06T12:45', 'Alaminos City'],
      ['Fred Abad', 'fred.abad@gmail.com', 'Facilities', 1, 'Some restrooms need repairs.', 'unread', '2026-10-05T07:55', 'Santa Maria']
    ];
    var rows = inquiries.map(function (r, i) {
      return { id: 'msg_seed_' + pad(i + 1), fullName: r[0], email: r[1], subject: r[2], campusDepartment: r[3], message: r[4],
               status: r[5], type: 'inquiry', rating: null, category: '', reply: null,
               submittedAt: r[6] + ':00', createdAt: r[6] + ':00', updatedAt: r[6] + ':00' };
    });
    feedback.forEach(function (r, i) {
      rows.push({ id: 'msg_seed_fb_' + pad(i + 1), fullName: r[0], email: r[1], subject: r[2] + ' feedback', campusDepartment: r[7], message: r[4],
                  status: r[5], type: 'feedback', rating: r[3], category: r[2], reply: null,
                  submittedAt: r[6] + ':00', createdAt: r[6] + ':00', updatedAt: r[6] + ':00' });
    });
    return rows;
  }
  CMS.seed.messages = seedMessages;
  CMS.db.messages = CMS.storage.createRepo('messages', 'msg', CMS.seed.messages);
  var db = CMS.db.messages;

  /* ---------- reading ---------- */
  /* Makes any stored record safe to render (handles missing / odd values). */
  function normalize(m) {
    var rating = parseInt(m.rating, 10);
    var reply = m.reply && typeof m.reply === 'object' ? m.reply : null;
    return {
      id: str(m.id),
      fullName: str(m.fullName),
      email: str(m.email),
      subject: str(m.subject),
      campusDepartment: str(m.campusDepartment),
      message: str(m.message),
      status: m.status === 'read' || m.status === 'responded' ? m.status : 'unread',
      type: m.type === 'feedback' ? 'feedback' : 'inquiry',
      rating: rating >= 1 && rating <= 5 ? rating : null,
      category: str(m.category),
      submittedAt: str(m.submittedAt) || str(m.createdAt),
      reply: reply ? { subject: str(reply.subject), body: str(reply.body), sentAt: str(reply.sentAt) } : null
    };
  }

  /* every message, newest first */
  function all() {
    return db.list()
      .filter(function (m) { return m && typeof m === 'object' && m.id; })
      .map(normalize)
      .sort(function (a, b) { return b.submittedAt.localeCompare(a.submittedAt); });
  }
  function get(id) {
    var raw = id ? db.get(id) : null;
    return raw ? normalize(raw) : null;
  }
  function counts() {
    var c = { total: 0, unread: 0, read: 0, responded: 0 };
    all().forEach(function (m) { c.total++; c[m.status]++; });
    return c;
  }

  /* ---------- writing ---------- */
  function setStatus(id, status) {
    if (!db.get(id) || ['unread', 'read', 'responded'].indexOf(status) === -1) return false;
    return db.save({ id: id, status: status }).ok;
  }
  /* Simulated reply: stored on the record, nothing is emailed. */
  function saveReply(id, subject, body) {
    if (!db.get(id)) return false;
    return db.save({ id: id, status: 'responded', reply: { subject: subject, body: body, sentAt: nowLocalISO() } }).ok;
  }
  function remove(id) { return db.remove(id); }
  /* f: { fullName, email, subject, campusDepartment, message, type, rating, category } */
  function create(f) {
    return db.save({
      fullName: f.fullName, email: f.email, subject: f.subject, campusDepartment: f.campusDepartment, message: f.message,
      status: 'unread', type: f.type === 'feedback' ? 'feedback' : 'inquiry',
      rating: f.type === 'feedback' ? f.rating : null, category: f.type === 'feedback' ? f.category : '',
      reply: null, submittedAt: nowLocalISO()
    });
  }

  /* ---------- display helpers ---------- */
  function statusLabel(value) {
    for (var i = 0; i < cfg.messageStatuses.length; i++) if (cfg.messageStatuses[i].value === value) return cfg.messageStatuses[i].label;
    return value;
  }
  /* Feedback shows "New" / "Reviewed" (as in the design); both map onto unread/read/responded. */
  function feedbackLabel(status) { return status === 'unread' ? 'New' : 'Reviewed'; }
  function statusBadge(m, asFeedback) {
    var label = asFeedback ? feedbackLabel(m.status) : statusLabel(m.status);
    var color = asFeedback ? (m.status === 'unread' ? 'amber' : 'blue') : STATUS_COLOR[m.status];
    return CMS.ui.el('span', { class: 'cms-status cms-status-' + color, text: label });
  }
  function formatDateTime(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(iso || '');
    var date = CMS.ui.formatDate(iso);
    return m ? date + ', ' + CMS.ui.formatTime(m[4] + ':' + m[5]) : date;
  }
  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '\u2605' : '\u2606';
    return s;
  }
  function initials(name) {
    var parts = str(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  /* Delete confirmation modal (design: "Delete this item?" + Cancel / Delete).
     Resolves true when the admin clicks Delete; false on Cancel, Esc or backdrop click.
     Optional: { title, message, cancelLabel, confirmLabel }.
     Styles: css/messages.css (.delete-modal). Built with textContent only. */
  function confirmDelete(opts) {
    opts = opts || {};
    var ui = CMS.ui, el = ui.el;
    return new Promise(function (resolve) {
      var answered = false;
      var titleId = 'deleteModalTitle', textId = 'deleteModalText';
      var cancelBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: opts.cancelLabel || 'Cancel' });
      var okBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-danger', text: opts.confirmLabel || 'Delete' });
      var modalEl = el('div', { class: 'modal fade cms-modal delete-modal', tabindex: '-1', 'aria-labelledby': titleId, 'aria-describedby': textId, 'aria-hidden': 'true' }, [
        el('div', { class: 'modal-dialog modal-dialog-centered' }, [
          el('div', { class: 'modal-content' }, [
            el('div', { class: 'delete-modal-body' }, [
              el('h2', { class: 'delete-modal-title', id: titleId, text: opts.title || 'Delete this item?' }),
              el('p', { class: 'delete-modal-text', id: textId, text: opts.message || 'This action cannot be undone. The item will be permanently removed from the website.' }),
              el('div', { class: 'delete-modal-actions' }, [cancelBtn, okBtn])
            ])
          ])
        ])
      ]);
      var modal = ui.openModal(modalEl);
      modalEl.addEventListener('shown.bs.modal', function () { cancelBtn.focus(); });   // safest default for a destructive action
      okBtn.addEventListener('click', function () { answered = true; modal.hide(); resolve(true); });
      modalEl.addEventListener('hidden.bs.modal', function () { if (!answered) resolve(false); });
    });
  }

  /* Downloads the given records (pass the already-filtered list) as a .csv file. */
  function exportCsv(records, baseName) {
    var headers = ['Name', 'Email', 'Subject', 'Campus/Department', 'Message', 'Status', 'Type', 'Rating', 'Category', 'Submitted'];
    var rows = records.map(function (m) {
      return [m.fullName, m.email, m.subject, m.campusDepartment, m.message, statusLabel(m.status), m.type,
              m.rating === null ? '' : m.rating, m.category, m.submittedAt.replace('T', ' ')];
    });
    CMS.csv.download(baseName + '-' + CMS.ui.todayISO() + '.csv', headers, rows);
  }

  CMS.messages = {
    all: all, get: get, counts: counts, setStatus: setStatus, saveReply: saveReply, remove: remove, create: create,
    statusLabel: statusLabel, feedbackLabel: feedbackLabel, statusBadge: statusBadge,
    formatDateTime: formatDateTime, stars: stars, initials: initials, exportCsv: exportCsv, nowLocalISO: nowLocalISO, confirmDelete: confirmDelete
  };

  CMS.dev.clearMessages = function () { db.clear(); console.info('[CMS] Messages cleared. Reload the page to see the empty state.'); };
})();
