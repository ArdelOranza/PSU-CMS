/* ==========================================================================
   message-details.js — one message, chosen by ?id=... in the URL.
   Buttons (as in the design): Mark as Read, Reply via Email, Delete.
   "Reply via Email" opens a SIMULATED reply form: the reply is saved with the
   message and the status becomes Responded. No email is sent.
   Opening a message does not change its status (the design shows an Unread
   badge with a Mark as Read button on this screen).
   PHP: message-details.php?id=... then load the row with a prepared statement.
   ========================================================================== */
(function () {
  var cfg = CMS.config, ui = CMS.ui, el = ui.el, store = CMS.messages;
  var box = document.getElementById('messageDetail');
  var backLink = document.getElementById('messageBack');
  var id = ui.getParam('id');

  /* Back returns to the listing the visitor came from, else All Messages */
  if (backLink) backLink.addEventListener('click', function (e) {
    if (document.referrer && document.referrer.indexOf('/messages/') !== -1 && window.history.length > 1) { e.preventDefault(); window.history.back(); }
  });

  function metaLine(label, value) {
    return el('span', { class: 'message-meta-item' }, [el('span', { class: 'message-meta-label', text: label + ': ' }), value]);
  }

  function render() {
    var m = store.get(id);
    ui.clear(box);
    if (!m) {
      var empty = el('div', { class: 'cms-card' });
      box.appendChild(empty);
      ui.renderEmpty(empty, { title: 'Message not found', text: 'It may have been deleted.', actionLabel: 'Back to All Messages', actionHref: 'all-messages.html' });
      return;
    }
    var crumb = document.getElementById('messageCrumb');
    if (crumb) crumb.textContent = 'Message Details';

    /* header: avatar, name, email + received, status */
    var head = el('div', { class: 'message-detail-head' }, [
      el('span', { class: 'message-avatar', 'aria-hidden': 'true', text: store.initials(m.fullName) }),
      el('div', { class: 'message-detail-who' }, [
        el('div', { class: 'message-detail-name', text: m.fullName }),
        el('div', { class: 'message-detail-meta', text: m.email + ' \u00B7 Received ' + store.formatDateTime(m.submittedAt) })
      ]),
      store.statusBadge(m, false)
    ]);

    var details = [];
    if (cfg.features.campus && m.campusDepartment) details.push(metaLine('Campus/Department', m.campusDepartment));
    if (m.type === 'feedback') {
      if (m.category) details.push(metaLine('Category', m.category));
      if (m.rating) details.push(metaLine('Rating', el('span', { class: 'feedback-stars', 'aria-label': m.rating + ' out of 5', text: store.stars(m.rating) })));
    }

    /* actions */
    var readBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline message-btn' });
    if (m.status === 'unread') { readBtn.textContent = 'Mark as Read'; readBtn.addEventListener('click', function () { changeStatus('read', 'Message marked as read.'); }); }
    else if (m.status === 'read') { readBtn.textContent = 'Mark as Unread'; readBtn.addEventListener('click', function () { changeStatus('unread', 'Message marked as unread.'); }); }
    else { readBtn.textContent = 'Mark as Read'; readBtn.disabled = true; }       // responded stays responded
    var replyBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-primary message-btn', text: 'Reply via Email' });
    var delBtn = el('button', { type: 'button', class: 'cms-btn cms-btn-outline message-btn message-btn-danger', text: 'Delete' });
    replyBtn.addEventListener('click', function () { openReply(m); });
    delBtn.addEventListener('click', function () { removeMessage(m); });

    var card = el('article', { class: 'cms-card message-detail-card' }, [
      head,
      el('h2', { class: 'message-detail-subject', text: m.subject }),
      details.length ? el('p', { class: 'message-detail-extra' }, details) : null,
      el('p', { class: 'message-detail-body', text: m.message }),                 // textContent: never HTML
      m.reply ? el('div', { class: 'message-reply' }, [
        el('div', { class: 'message-reply-title', text: 'Your reply \u00B7 ' + store.formatDateTime(m.reply.sentAt) + ' (simulated)' }),
        el('div', { class: 'message-reply-subject', text: m.reply.subject }),
        el('p', { class: 'message-detail-body', text: m.reply.body })
      ]) : null,
      el('div', { class: 'message-detail-actions' }, [readBtn, replyBtn, delBtn])
    ]);
    box.appendChild(card);
  }

  function changeStatus(status, okMessage) {
    if (store.setStatus(id, status)) { ui.toast(okMessage, 'success'); render(); }
    else ui.toast('The status could not be updated.', 'error');
  }

  function removeMessage(m) {
    store.confirmDelete()
      .then(function (yes) {
        if (!yes) return;
        if (store.remove(m.id)) { ui.flash('Message deleted.', 'success'); window.location.href = 'all-messages.html'; }
        else ui.toast('The message could not be deleted.', 'error');
      });
  }

  /* Simulated reply form (modal). */
  function openReply(m) {
    var subj = el('input', { class: 'cms-input', id: 'replySubject', type: 'text', maxlength: '220', value: 'Re: ' + m.subject });
    var text = el('textarea', { class: 'cms-textarea', id: 'replyBody', rows: '6', maxlength: '5000', placeholder: 'Write your reply...' });
    function field(label, forId, input) {
      return el('div', { class: 'cms-field' }, [
        el('label', { class: 'cms-label cms-required', for: forId, text: label }), input,
        el('p', { class: 'cms-field-error', role: 'alert' })
      ]);
    }
    var form = el('form', { novalidate: true }, [
      el('p', { class: 'cms-field-hint message-reply-note', text: 'To: ' + m.email + '. This is a simulation \u2014 the reply is saved here and no email is sent.' }),
      field('Subject', 'replySubject', subj),
      field('Message', 'replyBody', text)
    ]);
    var cancel = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Cancel' });
    var send = el('button', { type: 'button', class: 'cms-btn cms-btn-primary', text: 'Send reply' });
    var modalEl = ui.modalShell('Reply to ' + m.fullName, [form], [cancel, send]);
    var modal = ui.openModal(modalEl);
    modalEl.addEventListener('shown.bs.modal', function () { text.focus(); });

    function submit() {
      ui.clearErrors(form);
      var ok = true;
      if (!subj.value.trim()) { ui.setError(subj, 'Enter a subject.'); ok = false; }
      if (text.value.trim().length < 5) { ui.setError(text, 'Write a reply of at least 5 characters.'); ok = false; }
      if (!ok) return;
      if (store.saveReply(id, subj.value.trim(), text.value.trim())) {
        modal.hide();
        ui.toast('Reply saved for ' + m.fullName + ' and the message is now Responded. (Simulated \u2014 no email was sent.)', 'success');
        render();
      } else ui.toast('The reply could not be saved.', 'error');
    }
    send.addEventListener('click', submit);
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  }

  render();
})();
