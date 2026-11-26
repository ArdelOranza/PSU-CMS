/* All Media (grid / list) and Upload / Edit Media. */
(function () {
  'use strict';
  var A = window.PSUAdmin, U = PSU.util, esc = A.esc;
  var PER_PAGE = 8;

  function thumbHtml(m, cls) {
    return m.dataUrl ? '<img src="' + esc(m.dataUrl) + '" alt="' + esc(m.altText || m.title) + '">' : '<span>Image Placeholder</span>';
  }

  /* ---------------- All Media ---------------- */
  var holder = document.getElementById('mediaHolder');
  if (holder) {
    var search = A.$('#mediaSearch'), type = A.$('#filterType'), view = A.$('#filterView'), footer = A.$('#mediaFooter');
    var page = 1;
    CMS.ui.setOptions(type, [{ value: '', label: 'All File Types' }].concat(Object.keys(PSU.MEDIA_TYPES).map(function (k) { return { value: k, label: PSU.MEDIA_TYPES[k] }; })), '');
    function render() {
      var q = search.value.trim().toLowerCase();
      var list = PSU.db.all('media').filter(function (m) {
        if (type.value && m.ext !== type.value) return false;
        return !q || [m.title, m.fileName, m.altText, m.caption].join(' ').toLowerCase().indexOf(q) > -1;
      }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      var filtered = !!(q || type.value);
      var pg = U.paginate(list, page, PER_PAGE); page = pg.page;
      if (!pg.total) {
        holder.innerHTML = '<section class="cms-card">' + A.emptyHtml('No media available', 'Items you add will appear here.',
          '') + '</section>';
        footer.innerHTML = ''; return;
      }
      var actions = function (m) { return '<div class="cms-actions"><a class="cms-action" href="upload-media.html?id=' + m.id + '">Edit</a><button type="button" class="cms-action cms-action-danger" data-delete="' + m.id + '">Delete</button></div>'; };
      if (view.value === 'list') {
        holder.innerHTML = '<section class="cms-card"><div class="cms-table-wrap"><table class="cms-table res-table res-media-table"><thead><tr><th scope="col">Preview</th><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Dimensions</th><th scope="col">Size</th><th scope="col">Uploaded</th><th scope="col">Actions</th></tr></thead><tbody>' +
          pg.items.map(function (m) {
            return '<tr><td>' + (m.dataUrl ? '<img class="cms-thumb" src="' + esc(m.dataUrl) + '" alt="' + esc(m.altText || m.title) + '">' : '<span class="cms-thumb" aria-hidden="true"></span>') + '</td><td>' + esc(m.title) + '</td><td>' + esc(m.ext.toUpperCase()) + '</td><td>' + (m.width ? m.width + ' \u00D7 ' + m.height : '') + '</td><td>' + esc(U.fmtSize(m.size)) + '</td><td>' + esc(U.fmtDate(m.createdAt)) + '</td><td>' + actions(m) + '</td></tr>';
          }).join('') + '</tbody></table></div></section>';
      } else {
        holder.innerHTML = '<div class="res-media-grid">' + pg.items.map(function (m) {
          return '<article class="cms-card res-media-card"><div class="res-media-thumb">' + thumbHtml(m) + '</div><h2 class="res-media-name">' + esc(m.title) + '</h2><p class="res-media-meta">' + esc(m.ext.toUpperCase()) + ' \u00B7 ' + esc(U.fmtDate(m.createdAt)) + ' \u00B7 ' + esc(U.fmtSize(m.size)) + '</p>' + actions(m) + '</article>';
        }).join('') + '</div>';
      }
      footer.innerHTML = A.footerHtml(pg);
    }
    search.addEventListener('input', A.debounce(function () { page = 1; render(); }, 150));
    type.addEventListener('change', function () { page = 1; render(); });
    view.addEventListener('change', function () { page = 1; render(); });
    A.$('#mediaFilters').addEventListener('submit', function (e) { e.preventDefault(); });
    A.onPager(footer, function (n) { page = n; render(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) { search.value = ''; type.value = ''; CMS.ui.syncSelect(type); page = 1; render(); return; }
      var del = e.target.closest('[data-delete]');
      if (!del) return;
      var m = PSU.db.get('media', del.getAttribute('data-delete'));
      if (!m) return;
      CMS.ui.confirmDelete({ text: 'Delete \u201C' + m.title + '\u201D? The image will be removed from the library.' }).then(function (ok) {
        if (!ok) return; PSU.db.remove('media', m.id); CMS.ui.toast('Media file deleted.', 'deleted'); render();
      });
    });
    render();
  }

  /* ---------------- Upload / Edit Media ---------------- */
  var form = document.getElementById('mediaForm');
  if (form) {
    var id = Number(U.param('id')) || 0, rec = id ? PSU.db.get('media', id) : null;
    if (id && !rec) { A.go('That media file no longer exists.', 'all-media.html', 'error'); return; }
    var fileInput = A.$('#f_file'), preview = A.$('#mediaPreview'), title = A.$('#f_title');
    var picked = null; // { file, dataUrl, width, height }
    if (rec) {
      title.value = rec.title; A.$('#f_alt').value = rec.altText || ''; A.$('#f_caption').value = rec.caption || ''; A.$('#f_description').value = rec.description || '';
      if (rec.dataUrl) preview.innerHTML = '<img src="' + esc(rec.dataUrl) + '" alt="Current image">';
    }
    function onFile(file) {
      var msg = A.checkFile(file, PSU.MEDIA_TYPES);
      A.setFieldError('err_file', msg);
      if (msg) { fileInput.value = ''; picked = null; return; }
      U.readImage(file, 640, function (r) {
        if (!r) { A.setFieldError('err_file', 'That image could not be read.'); picked = null; return; }
        picked = { file: file, dataUrl: r.dataUrl, width: r.width, height: r.height };
        preview.innerHTML = '<img src="' + esc(r.dataUrl) + '" alt="Selected image preview">';
        if (!title.value.trim()) title.value = file.name;
      });
    }
    A.dropzone(A.$('#mediaDropzone'), fileInput, onFile);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); CMS.ui.clearErrors(form); A.setFieldError('err_file', '');
      if (!rec && !picked) { A.setFieldError('err_file', 'Select an image to upload.'); CMS.ui.toast('Please select an image.', 'error'); return; }
      var out = rec ? Object.assign({}, rec) : {};
      out.title = title.value.trim() || (picked ? picked.file.name : rec.title);
      out.altText = A.$('#f_alt').value.trim(); out.caption = A.$('#f_caption').value.trim(); out.description = A.$('#f_description').value.trim();
      if (picked) { out.fileName = picked.file.name; out.ext = A.extOf(picked.file.name); out.size = picked.file.size; out.width = picked.width; out.height = picked.height; out.dataUrl = picked.dataUrl; }
      if (!PSU.db.put('media', out)) { CMS.ui.toast('The browser could not store this image (storage is full). Delete some media and try again.', 'error'); return; }
      A.go(rec ? 'Media file updated.' : 'Media uploaded.', 'all-media.html');
    });
  }
})();
