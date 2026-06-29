import Stripe from 'stripe';

// Stripe webhook. Verifies the signature and reacts to subscription events.
// Requires env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
//
// NOTE: AccessRead has no server-side database yet, so this endpoint cannot
// persist premium status per user — premium is currently confirmed client-side
// via /api/stripe-verify after the success redirect. This webhook is wired up
// and signature-verified so that, once a DB/user store exists (Phase 2), you
// only need to fill in the fulfillment branches below.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return res.status(500).json({ error: 'Stripe env vars not configured on server' });
  }

  const stripe = new Stripe(secret);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err?.message);
    return res.status(400).json({ error: `Webhook Error: ${err?.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Phase 2: mark session.client_reference_id as premium in the DB.
      console.log('checkout.session.completed for', session.client_reference_id || session.customer);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      // Phase 2: revoke premium for the associated user.
      console.log('subscription canceled:', sub.id);
      break;
    }
    default:
      // Unhandled event types are fine to ignore.
      break;
  }

  return res.status(200).json({ received: true });
}
