/* ==========================================================================
   news.js — public News list: search, campus and category filters, paging.
   Filters are kept in the address (?q=&campus=&category=&page=) so a filtered
   list can be shared. Data comes from PSU.data.news (published news only).
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.news;
  var PER_PAGE = 6;

  function init() {
    var params = ui.getParams();
    var state = { q: params.get('q') || '', campus: params.get('campus') || '', category: params.get('category') || '', page: parseInt(params.get('page'), 10) || 1 };
    var search = document.getElementById('newsSearch');
    var campus = document.getElementById('newsCampus');
    var chips = document.getElementById('newsChips');
    var grid = document.getElementById('newsGrid');
    var empty = document.getElementById('newsEmpty');
    var pager = document.getElementById('newsPagination');

    search.value = state.q;
    ui.fillCampusSelect(campus, state.campus);

    function card(n) {
      var meta = ui.formatDate(n.publishedAt) + ' \u00B7 ' + (n.campus || '');
      var media = el('div', { class: 'news-card-media' }, [n.image ? el('img', { src: n.image, alt: '', loading: 'lazy' }) : ui.placeholderMedia()]);
      var title = el('h2', { class: 'news-card-title' }, [el('a', { href: 'news-details.php?id=' + encodeURIComponent(n.id), text: n.title })]);
      var more = el('span', { class: 'link-more' }, ['Read more', ui.icon('arrow-right')]);
      return el('article', { class: 'news-card' }, [
        media,
        el('div', { class: 'news-card-body' }, [
          ui.pill(n.category, 'tint'), el('p', { class: 'news-card-meta', text: meta }), title,
          el('p', { class: 'news-card-excerpt', text: ui.excerpt(n.shortDescription || CMS.sanitize.text(n.content), 120) }), more
        ])
      ]);
    }

    function render() {
      var cats = [{ value: '', label: 'All' }].concat(data.categories().map(function (c) { return { value: c, label: c }; }));
      ui.renderChips(chips, cats, state.category, function (value) { state.category = value; state.page = 1; render(); });
      var rows = data.list({ q: state.q, campus: state.campus, category: state.category });
      var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
      state.page = Math.min(Math.max(1, state.page), pages);
      ui.setParams({ q: state.q, campus: state.campus, category: state.category, page: state.page > 1 ? String(state.page) : '' });
      grid.replaceChildren();
      if (!rows.length) {
        grid.hidden = true;
        ui.renderEmpty(empty, { title: 'No news found', text: 'Try a different campus or category.', actionLabel: 'Clear filters', onAction: function () {
          state.q = ''; state.campus = ''; state.category = ''; state.page = 1; search.value = ''; campus.value = ''; render();
        } });
        pager.replaceChildren();
        return;
      }
      grid.hidden = false; empty.replaceChildren();
      rows.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE).forEach(function (n) { grid.appendChild(card(n)); });
      ui.renderPagination(pager, { page: state.page, pages: pages, onChange: function (p) { state.page = p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    }

    search.addEventListener('input', ui.debounce(function () { state.q = search.value.trim(); state.page = 1; render(); }, 200));
    campus.addEventListener('change', function () { state.campus = campus.value; state.page = 1; render(); });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
