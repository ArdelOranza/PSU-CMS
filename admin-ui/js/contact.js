/* ==========================================================================
   contact.js — public Contact & Feedback form (front-end simulation).
   Saves the message into the same dataset the admin pages read, with the
   status "unread". Protections here are only front-end demos:
     - honeypot field      (bots fill the hidden "website" box)
     - submission throttle (5 per 15 minutes, counted in this browser only)
     - validation + safe rendering (text is never inserted as HTML)
   NOT real: IP rate limiting, HTTPS enforcement, server-side bot checks and
   email delivery all need the PHP backend (index.php already has a real
   server-side throttle for its own form).
   PHP: add the CSRF hidden input where the <!-- PHP --> comment is.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, store = CMS.messages;

  var LIMIT = 5, WINDOW_MS = 15 * 60 * 1000;
  var THROTTLE_KEY = cfg.storagePrefix + 'contactAttempts';

  var form = document.getElementById('contactForm');
  var receipt = document.getElementById('contactReceipt');
  var banner = document.getElementById('contactBanner');
  var f = {
    name: document.getElementById('contactName'),
    email: document.getElementById('contactEmail'),
    subject: document.getElementById('contactSubject'),
    campus: document.getElementById('contactCampus'),
    type: document.getElementById('contactType'),
    rating: document.getElementById('contactRating'),
    category: document.getElementById('contactCategory'),
    message: document.getElementById('contactMessage'),
    trap: document.getElementById('contactWebsite')
  };
  var feedbackFields = document.getElementById('contactFeedbackFields');
  var counter = document.getElementById('contactCounter');
  var touched = {};

  /* ---------- fill the dropdowns from config ---------- */
  function fillSelect(select, placeholder, items) {
    ui.clear(select);
    select.appendChild(el('option', { value: '', text: placeholder }));
    items.forEach(function (v) { select.appendChild(el('option', { value: v, text: v })); });
  }
  fillSelect(f.campus, 'Select a campus or department', cfg.campuses.concat(['Other / Not sure']));
  fillSelect(f.rating, 'Select a rating', ['5', '4', '3', '2', '1']);
  [].forEach.call(f.rating.options, function (o) { if (o.value) o.textContent = o.value + ' \u2605 ' + ({ 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Poor', 1: 'Very poor' })[o.value]; });
  fillSelect(f.category, 'Select a category', cfg.feedbackCategories);
  if (!cfg.features.campus) { var cf = f.campus.closest('.cms-field'); if (cf) cf.remove(); f.campus = null; }

  /* ---------- validation ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name: function (v) { return v.length < 2 ? 'Enter your full name.' : v.length > 120 ? 'Keep your name under 120 characters.' : ''; },
    email: function (v) { return !v ? 'Enter your email address.' : (!EMAIL.test(v) || v.length > 190) ? 'Enter a valid email address, like name@example.com.' : ''; },
    subject: function (v) { return v.length < 3 ? 'Enter a subject (at least 3 characters).' : v.length > 220 ? 'Keep the subject under 220 characters.' : ''; },
    campus: function (v) { return v ? '' : 'Select a campus or department.'; },
    message: function (v) { return v.length < 10 ? 'Write a message of at least 10 characters.' : v.length > 5000 ? 'Keep the message under 5000 characters.' : ''; },
    rating: function (v) { return isFeedback() && !v ? 'Select a rating.' : ''; },
    category: function (v) { return isFeedback() && !v ? 'Select a category.' : ''; }
  };
  function isFeedback() { return f.type.value === 'feedback'; }

  function validateField(key) {
    var input = f[key];
    if (!input || !rules[key]) return true;
    var field = input.closest('.cms-field');
    var message = rules[key](input.value.trim());
    if (field) { field.classList.remove('has-error'); input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
    if (message) ui.setError(input, message);
    return !message;
  }
  function validateAll() {
    var firstBad = null;
    Object.keys(rules).forEach(function (key) {
      touched[key] = true;
      if (!validateField(key) && !firstBad) firstBad = f[key];
    });
    return firstBad;
  }

  Object.keys(rules).forEach(function (key) {
    if (!f[key]) return;
    f[key].addEventListener('blur', function () { touched[key] = true; validateField(key); });
    f[key].addEventListener(f[key].tagName === 'SELECT' ? 'change' : 'input', function () { if (touched[key]) validateField(key); });
  });
  f.message.addEventListener('input', function () { counter.textContent = f.message.value.length + ' / 5000'; });
  f.type.addEventListener('change', function () {
    feedbackFields.hidden = !isFeedback();
    if (!isFeedback()) { f.rating.value = ''; f.category.value = ''; validateField('rating'); validateField('category'); }
  });

  /* ---------- simulated throttle (this browser only) ---------- */
  function recentAttempts() {
    try {
      var list = JSON.parse(window.localStorage.getItem(THROTTLE_KEY) || '[]');
      var cutoff = Date.now() - WINDOW_MS;
      return Array.isArray(list) ? list.filter(function (t) { return typeof t === 'number' && t > cutoff; }) : [];
    } catch (e) { return []; }
  }
  function recordAttempt() {
    var list = recentAttempts(); list.push(Date.now());
    try { window.localStorage.setItem(THROTTLE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  /* ---------- banner + receipt ---------- */
  function showBanner(text, type) {
    ui.clear(banner);
    banner.className = 'contact-banner is-' + type;
    banner.hidden = false;
    banner.appendChild(ui.icon(type === 'error' ? 'exclamation-circle-fill' : 'info-circle-fill'));
    banner.appendChild(el('span', { text: text }));
  }

  /* Simulated confirmation email, shown on screen only. */
  function showReceipt(rec, notice) {
    ui.clear(receipt);
    var first = rec.fullName.split(/\s+/)[0];
    var rows = [['Reference', rec.ref], ['Name', rec.fullName], ['Email', rec.email], ['Subject', rec.subject], ['Submitted', store.formatDateTime(rec.submittedAt)]];
    var list = el('dl', { class: 'cms-detail-list contact-receipt-list' });
    rows.forEach(function (r) { list.appendChild(el('dt', { text: r[0] })); list.appendChild(el('dd', { text: r[1] })); });
    var again = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', text: 'Send another message' });
    again.addEventListener('click', function () { receipt.hidden = true; form.hidden = false; banner.hidden = true; f.name.focus(); });
    [
      el('div', { class: 'contact-success-icon', 'aria-hidden': 'true' }, [ui.icon('check-lg')]),
      el('h2', { class: 'contact-receipt-title', text: 'Thank you, ' + first + '!' }),
      el('p', { class: 'cms-page-sub', text: 'Your message was saved and now appears in the admin inbox as Unread.' }),
      el('div', { class: 'contact-receipt' }, [
        el('div', { class: 'contact-receipt-head', text: 'Simulated confirmation receipt' }), list,
        el('p', { class: 'cms-field-hint', text: notice || 'Demo only: no email was actually sent. A real confirmation email needs the PHP backend.' })
      ]),
      el('div', { class: 'contact-receipt-actions' }, [again, el('a', { class: 'cms-btn cms-btn-primary', href: '../messages/all-messages.html', text: 'View in admin inbox' })])
    ].forEach(function (n) { receipt.appendChild(n); });
    form.hidden = true; receipt.hidden = false; banner.hidden = true;
    receipt.setAttribute('tabindex', '-1'); receipt.focus();
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    banner.hidden = true;

    /* honeypot: real visitors never see or fill this box. Pretend success, store nothing. */
    if (f.trap.value.trim() !== '') {
      showReceipt({ ref: 'MSG-' + Math.random().toString(36).slice(2, 8).toUpperCase(), fullName: f.name.value.trim() || 'friend', email: f.email.value.trim(), subject: f.subject.value.trim(), submittedAt: store.nowLocalISO() });
      return;
    }
    var bad = validateAll();
    if (bad) { bad.focus(); showBanner('Please fix the highlighted fields and try again.', 'error'); return; }
    if (recentAttempts().length >= LIMIT) {
      showBanner('Too many submissions from this browser. Please wait a few minutes and try again. (Demo throttle: ' + LIMIT + ' per 15 minutes.)', 'error');
      return;
    }

    var res = store.create({
      fullName: f.name.value.trim(), email: f.email.value.trim(), subject: f.subject.value.trim(),
      campusDepartment: f.campus ? f.campus.value : '', message: f.message.value.trim(),
      type: f.type.value, rating: parseInt(f.rating.value, 10) || null, category: f.category.value
    });
    if (!res.ok) { showBanner('Your message could not be saved in this browser (storage may be full or blocked). Please try again.', 'error'); return; }
    recordAttempt();

    /* the notification is simulated AFTER saving: if it fails the message is still stored */
    var rec = { ref: 'MSG-' + res.record.id.slice(-6).toUpperCase(), fullName: res.record.fullName, email: res.record.email, subject: res.record.subject, submittedAt: res.record.submittedAt };
    var notice = '';
    try { simulateNotification(rec); } catch (err) { notice = 'Your message was saved, but the confirmation receipt could not be prepared. No email was sent.'; }
    form.reset(); touched = {}; feedbackFields.hidden = true; counter.textContent = '0 / 5000';
    showReceipt(rec, notice);
  });

  /* stands in for the email service; always "succeeds" in this demo */
  function simulateNotification(rec) { if (!rec.email) throw new Error('no recipient'); }

  form.addEventListener('reset', function () { ui.clearErrors(form); touched = {}; feedbackFields.hidden = true; counter.textContent = '0 / 5000'; });
  ui.applyFeatures();
})();
