# Velora Living — Upgrades List

Generated review of the current workspace (frontend + backend PHP + admin tools). This is a suggestion list (not implemented yet).

## P0 (do these first)

- **Security: remove hard-coded admin credentials** (`admin/api/auth_login.php`)
  - Move credentials to environment variables (or a config file outside web root).
  - Store a password hash (e.g., `password_hash()` / `password_verify()`), not plaintext.
  - Rotate the current admin password immediately (it’s committed in the repo).
  - Add basic brute-force protection (rate limit by IP + short lockout after N failures).

- **Security: lock down file uploads** (`admin/api/images_add.php`, `admin/api/images_replace.php`)
  - Validate MIME type via `finfo_file()` (don’t trust filename/extension).
  - Enforce max upload size, max images per request, and reject zero-byte files.
  - Only allow a strict set of types (ideally `webp`, `jpg`, `png`) and re-encode images server-side.
  - Generate random filenames (avoid `time()` collisions) and store outside executable paths.
  - Consider saving originals + generated thumbnails (and only serving the processed copies).

- **Security: prevent CSRF for admin write actions** (`admin/api/products.php` POST, all `admin/api/images_*.php`, `admin/api/auth_logout.php`)
  - Add CSRF tokens for all state-changing endpoints.
  - Consider `SameSite=Strict` just for the admin session cookie (or a separate admin cookie).

- **Security: decide what `server.js` is for** (`server.js`, `package.json`)
  - Today `server.js` exposes unauthenticated write + upload endpoints; don’t deploy this as-is.
  - Either remove it (if production is PHP-only), or add proper auth + authorization.
  - Fix path traversal in `safeUnlink()` by using `path.resolve()` and verifying the resolved path is inside `PRODUCT_ROOT`.
  - Add upload validation in Multer (`fileFilter`, size limits).

- **Correctness: unify WhatsApp number everywhere** (`index.html`)
  - `index.html` uses `919510141167` in multiple places, but the overlay order flow uses `919408191506`.
  - Pick a single number (or make it config-driven) so every CTA routes consistently.

## Frontend upgrades

### `index.html`

- Replace inline `onclick="..."` handlers (the “How to Order” steps) with `addEventListener` + proper `<button>` elements for accessibility.
- Make the zoom overlay fully accessible:
  - Close on `Escape`, trap focus while open, restore focus on close, and add `aria-modal="true"` + `role="dialog"`.
  - Ensure the close button has an accessible name (e.g., `aria-label="Close"`).
- Reduce future breakage when new categories are added:
  - `productDescriptions` and `sizeOptions` are hard-coded; move these into `products.json` (or a dedicated metadata JSON) so admin edits drive UI.
  - `View all` links assume a static `Gallery/<slug>.html` exists; use a single gallery template page with `?category=<slug>` or auto-generate pages.
- Performance:
  - Add `width`/`height` attributes (or `aspect-ratio`) to key images to reduce layout shift.
  - Consider `preload="metadata"` for `velora-promo.mp4` and add a `poster` image for faster first paint.
  - Replace the external WhatsApp icon URL with a local asset (avoid third-party dependency + improves CSP options).
- Resilience:
  - If product loading fails, show a user-facing message (not only console logs).
  - Add timeouts / abort logic for `fetch()` so the UI doesn’t hang on slow networks.

### `style.css`

- Add a `@media (prefers-reduced-motion: reduce)` block to disable/shorten animations (loader, reveals, carousel auto-advance cues).
- Add/verify consistent focus states for all interactive elements (links, buttons, carousel slides, close button, size buttons).
- Consider splitting “base styles” vs “page components” (the file has grown large; modularity helps maintenance).

### `Gallery/*.html`, `Gallery/gallery.js`, `Gallery/gallery.css`

- Replace multiple near-identical gallery pages with a single page + query param (`Gallery/index.html?category=clock`) to reduce duplication.
- Add optional “lightbox” experience (instead of opening each image in a new tab) and keyboard navigation.
- Ensure gallery pages include meta description + Open Graph image per category (optional, but helps sharing/SEO).

### `about.html`, `privacy-policy.html`, `terms.html`, `legal.css`

