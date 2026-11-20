# admin-ui — CMS front-end prototype

Static HTML / CSS / vanilla JS / Bootstrap 5 screens for the PSU CMS admin panel
(News, Announcements, Events, Global Search). Data is kept in `localStorage`;
there is no backend. This folder does not touch any existing PHP file.

## Run it
Open `admin-ui/index.html` in a browser, or from the repo root run `php -S localhost:8000`
and visit `http://localhost:8000/admin-ui/`.

## Folder map
| Path | Purpose |
|---|---|
| `news/`, `announcements/`, `events/`, `search/` | One HTML file per screen |
| `css/cms-*.css` | Shared design tokens, layout and components |
| `css/news.css` etc. | Module styles (class prefixes `news-`, `announcement-`, `event-`, `search-`) |
| `js/config.js` | Feature flags, campus list, categories, page sizes, upload limits |
| `js/seed-data.js` | Sample data (first run only; never overwrites saved data) |
| `js/storage.js` | Repositories: `CMS.db.news.list() / get(id) / save(record) / remove(id)` |
| `js/sanitize.js` | Allow-list HTML sanitizer for rich text |
| `js/richtext.js` | Rich-text editor (bold, italic, underline, lists, link, image) |
| `js/announcement-rules.js` | Expiry / active / campus-visibility rules (also used by Search) |
| `js/event-rules.js` | Upcoming / Ongoing / Completed status and category lookups (also used by Search) |
| `js/search-sources.js`, `js/search.js` | Global Search: one entry per content type (add or replace sources here), plus the page logic |
| `js/news.js`, `js/announcements.js`, `js/events.js`, `js/categories.js` | Page logic for each module |
| `js/ui.js` | Toasts, confirm/detail modals, pagination, custom selects, highlight, image reader |
| `js/layout.js` | Sidebar/header behavior (active link, groups, mobile drawer, header search) |
| `vendor/` | Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Inter font — **local on purpose** (see CSP) |

## Why Bootstrap is vendored
`bootstrap.php` sends `script-src 'self'; style-src 'self'`, so CDN files and inline
scripts/styles are blocked when pages are served through PHP. Rules used here:
no inline `<script>`, `onclick=""` or `style=""`; no `blob:` URLs (images use data URLs).

## Testing helpers (browser console)
- `CMS.dev.clearEvents()` then reload All Events → empty state
- `CMS.dev.resetAll()` → restore the sample data
- `CMS.dev.clearAll()` → remove all data

## Optional features
`CMS.config.features` in `js/config.js`: `campus` and `priority`. Set to `false` to remove them;
the layout falls back to the original screenshots.

## Converting to PHP views later
- Shared sidebar/header HTML is inside `<!-- BEGIN SHARED -->` / `<!-- END SHARED -->` comments in every page →
  move into `partials/sidebar.php` / `partials/header.php` and `include` them.
- `<body data-page="...">` picks the active sidebar link → make it a PHP variable.
- Rename `.html` → `.php` and update links (single pattern).
- Replace the bodies of `read()` / `write()` in `js/storage.js` (or the repositories) with calls to PHP endpoints.
- `js/sanitize.js` is only a front-end safeguard — sanitize and escape on the server too.
- The existing `content` table has no author, category, expiration, campus, priority, or
  "Pending Review"/"Archived" status; the schema will need those columns.
- Add CSRF tokens to forms (marked with `<!-- PHP: ... -->` comments).

## Messages, Feedback & Settings module
Branch: `feature/messages-feedback-settings`. Pages: `messages/` (All Messages — including its empty
state, Unread Messages, Feedback, Message Details), `settings/` (Account, Security, Theme) and the public
`contact/contact-form.html`.

| File | Purpose |
|---|---|
| `js/message-store.js` | One `messages` dataset (`CMS.db.messages`) + `CMS.messages` helpers, used by every message page |
| `js/settings-store.js` | One-record repos `account`, `security`, `theme` + header name/avatar sync |
| `js/messages.js`, `js/message-details.js`, `js/feedback-details.js`, `js/contact.js` | List pages, Message Details + simulated reply, Feedback Details, public form |
| `js/account.js`, `js/security.js`, `js/theme-page.js` | Settings pages |
| `js/theme.js` | Applies the saved theme; load it in `<head>` (`<script src="../js/theme.js">`) |
| `js/csv.js` | CSV export (escapes commas/quotes/line breaks; `data:` URL, not `blob:`) |
| `css/messages.css`, `settings.css`, `contact.css`, `theme.css` | Module styles; `theme.css` holds Modern Light / Campus Dark |

- Status values: `unread`, `read`, `responded`. Feedback shows these as New (unread) / Reviewed (read, responded).
- Opening a message does **not** mark it read (the design shows Mark as Read on that screen).
- Everything is a front-end simulation: no email is sent, passwords are validated and discarded (never stored),
  the honeypot and 5-per-15-minutes throttle only run in this browser.
- Console helper: `CMS.dev.clearMessages()` then reload All Messages → empty state.
- **Theme on other pages:** add `<script src="../js/theme.js"></script>` to the `<head>` and
  `<link rel="stylesheet" href="../css/theme.css">` after the other stylesheets.
- **PHP schema:** the `feedback` table needs `campus_department`, `type` (`inquiry`/`feedback`), `rating`, `category`,
  `reply_subject`/`reply_body`/`replied_at`, and status `unread`/`read`/`responded` (currently `new`/`read`).

## Git
Never push to `main`. Work on your own feature branch (e.g. `feature/news-announcements-events-search`), push that branch, and open a pull request.
