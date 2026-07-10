// ---------------------------------------------------------------------------
// Real Shopify / ShineOn data goes here once the Zaviqu store has products.
// Everything below is a clearly-marked placeholder — nothing here is a real
// variant ID, template ID, or price except where the business has explicitly
// specified one (the €20 Luxury Wooden Box upgrade). The store currently has
// zero products, so IDs cannot be sourced yet; do not treat a null as real.
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
  // Fulfillment model for the Luxury Wooden Box is NOT confirmed yet. It could be:
  //   'variant' -> combined into the necklace's own Shopify variant (e.g. "Gold / Wooden Box")
  //   'addon'   -> a separate Shopify add-on product, added as its own line item
  //   'shineon' -> a ShineOn product/order option rather than a Shopify line item at all
  // Until this is confirmed, box selection here is preview-only and intentionally does not
  // assume one of these models — checkout will not add real line items for it yet. The €20
  // price is real (business-specified); the fulfilment plumbing to charge it is not.
  giftBox: {
    white: { fulfillmentType: null, shopifyId: null, price: 0 },
    wood: { fulfillmentType: null, shopifyId: null, price: 20 },
  },
};

const BOX_OPTIONS = {
  white: { label: 'Signature Box', priceLabel: 'Included' },
  wood: { label: 'Luxury Wooden Box', priceLabel: '+€20' },
};