- “Last Updated” currently shows *today’s date* via JS (not the actual policy update date). Prefer a real, manually set last-updated date (or inject during build).
- Add consistent header/nav/footer across pages (currently home has a richer footer; legal pages duplicate some pieces).
- Add `rel="noopener"` everywhere you use `target="_blank"` (most places already do).

### `robots.txt`

- Add `Sitemap: /sitemap.xml` and actually generate a sitemap (home + about + legal + galleries).
- Consider whether you want `Disallow: /admin/` only (the current `Disallow: /api/` may be irrelevant; your PHP endpoints live under `/admin/api/`).

## Backend (PHP) upgrades

### `admin/api/products.php`

- Add file locking (`flock`) when writing `admin/data/products.json` to avoid corruption under concurrent requests.
- Consider caching the scan:
  - Scanning the filesystem on every GET can get expensive as image counts grow.
  - Options: cache by directory mtime, store a hash, or only rescan when admin updates images.
- Handle slug collisions (two folder names that slugify to the same key).
- Sanitize/normalize category folder names used for path building (defense in depth, even if only admins control it).
- Consider returning `ETag` / `Last-Modified` + supporting `If-None-Match` to cut bandwidth.

### `admin/api/_require_auth.php`, `admin/api/auth_session.php`, `admin/api/auth_logout.php`

- Add `Cache-Control: no-store` for auth/session endpoints (avoid caching authenticated responses).
- Add baseline security headers for admin APIs:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or `frame-ancestors 'none'` via CSP)
  - A strict `Content-Security-Policy` for admin pages (even a minimal one helps).
- Standardize error responses (consistent `{ error: "...", details?: ... }`) to simplify frontend handling.

### `admin/api/_session.php`

- Add `session.use_strict_mode = 1` (defense against session fixation).
- Consider setting a session cookie lifetime and an idle timeout for the admin area.

### `admin/api/images_delete.php`

- Return which files were deleted vs skipped (better admin UX + easier debugging).
- Consider soft-delete or a recycle bin folder to recover accidental deletes.

## Admin UI / DX upgrades

### `admin/login.html`, `admin/index.php`, `admin/admin.js`, `admin/auth.js`

- Move inline login CSS into `admin/admin.css` (or a dedicated `admin/login.css`) to keep styling consistent and maintainable.
- Add “show password” toggle + better error states (disabled button while submitting, spinner).
- Add an explicit logout that destroys the whole session (`session_destroy()` + cookie invalidation), not only unsetting one key.

### `admin/image-manager/image-manager.js`

- Messaging: it says “Start the admin server” when API is unavailable; clarify that you need a PHP server (Live Server alone won’t run PHP).
- Avoid `innerHTML` for content that can come from directory names / JSON (defense against XSS). Prefer DOM creation + `textContent`.
- Add image previews with size + dimensions, and client-side validation before upload.
- Consider drag-and-drop uploads and reorder support (if image order matters in carousels).

## Data & assets

- **Images** (`velora_product/**`)
  - Convert heavy PNGs to WebP/AVIF where possible; generate multiple sizes and use `srcset`/`sizes`.
  - Add a thumbnail pipeline for admin + frontend carousels (smaller initial payload).
  - Standardize naming and fix typos (`Acyrlic` → `Acrylic`) if SEO matters (note: renames will require updating slugs/links).

- **Video** (`velora-promo.mp4`)
  - Compress/optimize and consider serving multiple encodes (or at least a smaller mobile-friendly version).

- **Brand assets** (`velora-logo.png`)
  - Add proper favicon set: `favicon.ico`, `apple-touch-icon`, `manifest.json` icons.

## Tooling / quality

- Add formatters/linters (optional but helpful):
  - JS: ESLint + Prettier (especially for large inline scripts).
  - PHP: PHP-CS-Fixer / PHPStan (even at a low strictness level).
- Add a lightweight build step (optional):
  - Extract inline JS from `index.html` into a versioned file (cacheable).
  - Minify CSS/JS for production and keep source readable.

## Repo hygiene / docs

- `TODO.md`, `ROADMAP.md`: keep these aligned with what’s actually live (and link to the exact file/section when you reference issues like the WhatsApp-number mismatch).
- `.vscode/settings.json`: consider adding formatter settings (or recommended extensions) so contributors get consistent formatting.
