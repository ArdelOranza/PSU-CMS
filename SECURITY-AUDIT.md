# Security Audit — PSU Urdaneta Campus CMS

**Audit date:** 2026-10-21  
**Scope:** PHP 8 / MySQL CMS at commit `23af39f` plus the hardening changes in this working tree  
**Method:** Manual source review and threat modeling, followed by dynamic regression tests against PHP 8.2.12 and MariaDB 10.4.32. All PHP files were also checked with `php -l`.

## Result

The initial code had several exploitable or deployment-critical weaknesses. The high and medium findings below were fixed in this working tree and are covered by `tests/security_test.php`.

```text
44 passed, 0 failed
```

The main remaining risk is operational: `setup.php` must be removed or blocked after the first administrator is created, and the web server must enforce the same file protections as the supplied `.htaccess` files.

## Findings

| ID | Severity | Finding | Location | Status |
|----|----------|---------|----------|--------|
| SEC-01 | High | CSRF validation accepted an empty token when the session had no token | `bootstrap.php` (`check_csrf`) | Fixed |
| SEC-02 | High | No brute-force protection on administrator login | `admin.php` | Fixed |
| SEC-03 | High | Installer had a race condition and no atomic guard | `setup.php` | Fixed |
| SEC-04 | Medium | No security headers or clickjacking protection | `bootstrap.php` | Fixed |
| SEC-05 | Medium | Logout was a GET request with no CSRF check | `admin.php` | Fixed |
| SEC-06 | Medium | Hidden upload-path fields accepted arbitrary URLs | `admin.php` | Fixed |
| SEC-07 | Medium | Uploads were not removed after delete or replacement | `admin.php` | Fixed |
| SEC-08 | Medium | Public feedback had no server-side validation or rate limit | `index.php` | Fixed |
| SEC-09 | Medium | Uncaught exceptions could disclose PHP/SQL details | `bootstrap.php` | Fixed |
| SEC-10 | Medium | Array-valued request parameters caused TypeErrors and error output | `bootstrap.php` | Fixed |
| SEC-11 | High (deployment) | `.git`, dotfiles, and project files could be served if deployed from the repository root | `.htaccess`, `.gitignore` | Fixed for Apache |
| SEC-12 | Medium (deployment) | Sample config encouraged root/passwordless database access | `config.sample.php` | Fixed |
| SEC-13 | Low | Upload directory protection covered only three script extensions | `uploads/.htaccess` | Fixed |
| SEC-14 | Low | Login timing allowed user enumeration | `admin.php` | Fixed |
| SEC-15 | Low | Search did not escape SQL `LIKE` wildcards | `index.php` | Fixed |
| SEC-16 | Medium | Session hardening gaps (strict mode, idle timeout, proxy HTTPS, cookie cleanup) | `bootstrap.php`, `admin.php`, `setup.php` | Fixed |
| SEC-17 | Low | Unbounded search input and feedback spam/DoS | `index.php` | Fixed |
| SEC-18 | Low | No security event logging | `bootstrap.php`, `admin.php`, `setup.php` | Partially fixed |
| SEC-19 | Low | Installer lacked server-side email/password bounds | `setup.php` | Fixed |
| SEC-20 | Medium | Feedback rate limit lived in the visitor session; a fresh session reset it | `index.php` | Fixed |
| SEC-21 | Low | Apache file blocklists matched backup extensions case-sensitively; `config.php.BAK` was servable | `.htaccess`, `uploads/.htaccess` | Fixed |
| SEC-22 | Medium (deployment) | `trust_proxy_headers` trust was safe only if clients cannot reach the origin directly; direct access allows X-Forwarded-For spoofing that bypasses IP throttles | `bootstrap.php`, README | Documented |

### SEC-01 — CSRF empty-token bypass

**Severity:** High  
**CWE:** CWE-352

The original check was:

```php
hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')
```

If both values were missing, `hash_equals('', '')` returned `true`. A fresh session could therefore submit a POST without a token. The regression suite reproduced this against `setup.php` and the public feedback endpoint.

