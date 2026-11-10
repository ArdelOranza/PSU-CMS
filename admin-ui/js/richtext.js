/* ==========================================================================
   richtext.js — tiny rich-text editor (contenteditable + execCommand).
   Buttons: Bold, Italic, Underline, bulleted list, numbered list, Link, Image.
   Pasted content is inserted as plain text; saved HTML always goes through
   CMS.sanitize.clean() before it is stored or shown.
   Markup it expects: see add-news.html (.cms-richtext block).
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.richtext = (function () {
  var ui = CMS.ui, el = ui.el;
  var STATE_CMDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Accepts http(s) and mailto links; anything else (javascript:, data:...) is refused. */
  function normalizeUrl(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    if (/^[a-z][a-z0-9+.\-]*:/i.test(v) && !/^(https?:\/\/|mailto:)/i.test(v)) return '';
    if (!/^(https?:\/\/|mailto:)/i.test(v)) v = 'https://' + v;
    if (/^https?:/i.test(v)) {
      try { var u = new URL(v); if (u.hostname.indexOf('.') === -1) return ''; } catch (e) { return ''; }
    }
    return v;
  }

  function init(root) {
    var area = root.querySelector('.cms-richtext-area');
    var toolbar = root.querySelector('.cms-richtext-toolbar');
    var fileInput = root.querySelector('input[type="file"]');
    var saved = null;

    function selectionInArea() {
      var sel = window.getSelection();
      return sel.rangeCount && area.contains(sel.getRangeAt(0).commonAncestorContainer);
    }
    function remember() { if (selectionInArea()) saved = window.getSelection().getRangeAt(0).cloneRange(); }
    function restore() {
      area.focus();
      if (saved) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); }
    }
    function notify() { area.dispatchEvent(new Event('input', { bubbles: true })); }

    function updateState() {
      if (!selectionInArea()) return;
      STATE_CMDS.forEach(function (cmd) {
        var btn = toolbar.querySelector('[data-cmd="' + cmd + '"]');
        if (!btn) return;
        var on = false;
        try { on = document.queryCommandState(cmd); } catch (e) { /* ignore */ }
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    document.addEventListener('selectionchange', function () { remember(); updateState(); });

    /* keep the text selection when a toolbar button is pressed */
    toolbar.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cmd]');
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'link') { openLinkDialog(); return; }
      if (cmd === 'image') { remember(); if (fileInput) fileInput.click(); return; }
      restore();
      document.execCommand(cmd, false, null);
      updateState(); notify();
    });

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (!file) return;
        ui.readImage(file).then(function (dataUrl) {
          restore();
          document.execCommand('insertImage', false, dataUrl);
          notify();
        }).catch(function (err) { ui.toast(err.message, 'error'); })
          .then(function () { fileInput.value = ''; });
      });
    }

    function openLinkDialog() {
      remember();
      var urlInput = el('input', { type: 'text', class: 'cms-input', id: 'cmsLinkUrl', placeholder: 'https://example.com', autocomplete: 'off' });
      var err = el('p', { class: 'cms-field-error', text: 'Enter a valid web address (http, https or mailto).' });
      var cancel = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Cancel' });
      var ok = el('button', { type: 'button', class: 'cms-btn cms-btn-primary', text: 'Insert link' });
      var field = el('div', { class: 'cms-field' }, [el('label', { class: 'cms-label', for: 'cmsLinkUrl', text: 'Link address' }), urlInput, err]);
      var modalEl = ui.modalShell('Insert link', [field], [cancel, ok]);
      var modal = ui.openModal(modalEl), pendingUrl = '';
      modalEl.addEventListener('shown.bs.modal', function () { urlInput.focus(); });
      function submit() {
        var url = normalizeUrl(urlInput.value);
        if (!url) { field.classList.add('has-error'); urlInput.classList.add('is-invalid'); urlInput.focus(); return; }
        pendingUrl = url; modal.hide();
      }
      ok.addEventListener('click', submit);
      urlInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      modalEl.addEventListener('hidden.bs.modal', function () {
        if (!pendingUrl) return;
        restore();
        var sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) {
          document.execCommand('insertHTML', false, '<a href="' + escapeHtml(pendingUrl) + '">' + escapeHtml(pendingUrl) + '</a>');
        } else {
          document.execCommand('createLink', false, pendingUrl);
        }
        notify();
      });
    }

    /* paste as plain text only */
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    /* an emptied editor shows its placeholder again */
    area.addEventListener('input', function () {
      if (!area.textContent.trim() && !area.querySelector('img,li')) area.replaceChildren();
    });

    return {
      area: area,
      getHtml: function () { return CMS.sanitize.clean(area.innerHTML); },
      setHtml: function (html) { CMS.sanitize.render(area, html); },
      isEmpty: function () { return !area.textContent.trim() && !area.querySelector('img'); },
      focus: function () { area.focus(); }
    };
  }

  return { init: init, normalizeUrl: normalizeUrl };
})();
