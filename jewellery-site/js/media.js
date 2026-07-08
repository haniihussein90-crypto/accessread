/**
 * Renders a product visual: tries the real photo first, falls back to the
 * style's hand-drawn line-art mark if the photo is missing.
 */
function productFrameMarkup(product, { tag } = {}){
  const tagHtml = tag ? `<span class="card__tag">${tag}</span>` : '';
  const fitStyle = product.imageFit ? ` style="object-fit:${product.imageFit};"` : '';
  return `
    ${tagHtml}
    <img src="${product.image}" alt="${product.name}" loading="lazy"${fitStyle}
         onerror="this.parentElement.classList.add('no-photo')">
    <div class="art-fallback">${renderIcon(product.style)}</div>
  `;
}

/** Call after inserting frame markup so line-art paths animate correctly if visible. */
function armProductFrame(frameEl){
  armLineArt(frameEl);
}
