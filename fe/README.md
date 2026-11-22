# PSU CMS – Personnel, Resources and Layout (frontend only)

HTML5 + CSS3 + vanilla JavaScript. No PHP, database, Node or API. Open `index.html` (or use VS Code Live Server).

- `index.html` – launcher for every page, with a "Reset sample data" link.
- `admin/` – All Personnel, Add/Edit Personnel, All Documents (+ empty state), Document Categories, Upload Document, All Media, Upload Media, Website Layout.
- `client/` – Faculty & Staff Directory, Profile, Document Library (+ staff-only dialog), Staff Login.
- `assets/js/admin-shell.js` / `client-shell.js` – the existing PSU admin sidebar + top bar and public header + footer, copied from the PSU CMS project.
- `assets/js/store.js` – mock data in localStorage, shared by admin and public pages.
- Staff-only documents: demo login `staff@psu.edu.ph` / `staff1234`.

## Resources access (client side)
For visitors who are not logged in, clicking **Resources** in the public header opens `client/resources-access.html`: the "Staff access only" page (gray content area, white box, two buttons). **Log in** goes to the Staff Login page; **Cancel** returns to the client page the visitor came from. Opening `client/documents.html` directly without a staff login goes to the same page. After a staff login (demo: staff@psu.edu.ph / staff1234) the Resources menu and the Document Library work normally.
