/* ==========================================================================
   news-details.js — News Article Details page (opened with ?id=...).
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, db = CMS.db.news;

  function put(id, value) { document.getElementById(id).textContent = value; }
  function statusLabel(value) {
    for (var i = 0; i < cfg.newsStatuses.length; i++) if (cfg.newsStatuses[i].value === value) return cfg.newsStatuses[i].label;
    return value;
  }

  function init() {
    var n = db.get(ui.getParam('id'));
    if (!n) { ui.flash('That news article was not found.', 'error'); window.location.href = 'all-news.html'; return; }
    document.title = n.title + ' | PSU CMS';

    var thumb = document.getElementById('detailThumb');
    if (n.image) thumb.appendChild(el('img', { src: n.image, alt: '' }));
    else thumb.textContent = 'Image Placeholder';

    put('detailTitle', n.title);
    document.getElementById('detailHeadBadge').appendChild(ui.badge(n.status, statusLabel(n.status)));
    put('detailCategory', n.category); put('detailAuthor', n.author);
    put('detailDate', n.publishedAt ? ui.formatDate(n.publishedAt) : '\u2014');
    if (cfg.features.campus) put('detailCampus', n.campus || '');
    document.getElementById('detailStatus').appendChild(ui.badge(n.status, statusLabel(n.status)));

    /* extras: the summary and the article text, only when there is something to show */
    if (n.shortDescription) { put('detailSummary', n.shortDescription); document.getElementById('detailSummaryField').hidden = false; }
    var content = document.getElementById('detailContent');
    CMS.sanitize.render(content, n.content);
    if (content.textContent.trim() || content.querySelector('img')) document.getElementById('detailContentField').hidden = false;

    ui.bindDetailActions({
      editHref: 'add-news.html?id=' + encodeURIComponent(n.id),
      remove: function () { return db.remove(n.id); }, listHref: 'all-news.html'
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
