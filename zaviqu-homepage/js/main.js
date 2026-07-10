const header = document.getElementById('siteHeader');

function updateHeaderState() {
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
  const previewBtn = document.getElementById('previewGiftBtn');
  const maxLength = messageField ? Number(messageField.getAttribute('maxlength')) : 200;

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

  if (messageField && messageCount) {
    const updateCount = () => {
      messageCount.textContent = `${messageField.value.length} / ${maxLength}`;
    };
    messageField.addEventListener('input', updateCount);
    updateCount();
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const message = messageField ? messageField.value.trim() : '';
      const params = new URLSearchParams({ finish: selectedFinish, message });
      sessionStorage.setItem('zaviquGiftConfig', params.toString());

      const originalLabel = previewBtn.textContent;
      previewBtn.textContent = 'Saved — Preview Coming Soon';
      previewBtn.disabled = true;
      setTimeout(() => {
        previewBtn.textContent = originalLabel;
        previewBtn.disabled = false;
      }, 1800);
    });
  }
}
