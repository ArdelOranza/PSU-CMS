<?php
/** Events — public list and calendar of published events. */
$pageTitle  = 'Events';
$activeNav  = 'events';
$pageStyles = ['page.css', 'events.css'];
$pageScripts = array_merge(require __DIR__ . '/../includes/data-scripts.php', ['client-ui/js/events.js']);
require_once __DIR__ . '/../includes/page-open.php';
?>
<main id="main">
  <section class="page-hero">
    <div class="psu-container">
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="<?= psu_e(psu_url('index.php')) ?>">Home</a></li>
          <li aria-current="page">Events</li>
        </ol>
      </nav>
      <h1 class="page-hero-title">Events</h1>
      <p class="page-hero-sub" id="eventsSubtitle">Upcoming activities, programs, and celebrations.</p>
    </div>
  </section>

  <section class="page-section">
    <div class="psu-container">
      <div class="filter-row">
        <div class="filter-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <label class="psu-sr-only" for="eventSearch">Search events</label>
          <input class="filter-input" id="eventSearch" type="search" placeholder="Search events" autocomplete="off">
        </div>
        <div class="filter-select-wrap">
          <label class="psu-sr-only" for="eventCampus">Campus</label>
          <select class="filter-select" id="eventCampus"></select>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </div>
        <div class="view-toggle" role="group" aria-label="Choose view">
          <button type="button" id="viewList" data-view="list">List</button>
          <button type="button" id="viewCalendar" data-view="calendar">Calendar</button>
        </div>
      </div>

      <!-- List view only: category chips and status tabs -->
      <div id="eventListFilters">
        <div class="chip-row" id="eventChips" role="group" aria-label="Filter by category"></div>
        <div class="tab-bar" id="eventTabs" role="group" aria-label="Filter by status"></div>
      </div>

      <!-- PHP: the cards below are drawn by assets/js/events.js from the published events -->
      <div class="results" id="eventResults" aria-live="polite">
        <div class="event-grid" id="eventGrid"></div>
        <div id="eventEmpty"></div>
        <div id="eventPagination"></div>
      </div>

      <!-- Calendar view -->
      <div class="calendar" id="eventCalendar" hidden>
        <div class="calendar-head">
          <button type="button" class="calendar-nav" id="calPrev" aria-label="Previous month"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
          <h2 class="calendar-title" id="calTitle"></h2>
          <button type="button" class="calendar-nav" id="calNext" aria-label="Next month"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        </div>
        <div class="calendar-scroll">
          <table class="calendar-table">
            <thead>
              <tr><th scope="col">Sun</th><th scope="col">Mon</th><th scope="col">Tue</th><th scope="col">Wed</th><th scope="col">Thu</th><th scope="col">Fri</th><th scope="col">Sat</th></tr>
            </thead>
            <tbody id="calBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</main>
<?php require_once __DIR__ . '/../includes/page-close.php'; ?>
