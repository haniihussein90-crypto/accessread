/**
 * Hand-authored line-art SVG marks, keyed by product `style` (knot/heart/name).
 * Used only as a fallback if a product photo fails to load — every catalog
 * item currently ships with a real photo, but this keeps the site resilient
 * (never a broken-image icon) if a future item launches photo-less.
 */
const STYLE_ICONS = {
  knot: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M100 120c22 0 40-17.9 40-40s-18-40-40-40-40 17.9-40 40 18 40 40 40Z"/>
      <path class="draw-path" style="--i:1" d="M75 70c14-14 36-14 50 0M75 130c14 14 36 14 50 0"/>
      <path class="draw-path" style="--i:2" d="M100 20v20M100 160v20"/>
    </svg>`,
  heart: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M100 150 60 108c-14-14-14-36 0-50s36-14 40 0c4-14 26-14 40 0s14 36 0 50L100 150Z"/>
      <path class="draw-path" style="--i:1" d="M100 30v20"/>
    </svg>`,
  name: `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="draw-path" style="--i:0" d="M40 60c0 5 4 20 4 20M160 60c0 5-4 20-4 20"/>
      <path class="draw-path" style="--i:1" d="M55 130c20-30 30-30 35-10 5-25 20-25 25 0 5-20 20-20 30 5"/>
    </svg>`,
};

function renderIcon(style){
  return STYLE_ICONS[style] || STYLE_ICONS.name;
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
