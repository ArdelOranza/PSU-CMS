<?php
/** Announcement Details — one active announcement (opened with ?id=...). */
$pageTitle  = 'Announcement';
$activeNav  = 'news';
$pageStyles = ['page.css', 'announcements.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/announcement-details.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li><a href="<?= psu_e(psu_url('client-ui/announcements/announcements.php')) ?>">Announcements</a></li>
          <li aria-current="page">Article</li>
        </ol>
      </nav>
      <div class="page-hero-tags" id="articleTags"></div>
      <h1 class="page-hero-detail" id="articleTitle">Announcement</h1>
      <p class="page-hero-meta" id="articleMeta"></p>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <!-- PHP: fill from the announcement row loaded with ?id= -->
      <div class="detail-layout">
        <article class="detail-main" id="articleMain"></article>
        <aside aria-labelledby="otherTitle">
          <h2 class="side-title" id="otherTitle">Other Announcements</h2>
          <ul class="side-list" id="otherList"></ul>
        </aside>
      </div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
