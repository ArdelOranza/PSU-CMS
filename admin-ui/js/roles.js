/* ==========================================================================
   roles.js — User Roles page (user-roles.html: role cards) and Edit Role page
   (role-form.html?id=: name, description and a permission matrix).
   Roles live in CMS.db.roles; users point to them by roleId, so a rename shows
   up everywhere (All Users, Add New User) automatically.
   The design has no Add / Delete role buttons, so none are provided.
   IMPORTANT: the permission checkboxes are saved as data only. Nothing in this
   front-end enforces them. PHP: check permissions on the server for every action.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.roles;

  /* ======================= User Roles (cards) ======================= */
  function initList() {
    var grid = document.getElementById('roleGrid');
    var roles = S.roles();   // same order as the sample data (matches the design)
    if (!roles.length) {
      var box = el('div', { class: 'cms-card role-empty' });
      ui.renderEmpty(box, { title: 'No roles available', text: 'Run CMS.dev.resetAll() in the console to restore the sample roles.' });
      grid.appendChild(box);
      return;
    }
    roles.forEach(function (r) {
      grid.appendChild(el('article', { class: 'cms-card role-card' }, [
        el('h2', { class: 'role-name', text: r.name }),
        el('p', { class: 'role-tagline', text: r.tagline }),
        el('p', { class: 'role-desc', text: r.description }),
        el('a', { class: 'cms-btn cms-btn-soft role-edit', href: 'role-form.html?id=' + encodeURIComponent(r.id), 'aria-label': 'Edit role ' + r.name, text: 'Edit Role' })
      ]));
    });
  }

  /* ======================= Edit Role ======================= */
  function initForm() {
    var role = db.get(ui.getParam('id'));
    if (!role) { S.flash('That role was not found.', 'error'); window.location.href = 'user-roles.html'; return; }
    var form = document.getElementById('roleForm');
    var nameInput = document.getElementById('roleName'), descInput = document.getElementById('roleDescription');
    var v = S.validator(form);

    document.title = 'Edit Role | PSU CMS';
    document.getElementById('roleFormTitle').textContent = 'Edit Role \u2013 ' + role.name;
    nameInput.value = role.name; descInput.value = role.tagline || '';

    /* one row per module, one checkbox per action */
    var granted = S.permissionsOf(role), body = document.getElementById('rolePermissionBody');
    CMS.config.permissionModules.forEach(function (m) {
      var tr = el('tr', {}, [el('td', { text: m.label })]);
      CMS.config.permissionActions.forEach(function (a) {
        var box = el('input', { type: 'checkbox', class: 'role-check', 'data-module': m.key, 'data-action': a, 'aria-label': a + ' ' + m.label });
        box.checked = (granted[m.key] || []).indexOf(a) !== -1;
        tr.appendChild(el('td', {}, [box]));
      });
      body.appendChild(tr);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); v.reset();
      var name = nameInput.value.trim();
      if (!name) v.fail(nameInput, 'Enter the role name.');
      else if (db.list().some(function (o) { return o.id !== role.id && S.same(o.name, name); })) v.fail(nameInput, 'A role with this name already exists.');
      if (!v.ok()) { S.toast('Please fix the highlighted fields.', 'error'); return; }

      var permissions = {};
      CMS.config.permissionModules.forEach(function (m) { permissions[m.key] = []; });
      [].forEach.call(form.querySelectorAll('.role-check:checked'), function (box) {
        permissions[box.getAttribute('data-module')].push(box.getAttribute('data-action'));
      });
      var res = db.save({ id: role.id, name: name, tagline: descInput.value.trim(), permissions: permissions });
      if (!res.ok) { S.saveFailed(); return; }
      S.flash('Changes saved successfully.', 'success');
      window.location.href = 'user-roles.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('roleForm')) initForm();
    else if (document.getElementById('roleGrid')) initList();
  });
})();
