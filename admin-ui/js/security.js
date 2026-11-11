/* ==========================================================================
   security.js — Security Settings (SIMULATED).
   Real behavior: only the two-factor preference (on/off) is saved, in
   localStorage "psucms.security". The password form is validated and then
   cleared. Passwords are never stored and no real password is changed; the
   login session list is sample data. Real security needs the PHP backend.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, settings = CMS.settings;
  var form = document.getElementById('securityForm');
  var f = { cur: document.getElementById('securityCurrent'), pw: document.getElementById('securityNew'), pw2: document.getElementById('securityConfirm') };
  var toggle = document.getElementById('securityTwoFactor');
  var sessions = document.getElementById('securitySessions');
  var strength = document.getElementById('securityStrength');
  var MIN_PW = 12;
  var twoFactor = true;

  function paintToggle() {
    toggle.setAttribute('aria-checked', twoFactor ? 'true' : 'false');
    toggle.classList.toggle('is-on', twoFactor);
    toggle.lastElementChild.textContent = twoFactor ? 'Enabled' : 'Disabled';
  }
  function paintSessions(list) {
    ui.clear(sessions);
    list.forEach(function (s) { sessions.appendChild(el('div', { class: 'security-session', text: s.device + (s.current ? ' (current)' : '') })); });
    if (!list.length) sessions.appendChild(el('div', { class: 'security-session', text: 'No active sessions.' }));
  }
  function load() {
    var s = settings.get('security');
    twoFactor = !!s.twoFactor;
    paintToggle();
    paintSessions(Array.isArray(s.sessions) ? s.sessions : []);
    f.cur.value = f.pw.value = f.pw2.value = '';
    updateStrength();
    ui.clearErrors(form);
  }

  /* live hint under "New Password" */
  function updateStrength() {
    var v = f.pw.value;
    if (!v) { strength.textContent = 'Use at least ' + MIN_PW + ' characters, with letters and numbers.'; strength.className = 'cms-field-hint'; return; }
    var score = (v.length >= MIN_PW ? 1 : 0) + (/[a-z]/.test(v) && /[A-Z]/.test(v) ? 1 : 0) + (/\d/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
    var label = v.length < MIN_PW ? 'Too short \u2014 ' + (MIN_PW - v.length) + ' more character' + (MIN_PW - v.length === 1 ? '' : 's') + ' needed' : score >= 4 ? 'Strong' : score >= 3 ? 'Good' : 'Fair \u2014 add numbers, capitals or symbols';
    strength.textContent = 'Strength: ' + label;
    strength.className = 'cms-field-hint security-strength-' + (v.length < MIN_PW ? 'weak' : score >= 3 ? 'good' : 'fair');
  }

  function validate() {
    ui.clearErrors(form);
    var any = f.cur.value || f.pw.value || f.pw2.value;
    if (!any) return null;                              // password form left empty: only preferences are saved
    var bad = null;
    function fail(input, msg) { ui.setError(input, msg); if (!bad) bad = input; }
    if (!f.cur.value) fail(f.cur, 'Enter your current password.');
    if (!f.pw.value) fail(f.pw, 'Enter a new password.');
    else if (f.pw.value.length < MIN_PW) fail(f.pw, 'Use at least ' + MIN_PW + ' characters.');
    else if (f.pw.value === f.cur.value) fail(f.pw, 'The new password must be different from the current one.');
    if (!f.pw2.value) fail(f.pw2, 'Confirm your new password.');
    else if (f.pw2.value !== f.pw.value) fail(f.pw2, 'The passwords do not match.');
    return bad;
  }

  toggle.addEventListener('click', function () { twoFactor = !twoFactor; paintToggle(); });
  f.pw.addEventListener('input', updateStrength);
  [f.cur, f.pw, f.pw2].forEach(function (input) {
    input.addEventListener('input', function () { if (form.querySelector('.has-error')) validate(); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate();
    if (bad) { bad.focus(); ui.toast('Please fix the highlighted fields.', 'error'); return; }
    var hadPassword = !!(f.cur.value || f.pw.value);
    var res = settings.save('security', { twoFactor: twoFactor });   // never the passwords
    if (!res.ok) { ui.toast('The settings could not be saved (browser storage may be full).', 'error'); return; }
    f.cur.value = f.pw.value = f.pw2.value = '';
    updateStrength();
    ui.toast(hadPassword ? 'Security settings saved. Password change simulated \u2014 nothing was changed or stored.' : 'Security settings saved.', 'success');
  });
  form.addEventListener('reset', function (e) { e.preventDefault(); load(); ui.toast('Changes discarded.', 'info'); });

  var back = document.getElementById('securityBack');
  if (back) back.addEventListener('click', function (e) {
    if (document.referrer && window.history.length > 1) { e.preventDefault(); window.history.back(); }
  });

  settings.attachPasswordToggles(form);
  load();
})();
