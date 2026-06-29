const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Supported languages: English, Spanish, Mandarin Chinese, Hindi, Arabic,
// Portuguese, Russian, Japanese, Punjabi, French, Dutch, Vietnamese.
const LANG_INSTRUCTION =
  ' The text may be in any of these languages: English, Spanish, Mandarin Chinese, ' +
  'Hindi, Arabic, Portuguese, Russian, Japanese, Punjabi, French, Dutch, or Vietnamese. ' +
  'Transcribe the text in its ORIGINAL language and script exactly as written — do not translate.';

const PROMPTS = {
  general: 'Extract ALL text visible in this image exactly as it appears.' + LANG_INSTRUCTION + ' Return only the extracted text, no commentary. If there is no readable text, respond with exactly "NO_TEXT_FOUND".',
  medicine: 'This is a photo of medicine or a medication label. Extract ALL text exactly as it appears — drug name, strength, dosage instructions, warnings, expiry date.' + LANG_INSTRUCTION + ' Return only the extracted text, no commentary. If no readable text, respond with exactly "NO_TEXT_FOUND".',
  food: 'This is a photo of a food product or nutrition label. Extract ALL text exactly as it appears — product name, ingredients, nutrition facts, allergens.' + LANG_INSTRUCTION + ' Return only the extracted text, no commentary. If no readable text, respond with exactly "NO_TEXT_FOUND".',
  currency: 'Extract any text, numbers, and denomination visible on this currency/banknote.' + LANG_INSTRUCTION + ' Return only the extracted text, no commentary. If no readable text, respond with exactly "NO_TEXT_FOUND".',
  barcode: 'Extract any text, numbers, and barcode digits visible in this image.' + LANG_INSTRUCTION + ' Return only the extracted text, no commentary. If no readable text, respond with exactly "NO_TEXT_FOUND".',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ text: null, error: 'Method not allowed' });

  const key = process.env.CLAUDE_API_KEY;
  if (!key) return res.status(500).json({ text: null, error: 'CLAUDE_API_KEY not configured on server' });

  const { imageBase64, image, scanType = 'general' } = req.body;
  const input = imageBase64 || image;
  if (!input) return res.status(400).json({ text: null, source: 'claude', error: 'image is required' });

  // Accept a full data URL ("data:image/jpeg;base64,...") or raw base64.
  let mediaType = 'image/jpeg';
  let base64 = input;
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.*)$/.exec(input);
  if (match) { mediaType = match[1]; base64 = match[2]; }
  // Raw PNG base64 (from canvas.toDataURL('image/png').split(',')[1]) — default
  // media_type to png when the caller used the imageBase64 field without a prefix.
  else if (imageBase64) { mediaType = 'image/png'; }

  const prompt = PROMPTS[scanType] || PROMPTS.general;

  try {
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ text: null, source: 'claude', error: data.error?.message || 'Vision API error' });
    }

    const raw = (data.content?.[0]?.text || '').trim();

    if (!raw || raw === 'NO_TEXT_FOUND') {
      return res.status(200).json({ text: '', source: 'claude', confidence: 0, error: null });
    }

    return res.status(200).json({ text: raw, source: 'claude', confidence: 95, error: null });
  } catch (err) {
    return res.status(500).json({ text: null, source: 'claude', error: err.message || 'could not read image' });
  }
}
