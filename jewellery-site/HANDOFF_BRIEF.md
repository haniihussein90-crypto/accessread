# Zaviqu — Handoff Brief

> Scope note: this brief documents `jewellery-site/` exactly as it exists in this
> repository (`haniihussein90-crypto/accessread`, branch
> `claude/zaviqu-handoff-brief-pve0yu`) as of 2026-07-30. A prior session summary
> attached to this task described an unrelated, much larger engagement — a live
> Shopify store with a custom "Gift Builder" theme section, Loox/ShineOn review
> integration, Shopify Markets/pricing changes, and a corrected checkout
> variant-ID bug. None of that exists in this codebase or its git history: there
> are no theme files, no Shopify config, and no Shopify connection available in
> this session. That narrative does not apply here and is not reflected below.
> If that Shopify work is real, it lives in a different project/session and
> needs to be reconciled separately.

## What Zaviqu is (in this repo)

A static, no-build, no-backend site for a personalized-necklace gift brand,
under `jewellery-site/`. Client-side cart via `localStorage`; checkout hands
off to Stripe-hosted **Payment Links** (no server). See
`jewellery-site/README.md` for the canonical run/deploy instructions — this
brief covers state and next steps, not mechanics already documented there.

Brand line (from `about.html`): *"Zaviqu helps people celebrate life's most
meaningful moments through beautifully personalized jewelry that becomes a
lasting keepsake."*

## Structure

```
jewellery-site/
  index.html      Home
  shop.html       Full catalog, style/metal filters
  product.html    Product detail (?id=<product-id>), personalization form
  about.html      Brand story / mission
  contact.html    Contact form (client-side only — does not send anywhere yet)
  css/style.css        Design tokens ("Noir & Or": near-black + antique gold) + global styles
  css/components.css   Component styles (cards, cart drawer, forms, etc.)
  js/products.js       Catalog data (7 products) + recipient message templates
  js/cart.js           localStorage cart + Stripe Payment Link checkout handoff
  js/icons.js          Hand-drawn SVG fallback marks (used only if a product photo 404s)
  js/media.js          Renders photo-or-fallback product frames
  js/main.js           Nav, scroll-reveal, hero animation, scroll progress
  assets/products/     Real product photography, cropped from supplier catalog
```

## Design system

Dark, gold-accented editorial look ("Noir & Or"). Tokens in
`css/style.css` `:root`: `--bg` #0C0A09, `--bg-panel` #15120F, `--surface`
#1C1815, `--cream` #F6F1E7, `--gold` #C9A15E / `--gold-bright` #E4C382, plus a
light-section pair (`--paper` #F3EEE3 / `--ink` #171310) for sections that
flip to a light background (e.g. testimonial band on `about.html`).
Typography: Playfair Display (display) + Inter (body).

## Catalog (`js/products.js`)

7 products (Love Knot, Eternal Knot, Heart in gold/silver, name necklaces in
rose/gold/silver, etc.), each with `price`, `material`, `description`,
whether it's `personalizable`, applicable `recipients`, a product photo path,
and (for gift-message products) a `letter` block (icon/eyebrow/salutation/
body/signoff) used on the product page's gift-card layout.

Personalization on `product.html`: recipient picker (drives a suggested
message from `MESSAGE_TEMPLATES`), engraved-name field (14 char max),
message box (200 char max, freeform or templated).

## Current state — what's real vs. stubbed

**Real / working:**
- Full catalog browsing, filtering (shop.html), product detail pages.
- Personalization form (name + message, recipient-driven suggestions).
- Cart: add/remove/qty, persisted in `localStorage` (`zaviqu_cart_v1`),
  keeps distinctly-personalized lines separate rather than merging them.
- Product photography in place for all 7 catalog items (cropped supplier
  shots, watermarks/mockup card removed).
- Responsive layout, scroll-reveal/hero animation, newsletter signup UI.

**Stubbed / not launch-ready:**
- **All 7 `stripeLink` values in `js/products.js` are placeholders**
  (`https://buy.stripe.com/REPLACE_...`) — checkout does not work until each
  is replaced with a real Stripe Payment Link, per README "Wiring up real
  checkout." This is the single biggest blocker to a live launch.
- Multi-item checkout is an intentional limitation, not a bug: Stripe
  Payment Links can't combine arbitrary line items without a backend, so
  the cart opens a modal listing one "Pay for this item" link per distinct
  product when more than one is in the bag.
- `contact.html`'s form only shows a client-side success state — it sends
  nowhere. README documents two zero-backend fixes (Netlify Forms or
  Formspree); neither is wired up yet.
- Newsletter signup on all pages is a client-side toast only — no real
  subscription capture.

## Next steps to launch

1. Create 7 Stripe Payment Links (one per product), enable "Collect
   additional information → custom text field" labeled `Personalization` on
   each, and swap them into `js/products.js`.
2. Wire `contact.html` to Netlify Forms or Formspree (see README).
3. Decide on a real newsletter capture (Mailchimp/Klaviyo embed or similar)
   if the newsletter block is meant to be functional at launch.
4. Deploy: any static host works (Vercel/Netlify/GitHub Pages/Cloudflare
   Pages) — no build step, no env vars required.

## Explicitly out of scope here

No Shopify store, theme, or admin API integration exists for Zaviqu in this
repository. If a live Shopify build of this brand exists elsewhere, it is a
separate project from `jewellery-site/` and this brief makes no claims about
its state.
