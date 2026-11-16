/* ==========================================================================
   search.js — Global Search page. Reads ?q= (and optional ?type= and
   ?campus=). With no keyword it lists ALL public content, newest first; the
   chips narrow it by type and a keyword narrows it further. A keyword that
   matches nothing shows the "no results" state.
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
    /* No keywords: every item of the chosen type is listed (newest first). */
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
      var da = String(a.item.date || ''), db = String(b.item.date || '');
      if (!da !== !db) return da ? -1 : 1;                       // items without a date (faculty) go last
      return b.score - a.score || db.localeCompare(da) || String(a.item.title).localeCompare(String(b.item.title));
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
      var href = r.item.href;
      var open = function () { ui.showDetails(r.item.details()); };
      var titleEl, btn;
      if (href) {                                   // news, announcements, events: open the details page
        titleEl = el('a', { class: 'search-result-title', href: href }, [ui.highlight(r.item.title, state.q)]);
        btn = el('a', { class: 'cms-action', href: href, 'aria-label': 'View details for ' + r.item.title, text: 'View Details' });
      } else {                                      // documents, faculty: popup
        titleEl = el('button', { type: 'button', class: 'search-result-title' }, [ui.highlight(r.item.title, state.q)]);
        titleEl.addEventListener('click', open);
        btn = el('button', { type: 'button', class: 'cms-action', 'aria-label': 'View details for ' + r.item.title, text: 'View Details' });
        btn.addEventListener('click', open);
      }
      var info = el('div', { class: 'search-result-info' }, [titleEl, el('div', { class: 'search-result-meta', text: meta.replace(/ \u00B7 $/, '') })]);
      var snip = snippet(r.item, state.q);
      if (snip) info.appendChild(el('div', { class: 'search-result-snippet' }, [ui.highlight(snip, state.q)]));
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

    /* nothing of this type yet (no keyword typed) */
    function renderNothingYet() {
      var label = state.type ? sources.filter(function (x) { return x.id === state.type; })[0].chip : 'content';
      resultsBox.appendChild(el('div', { class: 'cms-empty search-empty' }, [
        el('img', { src: '../assets/images/empty-state.png', alt: '' }),
        el('p', { class: 'cms-empty-title', text: 'No ' + label.toLowerCase() + ' to show yet' }),
        el('p', { class: 'cms-empty-text', text: 'Items you add will appear here.' })
      ]));
    }

    function render() {
      renderChips();
      ui.clear(resultsBox);
      resultsBox.hidden = false;
      var found = run(state.q, state.type, { campus: state.campus });
      var noun = state.q ? 'result' : 'item';
      status.textContent = found.length + (found.length === 1 ? ' ' + noun : ' ' + noun + 's') + (state.q ? ' found' : ' shown');
      crumb.textContent = state.q && !found.length ? 'Global Search \u2013 No Results' : 'Global Search';
      if (state.campus) {
        var note = el('p', { class: 'search-campus-note' }, [state.campus + ' campus and university-wide content only. ']);
        var clearCampus = el('a', { href: '#', text: 'Show all campuses' });
        clearCampus.addEventListener('click', function (e) { e.preventDefault(); state.campus = ''; syncUrl(); render(); });
        note.appendChild(clearCampus);
        resultsBox.appendChild(note);
      }
      if (!found.length) { if (state.q) renderNoResults(); else renderNothingYet(); return; }
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
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') === 'search') init();
  });
})();
