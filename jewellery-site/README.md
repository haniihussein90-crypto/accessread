# Zaviqu — Personalized Necklace Shop

Static site (no build step). Personalized, made-to-order necklace catalog with a client-side cart and Stripe-hosted checkout — designed to be sold as a print-on-demand jewellery brand with no backend to maintain.

> Brand name: **Zaviqu**. If it ever changes, see "Renaming the brand" below.

## Running locally

No build tooling required. From this folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or open `index.html` directly in a browser (all asset paths are relative).

## Structure

```
index.html          Home
shop.html           Full catalog with style/metal filters
product.html        Product detail — reads ?id=<product-id>, personalization form
about.html          Brand story
contact.html        Contact form (static; see "Wiring up the contact form")
design-system.html  Living style guide — color, type, spacing, components, motion, tokens
css/style.css        Design tokens + global styles
css/components.css   Component styles (cards, cart drawer, forms, etc.)
js/products.js       Catalog data + recipient message templates
js/cart.js           localStorage cart + checkout handoff
js/icons.js           Hand-drawn SVG fallback marks (used only if a photo 404s)
js/media.js           Renders photo-or-fallback product frames
js/main.js             Nav, scroll-reveal, hero animation, scroll progress
assets/products/       Real product photography (cropped from supplier catalog)
```

## Renaming the brand

"Zaviqu" appears in each HTML file's `<title>`, the header/footer `.logo` markup, and the cart's `CART_KEY` in `js/cart.js`. There's no templating layer, so a rename is a find-and-replace across the 5 HTML files plus `js/cart.js`:

```bash
grep -rl "Zaviqu" jewellery-site/*.html jewellery-site/js/cart.js
```

## Wiring up real checkout

This is a static site with no backend, so checkout hands off to **Stripe Payment Links** (Stripe-hosted checkout pages, no server required):

1. In the Stripe Dashboard, create a Payment Link for each product in `js/products.js`.
2. Under the Payment Link's settings, enable **"Collect additional information" → custom text field**, labeled `Personalization`. This lets a customer's chosen name/message reach you at checkout without a backend.
3. Replace each `stripeLink: 'https://buy.stripe.com/REPLACE_...'` in `js/products.js` with the real link.

**Cart behavior**, given the static-site constraint:
- One distinct product in the bag → "Checkout" opens that product's Stripe link directly.
- Multiple distinct products → Stripe Payment Links can't combine arbitrary line items without a backend API call, so a modal lists each item with its own "Pay for this item" link. This is an intentional, honest limitation — if you outgrow it, the next step is a real cart (Shopify, or a small serverless function calling the Stripe Checkout Sessions API).

## Wiring up the contact form

`contact.html`'s form currently only shows a client-side success state — it does not send anywhere. Options:
- **Netlify Forms** (if deploying to Netlify): add `data-netlify="true"` and a hidden `<input type="hidden" name="form-name" value="contact">` to the `<form>` — zero backend code.
- **Formspree** or similar: set the form's `action` to your Formspree endpoint and add `method="POST"`.

## Product photography

`assets/products/*.jpg` are cropped from print-on-demand supplier catalog photos, with the supplier's mockup card background, watermark doodles, and "Your Design Here" placeholder text cropped out — tight product shots on the original black card background. Swap in your own photography by replacing files of the same name (see `image` paths in `js/products.js`).

## Deployment

Any static host works: Vercel, Netlify, GitHub Pages, Cloudflare Pages. No environment variables or build command needed — just point the host at this folder.
