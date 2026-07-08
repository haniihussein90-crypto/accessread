/**
 * Hand-authored line-art SVG marks for each product category.
 * Kept dependency-free (no images) so the catalog renders instantly
 * and scales perfectly at any size/density.
 */
const CATEGORY_ICONS = {
  ring: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M100 120c22 0 40-17.9 40-40s-18-40-40-40-40 17.9-40 40 18 40 40 40Z"/>
      <path class="draw-path" style="--i:1" d="M100 40 88 16h24l-12 24Z"/>
      <path class="draw-path" style="--i:2" d="M78 20h44"/>
    </svg>`,
  necklace: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M40 30c0 46 26.9 84 60 84s60-38 60-84"/>
      <path class="draw-path" style="--i:1" d="M100 114 88 138h24l-12-24Z"/>
      <path class="draw-path" style="--i:2" d="M40 30c0 5-4 8-4 8M160 30c0 5 4 8 4 8"/>
    </svg>`,
  earring: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M100 60a14 14 0 1 1-0.1 0Z"/>
      <path class="draw-path" style="--i:1" d="M100 74v26"/>
      <path class="draw-path" style="--i:2" d="M100 100 84 132h32l-16-32Z"/>
    </svg>`,
  bracelet: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M30 100c0-22.1 31.3-40 70-40s70 17.9 70 40-31.3 40-70 40-70-17.9-70-40Z"/>
      <path class="draw-path" style="--i:1" d="M50 76c8 32 6 56 0 88M150 76c-8 32-6 56 0 88" transform="translate(0,-20)"/>
      <path class="draw-path" style="--i:2" d="M92 86h16v16H92z"/>
    </svg>`,
};

function renderIcon(category){
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.ring;
}

/** Compute + set stroke-dasharray/length for every .draw-path inside root, then arm the draw animation. */
function armLineArt(root){
  const paths = root.querySelectorAll('.draw-path');
  paths.forEach((p) => {
    try{
      const len = p.getTotalLength();
      p.style.setProperty('--len', len);
    }catch(e){ /* non-path shapes ignored */ }
  });
}
