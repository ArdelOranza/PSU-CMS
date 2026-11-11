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

## University Structure & User Management (Member 3)
Screens: `colleges/`, `departments/`, `programs/`, `users/` (9 screens, matching the Member 3 design document).

| File | Purpose |
| --- | --- |
| `js/structure-seed.js` | First-run sample data (colleges, departments, programs, roles, users, extra faculty). |
| `js/structure-db.js` | Adds `CMS.db.colleges / departments / programs / roles / users` and the shared helpers in `CMS.structure` (lookups, delete rules, generic list page, validation helper). Does **not** edit `storage.js`. |
| `js/colleges.js`, `departments.js`, `programs.js`, `users.js`, `roles.js` | One script per module (list + add/edit form where both exist). |
| `js/combobox.js` + `css/cms-combobox.css` | Reusable searchable dropdown (used for Department Head). Any module may reuse it. |
| `css/structure.css`, `colleges.css`, `departments.css`, `programs.css`, `users.css` | Styles (prefixes `structure-`, `college-`, `department-`, `program-`, `user-`, `role-`). |

How the data connects (all by ID): `department.collegeId` → college, `program.collegeId` + `program.departmentId`,
`department.headId` → `CMS.db.faculty`, `user.roleId` → role. Dropdowns read these datasets; nothing is hard-coded.
Rules (front-end only): a college with departments/programs, a department with programs, and a role with users cannot be
deleted; codes/emails/usernames/role names must be unique; the signed-in demo user cannot be deleted.

Notes for the team:
- The sidebar groups **University Structure** and **User Management** replaced the two placeholder links in every page.
- `structure-db.js` adds 4 sample faculty (the department heads shown in the design) to `CMS.db.faculty` once;
  the existing faculty records are not changed.
- Passwords on Add New User are validated and then discarded — nothing is stored. There is no real login or permission check.
- Images are saved as small JPEG data URLs (the site CSP blocks `blob:` URLs).
- Fields beyond the screenshots (vision, mission, header image, department email/office/hours, campus, accreditation,
  career prospects, admission criteria, syllabus file name) exist in the data model but have no form inputs yet.
  They show in the **View** dialogs once filled.
- PHP: colleges/departments/programs need their own tables (they are not `content` rows with these fields), and users
  need `username`, `status`, `last_login` and a role reference. Hash passwords with `password_hash()` on the server.

## Git
Never push to `main`. Work on `feature/news-announcements-events-search`, push that branch, and open a pull request.
