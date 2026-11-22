/* ==========================================================================
   main.js — small helpers shared by the public News, Announcements and Events pages
   (PSU.ui). Builds everything with text nodes, never innerHTML, so saved content
   cannot inject markup. Needs the admin-ui data scripts (CMS.*) to be loaded first.
   ========================================================================== */
window.PSU = window.PSU || {};

PSU.ui = (function () {
  var cms = CMS.ui, el = cms.el;

  /* Long campus names used on details pages ("Urdaneta City Campus") */
  var CAMPUS_LABELS = {
    'Lingayen-Main': 'Lingayen Main Campus', 'Alaminos': 'Alaminos City Campus', 'San Carlos': 'San Carlos City Campus',
    'Urdaneta': 'Urdaneta City Campus', 'School of Advanced Studies': 'School of Advanced Studies', 'Open University Systems': 'Open University Systems'
  };
  function campusLabel(name) {
    if (!name) return '';
    if (name === CMS.config.allCampuses) return CMS.config.allCampuses;
    return CAMPUS_LABELS[name] || name + ' Campus';
  }

  /* ---------- address parameters (so filtered pages can be shared) ---------- */
  function getParams() { return new URLSearchParams(window.location.search); }
  function setParams(values) {
    var p = new URLSearchParams();
    Object.keys(values).forEach(function (k) { if (values[k]) p.set(k, values[k]); });
    var qs = p.toString();
    try { window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
  }

  /* ---------- small builders ---------- */
  function icon(name) { return el('i', { class: 'bi bi-' + name, 'aria-hidden': 'true' }); }
  function pill(text, kind) { return el('span', { class: 'pill pill-' + (kind || 'tint'), text: text }); }
  function excerpt(text, max) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '\u2026' : text;
  }
  function placeholderMedia() {
    return el('div', { class: 'media-placeholder', 'aria-hidden': 'true' }, [icon('image')]);
  }

  /* filter dropdown: the native <select>, with our own arrow */
  function fillCampusSelect(select, value) {
    cms.clear(select);
    [CMS.config.allCampuses].concat(CMS.config.campuses).forEach(function (name) {
      select.appendChild(el('option', { value: name === CMS.config.allCampuses ? '' : name, text: name }));
    });
    select.value = value || '';
  }

  /* category chips: items = [{ value, label }] */
  function renderChips(box, items, active, onSelect) {
    cms.clear(box);
    items.forEach(function (it) {
      var on = String(it.value) === String(active || '');
      var b = el('button', { type: 'button', class: 'chip' + (on ? ' is-active' : ''), 'aria-pressed': on ? 'true' : 'false', text: it.label });
      b.addEventListener('click', function () { onSelect(it.value); });
      box.appendChild(b);
    });
  }

  /* pagination: ‹ 1 2 3 › */
  function renderPagination(box, opts) {
    cms.clear(box);
    if (opts.pages < 2) return;
    var nav = el('nav', { class: 'pagination', 'aria-label': 'Pagination' });
    function btn(label, target, extra) {
      var b = el('button', { type: 'button', text: label, class: extra && extra.active ? 'is-active' : null,
                             'aria-label': extra && extra.aria, 'aria-current': extra && extra.active ? 'page' : null });
      if (extra && extra.icon) { b.textContent = ''; b.appendChild(icon(extra.icon)); }
      if (extra && extra.disabled) b.disabled = true; else b.addEventListener('click', function () { opts.onChange(target); });
      return b;
    }
    nav.appendChild(btn('', opts.page - 1, { icon: 'chevron-left', disabled: opts.page === 1, aria: 'Previous page' }));
    var pages = [];
    for (var i = 1; i <= opts.pages; i++) pages.push(i);
    if (pages.length > 7) pages = pages.filter(function (n) { return n === 1 || n === opts.pages || Math.abs(n - opts.page) <= 1; });
    var last = 0;
    pages.forEach(function (n) {
      if (n - last > 1) nav.appendChild(el('span', { text: '\u2026', 'aria-hidden': 'true' }));
      nav.appendChild(btn(String(n), n, { active: n === opts.page, aria: 'Page ' + n }));
      last = n;
    });
    nav.appendChild(btn('', opts.page + 1, { icon: 'chevron-right', disabled: opts.page === opts.pages, aria: 'Next page' }));
    box.appendChild(nav);
  }

  /* empty state: opts = { title, text, actionLabel, onAction } */
  function renderEmpty(box, opts) {
    cms.clear(box);
    var node = el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, [icon('search')]),
      el('h2', { class: 'empty-state-title', text: opts.title }),
      opts.text ? el('p', { class: 'empty-state-text', text: opts.text }) : null
    ]);
    if (opts.actionLabel) {
      var b = el('button', { type: 'button', class: 'psu-btn psu-btn-outline', text: opts.actionLabel });
      b.addEventListener('click', opts.onAction);
      node.appendChild(b);
    }
    box.appendChild(node);
  }

  /* short message at the top right */
  function toast(message) {
    var t = el('div', { class: 'psu-toast', role: 'status', text: message });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  /* attachment card (news and announcement details). att = { name, size, type, data? } */
  function attachmentCard(att, dateISO) {
    var ext = (att.name.split('.').pop() || att.type || 'file').toUpperCase().slice(0, 4);
    var meta = [ext, cms.formatSize(att.size), cms.formatDate(dateISO)].filter(Boolean).join(' \u00B7 ');
    var btn = el('button', { type: 'button', class: 'psu-btn psu-btn-outline', text: 'Download' });
    btn.addEventListener('click', function () {
      if (!att.data) { toast('This sample file is not stored in the prototype.'); return; }
      var link = el('a', { href: att.data, download: att.name });
      document.body.appendChild(link); link.click(); link.remove();
      toast('Download started.');
    });
    return el('div', { class: 'attachment-card' }, [
      el('span', { class: 'attachment-icon', text: ext }),
      el('div', { class: 'attachment-info' }, [el('p', { class: 'attachment-name', text: att.name }), el('p', { class: 'attachment-meta', text: meta })]),
      btn
    ]);
  }

  /* article text from the CMS: cleaned first, then placed without innerHTML */
  function renderRichText(box, html) { CMS.sanitize.render(box, html); }
  /* plain paragraphs (events have a plain-text description) */
  function renderParagraphs(box, text) {
    cms.clear(box);
    String(text || '').split(/\n{2,}|\r\n\r\n/).forEach(function (part) {
      if (part.trim()) box.appendChild(el('p', { text: part.trim() }));
    });
  }

  return {
    el: el, icon: icon, pill: pill, excerpt: excerpt, placeholderMedia: placeholderMedia, campusLabel: campusLabel,
    getParams: getParams, setParams: setParams, fillCampusSelect: fillCampusSelect, renderChips: renderChips,
    renderPagination: renderPagination, renderEmpty: renderEmpty, toast: toast, attachmentCard: attachmentCard,
    renderRichText: renderRichText, renderParagraphs: renderParagraphs,
    formatDate: cms.formatDate, formatTime: cms.formatTime, debounce: cms.debounce
  };
})();
