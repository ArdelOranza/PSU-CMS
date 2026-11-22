<?php
/** News Details — one published article (opened with ?id=...). */
$pageTitle  = 'News Article';
$activeNav  = 'news';
$pageStyles = ['page.css', 'news.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/news-details.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li><a href="<?= psu_e(psu_url('client-ui/news/news.php')) ?>">News</a></li>
          <li aria-current="page">Article</li>
        </ol>
      </nav>
      <div class="page-hero-tags" id="articleTags"></div>
      <h1 class="page-hero-detail" id="articleTitle">News article</h1>
      <p class="page-hero-meta" id="articleMeta"></p>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <!-- PHP: fill from the news row loaded with ?id= -->
      <div class="detail-layout">
        <article class="detail-main" id="articleMain"></article>
        <aside aria-labelledby="latestTitle">
          <h2 class="side-title" id="latestTitle">Latest News</h2>
          <ul class="side-list" id="latestList"></ul>
        </aside>
      </div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
