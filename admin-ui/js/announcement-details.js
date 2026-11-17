/* ==========================================================================
   announcement-details.js — Announcement Details page (opened with ?id=...).
   Shows the full announcement, its attachment and an information card.
   PHP: load the announcement row by id and print these values.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.announcements, rules = CMS.announcementRules;
  var VISIBILITY = 'Public \u2013 Homepage';     // every announcement goes to the public homepage for now

  function put(id, value) { document.getElementById(id).textContent = value; }

  function init() {
    var a = db.get(ui.getParam('id'));
    if (!a) { ui.flash('That announcement was not found.', 'error'); window.location.href = 'all-announcements.html'; return; }
    var status = rules.effectiveStatus(a);

    /* badges: category (blue) + status (+ Urgent when priority is on) */
    var badges = document.getElementById('detailBadges');
    badges.appendChild(el('span', { class: 'cms-status cms-status-blue', text: a.category }));
    badges.appendChild(ui.badge(status, rules.statusLabel(status)));
    if (cfg.features.priority && a.priority === 'urgent') badges.appendChild(ui.badge('urgent', 'Urgent'));

    put('detailTitle', a.title);
    put('detailByline', 'Posted by ' + a.author + ' \u00B7 ' + ui.formatDate(a.publishedAt));
    document.title = a.title + ' | PSU CMS';

    var body = document.getElementById('detailBody');
    CMS.sanitize.render(body, a.content);
    if (!body.textContent.trim() && !body.querySelector('img')) body.appendChild(el('p', { text: 'No description was provided.' }));

    /* attachment */
    var att = a.attachment;
    if (att) {
      var ext = (att.name.split('.').pop() || att.type || 'FILE').toUpperCase().slice(0, 4);
      put('detailFileType', ext); put('detailFileName', att.name); put('detailFileSize', ui.formatSize(att.size));
      document.getElementById('detailAttachment').hidden = false;
      document.getElementById('detailDownload').addEventListener('click', function () {
        if (!att.data) { ui.toast('This sample attachment has no file stored in the prototype.', 'info'); return; }
        var link = el('a', { href: att.data, download: att.name });
        document.body.appendChild(link); link.click(); link.remove();
        ui.toast(ui.MSG.download, 'success');
      });
    }

    /* information card */
    var infoStatus = document.getElementById('infoStatus');
    infoStatus.appendChild(ui.badge(status, rules.statusLabel(status)));
    put('infoCategory', a.category); put('infoAuthor', a.author);
    put('infoPosted', ui.formatDate(a.publishedAt));
    put('infoExpires', a.expiresAt ? ui.formatDate(a.expiresAt) : 'No expiration');
    if (cfg.features.campus) put('infoCampus', a.campus || '');
    if (cfg.features.priority) put('infoPriority', a.priority === 'urgent' ? 'Urgent' : 'Normal');
    put('infoVisibility', a.visibility || VISIBILITY);
    put('infoUpdated', ui.formatDate(ui.dateOfTimestamp(a.updatedAt || a.createdAt)));

    ui.bindDetailActions({
      editHref: 'add-announcement.html?id=' + encodeURIComponent(a.id),
      remove: function () { return db.remove(a.id); }, listHref: 'all-announcements.html'
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
