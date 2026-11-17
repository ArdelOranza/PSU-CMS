/* ==========================================================================
   feedback-details.js — Feedback Details screen, chosen by ?id=... in the URL.
   Shows name, status, category, rating, message and date. Actions (as in the
   design): Back and Delete. Opening a record does not change its status.
   If the id belongs to an inquiry (not feedback) it opens Message Details.
   Same dataset as the Feedback list (CMS.messages), so nothing is duplicated.
   PHP: feedback-details.php?id=... and load the row with a prepared statement.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, store = CMS.messages;
  var box = document.getElementById('feedbackDetail');
  var backLink = document.getElementById('feedbackBack');
  var delBtn = document.getElementById('feedbackDelete');
  var id = ui.getParam('id');
  var m = store.get(id);

  /* Back returns to the Feedback list (keeps its page / filter when possible) */
  if (backLink) backLink.addEventListener('click', function (e) {
    if (document.referrer && document.referrer.indexOf('/messages/feedback.html') !== -1 && window.history.length > 1) { e.preventDefault(); window.history.back(); }
  });

  if (m && m.type !== 'feedback') { window.location.replace('message-details.html?id=' + encodeURIComponent(id)); return; }

  if (!m) {
    if (delBtn) delBtn.hidden = true;
    var empty = el('div', { class: 'cms-card' });
    box.appendChild(empty);
    ui.renderEmpty(empty, { title: 'Feedback not found', text: 'It may have been deleted.', actionLabel: 'Back to Feedback', actionHref: 'feedback.html' });
    return;
  }

  function item(label, content) {
    return el('div', {}, [
      el('p', { class: 'feedback-detail-label', text: label }),
      typeof content === 'string' ? el('p', { class: 'feedback-detail-value', text: content }) : content
    ]);
  }

  var rating = m.rating
    ? el('p', { class: 'feedback-detail-value' }, [el('span', { class: 'feedback-stars', 'aria-label': m.rating + ' out of 5', text: store.stars(m.rating) })])
    : '\u2014';

  box.appendChild(el('article', { class: 'cms-card feedback-detail-card' }, [
    el('h2', { class: 'feedback-detail-name', text: m.fullName }),                 // textContent: never HTML
    el('div', { class: 'feedback-detail-badge' }, [store.statusBadge(m, true)]),
    el('div', { class: 'feedback-detail-grid' }, [
      item('Category', m.category || '\u2014'),
      item('Rating', rating),
      item('Message', m.message),
      item('Date', ui.formatDate(m.submittedAt)),
      item('Status', el('div', {}, [store.statusBadge(m, true)]))
    ])
  ]));

  delBtn.addEventListener('click', function () {
    store.confirmDelete()
      .then(function (yes) {
        if (!yes) return;
        if (store.remove(m.id)) { ui.flash('Feedback deleted.', 'success'); window.location.href = 'feedback.html'; }
        else ui.toast('The feedback could not be deleted.', 'error');
      });
  });
})();
