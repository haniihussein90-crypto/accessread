import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Design tokens ───────────────────────────────────────────────────────────
const DARK = {
  bg: '#0f0f0f', card: '#1a1a1a', card2: '#252525', border: '#2e2e2e',
  text: '#ffffff', muted: '#888888', blue: '#1E88E5', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', purple: '#a855f7', orange: '#f97316',
};
const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', card2: '#e8e8e8', border: '#d0d0d0',
  text: '#111111', muted: '#666666', blue: '#1565C0', green: '#16a34a',
  red: '#dc2626', yellow: '#d97706', purple: '#7c3aed', orange: '#ea580c',
};

const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const COUNTRIES = [
  { name: 'Afghanistan', e: '119' }, { name: 'Albania', e: '112' }, { name: 'Algeria', e: '14' },
  { name: 'Argentina', e: '911' }, { name: 'Australia', e: '000' }, { name: 'Austria', e: '112' },
  { name: 'Bangladesh', e: '999' }, { name: 'Belgium', e: '112' }, { name: 'Brazil', e: '190' },
  { name: 'Canada', e: '911' }, { name: 'Chile', e: '131' }, { name: 'China', e: '120' },
  { name: 'Colombia', e: '123' }, { name: 'Denmark', e: '112' }, { name: 'Egypt', e: '123' },
  { name: 'Ethiopia', e: '911' }, { name: 'Finland', e: '112' }, { name: 'France', e: '15' },
  { name: 'Germany', e: '112' }, { name: 'Ghana', e: '999' }, { name: 'Greece', e: '112' },
  { name: 'India', e: '102' }, { name: 'Indonesia', e: '119' }, { name: 'Iran', e: '115' },
  { name: 'Iraq', e: '122' }, { name: 'Ireland', e: '112' }, { name: 'Israel', e: '101' },
  { name: 'Italy', e: '118' }, { name: 'Japan', e: '119' }, { name: 'Jordan', e: '911' },
  { name: 'Kenya', e: '999' }, { name: 'Malaysia', e: '999' }, { name: 'Mexico', e: '911' },
  { name: 'Morocco', e: '15' }, { name: 'Netherlands', e: '112' }, { name: 'New Zealand', e: '111' },
  { name: 'Nigeria', e: '199' }, { name: 'Norway', e: '113' }, { name: 'Pakistan', e: '1122' },
  { name: 'Peru', e: '106' }, { name: 'Philippines', e: '911' }, { name: 'Poland', e: '112' },
  { name: 'Portugal', e: '112' }, { name: 'Romania', e: '112' }, { name: 'Russia', e: '103' },
  { name: 'Saudi Arabia', e: '997' }, { name: 'South Africa', e: '10177' }, { name: 'South Korea', e: '119' },
  { name: 'Spain', e: '112' }, { name: 'Sweden', e: '112' }, { name: 'Switzerland', e: '144' },
  { name: 'Thailand', e: '1669' }, { name: 'Turkey', e: '112' }, { name: 'UAE', e: '998' },
  { name: 'UK', e: '999' }, { name: 'USA', e: '911' }, { name: 'Vietnam', e: '115' },
  { name: 'Zimbabwe', e: '999' },
];

const SCAN_TYPES = [
  { id: 'general', label: 'General', icon: '📄' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'food', label: 'Food Label', icon: '🥫' },
  { id: 'currency', label: 'Currency', icon: '💵' },
  { id: 'barcode', label: 'Barcode', icon: '🔲' },
  { id: 'color', label: 'Color ID', icon: '🎨' },
];

