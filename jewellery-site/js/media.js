/**
 * Renders a product visual: tries the real photo first, falls back to the
 * category's hand-drawn line-art mark if the photo is missing (default
 * state until real photography is dropped into assets/products/).
 */
function productFrameMarkup(product, { tag } = {}){
  const tagHtml = tag ? `<span class="card__tag">${tag}</span>` : '';
  return `
    ${tagHtml}
    <img src="${product.image}" alt="${product.name}" loading="lazy"
         onerror="this.parentElement.classList.add('no-photo')">
    <div class="art-fallback">${renderIcon(product.category)}</div>
  `;
}

/** Call after inserting frame markup so line-art paths animate correctly if visible. */
function armProductFrame(frameEl){
  armLineArt(frameEl);
}
