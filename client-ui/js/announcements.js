/* ==========================================================================
   announcements.js — public Announcements list: search, campus filter, paging.
   Only ACTIVE announcements are listed (published, started, not expired).
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.announcements;
  var PER_PAGE = 6;

  function init() {
    var params = ui.getParams();
    var state = { q: params.get('q') || '', campus: params.get('campus') || '', page: parseInt(params.get('page'), 10) || 1 };
    var search = document.getElementById('announcementSearch');
    var campus = document.getElementById('announcementCampus');
    var list = document.getElementById('announcementList');
    var empty = document.getElementById('announcementEmpty');
    var pager = document.getElementById('announcementPagination');

    search.value = state.q;
    ui.fillCampusSelect(campus, state.campus);

    function row(a) {
      var urgent = a.priority === 'urgent';
      var meta = el('p', { class: 'announcement-meta' });
      if (a.expiresAt) meta.appendChild(el('span', {}, [ui.icon('calendar-event'), 'Valid until ' + ui.formatDate(a.expiresAt)]));
      if (a.attachment) meta.appendChild(el('span', {}, [ui.icon('paperclip'), '1 attachment']));
      return el('li', { class: 'announcement-item' }, [
        el('div', { class: 'announcement-top' }, [
          ui.pill(urgent ? 'Urgent' : 'Normal', urgent ? 'accent' : 'tint'),
          el('span', { class: 'announcement-date', text: ui.formatDate(a.publishedAt) + ' \u00B7 ' + (a.campus || '') })
        ]),
        el('h2', { class: 'announcement-title' }, [el('a', { href: 'announcement-details.php?id=' + encodeURIComponent(a.id), text: a.title })]),
        meta
      ]);
    }

    function render() {
      var rows = data.list({ q: state.q, campus: state.campus });
      var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
      state.page = Math.min(Math.max(1, state.page), pages);
      ui.setParams({ q: state.q, campus: state.campus, page: state.page > 1 ? String(state.page) : '' });
      list.replaceChildren();
      if (!rows.length) {
        list.hidden = true;
        ui.renderEmpty(empty, { title: 'No announcements found', text: 'Try a different campus or search.', actionLabel: 'Clear filters', onAction: function () {
          state.q = ''; state.campus = ''; state.page = 1; search.value = ''; campus.value = ''; render();
        } });
        pager.replaceChildren();
        return;
      }
      list.hidden = false; empty.replaceChildren();
      rows.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE).forEach(function (a) { list.appendChild(row(a)); });
      ui.renderPagination(pager, { page: state.page, pages: pages, onChange: function (p) { state.page = p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    }

    search.addEventListener('input', ui.debounce(function () { state.q = search.value.trim(); state.page = 1; render(); }, 200));
    campus.addEventListener('change', function () { state.campus = campus.value; state.page = 1; render(); });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
