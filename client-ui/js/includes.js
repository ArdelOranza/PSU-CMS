/* Loads shared components (header/footer) into <div data-include="header|footer">.
   Page must declare <body data-root="../../"> = path from the page to the repo root.
   In the PHP version, includes/header.php and footer.php do the same job server-side. */
(function () {
  'use strict';
  var root = document.body.getAttribute('data-root') || '';

  function resolve(fragment) {
    fragment.querySelectorAll('[href^="@/"], [src^="@/"], [action^="@/"]').forEach(function (el) {
      ['href', 'src', 'action'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && v.indexOf('@/') === 0) el.setAttribute(attr, root + v.slice(2));
      });
    });
  }

  function load(slot) {
    var name = slot.getAttribute('data-include');
    return fetch(root + 'client-ui/includes/' + name + '.html')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var tpl = document.createElement('template');
        tpl.innerHTML = html;
        resolve(tpl.content);
        slot.replaceWith(tpl.content);
      })
      .catch(function () {
        slot.innerHTML = '<p class="container">Shared ' + name + ' could not load. Serve the project over HTTP (for example: php -S localhost:8000).</p>';
      });
  }

  var slots = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
  Promise.all(slots.map(load)).then(function () {
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    if (window.PSUHeader) window.PSUHeader.init();
    document.dispatchEvent(new CustomEvent('psu:components-ready'));
  });
})();
