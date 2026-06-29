import Stripe from 'stripe';

// Creates a Stripe Checkout session for the AccessRead Premium subscription.
// Requires env vars: STRIPE_SECRET_KEY and STRIPE_PRICE_ID (the $2.99/mo price).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured on server' });

  const stripe = new Stripe(secret);
  const { priceId, userId } = req.body || {};
  const price = priceId || process.env.STRIPE_PRICE_ID;
  if (!price) return res.status(400).json({ error: 'No priceId provided and STRIPE_PRICE_ID not set' });

  // Build absolute return URLs from the incoming request origin.
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId || undefined,
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('stripe-checkout error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Could not create checkout session' });
  }
}
