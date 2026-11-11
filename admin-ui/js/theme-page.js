/* ==========================================================================
   theme-page.js — Theme Settings page. theme.js (loaded in <head>) applies
   the saved theme on every page; this file lets the admin pick and save one.
   Click a theme card to select it, then "Apply Theme" to save + apply.
   "Preview Website" applies the selection temporarily (refresh to undo).
   ========================================================================== */
(function () {
  var ui = CMS.ui, settings = CMS.settings, theme = CMS.theme;
  var cards = [].slice.call(document.querySelectorAll('[data-theme-value]'));
  var primary = document.getElementById('themePrimary');
  var secondary = document.getElementById('themeSecondary');
  var font = document.getElementById('themeFont');
  var form = document.getElementById('themeForm');
  var previewBtn = document.getElementById('themePreview');
  var selected = 'classic';

  ui.setOptions(font, Object.keys(theme.FONTS).map(function (k) { return { value: k, label: theme.FONTS[k].label }; }), 'inter');

  function paintCards(activeValue) {
    cards.forEach(function (c) {
      var v = c.getAttribute('data-theme-value');
      c.setAttribute('aria-checked', v === selected ? 'true' : 'false');
      c.querySelector('.theme-active').hidden = v !== activeValue;
    });
  }
  function load() {
    var t = theme.normalize(settings.get('theme'));
    selected = t.theme;
    primary.value = t.primary; secondary.value = t.secondary;
    ui.setOptions(font, Object.keys(theme.FONTS).map(function (k) { return { value: k, label: theme.FONTS[k].label }; }), t.font);
    ui.clearErrors(form);
    paintCards(t.theme);
  }

  /* the settings currently shown in the form, or null when a color is invalid */
  function draft() {
    ui.clearErrors(form);
    var ok = true;
    [primary, secondary].forEach(function (input) {
      input.value = input.value.trim();
      if (input.value && input.value.charAt(0) !== '#') input.value = '#' + input.value;
      if (!theme.isHex(input.value)) { ui.setError(input, 'Use a 6-digit hex color, like #1E4FA3.'); ok = false; }
    });
    return ok ? { theme: selected, primary: primary.value, secondary: secondary.value, font: font.value } : null;
  }

  cards.forEach(function (c) {
    c.addEventListener('click', function () { selected = c.getAttribute('data-theme-value'); paintCards(theme.normalize(settings.get('theme')).theme); });
  });
  [primary, secondary].forEach(function (i) { i.addEventListener('input', function () { if (i.closest('.cms-field').classList.contains('has-error')) draft(); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = draft();
    if (!d) { ui.toast('Please fix the highlighted colors.', 'error'); return; }
    var res = settings.save('theme', d);
    if (!res.ok) { ui.toast('The theme could not be saved (browser storage may be full).', 'error'); return; }
    theme.apply(d);
    paintCards(d.theme);
    ui.toast('Theme applied and saved.', 'success');
  });

  previewBtn.addEventListener('click', function () {
    var d = draft();
    if (!d) { ui.toast('Please fix the highlighted colors.', 'error'); return; }
    theme.apply(d);
    ui.toast('Previewing the selection. Click Apply Theme to keep it; refreshing the page undoes the preview.', 'info');
  });

  load();
})();
