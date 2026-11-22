<?php
/** News — public list with search, campus and category filters. */
$pageTitle  = 'News';
$activeNav  = 'news';
$pageStyles = ['page.css', 'news.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/news.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li aria-current="page">News</li>
        </ol>
      </nav>
      <h1 class="page-hero-title">News</h1>
      <p class="page-hero-sub">Latest stories and updates from the university.</p>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <div class="filter-row">
        <div class="filter-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <label class="psu-sr-only" for="newsSearch">Search news</label>
          <input class="filter-input" id="newsSearch" type="search" placeholder="Search news" autocomplete="off">
        </div>
        <div class="filter-select-wrap">
          <label class="psu-sr-only" for="newsCampus">Campus</label>
          <select class="filter-select" id="newsCampus"></select>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </div>
      </div>
      <div class="chip-row" id="newsChips" role="group" aria-label="Filter by category"></div>

      <!-- PHP: the cards below are drawn by assets/js/news.js from the published news; a database loop can replace it -->
      <div class="results" id="newsResults" aria-live="polite">
        <div class="news-grid" id="newsGrid"></div>
        <div id="newsEmpty"></div>
      </div>
      <div id="newsPagination"></div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
