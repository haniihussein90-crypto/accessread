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