**Fix:** `check_csrf()` now requires both values to be non-empty strings before `hash_equals()`, and login/setup rotate the token with `csrf_rotate()`.

### SEC-02 — Administrator login brute force

**Severity:** High  
**CWE:** CWE-307

There was no attempt limit, delay, or lockout on `admin.php` login. An attacker could guess passwords indefinitely.

**Fix:** Added the `login_attempts` table and a 15-minute throttle:

- 5 failures for the same email, or
- 20 failures from the same IP.

Failed attempts are recorded, successful logins clear the email counter, and throttled attempts return HTTP 429 with a generic message. Login failures and throttles are written to the PHP error log. The password check now runs against a dummy bcrypt hash for unknown emails to reduce timing differences.

**Operational note:** A determined attacker can temporarily lock out a known email by failing five times. Review logs and tune the thresholds if this becomes a problem.

### SEC-03 — Installer race condition

**Severity:** High  
**CWE:** CWE-362, CWE-384

`setup.php` read the administrator count and then inserted without a lock. Concurrent requests could both observe zero administrators. The installer also had no server-side email validation and only a minimum password length.

**Fix:** The installer now takes a MySQL advisory lock (`GET_LOCK`), rechecks the count inside the lock, inserts once, regenerates the session ID, and rotates the CSRF token. Name, email, and password lengths are validated server-side.

**Residual risk:** Anyone who reaches an unconfigured deployment first can create the first administrator. Delete or block `setup.php` immediately after setup.

### SEC-04 — Missing security headers and clickjacking protection

**Severity:** Medium  
**CWE:** CWE-1021, CWE-693

The application sent no CSP, frame protection, MIME-sniffing protection, referrer policy, or HSTS.

**Fix:** `send_security_headers()` now sends:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- A same-origin CSP with `frame-ancestors 'none'`, `object-src 'none'`, and no `unsafe-inline`
- HSTS when the request is detected as HTTPS

The inline delete confirmation handler was replaced with `assets/app.js`, so the CSP does not need `unsafe-inline`.

### SEC-05 — GET logout without CSRF

**Severity:** Medium  
**CWE:** CWE-352

`admin.php?logout=1` destroyed the session on a GET request. A third-party page could force an administrator to sign out.

**Fix:** Logout is now a POST form with a CSRF token. GET requests to `?logout=1` return HTTP 405. The session cookie is explicitly cleared.

### SEC-06 — Stored upload-path injection

**Severity:** Medium  
**CWE:** CWE-79, CWE-601

When editing content without a replacement upload, the hidden `old_image`, `old_file`, and `old_file_name` fields were trusted. An administrator could store values such as `javascript:alert(1)` or an external tracking URL, which were then rendered as an image source or download link.

**Fix:** `safe_upload_path()` accepts only:

```text
uploads/images/<32 hex>.{jpg|png|gif|webp}
uploads/files/<32 hex>.{pdf|doc|docx|txt|zip}
```

Legacy rows are also validated when rendered, so previously stored bad values are not output. File names are stripped of control characters and capped at 255 bytes.

### SEC-07 — Orphaned public uploads

**Severity:** Medium  
**CWE:** CWE-459

Deleting content or replacing an attachment left the old file in `uploads/`. The file remained publicly reachable after the content was removed.

**Fix:** `cleanup_orphaned_upload()` checks whether any remaining content row references the path, then removes the file. Cleanup runs after delete, after replacing an attachment, and when a save fails after a new file was uploaded. Removal failures are logged.

### SEC-08 — Public feedback abuse and validation gaps

**Severity:** Medium  
**CWE:** CWE-20, CWE-770

The feedback endpoint accepted unlimited, unbounded submissions and relied on client-side `maxlength` and `type=email`. Invalid or oversized data could produce database errors; automated submissions could fill the inbox.

