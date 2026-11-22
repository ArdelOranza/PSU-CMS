/* ==========================================================================
   event-details.js — public Event Details page (?id=...): banner, description and facts.
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.events;

  function when(dateISO, time) {
    var d = ui.formatDate(dateISO), t = ui.formatTime(time);
    return t ? d + ' \u00B7 ' + t : d;
  }

  function init() {
    var tags = document.getElementById('eventTags');
    var title = document.getElementById('eventTitle');
    var main = document.getElementById('eventMain');
    var facts = document.getElementById('eventFacts');
    var e = data.get(ui.getParams().get('id'));

    if (!e) {
      title.textContent = 'Event not found';
      document.getElementById('crumbTitle').textContent = 'Not found';
      document.querySelector('.event-side').hidden = true;
      main.appendChild(el('p', { class: 'detail-body', text: 'This event is not available. It may have been removed or not published yet.' }));
      main.appendChild(el('a', { class: 'psu-btn psu-btn-outline', href: 'events.php', text: 'Back to all events' }));
      return;
    }
    var status = data.status(e);
    document.title = e.title + ' | Pangasinan State University';
    document.getElementById('crumbTitle').textContent = e.title;
    title.textContent = e.title;
    tags.appendChild(ui.pill(data.categoryName(e), 'tint'));
    tags.appendChild(ui.pill(data.statusLabel(status), { upcoming: 'tint', ongoing: 'accent', completed: 'gray' }[status]));

    if (e.banner) main.appendChild(el('img', { class: 'detail-cover', src: e.banner, alt: '' }));
    main.appendChild(el('h2', { class: 'detail-section-title', text: 'About this event' }));
    var body = el('div', { class: 'detail-body' });
    ui.renderParagraphs(body, e.description);
    if (!body.children.length) body.appendChild(el('p', { text: 'More details will be posted soon.' }));
    main.appendChild(body);

    [['Start', when(e.startDate, e.startTime)], ['End', when(e.endDate || e.startDate, e.endTime)], ['Venue', e.venue], ['Campus', ui.campusLabel(data.campus(e))],
     ['Organizer', e.organizer], ['Category', data.categoryName(e)]].forEach(function (row) {
      if (!row[1]) return;
      facts.appendChild(el('dt', { text: row[0] }));
      facts.appendChild(el('dd', { text: row[1] }));
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
