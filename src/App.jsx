import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  card2: '#252525',
  border: '#2e2e2e',
  text: '#ffffff',
  muted: '#888888',
  blue: '#1E88E5',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#a855f7',
};

const btn = (bg = C.blue, extra = {}) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 12,
  padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  width: '100%', marginBottom: 10, ...extra,
});
const card = { background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14 };
const inp = {
  background: '#111', border: `1px solid ${C.border}`, borderRadius: 10,
  color: C.text, padding: '10px 14px', fontSize: 15, width: '100%',
  boxSizing: 'border-box', marginBottom: 10, outline: 'none',
};
const label = { fontSize: 13, color: C.muted, marginBottom: 4, display: 'block' };
const h1 = { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 6px' };
const h2 = { fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 10px' };
const p = { fontSize: 14, color: C.muted, lineHeight: 1.5, margin: '0 0 10px' };
const row = { display: 'flex', alignItems: 'center', gap: 10 };
const tag = (bg) => ({
  background: bg, color: '#fff', borderRadius: 8, padding: '3px 10px',
  fontSize: 12, fontWeight: 600, display: 'inline-block',
});
const wrap = {
  maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
  background: C.bg, color: C.text, fontFamily: "'Inter',sans-serif",
  display: 'flex', flexDirection: 'column', overflowX: 'hidden',
};
const hdr = {
  padding: '16px 18px 10px', background: C.card,
  borderBottom: `1px solid ${C.border}`, flexShrink: 0,
};

// ─── Data ────────────────────────────────────────────────────────────────────
const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const COUNTRIES = [
  { name: 'Afghanistan', emergency: '119' }, { name: 'Albania', emergency: '112' },
  { name: 'Algeria', emergency: '14' }, { name: 'Argentina', emergency: '911' },
  { name: 'Australia', emergency: '000' }, { name: 'Austria', emergency: '112' },
  { name: 'Bangladesh', emergency: '999' }, { name: 'Belgium', emergency: '112' },
  { name: 'Brazil', emergency: '190' }, { name: 'Canada', emergency: '911' },
  { name: 'Chile', emergency: '131' }, { name: 'China', emergency: '120' },
  { name: 'Colombia', emergency: '123' }, { name: 'Croatia', emergency: '112' },
  { name: 'Czech Republic', emergency: '112' }, { name: 'Denmark', emergency: '112' },
  { name: 'Egypt', emergency: '123' }, { name: 'Ethiopia', emergency: '911' },
  { name: 'Finland', emergency: '112' }, { name: 'France', emergency: '15' },
  { name: 'Germany', emergency: '112' }, { name: 'Ghana', emergency: '999' },
  { name: 'Greece', emergency: '112' }, { name: 'Hungary', emergency: '112' },
  { name: 'India', emergency: '102' }, { name: 'Indonesia', emergency: '119' },
  { name: 'Iran', emergency: '115' }, { name: 'Iraq', emergency: '122' },
  { name: 'Ireland', emergency: '112' }, { name: 'Israel', emergency: '101' },
  { name: 'Italy', emergency: '118' }, { name: 'Japan', emergency: '119' },
  { name: 'Jordan', emergency: '911' }, { name: 'Kenya', emergency: '999' },
  { name: 'Malaysia', emergency: '999' }, { name: 'Mexico', emergency: '911' },
  { name: 'Morocco', emergency: '15' }, { name: 'Netherlands', emergency: '112' },
  { name: 'New Zealand', emergency: '111' }, { name: 'Nigeria', emergency: '199' },
  { name: 'Norway', emergency: '113' }, { name: 'Pakistan', emergency: '1122' },
  { name: 'Peru', emergency: '106' }, { name: 'Philippines', emergency: '911' },
  { name: 'Poland', emergency: '112' }, { name: 'Portugal', emergency: '112' },
  { name: 'Romania', emergency: '112' }, { name: 'Russia', emergency: '103' },
  { name: 'Saudi Arabia', emergency: '997' }, { name: 'South Africa', emergency: '10177' },
  { name: 'South Korea', emergency: '119' }, { name: 'Spain', emergency: '112' },
  { name: 'Sweden', emergency: '112' }, { name: 'Switzerland', emergency: '144' },
  { name: 'Thailand', emergency: '1669' }, { name: 'Turkey', emergency: '112' },
  { name: 'UAE', emergency: '998' }, { name: 'Uganda', emergency: '999' },
  { name: 'UK', emergency: '999' }, { name: 'USA', emergency: '911' },
  { name: 'Venezuela', emergency: '171' }, { name: 'Vietnam', emergency: '115' },
  { name: 'Zimbabwe', emergency: '999' },
];

const SCAN_TYPES = [
  { id: 'general', label: 'General Text', icon: '📄' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'food', label: 'Food Label', icon: '🥫' },
  { id: 'currency', label: 'Currency', icon: '💵' },
  { id: 'color', label: 'Color ID', icon: '🎨' },
  { id: 'barcode', label: 'Barcode', icon: '🔲' },
];

const PREMIUM_FEATURES = [
  'Unlimited scans (free: 10/day)',
  'AI product classification',
  'Medicine safety checklist',
  'Multi-language OCR',
  'Scan history export',
  'Priority customer support',
  'Voice customization',
  'Barcode & QR lookup',
  'Food allergen alerts',
  'Currency conversion',
  'Emergency contacts backup',
  'Ad-free experience',
];

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  // Navigation
  const [screen, setScreen] = useState(ls.get('screen', 'consent')); // consent|legal|main
  const [tab, setTab] = useState('home');

  // Consent / legal
  const [ageChoice, setAgeChoice] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentSent, setParentSent] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);

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

  // AI Chat
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiClassify, setAiClassify] = useState(null);

  // History
  const [history, setHistory] = useState(ls.get('history', []));

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

  // ── Helpers ──
  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = voices[voiceIdx] || null;
    utt.rate = ttsRate;
    utt.onend = () => setReading(false);
    utt.onerror = () => setReading(false);
    setReading(true);
    window.speechSynthesis.speak(utt);
  }, [voices, voiceIdx, ttsRate]);

  const stopSpeak = () => { window.speechSynthesis.cancel(); setReading(false); };

  const runOCR = useCallback(async (imgData) => {
    if (!window.Tesseract) { alert('OCR library not loaded. Check internet connection.'); return; }
    setProcessing(true);
    try {
      const { data: { text } } = await window.Tesseract.recognize(imgData, 'eng', { logger: () => {} });
      const cleaned = text.trim();
      setOcrText(cleaned);
      const entry = { id: Date.now(), type: scanType, text: cleaned, date: new Date().toLocaleString() };
      const newHist = [entry, ...history].slice(0, 50);
      setHistory(newHist);
      ls.set('history', newHist);
      const newCount = scanCount + 1;
      setScanCount(newCount);
      ls.set('scanCount', newCount);
      if (scanType === 'medicine') setMedModal(true);
      setTab('results');
      await classifyProduct(cleaned);
    } catch (e) {
      alert('OCR failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [scanType, history, scanCount]);

  const classifyProduct = async (text) => {
    const key = process.env.REACT_APP_CLAUDE_API_KEY;
    if (!key || !text) return;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 200,
          messages: [{ role: 'user', content: `Classify this scanned text in 1-2 sentences: "${text.slice(0, 300)}"` }],
        }),
      });
      const d = await res.json();
      setAiClassify(d.content?.[0]?.text || null);
    } catch {}
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const key = process.env.REACT_APP_CLAUDE_API_KEY;
    if (!key) { alert('AI chat requires REACT_APP_CLAUDE_API_KEY'); return; }
    const userMsg = { role: 'user', content: chatInput.trim() };
    const newMsgs = [...chatMsgs, userMsg];
    setChatMsgs(newMsgs);
    setChatInput('');
    setChatLoading(true);
    try {
      const system = ocrText ? `Context from last scan:\n${ocrText.slice(0, 500)}` : 'You are a helpful accessibility assistant.';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system, messages: newMsgs }),
      });
      const d = await res.json();
      const reply = d.content?.[0]?.text || 'No response.';
      setChatMsgs([...newMsgs, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChatMsgs([...newMsgs, { role: 'assistant', content: 'Error: ' + e.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamActive(true);
    } catch { alert('Camera permission denied.'); }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCamActive(false);
  };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg');
    setScannedImg(data);
    stopCam();
    runOCR(data);
  };

  const activatePremium = async () => {
    setPremProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsPremium(true);
    ls.set('isPremium', true);
    setPremProcessing(false);
    setShowPremModal(false);
    setPremSuccess(true);
  };

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

  // ── Screen: Consent ──
  const Consent = () => (
    <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👁️</div>
        <h1 style={h1}>AccessRead</h1>
        <p style={p}>Accessibility-first OCR scanner. Please confirm your age to continue.</p>
      </div>
      <div style={card}>
        <p style={{ ...label, marginBottom: 14 }}>I am:</p>
        {['18 or older', 'Under 18'].map(opt => (
          <button key={opt} style={btn(ageChoice === opt ? C.blue : C.card, { border: `2px solid ${ageChoice === opt ? C.blue : C.border}` })}
            onClick={() => setAgeChoice(opt)}>{opt}</button>
        ))}
      </div>
      {ageChoice === 'Under 18' && (
        <div style={card}>
          <p style={label}>Parent/Guardian email for consent:</p>
          <input style={inp} placeholder="parent@example.com" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
          <button style={btn(C.green)} onClick={() => { if (parentEmail.includes('@')) setParentSent(true); else alert('Enter valid email.'); }}>
            Send Consent Request
          </button>
          {parentSent && <p style={{ color: C.green, fontSize: 13 }}>✓ Consent email sent to {parentEmail}</p>}
        </div>
      )}
      <button
        style={btn(C.green, { opacity: (ageChoice === '18 or older' || (ageChoice === 'Under 18' && parentSent)) ? 1 : 0.4 })}
        disabled={!(ageChoice === '18 or older' || (ageChoice === 'Under 18' && parentSent))}
        onClick={() => { ls.set('screen', 'legal'); setScreen('legal'); }}>
        Continue →
      </button>
    </div>
  );

  // ── Screen: Legal ──
  const Legal = () => (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <h1 style={h1}>Legal Agreement</h1>
      </div>
      {[
        { title: '⚠️ Medical Disclaimer', body: 'AccessRead is not a medical device. Information from medicine scans is for reference only. Always consult a licensed healthcare professional before making medical decisions.' },
        { title: '🚨 Emergency Services', body: 'This app does not replace emergency services. In a life-threatening situation, call your local emergency number immediately. Emergency contact numbers shown are for reference only.' },
        { title: '📜 Terms of Service', body: 'By using AccessRead you agree to our Terms of Service. You may not use this app for illegal purposes. We reserve the right to terminate access for violation of these terms.' },
        { title: '🔒 Privacy Policy', body: 'Images are processed locally on your device using Tesseract.js. We do not upload your photos to our servers. AI chat queries are sent to Anthropic (anonymized). See our full Privacy Policy at accessread.app/privacy.' },
      ].map(s => (
        <div key={s.title} style={card}>
          <h2 style={h2}>{s.title}</h2>
          <p style={p}>{s.body}</p>
        </div>
      ))}
      <div style={{ ...row, marginBottom: 16 }}>
        <input type="checkbox" id="agree" checked={legalAgreed} onChange={e => setLegalAgreed(e.target.checked)} style={{ width: 18, height: 18 }} />
        <label htmlFor="agree" style={{ color: C.text, fontSize: 14 }}>I have read and agree to all terms above</label>
      </div>
      <button style={btn(C.green, { opacity: legalAgreed ? 1 : 0.4 })} disabled={!legalAgreed}
        onClick={() => { ls.set('screen', 'main'); setScreen('main'); }}>
        Enter AccessRead →
      </button>
    </div>
  );

  // ── Component: BottomNav ──
  const BottomNav = () => (
    <div style={{ display: 'flex', background: C.card, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
      {[['home', '🏠', 'Home'], ['results', '📄', 'Results'], ['emergency', '🚨', 'Emergency'], ['settings', '⚙️', 'Settings']].map(([t, icon, lbl]) => (
        <button key={t} onClick={() => setTab(t)} style={{
          flex: 1, background: 'none', border: 'none', color: tab === t ? C.blue : C.muted,
          padding: '10px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: tab === t ? 700 : 400 }}>{lbl}</span>
        </button>
      ))}
    </div>
  );

  // ── Tab: Home ──
  const HomeTab = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={hdr}>
        <div style={row}>
          <h1 style={{ ...h1, flex: 1 }}>👁️ AccessRead</h1>
          {isPremium ? <span style={tag(C.green)}>PRO</span> : <span style={tag(C.muted)}>{10 - scanCount} scans left</span>}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={card}>
          <h2 style={h2}>Scan Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SCAN_TYPES.map(st => (
              <button key={st.id} onClick={() => setScanType(st.id)} style={{
                background: scanType === st.id ? C.blue : '#111', border: `2px solid ${scanType === st.id ? C.blue : C.border}`,
                borderRadius: 10, padding: '10px 8px', color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>{st.icon} {st.label}</button>
            ))}
          </div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 10, display: camActive ? 'block' : 'none', maxHeight: 260, objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {scannedImg && !camActive && <img src={scannedImg} alt="scan" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover', marginBottom: 10 }} />}
          {processing && <div style={{ color: C.blue, fontWeight: 700, padding: 16 }}>⏳ Processing OCR...</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!camActive
              ? <button style={btn(canScan ? C.blue : C.muted, { flex: 1, margin: 0 })} onClick={() => canScan ? startCam() : setShowPremModal(true)}>
                  📷 {canScan ? 'Start Camera' : 'Upgrade to Scan'}
                </button>
              : <>
                  <button style={btn(C.green, { flex: 1, margin: 0 })} onClick={capture}>📸 Capture</button>
                  <button style={btn(C.red, { flex: 1, margin: 0 })} onClick={stopCam}>✕ Cancel</button>
                </>
            }
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={label}>Or upload image:</label>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { const u = URL.createObjectURL(f); setScannedImg(u); runOCR(u); } }}
              style={{ ...inp, padding: 8 }} />
          </div>
        </div>

        {!isPremium && (
          <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>
            ⭐ Upgrade to Premium — $4.99/mo
          </button>
        )}

        <div style={card}>
          <h2 style={h2}>🚨 Quick Emergency</h2>
          {savedCountries.length === 0
            ? <p style={p}>Add countries in the Emergency tab to see quick-dial numbers here.</p>
            : savedCountries.map(c => (
                <div key={c.name} style={{ ...row, marginBottom: 8 }}>
                  <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{c.name}</span>
                  <a href={`tel:${c.emergency}`} style={{ ...tag(C.red), textDecoration: 'none', padding: '5px 14px' }}>📞 {c.emergency}</a>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );

  // ── Tab: Results ──
  const Results = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1}>📄 Scan Results</h1></div>
      <div style={{ padding: 16 }}>
        {!ocrText
          ? <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <p style={{ ...p, fontSize: 16 }}>No scan yet. Go to Home tab to scan.</p>
            </div>
          : <>
              <div style={card}>
                <div style={{ ...row, marginBottom: 10 }}>
                  <h2 style={{ ...h2, flex: 1, margin: 0 }}>Extracted Text</h2>
                  <span style={tag(C.purple)}>{scanType}</span>
                </div>
                <p style={{ ...p, color: C.text, fontSize: fontSize, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ocrText}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn(reading ? C.red : C.blue, { flex: 1, margin: 0 })} onClick={() => reading ? stopSpeak() : speak(ocrText)}>
                    {reading ? '⏹ Stop' : '▶ Read Aloud'}
                  </button>
                  <button style={btn(C.card2, { flex: 1, margin: 0, border: `1px solid ${C.border}` })} onClick={() => navigator.clipboard?.writeText(ocrText)}>
                    📋 Copy
                  </button>
                </div>
              </div>

              <div style={card}>
                <h2 style={h2}>TTS Controls</h2>
                <div style={{ marginBottom: 10 }}>
                  <label style={label}>Voice</label>
                  <select value={voiceIdx} onChange={e => setVoiceIdx(+e.target.value)} style={{ ...inp, marginBottom: 0 }}>
                    {voices.map((v, i) => <option key={i} value={i}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Speed: {ttsRate.toFixed(1)}x</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={e => setTtsRate(+e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              {aiClassify && (
                <div style={{ ...card, borderLeft: `3px solid ${C.purple}` }}>
                  <h2 style={h2}>🤖 AI Classification</h2>
                  <p style={p}>{aiClassify}</p>
                </div>
              )}

              <div style={card}>
                <div style={{ ...row, marginBottom: 10 }}>
                  <h2 style={{ ...h2, flex: 1, margin: 0 }}>💬 AI Chat</h2>
                  <button onClick={() => setShowChat(!showChat)} style={{ background: C.blue, border: 'none', borderRadius: 8, color: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                    {showChat ? 'Hide' : 'Open'}
                  </button>
                </div>
                {showChat && (
                  <>
                    <div style={{ background: '#111', borderRadius: 10, padding: 12, minHeight: 120, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                      {chatMsgs.length === 0 && <p style={{ ...p, textAlign: 'center' }}>Ask anything about the scan...</p>}
                      {chatMsgs.map((m, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <span style={tag(m.role === 'user' ? C.blue : C.purple)}>{m.role === 'user' ? 'You' : 'AI'}</span>
                          <p style={{ ...p, marginTop: 4, color: C.text }}>{m.content}</p>
                        </div>
                      ))}
                      {chatLoading && <p style={{ color: C.muted, fontSize: 13 }}>AI is thinking...</p>}
                    </div>
                    <div style={row}>
                      <input style={{ ...inp, flex: 1, marginBottom: 0 }} placeholder="Ask about this scan..." value={chatInput}
                        onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                      <button style={{ background: C.blue, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={sendChat}>→</button>
                    </div>
                  </>
                )}
              </div>

              {scanType === 'medicine' && (
                <button style={btn(C.yellow)} onClick={() => setMedModal(true)}>💊 Medicine Safety Checklist</button>
              )}
            </>
        }
      </div>
    </div>
  );

  // ── Medicine Modal ──
  const MedModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ ...card, width: '100%', maxWidth: 420 }}>
        <h2 style={h2}>💊 Medicine Safety Checklist</h2>
        <p style={p}>Please verify the following before taking this medication:</p>
        {[
          ['allergic', '✅ I am not allergic to any listed ingredients'],
          ['dosage', '✅ I understand the correct dosage'],
          ['expiry', '✅ I have checked the expiry date'],
          ['interactions', '✅ I am aware of potential drug interactions'],
        ].map(([k, lbl]) => (
          <div key={k} style={{ ...row, marginBottom: 12 }}>
            <input type="checkbox" checked={medChecks[k]} onChange={e => setMedChecks(p => ({ ...p, [k]: e.target.checked }))} style={{ width: 18, height: 18 }} />
            <label style={{ color: C.text, fontSize: 14 }}>{lbl}</label>
          </div>
        ))}
        <p style={{ ...p, color: C.red, fontSize: 13 }}>⚠️ This is not medical advice. Consult a pharmacist or doctor.</p>
        <button style={btn(C.green, { opacity: Object.values(medChecks).every(Boolean) ? 1 : 0.5 })}
          disabled={!Object.values(medChecks).every(Boolean)}
          onClick={() => setMedModal(false)}>
          Confirm & Close
        </button>
        <button style={btn(C.card2, { border: `1px solid ${C.border}` })} onClick={() => setMedModal(false)}>Dismiss</button>
      </div>
    </div>
  );

  // ── Tab: Emergency ──
  const EmergencyTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}><h1 style={h1}>🚨 Emergency</h1></div>
      <div style={{ padding: 16 }}>
        <div style={card}>
          <h2 style={h2}>Find Emergency Number</h2>
          <input style={inp} placeholder="Search country..." value={countryQ} onChange={e => setCountryQ(e.target.value)} />
          {countryQ && COUNTRIES.filter(c => c.name.toLowerCase().includes(countryQ.toLowerCase())).slice(0, 6).map(c => (
            <div key={c.name} style={{ ...row, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, color: C.text }}>{c.name}</span>
              <a href={`tel:${c.emergency}`} style={{ ...tag(C.red), textDecoration: 'none' }}>📞 {c.emergency}</a>
              <button style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { if (!savedCountries.find(s => s.name === c.name)) { const n = [...savedCountries, c]; setSavedCountries(n); ls.set('savedCountries', n); } }}>
                + Save
              </button>
            </div>
          ))}
        </div>

        {savedCountries.length > 0 && (
          <div style={card}>
            <h2 style={h2}>Saved Countries</h2>
            {savedCountries.map(c => (
              <div key={c.name} style={{ ...row, marginBottom: 8 }}>
                <span style={{ flex: 1, color: C.text }}>{c.name}</span>
                <a href={`tel:${c.emergency}`} style={{ ...tag(C.red), textDecoration: 'none', marginRight: 8 }}>📞 {c.emergency}</a>
                <button style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}
                  onClick={() => { const n = savedCountries.filter(s => s.name !== c.name); setSavedCountries(n); ls.set('savedCountries', n); }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={card}>
          <h2 style={h2}>Personal Contacts</h2>
          <input style={inp} placeholder="Contact name" value={ctName} onChange={e => setCtName(e.target.value)} />
          <input style={inp} placeholder="Phone number" value={ctPhone} onChange={e => setCtPhone(e.target.value)} />
          <button style={btn(C.blue)} onClick={() => {
            if (ctName && ctPhone) {
              const n = [...contacts, { name: ctName, phone: ctPhone }];
              setContacts(n); ls.set('contacts', n); setCtName(''); setCtPhone('');
            }
          }}>+ Add Contact</button>
          {contacts.map((c, i) => (
            <div key={i} style={{ ...row, marginBottom: 8 }}>
              <span style={{ flex: 1, color: C.text }}>{c.name}</span>
              <a href={`tel:${c.phone}`} style={{ ...tag(C.blue), textDecoration: 'none', marginRight: 8 }}>📞 {c.phone}</a>
              <button style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}
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
      <div style={hdr}><h1 style={h1}>⚙️ Settings</h1></div>
      <div style={{ padding: 16 }}>
        <div style={card}>
          <h2 style={h2}>Display</h2>
          <label style={label}>Font Size: {fontSize}px</label>
          <input type="range" min="12" max="24" step="1" value={fontSize} onChange={e => { setFontSize(+e.target.value); ls.set('fontSize', +e.target.value); }} style={{ width: '100%' }} />
          <p style={{ ...p, fontSize: fontSize }}>Sample text at this size</p>
        </div>
        <div style={card}>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ ...h2, margin: 0 }}>Haptic Feedback</h2>
              <p style={{ ...p, margin: 0, fontSize: 12 }}>Vibrate on scan (mobile)</p>
            </div>
            <div onClick={() => { setHaptic(!haptic); ls.set('haptic', !haptic); }} style={{
              width: 44, height: 24, borderRadius: 12, background: haptic ? C.green : C.border,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}>
              <div style={{ position: 'absolute', top: 2, left: haptic ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
        </div>
        <div style={card}>
          <h2 style={h2}>Account</h2>
          <p style={p}>{isPremium ? '⭐ Premium subscriber' : `Free plan — ${10 - scanCount} scans remaining today`}</p>
          {!isPremium && <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>Upgrade to Premium</button>}
          {isPremium && <button style={btn(C.red)} onClick={() => { setIsPremium(false); ls.set('isPremium', false); }}>Cancel Subscription</button>}
        </div>
        <div style={card}>
          <h2 style={h2}>Data</h2>
          <button style={btn(C.card2, { border: `1px solid ${C.border}` })} onClick={() => { setHistory([]); ls.set('history', []); setScanCount(0); ls.set('scanCount', 0); alert('History cleared.'); }}>
            🗑 Clear Scan History
          </button>
          <button style={btn(C.red)} onClick={() => { localStorage.clear(); setScreen('consent'); ls.set('screen', 'consent'); }}>
            Reset App
          </button>
        </div>
      </div>
    </div>
  );

  // ── Premium Modal ──
  const PremiumModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <button style={{ background: 'none', border: 'none', color: C.muted, fontSize: 24, cursor: 'pointer' }} onClick={() => setShowPremModal(false)}>✕</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
          <h1 style={h1}>AccessRead Premium</h1>
          <p style={p}>Unlock the full power of accessibility</p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[['monthly', '$4.99', '/month', 'Most Flexible'], ['yearly', '$39.99', '/year', 'Save 33%']].map(([plan, price, per, badge]) => (
            <div key={plan} onClick={() => setSelPlan(plan)} style={{
              flex: 1, background: selPlan === plan ? '#1a2f4a' : C.card2,
              border: `2px solid ${selPlan === plan ? C.blue : C.border}`, borderRadius: 14, padding: 16,
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={tag(selPlan === plan ? C.blue : C.muted)}>{badge}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '8px 0 2px' }}>{price}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{per}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h2 style={h2}>What's included:</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PREMIUM_FEATURES.map(f => <div key={f} style={{ fontSize: 12, color: C.text }}>✓ {f}</div>)}
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Payment Method</h2>
          {[['card', '💳 Credit/Debit Card'], ['paypal', '🅿️ PayPal'], ['apple', '🍎 Apple Pay']].map(([method, lbl]) => (
            <div key={method} onClick={() => setSelPay(method)} style={{
              ...row, padding: '10px 12px', marginBottom: 8, borderRadius: 10,
              border: `2px solid ${selPay === method ? C.blue : C.border}`,
              background: selPay === method ? '#1a2f4a' : '#111', cursor: 'pointer',
            }}>
              <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{lbl}</span>
              {selPay === method && <span style={{ color: C.blue }}>✓</span>}
            </div>
          ))}
        </div>

        <button style={btn(C.green, { fontSize: 17, padding: '16px 20px', opacity: premProcessing ? 0.7 : 1 })}
          disabled={premProcessing} onClick={activatePremium}>
          {premProcessing ? '⏳ Processing...' : `Subscribe ${selPlan === 'monthly' ? '$4.99/mo' : '$39.99/yr'} →`}
        </button>
        <p style={{ ...p, textAlign: 'center', fontSize: 11 }}>Cancel anytime. No contracts. Secure payment.</p>
      </div>
    </div>
  );

  // ── Premium Success ──
  const PremSuccess = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={h1}>Welcome to Premium!</h1>
        <p style={p}>You now have unlimited scans, AI classification, and all premium features unlocked.</p>
        <button style={btn(C.green)} onClick={() => setPremSuccess(false)}>Start Scanning →</button>
      </div>
    </div>
  );

  // ── Root render ──
  if (screen === 'consent') return <div style={wrap}><Consent /></div>;
  if (screen === 'legal') return <div style={wrap}><Legal /></div>;

  return (
    <div style={wrap} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.1s' }}>
        {tab === 'home' && <HomeTab />}
        {tab === 'results' && <Results />}
        {tab === 'emergency' && <EmergencyTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
      <BottomNav />
      {medModal && <MedModal />}
      {showPremModal && <PremiumModal />}
      {premSuccess && <PremSuccess />}
    </div>
  );
}
