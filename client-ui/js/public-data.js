/* ==========================================================================
   public-data.js — what the PUBLIC site is allowed to show (PSU.data).
   Reads the same localStorage data the admin screens save (through CMS.db from
   admin-ui/js) and applies the public rules:
     news          published only
     announcements published, already started and not expired (CMS.announcementRules)
     events        published only; Upcoming / Ongoing / Completed worked out from the dates
   A campus filter keeps that campus plus the "All Campuses" items.
   PHP (backend teammate): replace these functions with database queries; keep the same field names.
   ========================================================================== */
window.PSU = window.PSU || {};

PSU.data = (function () {
  var cfg = CMS.config, db = CMS.db, rules = CMS.announcementRules, evRules = CMS.eventRules;

  function plain(html) { return CMS.sanitize.text(html || ''); }
  function campusOk(rec, campus) { return !campus || rec.campus === cfg.allCampuses || rec.campus === campus; }
  function textHit(q, parts) {
    var words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    var hay = parts.join(' ').toLowerCase();
    return words.every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function newestFirst(key) {
    return function (a, b) { return String(b[key] || '').localeCompare(String(a[key] || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')); };
  }

  /* ---------- news ---------- */
  var news = {
    published: function () { return db.news.list().filter(function (n) { return n.status === 'published'; }).sort(newestFirst('publishedAt')); },
    /* filters: { q, campus, category } */
    list: function (f) {
      f = f || {};
      return news.published().filter(function (n) {
        return campusOk(n, f.campus) && (!f.category || n.category === f.category) &&
               textHit(f.q, [n.title, n.shortDescription, plain(n.content), n.author, n.category]);
      });
    },
    get: function (id) { var n = db.news.get(id); return n && n.status === 'published' ? n : null; },
    categories: function () {                                   // chips: saved categories that have published news
      var used = {};
      news.published().forEach(function (n) { used[n.category] = true; });
      var ordered = cfg.newsCategories.filter(function (c) { return used[c]; });
      Object.keys(used).forEach(function (c) { if (ordered.indexOf(c) === -1) ordered.push(c); });
      return ordered;
    },
    others: function (excludeId, count) { return news.published().filter(function (n) { return n.id !== excludeId; }).slice(0, count); }
  };

  /* ---------- announcements ---------- */
  var announcements = {
    active: function () { return db.announcements.list().filter(rules.isActive).sort(newestFirst('publishedAt')); },
    list: function (f) {
      f = f || {};
      return announcements.active().filter(function (a) {
        return rules.visibleForCampus(a, f.campus) && textHit(f.q, [a.title, plain(a.content), a.author, a.category]);
      });
    },
    get: function (id) { var a = db.announcements.get(id); return a && rules.isActive(a) ? a : null; },
    others: function (excludeId, count) { return announcements.active().filter(function (a) { return a.id !== excludeId; }).slice(0, count); }
  };

  /* ---------- events ---------- */
  function eventCategoryName(ev) { return evRules.categoryName(ev.categoryId); }
  function campusOfEvent(ev) { return ev.campus || cfg.allCampuses; }
  var events = {
    published: function () {
      return db.events.list().filter(function (e) { return e.state === 'published'; }).sort(function (a, b) {
        return String(a.startDate).localeCompare(String(b.startDate)) || String(a.startTime || '').localeCompare(String(b.startTime || ''));
      });
    },
    /* filters: { q, campus, category (category id), status } */
    list: function (f) {
      f = f || {};
      return events.published().filter(function (e) {
        var rec = { campus: campusOfEvent(e) };
        return campusOk(rec, f.campus) && (!f.category || e.categoryId === f.category) &&
               (!f.status || evRules.effectiveStatus(e) === f.status) &&
               textHit(f.q, [e.title, e.description, e.venue, e.organizer, eventCategoryName(e)]);
      });
    },
    get: function (id) { var e = db.events.get(id); return e && e.state === 'published' ? e : null; },
    status: function (e) { return evRules.effectiveStatus(e); },
    statusLabel: function (key) { return evRules.statusLabel(key); },
    categoryName: eventCategoryName,
    campus: campusOfEvent,
    categories: function () {                                   // chips: saved categories that have published events, A-Z
      var seen = {}, out = [];
      events.published().forEach(function (e) {
        if (!seen[e.categoryId] && db.eventCategories.get(e.categoryId)) { seen[e.categoryId] = true; out.push({ value: e.categoryId, label: eventCategoryName(e) }); }
      });
      return out.sort(function (a, b) { return a.label.localeCompare(b.label); });
    }
  };

  return { news: news, announcements: announcements, events: events };
})();
