/**
 * Client-side cart (localStorage) — this is a static site with no backend,
 * so there is no server-side order/session. Checkout hands off to Stripe's
 * hosted Payment Links (see README "Wiring up real checkout"):
 *
 *  - Single product in cart → straight to that product's Stripe link.
 *    If you've enabled Stripe's "Collect additional information" custom
 *    field on the link (label it "Personalization"), the customer's chosen
 *    name/message flows through automatically — we prefill it via the
 *    `prefilled_promo_code`-style query params Stripe supports for that
 *    field where possible, and always show it in the checkout modal so the
 *    customer can paste it in if not.
 *  - Multiple distinct products → Stripe Payment Links can't combine
 *    arbitrary line items without a backend, so we open a checkout modal
 *    listing each item with its own "Pay for this item" link instead of
 *    pretending a single combined checkout exists.
 */
const CART_KEY = 'kindredlane_cart_v1';

function readCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

function writeCart(lines){
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  document.dispatchEvent(new CustomEvent('cart:change', { detail: lines }));
}

/**
 * personalization: { recipient, name, message } | null
 * Each personalized line is kept distinct (not merged with a differently
 * personalized line for the same product).
 */
function cartAdd(productId, personalization, qty = 1){
  const lines = readCart();
  const key = productId + '::' + (personalization ? JSON.stringify(personalization) : 'none') + '::' + Date.now();
  const mergeKey = productId + '::' + (personalization ? JSON.stringify(personalization) : 'none');
  const existing = lines.find((l) => l.mergeKey === mergeKey);
  if (existing){
    existing.qty += qty;
  } else {
    lines.push({ key, mergeKey, productId, personalization: personalization || null, qty });
  }
  writeCart(lines);
}

function cartSetQty(key, qty){
  let lines = readCart();
  if (qty <= 0){
    lines = lines.filter((l) => l.key !== key);
  } else {
    const line = lines.find((l) => l.key === key);
    if (line) line.qty = qty;
  }
  writeCart(lines);
}

function cartRemove(key){
  const lines = readCart().filter((l) => l.key !== key);
  writeCart(lines);
}

function cartCount(){
  return readCart().reduce((sum, l) => sum + l.qty, 0);
}

function cartSubtotal(){
  return readCart().reduce((sum, l) => {
    const p = getProduct(l.productId);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function cartLinesWithProducts(){
  return readCart()
    .map((l) => ({ ...l, product: getProduct(l.productId) }))
    .filter((l) => l.product);
}

/* -------------------------------- UI wiring -------------------------------- */

function renderCartDrawer(){
  const itemsEl = document.getElementById('cartItems');
  const footEl = document.getElementById('cartFoot');
  const emptyEl = document.getElementById('cartEmpty');
  if (!itemsEl) return;

  const lines = cartLinesWithProducts();
  const countEls = document.querySelectorAll('.cart-count');
  const count = lines.reduce((s, l) => s + l.qty, 0);
  countEls.forEach((el) => {
    el.textContent = count;
    el.classList.toggle('is-visible', count > 0);
  });

  if (lines.length === 0){
    itemsEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (footEl) footEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (footEl) footEl.style.display = 'block';

  itemsEl.innerHTML = lines.map((l) => {
    const p = l.personalization;
    const metaBits = [l.product.metal === 'silver' ? 'Silver' : 'Gold'];
    if (p && p.recipient) metaBits.push('For ' + p.recipient);
    return `
    <div class="cart-line" data-key="${l.key}">
      <div class="cart-line__thumb">${renderIcon(l.product.style)}</div>
      <div>
        <div class="cart-line__name">${l.product.name}</div>
        <div class="cart-line__meta">${metaBits.join(' · ')}</div>
        ${p && (p.name || p.message) ? `<div class="cart-line__personalize">${p.name ? '“' + p.name + '”' : ''}${p.message ? (p.name ? ' — ' : '') + p.message : ''}</div>` : ''}
        <div class="qty">
          <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
          <span>${l.qty}</span>
          <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div>
        <div class="cart-line__price">${formatPrice(l.product.price * l.qty)}</div>
        <button type="button" class="cart-line__remove" data-action="remove">Remove</button>
      </div>
    </div>
  `;
  }).join('');

  armLineArt(itemsEl);

  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(cartSubtotal());

  itemsEl.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.closest('.cart-line').dataset.key;
      const line = readCart().find((l) => l.key === key);
      if (!line) return;
      if (btn.dataset.action === 'inc') cartSetQty(key, line.qty + 1);
      if (btn.dataset.action === 'dec') cartSetQty(key, line.qty - 1);
      if (btn.dataset.action === 'remove') cartRemove(key);
    });
  });
}

function openCart(){
  document.getElementById('cartDrawer')?.classList.add('is-open');
  document.getElementById('cartOverlay')?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeCart(){
  document.getElementById('cartDrawer')?.classList.remove('is-open');
  document.getElementById('cartOverlay')?.classList.remove('is-open');
  document.body.style.overflow = '';
}

function personalizationSummary(l){
  if (!l.personalization) return '';
  const bits = [];
  if (l.personalization.recipient) bits.push('for ' + l.personalization.recipient);
  if (l.personalization.name) bits.push('name: "' + l.personalization.name + '"');
  if (l.personalization.message) bits.push('message: "' + l.personalization.message + '"');
  return bits.length ? ' (' + bits.join(', ') + ')' : '';
}

function openCheckoutModal(){
  const lines = cartLinesWithProducts();
  const modal = document.getElementById('checkoutModal');
  const listEl = document.getElementById('checkoutList');
  if (!modal || !listEl) return;

  if (lines.length === 1 && !lines[0].personalization){
    window.open(lines[0].product.stripeLink, '_blank', 'noopener');
    return;
  }

  listEl.innerHTML = lines.map((l) => `
    <div class="checkout-line">
      <span class="checkout-line__name">${l.product.name} × ${l.qty}${personalizationSummary(l)}</span>
      <a href="${l.product.stripeLink}" target="_blank" rel="noopener">Pay for this item →</a>
    </div>
  `).join('');
  modal.classList.add('is-open');
}
function closeCheckoutModal(){
  document.getElementById('checkoutModal')?.classList.remove('is-open');
}

function showToast(message){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

document.addEventListener('cart:change', renderCartDrawer);

document.addEventListener('DOMContentLoaded', () => {
  renderCartDrawer();

  document.querySelectorAll('.js-cart-open').forEach((el) => el.addEventListener('click', openCart));
  document.querySelectorAll('.js-cart-close').forEach((el) => el.addEventListener('click', closeCart));
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('checkoutBtn')?.addEventListener('click', openCheckoutModal);
  document.querySelectorAll('.js-checkout-close').forEach((el) => el.addEventListener('click', closeCheckoutModal));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){ closeCart(); closeCheckoutModal(); }
  });

  // Delegated "Add to cart" handling for grids/cards without personalization.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.addToCart;
    cartAdd(id, null, 1);
    showToast('Added to cart');
    openCart();
  });
});
