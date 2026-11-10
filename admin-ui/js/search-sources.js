/* ==========================================================================
   search-sources.js — what Global Search can look through.
   Each source describes one content type. To connect a new type (or to
   replace the sample Documents / Faculty data when your teammates finish
   their modules), add or edit an entry in CMS.searchSources. A source has:
     id        – short key, also used by the filter chips and ?type=
     chip      – label shown on the filter chip
     label     – type name shown on each result ("News · Oct 28, 2026")
     collect(ctx) – returns the searchable items for this type. ctx.campus is
                    the optional campus context (null = no campus filtering).
   An item is: { title, date, summary, extra: [more searchable text],
                 meta (shown instead of the date when there is no date),
                 details() -> options for CMS.ui.showDetails }
   Only PUBLIC content is returned: published news, active announcements,
   published events.
   PHP: replace each collect() with a database query.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.searchSources = (function () {
  var cfg = CMS.config, ui = CMS.ui, db = CMS.db, rules = CMS.announcementRules, evRules = CMS.eventRules;

  function plain(html) { return CMS.sanitize.text(html); }
  function campusOk(record, campus) {
    return !campus || record.campus === cfg.allCampuses || record.campus === campus;
  }
  function fileLink(att) {
    if (!att) return '';
    var text = att.name + (att.size ? ' (' + ui.formatSize(att.size) + ')' : '');
    return att.data ? ui.el('a', { href: att.data, download: att.name, text: text }) : text;
  }

  return [
    {
      id: 'news', chip: 'News', label: 'News',
      collect: function (ctx) {
        return db.news.list().filter(function (n) { return n.status === 'published' && campusOk(n, ctx.campus); }).map(function (n) {
          var rows = [['Title', n.title], ['Category', n.category], ['Author', n.author]];
          if (cfg.features.campus) rows.push(['Campus', n.campus]);
          rows.push(['Date published', ui.formatDate(n.publishedAt)], ['Summary', n.shortDescription]);
          return { title: n.title, date: n.publishedAt, summary: n.shortDescription || plain(n.content),
                   extra: [n.category, n.author, plain(n.content)],
                   details: function () { return { title: 'News article', cover: n.image, rows: rows, contentHtml: n.content }; } };
        });
      }
    },
    {
      id: 'announcements', chip: 'Announcements', label: 'Announcements',
      collect: function (ctx) {
        return db.announcements.list().filter(function (a) { return rules.isActive(a) && rules.visibleForCampus(a, ctx.campus); }).map(function (a) {
          var rows = [['Title', a.title], ['Category', a.category], ['Author', a.author]];
          if (cfg.features.campus) rows.push(['Campus', a.campus]);
          if (cfg.features.priority) rows.push(['Priority', a.priority === 'urgent' ? 'Urgent' : 'Normal']);
          rows.push(['Date posted', ui.formatDate(a.publishedAt)], ['Expiration', a.expiresAt ? ui.formatDate(a.expiresAt) : 'No expiration'], ['Attachment', fileLink(a.attachment)]);
          return { title: a.title, date: a.publishedAt, summary: plain(a.content), extra: [a.category, a.author],
                   details: function () { return { title: 'Announcement', rows: rows, contentHtml: a.content }; } };
        });
      }
    },
    {
      id: 'events', chip: 'Events', label: 'Events',
      collect: function () {
        return db.events.list().filter(function (e) { return e.state === 'published'; }).map(function (e) {
          var cat = evRules.categoryName(e.categoryId), status = evRules.effectiveStatus(e);
          var range = ui.formatDate(e.startDate) + (e.endDate && e.endDate !== e.startDate ? ' \u2013 ' + ui.formatDate(e.endDate) : '');
          return { title: e.title, date: e.startDate, summary: e.description, extra: [e.venue, e.organizer, cat],
                   details: function () {
                     return { title: 'Event', cover: e.banner, rows: [['Title', e.title], ['Category', cat], ['Date', range], ['Time', evRules.timeText(e)],
                       ['Venue', e.venue], ['Organizer', e.organizer], ['Status', evRules.statusLabel(status)], ['Description', e.description]] };
                   } };
        });
      }
    },
    {
      /* Sample data until the Faculty & Staff Directory module is integrated */
      id: 'faculty', chip: 'Faculty & Staff', label: 'Faculty & Staff',
      collect: function () {
        return db.faculty.list().map(function (p) {
          return { title: p.name, date: '', meta: p.department, summary: p.summary, extra: [p.position, p.department],
                   details: function () { return { title: 'Faculty & staff', rows: [['Name', p.name], ['Position', p.position], ['Department', p.department], ['Email', p.email], ['Profile', p.summary]] }; } };
        });
      }
    },
    {
      /* Sample data until the Document Library module is integrated */
      id: 'documents', chip: 'Documents', label: 'Documents',
      collect: function () {
        return db.documents.list().map(function (d) {
          return { title: d.title, date: d.date, summary: d.summary, extra: [d.fileType],
                   details: function () { return { title: 'Document', rows: [['File name', d.title], ['File type', d.fileType], ['Date added', ui.formatDate(d.date)], ['Summary', d.summary]] }; } };
        });
      }
    }
  ];
})();
