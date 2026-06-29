import Stripe from 'stripe';

// Verifies a completed Checkout session after the success redirect. Because
// the app has no server-side database yet, the client calls this with the
// session_id from the success URL to confirm payment before unlocking premium.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(500).json({ premium: false, error: 'STRIPE_SECRET_KEY not configured on server' });

  const sessionId = req.query?.session_id || req.body?.session_id;
  if (!sessionId) return res.status(400).json({ premium: false, error: 'session_id required' });

  const stripe = new Stripe(secret);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    return res.status(200).json({ premium: paid, status: session.status, payment_status: session.payment_status });
  } catch (err) {
    console.error('stripe-verify error:', err?.message);
    return res.status(500).json({ premium: false, error: err?.message || 'Could not verify session' });
  }
}