**Fix:** The server now validates name, email, subject, and message lengths and uses `filter_var()` for the email. It returns HTTP 422 for validation errors. Submissions are rate limited from persistent server-side storage: the `feedback_attempts` table records the requester IP for every accepted submission and blocks submissions once `feedback_limit` (config, default 5) is reached within 15 minutes. The limit therefore survives fresh sessions; dropping cookies does not reset it. The table self-heals if missing. Database failures return a generic error.

**Residual risk:** The limit is keyed by requester IP — REMOTE_ADDR when `trust_proxy_headers` is off, so it cannot be forged; behind a trusted proxy it depends on the proxy isolation requirement in the README (clients must not reach the origin directly). Visitors sharing one NAT address share the budget; CAPTCHA remains an option for heavier abuse.

### SEC-09 — Error disclosure

**Severity:** Medium  
**CWE:** CWE-209

Uncaught PDO exceptions and TypeErrors could print SQL, paths, or stack traces when `display_errors` was enabled.

**Fix:** `display_errors` is disabled, errors are logged, and a global exception handler returns a generic 500 page. User-facing validation errors use explicit messages, while unexpected exceptions are logged and redacted.

### SEC-10 — Array-valued request parameters

**Severity:** Medium  
**CWE:** CWE-20

Requests such as `?q[]=x` or `csrf[]=x` reached `trim()`, `hash_equals()`, or array lookups and produced TypeErrors. Because output had already started on some pages, the error text could be returned with HTTP 200.

**Fix:** All scalar `$_GET` and `$_POST` values are checked before any output. Array-valued parameters are rejected with HTTP 400. Upload structures are validated separately in `upload_file()`.

### SEC-11 — Repository and dotfile exposure

**Severity:** High if deployed directly from a Git checkout  
**CWE:** CWE-538, CWE-200

The original `.htaccess` denied four files but did not block `.git`, `.env`, arbitrary `.sql` files, migrations, or tests. A cloned deployment could expose source history or database files.

**Fix:** `.htaccess` now blocks dotfiles, `.git`, `migrations/`, `tests/`, SQL/log/lock/backup files, and documentation. `.gitignore` excludes `config.php` and runtime uploads. The README documents equivalent Nginx rules.

**Verification note:** `.htaccess` behavior was reviewed statically; the dynamic test suite uses PHP's built-in server, which ignores `.htaccess`. Test the rules on the target Apache/Nginx deployment.

### SEC-12 — Insecure sample configuration

**Severity:** Medium (deployment)  
**CWE:** CWE-1188

`config.sample.php` suggested `root` with an empty password.

**Fix:** The sample now uses a dedicated `psu_cms` user, a `change-me` placeholder, and documents `trust_proxy_headers` and `session_timeout`. The README explicitly says not to deploy with a root or passwordless account.

### SEC-13 — Upload directory script protection

**Severity:** Low  
**CWE:** CWE-434

`uploads/.htaccess` blocked only `.php`, `.phtml`, and `.phar`. Server-generated names and the MIME allowlist already made script uploads difficult, but the defense was narrow.

**Fix:** Added `Options -ExecCGI`, blocked `.php[0-9]`, `.pht`, `.shtml`, `.cgi`, `.pl`, `.py`, `.rb`, `.sh`, `.asp`, `.aspx`, and `.jsp`, and added `mod_headers` rules for `nosniff` plus `Content-Disposition: attachment` on document downloads.

### SEC-14 — Login timing enumeration

**Severity:** Low  
**CWE:** CWE-208

`password_verify()` ran only when the email existed, creating a timing difference.

**Fix:** The login flow always verifies against either the stored hash or a dummy bcrypt hash, and returns the same generic error.

### SEC-15 — SQL LIKE wildcard injection

**Severity:** Low  
**CWE:** CWE-943

Search input was parameterized, but `%` and `_` were not escaped. A search for `%` returned all published content and could produce expensive queries.

**Fix:** Input is capped at 100 characters and `%`, `_`, and `!` are escaped with an explicit `ESCAPE '!'` clause.

