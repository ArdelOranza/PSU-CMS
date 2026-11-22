# Database

This project uses **three separate MySQL/MariaDB databases**. Each file creates and selects its own database, so it is safe to import without choosing one first.

| Database | File | Purpose |
|---|---|---|
| `psu_cms` | [`../schema.sql`](../schema.sql) | Main application database used by `bootstrap.php`, `admin.php` and `index.php`. Holds `admins`, `content`, `feedback`, `login_attempts` and `feedback_attempts`. |
| `psu_cms_admin` | [`psu_cms_admin.sql`](psu_cms_admin.sql) | Admin-side schema (users, roles, permissions, pages, news, events, documents, media, settings and more). |
| `psu_cms_client` | [`psu_cms_client.sql`](psu_cms_client.sql) | Client-side schema. Same structure as the admin schema, plus `program_courses` and `search_logs`. |

## Importing

Import each file once. Drop any old copy of the database first, because `CREATE TABLE` does not alter tables that already exist.

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS psu_cms_admin; DROP DATABASE IF EXISTS psu_cms_client;"
mysql -u root -p < schema.sql
mysql -u root -p < database/psu_cms_admin.sql
mysql -u root -p < database/psu_cms_client.sql
```

With phpMyAdmin, use the **Import** tab on the server home page (not inside another database) so the `CREATE DATABASE` / `USE` statements take effect.


