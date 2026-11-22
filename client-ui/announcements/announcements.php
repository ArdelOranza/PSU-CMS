<?php
/** Announcements — public list of active announcements with search and campus filter. */
$pageTitle  = 'Announcements';
$activeNav  = 'news';
$pageStyles = ['page.css', 'announcements.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/announcements.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li aria-current="page">Announcements</li>
        </ol>
      </nav>
      <h1 class="page-hero-title">Announcements</h1>
      <p class="page-hero-sub">Official notices and public announcements.</p>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <div class="filter-row">
        <div class="filter-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <label class="psu-sr-only" for="announcementSearch">Search announcements</label>
          <input class="filter-input" id="announcementSearch" type="search" placeholder="Search announcements" autocomplete="off">
        </div>
        <div class="filter-select-wrap">
          <label class="psu-sr-only" for="announcementCampus">Campus</label>
          <select class="filter-select" id="announcementCampus"></select>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </div>
      </div>

      <!-- PHP: the rows below are drawn by assets/js/announcements.js from the active announcements -->
      <div class="results" id="announcementResults" aria-live="polite">
        <ul class="announcement-list" id="announcementList"></ul>
        <div id="announcementEmpty"></div>
      </div>
      <div id="announcementPagination"></div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