### SEC-16 — Session hardening

**Severity:** Medium  
**CWE:** CWE-384, CWE-613

Sessions lacked strict mode, an idle timeout, explicit cookie clearing on logout, and reliable HTTPS detection behind a proxy. `$_SERVER['HTTPS'] === 'off'` was treated as true by the original truthiness check.

**Fix:** Enabled `session.use_strict_mode`, set HttpOnly/SameSite/Secure cookie parameters, added a configurable two-hour idle timeout, clear the cookie on logout, regenerate the ID on login/setup, and support `trust_proxy_headers` for a trusted reverse proxy.

### SEC-17 — Search and feedback DoS

**Severity:** Low  
**CWE:** CWE-770

Search accepted arbitrarily long input; feedback accepted arbitrarily large messages. Both could consume database and memory resources.

**Fix:** Search is capped at 100 characters, content fields have server-side limits, and feedback is capped at 5,000 characters per message with session throttling.

### SEC-18 — Security logging

**Severity:** Low  
**CWE:** CWE-778

There was no record of failed logins, throttling, setup, or logout events.

**Fix:** Added `security_log()` calls for login success/failure/throttle, setup, and logout. Logs go to the PHP error log. A dedicated audit-log table or SIEM integration is still recommended for production.

### SEC-19 — Installer input bounds

**Severity:** Low  
**CWE:** CWE-20

The installer accepted names and emails without server-side length or format checks.

**Fix:** Name, email, and password are validated before insertion; the password is capped at 1,024 bytes.

### SEC-20 — Session-resident feedback rate limit

**Severity:** Medium
**CWE:** CWE-770, CWE-602

The public feedback throttle counted submissions in `$_SESSION`. A new session (fresh cookies) started with an empty counter, so a sender could fetch a new public token and submit repeatedly. The dashboard feedback view was also unpaginated, amplifying the review burden.

**Fix:** Accepted submissions are recorded in the `feedback_attempts` table keyed by requester IP. The check is server-side and persistent: once `feedback_limit` (config, default 5) submissions occur within 15 minutes, the request is rejected with HTTP 429 and logged (`feedback_throttled`). New sessions cannot reset the counter. The admin feedback view is paginated (25 per page). The table self-heals if the migration was not applied. Validation failures do not consume the budget.

**Residual risk:** Keying by REMOTE_ADDR (default) is not forgeable; behind `trust_proxy_headers` the identity depends on the proxy isolation requirement (SEC-22). Shared NAT addresses share one budget.

### SEC-21 — Case-sensitive backup-extension blocklists

**Severity:** Low
**CWE:** CWE-434, CWE-693

`<FilesMatch "\.(sql|log|lock|bak|ini|env|md)$">` is case-sensitive under Apache PCRE. `config.php.BAK` held database credentials and was not matched, so Apache served it as plain text.

**Fix:** All `FilesMatch` patterns in the root and `uploads/.htaccess` now use inline case-insensitivity (`(?i:...)`), and common backup extensions (`old`, `orig`, `save`, `swp`, `tmp`) were added to the root blocklist. Uploads `FilesMatch` for script extensions is also case-insensitive.

### SEC-22 — Trusted-proxy trust requires origin isolation

**Severity:** Medium (deployment)
**CWE:** CWE-290, CWE-348

`client_ip()` honors `X-Forwarded-For` only when `trust_proxy_headers` is enabled, but enabling it is safe only if clients cannot reach the origin directly. With direct origin access, the client controls `X-Forwarded-For`, bypassing the IP-keyed login and feedback throttles and falsifying logged IPs.

**Fix:** This is a deployment prerequisite and cannot be enforced by the application alone. The README now requires network controls (firewall/ACL) that allow only the trusted proxy to reach the application when `trust_proxy_headers` is enabled, and `config.sample.php` documents the same requirement. Default `trust_proxy_headers => false` uses `REMOTE_ADDR`, which cannot be spoofed by the client.

## Verified-safe areas

