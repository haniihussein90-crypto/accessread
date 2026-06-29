import { createClient } from '@supabase/supabase-js';

// Called by the client right after a successful Supabase sign-in. Upserts the
// user row (server-side, service role) so a fresh account exists in `users`,
// and returns the current premium state from the database source of truth.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase env vars not configured on server' });

  const { userId, email } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: 'userId and email are required' });

  const admin = createClient(url, serviceKey);

  try {
    // Insert the user if new; never downgrade an existing premium flag.
    const { data: existing } = await admin.from('users').select('id, isPremium, premiumExpiry').eq('id', userId).maybeSingle();
    if (!existing) {
      await admin.from('users').insert({ id: userId, email, isPremium: false });
      return res.status(200).json({ isPremium: false, premiumExpiry: null, new: true });
    }
    const active = existing.isPremium && (!existing.premiumExpiry || new Date(existing.premiumExpiry) > new Date());
    return res.status(200).json({ isPremium: !!active, premiumExpiry: existing.premiumExpiry || null, new: false });
  } catch (err) {
    console.error('auth-callback error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Auth callback failed' });
  }
}
