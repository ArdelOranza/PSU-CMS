/* ==========================================================================
   users.js — All Users (all-users.html) and Add New User / Edit User form
   (add-user.html, edit mode via ?id=).
   Each user stores a roleId from CMS.db.roles.
   FRONT-END DEMO ONLY: there is no sign-in. Passwords are checked for
   shape and then thrown away — they are never saved anywhere.
   PHP: hash passwords with password_hash() on the server and never expose them.
   ========================================================================== */
(function () {
  var ui = CMS.ui, el = ui.el, S = CMS.structure, db = CMS.db.users;

  function roleOptions() { return S.roles().map(function (r) { return { value: r.id, label: r.name }; }); }
  function isSignedInUser(u) { return u.fullName === CMS.config.currentUser.name; }   // simulated "current user"

  /* ======================= All Users (list) ======================= */
  function initList() {
    var roleSel = document.getElementById('userFilterRole');
    var statusSel = document.getElementById('userFilterStatus');
    S.fillFilter(roleSel, 'All Roles', roleOptions());
    S.fillFilter(statusSel, 'All Status', CMS.config.userStatuses);

    function buildRow(u, refresh) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [u.photo ? el('img', { class: 'user-thumb', src: u.photo, alt: '' }) : el('span', { class: 'user-thumb', 'aria-hidden': 'true' })]));
      tr.appendChild(el('td', {}, [el('span', { class: 'cms-cell-title', text: u.fullName })]));
      tr.appendChild(el('td', { text: u.username }));
      tr.appendChild(el('td', { text: u.email }));
      tr.appendChild(el('td', { text: S.roleName(u.roleId) }));
      tr.appendChild(el('td', {}, [S.statusBadge(u.status)]));
      tr.appendChild(el('td', { text: S.formatLastLogin(u.lastLogin) }));
      tr.appendChild(S.actions(u.fullName, 'add-user.html?id=' + encodeURIComponent(u.id),
        function () { showUser(u); }, function () { removeUser(u, refresh); }));
      return tr;
    }

    function showUser(u) {
      ui.showDetails({
        title: u.fullName,
        rows: [['Username', u.username], ['Email', u.email], ['Role', S.roleName(u.roleId)],
               ['Status', S.statusBadge(u.status)], ['Last login', S.formatLastLogin(u.lastLogin)]]
      });
    }

    function removeUser(u, refresh) {
      if (isSignedInUser(u)) { S.blocked('Cannot delete user', 'You cannot delete the account you are signed in with.'); return; }
      ui.confirmDialog({ title: 'Delete user', message: 'Delete \u201C' + u.fullName + '\u201D? This cannot be undone.', confirmLabel: 'Delete' })
        .then(function (yes) {
          if (!yes) return;
          if (db.remove(u.id)) { ui.toast('User deleted.', 'success'); refresh(); }
          else ui.toast('The user could not be deleted.', 'error');
        });
    }

    S.listPage({
      body: document.getElementById('userTableBody'), wrap: document.getElementById('userTableWrap'),
      emptyBox: document.getElementById('userEmpty'), footer: document.getElementById('userFooter'),
      search: document.getElementById('userSearch'),
      filters: [{ select: roleSel, key: 'role' }, { select: statusSel, key: 'status' }],
      pageSize: CMS.config.pageSize.users, all: function () { return db.list(); },
      match: function (u, q, f) {
        if (f.role && u.roleId !== f.role) return false;
        if (f.status && u.status !== f.status) return false;
        return !q || (u.fullName + ' ' + u.username + ' ' + u.email).toLowerCase().indexOf(q) !== -1;
      },
      row: buildRow,
      emptyNone: { title: 'No users yet', text: 'Accounts you add will appear here.', actionLabel: '+ Add New User', actionHref: 'add-user.html' },
      emptyFiltered: { title: 'No matching users found', text: 'Try a different search or filter.' }
    });
  }

  /* ======================= Add New User / Edit User (form) ======================= */
  function initForm() {
    var form = document.getElementById('userForm');
    var f = {
      fullName: document.getElementById('userFullName'), username: document.getElementById('userUsername'),
      email: document.getElementById('userEmail'), role: document.getElementById('userRole'),
      password: document.getElementById('userPassword'), confirm: document.getElementById('userConfirm'),
      status: document.getElementById('userStatus')
    };
    var photo = S.imageField({
      preview: document.getElementById('userPhotoPreview'), button: document.getElementById('userPhotoBtn'),
      remove: document.getElementById('userPhotoRemove'), input: document.getElementById('userPhotoInput'),
      placeholder: 'Profile Picture', alt: 'Profile picture preview', maxWidth: CMS.config.avatarMaxWidth
    });
    var v = S.validator(form);

    var editing = null, editId = ui.getParam('id');
    if (editId) {
      editing = db.get(editId);
      if (!editing) { ui.flash('That user was not found.', 'error'); window.location.href = 'all-users.html'; return; }
      document.getElementById('userPageTitle').textContent = 'Edit User';
      document.getElementById('userPageSub').textContent = 'Update this CMS account.';
      document.getElementById('userCrumb').textContent = 'Edit User';
      document.getElementById('userSubmit').textContent = 'Save Changes';
      document.getElementById('userPasswordHint').textContent = 'Leave both password fields empty to keep the current account unchanged.';
      document.title = 'Edit User | PSU CMS';
    }

    /* roles come from the User Roles dataset; "Editor" is the design's default */
    var roles = roleOptions();
    if (roles.length) {
      var def = (roles.filter(function (r) { return S.same(r.label, 'Editor'); })[0] || roles[0]).value;
      ui.setOptions(f.role, roles, editing && S.role(editing.roleId) ? editing.roleId : def);
    } else {
      ui.setOptions(f.role, [{ value: '', label: 'No roles yet' }], '');
    }
    ui.setOptions(f.status, CMS.config.userStatuses, editing ? editing.status : 'active');

    if (editing) {
      f.fullName.value = editing.fullName; f.username.value = editing.username; f.email.value = editing.email; photo.set(editing.photo);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      v.reset();
      var fullName = f.fullName.value.trim(), username = f.username.value.trim(), email = f.email.value.trim();
      var others = db.list().filter(function (u) { return !editing || u.id !== editing.id; });
      var pw = f.password.value, pw2 = f.confirm.value, pwWanted = !editing || pw || pw2;

      if (!fullName) v.fail(f.fullName, 'Enter the full name.');
      if (!username) v.fail(f.username, 'Enter a username.');
      else if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) v.fail(f.username, 'Use 3\u201330 letters, numbers, dots, dashes or underscores.');
      else if (others.some(function (u) { return S.same(u.username, username); })) v.fail(f.username, 'This username is already taken.');
      if (!email) v.fail(f.email, 'Enter the email address.');
      else if (!S.isEmail(email)) v.fail(f.email, 'Enter a valid email address.');
      else if (others.some(function (u) { return S.same(u.email, email); })) v.fail(f.email, 'This email address is already used.');
      if (!f.role.value || !S.role(f.role.value)) v.fail(f.role, 'Choose a role.');
      if (pwWanted) {
        if (!pw) v.fail(f.password, 'Enter a password.');
        else if (pw.length < 8) v.fail(f.password, 'Use at least 8 characters.');
        if (!pw2) v.fail(f.confirm, 'Confirm the password.');
        else if (pw && pw2 !== pw) v.fail(f.confirm, 'The passwords do not match.');
      }
      if (!v.ok()) { ui.toast('Please fix the highlighted fields.', 'error'); return; }

      /* the password is validated above and intentionally NOT part of the record */
      f.password.value = ''; f.confirm.value = '';
      var record = { fullName: fullName, username: username, email: email, roleId: f.role.value, status: f.status.value, photo: photo.get() };
      if (editing) record.id = editing.id;
      else Object.assign(record, { lastLogin: '', collegeId: '', departmentId: '' });
      var res = db.save(record);
      if (!res.ok) { S.saveFailed(); return; }
      ui.flash(editing ? 'User updated.' : 'User created.', 'success');
      window.location.href = 'all-users.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('userForm')) initForm();
    else if (document.getElementById('userTableBody')) initList();
  });
})();