The following areas were checked and did not show exploitable issues in the reviewed paths:

- **SQL injection:** All dynamic values use prepared statements with native prepares (`PDO::ATTR_EMULATE_PREPARES => false`). Content type is allowlisted, IDs are cast to integers, and `LIMIT` values are static.
- **Stored/reflected XSS:** Dynamic output goes through `h()` (`htmlspecialchars` with `ENT_QUOTES`). Body text is rendered with `nl2br(h(...))`. The CSP adds defense in depth.
- **Upload execution:** MIME is checked with `finfo`, extensions come from a server-side allowlist, names are random, and upload directories deny script handlers.
- **Path traversal:** Upload names are generated; download/image paths are validated against an exact pattern before use.
- **Authorization/IDOR:** Admin actions require a session; public item queries require `status='published'`.
- **Password storage:** `password_hash()` / `password_verify()` are used; hashes are rehashed on login when the default algorithm changes.
- **CSRF:** All state-changing endpoints are POST and require a non-empty token.
- **Open redirects:** Redirect targets are static or allowlisted and URL-encoded.

## Residual risks and recommendations

1. **Remove `setup.php` after setup.** The atomic guard fixes the race, but the first visitor to an unconfigured deployment can still become the administrator.
2. **No MFA, password reset, role separation, or audit-log UI.** These are product-level features, not blockers for the current single-admin MVP.
3. **Login throttle can be abused for temporary lockout.** Monitor logs and consider notifying the administrator or adding a CAPTCHA.
4. **Feedback limiter is IP-keyed.** It is persistent and server-enforced, but visitors behind one NAT address share the budget; tune `feedback_limit` or add a CAPTCHA if abuse continues.
5. **Uploads live under the web root.** Move them outside the document root and serve through an authenticated proxy for stronger isolation.
6. **No malware scanning.** Uploaded PDFs and ZIPs are not scanned. Only administrators can upload, but consider antivirus scanning if that changes.
7. **GD re-encoding has its own limits.** Images are re-encoded server-side (strips EXIF metadata and polyglot payloads) and uploads fail closed if GD is unavailable, but decoded images still occupy memory during processing; `memory_limit` binding applies. Malware scanning is still not performed.
8. **`.htaccess` is Apache-specific.** Configure equivalent deny rules and `uploads/` script protection on Nginx or another server.
9. **HSTS depends on HTTPS detection.** Set `trust_proxy_headers` only behind a trusted proxy that overwrites the forwarded headers **and only when network controls prevent clients from reaching the origin directly** — otherwise `X-Forwarded-For` is client-controlled and IP throttles are bypassable (see SEC-22).
10. **No dependency scanner.** The application has no Composer dependencies, but PHP/MySQL versions should still be patched and monitored.
11. **No CSP reporting.** Add `report-uri`/`report-to` if you want visibility into CSP violations.
12. **No search rate limit.** Search is capped and indexed, but a public site may still benefit from a WAF rate limit.

## Verification

- `php -l` passed for every PHP file.
- `tests/security_test.php`: **44 passed, 0 failed**.
- The suite covers: setup CSRF rejection and success, security headers, array-parameter rejection, admin cache/frame headers, login/logout, login throttling, upload-path validation, valid upload and delete cleanup, GD re-encoding, failed-save upload cleanup, feedback CSRF/email/length/rate limits (including persistence across sessions via the `feedback_attempts` table), dashboard pagination, the admin password-change flow, and LIKE escaping.
- Not covered dynamically: Apache `.htaccess` enforcement, Nginx rules, HSTS over a real HTTPS proxy, concurrent installer requests, session timeout expiry, and malware scanning.

## References

- OWASP Top 10 2021: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A07 Identification and Authentication Failures
- CWE-79, CWE-89, CWE-200, CWE-208, CWE-307, CWE-352, CWE-362, CWE-384, CWE-434, CWE-459, CWE-538, CWE-613, CWE-693, CWE-770, CWE-778, CWE-943, CWE-1021, CWE-1188
