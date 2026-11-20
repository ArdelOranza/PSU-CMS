/* ==========================================================================
   account.js — Account Settings (profile).
   Saved (localStorage "psucms.account"): full name, username, email, picture.
   Password fields are only CHECKED here and then cleared — they are never
   stored, and nothing is changed on any server (there is no backend yet).
   PHP: POST the form to an endpoint; hash passwords server-side; add CSRF.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, settings = CMS.settings;
  var form = document.getElementById('accountForm');
  var f = {
    name: document.getElementById('accountName'), username: document.getElementById('accountUsername'),
    email: document.getElementById('accountEmail'), pw: document.getElementById('accountNewPassword'),
    pw2: document.getElementById('accountConfirmPassword')
  };
  var photo = document.getElementById('accountPhoto');
  var photoInput = document.getElementById('accountPhotoInput');
  var photoBtn = document.getElementById('accountPhotoBtn');
  var avatar = '';                                  // data URL of the chosen picture ('' = none)

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var MIN_PW = 12;                                  // same minimum as setup.php

  function showPhoto() {
    ui.clear(photo);
    if (avatar) photo.appendChild(el('img', { src: avatar, alt: 'Profile picture preview' }));
    else photo.textContent = 'Profile Picture';
  }
  function load() {
    var a = settings.get('account');
    f.name.value = a.fullName; f.username.value = a.username; f.email.value = a.email;
    f.pw.value = ''; f.pw2.value = '';
    avatar = a.avatar || '';
    showPhoto();
    ui.clearErrors(form);
  }

  /* shrink to a small square thumbnail so localStorage stays light */
  function thumbnail(dataUrl, size) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onerror = function () { reject(new Error('The image could not be opened.')); };
      img.onload = function () {
        var s = Math.min(img.width, img.height);
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  }
  photoBtn.addEventListener('click', function () { photoInput.click(); });
  photoInput.addEventListener('change', function () {
    var file = photoInput.files[0];
    if (!file) return;
    ui.readImage(file).then(function (url) { return thumbnail(url, 256); })
      .then(function (small) { avatar = small; showPhoto(); ui.toast('Picture selected. Save Profile to keep it.', 'info'); })
      .catch(function (err) { ui.toast(err.message, 'error'); });
    photoInput.value = '';
  });

  function validate() {
    ui.clearErrors(form);
    var bad = null;
    function fail(input, msg) { ui.setError(input, msg); if (!bad) bad = input; }
    var name = f.name.value.trim(), user = f.username.value.trim(), mail = f.email.value.trim();
    if (name.length < 2) fail(f.name, 'Enter your full name.');
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(user)) fail(f.username, 'Use 3\u201330 letters, numbers, dots, dashes or underscores.');
    if (!mail) fail(f.email, 'Enter your email address.');
    else if (!EMAIL.test(mail)) fail(f.email, 'Enter a valid email address.');
    if (f.pw.value || f.pw2.value) {
      if (f.pw.value.length < MIN_PW) fail(f.pw, 'Use at least ' + MIN_PW + ' characters.');
      if (f.pw2.value !== f.pw.value) fail(f.pw2, 'The passwords do not match.');
    }
    return bad;
  }

  [f.name, f.username, f.email, f.pw, f.pw2].forEach(function (input) {
    input.addEventListener('input', function () {
      var field = input.closest('.cms-field');
      if (field && field.classList.contains('has-error')) validate();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate();
    if (bad) { bad.focus(); ui.toast('Please fix the highlighted fields.', 'error'); return; }
    var hadPassword = !!f.pw.value;
    var res = settings.save('account', { fullName: f.name.value.trim(), username: f.username.value.trim(), email: f.email.value.trim(), avatar: avatar });
    if (!res.ok) { ui.toast('The profile could not be saved (browser storage may be full).', 'error'); return; }
    f.pw.value = ''; f.pw2.value = '';                              // never keep passwords
    settings.applyHeader();
    ui.toast(hadPassword ? 'Profile saved. The new password was checked but not stored \u2014 password changes need the backend.' : 'Profile saved.', 'success');
  });
  form.addEventListener('reset', function (e) { e.preventDefault(); load(); ui.toast('Changes discarded.', 'info'); });

  var back = document.getElementById('accountBack');
  if (back) back.addEventListener('click', function (e) {
    if (document.referrer && window.history.length > 1) { e.preventDefault(); window.history.back(); }
  });

  settings.attachPasswordToggles(form);
  load();
})();
