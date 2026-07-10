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
  // Fulfillment model for the Luxury Gift Box is NOT confirmed yet. It could be:
  //   'variant' -> combined into the necklace's own Shopify variant (e.g. "Gold / Luxury Box")
  //   'addon'   -> a separate Shopify add-on product, added as its own line item
  //   'shineon' -> a ShineOn product/order option rather than a Shopify line item at all
  // Until this is confirmed, box selection here is preview-only and intentionally does not
  // assume one of these models — checkout will not add real line items for it yet.
  giftBox: {
    standard: { fulfillmentType: null, shopifyId: null, price: 0 },
    luxury: { fulfillmentType: null, shopifyId: null, price: null },
  },
};

// Curated design set shown to customers. Names/thumbnails are illustrative placeholders —
// each `shineOnTemplateId` must be filled in with the real supported ShineOn template ID
// before this can drive real fulfilment.
const CARD_DESIGNS = [
  { id: 'minimal-cream', name: 'Minimal Cream', shineOnTemplateId: null },
  { id: 'classic-black', name: 'Classic Black', shineOnTemplateId: null },
  { id: 'soft-pink', name: 'Soft Pink', shineOnTemplateId: null },
  { id: 'floral-romance', name: 'Floral Romance', shineOnTemplateId: null },
  { id: 'warm-gold', name: 'Warm Gold', shineOnTemplateId: null },
  { id: 'anniversary', name: 'Anniversary', shineOnTemplateId: null },
  { id: 'birthday', name: 'Birthday', shineOnTemplateId: null },
  { id: 'for-mum', name: 'For Mum', shineOnTemplateId: null },
  { id: 'elegant-white', name: 'Elegant White', shineOnTemplateId: null },
  { id: 'rose-gold-shimmer', name: 'Rose Gold Shimmer', shineOnTemplateId: null },
];

const NECKLACE_IMAGES = {
  gold: 'assets/images/necklace-gold-studio.jpg',
  silver: 'assets/images/necklace-silver-studio.jpg',
};

const MESSAGE_PLACEHOLDER = 'Your message will appear here…';

const giftPreviewMain = document.querySelector('.gift-preview');

if (giftPreviewMain) {
  const gpNotice = document.getElementById('gpNotice');
  const gpNecklaceImage = document.getElementById('gpNecklaceImage');
  const gpFinishTag = document.getElementById('gpFinishTag');
  const gpMessageCard = document.getElementById('gpMessageCard');
  const gpMessageText = document.getElementById('gpMessageText');
  const gpBoxImageWrap = document.getElementById('gpBoxImageWrap');

  const gpFinishSummary = document.getElementById('gpFinishSummary');
  const gpMessageSummary = document.getElementById('gpMessageSummary');
  const gpCardSummary = document.getElementById('gpCardSummary');
  const gpBoxSummary = document.getElementById('gpBoxSummary');
  const gpItemPrice = document.getElementById('gpItemPrice');
  const gpBoxUpgradePrice = document.getElementById('gpBoxUpgradePrice');
  const gpTotal = document.getElementById('gpTotal');
  const gpStickyTotal = document.getElementById('gpStickyTotal');

  const cardTrack = document.getElementById('cardCarouselTrack');
  const cardThumbs = Array.from(document.querySelectorAll('.card-carousel__thumb'));
  const cardPrevBtn = document.getElementById('cardCarouselPrev');
  const cardNextBtn = document.getElementById('cardCarouselNext');

  const tierButtons = Array.from(document.querySelectorAll('.gp-tier'));
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
    cardDesign: CARD_DESIGNS.some((d) => d.id === stored.cardDesign) ? stored.cardDesign : 'minimal-cream',
    box: stored.box === 'luxury' ? 'luxury' : 'standard',
  };

  if (!hadStoredConfig && gpNotice) {
    gpNotice.hidden = false;
  }

  function persist() {
    sessionStorage.setItem('zaviquGiftConfig', JSON.stringify(state));
  }

  function renderFinish() {
    const label = state.finish === 'silver' ? 'Silver' : 'Gold';
    if (gpNecklaceImage) gpNecklaceImage.src = NECKLACE_IMAGES[state.finish];
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

  function renderCardDesign({ scrollIntoView = false } = {}) {
    const design = CARD_DESIGNS.find((d) => d.id === state.cardDesign) || CARD_DESIGNS[0];

    if (gpMessageCard) {
      CARD_DESIGNS.forEach((d) => gpMessageCard.classList.remove(`card-swatch--${d.id}`));
      gpMessageCard.classList.add(`card-swatch--${design.id}`);
    }
    if (gpCardSummary) gpCardSummary.textContent = design.name;

    cardThumbs.forEach((thumb) => {
      const isMatch = thumb.dataset.design === design.id;
      thumb.classList.toggle('is-selected', isMatch);
      thumb.setAttribute('aria-checked', String(isMatch));
      thumb.tabIndex = isMatch ? 0 : -1;
      if (isMatch && scrollIntoView) {
        thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  function renderBox() {
    const isLuxury = state.box === 'luxury';
    tierButtons.forEach((button) => {
      const isMatch = button.dataset.tier === state.box;
      button.classList.toggle('is-selected', isMatch);
      button.setAttribute('aria-checked', String(isMatch));
    });
    if (gpBoxImageWrap) gpBoxImageWrap.classList.toggle('is-luxury', isLuxury);
    if (gpBoxSummary) gpBoxSummary.textContent = isLuxury ? 'Luxury' : 'Standard';
    if (gpBoxUpgradePrice) gpBoxUpgradePrice.textContent = isLuxury ? 'Price TBD' : '—';
  }

  function renderPricing() {
    // No real Shopify pricing exists yet — shown honestly rather than invented.
    if (gpItemPrice) gpItemPrice.textContent = 'Price upon selection';
    if (gpTotal) gpTotal.textContent = 'Price upon selection';
    if (gpStickyTotal) gpStickyTotal.textContent = 'Price upon selection';
  }

  renderFinish();
  renderMessage();
  renderCardDesign({ scrollIntoView: true });
  renderBox();
  renderPricing();
  persist();

  // ---- Card design carousel ----
  cardThumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      state.cardDesign = thumb.dataset.design;
      renderCardDesign();
      persist();
    });

    thumb.addEventListener('keydown', (event) => {
      const currentIndex = cardThumbs.indexOf(thumb);
      let targetIndex = null;

      if (event.key === 'ArrowRight') targetIndex = Math.min(currentIndex + 1, cardThumbs.length - 1);
      else if (event.key === 'ArrowLeft') targetIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === 'Home') targetIndex = 0;
      else if (event.key === 'End') targetIndex = cardThumbs.length - 1;

      if (targetIndex !== null && targetIndex !== currentIndex) {
        event.preventDefault();
        const target = cardThumbs[targetIndex];
        state.cardDesign = target.dataset.design;
        renderCardDesign({ scrollIntoView: true });
        target.focus();
        persist();
      }
    });
  });

  function scrollCarousel(direction) {
    if (!cardTrack) return;
    const amount = cardTrack.clientWidth * 0.8 * direction;
    cardTrack.scrollBy({ left: amount, behavior: 'smooth' });
  }

  if (cardPrevBtn) cardPrevBtn.addEventListener('click', () => scrollCarousel(-1));
  if (cardNextBtn) cardNextBtn.addEventListener('click', () => scrollCarousel(1));

  // ---- Gift box tiers ----
  tierButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.box = button.dataset.tier === 'luxury' ? 'luxury' : 'standard';
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
        'Gift Box': state.box === 'luxury' ? 'Luxury' : 'Standard',
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
