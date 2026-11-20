/* ==========================================================================
   settings-store.js — data layer for Account, Security and Theme settings.
   Each setting is a one-record repository (storage.js only accepts arrays).
   Keys: psucms.account, psucms.security, psucms.theme.
   NEVER stored: passwords or any credential. Password fields are checked in
   the browser and then discarded — real changes need the PHP backend.
   Also keeps the header name / avatar in sync with the saved account.
   ========================================================================== */
window.CMS = window.CMS || {};

(function () {
  var now = function () { return new Date().toISOString(); };

  CMS.seed.account = function () {
    return [{ id: 'account', fullName: 'Admin User', username: 'admin', email: 'admin@psu.edu.ph', avatar: '', createdAt: now() }];
  };
  CMS.seed.security = function () {
    return [{ id: 'security', twoFactor: true, createdAt: now(),
              sessions: [{ device: 'Chrome \u00B7 Windows \u00B7 Manila', current: true }, { device: 'Safari \u00B7 iPhone \u00B7 Manila', current: false }] }];
  };
  CMS.seed.theme = function () {
    var d = CMS.theme.DEFAULTS;
    return [{ id: 'theme', theme: d.theme, primary: d.primary, secondary: d.secondary, font: d.font, createdAt: now() }];
  };

  CMS.db.account = CMS.storage.createRepo('account', 'acct', CMS.seed.account);
  CMS.db.security = CMS.storage.createRepo('security', 'sec', CMS.seed.security);
  CMS.db.theme = CMS.storage.createRepo('theme', 'thm', CMS.seed.theme);

  function repo(name) { return CMS.db[name]; }

  CMS.settings = {
    /* the single record, or the sample default if it is missing / damaged */
    get: function (name) {
      var rec = repo(name).get(name);
      return rec || CMS.seed[name]()[0];
    },
    /* merge fields into the record. Returns { ok, record } */
    save: function (name, fields) {
      var data = Object.assign({}, fields, { id: name });
      return repo(name).save(data);
    },

    /* shows the saved name / avatar in the top bar (and the simulated user) */
    applyHeader: function () {
      var acct = CMS.settings.get('account');
      CMS.config.currentUser.name = acct.fullName;
      var nameEl = document.querySelector('.cms-user-name');
      if (nameEl) nameEl.textContent = acct.fullName;
      var av = document.querySelector('.cms-avatar');
      if (av && /^data:image\//.test(acct.avatar || '')) {
        av.style.backgroundImage = 'url("' + acct.avatar + '")';
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
      } else if (av) {
        av.style.backgroundImage = '';
      }
    },

    /* Adds a show/hide eye button to every <input data-password-toggle>. */
    attachPasswordToggles: function (root) {
      [].forEach.call((root || document).querySelectorAll('input[data-password-toggle]'), function (input) {
        if (input.parentNode.classList.contains('security-pw')) return;
        var wrap = CMS.ui.el('div', { class: 'security-pw' });
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        var icon = CMS.ui.icon('eye');
        var btn = CMS.ui.el('button', { type: 'button', class: 'security-pw-toggle', 'aria-label': 'Show password', 'aria-pressed': 'false' }, [icon]);
        btn.addEventListener('click', function () {
          var show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          icon.className = 'bi bi-' + (show ? 'eye-slash' : 'eye');
          btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
          btn.setAttribute('aria-pressed', show ? 'true' : 'false');
        });
        wrap.appendChild(btn);
      });
    }
  };

  function init() { CMS.settings.applyHeader(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
