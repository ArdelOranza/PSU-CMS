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

## Requirements

PHP 8.0+ with PDO MySQL, Fileinfo, and mbstring extensions; MySQL 5.7+ or MariaDB 10.3+; Apache with `mod_rewrite`/`.htaccess` support or equivalent server rules.

## Install

1. Create a MySQL database and import `schema.sql` (it creates `psu_cms` if needed).
2. Copy `config.sample.php` to `config.php`, then set database credentials and site name.
3. Point the web server document root to this directory and ensure PHP can write to `uploads/`.
4. Open `setup.php` and create the first admin using a password with at least 12 characters.
5. Delete or restrict `setup.php` after the first administrator has been created.
6. Sign in at `admin.php`; add pages and content, then set each item to Published when ready.

## Notes

- The homepage uses a published `Pages` item with slug `homepage` when available; otherwise it shows built-in welcome copy.
- Existing image/file attachments are retained if an edit does not include a replacement upload.
- Use HTTPS in production. Configure web-server rules equivalent to the provided `.htaccess` files if using Nginx or another server.
- Uploaded assets are stored under `uploads/images/` and `uploads/files/`.
