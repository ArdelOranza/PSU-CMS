/* ==========================================================================
   ui.js — small helpers shared by every page: safe DOM building, date
   formatting, toasts, confirm / detail modals, pagination, custom selects,
   empty state, search highlighting and image reading.
   Everything inserts text with textContent / text nodes (never innerHTML).
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.ui = (function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- DOM building ---------- */
  /* el('div', { class: 'x', text: 'Hi', 'data-id': 1 }, [child, 'text']) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function icon(name) { return el('i', { class: 'bi bi-' + name, 'aria-hidden': 'true' }); }
  function clear(node) { node.replaceChildren(); return node; }
  function getParam(name) { return new URLSearchParams(window.location.search).get(name); }
  function debounce(fn, wait) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, wait); };
  }

  /* ---------- Formatting ---------- */
  /* '2026-10-28' -> 'Oct 28, 2026' (no timezone surprises) */
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  /* '14:00' -> '2:00 PM' */
  function formatTime(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    if (!m) return '';
    var h = parseInt(m[1], 10), suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + suffix;
  }
  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- Status badge ---------- */
  var COLORS = {
    published: 'green', upcoming: 'green', pending: 'amber', ongoing: 'blue', archived: 'blue',
    draft: 'gray', expired: 'gray', completed: 'gray', urgent: 'red'
  };
  /* badge('published', 'Published') */
  function badge(statusKey, label) {
    return el('span', { class: 'cms-status cms-status-' + (COLORS[statusKey] || 'gray'), text: label });
  }

  /* ---------- Toasts ---------- */
  var toastStack = null;
  function toast(message, type) {
    type = type || 'info';
    if (!toastStack) {
      toastStack = el('div', { class: 'cms-toast-stack', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastStack);
    }
    var iconName = type === 'success' ? 'check-circle-fill' : type === 'error' ? 'exclamation-circle-fill' : 'info-circle-fill';
    var closeBtn = el('button', { type: 'button', 'aria-label': 'Dismiss' }, [icon('x')]);
    var node = el('div', { class: 'cms-toast is-' + type }, [icon(iconName), el('span', { text: message }), closeBtn]);
    function remove() { if (node.parentNode) node.parentNode.removeChild(node); }
    closeBtn.addEventListener('click', remove);
    toastStack.appendChild(node);
    setTimeout(remove, type === 'error' ? 6000 : 4000);
  }

  /* Messages that must survive a page change (e.g. "Saved" after redirect) */
  function flash(message, type) {
    try { sessionStorage.setItem('psucms.flash', JSON.stringify({ message: message, type: type || 'success' })); } catch (e) { /* ignore */ }
  }
  function showFlash() {
    try {
      var raw = sessionStorage.getItem('psucms.flash');
      if (!raw) return;
      sessionStorage.removeItem('psucms.flash');
      var f = JSON.parse(raw);
      toast(f.message, f.type);
    } catch (e) { /* ignore */ }
  }

  /* ---------- Modals (Bootstrap) ---------- */
  function openModal(modalEl) {
    document.body.appendChild(modalEl);
    var modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modal.dispose(); modalEl.remove(); });
    modal.show();
    return modal;
  }
  function modalShell(title, bodyNodes, footerNodes, size) {
    var dialog = el('div', { class: 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (size ? ' ' + size : '') }, [
      el('div', { class: 'modal-content' }, [
        el('div', { class: 'modal-header' }, [
          el('h2', { class: 'modal-title', text: title }),
          el('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal', 'aria-label': 'Close' })
        ]),
        el('div', { class: 'modal-body' }, bodyNodes),
        footerNodes ? el('div', { class: 'modal-footer' }, footerNodes) : null
      ])
    ]);
    return el('div', { class: 'modal fade cms-modal', tabindex: '-1', 'aria-hidden': 'true' }, [dialog]);
  }

  /* Resolves true when the user confirms, false otherwise. */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var answered = false;
      var cancelBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: opts.cancelLabel || 'Cancel' });
      var okBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-danger', text: opts.confirmLabel || 'Delete' });
      var modalEl = modalShell(opts.title || 'Are you sure?', [el('p', { text: opts.message || '' })], [cancelBtn, okBtn]);
      var modal = openModal(modalEl);
      okBtn.addEventListener('click', function () { answered = true; modal.hide(); resolve(true); });
      modalEl.addEventListener('hidden.bs.modal', function () { if (!answered) resolve(false); });
    });
  }

  /* Read-only detail view. rows: [[label, textOrNode], ...] */
  function showDetails(opts) {
    var body = [];
    if (opts.cover) body.push(el('img', { class: 'cms-detail-cover', src: opts.cover, alt: '' }));
    var dl = el('dl', { class: 'cms-detail-list' });
    (opts.rows || []).forEach(function (r) {
      if (r[1] === '' || r[1] === null || r[1] === undefined) return;
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', {}, [r[1] instanceof Node ? r[1] : String(r[1])]));
    });
    body.push(dl);
    if (opts.contentHtml) {
      var prose = el('div', { class: 'cms-prose' });
      CMS.sanitize.render(prose, opts.contentHtml);
      if (prose.textContent.trim() || prose.querySelector('img')) {
        body.push(el('hr'));
        body.push(prose);
      }
    }
    var closeBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Close' });
    return openModal(modalShell(opts.title, body, [closeBtn], 'modal-lg'));
  }

  /* ---------- Table footer + pagination ---------- */
  function pageList(current, pages) {
    if (pages <= 7) { var all = []; for (var i = 1; i <= pages; i++) all.push(i); return all; }
    var set = { 1: 1, 2: 1, 3: 1 }; set[pages] = 1; set[current] = 1; set[current - 1] = 1; set[current + 1] = 1;
    var nums = Object.keys(set).map(Number).filter(function (n) { return n >= 1 && n <= pages; }).sort(function (a, b) { return a - b; });
    var out = [], prev = 0;
    nums.forEach(function (n) { if (n - prev > 1) out.push('\u2026'); out.push(n); prev = n; });
    return out;
  }
  /* opts: { page, pageSize, total, onPage(n) }  ->  "Showing 1–5 of 30"  ‹ 1 2 3 › */
  function renderFooter(container, opts) {
    clear(container);
    var total = opts.total;
    if (!total) return;
    var pages = Math.max(1, Math.ceil(total / opts.pageSize));
    var page = Math.min(Math.max(1, opts.page), pages);
    var from = (page - 1) * opts.pageSize + 1, to = Math.min(total, page * opts.pageSize);
    container.appendChild(el('span', { text: 'Showing ' + from + '\u2013' + to + ' of ' + total }));
    if (pages < 2) return;
    function btn(label, target, extra) {
      var b = el('button', { type: 'button', class: 'cms-page-btn' + (extra && extra.active ? ' is-active' : ''), text: label,
                             'aria-label': extra && extra.aria, 'aria-current': extra && extra.active ? 'page' : null });
      if (extra && extra.disabled) b.disabled = true;
      else b.addEventListener('click', function () { opts.onPage(target); });
      return b;
    }
    var nav = el('nav', { class: 'cms-pager', 'aria-label': 'Pagination' });
    nav.appendChild(btn('\u2039', page - 1, { disabled: page === 1, aria: 'Previous page' }));
    pageList(page, pages).forEach(function (n) {
      if (n === '\u2026') nav.appendChild(el('span', { text: n, 'aria-hidden': 'true' }));
      else nav.appendChild(btn(String(n), n, { active: n === page, aria: 'Page ' + n }));
    });
    nav.appendChild(btn('\u203A', page + 1, { disabled: page === pages, aria: 'Next page' }));
    container.appendChild(nav);
  }

  /* ---------- Empty state ---------- */
  /* opts: { title, text, actionLabel, actionHref } */
  function renderEmpty(container, opts) {
    clear(container);
    var box = el('div', { class: 'cms-empty' }, [
      el('img', { src: opts.image || '../assets/images/empty-state.png', alt: '' }),
      el('p', { class: 'cms-empty-title', text: opts.title }),
      opts.text ? el('p', { class: 'cms-empty-text', text: opts.text }) : null,
      opts.actionLabel ? el('a', { class: 'cms-btn cms-btn-primary', href: opts.actionHref || '#', text: opts.actionLabel }) : null
    ]);
    container.appendChild(box);
  }

  /* ---------- Custom select (keeps the native <select> in sync) ---------- */
  function enhanceSelect(select) {
    if (select._cmsEnhanced) { select._cmsRefresh(); return; }
    select._cmsEnhanced = true;
    var wrap = el('div', { class: 'cms-select' + (select.hasAttribute('data-block') ? ' cms-select-block' : '') });
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('cms-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    var btn = el('button', { type: 'button', class: 'cms-select-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
    var menu = el('ul', { class: 'cms-select-menu', role: 'listbox', hidden: true });
    wrap.appendChild(btn); wrap.appendChild(menu);

    if (select.id) {
      var label = document.querySelector('label[for="' + select.id + '"]');
      if (label) {
        if (!label.id) label.id = select.id + '-label';
        btn.setAttribute('aria-labelledby', label.id);
        label.addEventListener('click', function (e) { e.preventDefault(); btn.focus(); });
      } else if (select.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', select.getAttribute('aria-label'));
      }
    }
    var focusIndex = -1;

    function options() { return [].slice.call(menu.children); }
    function build() {
      clear(menu);
      [].forEach.call(select.options, function (opt, i) {
        var li = el('li', { class: 'cms-select-option', role: 'option', 'data-index': i, text: opt.text,
                            'aria-selected': opt.selected ? 'true' : 'false' });
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        menu.appendChild(li);
      });
      sync();
    }
    function sync() {
      var sel = select.options[select.selectedIndex];
      btn.textContent = sel ? sel.text : '';
      btn.disabled = select.disabled;
      options().forEach(function (li, i) { li.setAttribute('aria-selected', i === select.selectedIndex ? 'true' : 'false'); });
    }
    function setFocus(i) {
      var items = options();
      if (!items.length) return;
      focusIndex = (i + items.length) % items.length;
      items.forEach(function (li, n) { li.classList.toggle('is-focus', n === focusIndex); });
      items[focusIndex].scrollIntoView({ block: 'nearest' });
    }
    function open() {
      if (btn.disabled) return;
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); setFocus(select.selectedIndex);
    }
    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function choose(i) {
      var changed = select.selectedIndex !== i;
      select.selectedIndex = i; sync(); close();
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    btn.addEventListener('click', function () { menu.hidden ? open() : close(); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (menu.hidden) open(); else setFocus(focusIndex + (e.key === 'ArrowDown' ? 1 : -1));
      } else if ((e.key === 'Enter' || e.key === ' ') && !menu.hidden) {
        e.preventDefault(); choose(focusIndex);
      } else if (e.key === 'Escape' && !menu.hidden) {
        e.preventDefault(); close();
      }
    });
    btn.addEventListener('blur', close);
    select._cmsRefresh = build;
    select._cmsButton = btn;
    build();
  }
  function enhanceSelects(root) {
    [].forEach.call((root || document).querySelectorAll('select[data-cms-select]'), enhanceSelect);
  }
  /* call after changing a select's options or value from code */
  function syncSelect(select) {
    if (select._cmsEnhanced) select._cmsRefresh();
    else if (select.hasAttribute('data-cms-select')) enhanceSelect(select);
  }
  /* fill a select with [{value,label}] (or plain strings) and keep it enhanced */
  function setOptions(select, items, selectedValue) {
    clear(select);
    items.forEach(function (it) {
      var o = typeof it === 'string' ? { value: it, label: it } : it;
      select.appendChild(el('option', { value: o.value, text: o.label }));
    });
    if (selectedValue !== undefined) select.value = selectedValue;
    syncSelect(select);
  }

  /* ---------- Form errors ---------- */
  function setError(input, message) {
    var field = input.closest('.cms-field');
    if (field) {
      field.classList.add('has-error');
      var msg = field.querySelector('.cms-field-error');
      if (msg) msg.textContent = message;
    }
    var target = input._cmsButton || input.closest('.cms-richtext') || input;
    target.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
  }
  function clearErrors(form) {
    [].forEach.call(form.querySelectorAll('.has-error'), function (f) { f.classList.remove('has-error'); });
    [].forEach.call(form.querySelectorAll('.is-invalid'), function (f) { f.classList.remove('is-invalid'); });
    [].forEach.call(form.querySelectorAll('[aria-invalid]'), function (f) { f.removeAttribute('aria-invalid'); });
  }

  /* ---------- Search highlighting (safe: text nodes + <mark>) ---------- */
  function highlight(text, query) {
    var frag = document.createDocumentFragment();
    text = String(text || '');
    var terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    var lower = text.toLowerCase(), ranges = [];
    terms.forEach(function (t) {
      var from = 0, at;
      while ((at = lower.indexOf(t, from)) !== -1) { ranges.push([at, at + t.length]); from = at + t.length; }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r.slice());
    });
    var pos = 0;
    merged.forEach(function (r) {
      if (r[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
      frag.appendChild(el('mark', { class: 'cms-mark', text: text.slice(r[0], r[1]) }));
      pos = r[1];
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  /* ---------- Images ---------- */
  /* Reads an image file, scales it down and resolves with a JPEG data URL
     (small enough for localStorage). Rejects with an Error whose message is
     safe to show to the user. */
  function readImage(file) {
    return new Promise(function (resolve, reject) {
      var cfg = CMS.config;
      if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) { reject(new Error('Please choose a PNG, JPG, GIF or WEBP image.')); return; }
      if (file.size > cfg.imageMaxFileBytes) { reject(new Error('That image is larger than ' + formatSize(cfg.imageMaxFileBytes) + '.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('The image could not be read.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('The image could not be opened.')); };
        img.onload = function () {
          var scale = Math.min(1, cfg.imageMaxWidth / img.width);
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', cfg.imageQuality));
        };
        img.src = reader.result;           // data: URL (allowed by the site CSP)
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Optional features + campus helpers ---------- */
  /* Removes elements marked data-feature="campus" / "priority" when that
     flag is false in config.js, so the layout falls back to the screenshots. */
  function applyFeatures(root) {
    [].forEach.call((root || document).querySelectorAll('[data-feature]'), function (n) {
      if (!CMS.config.features[n.getAttribute('data-feature')]) n.remove();
    });
  }
  /* Campus names the current (simulated) user may target. */
  function campusChoices() {
    var u = CMS.config.currentUser;
    if (u.role === 'campus_admin' && u.campus) return [u.campus];
    return [CMS.config.allCampuses].concat(CMS.config.campuses);
  }

  return {
    el: el, icon: icon, clear: clear, getParam: getParam, debounce: debounce,
    formatDate: formatDate, formatTime: formatTime, formatSize: formatSize, todayISO: todayISO,
    badge: badge, toast: toast, flash: flash, showFlash: showFlash,
    confirmDialog: confirmDialog, showDetails: showDetails, openModal: openModal, modalShell: modalShell,
    renderFooter: renderFooter, renderEmpty: renderEmpty,
    enhanceSelect: enhanceSelect, enhanceSelects: enhanceSelects, syncSelect: syncSelect, setOptions: setOptions,
    applyFeatures: applyFeatures, campusChoices: campusChoices,
    setError: setError, clearErrors: clearErrors, highlight: highlight, readImage: readImage
  };
})();
