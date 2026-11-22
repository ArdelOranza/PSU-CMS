<?php
/**
 * data-scripts.php: scripts every public News / Announcements / Events page loads BEFORE its own.
 * They are the data layer of the admin prototype (admin-ui/js), so the public pages show what the
 * admin screens save in localStorage. PHP: replace client-ui/js/public-data.js with database queries
 * and keep the same field names.
 *   $pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/news.js']);
 */
return [
    'admin-ui/js/config.js',
    'admin-ui/js/seed-data.js',
    'admin-ui/js/sanitize.js',
    'admin-ui/js/storage.js',
    'admin-ui/js/ui.js',
    'admin-ui/js/announcement-rules.js',
    'admin-ui/js/event-rules.js',
    'client-ui/js/public-ui.js',
    'client-ui/js/public-data.js',
];
