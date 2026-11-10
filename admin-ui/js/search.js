/* ==========================================================================
   search.js — Global Search page. Reads ?q= (and optional ?type= and
   ?campus=), searches every source in CMS.searchSources, and shows the
   results or the "no results" state.
   Safety: the query is plain text. Results and highlights are built with
   text nodes and <mark> elements, never with innerHTML.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el;
  var sources = CMS.searchSources;

  /* ---------- engine ---------- */
  function terms(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }

  function run(q, type, ctx) {
    var t = terms(q), found = [];
    if (!t.length) return found;
    sources.forEach(function (src) {
      if (type && type !== src.id) return;
      src.collect(ctx).forEach(function (item) {
        var title = String(item.title || '').toLowerCase();
        var hay = [title, String(item.summary || '').toLowerCase()].concat((item.extra || []).map(function (x) { return String(x || '').toLowerCase(); })).join(' ');
        if (!t.every(function (w) { return hay.indexOf(w) !== -1; })) return;
        var score = 0;
        t.forEach(function (w) { score += title.indexOf(w) !== -1 ? 3 : 1; });
        found.push({ source: src, item: item, score: score });
      });
    });
    found.sort(function (a, b) {
      return b.score - a.score || String(b.item.date || '').localeCompare(String(a.item.date || '')) || String(a.item.title).localeCompare(String(b.item.title));
    });
    return found;
  }

  /* a short piece of the summary around the first match (only when the title itself does not match) */
  function snippet(item, q) {
    var t = terms(q), title = String(item.title || '').toLowerCase();
    if (t.every(function (w) { return title.indexOf(w) !== -1; })) return '';
    var text = String(item.summary || '').replace(/\s+/g, ' ').trim(), lower = text.toLowerCase(), at = -1;
    t.forEach(function (w) { var i = lower.indexOf(w); if (i !== -1 && (at === -1 || i < at)) at = i; });
    if (at === -1) return '';
    var from = Math.max(0, at - 50), to = Math.min(text.length, at + 100);
    return (from > 0 ? '\u2026' : '') + text.slice(from, to).trim() + (to < text.length ? '\u2026' : '');
  }

  /* ---------- page ---------- */
  function init() {
    var state = { q: (ui.getParam('q') || '').trim(), type: ui.getParam('type') || '', campus: ui.getParam('campus') || '' };
    if (!sources.some(function (s) { return s.id === state.type; })) state.type = '';

    var form = document.getElementById('searchForm');
    var input = document.getElementById('searchInput');
    var headerInput = document.getElementById('cmsGlobalSearch');
    var chipBox = document.getElementById('searchChips');
    var resultsBox = document.getElementById('searchResults');
    var crumb = document.getElementById('searchCrumb');
    var status = document.getElementById('searchStatus');

    function syncUrl() {
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.type) p.set('type', state.type);
      if (state.campus) p.set('campus', state.campus);
      var qs = p.toString();
      try { window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// in some browsers */ }
    }

    function renderChips() {
      ui.clear(chipBox);
      [{ id: '', chip: 'All Content' }].concat(sources).forEach(function (s) {
        var on = state.type === s.id;
        var b = el('button', { type: 'button', class: 'search-chip' + (on ? ' is-active' : ''), 'aria-pressed': on ? 'true' : 'false', text: s.chip });
        b.addEventListener('click', function () { state.type = s.id; syncUrl(); render(); });
        chipBox.appendChild(b);
      });
    }

    function resultRow(r) {
      var meta = r.source.label + ' \u00B7 ' + (r.item.date ? ui.formatDate(r.item.date) : (r.item.meta || ''));
      var titleBtn = el('button', { type: 'button', class: 'search-result-title' }, [ui.highlight(r.item.title, state.q)]);
      var open = function () { ui.showDetails(r.item.details()); };
      titleBtn.addEventListener('click', open);
      var info = el('div', { class: 'search-result-info' }, [titleBtn, el('div', { class: 'search-result-meta', text: meta.replace(/ \u00B7 $/, '') })]);
      var snip = snippet(r.item, state.q);
      if (snip) info.appendChild(el('div', { class: 'search-result-snippet' }, [ui.highlight(snip, state.q)]));
      var btn = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View details for ' + r.item.title, text: 'View Details' });
      btn.addEventListener('click', open);
      return el('li', { class: 'search-result' }, [info, btn]);
    }

    function renderNoResults() {
      var links = [['News', '../news/all-news.html'], ['Announcements', '../announcements/all-announcements.html'], ['Events', '../events/all-events.html'],
                   ['Documents', null], ['Faculty & Staff', null]];
      var clear = el('button', { type: 'button', class: 'cms-btn cms-btn-soft', text: 'Clear search' });
      clear.addEventListener('click', function () { state.q = ''; input.value = ''; if (headerInput) headerInput.value = ''; syncUrl(); render(); input.focus(); });
      var tips = el('ul', { class: 'search-tips' }, [
        el('li', { text: 'Check the spelling of your keywords.' }),
        el('li', { text: 'Try different or more general keywords.' }),
        state.type ? el('li', { text: 'Switch the filter to All Content.' }) : null
      ]);
      var quick = el('div', { class: 'search-quick' }, [el('span', { class: 'search-quick-label', text: 'Browse instead:' })].concat(links.map(function (l) {
        return l[1] ? el('a', { class: 'search-chip', href: l[1], text: l[0] }) : el('a', { class: 'search-chip', href: '#', 'data-pending': l[0], text: l[0] });
      })));
      resultsBox.appendChild(el('div', { class: 'cms-empty search-empty' }, [
        el('img', { src: '../assets/images/empty-state.png', alt: '' }),
        el('p', { class: 'cms-empty-title', text: 'No results found for \u201C' + state.q + '\u201D' }),
        el('p', { class: 'cms-empty-text', text: 'Items you add will appear here.' }),
        tips, quick, clear
      ]));
    }

    function render() {
      renderChips();
      ui.clear(resultsBox);
      status.textContent = '';
      if (!state.q) { resultsBox.hidden = true; crumb.textContent = 'Global Search'; return; }
      resultsBox.hidden = false;
      var found = run(state.q, state.type, { campus: state.campus });
      status.textContent = found.length + (found.length === 1 ? ' result' : ' results') + ' found';
      crumb.textContent = found.length ? 'Global Search' : 'Global Search \u2013 No Results';
      if (state.campus) {
        var note = el('p', { class: 'search-campus-note' }, [state.campus + ' campus and university-wide content only. ']);
        var clearCampus = el('a', { href: '#', text: 'Show all campuses' });
        clearCampus.addEventListener('click', function (e) { e.preventDefault(); state.campus = ''; syncUrl(); render(); });
        note.appendChild(clearCampus);
        resultsBox.appendChild(note);
      }
      if (!found.length) { renderNoResults(); return; }
      var list = el('ul', { class: 'search-result-list' });
      found.forEach(function (r) { list.appendChild(resultRow(r)); });
      resultsBox.appendChild(list);
    }

    /* the query stays in both search boxes */
    input.value = state.q;
    if (headerInput) headerInput.value = state.q;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = input.value.trim();
      if (headerInput) headerInput.value = state.q;
      syncUrl(); render();
      if (!state.q) input.focus();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') === 'search') init();
  });
})();
