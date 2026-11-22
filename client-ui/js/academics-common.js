/* ==========================================================================
   academics-common.js — small helpers shared by the Academics page scripts.
   window.PSUAcademicsUI:
     el()            build DOM safely (text is always set with textContent, never innerHTML)
     icon()          inline SVG icon
     breadcrumb()    Home / ... / current
     collegeLogo()   emblem image, or an initials badge when no logo file is set
     initials()      "Dr. Mari I. Mar" -> "MM"
     plural()        "1 program" / "4 programs"
     formatDate()    "2026-10-06" -> "Oct 6, 2026"
     listController() search + filters + pagination wired together, state kept in the URL
   Depends on nothing but the browser. No inline scripts/styles (site CSP).
   ========================================================================== */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-left': 'M15 6l-6 6 6 6',
    'chevron-right': 'M9 6l6 6-6 6',
    'search': 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3'
  };

  /* el('div', {class:'x', href:'..'}, ['text', childNode]) */
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ac-icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function param(name) { return new URLSearchParams(window.location.search).get(name) || ''; }

  function initials(fullName) {
    var skip = /^(dr|prof|engr|mr|ms|mrs|atty|arch|hon)\.?$/i;
    var words = String(fullName || '').split(/\s+/).filter(function (w) { return w && !skip.test(w); });
    if (!words.length) return '?';
    if (/^[A-Z]{2}$/.test(words[0])) return words[0];   // "Prof. JD Cruz" -> "JD" (already initials)
    var first = words[0].charAt(0), last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  function formatDate(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  /* items: [{label, href?}] — the last item is the current page and is not a link */
  function breadcrumb(items) {
    var ol = el('ol', {}, items.map(function (it, i) {
      var last = i === items.length - 1;
      return el('li', { 'aria-current': last ? 'page' : null }, [it.href && !last ? el('a', { href: it.href, text: it.label }) : it.label]);
    }));
    return el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [ol]);
  }

  /* Official emblem when college.logo is set, otherwise an initials badge. size: 'lg' for the details hero. */
  function collegeLogo(college, size) {
    var cls = 'ac-logo' + (size ? ' ac-logo--' + size : '');
    if (college.logo) return el('img', { class: cls, src: '../' + college.logo, alt: '', width: size === 'lg' ? 96 : 56, height: size === 'lg' ? 96 : 56 });
    return el('span', { class: cls + ' ac-logo--badge', 'aria-hidden': 'true' }, [college.abbreviation]);
  }

  function debounce(fn, ms) {
    var t; return function () { var a = arguments, ctx = this; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, a); }, ms); };
  }

  /* ---------------------------------------------------------------- Pager */
  function pageWindow(page, pages) {
    if (pages <= 7) { var all = []; for (var i = 1; i <= pages; i++) all.push(i); return all; }
    var set = { 1: 1, 2: 1 }; set[pages] = 1; set[pages - 1] = 1; set[page] = 1; set[page - 1] = 1; set[page + 1] = 1;
    var nums = Object.keys(set).map(Number).filter(function (n) { return n >= 1 && n <= pages; }).sort(function (a, b) { return a - b; });
    var out = [];
    nums.forEach(function (n, i) { if (i && n - nums[i - 1] > 1) out.push('…'); out.push(n); });
    return out;
  }

  function renderPager(container, page, pages, onPage) {
    clear(container);
    if (pages <= 1) { container.hidden = true; return; }
    container.hidden = false;
    function btn(label, aria, target, current, disabled, content) {
      var b = el('button', { type: 'button', class: 'ac-pager__btn' + (current ? ' is-current' : ''), 'aria-label': aria, 'aria-current': current ? 'page' : null, disabled: disabled }, [content || label]);
      b.addEventListener('click', function () { if (!disabled && !current) onPage(target); });
      return el('li', {}, [b]);
    }
    var list = el('ul', { class: 'ac-pager__list' });
    list.appendChild(btn('', 'Previous page', page - 1, false, page === 1, icon('chevron-left')));
    pageWindow(page, pages).forEach(function (n) {
      if (n === '…') list.appendChild(el('li', { class: 'ac-pager__gap', 'aria-hidden': 'true' }, ['…']));
      else list.appendChild(btn(String(n), 'Page ' + n, n, n === page, false));
    });
    list.appendChild(btn('', 'Next page', page + 1, false, page === pages, icon('chevron-right')));
    container.appendChild(list);
  }

  /* ---------------------------------------------------- Search/filter fields */
  function textField(input) {
    return { get: function () { return input.value.trim(); }, set: function (v) { input.value = v; },
             bind: function (cb) { input.addEventListener('input', debounce(cb, 150)); } };
  }
  function selectField(select) {
    return { get: function () { return select.value; }, set: function (v) { select.value = v; if (select.value !== v) select.value = ''; },
             bind: function (cb) { select.addEventListener('change', cb); } };
  }
  /* options: [{value,label}] — first option should be the "All ..." choice with value '' */
  function fillSelect(select, options) {
    clear(select);
    options.forEach(function (o) { select.appendChild(el('option', { value: o.value, text: o.label })); });
  }

  /* ---------------------------------------------------------- List controller
     cfg = {
       fields:   { key: textField(...) | selectField(...) | custom {get,set,bind} },
       items:    function () -> all records,
       match:    function (record, state) -> boolean   (state = {q, campus, ...})
       pageSize: number,
       render:   function (recordsOnThisPage),
       status:   element for the live "Showing 1–9 of 26" text,
       pager:    element,
       empty:    element shown when nothing matches,
       listEl:   element holding the results (hidden when empty)
     }
     State (filters + page) is mirrored into the URL (?q=..&campus=..&page=2) so refresh, back
     and shared links keep the same view. Changing any filter returns to page 1. */
  function listController(cfg) {
    var keys = Object.keys(cfg.fields), page = 1;

    function readUrl() {
      var p = new URLSearchParams(window.location.search);
      keys.forEach(function (k) { cfg.fields[k].set(p.get(k) || ''); });
      page = Math.max(1, parseInt(p.get('page'), 10) || 1);
    }
    function state() { var s = {}; keys.forEach(function (k) { s[k] = cfg.fields[k].get(); }); return s; }
    function writeUrl(s) {
      var p = new URLSearchParams();
      keys.forEach(function (k) { if (s[k]) p.set(k, s[k]); });
      if (page > 1) p.set('page', String(page));
      var qs = p.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
    }
    function render() {
      var s = state(), matches = cfg.items().filter(function (r) { return cfg.match(r, s); });
      var pages = Math.max(1, Math.ceil(matches.length / cfg.pageSize));
      page = Math.min(page, pages);
      writeUrl(s);
      var start = (page - 1) * cfg.pageSize, slice = matches.slice(start, start + cfg.pageSize);
      if (!matches.length) {
        cfg.listEl.hidden = true; cfg.empty.hidden = false; cfg.pager.hidden = true;
        cfg.status.textContent = 'No results found.';
        return;
      }
      cfg.listEl.hidden = false; cfg.empty.hidden = true;
      cfg.render(slice);
      cfg.status.textContent = 'Showing ' + (start + 1) + '–' + (start + slice.length) + ' of ' + matches.length;
      renderPager(cfg.pager, page, pages, function (n) {
        page = n; render();
        var top = cfg.listEl.getBoundingClientRect().top;
        if (top < 0) cfg.listEl.scrollIntoView({ block: 'start' });
      });
    }
    function reset() { keys.forEach(function (k) { cfg.fields[k].set(''); }); page = 1; render(); }

    keys.forEach(function (k) { cfg.fields[k].bind(function () { page = 1; render(); }); });
    readUrl(); render();
    return { render: render, reset: reset };
  }

  global.PSUAcademicsUI = {
    el: el, icon: icon, clear: clear, plural: plural, param: param, initials: initials, formatDate: formatDate,
    breadcrumb: breadcrumb, collegeLogo: collegeLogo, textField: textField, selectField: selectField,
    fillSelect: fillSelect, listController: listController
  };
})(window);
