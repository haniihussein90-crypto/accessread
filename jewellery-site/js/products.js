/**
 * Catalog — personalized gift necklaces (print-on-demand, fulfilled per order).
 *
 * `image` points at real product photography in assets/products/.
 * `recipients` are the relationships this piece is commonly gifted for;
 * used to drive the message-suggestion picker on the product page.
 * `personalizable` products accept an engraved/printed name.
 *
 * `stripeLink` is a placeholder. Replace each with a real Stripe Payment
 * Link before launch — see README.md "Wiring up real checkout". Enable
 * Stripe's "Collect additional information" custom field on each link
 * (label it "Personalization") so a customer's chosen message reaches you
 * at checkout without needing a backend.
 */
const RECIPIENTS = ['mom', 'dad', 'wife', 'girlfriend', 'boyfriend', 'sister', 'daughter', 'grandmother', 'best friend'];

const MESSAGE_TEMPLATES = {
  mom: 'To the woman who gave me everything — thank you for a lifetime of quiet, constant love.',
  dad: 'For the man who taught me how to stand on my own. Thank you, Dad.',
  wife: 'Every version of me has loved every version of you. Happy to keep choosing you.',
  girlfriend: 'For the one whose love keeps me grounded — however long we’ve got, I want it with you.',
  boyfriend: 'You showed up for me on the ordinary days, not just the big ones. That’s how I knew.',
  sister: 'We didn’t choose each other, and I wouldn’t change a single year of it.',
  daughter: 'Watching you grow into yourself has been the privilege of my life.',
  grandmother: 'Everything soft and strong in me, I learned from you first.',
  'best friend': 'Some people find family. I found you. Thank you for two decades of showing up.',
};

