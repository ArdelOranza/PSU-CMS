/* 404 page: "Search the website" reveals an inline form that submits to the existing
   CMS search (index.php?q=...). */
(function () {
  'use strict';
  var btn = document.getElementById('nf-search-btn');
  var inline = document.getElementById('nf-search');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var open = inline.hidden;
    inline.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) inline.querySelector('input').focus();
  });
})();
