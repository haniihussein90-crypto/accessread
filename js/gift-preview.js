// ---------------------------------------------------------------------------
// Real Shopify / ShineOn data goes here once the Zaviqu store has products.
// Everything below is a clearly-marked placeholder — nothing here is a real
// variant ID, template ID, or price. The store currently has zero products,
// so none of this can be sourced yet; do not treat any value below as real.
// ---------------------------------------------------------------------------
const CHECKOUT_CONFIG = {
  necklaceVariantId: {
    // TODO: real Shopify variant GID for the Gold Love Knot necklace, e.g. gid://shopify/ProductVariant/123
    gold: null,
    // TODO: real Shopify variant GID for the Silver Love Knot necklace
    silver: null,
  },
  // TODO: confirm the real ShineOn personalisation character limit (using the homepage's 200 as a placeholder).
  messageCharLimit: 200,
  // Fulfillment model for the Luxury Wooden Gift Box is NOT confirmed yet. It could be:
  //   'variant' -> combined into the necklace's own Shopify variant (e.g. "Gold / Wooden Box")
  //   'addon'   -> a separate Shopify add-on product, added as its own line item
  //   'shineon' -> a ShineOn product/order option rather than a Shopify line item at all
  // Until this is confirmed, box selection here is preview-only and intentionally does not
  // assume one of these models — checkout will not add real line items for it yet.
  giftBox: {
    white: { fulfillmentType: null, shopifyId: null, price: 0 },
    wood: { fulfillmentType: null, shopifyId: null, price: null },
  },
};

// Curated design set shown to customers, matching the real card photography in
// assets/images/. Each `shineOnTemplateId` must be filled in with the real supported
// ShineOn template ID before this can drive real fulfilment.
const CARD_DESIGNS = [
  { id: 'midnight-lux', name: 'Midnight Lux', image: 'assets/images/card-midnight-lux.jpg', shineOnTemplateId: null },
  { id: 'ivory-elegance', name: 'Ivory Elegance', image: 'assets/images/card-ivory-elegance.jpg', shineOnTemplateId: null },
  { id: 'romantic-blush', name: 'Romantic Blush', image: 'assets/images/card-romantic-blush.jpg', shineOnTemplateId: null },
  { id: 'classic-minimal', name: 'Classic Minimal', image: 'assets/images/card-classic-minimal.jpg', shineOnTemplateId: null },
];

const BOX_OPTIONS = {
  wood: { label: 'Luxury Wooden Gift Box', priceLabel: 'Paid Upgrade' },
  white: { label: 'Classic White Gift Box', priceLabel: 'Included' },
};

// Real product photography: one combined necklace + gift box shot per finish/box combination.
const HERO_IMAGES = {
  gold: { wood: 'assets/images/gift-box-wood-gold.jpg', white: 'assets/images/gift-box-white-gold.jpg' },
  silver: { wood: 'assets/images/gift-box-wood-silver.jpg', white: 'assets/images/gift-box-white-silver.jpg' },
};

const MESSAGE_PLACEHOLDER = 'Your message will appear here…';

const giftPreviewMain = document.querySelector('.gift-preview');

