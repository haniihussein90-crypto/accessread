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

  let restoredConfig = {};
  try {
    const raw = sessionStorage.getItem('zaviquGiftConfig');
    if (raw) restoredConfig = JSON.parse(raw);
  } catch (e) {
    // Malformed or missing config — start from the gold/blank defaults below.
  }

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

  if (restoredConfig.finish === 'silver') selectFinish('silver');
  if (messageField && typeof restoredConfig.message === 'string') messageField.value = restoredConfig.message;

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
      // Merge into any existing stored config (rather than overwrite) so a customer who
      // came back to edit finish/message doesn't lose card design / gift box choices
      // already made on the Gift Preview page.
      let existing = {};
      try {
        const raw = sessionStorage.getItem('zaviquGiftConfig');
        if (raw) existing = JSON.parse(raw);
      } catch (e) {
        // Malformed existing config — proceed with just the fields set below.
      }
      const config = {
        ...existing,
        finish: selectedFinish,
        message: messageField ? messageField.value.trim() : '',
      };
      sessionStorage.setItem('zaviquGiftConfig', JSON.stringify(config));
      // No preventDefault — previewBtn is a real link to gift-preview.html,
      // this just makes sure the config is saved before the page navigates.
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
