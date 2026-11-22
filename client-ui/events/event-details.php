<?php
/** Event Details — one published event (opened with ?id=...). */
$pageTitle  = 'Event';
$activeNav  = 'events';
$pageStyles = ['page.css', 'events.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/event-details.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li><a href="<?= psu_e(psu_url('client-ui/events/events.php')) ?>">Events</a></li>
          <li aria-current="page" id="crumbTitle">Event</li>
        </ol>
      </nav>
      <div class="page-hero-tags" id="eventTags"></div>
      <h1 class="page-hero-detail" id="eventTitle">Event</h1>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <!-- PHP: fill from the event row loaded with ?id= -->
      <div class="detail-layout">
        <article class="detail-main" id="eventMain"></article>
        <aside class="event-side" aria-labelledby="eventSideTitle">
          <h2 class="side-title" id="eventSideTitle">Event Details</h2>
          <dl class="event-facts" id="eventFacts"></dl>
          <a class="psu-btn psu-btn-outline event-back" href="<?= psu_e(psu_url('client-ui/events/events.php')) ?>">Back to all events</a>
        </aside>
      </div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