const PRODUCTS = [
  {
    id: 'love-knot-necklace-gold',
    name: 'Love Knot Necklace',
    metal: 'gold',
    style: 'knot',
    price: 58,
    material: '18k gold-plated stainless steel, cubic zirconia',
    description: 'A single interlocking knot, set with a bright center stone — a quiet way of saying two lives stayed tangled together on purpose.',
    personalizable: false,
    recipients: ['mom', 'wife', 'girlfriend', 'sister'],
    image: 'assets/products/love-knot-necklace-gold-macro.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_love_knot_gold',
    letter: {
      icon: '💍',
      eyebrow: 'To My Wife',
      salutation: 'To My Amazing Wife,',
      body: 'Marrying you was the greatest decision of my life. Through every challenge and every celebration, you’ve been my safe place, my greatest supporter, and my forever love. Thank you for sharing this beautiful journey with me. I will choose you, today and every day.',
      signoff: 'Love Always.',
    },
  },
  {
    id: 'eternal-knot-necklace-gold',
    name: 'Eternal Knot Necklace',
    metal: 'gold',
    style: 'knot',
    price: 64,
    material: '18k gold-plated stainless steel, pavé cubic zirconia',
    description: 'A denser, more deliberate knot — every loop pavé-set, built for someone you’d tie yourself to twice.',
    personalizable: false,
    recipients: ['wife', 'girlfriend', 'mom'],
    image: 'assets/products/eternal-knot-necklace-gold.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_eternal_knot_gold',
    letter: {
      icon: '💕',
      eyebrow: 'Anniversary',
      salutation: 'My Love,',
      body: 'Every year with you is another chapter in the most beautiful story I’ve ever known. Thank you for filling my life with laughter, love, and unforgettable memories. Here’s to everything we’ve shared and everything still to come. My heart will always belong to you.',
      signoff: 'Happy Anniversary.',
    },
  },
  {
    id: 'heart-solitaire-necklace-gold',
    name: 'Forever Heart Necklace',
    metal: 'gold',
    style: 'heart',
    price: 56,
    material: '18k gold-plated stainless steel, cubic zirconia solitaire',
    description: 'An open heart holding a single bright stone — simple enough for every day, sincere enough for the ones that matter.',
    personalizable: false,
    recipients: ['girlfriend', 'wife', 'daughter'],
    image: 'assets/products/heart-solitaire-necklace-gold.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_heart_gold',
    letter: {
      icon: '❤️',
      eyebrow: 'To My Girlfriend',
      salutation: 'To My Beautiful Girlfriend,',
      body: 'You are the best part of my life and the reason my heart feels at home. Thank you for loving me, believing in me, and making every ordinary day feel extraordinary. No matter where life takes us, my love for you will only grow stronger. Wear this necklace as a reminder that you are loved beyond words.',
      signoff: 'Forever Yours.',
    },
  },
  {
    id: 'heart-solitaire-necklace-silver',
    name: 'Forever Heart Necklace',
    metal: 'silver',
    style: 'heart',
    price: 52,
    material: 'Rhodium-plated stainless steel, cubic zirconia solitaire',
    description: 'The same open heart in a cooler, quieter finish — for the person whose taste runs toward silver.',
    personalizable: false,
    recipients: ['mom', 'daughter', 'sister', 'best friend'],
    image: 'assets/products/heart-solitaire-necklace-silver.jpg',
    stripeLink: 'https://buy.stripe.com/REPLACE_heart_silver',
    letter: {
      icon: '👭',
      eyebrow: 'To My Best Friend',
      salutation: 'To My Best Friend,',
      body: 'Thank you for standing beside me through every laugh, every tear, and every chapter of life. True friendship is one of life’s greatest gifts, and I’m grateful every day that I found mine in you. No matter where life takes us, you’ll always have a special place in my heart.',
      signoff: 'Forever Friends.',
    },
  },
  {
    id: 'rose-name-necklace-gold',
    name: 'Rose & Name Necklace',
    metal: 'gold',
    style: 'name',
    price: 68,
    material: '18k gold-plated stainless steel',
    description: 'A single rose in bloom, with a name written beneath it in a hand that looks almost like your own. Every name is cut to order.',
    personalizable: true,
    recipients: ['mom', 'grandmother', 'daughter'],
    image: 'assets/products/rose-name-necklace-gold.jpg',
    imageFit: 'contain',
    stripeLink: 'https://buy.stripe.com/REPLACE_rose_name_gold',
    letter: {
      icon: '👵',
      eyebrow: 'To My Grandma',
      salutation: 'To My Beautiful Grandma,',
      body: 'Your love has been a guiding light throughout my life. Thank you for every hug, every lesson, and every memory you’ve given me. You are truly one of life’s greatest blessings, and I hope this necklace reminds you how much you are loved every single day.',
      signoff: 'With Love Always.',
    },
  },
  {
    id: 'name-necklace-gold',
    name: 'Custom Name Necklace',
    metal: 'gold',
    style: 'name',
    price: 49,
    material: '18k gold-plated stainless steel',
    description: 'One name, cast in a fine cursive line and hung from a chain built to be worn daily. The most-gifted piece in the collection, for exactly that reason.',
    personalizable: true,
    recipients: ['girlfriend', 'daughter', 'best friend', 'sister'],
    image: 'assets/products/name-necklace-gold.jpg',
    imageFit: 'contain',
    stripeLink: 'https://buy.stripe.com/REPLACE_name_gold',
    letter: {
      icon: '👧',
      eyebrow: 'To My Daughter',
      salutation: 'To My Precious Daughter,',
      body: 'Never forget how loved you are. Be brave enough to chase your dreams, kind enough to lift others, and strong enough to overcome every challenge. Wherever life takes you, my love will always be with you. Wear this necklace and remember you’ll always have a place in my heart.',
      signoff: 'Love, Dad/Mom.',
    },
  },
  {
    id: 'name-necklace-silver',
    name: 'Custom Name Necklace',
    metal: 'silver',
    style: 'name',
    price: 46,
    material: 'Rhodium-plated stainless steel',
    description: 'The same script name in a brighter, cooler finish — for someone whose jewellery box runs silver and white gold.',
    personalizable: true,
    recipients: ['mom', 'daughter', 'sister', 'best friend', 'girlfriend'],
    image: 'assets/products/name-necklace-silver.jpg',
    imageFit: 'contain',
    stripeLink: 'https://buy.stripe.com/REPLACE_name_silver',
    letter: {
      icon: '👩',
      eyebrow: 'To My Mom',
      salutation: 'To My Wonderful Mom,',
      body: 'No words could ever thank you for everything you’ve done for me. Your love, strength, and kindness have shaped the person I am today. No matter how old I get, I’ll always be grateful to call you my mom. This necklace is a small reminder of how deeply you are loved.',
      signoff: 'With All My Love.',
    },
  },
];

const STYLE_LABELS = {
  knot: 'Knot',
  heart: 'Heart',
  name: 'Personalized Name',
};

function formatPrice(n){
  return '$' + n.toLocaleString('en-US');
}

function getProduct(id){
  return PRODUCTS.find((p) => p.id === id);
}
