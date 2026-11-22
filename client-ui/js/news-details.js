/* ==========================================================================
   news-details.js — public News Details page (?id=...): article, attachment and "Latest News".
   ========================================================================== */
(function () {
  var ui = PSU.ui, el = ui.el, data = PSU.data.news;

  function init() {
    var tags = document.getElementById('articleTags');
    var title = document.getElementById('articleTitle');
    var meta = document.getElementById('articleMeta');
    var main = document.getElementById('articleMain');
    var latest = document.getElementById('latestList');
    var n = data.get(ui.getParams().get('id'));

    if (!n) {                                               // unknown, draft or unpublished article
      title.textContent = 'Article not found';
      main.appendChild(el('p', { class: 'detail-body', text: 'This article is not available. It may have been removed or not published yet.' }));
      main.appendChild(el('a', { class: 'psu-btn psu-btn-outline', href: 'news.php', text: 'Back to all news' }));
      return;
    }
    document.title = n.title + ' | Pangasinan State University';
    tags.appendChild(ui.pill(n.category, 'tint'));
    tags.appendChild(el('span', { class: 'pill pill-campus', text: ui.campusLabel(n.campus) }));
    title.textContent = n.title;
    meta.appendChild(el('span', { text: ui.formatDate(n.publishedAt) }));
    meta.appendChild(el('span', { text: 'Posted by ' + n.author }));

    if (n.image) main.appendChild(el('img', { class: 'detail-cover', src: n.image, alt: '' }));
    var body = el('div', { class: 'detail-body' });
    ui.renderRichText(body, n.content || '');
    if (body.textContent.trim() || body.querySelector('img')) main.appendChild(body);
    if (n.attachment) {
      main.appendChild(el('h2', { class: 'detail-section-title', text: 'Attachment' }));
      main.appendChild(ui.attachmentCard(n.attachment, n.publishedAt));
    }

    data.others(n.id, 3).forEach(function (o) {
      latest.appendChild(el('li', {}, [el('time', { text: ui.formatDate(o.publishedAt) }), el('a', { href: 'news-details.php?id=' + encodeURIComponent(o.id), text: o.title })]));
    });
    if (!latest.children.length) latest.appendChild(el('li', {}, [el('p', { class: 'attachment-meta', text: 'No other news yet.' })]));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
