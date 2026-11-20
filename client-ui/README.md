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
