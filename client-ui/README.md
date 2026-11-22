# client-ui: Contact, 404 and shared header/footer (Member 5)

Static HTML / CSS / vanilla JS. No frameworks, no CDN, no inline scripts or styles, so it
works under the CSP in `bootstrap.php` (`script-src 'self'; style-src 'self'`).

## Run it
From the repo root: `php -S localhost:8000`, then open
- `http://localhost:8000/client-ui/contact/contact.html`
- `http://localhost:8000/client-ui/utility/404.html`

(Any static server works. Opening the files directly with `file://` will not load the shared header/footer.)

## Folder map
| Path | Purpose |
|---|---|
| `includes/header.html`, `footer.html` | Shared components: edit navigation and footer links here only |
| `includes/header.php`, `footer.php` | PHP wrappers (same markup, fix up the `@/` links) |
| `css/variables.css` | PSU colour, type and spacing tokens, `@font-face` |
| `css/global.css`, `header.css`, `footer.css` | Shared styles (other modules may reuse these) |
| `css/contact.css`, `utility.css` | Page styles |
| `js/includes.js` | Loads header/footer into `<div data-include="header|footer">` |
| `js/header.js` | Active link, dropdowns, mobile menu, search panel |
| `js/contact.js`, `utility.js` | Page logic |

## Using the shared header on any page (teammates)
```html
<link rel="stylesheet" href="PATH/client-ui/css/variables.css">
<link rel="stylesheet" href="PATH/client-ui/css/global.css">
<link rel="stylesheet" href="PATH/client-ui/css/header.css">
<link rel="stylesheet" href="PATH/client-ui/css/footer.css">
<script src="PATH/client-ui/js/header.js" defer></script>
<script src="PATH/client-ui/js/includes.js" defer></script>   <!-- after header.js -->

<body data-root="../../" data-nav="news">   <!-- data-root: path from this page to the repo root -->
  <div data-include="header"></div>
  <main id="main"> ... </main>
  <div data-include="footer"></div>
```
`data-nav` values: `home`, `news`, `events`, `academics`, `faculty`, `resources`, `contact`.
In both components every internal link starts with `@/` (= repository root).

## PHP integration
```php
<?php $root = ''; include 'client-ui/includes/header.php'; ?>
<main id="main"> ... </main>
<?php include 'client-ui/includes/footer.php'; ?>
```
`$root` is the path from the current page to the repo root (`''` at root, `'../'` one folder deep).
Keep `<body data-nav="...">` and load `header.js` on the page. Do not use `data-include` in PHP pages.
The existing `site_header()` / `site_footer()` in `bootstrap.php` were left untouched.

## Known limits / TODO
- **Font:** Atkinson Hyperlegible Next is not in the repo. Add the `.woff2` to `assets/fonts/` and uncomment the `url()` in `css/variables.css`. Until then the fallback stack is used.
- **Contact form is client-side only.** Nothing is emailed. Valid submissions are stored in `localStorage` (`psu.contact.submissions`) as a demo. The existing PHP handler (`index.php?contact=1`, `feedback` table) already validates name, email, subject and message; the `campus` field has no column yet.
- **"I'm not a robot" is a labelled demo checkbox, not a CAPTCHA.** Replace it with a server-verified service before production.
- Success copy deliberately does not say a confirmation email was sent (the PDF wording does). Restore that wording once mail is connected.
- Search controls submit to the existing `index.php?q=`; campus footer links also run that search because no campus pages exist. Social icons link to `#` until official URLs are provided.
- Contact nav link points to `client-ui/contact/contact.html`; change it in `includes/header.html` if the CMS contact page moves.
- Serving `404.html` via Apache `ErrorDocument` needs root-absolute asset paths (the page uses relative paths).

---

## Academics (Member 3)

Six public pages in `client-ui/academics/`, built on the shared header, footer and styles above.

| Page | File | Opens with |
| --- | --- | --- |
| Colleges | `academics/colleges.html` | |
| College Details | `academics/college-details.html` | `?id=computing` |
| Departments | `academics/departments.html` | |
| Department Details | `academics/department-details.html` | `?id=information-technology` |
| Academic Programs | `academics/academic-programs.html` | |
| Academic Program Details | `academics/program-details.html` | `?id=bs-information-technology` |

**Files**

| File | Purpose |
| --- | --- |
| `css/academics.css` | All Academics styles. Every class starts with `ac-`. Uses the shared tokens in `variables.css`. |
| `js/academics-data.js` | The single data source (`window.PSUAcademics`): colleges, departments, programs, faculty, news. Swap this file for a PHP/JSON call later; the page scripts do not change. |
| `js/academics-common.js` | Shared helpers: safe DOM building, pager, search/filter controller that keeps its state in the URL. |
| `js/colleges.js`, `departments.js`, `programs.js` | The three directory pages (search, filters, pagination). |
| `js/academic-details.js` | Renders the three detail pages from `?id=`. |
| `assets/images/colleges/` | Put official college emblems here (see below). |
| `assets/documents/curriculum/` | Put official curriculum PDFs here (see below). |

**Shared files changed (Member 5, please review):** `includes/header.html` and `includes/footer.html`. Only the links for
Colleges, Departments and Academic Programs now point to the Academics pages instead of `index.php?type=...`.
`header.php` / `footer.php` read those files, so they need no change.

**How the data connects:** College → Departments → Programs by ID (`department.collegeId`, `program.collegeId` + `departmentId`).
Faculty belong to departments (`departmentIds`), news belongs to a department. Card counts ("8 programs · 5 departments")
are calculated from these records, never typed in. Open the browser console and run `PSUAcademics.validate()`; an empty
array means every relationship is valid.

**Sample data.** Values from the UX screens are used as they are. Records marked `sample: true` ("Sample Department 1 (CAS)",
"Sample Program 3 (ENG)", ...) are placeholders added so the counts and page numbers in the screens are produced by data.
Vision, mission and descriptions are the design's placeholder text. None of it is official PSU information.

**Search, filters, pagination.** Filters combine (AND). Changing a filter returns to page 1. The state lives in the URL
(`?q=...&campus=...&page=2`), so refresh, Back and shared links keep the same view.

**To add a real college emblem:** copy the image to `assets/images/colleges/` (e.g. `computing.png`), then set
`logo: 'assets/images/colleges/computing.png'` for that college in `js/academics-data.js`. Until then an initials badge is shown.

**To add a real curriculum PDF:** copy the file to `assets/documents/curriculum/`, then set
`curriculumFile: 'assets/documents/curriculum/bs-information-technology.pdf'` for that program. Until then the Download button
opens `placeholder-curriculum.pdf` and says it is a placeholder.

**Open with a local server** (the header/footer are loaded with `fetch`): `php -S localhost:8000` from the repo root, then
`http://localhost:8000/client-ui/academics/colleges.html`.

**Not included:** a programs list inside Department Details (it is not in the UX screen), real login/admin editing of this data
(the admin screens use their own sample data and are not connected yet), and the brand font files (see "Known limits / TODO" above; the Academics pages use the shared font stack automatically once it is added).
