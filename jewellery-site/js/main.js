/** Mobile nav, scroll-reveal, hero line-art draw-in, scroll progress. Everything here respects prefers-reduced-motion. */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Arms `.reveal` elements for scroll-triggered fade-in, via a single shared
 * IntersectionObserver. Call this again after injecting new `.reveal`
 * markup (e.g. a dynamically-rendered product grid) — elements present at
 * page load are armed automatically on DOMContentLoaded.
 */
const observeReveals = (() => {
  let io = null;
  if (!reduceMotion && 'IntersectionObserver' in window){
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  }
  return function observeReveals(root = document){
    const els = root.matches?.('.reveal') ? [root] : root.querySelectorAll('.reveal');
    els.forEach((el, i) => {
      if (el.classList.contains('is-visible') || el.dataset.revealArmed) return;
      el.dataset.revealArmed = '1';
      el.style.setProperty('--i', el.closest('.reveal-stagger') ? i % 8 : 0);
      if (io) io.observe(el);
      else el.classList.add('is-visible');
    });
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  /* Mobile nav */
  const navToggle = document.querySelector('.js-nav-toggle');
  const mobileNav = document.getElementById('mobileNav');
  const navClose = document.querySelector('.js-nav-close');
  navToggle?.addEventListener('click', () => {
    mobileNav?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
  navClose?.addEventListener('click', () => {
    mobileNav?.classList.remove('is-open');
    document.body.style.overflow = '';
  });
  mobileNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
  }));

  observeReveals();

  /* Hero / gallery line-art draw-in (arms + triggers .is-drawn once visible) */
  document.querySelectorAll('.hero__art, .split__art').forEach((el) => {
    armLineArt?.(el);
    if (reduceMotion){ el.classList.add('is-drawn'); return; }
    requestAnimationFrame(() => el.classList.add('is-drawn'));
  });

  /* Scroll progress bar */
  const bar = document.querySelector('.scroll-progress__bar');
  if (bar){
    const update = () => {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      const pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
      bar.style.width = pct + '%';
    };
    document.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* Marquee: duplicate track content once so the CSS loop is seamless */
  document.querySelectorAll('.strip__track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });
});