const PREMIUM_FEATURES = [
  { icon: '🍳', label: 'AI Cooking Assistant', desc: 'Scan food labels → recipes & nutrition' },
  { icon: '✈️', label: 'Flight Scanner', desc: 'Scan boarding passes → flight info' },
  { icon: '🎨', label: 'Color Detection', desc: 'Detect dominant colors in any image' },
  { icon: '∞', label: 'Unlimited Scans', desc: 'No daily scan limits' },
  { icon: '🤖', label: 'AI Chat', desc: 'Ask anything about your scans' },
  { icon: '📤', label: 'History Export', desc: 'Export scan history as PDF/CSV' },
  { icon: '🔊', label: 'ElevenLabs TTS', desc: 'Premium AI voices' },
  { icon: '💬', label: 'Smart Parsing', desc: 'Structured data extraction' },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(ls.get('darkMode', true));
  const C = darkMode ? DARK : LIGHT;

  // Styles (recreated when theme changes)
  const btn = (bg, extra = {}) => ({
    background: bg, color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    width: '100%', marginBottom: 10, transition: 'opacity 0.15s', ...extra,
  });
  const inp = {
    background: darkMode ? '#111' : '#f0f0f0', border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.text, padding: '10px 14px', fontSize: 15,
    width: '100%', boxSizing: 'border-box', marginBottom: 10, outline: 'none',
  };
  const lbl = { fontSize: 13, color: C.muted, marginBottom: 4, display: 'block' };
  const h1s = { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 6px' };
  const h2s = { fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 10px' };
  const ps = { fontSize: 14, color: C.muted, lineHeight: 1.5, margin: '0 0 10px' };
  const tag = (bg) => ({
    background: bg, color: '#fff', borderRadius: 8, padding: '3px 10px',
    fontSize: 12, fontWeight: 600, display: 'inline-block',
  });

  // Screen / nav
  const [screen, setScreen] = useState(ls.get('agreedToTerms', false) ? 'main' : 'legal');
  const [tab, setTab] = useState('home');

  // Legal
  const [legalAgreed, setLegalAgreed] = useState(false);

  // Medicine age check popup
  const [showAgeCheck, setShowAgeCheck] = useState(false);
  const [ageCheckDone, setAgeCheckDone] = useState(ls.get('ageCheckDone', false));

  // Scan
  const [scanType, setScanType] = useState('general');
  const [scannedImg, setScannedImg] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [processing, setProcessing] = useState(false);


  // Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [camActive, setCamActive] = useState(false);

  // Medicine modal
  const [medModal, setMedModal] = useState(false);
  const [medChecks, setMedChecks] = useState({ allergic: false, dosage: false, expiry: false, interactions: false });

  // TTS
  const [reading, setReading] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [ttsRate, setTtsRate] = useState(1);
  const [elevenLabsVoice, setElevenLabsVoice] = useState('Rachel');

  // AI
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiClassify, setAiClassify] = useState(null);
  const [cookingResult, setCookingResult] = useState(null);
  const [cookingLoading, setCookingLoading] = useState(false);
  const [flightResult, setFlightResult] = useState(null);
  const [colorResult, setColorResult] = useState(null);

  // History & bookmarks
  const [history, setHistory] = useState(ls.get('history', []));
  const [bookmarks, setBookmarks] = useState(ls.get('bookmarks', []));

  // Settings
  const [fontSize, setFontSize] = useState(ls.get('fontSize', 16));
  const [haptic, setHaptic] = useState(ls.get('haptic', true));

  // Emergency
  const [countryQ, setCountryQ] = useState('');
  const [savedCountries, setSavedCountries] = useState(ls.get('savedCountries', []));
  const [contacts, setContacts] = useState(ls.get('contacts', []));
  const [ctName, setCtName] = useState('');
  const [ctPhone, setCtPhone] = useState('');

  // Premium
  const [isPremium, setIsPremium] = useState(ls.get('isPremium', false));
  const [scanCount, setScanCount] = useState(ls.get('scanCount', 0));
  const [selPlan, setSelPlan] = useState('monthly');
  const [selPay, setSelPay] = useState('card');
  const [premProcessing, setPremProcessing] = useState(false);
  const [showPremModal, setShowPremModal] = useState(false);
  const [premSuccess, setPremSuccess] = useState(false);

  // Pinch zoom
  const [zoom, setZoom] = useState(1);
  const touchRef = useRef({});

  useEffect(() => {
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    synth.onvoiceschanged = load;
    load();
  }, []);

  // ── TTS ──
  const speakBrowser = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = voices[voiceIdx] || null;
    utt.rate = ttsRate;
    utt.onend = () => setReading(false);
    utt.onerror = () => setReading(false);
    setReading(true);
    window.speechSynthesis.speak(utt);
  }, [voices, voiceIdx, ttsRate]);

  const speakElevenLabs = useCallback(async (text) => {
    const key = process.env.REACT_APP_ELEVENLABS_API_KEY;
    if (!key) { speakBrowser(text); return; }
    const VOICE_IDS = { Rachel: '21m00Tcm4TlvDq8ikWAM', Domi: 'AZnzlk1XvdvUeBnXmlld', Bella: 'EXAVITQu4vr4xnSDxMaL' };
    const vid = VOICE_IDS[elevenLabsVoice] || VOICE_IDS.Rachel;
    setReading(true);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setReading(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch { speakBrowser(text); }
  }, [elevenLabsVoice, speakBrowser]);

  const speak = isPremium ? speakElevenLabs : speakBrowser;
  const stopSpeak = () => { window.speechSynthesis.cancel(); setReading(false); };

  // ── Claude API (proxied through /api/claude — key never leaves server) ──
  const callClaude = useCallback(async (prompt, systemMsg = '') => {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 500,
        system: systemMsg || 'You are a helpful accessibility assistant.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d.content?.[0]?.text || '';
  }, []);

  // ── OCR ──
  const detectColors = useCallback((imgData) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, Math.min(img.width, 100), Math.min(img.height, 100)).data;
      const buckets = {};
      for (let i = 0; i < d.length; i += 4) {
        const r = Math.round(d[i] / 32) * 32, g = Math.round(d[i+1] / 32) * 32, b = Math.round(d[i+2] / 32) * 32;
        const k = `${r},${g},${b}`;
        buckets[k] = (buckets[k] || 0) + 1;
      }
      const top = Object.entries(buckets).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => {
        const [r,g,b] = k.split(',');
        return `#${(+r).toString(16).padStart(2,'0')}${(+g).toString(16).padStart(2,'0')}${(+b).toString(16).padStart(2,'0')}`;
      });
      setColorResult(top);
    };
    img.src = imgData;
  }, []);

  const runOCR = useCallback(async (imgData) => {
    if (!window.Tesseract) { alert('OCR library not loaded. Check internet connection.'); return; }
    setProcessing(true); setOcrText(''); setAiClassify(null); setCookingResult(null); setFlightResult(null); setColorResult(null);
    try {
      if (scanType === 'color' && isPremium) { detectColors(imgData); setProcessing(false); setTab('results'); return; }
      const { data: { text } } = await window.Tesseract.recognize(imgData, 'eng', { logger: () => {} });
      const cleaned = text.trim();
      setOcrText(cleaned);
      const newCount = scanCount + 1;
      setScanCount(newCount); ls.set('scanCount', newCount);
      const entry = { id: Date.now(), type: scanType, text: cleaned, date: new Date().toLocaleString(), img: imgData };
      const newHist = [entry, ...history].slice(0, 10);
      setHistory(newHist); ls.set('history', newHist);
      if (scanType === 'medicine') { setMedModal(true); }
      setTab('results');
      // AI classify
      try {
        const r = await callClaude(`In 1 sentence, classify and describe this scanned text: "${cleaned.slice(0,300)}"`, 'You are a concise product classifier.');
        setAiClassify(r);
      } catch {}
    } catch (e) {
      alert('OCR failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [scanType, history, scanCount, callClaude, detectColors, isPremium]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    const msgs = [...chatMsgs, userMsg];
    setChatMsgs(msgs); setChatInput(''); setChatLoading(true);
    try {
      const system = ocrText ? `The user scanned text:\n${ocrText.slice(0,500)}\nAnswer questions about it helpfully.` : 'You are a helpful accessibility assistant.';
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system, messages: msgs }),
      });
      const d = await res.json();
      setChatMsgs([...msgs, { role: 'assistant', content: d.content?.[0]?.text || 'No response.' }]);
    } catch (e) {
      setChatMsgs([...msgs, { role: 'assistant', content: 'Error: ' + e.message }]);
    } finally { setChatLoading(false); }
  };

  const runCooking = async () => {
    if (!ocrText) return;
    setCookingLoading(true);
    try {
      const r = await callClaude(
        `Based on this food label:\n${ocrText.slice(0,400)}\nProvide: 1) A simple recipe idea, 2) Key nutrition highlights, 3) One health tip. Keep it brief.`,
        'You are a friendly nutritionist and chef.'
      );
      setCookingResult(r);
    } catch (e) { setCookingResult('Error: ' + e.message); }
    finally { setCookingLoading(false); }
  };

  const runFlightScan = async () => {
    if (!ocrText) return;
    try {
      const r = await callClaude(
        `Extract flight info from this boarding pass scan:\n${ocrText.slice(0,500)}\nReturn: Flight number, Origin, Destination, Departure time, Gate, Seat. Use plain text.`,
        'You are a travel assistant extracting boarding pass data.'
      );
      setFlightResult(r);
    } catch (e) { setFlightResult('Error: ' + e.message); }
  };

  // ── Camera ──
  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamActive(true);
    } catch { alert('Camera permission denied.'); }
  };

  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setCamActive(false); };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg');
    setScannedImg(data); stopCam(); runOCR(data);
    if (haptic && navigator.vibrate) navigator.vibrate(50);
  };

  // ── Premium ──
  const activatePremium = async () => {
    setPremProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsPremium(true); ls.set('isPremium', true);
    setPremProcessing(false); setShowPremModal(false); setPremSuccess(true);
  };

  const toggleBookmark = (entry) => {
    const exists = bookmarks.find(b => b.id === entry.id);
    const next = exists ? bookmarks.filter(b => b.id !== entry.id) : [entry, ...bookmarks].slice(0, 20);
    setBookmarks(next); ls.set('bookmarks', next);
  };

  // ── Pinch zoom ──
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      touchRef.current.dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchRef.current.zoom = zoom;
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && touchRef.current.dist) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom(Math.min(3, Math.max(1, touchRef.current.zoom * (d / touchRef.current.dist))));
    }
  };
  const onTouchEnd = () => { touchRef.current = {}; };

  const canScan = isPremium || scanCount < 10;

  const wrap = {
    maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: C.bg,
    color: C.text, fontFamily: "'Inter',sans-serif", display: 'flex',
    flexDirection: 'column', overflowX: 'hidden',
  };
  const hdr = { padding: '14px 18px 10px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 };

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Legal
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'legal') return (
    <div style={{ ...wrap, overflowY: 'auto' }}>
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>👁️</div>
          <h1 style={h1s}>AccessRead</h1>
          <p style={ps}>Accessibility-first OCR scanner. Please review and agree to continue.</p>
        </div>
        {[
          { icon: '⚠️', title: 'Medical Disclaimer', body: 'AccessRead is NOT a medical device. Medicine scan results are for reference only. Always consult a licensed healthcare professional before making medical decisions.' },
          { icon: '🚨', title: 'Emergency Services', body: 'This app does not replace emergency services. In any life-threatening situation, call your local emergency number immediately. Numbers shown are for reference only.' },
          { icon: '📜', title: 'Terms of Service', body: 'You may not use this app for illegal purposes. You are responsible for your own health and safety decisions. AccessRead is provided "as is" without warranties.' },
          { icon: '🔒', title: 'Privacy', body: 'Images are processed locally with Tesseract.js — we do not upload your photos. AI queries are sent to Anthropic (anonymized). No personal data is sold.' },
        ].map(s => (
          <div key={s.title} style={{ background: C.card2, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <h2 style={{ ...h2s, marginBottom: 6 }}>{s.icon} {s.title}</h2>
            <p style={{ ...ps, margin: 0 }}>{s.body}</p>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 8 }}>
          <input type="checkbox" id="agree" checked={legalAgreed} onChange={e => setLegalAgreed(e.target.checked)} style={{ width: 20, height: 20 }} />
          <label htmlFor="agree" style={{ color: C.text, fontSize: 14 }}>I have read and agree to all terms above</label>
        </div>
        <button style={btn(C.green, { opacity: legalAgreed ? 1 : 0.4, fontSize: 17, padding: '14px 20px' })} disabled={!legalAgreed}
          onClick={() => { ls.set('agreedToTerms', true); setScreen('main'); }}>
          Enter AccessRead →
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN APP
  // ══════════════════════════════════════════════════════════════════════════

  // ── BottomNav ──
  const BottomNav = () => (
    <div style={{ display: 'flex', background: C.card, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
      {[['home','🏠','Home'],['results','📄','Results'],['history','🕐','History'],['emergency','🚨','SOS'],['settings','⚙️','Settings']].map(([t,icon,lbl]) => (
        <button key={t} onClick={() => setTab(t)} style={{
          flex: 1, background: 'none', border: 'none', color: tab === t ? C.blue : C.muted,
          padding: '8px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 9, fontWeight: tab === t ? 700 : 400 }}>{lbl}</span>
        </button>
      ))}
    </div>
  );

  // ── Age Check Popup ──
  const AgeCheckPopup = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card2, borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>💊</div>
        <h2 style={h2s}>Medicine Scan</h2>
        <p style={ps}>Medicine information may include adult dosages and prescriptions. Are you 18+ or do you have parental guidance?</p>
        <button style={btn(C.blue)} onClick={() => { setAgeCheckDone(true); ls.set('ageCheckDone', true); setShowAgeCheck(false); }}>
          Yes, I'm 18+ / Have guidance
        </button>
        <button style={btn(C.card, { border: `1px solid ${C.border}`, color: C.muted })} onClick={() => { setShowAgeCheck(false); setScanType('general'); }}>
          No, go back
        </button>
      </div>
    </div>
  );

  // ── Medicine Modal ──
  const MedModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card2, borderRadius: 20, padding: 24, maxWidth: 400, width: '100%' }}>
        <h2 style={h2s}>💊 Medicine Safety Checklist</h2>
        <p style={{ ...ps, color: C.red }}>⚠️ Not medical advice. Consult a pharmacist or doctor.</p>
        {[
          ['allergic','✅ I am not allergic to any listed ingredients'],
          ['dosage','✅ I understand the correct dosage and schedule'],
          ['expiry','✅ I have checked the expiry date'],
          ['interactions','✅ I am aware of potential drug interactions'],
        ].map(([k, lbl]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="checkbox" checked={medChecks[k]} onChange={e => setMedChecks(p => ({ ...p, [k]: e.target.checked }))} style={{ width: 20, height: 20 }} />
            <label style={{ color: C.text, fontSize: 14 }}>{lbl}</label>
          </div>
        ))}
        <button style={btn(C.green, { opacity: Object.values(medChecks).every(Boolean) ? 1 : 0.45 })}
          disabled={!Object.values(medChecks).every(Boolean)} onClick={() => setMedModal(false)}>
          Confirm & Continue
        </button>
        <button style={btn(C.card, { border: `1px solid ${C.border}`, color: C.muted })} onClick={() => setMedModal(false)}>Dismiss</button>
      </div>
    </div>
  );

  // ── Premium Modal ──
  const PremiumModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px' }}>
        <div style={{ textAlign: 'right', marginBottom: 4 }}>
          <button style={{ background: 'none', border: 'none', color: C.muted, fontSize: 26, cursor: 'pointer' }} onClick={() => setShowPremModal(false)}>✕</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⭐</div>
          <h1 style={h1s}>AccessRead Premium</h1>
          <p style={ps}>Unlock everything. No limits.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[['monthly','$4.99','/month','Most Flexible'],['yearly','$39.99','/year','Save 33%']].map(([plan,price,per,badge]) => (
            <div key={plan} onClick={() => setSelPlan(plan)} style={{
              flex: 1, background: selPlan === plan ? (darkMode ? '#1a2f4a' : '#dbeafe') : C.card2,
              border: `2px solid ${selPlan === plan ? C.blue : C.border}`, borderRadius: 16,
              padding: 16, cursor: 'pointer', textAlign: 'center',
            }}>
              <span style={tag(selPlan === plan ? C.blue : C.muted)}>{badge}</span>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: '8px 0 2px' }}>{price}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{per}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card2, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h2 style={h2s}>What's included</h2>
          {PREMIUM_FEATURES.map(f => (
            <div key={f.label} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{f.label}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card2, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h2 style={h2s}>Payment Method</h2>
          {[['card','💳 Credit / Debit Card'],['paypal','🅿️ PayPal'],['apple','🍎 Apple Pay'],['google','🟢 Google Pay']].map(([m,lbl]) => (
            <div key={m} onClick={() => setSelPay(m)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 8,
              borderRadius: 10, border: `2px solid ${selPay === m ? C.blue : C.border}`,
              background: selPay === m ? (darkMode ? '#1a2f4a' : '#dbeafe') : (darkMode ? '#111' : '#f0f0f0'),
              cursor: 'pointer',
            }}>
              <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{lbl}</span>
              {selPay === m && <span style={{ color: C.blue, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>

        <button style={btn(C.green, { fontSize: 17, padding: '16px 20px', opacity: premProcessing ? 0.7 : 1 })}
          disabled={premProcessing} onClick={activatePremium}>
          {premProcessing ? '⏳ Processing payment...' : `Subscribe — ${selPlan === 'monthly' ? '$4.99/mo' : '$39.99/yr'} →`}
        </button>
        <p style={{ ...ps, textAlign: 'center', fontSize: 11, marginTop: 6 }}>Cancel anytime · Secure payment · No hidden fees</p>
      </div>
    </div>
  );

  // ── Premium Success ──
  const PremSuccess = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={h1s}>Welcome to Premium!</h1>
        <p style={ps}>Unlimited scans, AI Cooking Assistant, Flight Scanner, Color Detection, and ElevenLabs voices — all unlocked.</p>
        <button style={btn(C.green, { fontSize: 17 })} onClick={() => setPremSuccess(false)}>Start Scanning →</button>
      </div>
    </div>
  );

  // ── Tab: Home ──
  const HomeTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ ...h1s, flex: 1 }}>👁️ AccessRead</h1>
          <button onClick={() => { setDarkMode(!darkMode); ls.set('darkMode', !darkMode); }}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          {isPremium ? <span style={tag(C.green)}>PRO</span> : <span style={tag(C.muted)}>{Math.max(0, 10 - scanCount)} left</span>}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>Scan Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {SCAN_TYPES.map(st => {
              const locked = st.id === 'color' && !isPremium;
              return (
                <button key={st.id} onClick={() => {
                  if (locked) { setShowPremModal(true); return; }
                  if (st.id === 'medicine' && !ageCheckDone) { setScanType(st.id); setShowAgeCheck(true); return; }
                  setScanType(st.id);
                }} style={{
                  background: scanType === st.id ? C.blue : (darkMode ? '#111' : '#e8e8e8'),
                  border: `2px solid ${scanType === st.id ? C.blue : C.border}`,
                  borderRadius: 10, padding: '10px 6px', color: C.text, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, position: 'relative',
                }}>
                  {st.icon}<br />{st.label}
                  {locked && <span style={{ ...tag(C.purple), position: 'absolute', top: -6, right: -6, padding: '1px 5px', fontSize: 9 }}>PRO</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14, textAlign: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 10, display: camActive ? 'block' : 'none', maxHeight: 240, objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {scannedImg && !camActive && <img src={scannedImg} alt="scan" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover', marginBottom: 10 }} />}
          {processing && <div style={{ padding: 24, color: C.blue, fontWeight: 700, fontSize: 16 }}>⏳ Processing OCR…</div>}

          {!camActive
            ? <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(canScan ? C.blue : C.muted, { flex: 1, margin: 0 })} onClick={() => canScan ? startCam() : setShowPremModal(true)}>
                  📷 Camera
                </button>
                <label style={{ ...btn(C.purple, { flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }), cursor: 'pointer' }}>
                  📁 Upload
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f && canScan) { const u = URL.createObjectURL(f); setScannedImg(u); runOCR(u); } else if (!canScan) setShowPremModal(true); }} />
                </label>
              </div>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(C.green, { flex: 1, margin: 0 })} onClick={capture}>📸 Capture</button>
                <button style={btn(C.red, { flex: 1, margin: 0 })} onClick={stopCam}>✕ Cancel</button>
              </div>
          }
        </div>

        {!isPremium && (
          <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>
            ⭐ Upgrade to Premium — $4.99/mo
          </button>
        )}

        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>🚨 Quick SOS</h2>
          {savedCountries.length === 0
            ? <p style={ps}>Save countries in the SOS tab to see quick-dial numbers here.</p>
            : savedCountries.slice(0, 3).map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{c.name}</span>
                  <a href={`tel:${c.e}`} style={{ ...tag(C.red), textDecoration: 'none', padding: '5px 14px' }}>📞 {c.e}</a>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );

  // ── Tab: Results ──
  const ResultsTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1s}>📄 Results</h1></div>
      <div style={{ padding: 16 }}>
        {colorResult && (
          <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <h2 style={h2s}>🎨 Detected Colors</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              {colorResult.map(hex => (
                <div key={hex} style={{ textAlign: 'center' }}>
                  <div style={{ width: 60, height: 60, background: hex, borderRadius: 12, border: `2px solid ${C.border}`, marginBottom: 4 }} />
                  <code style={{ fontSize: 11, color: C.muted }}>{hex}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {!ocrText && !colorResult && (
          <div style={{ background: C.card2, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <p style={{ ...ps, fontSize: 16 }}>No scan yet. Go to Home and scan something.</p>
          </div>
        )}

        {ocrText && (
          <>
            <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ ...h2s, flex: 1, margin: 0 }}>Extracted Text</h2>
                <span style={tag(C.purple)}>{scanType}</span>
                <button onClick={() => toggleBookmark(history[0])} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginLeft: 8 }}>
                  {bookmarks.find(b => b.id === history[0]?.id) ? '🔖' : '🏷️'}
                </button>
              </div>
              <p style={{ ...ps, color: C.text, fontSize: fontSize, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 12px' }}>{ocrText}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(reading ? C.red : C.blue, { flex: 1, margin: 0 })} onClick={() => reading ? stopSpeak() : speak(ocrText)}>
                  {reading ? '⏹ Stop' : '▶ Read Aloud'}
                </button>
                <button style={btn(C.card, { flex: 1, margin: 0, border: `1px solid ${C.border}`, color: C.text })} onClick={() => navigator.clipboard?.writeText(ocrText)}>
                  📋 Copy
                </button>
              </div>
            </div>

            <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <h2 style={h2s}>🔊 TTS Controls</h2>
              {isPremium ? (
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>ElevenLabs Voice</label>
                  <select value={elevenLabsVoice} onChange={e => setElevenLabsVoice(e.target.value)} style={inp}>
                    {['Rachel','Domi','Bella'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Browser Voice</label>
                  <select value={voiceIdx} onChange={e => setVoiceIdx(+e.target.value)} style={inp}>
                    {voices.map((v, i) => <option key={i} value={i}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>
              )}
              <label style={lbl}>Speed: {ttsRate.toFixed(1)}x</label>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={e => setTtsRate(+e.target.value)} style={{ width: '100%' }} />
              {!isPremium && <button style={btn(C.purple, { marginTop: 8 })} onClick={() => setShowPremModal(true)}>🔓 Upgrade for ElevenLabs Voices</button>}
            </div>

            {aiClassify && (
              <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14, borderLeft: `3px solid ${C.purple}` }}>
                <h2 style={h2s}>🤖 AI Classification</h2>
                <p style={{ ...ps, margin: 0 }}>{aiClassify}</p>
              </div>
            )}

            {isPremium && scanType === 'food' && (
              <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
                <h2 style={h2s}>🍳 AI Cooking Assistant</h2>
                {cookingResult
                  ? <p style={{ ...ps, color: C.text, whiteSpace: 'pre-wrap' }}>{cookingResult}</p>
                  : <button style={btn(C.orange, { marginBottom: 0 })} onClick={runCooking} disabled={cookingLoading}>
                      {cookingLoading ? '⏳ Analyzing…' : '🍳 Get Recipe & Nutrition Tips'}
                    </button>
                }
              </div>
            )}

            {isPremium && (scanType === 'general' || scanType === 'barcode') && (
              <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
                <h2 style={h2s}>✈️ Flight Scanner</h2>
                {flightResult
                  ? <p style={{ ...ps, color: C.text, whiteSpace: 'pre-wrap' }}>{flightResult}</p>
                  : <button style={btn(C.blue, { marginBottom: 0 })} onClick={runFlightScan}>✈️ Extract Flight Info</button>
                }
              </div>
            )}

            {scanType === 'medicine' && (
              <button style={btn(C.yellow)} onClick={() => setMedModal(true)}>💊 Open Medicine Safety Checklist</button>
            )}

            <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ ...h2s, flex: 1, margin: 0 }}>💬 AI Chat</h2>
                {!isPremium && <span style={tag(C.purple)}>Premium</span>}
                <button onClick={() => isPremium ? setShowChat(!showChat) : setShowPremModal(true)}
                  style={{ background: C.blue, border: 'none', borderRadius: 8, color: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 13, marginLeft: 8 }}>
                  {showChat ? 'Hide' : 'Chat'}
                </button>
              </div>
              {showChat && isPremium && (
                <>
                  <div style={{ background: darkMode ? '#111' : '#f0f0f0', borderRadius: 10, padding: 12, minHeight: 100, maxHeight: 220, overflowY: 'auto', marginBottom: 10 }}>
                    {chatMsgs.length === 0 && <p style={{ ...ps, textAlign: 'center' }}>Ask anything about this scan…</p>}
                    {chatMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <span style={tag(m.role === 'user' ? C.blue : C.purple)}>{m.role === 'user' ? 'You' : 'AI'}</span>
                        <p style={{ ...ps, marginTop: 4, color: C.text }}>{m.content}</p>
                      </div>
                    ))}
                    {chatLoading && <p style={{ color: C.muted, fontSize: 13 }}>Thinking…</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, flex: 1, marginBottom: 0 }} placeholder="Ask about this scan…" value={chatInput}
                      onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                    <button style={{ background: C.blue, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={sendChat}>→</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── Tab: History ──
  const HistoryTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1s}>🕐 History & Bookmarks</h1></div>
      <div style={{ padding: 16 }}>
        {bookmarks.length > 0 && (
          <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <h2 style={h2s}>🔖 Bookmarks</h2>
            {bookmarks.map(e => (
              <div key={e.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ ...tag(C.purple), marginRight: 8 }}>{e.type}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{e.date}</span>
                  <button onClick={() => toggleBookmark(e)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
                </div>
                <p style={{ ...ps, color: C.text, margin: 0, fontSize: 13 }}>{e.text?.slice(0, 100)}{e.text?.length > 100 ? '…' : ''}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>Recent Scans (last 10)</h2>
          {history.length === 0 && <p style={ps}>No scans yet.</p>}
          {history.map(e => (
            <div key={e.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ ...tag(C.blue), marginRight: 8 }}>{e.type}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{e.date}</span>
                <button onClick={() => toggleBookmark(e)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
                  {bookmarks.find(b => b.id === e.id) ? '🔖' : '🏷️'}
                </button>
              </div>
              <p style={{ ...ps, color: C.text, margin: 0, fontSize: 13 }}>{e.text?.slice(0, 120)}{e.text?.length > 120 ? '…' : ''}</p>
              <button onClick={() => { setOcrText(e.text); setScanType(e.type); setTab('results'); }} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.blue, padding: '3px 10px', cursor: 'pointer', fontSize: 12, marginTop: 6 }}>
                View →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab: Emergency ──
  const EmergencyTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1s}>🚨 Emergency / SOS</h1></div>
      <div style={{ padding: 16 }}>
        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>Find Emergency Number</h2>
          <input style={inp} placeholder="Search country…" value={countryQ} onChange={e => setCountryQ(e.target.value)} />
          {countryQ && COUNTRIES.filter(c => c.name.toLowerCase().includes(countryQ.toLowerCase())).slice(0, 8).map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{c.name}</span>
              <a href={`tel:${c.e}`} style={{ ...tag(C.red), textDecoration: 'none' }}>📞 {c.e}</a>
              <button style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { if (!savedCountries.find(s => s.name === c.name)) { const n = [...savedCountries, c]; setSavedCountries(n); ls.set('savedCountries', n); } }}>
                + Save
              </button>
            </div>
          ))}
        </div>

        {savedCountries.length > 0 && (
          <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <h2 style={h2s}>Saved Countries</h2>
            {savedCountries.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ flex: 1, color: C.text }}>{c.name}</span>
                <a href={`tel:${c.e}`} style={{ ...tag(C.red), textDecoration: 'none', marginRight: 6 }}>📞 {c.e}</a>
                <button style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 18 }}
                  onClick={() => { const n = savedCountries.filter(s => s.name !== c.name); setSavedCountries(n); ls.set('savedCountries', n); }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>Personal Emergency Contacts</h2>
          <input style={inp} placeholder="Contact name" value={ctName} onChange={e => setCtName(e.target.value)} />
          <input style={inp} placeholder="Phone number" value={ctPhone} onChange={e => setCtPhone(e.target.value)} />
          <button style={btn(C.blue)} onClick={() => {
            if (ctName && ctPhone) {
              const n = [...contacts, { name: ctName, phone: ctPhone }];
              setContacts(n); ls.set('contacts', n); setCtName(''); setCtPhone('');
            }
          }}>+ Add Contact</button>
          {contacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, color: C.text }}>{c.name}</span>
              <a href={`tel:${c.phone}`} style={{ ...tag(C.blue), textDecoration: 'none', marginRight: 6 }}>📞 {c.phone}</a>
              <button style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 18 }}
                onClick={() => { const n = contacts.filter((_, j) => j !== i); setContacts(n); ls.set('contacts', n); }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab: Settings ──
  const SettingsTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1s}>⚙️ Settings</h1></div>
      <div style={{ padding: 16 }}>
        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>Display</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: C.text, fontSize: 14 }}>Dark Mode</span>
            <div onClick={() => { setDarkMode(!darkMode); ls.set('darkMode', !darkMode); }} style={{
              width: 46, height: 26, borderRadius: 13, background: darkMode ? C.blue : C.border,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}>
              <div style={{ position: 'absolute', top: 3, left: darkMode ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
          <label style={lbl}>Font Size: {fontSize}px</label>
          <input type="range" min="12" max="32" step="2" value={fontSize} onChange={e => { setFontSize(+e.target.value); ls.set('fontSize', +e.target.value); }} style={{ width: '100%', marginBottom: 8 }} />
          <p style={{ ...ps, fontSize: fontSize, margin: 0, color: C.text }}>Sample text at this size</p>
        </div>

        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ ...h2s, margin: 0 }}>Haptic Feedback</h2>
              <p style={{ ...ps, margin: 0, fontSize: 12, marginTop: 2 }}>Vibrate on capture (mobile)</p>
            </div>
            <div onClick={() => { setHaptic(!haptic); ls.set('haptic', !haptic); }} style={{
              width: 46, height: 26, borderRadius: 13, background: haptic ? C.green : C.border,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}>
              <div style={{ position: 'absolute', top: 3, left: haptic ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
        </div>

        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>Account</h2>
          {isPremium
            ? <><span style={tag(C.green)}>⭐ Premium Active</span><p style={{ ...ps, marginTop: 10 }}>All features unlocked. Thank you!</p>
                <button style={btn(C.red)} onClick={() => { setIsPremium(false); ls.set('isPremium', false); }}>Cancel Subscription</button></>
            : <><p style={ps}>{Math.max(0, 10 - scanCount)} free scans remaining today.</p>
                <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>⭐ Upgrade to Premium</button></>
          }
        </div>

        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>Data</h2>
          <button style={btn(darkMode ? C.card : '#e8e8e8', { border: `1px solid ${C.border}`, color: C.text })}
            onClick={() => { setHistory([]); ls.set('history', []); setScanCount(0); ls.set('scanCount', 0); setBookmarks([]); ls.set('bookmarks', []); alert('Cleared.'); }}>
            🗑 Clear All History & Bookmarks
          </button>
          <button style={btn(C.red)} onClick={() => { localStorage.clear(); setScreen('legal'); }}>
            ⚠️ Reset App
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ──
  return (
    <div style={wrap} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        {tab === 'home' && <HomeTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'emergency' && <EmergencyTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
      <BottomNav />
      {showAgeCheck && <AgeCheckPopup />}
      {medModal && <MedModal />}
      {showPremModal && <PremiumModal />}
      {premSuccess && <PremSuccess />}
    </div>
  );
}
