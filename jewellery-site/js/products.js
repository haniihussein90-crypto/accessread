/**
 * Catalog for NOIR & OR.
 *
 * `image` points at assets/products/<id>.jpg — drop a real photo there and
 * it's used automatically. Until then, js/media.js swaps in the hand-drawn
 * line-art mark for that category (see js/icons.js) so the site never shows
 * a broken image.
 *
 * `stripeLink` is a placeholder. Replace each with a real Stripe Payment
 * Link (Stripe Dashboard → Payment Links → create one per product) before
 * launch — see README.md "Wiring up real checkout".
 */
const PRODUCTS = [
  {
    id: 'aurore-solitaire-ring',
    name: 'Aurore Solitaire Ring',
    category: 'ring',
    price: 2480,
    material: '18k recycled gold, 0.5ct lab diamond',
    description: 'A single stone held high on a tapered band, cut to catch light from every angle. Cast to order in our Lisbon atelier.',
    sizes: ['48', '50', '52', '54', '56'],
    image: 'assets/products/aurore-solitaire-ring.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_aurore_solitaire',
  },
  {
    id: 'meridian-band',
    name: 'Meridian Band',
    category: 'ring',
    price: 890,
    material: '18k gold vermeil',
    description: 'A quiet, low-profile band with a hand-hammered surface — worn alone or stacked three deep.',
    sizes: ['48', '50', '52', '54', '56'],
    image: 'assets/products/meridian-band.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_meridian_band',
  },
  {
    id: 'veiled-signet',
    name: 'Veiled Signet',
    category: 'ring',
    price: 1140,
    material: 'Sterling silver, oxidised finish',
    description: 'An unmarked signet, left blank on purpose. Engraving available on request.',
    sizes: ['50', '52', '54', '56', '58'],
    image: 'assets/products/veiled-signet.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_veiled_signet',
  },
  {
    id: 'thread-pendant',
    name: 'Thread Pendant',
    category: 'necklace',
    price: 1360,
    material: '18k gold, 45cm chain',
    description: 'The house signature — a single drawn line, cast in gold, hung from a chain fine enough to disappear.',
    sizes: null,
    image: 'assets/products/thread-pendant.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_thread_pendant',
  },
  {
    id: 'nocturne-chain',
    name: 'Nocturne Chain',
    category: 'necklace',
    price: 2150,
    material: '18k gold, handset diamond pavé clasp',
    description: 'A dense curb chain built for evening, weighted to sit flat against the collarbone.',
    sizes: null,
    image: 'assets/products/nocturne-chain.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_nocturne_chain',
  },
  {
    id: 'lumen-collar',
    name: 'Lumen Collar',
    category: 'necklace',
    price: 3200,
    material: '18k gold, 1.1ct diamond line',
    description: 'A close-fitting collar set with a continuous line of diamonds — our most requested piece for a reason.',
    sizes: null,
    image: 'assets/products/lumen-collar.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_lumen_collar',
  },
  {
    id: 'drift-drop-earrings',
    name: 'Drift Drop Earrings',
    category: 'earring',
    price: 980,
    material: '18k gold, freshwater pearl',
    description: 'A pearl suspended from a hand-forged hook, moving with the smallest turn of the head.',
    sizes: null,
    image: 'assets/products/drift-drop-earrings.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_drift_drop',
  },
  {
    id: 'halo-hoop',
    name: 'Halo Hoop',
    category: 'earring',
    price: 620,
    material: '18k gold vermeil',
    description: 'A medium hoop with a slight taper, weighted for comfort across a full day.',
    sizes: null,
    image: 'assets/products/halo-hoop.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_halo_hoop',
  },
  {
    id: 'ember-stud',
    name: 'Ember Stud',
    category: 'earring',
    price: 540,
    material: '18k gold, 0.15ct diamond',
    description: 'A single point of light, set low on the lobe. Sold as a pair.',
    sizes: null,
    image: 'assets/products/ember-stud.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_ember_stud',
  },
  {
    id: 'linear-cuff',
    name: 'Linear Cuff',
    category: 'bracelet',
    price: 1480,
    material: '18k gold, brushed finish',
    description: 'An open cuff with a soft brushed surface, shaped to the wrist over a week of hand-forming.',
    sizes: ['XS', 'S', 'M', 'L'],
    image: 'assets/products/linear-cuff.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_linear_cuff',
  },
  {
    id: 'tide-chain-bracelet',
    name: 'Tide Chain Bracelet',
    category: 'bracelet',
    price: 760,
    material: '18k gold vermeil',
    description: 'A fine curb chain sized to layer with the Meridian Band or worn alone.',
    sizes: ['XS', 'S', 'M', 'L'],
    image: 'assets/products/tide-chain-bracelet.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_tide_chain',
  },
  {
    id: 'quiet-hour-bangle',
    name: 'Quiet Hour Bangle',
    category: 'bracelet',
    price: 2040,
    material: '18k gold, hidden diamond setting',
    description: 'A solid bangle with a single diamond set on the inner face — visible only to the wearer.',
    sizes: ['XS', 'S', 'M', 'L'],
    image: 'assets/products/quiet-hour-bangle.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_quiet_hour',
  },
];

const CATEGORY_LABELS = {
  ring: 'Rings',
  necklace: 'Necklaces',
  earring: 'Earrings',
  bracelet: 'Bracelets',
};

function formatPrice(n){
  return '$' + n.toLocaleString('en-US');
}

function getProduct(id){
  return PRODUCTS.find((p) => p.id === id);
}
