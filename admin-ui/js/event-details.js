/* ==========================================================================
   event-details.js — Event Details page (opened with ?id=...).
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, db = CMS.db.events, rules = CMS.eventRules;

  function put(id, value) { document.getElementById(id).textContent = value; }

  function init() {
    var ev = db.get(ui.getParam('id'));
    if (!ev) { ui.flash('That event was not found.', 'error'); window.location.href = 'all-events.html'; return; }
    var status = rules.effectiveStatus(ev), label = rules.statusLabel(status);
    document.title = ev.title + ' | PSU CMS';

    if (ev.banner) {                       // the design has no picture; show the banner only when there is one
      var thumb = document.getElementById('detailThumb');
      thumb.appendChild(el('img', { src: ev.banner, alt: '' }));
      thumb.hidden = false;
    }
    put('detailTitle', ev.title);
    document.getElementById('detailHeadBadge').appendChild(ui.badge(status, label));
    put('detailDate', ui.formatDate(ev.startDate) + (ev.endDate && ev.endDate !== ev.startDate ? ' \u2013 ' + ui.formatDate(ev.endDate) : ''));
    put('detailTime', rules.timeText(ev) || '\u2014');
    put('detailVenue', ev.venue || '\u2014'); put('detailOrganizer', ev.organizer || '\u2014');
    document.getElementById('detailStatus').appendChild(ui.badge(status, label));
    put('detailCategory', rules.categoryName(ev.categoryId));
    if (ev.description) { put('detailDescription', ev.description); document.getElementById('detailDescriptionField').hidden = false; }

    ui.bindDetailActions({
      editHref: 'add-event.html?id=' + encodeURIComponent(ev.id),
      remove: function () { return db.remove(ev.id); }, listHref: 'all-events.html'
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
