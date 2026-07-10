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