if (giftPreviewMain) {
  const gpNotice = document.getElementById('gpNotice');
  const gpHeroImage = document.getElementById('gpHeroImage');
  const gpFinishTag = document.getElementById('gpFinishTag');
  const gpCardPreview = document.getElementById('gpCardPreview');
  const gpCardImage = document.getElementById('gpCardImage');
  const gpMessageText = document.getElementById('gpMessageText');

  const gpFinishSummary = document.getElementById('gpFinishSummary');
  const gpMessageSummary = document.getElementById('gpMessageSummary');
  const gpItemPrice = document.getElementById('gpItemPrice');
  const gpBoxUpgradePrice = document.getElementById('gpBoxUpgradePrice');
  const gpTotal = document.getElementById('gpTotal');
  const gpStickyTotal = document.getElementById('gpStickyTotal');

  const cardThumbs = Array.from(document.querySelectorAll('.card-grid__thumb'));
  const tierButtons = Array.from(document.querySelectorAll('.gp-tier'));
  const gpTierImgWood = document.getElementById('gpTierImgWood');
  const gpTierImgWhite = document.getElementById('gpTierImgWhite');
  const checkoutButtons = [document.getElementById('checkoutBtn'), document.getElementById('checkoutBtnSticky')].filter(Boolean);

  let hadStoredConfig = false;
  let stored = {};
  try {
    const raw = sessionStorage.getItem('zaviquGiftConfig');
    if (raw) {
      hadStoredConfig = true;
      stored = JSON.parse(raw);
    }
  } catch (e) {
    // Malformed config — fall back to defaults below and still show the notice.
  }

  const state = {
    finish: stored.finish === 'silver' ? 'silver' : 'gold',
    message: typeof stored.message === 'string' ? stored.message : '',
    cardDesign: CARD_DESIGNS.some((d) => d.id === stored.cardDesign) ? stored.cardDesign : 'midnight-lux',
    box: stored.box === 'white' ? 'white' : 'wood',
  };

  if (!hadStoredConfig && gpNotice) {
    gpNotice.hidden = false;
  }

  function persist() {
    sessionStorage.setItem('zaviquGiftConfig', JSON.stringify(state));
  }

  function renderHero() {
    const label = state.finish === 'silver' ? 'Silver' : 'Gold';
    if (gpHeroImage) gpHeroImage.src = HERO_IMAGES[state.finish][state.box];
    if (gpFinishTag) gpFinishTag.textContent = `${label} Finish`;
    if (gpFinishSummary) gpFinishSummary.textContent = `${label} finish`;
  }

  function renderMessage() {
    const value = state.message.trim();
    if (gpMessageText) {
      gpMessageText.textContent = value || MESSAGE_PLACEHOLDER;
      gpMessageText.classList.toggle('is-placeholder', !value);
    }
    if (gpMessageSummary) gpMessageSummary.textContent = value || 'No message added';
  }

  function renderCardDesign() {
    const design = CARD_DESIGNS.find((d) => d.id === state.cardDesign) || CARD_DESIGNS[0];

    if (gpCardImage) gpCardImage.src = design.image;
    if (gpCardPreview) gpCardPreview.dataset.design = design.id;

    cardThumbs.forEach((thumb) => {
      const isMatch = thumb.dataset.design === design.id;
      thumb.classList.toggle('is-selected', isMatch);
      thumb.setAttribute('aria-checked', String(isMatch));
      thumb.tabIndex = isMatch ? 0 : -1;
    });
  }

  function renderBox() {
    tierButtons.forEach((button) => {
      const isMatch = button.dataset.tier === state.box;
      button.classList.toggle('is-selected', isMatch);
      button.setAttribute('aria-checked', String(isMatch));
    });
    if (gpBoxUpgradePrice) gpBoxUpgradePrice.textContent = BOX_OPTIONS[state.box].priceLabel;
    // Box option thumbnails reflect the currently selected finish, same real photography as the hero.
    if (gpTierImgWood) gpTierImgWood.src = HERO_IMAGES[state.finish].wood;
    if (gpTierImgWhite) gpTierImgWhite.src = HERO_IMAGES[state.finish].white;
    renderHero();
  }

  function renderPricing() {
    // No real Shopify pricing exists yet — shown honestly rather than invented.
    if (gpItemPrice) gpItemPrice.textContent = 'Price upon selection';
    if (gpTotal) gpTotal.textContent = 'Price upon selection';
    if (gpStickyTotal) gpStickyTotal.textContent = 'Price upon selection';
  }

  renderHero();
  renderMessage();
  renderCardDesign();
  renderBox();
  renderPricing();
  persist();

  // ---- Card design grid ----
  cardThumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      state.cardDesign = thumb.dataset.design;
      renderCardDesign();
      persist();
    });

    thumb.addEventListener('keydown', (event) => {
      const currentIndex = cardThumbs.indexOf(thumb);
      let targetIndex = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = Math.min(currentIndex + 1, cardThumbs.length - 1);
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === 'Home') targetIndex = 0;
      else if (event.key === 'End') targetIndex = cardThumbs.length - 1;

      if (targetIndex !== null && targetIndex !== currentIndex) {
        event.preventDefault();
        const target = cardThumbs[targetIndex];
        state.cardDesign = target.dataset.design;
        renderCardDesign();
        target.focus();
        persist();
      }
    });
  });

  // ---- Gift box tiers ----
  tierButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.box = button.dataset.tier === 'white' ? 'white' : 'wood';
      renderBox();
      persist();
    });
  });

  // ---- Checkout ----
  function buildCheckoutIntent() {
    const design = CARD_DESIGNS.find((d) => d.id === state.cardDesign);
    return {
      necklaceVariantId: CHECKOUT_CONFIG.necklaceVariantId[state.finish],
      giftBox: CHECKOUT_CONFIG.giftBox[state.box],
      properties: {
        'Personalised Message': state.message.trim(),
        'Card Design': design ? design.name : '',
        'Card Design Template ID': design ? design.shineOnTemplateId : null,
        'Gift Box': BOX_OPTIONS[state.box].label,
      },
    };
  }

  function handleCheckout() {
    const intent = buildCheckoutIntent();

    if (!intent.necklaceVariantId) {
      // Real Shopify variant IDs aren't connected yet, so there is nothing real to add to
      // cart or check out with. Left silent on purpose — no fake confirmation, no
      // "Coming Soon" state, no redirect to an unrelated page.
      return;
    }

    // Real path once CHECKOUT_CONFIG has real variant IDs: send the customer straight to
    // Shopify's cart permalink with the personalisation attached as line-item properties.
    const params = new URLSearchParams();
    Object.entries(intent.properties).forEach(([key, value]) => {
      if (value) params.set(`properties[${key}]`, value);
    });
    window.location.href = `https://zaviqu.com/cart/${intent.necklaceVariantId}:1?${params.toString()}`;
  }

  checkoutButtons.forEach((button) => button.addEventListener('click', handleCheckout));
}
