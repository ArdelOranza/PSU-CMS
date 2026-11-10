/* ==========================================================================
   announcement-rules.js — expiry and visibility rules shared by the
   Announcements screens and Global Search.
   "Expired" is never stored; it is worked out from expiresAt every time.
   PHP: move these checks into the SQL query (WHERE status='published' AND
   (expires_at IS NULL OR expires_at >= CURDATE())).
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.announcementRules = (function () {
  function today() { return CMS.ui.todayISO(); }

  /* 'published' + a past expiration date becomes 'expired' */
  function effectiveStatus(a) {
    if (a.status === 'published' && a.expiresAt && a.expiresAt < today()) return 'expired';
    return a.status;
  }
  function statusLabel(key) {
    if (key === 'expired') return 'Expired';
    var list = CMS.config.announcementStatuses;
    for (var i = 0; i < list.length; i++) if (list[i].value === key) return list[i].label;
    return key;
  }
  /* Shown on the public site / public search: published, started, not expired */
  function isActive(a) {
    return effectiveStatus(a) === 'published' && (!a.publishedAt || a.publishedAt <= today());
  }
  /* All-campus announcements appear in every campus view; others only in theirs.
     No campus given = no campus filtering. */
  function visibleForCampus(a, campus) {
    if (!campus) return true;
    return a.campus === CMS.config.allCampuses || a.campus === campus;
  }
  return { effectiveStatus: effectiveStatus, statusLabel: statusLabel, isActive: isActive, visibleForCampus: visibleForCampus };
})();
