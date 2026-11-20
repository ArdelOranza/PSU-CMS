/* Contact Us: client-side validation and simulated submission.
   NOTE: nothing is sent anywhere. Valid submissions are only stored in
   localStorage ("psu.contact.submissions") to demonstrate the flow. */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var alertBox = document.getElementById('form-alert');
  var alertText = document.getElementById('form-alert-text');
  var successSection = document.getElementById('contact-success');
  var formSection = document.getElementById('contact-form-section');
  var leadText = document.getElementById('page-lead');
  var successTitle = document.getElementById('success-title');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var WARN_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M12 3.5l9.5 16.5h-19L12 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var rules = {
    name: function (v) { v = v.trim(); if (!v) return 'This field is required'; if (v.length > 120) return 'Please use 120 characters or fewer'; return ''; },
    email: function (v) { v = v.trim(); if (!v) return 'This field is required'; if (v.length > 190 || !EMAIL_RE.test(v)) return 'Please enter a valid email address'; return ''; },
    subject: function (v) { v = v.trim(); if (!v) return 'This field is required'; if (v.length > 220) return 'Please use 220 characters or fewer'; return ''; },
    campus: function (v) { return v ? '' : 'Please select a campus or department'; },
    message: function (v) { v = v.trim(); if (!v) return 'This field is required'; if (v.length > 5000) return 'Please use 5000 characters or fewer'; return ''; },
    robot: function (_v, el) { return el.checked ? '' : 'Please confirm that you are not a robot'; }
  };

  var fields = Object.keys(rules).map(function (name) {
    var el = form.elements[name];
    var wrap = el.closest('.field');
    return { name: name, el: el, wrap: wrap, error: wrap.querySelector('.field-error') };
  });

  var submitted = false; // live re-validation only starts after the first submit attempt

  function setError(f, msg) {
    f.wrap.classList.toggle('has-error', !!msg);
    f.el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      f.error.innerHTML = WARN_ICON + '<span></span>';
      f.error.lastChild.textContent = msg;
      f.error.hidden = false;
      f.el.setAttribute('aria-describedby', f.error.id);
    } else {
      f.error.hidden = true;
      f.error.textContent = '';
      f.el.removeAttribute('aria-describedby');
    }
  }

  function validateField(f) {
    var msg = rules[f.name](f.el.value, f.el);
    setError(f, msg);
    return msg;
  }

  function updateAlert() {
    var count = fields.filter(function (f) { return f.wrap.classList.contains('has-error'); }).length;
    if (!count) { alertBox.hidden = true; return; }
    alertText.textContent = 'Please fix the ' + count + (count === 1 ? ' error' : ' errors') + ' below and try again.';
    alertBox.hidden = false;
  }

  fields.forEach(function (f) {
    var evt = (f.el.type === 'checkbox' || f.el.tagName === 'SELECT') ? 'change' : 'input';
    f.el.addEventListener(evt, function () {
      if (!submitted) return;
      validateField(f);
      updateAlert();
    });
    f.el.addEventListener('blur', function () {
      if (submitted && f.el.value !== '' ) { validateField(f); updateAlert(); }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitted = true;
    var firstInvalid = null;
    fields.forEach(function (f) {
      if (validateField(f) && !firstInvalid) firstInvalid = f;
    });
    updateAlert();

    if (firstInvalid) {
      alertBox.focus();
      return; // values are left untouched so the user keeps what they typed
    }

    var record = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      campus: form.elements.campus.value,
      message: form.elements.message.value.trim(),
      submittedAt: new Date().toISOString(),
      simulated: true
    };
    try {
      var all = JSON.parse(localStorage.getItem('psu.contact.submissions') || '[]');
      all.push(record);
      localStorage.setItem('psu.contact.submissions', JSON.stringify(all.slice(-20)));
    } catch (err) { /* storage unavailable: the demo still continues */ }

    formSection.hidden = true;
    if (leadText) leadText.hidden = true;
    successSection.hidden = false;
    document.title = 'Message sent | Contact Us | Pangasinan State University';
    successTitle.focus();
    window.scrollTo({ top: 0 });
  });
})();
