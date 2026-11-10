/* ==========================================================================
   event-rules.js — event status and category lookups shared by the Events
   screens and Global Search.
   Upcoming / Ongoing / Completed are never stored: they are worked out from
   the event dates and times each time a page loads. A stored "draft" stays
   a draft.
   PHP: do the same comparison in SQL or in the view model.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.eventRules = (function () {
  var LABELS = { draft: 'Draft', upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed' };

  function toDate(day, time, fallbackTime) {
    var d = new Date(day + 'T' + (time || fallbackTime));
    return isNaN(d.getTime()) ? null : d;
  }

  /* 'draft' | 'upcoming' | 'ongoing' | 'completed' */
  function effectiveStatus(ev, now) {
    if (ev.state !== 'published') return 'draft';
    now = now || new Date();
    var start = toDate(ev.startDate, ev.startTime, '00:00');
    var end = toDate(ev.endDate || ev.startDate, ev.endTime, '23:59');
    if (!start) return 'upcoming';
    if (now < start) return 'upcoming';
    if (end && now > end) return 'completed';
    return 'ongoing';
  }
  function statusLabel(key) { return LABELS[key] || key; }

  /* Category name for an event (ids keep working when a category is renamed) */
  function categoryName(categoryId) {
    var cat = CMS.db.eventCategories.get(categoryId);
    return cat ? cat.name : 'Uncategorized';
  }
  /* '8:00 AM \u2013 5:00 PM' or '9:00 AM' */
  function timeText(ev) {
    var a = CMS.ui.formatTime(ev.startTime), b = CMS.ui.formatTime(ev.endTime);
    return a && b ? a + ' \u2013 ' + b : (a || b || '');
  }
  function dateText(ev) {
    return CMS.ui.formatDate(ev.startDate);
  }
  return { effectiveStatus: effectiveStatus, statusLabel: statusLabel, categoryName: categoryName, timeText: timeText, dateText: dateText };
})();
