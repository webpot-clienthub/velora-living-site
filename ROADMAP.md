# Velora Living - Feature ideas / roadmap

This site is already a clean, fast "catalog + WhatsApp inquiry" experience. Below are optional add-ons you can consider next.

## P0 (quick wins / polish)

- [ ] Unify contact CTA: WhatsApp numbers differ in `index.html` (footer vs product-size flow). Pick one and use it everywhere.
- [ ] Fill legal pages: replace placeholder Privacy Policy and Terms & Conditions links with real pages.
- [ ] SEO basics: meta description, Open Graph tags, favicon, and sitemap/robots.
- [ ] Accessibility pass: meaningful `alt` text, keyboard support for carousel + modal, and Esc to close.
- [ ] Performance: lazy-load images, consider self-hosting fonts if needed.

## Frontend features (customer-facing)

- [ ] Sticky header + section nav (Home / About / Products / Contact).
- [ ] Search + filters by category/material/size.
- [ ] Product detail view: materials, dimensions, care, warranty, delivery timeline.
- [ ] Featured collections: Best sellers, Outdoor, New arrivals.
- [ ] Social proof: testimonials, client photos, Instagram embed.
- [ ] FAQ section: shipping, assembly, customization, returns.

## Backend features (PHP-only)

This project is meant to be Hostinger-friendly with PHP only using `admin/api/*.php`.

- [ ] Lead capture endpoint: store inquiries + send notification.
- [ ] Database (optional): start with JSON, move to MySQL if you need reporting/search.
- [ ] Image pipeline: validate MIME types, resize/compress, generate thumbnails (WebP).

## Admin panel upgrades

- [ ] Stronger authentication: store a password hash (not plaintext) + basic brute-force protection.
- [ ] Role-based access: admin vs editor.
- [ ] Product editor: edit descriptions/sizes/prices/featured/order.
- [ ] Inquiry inbox: view/search/export leads, mark as contacted.

