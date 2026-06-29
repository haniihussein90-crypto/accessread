const VOICE_IDS = {
  Rachel: '21m00Tcm4TlvDq8ikWAM',
  Domi: 'AZnzlk1XvdvUeBnXmlld',
  Bella: 'EXAVITQu4vr4xnSDxMaL',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on server' });

  const { text, voice = 'Rachel' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const voiceId = VOICE_IDS[voice] || VOICE_IDS.Rachel;

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 500),
        // multilingual_v2 covers all 12 supported languages (EN, ES, ZH, HI,
        // AR, PT, RU, JA, PA, FR, NL, VI) and auto-detects from the text.
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: 'ElevenLabs error: ' + err });
    }

    const buf = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate speech' });
  }
}
