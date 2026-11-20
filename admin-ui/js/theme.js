/* ==========================================================================
   theme.js — applies the saved theme. Load it in <head> (before the page
   paints) so there is no flash of the wrong colors:
       <script src="../js/theme.js"></script>
   It sets <html data-theme="classic|light|dark"> and the CSS variables
   --cms-primary / --cms-secondary / --cms-font. The colors for each theme
   live in css/theme.css. The theme page (theme-page.js) saves the choice.
   Data: localStorage "psucms.theme" = [ { id:'theme', theme, primary, secondary, font } ]
   PHP: print the saved values into <html data-theme> and a <style> block instead.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.theme = (function () {
  var THEMES = [
    { value: 'classic', label: 'PSU Classic' },
    { value: 'light', label: 'Modern Light' },
    { value: 'dark', label: 'Campus Dark' }
  ];
  var FONTS = {
    inter: { label: 'Inter', css: '"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif' },
    system: { label: 'System UI', css: 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif' },
    serif: { label: 'Georgia (serif)', css: 'Georgia,"Times New Roman",serif' }
  };
  var DEFAULTS = { theme: 'classic', primary: '#1E4FA3', secondary: '#F5B700', font: 'inter' };

  function isHex(v) { return /^#[0-9a-f]{6}$/i.test(String(v || '')); }

  /* Always returns a complete, valid settings object. */
  function normalize(rec) {
    rec = rec && typeof rec === 'object' ? rec : {};
    var themeOk = THEMES.some(function (t) { return t.value === rec.theme; });
    return {
      theme: themeOk ? rec.theme : DEFAULTS.theme,
      primary: isHex(rec.primary) ? String(rec.primary).toUpperCase() : DEFAULTS.primary,
      secondary: isHex(rec.secondary) ? String(rec.secondary).toUpperCase() : DEFAULTS.secondary,
      font: FONTS[rec.font] ? rec.font : DEFAULTS.font
    };
  }

  function apply(rec) {
    var t = normalize(rec);
    var root = document.documentElement;
    root.setAttribute('data-theme', t.theme);
    /* only a changed primary color needs the derived (darker / softer) shades */
    if (t.primary !== DEFAULTS.primary) root.setAttribute('data-custom-primary', ''); else root.removeAttribute('data-custom-primary');
    root.style.setProperty('--cms-primary', t.primary);
    root.style.setProperty('--cms-secondary', t.secondary);
    root.style.setProperty('--cms-font', FONTS[t.font].css);
    return t;
  }

  function saved() {
    try {
      var prefix = window.CMS && CMS.config ? CMS.config.storagePrefix : 'psucms.';
      var raw = window.localStorage.getItem(prefix + 'theme');
      var list = raw ? JSON.parse(raw) : null;
      return Array.isArray(list) && list[0] ? list[0] : null;
    } catch (e) { return null; }
  }

  var initial = saved();
  if (initial) apply(initial);

  return { THEMES: THEMES, FONTS: FONTS, DEFAULTS: DEFAULTS, isHex: isHex, normalize: normalize, apply: apply, saved: saved };
})();
