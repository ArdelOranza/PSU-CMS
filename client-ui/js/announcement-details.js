/* ==========================================================================
   announcement-details.js — public Announcement Details page (?id=...).
   An expired, unpublished or unknown announcement shows "not found".
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.announcements;

  function init() {
    var tags = document.getElementById('articleTags');
    var title = document.getElementById('articleTitle');
    var meta = document.getElementById('articleMeta');
    var main = document.getElementById('articleMain');
    var others = document.getElementById('otherList');
    var a = data.get(ui.getParams().get('id'));

    if (!a) {
      title.textContent = 'Announcement not found';
      main.appendChild(el('p', { class: 'detail-body', text: 'This announcement is not available. It may have expired or been removed.' }));
      main.appendChild(el('a', { class: 'psu-btn psu-btn-outline', href: 'announcements.php', text: 'Back to announcements' }));
      return;
    }
    document.title = a.title + ' | Pangasinan State University';
    var urgent = a.priority === 'urgent';
    tags.appendChild(ui.pill(urgent ? 'Urgent' : 'Normal', urgent ? 'accent' : 'tint'));
    tags.appendChild(el('span', { class: 'pill pill-campus', text: ui.campusLabel(a.campus) }));
    title.textContent = a.title;
    meta.appendChild(el('span', { text: ui.formatDate(a.publishedAt) }));
    if (a.expiresAt) meta.appendChild(el('span', { text: 'Expires ' + ui.formatDate(a.expiresAt) }));
    meta.appendChild(el('span', { text: 'Posted by ' + a.author }));

    var body = el('div', { class: 'detail-body' });
    ui.renderRichText(body, a.content || '');
    if (body.textContent.trim() || body.querySelector('img')) main.appendChild(body);
    if (a.attachment) {
      main.appendChild(el('h2', { class: 'detail-section-title', text: 'Attachment' }));
      main.appendChild(ui.attachmentCard(a.attachment, a.publishedAt));
    }

    data.others(a.id, 3).forEach(function (o) {
      others.appendChild(el('li', {}, [el('time', { text: ui.formatDate(o.publishedAt) }), el('a', { href: 'announcement-details.php?id=' + encodeURIComponent(o.id), text: o.title })]));
    });
    if (!others.children.length) others.appendChild(el('li', {}, [el('p', { class: 'attachment-meta', text: 'No other announcements right now.' })]));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
