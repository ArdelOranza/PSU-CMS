/* ==========================================================================
   roles.js — User Roles page (user-roles.html): role cards + Edit Role modal.
   Roles live in CMS.db.roles; users point to them by roleId, so a rename shows
   up everywhere (All Users, Add New User) automatically.
   The design has no Add / Delete role buttons, so none are provided.
   NOTE: roles are labels only. Nothing here enforces permissions.
   PHP: real permission checks must happen on the server.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.roles;

  function init() {
    var grid = document.getElementById('roleGrid');

    function render() {
      ui.clear(grid);
      var roles = S.roles();   // same order as the sample data (matches the design)
      if (!roles.length) {
        var box = el('div', { class: 'cms-card role-empty' });
        ui.renderEmpty(box, { title: 'No roles available', text: 'Run CMS.dev.resetAll() in the console to restore the sample roles.' });
        grid.appendChild(box);
        return;
      }
      roles.forEach(function (r) {
        var btn = el('button', { type: 'button', class: 'cms-btn cms-btn-soft role-edit', 'aria-label': 'Edit role ' + r.name, text: 'Edit Role' });
        btn.addEventListener('click', function () { editRole(r); });
        grid.appendChild(el('article', { class: 'cms-card role-card' }, [
          el('h2', { class: 'role-name', text: r.name }),
          el('p', { class: 'role-tagline', text: r.tagline }),
          el('p', { class: 'role-desc', text: r.description }),
          btn
        ]));
      });
    }

    function editRole(r) {
      var count = S.usersOfRole(r.id).length;
      function field(id, label, value, tag, ph) {
        var input = el(tag === 'textarea' ? 'textarea' : 'input', Object.assign({ class: tag === 'textarea' ? 'cms-textarea' : 'cms-input', id: id, maxlength: tag === 'textarea' ? 200 : 60, placeholder: ph }, tag === 'textarea' ? { rows: 2 } : { type: 'text' }));
        input.value = value || '';
        return { input: input, node: el('div', { class: 'cms-field' }, [el('label', { class: 'cms-label', for: id, text: label }), input, el('p', { class: 'cms-field-error' })]) };
      }
      var name = field('roleName', 'Role Name', r.name, 'input', 'Enter role name');
      var tagline = field('roleTagline', 'Summary', r.tagline, 'input', 'Short summary');
      var desc = field('roleDescription', 'Description', r.description, 'textarea', 'Enter description');
      var form = el('form', { novalidate: true }, [
        name.node, tagline.node, desc.node,
        el('p', { class: 'cms-field-hint', text: count + (count === 1 ? ' user is' : ' users are') + ' assigned to this role.' })
      ]);
      var cancel = el('button', { type: 'button', class: 'cms-btn cms-btn-outline', 'data-bs-dismiss': 'modal', text: 'Cancel' });
      var save = el('button', { type: 'submit', class: 'cms-btn cms-btn-primary', text: 'Save Changes' });
      var modalEl = ui.modalShell('Edit Role', [form], [cancel, save]);
      var modal = ui.openModal(modalEl);
      var v = S.validator(form);

      function submit(e) {
        e.preventDefault(); v.reset();
        var n = name.input.value.trim();
        if (!n) v.fail(name.input, 'Enter the role name.');
        else if (db.list().some(function (o) { return o.id !== r.id && S.same(o.name, n); })) v.fail(name.input, 'A role with this name already exists.');
        if (!v.ok()) return;
        var res = db.save({ id: r.id, name: n, tagline: tagline.input.value.trim(), description: desc.input.value.trim() });
        if (!res.ok) { S.saveFailed(); return; }
        modal.hide(); ui.toast('Role updated.', 'success'); render();
      }
      form.addEventListener('submit', submit);
      save.addEventListener('click', submit);   // the button sits in the modal footer, outside the <form>
      modalEl.addEventListener('shown.bs.modal', function () { name.input.focus(); });
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('roleGrid')) init(); });
})();
