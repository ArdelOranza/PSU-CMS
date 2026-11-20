/* Behaviour for the shared header: active link, dropdowns, mobile menu, search. */
(function () {
  'use strict';

  function init() {
    var header = document.getElementById('site-header');
    if (!header || header.dataset.ready) return;
    header.dataset.ready = '1';

    var toggle = header.querySelector('.site-nav__toggle');
    var list = header.querySelector('.site-nav__list');
    var dropdownItems = Array.prototype.slice.call(header.querySelectorAll('.has-dropdown'));
    var searchBtn = header.querySelector('.site-nav__search-btn');
    var searchPanel = header.querySelector('#site-search');

    // Active page: <body data-nav="contact">
    var current = document.body.getAttribute('data-nav');
    if (current) {
      var active = header.querySelector('[data-nav-id="' + current + '"]');
      if (active) { active.classList.add('is-active'); active.setAttribute('aria-current', 'page'); }
    }

    function closeDropdowns(except) {
      dropdownItems.forEach(function (li) {
        if (li === except) return;
        li.classList.remove('is-open');
        li.querySelector('button').setAttribute('aria-expanded', 'false');
      });
    }

    dropdownItems.forEach(function (li) {
      var btn = li.querySelector('button');
      btn.addEventListener('click', function () {
        var open = !li.classList.contains('is-open');
        closeDropdowns(li);
        li.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    toggle.addEventListener('click', function () {
      var open = !list.classList.contains('is-open');
      list.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (!open) closeDropdowns();
    });

    function setSearch(open, focus) {
      searchPanel.hidden = !open;
      searchBtn.setAttribute('aria-expanded', String(open));
      if (open && focus) searchPanel.querySelector('input').focus();
    }
    searchBtn.addEventListener('click', function () { setSearch(searchPanel.hidden, true); });
    // Let other pages (e.g. the 404 button) open the same search panel.
    document.addEventListener('psu:open-search', function () { setSearch(true, true); });

    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) closeDropdowns();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openItem = dropdownItems.filter(function (li) { return li.classList.contains('is-open'); })[0];
      if (openItem) { closeDropdowns(); openItem.querySelector('button').focus(); }
      else if (!searchPanel.hidden) { setSearch(false); searchBtn.focus(); }
      else if (list.classList.contains('is-open')) { list.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  window.PSUHeader = { init: init };
})();
