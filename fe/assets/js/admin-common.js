/* Helpers shared by the admin pages (uses CMS.ui from the existing admin-ui scripts and PSU.db mock data). */
(function () {
  'use strict';
  var A = window.PSUAdmin = {};
  var esc = PSU.util.esc;

  A.$ = function (sel, root) { return (root || document).querySelector(sel); };
  A.$all = function (sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); };
  A.esc = esc;

  /* show a toast on the next page, then go there */
  A.go = function (message, url, type) { CMS.ui.flash(message, type || 'success'); location.href = url; };

  A.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };

  A.emptyHtml = function (title, text, actionHtml) {
    return '<div class="cms-empty res-empty"><img src="../assets/images/empty-state.png" alt="">' +
      '<p class="cms-empty-title">' + esc(title) + '</p><p class="cms-empty-text">' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  };

  A.footerHtml = function (pg) {
    if (!pg.total) return '';
    return '<div class="cms-table-footer"><span>Showing ' + pg.from + '\u2013' + pg.to + ' of ' + pg.total + '</span>' +
      PSU.util.pagerHtml(pg, 'cms-page-btn', 'cms-pager') + '</div>';
  };

  /* click on a pager button -> cb(pageNumber) */
  A.onPager = function (container, cb) {
    container.addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]');
      if (b && !b.disabled) cb(Number(b.getAttribute('data-page')));
    });
  };

  A.unique = function (list) { return list.filter(function (v, i) { return v && list.indexOf(v) === i; }).sort(); };

  /* Drag and drop onto a dropzone forwards the first file to the file input. */
  A.dropzone = function (zone, input, onFile) {
    if (!zone || !input) return;
    ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
    zone.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      try { var dt = new DataTransfer(); dt.items.add(files[0]); input.files = dt.files; } catch (err) { onFile(files[0]); return; }
      onFile(files[0]);
    });
    input.addEventListener('change', function () { if (input.files && input.files[0]) onFile(input.files[0]); });
  };

  A.extOf = function (name) {
    var e = (String(name).split('.').pop() || '').toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  };

  /* returns an error message or '' */
  A.checkFile = function (file, allowed) {
    var ext = A.extOf(file.name);
    if (!allowed[ext]) return 'This file type is not allowed. Allowed: ' + Object.keys(allowed).join(', ').toUpperCase() + '.';
    if (file.size === 0) return 'The selected file is empty.';
    if (file.size > PSU.MAX_BYTES) return 'The file is ' + PSU.util.fmtSize(file.size) + '. The limit is 12 MB.';
    return '';
  };

  A.setFieldError = function (id, msg) {
    var p = document.getElementById(id);
    if (!p) return;
    p.textContent = msg || '';
    var f = p.closest('.cms-field');
    if (f) f.classList.toggle('has-error', !!msg);
  };
})();
