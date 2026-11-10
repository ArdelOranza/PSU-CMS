/* ==========================================================================
   storage.js — the data layer. Every dataset is an array saved in
   localStorage under "psucms.<name>". Pages only talk to these repositories
   (list / get / save / remove), never to localStorage directly, so the team
   can later swap this file for calls to PHP endpoints.
   PHP: replace the bodies of read()/write() with fetch() calls (or move the
   data into MySQL) and keep the same method names.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.storage = (function () {
  var PREFIX = CMS.config.storagePrefix;

  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Returns the stored array, or null when nothing (valid) is stored yet. */
  function read(key) {
    try {
      var raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('not an array');
      return data;
    } catch (err) {
      console.warn('[CMS] Stored "' + key + '" data was invalid and will be reset.', err);
      return null;
    }
  }

  function write(key, rows) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(rows));
      return { ok: true };
    } catch (err) {
      /* usually the ~5 MB browser limit (large images) or private mode */
      console.warn('[CMS] Could not save "' + key + '".', err);
      return { ok: false, error: err };
    }
  }

  /* A repository for one dataset. seedFn supplies the first-run sample data. */
  function createRepo(key, idPrefix, seedFn) {
    /* In-memory fallback if localStorage is unavailable (keeps the page usable). */
    var memory = null;

    function load() {
      var rows = read(key);
      if (rows === null) {                 // first run, or corrupted: seed once
        rows = seedFn ? seedFn() : [];
        var res = write(key, rows);
        if (!res.ok) memory = rows;
      }
      return memory || rows;
    }

    function persist(rows) {
      var res = write(key, rows);
      if (!res.ok) { memory = rows; }
      return res;
    }

    function sortNewest(rows) {
      return rows.slice().sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    }

    return {
      key: key,
      /* all records, newest first */
      list: function () { return sortNewest(load()); },
      get: function (id) {
        var rows = load();
        for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
        return null;
      },
      /* Insert (no id / unknown id) or update. Returns { ok, record, error }. */
      save: function (record) {
        var rows = load().slice();
        var now = new Date().toISOString();
        var saved, index = -1;
        for (var i = 0; i < rows.length; i++) if (record.id && rows[i].id === record.id) index = i;
        if (index >= 0) {
          saved = Object.assign({}, rows[index], record, { updatedAt: now });
          rows[index] = saved;
        } else {
          saved = Object.assign({}, record, { id: record.id || newId(idPrefix), createdAt: now, updatedAt: now });
          rows.push(saved);
        }
        var res = persist(rows);
        return res.ok ? { ok: true, record: saved } : { ok: false, error: res.error };
      },
      remove: function (id) {
        var rows = load().filter(function (r) { return r.id !== id; });
        return persist(rows).ok;
      },
      count: function () { return load().length; },
      /* testing helpers */
      clear: function () { memory = null; return persist([]).ok; },
      reset: function () { memory = null; return persist(seedFn ? seedFn() : []).ok; }
    };
  }

  return { createRepo: createRepo, newId: newId };
})();

/* The datasets used by this module. Other teammates' modules can add theirs. */
CMS.db = {
  news:            CMS.storage.createRepo('news', 'news', CMS.seed.news),
  announcements:   CMS.storage.createRepo('announcements', 'ann', CMS.seed.announcements),
  events:          CMS.storage.createRepo('events', 'evt', CMS.seed.events),
  eventCategories: CMS.storage.createRepo('eventCategories', 'cat', CMS.seed.eventCategories),
  documents:       CMS.storage.createRepo('documents', 'doc', CMS.seed.documents),
  faculty:         CMS.storage.createRepo('faculty', 'fac', CMS.seed.faculty)
};

/* Console helpers for testing, e.g. run CMS.dev.clearEvents() then reload
   All Events to see the empty state. */
CMS.dev = {
  clearEvents: function () { CMS.db.events.clear(); console.info('[CMS] Events cleared. Reload the page.'); },
  clearAll: function () { Object.keys(CMS.db).forEach(function (k) { CMS.db[k].clear(); }); console.info('[CMS] All data cleared.'); },
  resetAll: function () { Object.keys(CMS.db).forEach(function (k) { CMS.db[k].reset(); }); console.info('[CMS] Sample data restored. Reload the page.'); }
};
