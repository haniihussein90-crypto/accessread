const header = document.getElementById('siteHeader');

function updateHeaderState() {
  if (!header) return;
  if (window.scrollY > 20) {
    header.classList.add('is-scrolled');
  } else {
    header.classList.remove('is-scrolled');
  }
}

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const storySection = document.getElementById('storySection');
const storyVideo = document.getElementById('storyVideo');

if (storySection && storyVideo) {
  const storyInner = storySection.querySelector('.story__inner');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          storyInner.classList.add('is-visible');
          revealObserver.unobserve(storySection);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealObserver.observe(storySection);

  const playbackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          storyVideo.play().catch(() => {});
        } else {
          storyVideo.pause();
        }
      });
    },
    { threshold: 0.4 }
  );
  playbackObserver.observe(storyVideo);

  const showControls = () => storyVideo.setAttribute('controls', '');
  const hideControls = () => storyVideo.removeAttribute('controls');
  storyVideo.addEventListener('mouseenter', showControls);
  storyVideo.addEventListener('mouseleave', hideControls);
  storyVideo.addEventListener('focus', showControls);
  storyVideo.addEventListener('blur', hideControls);
}

const configureSection = document.getElementById('configureSection');

if (configureSection) {
  const finishOptions = configureSection.querySelectorAll('.finish-option');
  const finishImages = configureSection.querySelectorAll('.configure__image');
  const messageField = document.getElementById('giftMessage');
  const messageCount = document.getElementById('giftMessageCount');
  const messagePreviewText = document.getElementById('messagePreviewText');
  const previewBtn = document.getElementById('previewGiftBtn');
  const maxLength = messageField ? Number(messageField.getAttribute('maxlength')) : 200;
  const MESSAGE_PLACEHOLDER = 'Your message will appear here…';

  let selectedFinish = 'gold';

  function selectFinish(finish) {
    selectedFinish = finish;

    finishOptions.forEach((option) => {
      const isMatch = option.dataset.finish === finish;
      option.classList.toggle('is-selected', isMatch);
      option.setAttribute('aria-checked', String(isMatch));
    });

    finishImages.forEach((image) => {
      image.classList.toggle('is-active', image.dataset.image === finish);
    });
  }

  finishOptions.forEach((option) => {
    option.addEventListener('click', () => selectFinish(option.dataset.finish));
  });

  function updateMessagePreview() {
    const value = messageField ? messageField.value.trim() : '';
    if (messagePreviewText) {
      messagePreviewText.textContent = value || MESSAGE_PLACEHOLDER;
      messagePreviewText.classList.toggle('is-placeholder', !value);
    }
  }

  if (messageField && messageCount) {
    const updateCount = () => {
      messageCount.textContent = `${messageField.value.length} / ${maxLength}`;
    };
    messageField.addEventListener('input', () => {
      updateCount();
      updateMessagePreview();
    });
    updateCount();
    updateMessagePreview();
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const config = { finish: selectedFinish, message: messageField ? messageField.value.trim() : '' };
      sessionStorage.setItem('zaviquGiftConfig', JSON.stringify(config));
      // No preventDefault — previewBtn is a real link to gift-preview.html,
      // this just makes sure the config is saved before the page navigates.
    });
  }
}

const giftPreviewMain = document.querySelector('.gift-preview');

if (giftPreviewMain) {
  const NECKLACE_IMAGES = {
    gold: 'assets/images/necklace-gold-studio.jpg',
    silver: 'assets/images/necklace-silver-studio.jpg',
  };
  const GP_MESSAGE_PLACEHOLDER = 'Your message will appear here…';

  const gpNecklaceImage = document.getElementById('gpNecklaceImage');
  const gpFinishTag = document.getElementById('gpFinishTag');
  const gpMessageText = document.getElementById('gpMessageText');
  const gpFinishSummary = document.getElementById('gpFinishSummary');
  const gpMessageSummary = document.getElementById('gpMessageSummary');
  const gpBoxSummary = document.getElementById('gpBoxSummary');
  const gpBoxImageWrap = document.getElementById('gpBoxImageWrap');
  const tierButtons = document.querySelectorAll('.gp-tier');
  const checkoutBtn = document.getElementById('checkoutBtn');

  let storedConfig = { finish: 'gold', message: '' };
  try {
    const raw = sessionStorage.getItem('zaviquGiftConfig');
    if (raw) storedConfig = { ...storedConfig, ...JSON.parse(raw) };
  } catch (e) {
    // Malformed or missing config falls back to the gold/no-message defaults above.
  }

  function applyFinish(finish) {
    const label = finish === 'silver' ? 'Silver' : 'Gold';
    if (gpNecklaceImage) gpNecklaceImage.src = NECKLACE_IMAGES[finish] || NECKLACE_IMAGES.gold;
    if (gpFinishTag) gpFinishTag.textContent = `${label} Finish`;
    if (gpFinishSummary) gpFinishSummary.textContent = `${label} finish`;
  }

  function applyMessage(message) {
    const value = (message || '').trim();
    if (gpMessageText) {
      gpMessageText.textContent = value || GP_MESSAGE_PLACEHOLDER;
      gpMessageText.classList.toggle('is-placeholder', !value);
    }
    if (gpMessageSummary) {
      gpMessageSummary.textContent = value || 'No message added';
    }
  }

  applyFinish(storedConfig.finish === 'silver' ? 'silver' : 'gold');
  applyMessage(storedConfig.message);

  function selectTier(tier) {
    tierButtons.forEach((button) => {
      const isMatch = button.dataset.tier === tier;
      button.classList.toggle('is-selected', isMatch);
      button.setAttribute('aria-checked', String(isMatch));
    });
    if (gpBoxImageWrap) gpBoxImageWrap.classList.toggle('is-luxury', tier === 'luxury');
    if (gpBoxSummary) gpBoxSummary.textContent = tier === 'luxury' ? 'Luxury' : 'Standard';
  }

  tierButtons.forEach((button) => {
    button.addEventListener('click', () => selectTier(button.dataset.tier));
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      // Checkout destination isn't wired up yet — kept ready (no dead-end/"Coming Soon" text)
      // for a future real Shopify checkout URL once the product connector is finalized.
    });
  }
}

const revealEls = document.querySelectorAll('.reveal');

if (revealEls.length) {
  const genericRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          genericRevealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => genericRevealObserver.observe(el));
}

document.querySelectorAll('.faq-item__question').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const wasOpen = item.classList.contains('is-open');

    document.querySelectorAll('.faq-item.is-open').forEach((openItem) => {
      openItem.classList.remove('is-open');
      openItem.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
    });

    if (!wasOpen) {
      item.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});
