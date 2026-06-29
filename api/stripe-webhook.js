import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe webhook — source of truth for premium status. Verifies the signature
// and writes premium state to the Supabase `users` table.
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.
export const config = { api: { bodyParser: false } };

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

// Find a user by id (metadata) first, then fall back to email, and flip premium.
async function setPremium(db, { userId, email }, isPremium, premiumExpiry) {
  if (!db) { console.error('Supabase not configured — cannot persist premium'); return; }
  const patch = { isPremium, premiumExpiry: premiumExpiry || null };
  if (userId) {
    const { error } = await db.from('users').update(patch).eq('id', userId);
    if (!error) return;
  }
  if (email) {
    await db.from('users').update(patch).eq('email', email);
  }
}

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

  const db = admin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id || '';
        const email = session.metadata?.email || session.customer_details?.email || session.customer_email || '';
        // Subscription renews monthly; grant ~32 days, renewals re-trigger this.
        const expiry = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
        await setPremium(db, { userId, email }, true, expiry);
        console.log('Premium granted to', userId || email);
        break;
      }
      case 'invoice.paid': {
        // Recurring renewal — extend premium another period.
        const inv = event.data.object;
        const email = inv.customer_email || '';
        const userId = inv.subscription_details?.metadata?.userId || inv.lines?.data?.[0]?.metadata?.userId || '';
        const expiry = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
        if (userId || email) await setPremium(db, { userId, email }, true, expiry);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId || '';
        await setPremium(db, { userId, email: '' }, false, null);
        console.log('Premium revoked for subscription', sub.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('webhook fulfillment error:', err?.message);
    // Still 200 so Stripe doesn't retry forever on a non-signature error.
  }

  return res.status(200).json({ received: true });
}
