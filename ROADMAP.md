# Velora Living — Feature Ideas / Roadmap

This site is already a clean, fast, “catalog + WhatsApp inquiry” experience. Below are add-ons you can consider next (grouped by impact).

## P0 (quick wins / polish)

- [ ] **Unify contact CTA**: the WhatsApp numbers differ in `index.html` (footer vs product-size flow). Pick one and use it everywhere.
- [ ] **Fill legal pages**: replace placeholder `Privacy Policy` and `Terms & Conditions` links with real pages.
- [ ] **SEO basics**: add `meta name="description"`, Open Graph tags, and a favicon.
- [ ] **Accessibility pass**: meaningful `alt` text, keyboard support for carousel + modal, focus trap in overlay, and `Esc` to close.
- [ ] **Performance**: `loading="lazy"` on product images, `font-display: swap`, and consider self-hosting fonts.

## Frontend features (customer-facing)

- [ ] **Sticky header + section nav**: Home / About / Products / Contact with smooth scrolling.
- [ ] **Search + filters**: filter by category, material, size; sort by “Newest / Popular / Price”.
- [ ] **Product detail view**: add materials, dimensions, weight, care instructions, warranty, delivery timeline, and a “Request quote”.
- [ ] **Featured collections**: “Best sellers”, “Outdoor”, “New arrivals”.
- [ ] **Social proof**: testimonials, rating snippets, client photos, Instagram feed embed.
- [ ] **FAQ section**: shipping, assembly, customization, returns.
- [ ] **PWA**: “Add to Home Screen”, offline fallback, and app-like loading.
- [ ] **Multi-language**: EN + (optional) Hindi/Gujarati depending on audience.

## Backend features (pick one direction)

Right now the homepage reads `admin/data/products.json` directly. If you want “real backend features”, pick one hosting model:

### Option A — Node/Express (you already have `server.js`)
- [ ] **Serve products via API**: switch frontend from `admin/data/products.json` to `/api/products` so data access is consistent.
- [ ] **Lead capture endpoint**: `/api/leads` to store inquiries (name, phone, city, product, size) + send email/WhatsApp notification.
- [ ] **Database**: SQLite for simple deploys, Postgres for production; add migrations for products/leads.
- [ ] **Image pipeline**: validate MIME types, resize/compress, generate thumbnails (WebP/AVIF), and prevent huge uploads.
- [ ] **Caching**: ETag/Cache-Control for images + products; basic CDN support.

### Option B — Static hosting + serverless (Netlify/Vercel/Cloudflare)
- [ ] **Serverless forms**: store leads + send notifications without running a server.
- [ ] **Headless CMS**: manage products/content with a CMS (or a lightweight JSON editor) while keeping the site static.

### Option C — PHP-only (you already have `admin/api/*.php`)
- [ ] **Choose PHP as the single backend**: remove/ignore Node endpoints and have frontend + admin use the PHP API consistently.

## Admin panel upgrades

The current admin login accepts any username/password (good for a demo, unsafe for production).

- [ ] **Real authentication**: hashed password, sessions/cookies, logout, and brute-force protection.
- [ ] **Role-based access**: admin vs editor.
- [ ] **Product editor**: edit descriptions, sizes, prices, “featured”, and ordering (drag/drop).
- [ ] **Inquiry inbox**: view/search/export leads, mark as contacted, basic CRM notes.
- [ ] **Audit log**: who changed what and when (especially for product images).

## Quality & trust

- [ ] **Analytics**: track clicks on “WhatsApp”, size selections, and most-viewed categories (privacy-friendly if possible).
- [ ] **Error monitoring**: capture JS errors (Sentry or simple logging).
- [ ] **Security headers**: CSP, X-Frame-Options, Referrer-Policy, etc.
- [ ] **Sitemap + robots.txt**: improve indexing.

---

If you tell me where you plan to host (static-only vs Node vs PHP), I can turn this into a tighter, prioritized checklist and implement the top 2–3 items.
