(function () {
  'use strict';

  var results = [
    {
      category: 'News',
      filter: 'news',
      title: 'Enrollment schedule for the second semester',
      excerpt: 'Short excerpt that shows where the word enrollment appears in the page content.',
      meta: 'Oct 5, 2026  ·  All Campuses',
    },
    {
      category: 'Documents',
      filter: 'documents',
      title: 'Online Enrollment Procedure',
      excerpt: 'Step-by-step guide on enrollment for new and returning students.',
      meta: 'PDF  ·  1.1 MB',
    },
    {
      category: 'Events',
      filter: 'events',
      title: 'Enrollment Period for First Year Students',
      excerpt: 'Lingayen-Main Campus',
      meta: 'Nov 4, 2026',
    },
    {
      category: 'Announcements',
      filter: 'announcements',
      title: 'Reminder on submission of enrollment requirements',
      excerpt: 'Short excerpt that shows where the word enrollment appears in the notice.',
      meta: 'Sep 25, 2026  ·  Urdaneta',
    },
    {
      category: 'Academic Programs',
      filter: 'programs',
      title: 'BS Information Technology',
      excerpt: 'Admission criteria and enrollment requirements for the program.',
      meta: 'College of Computing',
    },
  ];

  var counts = {
    all: 24,
    news: 8,
    announcements: 4,
    events: 4,
    documents: 4,
    faculty: 4,
  };
  var params = new URLSearchParams(window.location.search);
  var filterOptions = ['all', 'news', 'announcements', 'events', 'documents', 'faculty', 'programs'];
  var requestedFilter = params.get('type');
  var query = (params.get('q') || 'enrollment').trim();
  var selectedFilter = filterOptions.indexOf(requestedFilter) === -1
    ? 'all'
    : requestedFilter;
  var input = document.getElementById('search-page-input');
  var summary = document.getElementById('search-results-summary');
  var panel = document.getElementById('search-results-panel');
  var resultsList = document.getElementById('search-results-list');
  var noResults = document.getElementById('search-no-results');
  var noResultsTitle = document.getElementById('search-no-results-title');
  var pagination = document.getElementById('search-pagination');
  var filterButtons = Array.prototype.slice.call(
    document.querySelectorAll('[data-filter]'),
  );

  function matchesQuery(result, terms) {
    var searchable = [
      result.category,
      result.title,
      result.excerpt,
      result.meta,
    ].join(' ').toLocaleLowerCase().split(/[^a-z0-9]+/);
    return terms.every(function (term) {
      return searchable.some(function (word) {
        return word.indexOf(term) === 0;
      });
    });
  }

  function createResultCard(result) {
    var article = document.createElement('article');
    var category = document.createElement('span');
    var title = document.createElement('h2');
    var excerpt = document.createElement('p');
    var meta = document.createElement('p');

    article.className = 'search-result-card';
    article.setAttribute('role', 'listitem');
    category.className = 'search-result-category';
    category.textContent = result.category;
    title.textContent = result.title;
    excerpt.textContent = result.excerpt;
    meta.className = 'search-result-meta';
    meta.textContent = result.meta;
    article.append(category, title, excerpt, meta);
    return article;
  }

  function render() {
    var terms = query.toLocaleLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    var matched = results.filter(function (result) {
      return (selectedFilter === 'all' || result.filter === selectedFilter) &&
        matchesQuery(result, terms);
    });
    var count = query.toLocaleLowerCase() === 'enrollment' && counts[selectedFilter]
      ? counts[selectedFilter]
      : matched.length;
    var hasResults = matched.length > 0;

    input.value = query;
    summary.textContent = count + ' ' + (count === 1 ? 'result' : 'results') +
      ' for “' + query + '”';
    summary.hidden = !hasResults;
    panel.hidden = !hasResults;
    pagination.hidden = !hasResults;
    noResults.hidden = hasResults;
    noResultsTitle.textContent = 'No results found for “' + query + '”';

    filterButtons.forEach(function (button) {
      var selected = button.getAttribute('data-filter') === selectedFilter;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    resultsList.replaceChildren();
    matched.forEach(function (result) {
      resultsList.appendChild(createResultCard(result));
    });
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      selectedFilter = button.getAttribute('data-filter');
      render();
    });
  });

  document.getElementById('search-page-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var nextQuery = input.value.trim();
    var url = new URL(window.location.href);
    if (nextQuery) {
      url.searchParams.set('q', nextQuery);
    } else {
      url.searchParams.delete('q');
    }
    url.searchParams.delete('type');
    window.location.assign(url.toString());
  });

  render();
})();
