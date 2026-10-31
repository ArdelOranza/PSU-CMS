# PSU Urdaneta Campus Content Management System

A feature-focused PHP 8+ and MySQL CMS based on the system features in `teams-and-roles.pdf`. Team assignments and member names are intentionally not represented in the software.

## Features

- Responsive public homepage and navigation
- Content management for homepage/pages, news, announcements, events, colleges, departments, academic programs, faculty/staff, documents, and media
- Draft and published states, with public views restricted to published content
- Search across published titles, summaries, and body content
- Image and file uploads with MIME allowlists and a 12 MB limit
- Public file download links
- Contact / feedback form and admin inbox
- Dashboard counts for published content, drafts, and unread feedback
- Session-based admin login, password hashing, CSRF checks, and one-time administrator setup
- Security hardening: login throttling, security headers, CSP, safe upload paths, upload cleanup, server-side feedback validation, and admin session timeout

## Requirements

PHP 8.0+ with PDO MySQL, Fileinfo, mbstring, and GD extensions; MySQL 5.7+ or MariaDB 10.3+; Apache with `mod_rewrite`/`.htaccess` support or equivalent server rules. GD is required for image uploads: uploaded images are re-encoded server-side (strips EXIF metadata and polyglot payloads), and image uploads fail safely if GD is not available.

## Install

1. Create a MySQL database and a dedicated database user with only the privileges this application needs. Import `schema.sql` (it creates `psu_cms` if needed).
2. Copy `config.sample.php` to `config.php`, then set the database credentials and site name. Do not deploy with a root or passwordless database account.
3. Point the web server document root to this directory and ensure PHP can write to `uploads/`.
4. Open `setup.php` and create the first admin using a password with at least 12 characters.
5. Delete or restrict `setup.php` after the first administrator has been created.
6. Sign in at `admin.php`; add pages and content, then set each item to Published when ready.

Existing installations should run `migrations/2026-10-21-security-hardening.sql` once (creates the `login_attempts` table used by login throttling) and `migrations/2026-10-27-feedback-throttle.sql` once (creates the `feedback_attempts` table used by the persistent feedback rate limit). If a table is missing, the application self-heals by creating it opportunistically and logs the problem.

## Security notes

- Use HTTPS in production. Set `trust_proxy_headers` to `true` only behind a trusted reverse proxy that overwrites `X-Forwarded-Proto` and `X-Forwarded-For`, **and only when network controls (firewall rules, security groups, or ACLs) block clients from reaching the origin directly**. A proxy that merely overwrites forwarded headers is not enough: if clients can bypass the proxy and hit the origin, they control `X-Forwarded-For` themselves, which bypasses the login/feedback IP throttles and falsifies logged IPs. When `trust_proxy_headers` is `false` (the default), `REMOTE_ADDR` is used and cannot be forged.
- Keep `config.php`, `bootstrap.php`, `schema.sql`, migrations, tests, and dotfiles outside the public web surface. The provided `.htaccess` denies them on Apache; configure equivalent rules for Nginx or another server.
- `uploads/` must never execute scripts. The provided `uploads/.htaccess` blocks common script handlers and CGI execution; replicate that protection on other servers.
- Security headers and a same-origin Content Security Policy are emitted from `bootstrap.php`. If you add external fonts, scripts, or styles, update the CSP deliberately.
- Public feedback is rate limited by persistent server-side storage (`feedback_attempts`, keyed by requester IP, `feedback_limit` per 15 minutes, default 5). Dropping the session does not reset the limit. Failed validations are not counted. Behind a shared NAT/CGNAT address, the per-IP budget is shared by those visitors; tune `feedback_limit` if needed.
- Login throttling blocks an email after 5 failed attempts or an IP after 20 failed attempts in 15 minutes. This can temporarily lock out a legitimate account; review logs and adjust if needed.
- Uploaded files are served directly from `uploads/`. For stronger isolation, move them outside the document root and serve them through an authenticated proxy.
- `setup.php` is a high-risk endpoint. Delete it or deny access to it after the first administrator exists.
- Uploaded documents are not malware-scanned. Only administrators can upload, but consider adding scanning if that changes.

## Testing

`tests/security_test.php` is an optional regression suite. It needs PHP 8 with cURL, a running web server for this directory, and a disposable MySQL/MariaDB database. The test database name must end in `_test`; the suite drops and recreates it.

Set the environment variables and point `config.php` at the same test database:

```powershell
$env:PSU_TEST_DSN='mysql:host=127.0.0.1;port=3306;charset=utf8mb4'
$env:PSU_TEST_DB_USER='root'
$env:PSU_TEST_DB_PASS=''
$env:PSU_TEST_BASE_URL='http://127.0.0.1:8080'
php tests/security_test.php
```

Do not point `PSU_TEST_DSN` at a database you care about.

## Notes

- The homepage uses a published `Pages` item with slug `homepage` when available; otherwise it shows built-in welcome copy.
- Existing image/file attachments are retained if an edit does not include a replacement upload.
- Uploaded assets are stored under `uploads/images/` and `uploads/files/`.
- See `SECURITY-AUDIT.md` for the security review, fixed findings, and residual risks.
