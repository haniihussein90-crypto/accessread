/**
 * Client-side cart (localStorage) — this is a static site with no backend,
 * so there is no server-side order/session. Checkout hands off to Stripe's
 * hosted Payment Links (see README "Wiring up real checkout"):
 *
 *  - Single product in cart → straight to that product's Stripe link,
 *    quantity preserved via the Stripe-hosted page.
 *  - Multiple distinct products → Stripe Payment Links can't combine
 *    arbitrary line items without a backend, so we open a checkout modal
 *    listing each item with its own "Pay for this item" link instead of
 *    pretending a single combined checkout exists.
 */
const CART_KEY = 'noiretor_cart_v1';

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

function cartAdd(productId, size, qty = 1){
  const lines = readCart();
  const key = productId + '::' + (size || '');
  const existing = lines.find((l) => l.key === key);
  if (existing){
    existing.qty += qty;
  } else {
    lines.push({ key, productId, size: size || null, qty });
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

  itemsEl.innerHTML = lines.map((l) => `
    <div class="cart-line" data-key="${l.key}">
      <div class="cart-line__thumb">${renderIcon(l.product.category)}</div>
      <div>
        <div class="cart-line__name">${l.product.name}</div>
        <div class="cart-line__meta">${l.size ? 'Size ' + l.size : l.product.material}</div>
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
  `).join('');

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

function openCheckoutModal(){
  const lines = cartLinesWithProducts();
  const modal = document.getElementById('checkoutModal');
  const listEl = document.getElementById('checkoutList');
  if (!modal || !listEl) return;

  if (lines.length === 1){
    window.open(lines[0].product.stripeLink, '_blank', 'noopener');
    return;
  }

  listEl.innerHTML = lines.map((l) => `
    <div class="checkout-line">
      <span class="checkout-line__name">${l.product.name} × ${l.qty}${l.size ? ' (Size ' + l.size + ')' : ''}</span>
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

  // Delegated "Add to cart" handling for grids/cards rendered dynamically.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.addToCart;
    const size = btn.dataset.size || null;
    cartAdd(id, size, 1);
    showToast('Added to cart');
    openCart();
  });
});