// Curated design set shown to customers. Each `shineOnTemplateId` must be filled in with
// the real supported ShineOn template ID before this can drive real fulfilment.
const CARD_DESIGNS = [
  { id: 'midnight-luxe', name: 'Midnight Luxe', shineOnTemplateId: null },
  { id: 'ivory-elegance', name: 'Ivory Elegance', shineOnTemplateId: null },
  { id: 'romantic-blush', name: 'Romantic Blush', shineOnTemplateId: null },
  { id: 'classic-minimal', name: 'Classic Minimal', shineOnTemplateId: null },
];

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
  const gpHeroCard = document.getElementById('gpHeroCard');
  const gpMessageText = document.getElementById('gpMessageText');
  const gpMessageSummaryText = document.getElementById('gpMessageSummaryText');

  const gpItemPrice = document.getElementById('gpItemPrice');
  const gpBoxUpgradePrice = document.getElementById('gpBoxUpgradePrice');
  const gpTotal = document.getElementById('gpTotal');
  const gpStickyTotal = document.getElementById('gpStickyTotal');

  const finishOptions = Array.from(document.querySelectorAll('.gp-pill[data-finish]'));
  const cardOptions = Array.from(document.querySelectorAll('.gp-pill[data-design]'));
  const boxOptions = Array.from(document.querySelectorAll('.gp-pill[data-tier]'));
  const checkoutButtons = [document.getElementById('checkoutBtn'), document.getElementById('checkoutBtnSticky')].filter(Boolean);

  const editMessageBtn = document.getElementById('editMessageBtn');
  const messageModal = document.getElementById('messageModal');
  const messageModalBackdrop = document.getElementById('messageModalBackdrop');
  const messageModalInput = document.getElementById('messageModalInput');
  const messageModalCounter = document.getElementById('messageModalCounter');
  const messageModalCancel = document.getElementById('messageModalCancel');
  const messageModalSave = document.getElementById('messageModalSave');
  const messageMaxLength = messageModalInput ? Number(messageModalInput.getAttribute('maxlength')) : 200;

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
    cardDesign: CARD_DESIGNS.some((d) => d.id === stored.cardDesign) ? stored.cardDesign : 'midnight-luxe',
    box: stored.box === 'white' ? 'white' : 'wood',
  };

  if (!hadStoredConfig && gpNotice) {
    gpNotice.hidden = false;
  }

  function persist() {
    sessionStorage.setItem('zaviquGiftConfig', JSON.stringify(state));
  }

  // Shared radiogroup behaviour (selection + roving tabindex + arrow-key nav) for the
  // necklace finish, gift box, and card design pill groups.
  function selectInGroup(options, target) {
    options.forEach((option) => {
      const isMatch = option === target;
      option.classList.toggle('is-selected', isMatch);
      option.setAttribute('aria-checked', String(isMatch));
      option.tabIndex = isMatch ? 0 : -1;
    });
  }

  function wireRadioGroup(options, onSelect) {
    options.forEach((option) => {
      option.addEventListener('click', () => onSelect(option));

      option.addEventListener('keydown', (event) => {
        const currentIndex = options.indexOf(option);
        let targetIndex = null;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = Math.min(currentIndex + 1, options.length - 1);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = Math.max(currentIndex - 1, 0);
        else if (event.key === 'Home') targetIndex = 0;
        else if (event.key === 'End') targetIndex = options.length - 1;

        if (targetIndex !== null && targetIndex !== currentIndex) {
          event.preventDefault();
          const target = options[targetIndex];
          onSelect(target);
          target.focus();
        }
      });
    });
  }

  function renderHero() {
    if (gpHeroImage) gpHeroImage.src = HERO_IMAGES[state.finish][state.box];
  }

  function renderMessage() {
    const value = state.message.trim();
    if (gpMessageText) {
      gpMessageText.textContent = value || MESSAGE_PLACEHOLDER;
      gpMessageText.classList.toggle('is-placeholder', !value);
    }
    if (gpMessageSummaryText) gpMessageSummaryText.textContent = value || 'No message added yet.';
  }

  function renderFinish() {
    const match = finishOptions.find((option) => option.dataset.finish === state.finish);
    if (match) selectInGroup(finishOptions, match);
    renderHero();
  }

  function renderCardDesign() {
    const design = CARD_DESIGNS.find((d) => d.id === state.cardDesign) || CARD_DESIGNS[0];

    if (gpHeroCard) gpHeroCard.dataset.design = design.id;

    const match = cardOptions.find((option) => option.dataset.design === design.id);
    if (match) selectInGroup(cardOptions, match);
  }

  function renderBox() {
    const match = boxOptions.find((option) => option.dataset.tier === state.box);
    if (match) selectInGroup(boxOptions, match);
    if (gpBoxUpgradePrice) gpBoxUpgradePrice.textContent = BOX_OPTIONS[state.box].priceLabel;
    renderHero();
  }

  function renderPricing() {
    // Necklace price isn't real yet (no Shopify product), shown honestly rather than invented.
    // The €20 box upgrade is real and business-specified, shown as a separate line above.
    if (gpItemPrice) gpItemPrice.textContent = 'Price upon selection';
    if (gpTotal) gpTotal.textContent = 'Price upon selection';
    if (gpStickyTotal) gpStickyTotal.textContent = 'Price upon selection';
  }

  renderFinish();
  renderMessage();
  renderCardDesign();
  renderBox();
  renderPricing();
  persist();

  wireRadioGroup(finishOptions, (target) => {
    state.finish = target.dataset.finish === 'silver' ? 'silver' : 'gold';
    renderFinish();
    persist();
  });

  wireRadioGroup(cardOptions, (target) => {
    state.cardDesign = target.dataset.design;
    renderCardDesign();
    persist();
  });

  wireRadioGroup(boxOptions, (target) => {
    state.box = target.dataset.tier === 'white' ? 'white' : 'wood';
    renderBox();
    persist();
  });

  // ---- Edit Message modal ----
  function updateModalCounter() {
    if (messageModalInput && messageModalCounter) {
      messageModalCounter.textContent = `${messageModalInput.value.length} / ${messageMaxLength}`;
    }
  }

  function openMessageModal() {
    if (!messageModal || !messageModalInput) return;
    messageModalInput.value = state.message;
    updateModalCounter();
    messageModal.hidden = false;
    messageModalInput.focus();
  }

  function closeMessageModal() {
    if (!messageModal) return;
    messageModal.hidden = true;
    if (editMessageBtn) editMessageBtn.focus();
  }

  function saveMessage() {
    if (messageModalInput) state.message = messageModalInput.value.trim();
    renderMessage();
    persist();
    closeMessageModal();
  }

  if (editMessageBtn) editMessageBtn.addEventListener('click', openMessageModal);
  if (messageModalInput) messageModalInput.addEventListener('input', updateModalCounter);
  if (messageModalCancel) messageModalCancel.addEventListener('click', closeMessageModal);
  if (messageModalBackdrop) messageModalBackdrop.addEventListener('click', closeMessageModal);
  if (messageModalSave) messageModalSave.addEventListener('click', saveMessage);

  if (messageModal) {
    messageModal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMessageModal();
    });
  }

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
