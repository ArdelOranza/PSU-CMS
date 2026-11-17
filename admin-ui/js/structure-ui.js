/* ==========================================================================
   structure-ui.js — UI pieces from the UX team's extra screens, used by the
   University Structure and User Management pages:
     - toasts      (S.toast / S.flash)      solid green / red, top right
     - dialogs     (S.dialog, S.confirmDelete, S.blocked)
     - Choose File (S.chooseFile, S.imageField)
     - details     (S.renderDetail, S.deleteFlow)
   They live here (not in ui.js / cms-components.css) so other modules' pages
   are not affected. If the team adopts these styles everywhere, move the
   rules from structure.css into cms-components.css.
   Front-end only: files are read in the browser and kept as small data URLs.
   ========================================================================== */
window.CMS = window.CMS || {};

(function () {
  var S = CMS.structure;
  var FLASH_KEY = 'psucms.structureFlash';
  var dialogCount = 0;

  /* ---------------- Toasts ---------------- */
  /* kind: 'success' (green) | 'deleted' (red) | 'error' (red, warning icon) */
  var stack = null;
  S.toast = function (message, kind) {
    var ui = CMS.ui, el = ui.el;
    kind = kind || 'success';
    if (!stack || !stack.isConnected) {
      stack = el('div', { class: 'structure-toast-stack', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(stack);
    }
    var node = el('div', { class: 'structure-toast is-' + kind }, [
      ui.icon(kind === 'error' ? 'exclamation-circle-fill' : 'check-lg'),
      el('span', { text: message })
    ]);
    function remove() { if (node.parentNode) node.parentNode.removeChild(node); }
    node.addEventListener('click', remove);
    stack.appendChild(node);
    setTimeout(remove, kind === 'error' ? 6000 : 4000);
  };
  /* Message that must survive a page change (shown by S.showFlash on the next page). */
  S.flash = function (message, kind) {
    try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, kind: kind || 'success' })); } catch (e) { /* ignore */ }
  };
  S.showFlash = function () {
    try {
      var raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      var f = JSON.parse(raw);
      S.toast(f.message, f.kind);
    } catch (e) { /* ignore */ }
  };
  document.addEventListener('DOMContentLoaded', S.showFlash);
  S.saveFailed = function () {
    S.toast('Could not save. The browser storage may be full or disabled \u2014 try a smaller image.', 'error');
  };

  /* ---------------- Dialogs (compact modal from the design) ---------------- */
  /* buttons: array of <button>. Returns { el, modal }. */
  S.dialog = function (title, bodyNodes, buttons) {
    var ui = CMS.ui, el = ui.el, id = 'structureDialogTitle' + (++dialogCount);
    var modalEl = el('div', { class: 'modal fade cms-modal structure-modal', tabindex: '-1', 'aria-labelledby': id, 'aria-hidden': 'true' }, [
      el('div', { class: 'modal-dialog modal-dialog-centered' }, [
        el('div', { class: 'modal-content' }, [
          el('div', { class: 'modal-body' },
            [el('h2', { class: 'structure-modal-title', id: id, text: title })].concat(bodyNodes, [el('div', { class: 'structure-modal-actions' }, buttons)]))
        ])
      ])
    ]);
    var shown = false;
    modalEl.addEventListener('shown.bs.modal', function () { shown = true; });
    var modal = ui.openModal(modalEl);
    return {
      el: modalEl, modal: modal,
      /* Bootstrap ignores hide() while the opening animation runs, so wait for it to finish */
      close: function () {
        if (shown) modal.hide();
        else modalEl.addEventListener('shown.bs.modal', function () { modal.hide(); }, { once: true });
      }
    };
  };
  function button(label, cls, dismiss) {
    var attrs = { type: 'button', class: 'cms-btn ' + cls, text: label };
    if (dismiss) attrs['data-bs-dismiss'] = 'modal';
    return CMS.ui.el('button', attrs);
  }

  /* "Delete this item?" — resolves true when the person confirms. */
  S.confirmDelete = function () {
    return new Promise(function (resolve) {
      var answered = false;
      var cancel = button('Cancel', 'cms-btn-outline', true), ok = button('Delete', 'cms-btn-danger');
      var d = S.dialog('Delete this item?', [CMS.ui.el('p', { class: 'structure-modal-text', text: 'This action cannot be undone. The item will be permanently removed from the website.' })], [cancel, ok]);
      ok.addEventListener('click', function () { answered = true; d.close(); resolve(true); });
      d.el.addEventListener('hidden.bs.modal', function () { if (!answered) resolve(false); });
    });
  };
  /* Message-only dialog, e.g. "can't delete because ..." */
  S.blocked = function (title, message) {
    return S.dialog(title, [CMS.ui.el('p', { class: 'structure-modal-text', text: message })], [button('OK', 'cms-btn-primary', true)]);
  };

  /* Shared delete flow for list rows and detail pages.
     o = { repo, id, blocked: {title, message} | null, done() } */
  S.deleteFlow = function (o) {
    if (o.blocked) { S.blocked(o.blocked.title, o.blocked.message); return; }
    S.confirmDelete().then(function (yes) {
      if (!yes) return;
      if (o.repo.remove(o.id)) o.done();
      else S.toast('The item could not be deleted.', 'error');
    });
  };

  /* ---------------- Choose File modal ---------------- */
  /* o = { accept, hint, process(file) -> Promise }.  process() rejects with an Error to show a message. */
  S.chooseFile = function (o) {
    var ui = CMS.ui, el = ui.el;
    var input = el('input', { type: 'file', accept: o.accept, hidden: true });
    var error = el('p', { class: 'structure-modal-error', role: 'alert', hidden: true });
    var zone = el('div', { class: 'structure-dropzone', tabindex: '0', role: 'button', 'aria-label': 'Choose a file or drop it here' }, [
      el('p', { class: 'structure-dropzone-title', text: 'Drag and drop files here' }),
      el('p', { class: 'structure-dropzone-hint', text: o.hint })
    ]);
    var cancel = button('Cancel', 'cms-btn-outline', true), choose = button('Choose File', 'cms-btn-primary');
    var d = S.dialog('Choose File', [
      el('p', { class: 'structure-modal-text', text: 'Select a file from your computer to upload.' }), zone, error, input
    ], [cancel, choose]);

    function handle(file) {
      if (!file) return;
      error.hidden = true;
      o.process(file).then(function () { d.close(); })
        .catch(function (err) { error.textContent = err && err.message ? err.message : 'That file could not be used.'; error.hidden = false; });
    }
    function open() { input.click(); }
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    choose.addEventListener('click', open);
    input.addEventListener('change', function () { handle(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (n) {
      zone.addEventListener(n, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (n) {
      zone.addEventListener(n, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) { handle(e.dataTransfer && e.dataTransfer.files[0]); });
    return d;
  };

  /* Wires "preview + Upload/Replace Image + Remove". Returns { get, set }.
     o = { preview, button, remove, placeholder, alt, maxWidth }  */
  S.imageField = function (o) {
    var ui = CMS.ui, value = '';
    var limitMb = Math.round(CMS.config.imageMaxFileBytes / 1048576);
    function render() {
      ui.clear(o.preview);
      if (value) o.preview.appendChild(ui.el('img', { src: value, alt: o.alt || 'Preview' }));
      else o.preview.appendChild(ui.el('span', { text: o.placeholder }));
      o.button.textContent = value ? 'Replace Image' : 'Upload Image';
      o.remove.hidden = !value;
    }
    o.button.addEventListener('click', function () {
      S.chooseFile({
        accept: 'image/png,image/jpeg,image/gif,image/webp',
        hint: 'PNG, JPG, GIF or WebP up to ' + limitMb + ' MB',
        process: function (file) {
          return ui.readImage(file).then(function (url) { return S.shrinkImage(url, o.maxWidth); })
            .then(function (url) { value = url; render(); S.toast('File uploaded successfully.', 'success'); });
        }
      });
    });
    o.remove.addEventListener('click', function () { value = ''; render(); });
    render();
    return { get: function () { return value; }, set: function (v) { value = v || ''; render(); } };
  };

  /* ---------------- Details page card ----------------
     o = { title, status, media: bool, image, fields: [[label, value], ...] }
     Layout from the design: header (optional image + title + status badge), then a
     two-column grid of fields, with Status always on its own last row. */
  S.renderDetail = function (card, o) {
    var ui = CMS.ui, el = ui.el;
    ui.clear(card);
    var head = el('div', { class: 'structure-detail-head' });
    if (o.media) {
      head.appendChild(el('div', { class: 'structure-detail-media' },
        [o.image ? el('img', { src: o.image, alt: '' }) : el('span', { text: 'Image Placeholder' })]));
    }
    head.appendChild(el('div', {}, [el('h2', { class: 'structure-detail-title', text: o.title }), S.statusBadge(o.status)]));
    card.appendChild(head);

    function item(label, content, wide) {
      return el('div', { class: 'structure-detail-item' + (wide ? ' is-wide' : '') }, [
        el('dt', { text: label }), el('dd', {}, [content])
      ]);
    }
    var grid = el('dl', { class: 'structure-detail-grid' });
    o.fields.forEach(function (f) {
      var v = f[1];
      grid.appendChild(item(f[0], v === '' || v === null || v === undefined ? '\u2014' : v, false));
    });
    grid.appendChild(item('Status', S.statusBadge(o.status), true));
    card.appendChild(grid);
  };
})();
