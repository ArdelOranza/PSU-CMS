/* "Staff access only" page: Log in is a link to the Staff Login page; Cancel returns to the client page the visitor came from. */
(function () {
  'use strict';
  try { if (sessionStorage.getItem('psu.staff') === '1') { location.replace('documents.html'); return; } } catch (e) {}
  function back() {
    var url = '';
    try { url = sessionStorage.getItem('psu.back') || ''; sessionStorage.removeItem('psu.back'); } catch (e) {}
    location.href = url && !/resources-access\.html/.test(url) ? url : 'directory.html';
  }
  document.getElementById('accessCancel').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') back(); });
})();
