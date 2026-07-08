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

/**
 * Renders the gift-card message that ships tucked behind the necklace in
 * the box — a real example of what a customer might write, not a required
 * message (their own personalization always overrides it at checkout).
 */
function letterCardMarkup(product){
  const l = product.letter;
  if (!l) return '';
  return `
    <div class="letter reveal">
      <div class="letter__icon">${l.icon}</div>
      <div class="letter__eyebrow">${l.eyebrow}</div>
      <div class="letter__salutation">${l.salutation}</div>
      <p class="letter__body">${l.body}</p>
      <p class="letter__signoff">${l.signoff}</p>
      <p class="letter__note">This is the card that ships tucked behind the necklace — write your own, or make it yours above.</p>
    </div>
  `;
}
