/* Website Layout: reorder sections, live preview, save to localStorage (read by the public pages). */
(function () {
  'use strict';
  var A = window.PSUAdmin;
  var list = document.getElementById('sectionList');
  if (!list) return;
  
  var header = A.$('#f_header'), footer = A.$('#f_footer'), menu = A.$('#f_menu');
  var layout = PSU.db.layout();

  CMS.ui.setOptions(header, Object.keys(PSU.HEADER_LAYOUTS).map(function (k) { return { value: k, label: PSU.HEADER_LAYOUTS[k] }; }), layout.header);
  CMS.ui.setOptions(footer, Object.keys(PSU.FOOTER_LAYOUTS).map(function (k) { return { value: k, label: PSU.FOOTER_LAYOUTS[k] }; }), layout.footer);
  CMS.ui.setOptions(menu, Object.keys(PSU.MENU_LAYOUTS).map(function (k) { return { value: k, label: PSU.MENU_LAYOUTS[k] }; }), layout.menu);

  list.innerHTML = layout.sections.map(function (k) {
    var label = A.esc(PSU.SECTIONS[k]);
    return '<li class="res-section-item" data-key="' + k + '"><i class="bi bi-list res-section-handle" aria-hidden="true"></i><span class="res-section-label">' + label + '</span>' +
      '<span class="res-section-moves"><button type="button" class="res-move" data-move="up" aria-label="Move ' + label + ' up"><i class="bi bi-arrow-up" aria-hidden="true"></i></button>' +
      '<button type="button" class="res-move" data-move="down" aria-label="Move ' + label + ' down"><i class="bi bi-arrow-down" aria-hidden="true"></i></button></span></li>';
  }).join('');

  function items() { return [].slice.call(list.querySelectorAll('.res-section-item')); }
  function sync() {
    var rows = items();
    rows.forEach(function (li, i) {
      li.querySelector('[data-move="up"]').disabled = i === 0;
      li.querySelector('[data-move="down"]').disabled = i === rows.length - 1;
    });
  }
  list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-move]');
    if (!btn || btn.disabled) return;
    var li = btn.closest('.res-section-item');
    if (btn.getAttribute('data-move') === 'up' && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
    else if (btn.getAttribute('data-move') === 'down' && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
    sync();
    li.classList.add('is-moved'); setTimeout(function () { li.classList.remove('is-moved'); }, 450);
    var again = btn.disabled ? li.querySelector('.res-move:not(:disabled)') : btn;
    if (again) again.focus();
  });
  [header, footer, menu].forEach(function (s) { s.addEventListener('change', sync); });
  A.$('#layoutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = PSU.db.saveLayout({ sections: items().map(function (li) { return li.getAttribute('data-key'); }), header: header.value, footer: footer.value, menu: menu.value });
    CMS.ui.toast(ok ? 'Layout saved.' : 'The layout could not be saved in this browser.', ok ? 'success' : 'error');
  });
  sync();
})();
