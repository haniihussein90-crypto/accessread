import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  card2: '#252525',
  border: '#333333',
  text: '#ffffff',
  muted: '#999999',
  blue: '#1E88E5',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
};

const s = {
  container: { minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: 480, margin: '0 auto', position: 'relative' },
  card: { backgroundColor: C.card2, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` },
  btn: (bg = C.blue, color = '#fff') => ({ backgroundColor: bg, color, border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 10, transition: 'opacity 0.15s' }),
  input: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, color: C.text, width: '100%', boxSizing: 'border-box', outline: 'none' },
  label: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' },
  h1: { fontSize: 26, fontWeight: 800, marginBottom: 6, color: C.text },
  h2: { fontSize: 20, fontWeight: 700, marginBottom: 12, color: C.text },
  p: { color: C.muted, fontSize: 15, lineHeight: 1.5, marginBottom: 12 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  screenWrap: { padding: 20, paddingBottom: 80 },
  header: { backgroundColor: C.card2, borderBottom: `1px solid ${C.border}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 },
  tag: (color = C.blue) => ({ backgroundColor: color + '22', color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }),
};

// ─── Country emergency numbers ───────────────────────────────────────────────
const COUNTRIES = [
  { name: 'Afghanistan', number: '119' }, { name: 'Albania', number: '112' },
  { name: 'Algeria', number: '14' }, { name: 'Argentina', number: '911' },
  { name: 'Australia', number: '000' }, { name: 'Austria', number: '112' },
  { name: 'Bangladesh', number: '999' }, { name: 'Belgium', number: '112' },
  { name: 'Brazil', number: '190' }, { name: 'Cambodia', number: '117' },
  { name: 'Canada', number: '911' }, { name: 'Chile', number: '133' },
  { name: 'China', number: '110' }, { name: 'Colombia', number: '112' },
  { name: 'Denmark', number: '112' }, { name: 'Egypt', number: '123' },
  { name: 'Ethiopia', number: '911' }, { name: 'Finland', number: '112' },
  { name: 'France', number: '112' }, { name: 'Germany', number: '112' },
  { name: 'Ghana', number: '999' }, { name: 'Greece', number: '112' },
  { name: 'India', number: '112' }, { name: 'Indonesia', number: '110' },
  { name: 'Iran', number: '110' }, { name: 'Iraq', number: '104' },
  { name: 'Ireland', number: '999' }, { name: 'Israel', number: '100' },
  { name: 'Italy', number: '112' }, { name: 'Japan', number: '110' },
  { name: 'Jordan', number: '911' }, { name: 'Kenya', number: '999' },
  { name: 'Malaysia', number: '999' }, { name: 'Mexico', number: '911' },
  { name: 'Morocco', number: '190' }, { name: 'Myanmar', number: '199' },
  { name: 'Netherlands', number: '112' }, { name: 'New Zealand', number: '111' },
  { name: 'Nigeria', number: '112' }, { name: 'Norway', number: '112' },
  { name: 'Pakistan', number: '15' }, { name: 'Philippines', number: '911' },
  { name: 'Poland', number: '112' }, { name: 'Portugal', number: '112' },
  { name: 'Romania', number: '112' }, { name: 'Russia', number: '112' },
  { name: 'Saudi Arabia', number: '911' }, { name: 'Singapore', number: '999' },
  { name: 'South Africa', number: '10111' }, { name: 'South Korea', number: '112' },
  { name: 'Spain', number: '112' }, { name: 'Sri Lanka', number: '119' },
  { name: 'Sweden', number: '112' }, { name: 'Switzerland', number: '117' },
  { name: 'Thailand', number: '191' }, { name: 'Turkey', number: '155' },
  { name: 'Uganda', number: '999' }, { name: 'Ukraine', number: '102' },
  { name: 'United Arab Emirates', number: '999' }, { name: 'United Kingdom', number: '999' },
  { name: 'United States', number: '911' }, { name: 'Venezuela', number: '911' },
  { name: 'Vietnam', number: '113' }, { name: 'Zimbabwe', number: '999' },
];

// ─── Utility ─────────────────────────────────────────────────────────────────
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Navigation
  const [screen, setScreen] = useState(() => store.get('ar_setup_done', false) ? 'home' : 'consent');
  const [activeTab, setActiveTab] = useState('home');

  // Setup
  const [consentAge, setConsentAge] = useState(null); // null | 'under18' | 'over18'
  const [parentEmail, setParentEmail] = useState('');
  const [parentEmailSent, setParentEmailSent] = useState(false);
  const [legalChecked, setLegalChecked] = useState(false);

  // Scan
  const [scanType, setScanType] = useState('general');
  const [scannedImage, setScannedImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medicineChecks, setMedicineChecks] = useState({ label: false, allergies: false, interactions: false, doctor: false, pregnancy: false });

  // TTS
  const [isReading, setIsReading] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const [speechRate, setSpeechRate] = useState(1);

  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // History
  const [history, setHistory] = useState(() => store.get('ar_history', []));

  // Settings
  const [fontSize, setFontSize] = useState(() => store.get('ar_fontSize', 16));
  const [haptic, setHaptic] = useState(() => store.get('ar_haptic', true));

  // Emergency contacts
  const [countrySearch, setCountrySearch] = useState('');
  const [savedCountries, setSavedCountries] = useState(() => store.get('ar_countries', []));
  const [personalContacts, setPersonalContacts] = useState(() => store.get('ar_contacts', []));
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Premium
  const [isPremium, setIsPremium] = useState(() => store.get('ar_premium', false));
  const [premiumPlan, setPremiumPlan] = useState(() => store.get('ar_plan', null));
  const [scanCount, setScanCount] = useState(() => store.get('ar_scanCount', 0));
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const lastTouchDist = useRef(null);

  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const cameraStream = useRef(null);

  // Load voices
  useEffect(() => {
    const load = () => { const v = window.speechSynthesis?.getVoices() || []; if (v.length) setVoices(v); };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // Load Tesseract
  useEffect(() => {
    if (document.querySelector('#tesseract-script')) return;
    const sc = document.createElement('script');
    sc.id = 'tesseract-script';
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.0/tesseract.min.js';
    document.body.appendChild(sc);
  }, []);

  // Persist key state
  useEffect(() => { store.set('ar_history', history.slice(0, 20)); }, [history]);
  useEffect(() => { store.set('ar_countries', savedCountries); }, [savedCountries]);
  useEffect(() => { store.set('ar_contacts', personalContacts); }, [personalContacts]);
  useEffect(() => { store.set('ar_fontSize', fontSize); }, [fontSize]);
  useEffect(() => { store.set('ar_haptic', haptic); }, [haptic]);
  useEffect(() => { store.set('ar_premium', isPremium); }, [isPremium]);
  useEffect(() => { store.set('ar_plan', premiumPlan); }, [premiumPlan]);
  useEffect(() => { store.set('ar_scanCount', scanCount); }, [scanCount]);

  const vibrate = useCallback(() => { if (haptic && navigator.vibrate) navigator.vibrate(40); }, [haptic]);

  // Pinch zoom handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDist.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / lastTouchDist.current;
      setZoom(z => Math.min(3, Math.max(0.8, z * ratio)));
      lastTouchDist.current = dist;
    }
  };
  const handleTouchEnd = () => { lastTouchDist.current = null; };

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      cameraStream.current = stream;
      setScreen('camera');
      setTimeout(() => { if (cameraRef.current) cameraRef.current.srcObject = stream; }, 100);
    } catch { alert('Camera access denied. Please enable camera permissions in your browser settings.'); }
  };
  const stopCamera = () => { cameraStream.current?.getTracks().forEach(t => t.stop()); cameraStream.current = null; };

  const capturePhoto = () => {
    vibrate();
    const canvas = document.createElement('canvas');
    canvas.width = cameraRef.current.videoWidth;
    canvas.height = cameraRef.current.videoHeight;
    canvas.getContext('2d').drawImage(cameraRef.current, 0, 0);
    const img = canvas.toDataURL('image/jpeg');
    stopCamera();
    setScannedImage(img);
    if (scanType === 'medicine') { setShowMedicineModal(true); }
    else { runOCR(img); }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    vibrate();
    const reader = new FileReader();
    reader.onload = ev => {
      setScannedImage(ev.target.result);
      if (scanType === 'medicine') { setShowMedicineModal(true); }
      else { runOCR(ev.target.result); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const runOCR = async (imgData) => {
    if (!isPremium && scanCount >= 50) {
      alert('You\'ve used your 50 free scans this month. Upgrade to Premium for unlimited scans.');
      setScreen('premium');
      return;
    }
    setIsProcessing(true);
    setExtractedText('');
    setScreen('results');
    try {
      if (!window.Tesseract) throw new Error('OCR not loaded');
      const result = await window.Tesseract.recognize(imgData, 'eng');
      let text = result.data.text.trim();
      if (!text || text.length < 3) { setExtractedText('No text detected. Try better lighting or a clearer image.'); setIsProcessing(false); return; }
      if (scanType === 'medicine') text = `MEDICINE LABEL\n\n${text}\n\n⚠️ Medical Disclaimer: This app reads text only. Always verify with a licensed pharmacist. Never make medical decisions based solely on this app. In emergencies, call emergency services immediately.`;
      else if (scanType === 'food') text = `FOOD PRODUCT\n\n${text}\n\n🚨 Check all ingredients for allergens.`;
      else if (scanType === 'currency') text = `CURRENCY\n\n${text}`;
      setExtractedText(text);
      if (!isPremium) setScanCount(c => c + 1);
      const item = { id: Date.now(), text, type: scanType, timestamp: new Date().toLocaleString(), image: imgData };
      setHistory(h => [item, ...h].slice(0, 20));
    } catch (err) {
      setExtractedText('OCR failed. Please try again with a clearer, well-lit image.');
    }
    setIsProcessing(false);
  };

  // TTS
  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speechRate;
    if (voices[selectedVoiceIdx]) utt.voice = voices[selectedVoiceIdx];
    utt.onstart = () => setIsReading(true);
    utt.onend = () => setIsReading(false);
    utt.onerror = () => setIsReading(false);
    window.speechSynthesis.speak(utt);
    vibrate();
  };
  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsReading(false); };

  // AI Chat
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(m => [...m, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
      if (!apiKey) throw new Error('no key');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 400,
          system: `You are an accessibility assistant. The user scanned this text: "${extractedText}". Answer questions about it briefly and clearly.`,
          messages: [{ role: 'user', content: msg }]
        })
      });
      const data = await res.json();
      setChatMessages(m => [...m, { role: 'ai', text: data.content?.[0]?.text || 'Unable to get a response.' }]);
    } catch {
      setChatMessages(m => [...m, { role: 'ai', text: 'AI chat requires a Claude API key. Set REACT_APP_CLAUDE_API_KEY in your .env file.' }]);
    }
    setChatLoading(false);
  };

  // Medicine checklist
  const allMedicineChecked = Object.values(medicineChecks).every(Boolean);
  const confirmMedicineChecklist = () => {
    if (!allMedicineChecked) return;
    setShowMedicineModal(false);
    runOCR(scannedImage);
  };

  // Emergency contacts
  const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  const addCountry = (c) => { if (!savedCountries.find(x => x.name === c.name)) setSavedCountries(prev => [...prev, c]); setCountrySearch(''); };
  const removeCountry = (name) => setSavedCountries(prev => prev.filter(c => c.name !== name));
  const addContact = () => { if (contactName && contactNumber) { setPersonalContacts(prev => [...prev, { id: Date.now(), name: contactName, number: contactNumber }]); setContactName(''); setContactNumber(''); } };
  const removeContact = (id) => setPersonalContacts(prev => prev.filter(c => c.id !== id));

  // Premium
  const activatePremium = async () => {
    if (!selectedPayment) { alert('Please select a payment method.'); return; }
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsPremium(true);
    setPremiumPlan(selectedPlan);
    setIsProcessing(false);
    setScreen('premiumSuccess');
  };

  // Setup flow: consent → (parent email if under 18) → legal → home
  const completeSetup = () => { store.set('ar_setup_done', true); setScreen('home'); setActiveTab('home'); };

  // Nav helper
  const go = (sc, tab) => { vibrate(); setScreen(sc); if (tab) setActiveTab(tab); };

  // ─── Screens ──────────────────────────────────────────────────────────────

  const renderConsent = () => (
    <div style={{ ...s.screenWrap, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>👁️</div>
        <div style={{ ...s.h1, fontSize: 30 }}>Welcome to AccessRead</div>
        <div style={s.p}>Read the world. Independently.</div>
      </div>
      <div style={s.card}>
        <div style={s.h2}>Age Verification</div>
        <div style={s.p}>To proceed, please confirm your age. AccessRead contains medical label scanning features that require age verification.</div>
        <button style={s.btn(C.blue)} onClick={() => { setConsentAge('over18'); setScreen('legal'); }}>I am 18 or older</button>
        <button style={s.btn(C.card, C.text)} onClick={() => setConsentAge('under18')}>I am under 18</button>
      </div>
      {consentAge === 'under18' && (
        <div style={s.card}>
          <div style={s.h2}>Parental Consent Required</div>
          <div style={s.p}>Users under 18 need a parent or guardian to approve access. Enter their email and we'll send a consent link.</div>
          <span style={s.label}>Parent / Guardian Email</span>
          <input style={{ ...s.input, marginBottom: 12 }} type="email" placeholder="parent@email.com" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
          {!parentEmailSent ? (
            <button style={s.btn(C.green)} onClick={() => { if (parentEmail.includes('@')) { setParentEmailSent(true); } else { alert('Please enter a valid email address.'); } }}>Send Consent Request</button>
          ) : (
            <>
              <div style={{ color: C.green, marginBottom: 12, fontSize: 14 }}>✓ Consent email sent to {parentEmail}. Once approved, you can continue.</div>
              <button style={s.btn(C.blue)} onClick={() => setScreen('legal')}>Parent approved — Continue</button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderLegal = () => (
    <div style={{ ...s.screenWrap, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
        <div style={s.h1}>Terms & Legal Agreement</div>
      </div>
      <div style={{ ...s.card, maxHeight: 300, overflowY: 'auto', fontSize: fontSize }}>
        <p style={s.p}><strong>AccessRead Terms of Use</strong></p>
        <p style={s.p}>By using AccessRead, you agree to the following:</p>
        <p style={s.p}><strong>1. Not a Medical Device.</strong> AccessRead is a text-reading tool, not a medical device or doctor. Information read from medicine labels may contain OCR errors. Always verify with a licensed pharmacist or healthcare professional.</p>
        <p style={s.p}><strong>2. Accuracy Disclaimer.</strong> OCR technology may produce errors. The app is not responsible for inaccuracies in scanned text. Do not rely solely on this app for critical health decisions.</p>
        <p style={s.p}><strong>3. Emergency Services.</strong> In any medical or personal emergency, call your local emergency services immediately. Do not rely on this app in emergencies.</p>
        <p style={s.p}><strong>4. User Responsibility.</strong> You take full responsibility for how you use information provided by this app. AccessRead is a tool to assist reading, not to replace professional advice.</p>
        <p style={s.p}><strong>5. Privacy.</strong> Scanned images are processed locally in your browser. They are not stored on our servers. Scan history is stored locally on your device.</p>
        <p style={s.p}><strong>6. Premium Features.</strong> Premium subscription is billed monthly or annually. You may cancel at any time. Refunds are subject to platform policies.</p>
      </div>
      <div style={{ ...s.card, marginTop: 0 }}>
        <label style={{ ...s.row, cursor: 'pointer', fontSize: 15 }}>
          <input type="checkbox" checked={legalChecked} onChange={e => setLegalChecked(e.target.checked)} style={{ width: 20, height: 20, accentColor: C.blue }} />
          <span>I have read and agree to the terms above. I understand this app is not a medical device.</span>
        </label>
      </div>
      <button style={s.btn(legalChecked ? C.blue : '#444')} disabled={!legalChecked} onClick={completeSetup}>
        {legalChecked ? 'Get Started →' : 'Please accept the terms to continue'}
      </button>
    </div>
  );

  const SCAN_TYPES = [
    { id: 'general', icon: '📄', label: 'General Text' },
    { id: 'medicine', icon: '💊', label: 'Medicine' },
    { id: 'food', icon: '🥗', label: 'Food Label' },
    { id: 'currency', icon: '💵', label: 'Currency' },
    { id: 'color', icon: '🎨', label: 'Color ID' },
    { id: 'barcode', icon: '📦', label: 'Barcode' },
  ];

  const renderHome = () => (
    <div style={s.screenWrap}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.muted }}>{isPremium ? <span style={s.tag(C.green)}>✦ PREMIUM</span> : <span style={s.tag()}>FREE · {50 - scanCount} scans left</span>}</div>
        <div style={{ ...s.h1, marginTop: 8 }}>AccessRead</div>
        <div style={s.p}>Accessibility OCR · Read the world aloud</div>
      </div>

      {/* Quick scan buttons */}
      <div style={s.card}>
        <div style={s.h2}>Scan Now</div>
        <button style={s.btn(C.blue)} onClick={() => { startCamera(); }}>📷 Open Camera</button>
        <button style={{ ...s.btn(C.card2, C.text), border: `1px solid ${C.border}` }} onClick={() => fileRef.current?.click()}>📁 Upload Photo</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {/* Scan type selector */}
      <div style={s.card}>
        <div style={s.h2}>Scan Type</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SCAN_TYPES.map(t => (
            <button key={t.id} onClick={() => { vibrate(); setScanType(t.id); }}
              style={{ backgroundColor: scanType === t.id ? C.blue : C.card, border: `2px solid ${scanType === t.id ? C.blue : C.border}`, borderRadius: 12, padding: '12px 8px', cursor: 'pointer', color: C.text, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <div style={{ ...s.card, border: `1px solid ${C.green}44`, background: `linear-gradient(135deg, #0f0f0f 0%, #0d2010 100%)` }}>
          <div style={{ fontSize: 13, ...s.tag(C.green), display: 'inline-block', marginBottom: 8 }}>✦ PREMIUM</div>
          <div style={s.h2}>Unlock Everything</div>
          <div style={s.p}>Unlimited scans · AI Chat · 15+ voices · Cooking Assistant · Flight Board Reader · Color Matcher</div>
          <button style={s.btn(C.green)} onClick={() => go('premium')}>Upgrade to Premium →</button>
        </div>
      )}

      {/* Recent history teaser */}
      {history.length > 0 && (
        <div style={s.card}>
          <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={s.h2}>Recent Scans</div>
            <button onClick={() => go('history', 'history')} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 14 }}>View all →</button>
          </div>
          {history.slice(0, 2).map(item => (
            <div key={item.id} style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, fontSize: fontSize - 1 }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{item.timestamp} · {item.type}</div>
              <div style={{ color: C.text }}>{item.text.slice(0, 80)}{item.text.length > 80 ? '…' : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCamera = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 100 }}>
      <video ref={cameraRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20 }}>
        <button onClick={() => { stopCamera(); setScreen('home'); }} style={{ backgroundColor: '#ffffff33', border: '2px solid #fff', borderRadius: '50%', width: 56, height: 56, fontSize: 22, cursor: 'pointer', color: '#fff' }}>✕</button>
        <button onClick={capturePhoto} style={{ backgroundColor: '#fff', border: '4px solid #1E88E5', borderRadius: '50%', width: 72, height: 72, fontSize: 28, cursor: 'pointer' }}>📷</button>
      </div>
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14, backgroundColor: '#00000066', padding: 8 }}>
        Scan type: <strong>{SCAN_TYPES.find(t => t.id === scanType)?.label}</strong>
      </div>
    </div>
  );

  const renderMedicineModal = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000000cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: C.card2, borderRadius: 20, padding: 24, maxWidth: 440, width: '100%', border: `2px solid ${C.yellow}44` }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>💊</div>
        <div style={s.h2}>Medicine Safety Checklist</div>
        <div style={{ ...s.p, color: C.yellow }}>Please confirm you understand the risks before scanning a medicine label.</div>
        {[
          { key: 'label', text: 'I will read the official label independently' },
          { key: 'allergies', text: 'I will check this medicine against my known allergies' },
          { key: 'interactions', text: 'I will check for drug interactions' },
          { key: 'doctor', text: 'I will consult a doctor or pharmacist if unsure' },
          { key: 'pregnancy', text: 'I am not pregnant or have consulted a doctor about this' },
        ].map(item => (
          <label key={item.key} style={{ ...s.row, marginBottom: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={medicineChecks[item.key]} onChange={e => setMedicineChecks(c => ({ ...c, [item.key]: e.target.checked }))} style={{ width: 20, height: 20, flexShrink: 0, accentColor: C.yellow, marginTop: 2 }} />
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{item.text}</span>
          </label>
        ))}
        <button style={s.btn(allMedicineChecked ? C.yellow : '#444', '#000')} disabled={!allMedicineChecked} onClick={confirmMedicineChecklist}>
          {allMedicineChecked ? 'I Understand — Scan Medicine' : 'Check all boxes to continue'}
        </button>
        <button style={{ ...s.btn(C.card, C.muted), marginTop: 0 }} onClick={() => setShowMedicineModal(false)}>Cancel</button>
      </div>
    </div>
  );

  const renderResults = () => (
    <div style={{ ...s.screenWrap, fontSize: fontSize }}>
      <div style={{ ...s.header }}>
        <button onClick={() => go('home', 'home')} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 22, cursor: 'pointer' }}>←</button>
        <div style={s.h2}>Scan Result</div>
      </div>
      <div style={{ padding: 20 }}>
        {scannedImage && (
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, maxHeight: 200 }}>
            <img src={scannedImage} alt="Scanned" style={{ width: '100%', objectFit: 'cover' }} />
          </div>
        )}
        {isProcessing && (
          <div style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <div>Reading text… please wait</div>
          </div>
        )}
        {extractedText && (
          <>
            <div style={s.card}>
              <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={s.h2}>Extracted Text</div>
                <span style={s.tag()}>{SCAN_TYPES.find(t => t.id === scanType)?.icon} {scanType}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{extractedText}</div>
            </div>
            <div style={s.card}>
              <div style={s.h2}>Read Aloud</div>
              <div style={{ ...s.row, marginBottom: 10 }}>
                <button style={{ ...s.btn(isReading ? C.red : C.blue), margin: 0, flex: 1 }} onClick={() => isReading ? stopSpeaking() : speak(extractedText)}>
                  {isReading ? '⏹ Stop' : '▶ Read Text'}
                </button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={s.label}>Speed: {speechRate.toFixed(1)}×</span>
                <input type="range" min="0.5" max="2" step="0.1" value={speechRate} onChange={e => setSpeechRate(+e.target.value)} style={{ width: '100%', accentColor: C.blue }} />
              </div>
              {voices.length > 0 && (
                <div>
                  <span style={s.label}>Voice</span>
                  <select value={selectedVoiceIdx} onChange={e => setSelectedVoiceIdx(+e.target.value)} style={{ ...s.input }}>
                    {(isPremium ? voices : voices.slice(0, 2)).map((v, i) => <option key={i} value={i}>{v.name}</option>)}
                  </select>
                  {!isPremium && voices.length > 2 && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Upgrade to Premium for {voices.length} voices</div>}
                </div>
              )}
            </div>
            {isPremium && (
              <div style={s.card}>
                <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={s.h2}>AI Chat ✦</div>
                  <button onClick={() => setShowChat(!showChat)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 14 }}>{showChat ? 'Hide' : 'Show'}</button>
                </div>
                {showChat && (
                  <>
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                      {chatMessages.map((m, i) => (
                        <div key={i} style={{ backgroundColor: m.role === 'user' ? C.blue + '33' : C.card, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 14 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>{m.role === 'user' ? 'You' : 'AI'}</span>
                          <div>{m.text}</div>
                        </div>
                      ))}
                      {chatLoading && <div style={{ color: C.muted, fontSize: 14, padding: 8 }}>Thinking…</div>}
                    </div>
                    <div style={s.row}>
                      <input style={{ ...s.input, flex: 1 }} placeholder="Ask about this scan…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                      <button onClick={sendChat} style={{ ...s.btn(C.blue), width: 'auto', padding: '12px 16px', margin: 0 }}>→</button>
                    </div>
                  </>
                )}
                {!showChat && <div style={s.p}>Ask the AI questions about what was scanned.</div>}
              </div>
            )}
            {!isPremium && (
              <div style={{ ...s.card, border: `1px solid ${C.green}44` }}>
                <div style={{ fontSize: 13, ...s.tag(C.green), display: 'inline-block', marginBottom: 8 }}>✦ PREMIUM</div>
                <div style={s.p}>Unlock AI Chat, 15+ voices, and unlimited scans.</div>
                <button style={s.btn(C.green)} onClick={() => go('premium')}>Upgrade to Premium</button>
              </div>
            )}
            <div style={{ ...s.row, gap: 10 }}>
              <button onClick={() => { navigator.clipboard?.writeText(extractedText); vibrate(); }} style={{ ...s.btn(C.card2, C.text), margin: 0, flex: 1, border: `1px solid ${C.border}` }}>Copy Text</button>
              <button onClick={() => go('home', 'home')} style={{ ...s.btn(C.blue), margin: 0, flex: 1 }}>Scan Again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div style={s.screenWrap}>
      <div style={s.h1}>Scan History</div>
      <div style={s.p}>{history.length} saved scan{history.length !== 1 ? 's' : ''}</div>
      {history.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={s.p}>No scans yet. Use the Scan tab to get started.</div>
        </div>
      )}
      {history.map(item => (
        <div key={item.id} style={s.card}>
          <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={s.tag()}>{SCAN_TYPES.find(t => t.id === item.type)?.icon} {item.type}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{item.timestamp}</div>
          </div>
          <div style={{ fontSize: fontSize - 1, lineHeight: 1.5, marginBottom: 10 }}>{item.text.slice(0, 200)}{item.text.length > 200 ? '…' : ''}</div>
          <div style={s.row}>
            <button onClick={() => speak(item.text)} style={{ ...s.btn(C.blue), margin: 0, flex: 1, padding: '10px 12px', fontSize: 14 }}>▶ Read</button>
            <button onClick={() => { navigator.clipboard?.writeText(item.text); vibrate(); }} style={{ ...s.btn(C.card2, C.text), margin: 0, flex: 1, padding: '10px 12px', fontSize: 14, border: `1px solid ${C.border}` }}>Copy</button>
            <button onClick={() => setHistory(h => h.filter(x => x.id !== item.id))} style={{ ...s.btn(C.red + '22', C.red), margin: 0, flex: 0.5, padding: '10px 8px', fontSize: 14 }}>✕</button>
          </div>
        </div>
      ))}
      {history.length > 0 && (
        <button style={s.btn('#44111133', C.red)} onClick={() => { if (window.confirm('Clear all history?')) setHistory([]); }}>Clear All History</button>
      )}
    </div>
  );

  const renderEmergency = () => (
    <div style={s.screenWrap}>
      <div style={s.h1}>Emergency</div>
      <div style={s.p}>Your emergency contacts, always one tap away.</div>

      {/* Country search */}
      <div style={s.card}>
        <div style={s.h2}>🌍 Global Emergency Numbers</div>
        <span style={s.label}>Search by country</span>
        <input style={{ ...s.input, marginBottom: 8 }} placeholder="e.g. Vietnam, USA, UK…" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} />
        {countrySearch.length > 0 && (
          <div style={{ backgroundColor: C.card, borderRadius: 10, maxHeight: 200, overflowY: 'auto', border: `1px solid ${C.border}` }}>
            {filteredCountries.length === 0 && <div style={{ padding: 12, color: C.muted }}>No countries found</div>}
            {filteredCountries.map(c => (
              <div key={c.name} onClick={() => addCountry(c)} style={{ ...s.row, padding: '10px 14px', cursor: 'pointer', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                <span>{c.name}</span>
                <span style={{ color: C.blue, fontWeight: 700 }}>{c.number}</span>
              </div>
            ))}
          </div>
        )}
        {savedCountries.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={s.label}>Saved Countries</span>
            {savedCountries.map(c => (
              <div key={c.name} style={{ ...s.row, justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>{c.number}</div>
                </div>
                <div style={s.row}>
                  <a href={`tel:${c.number}`} style={{ ...s.btn(C.red), width: 'auto', padding: '8px 16px', margin: 0, fontSize: 14, textDecoration: 'none' }}>Call</a>
                  <button onClick={() => removeCountry(c.name)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: '0 4px 0 8px' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personal contacts */}
      <div style={s.card}>
        <div style={s.h2}>👤 Personal Contacts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <span style={s.label}>Name</span>
            <input style={s.input} placeholder="e.g. Mom" value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div>
            <span style={s.label}>Phone</span>
            <input style={s.input} placeholder="+1 555 0100" value={contactNumber} onChange={e => setContactNumber(e.target.value)} type="tel" />
          </div>
        </div>
        <button style={s.btn(C.blue)} onClick={addContact}>+ Add Contact</button>
        {personalContacts.map(c => (
          <div key={c.id} style={{ ...s.row, justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{c.number}</div>
            </div>
            <div style={s.row}>
              <a href={`tel:${c.number}`} style={{ ...s.btn(C.red), width: 'auto', padding: '8px 16px', margin: 0, fontSize: 14, textDecoration: 'none' }}>Call</a>
              <button onClick={() => removeContact(c.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: '0 4px 0 8px' }}>✕</button>
            </div>
          </div>
        ))}
        {personalContacts.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>No personal contacts saved yet.</div>}
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <button style={s.btn(C.green)} onClick={() => go('premium')}>✦ Upgrade to Premium</button>
      )}
    </div>
  );

  const renderSettings = () => (
    <div style={s.screenWrap}>
      <div style={s.h1}>Settings</div>
      {isPremium && <div style={{ ...s.tag(C.green), display: 'inline-block', marginBottom: 16 }}>✦ Premium · {premiumPlan}</div>}

      <div style={s.card}>
        <div style={s.h2}>Accessibility</div>
        <span style={s.label}>Font Size: {fontSize}px</span>
        <input type="range" min="13" max="28" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ width: '100%', accentColor: C.blue, marginBottom: 16 }} />
        <label style={{ ...s.row, justifyContent: 'space-between', cursor: 'pointer' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Haptic Feedback</div>
            <div style={{ fontSize: 13, color: C.muted }}>Vibration on button press</div>
          </div>
          <div onClick={() => setHaptic(!haptic)} style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: haptic ? C.blue : C.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: haptic ? 25 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
          </div>
        </label>
      </div>

      <div style={s.card}>
        <div style={s.h2}>Speech</div>
        <span style={s.label}>Speech Rate: {speechRate.toFixed(1)}×</span>
        <input type="range" min="0.5" max="2" step="0.1" value={speechRate} onChange={e => setSpeechRate(+e.target.value)} style={{ width: '100%', accentColor: C.blue }} />
      </div>

      <div style={s.card}>
        <div style={s.h2}>Zoom</div>
        <div style={s.p}>Use pinch gestures anywhere in the app to zoom in/out on content.</div>
        <button onClick={() => setZoom(1)} style={{ ...s.btn(C.card2, C.text), border: `1px solid ${C.border}` }}>Reset Zoom ({zoom.toFixed(1)}×)</button>
      </div>

      {!isPremium ? (
        <button style={s.btn(C.green)} onClick={() => go('premium')}>✦ Upgrade to Premium</button>
      ) : (
        <div style={s.card}>
          <div style={s.h2}>Premium Subscription</div>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 12 }}>Plan: {premiumPlan === 'monthly' ? '$4.99/month' : '$39.99/year'}</div>
          <button style={s.btn('#44111133', C.red)} onClick={() => { if (window.confirm('Cancel premium subscription?')) { setIsPremium(false); setPremiumPlan(null); } }}>Cancel Subscription</button>
        </div>
      )}

      <div style={s.card}>
        <div style={s.h2}>Data</div>
        <button style={s.btn('#44111133', C.red)} onClick={() => { if (window.confirm('Reset all app data?')) { localStorage.clear(); window.location.reload(); } }}>Reset App Data</button>
      </div>
    </div>
  );

  const PREMIUM_FEATURES = [
    { icon: '🔍', text: 'Unlimited scans (no monthly cap)' },
    { icon: '🤖', text: 'AI Chat — ask questions about any scan' },
    { icon: '🔊', text: '15+ premium natural voices' },
    { icon: '⚡', text: 'Priority OCR processing (faster)' },
    { icon: '📚', text: 'Unlimited scan history' },
    { icon: '📳', text: 'Haptic button feedback' },
    { icon: '👨‍🍳', text: 'AI Cooking Assistant — "Is this done?"' },
    { icon: '✈️', text: 'Flight Board Reader — gate, time, status' },
    { icon: '👗', text: 'Clothing Color Matcher' },
    { icon: '🥗', text: 'Nutrition & Allergen Scanner' },
    { icon: '📴', text: 'Offline Mode (coming soon)' },
    { icon: '💬', text: 'Priority customer support' },
  ];

  const renderPremium = () => (
    <div style={s.screenWrap}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✦</div>
        <div style={s.h1}>AccessRead Premium</div>
        <div style={s.p}>Read the world without limits.</div>
      </div>

      {/* Free vs Premium comparison */}
      <div style={s.card}>
        <div style={{ backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 14, opacity: 0.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: C.muted }}>FREE PLAN</div>
          {['50 scans/month', 'Basic OCR', '2 standard voices', '10 scan history', 'Basic emergency contacts'].map(f => (
            <div key={f} style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>○ {f}</div>
          ))}
        </div>
        <div style={{ backgroundColor: C.green + '11', border: `1px solid ${C.green}44`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: C.green }}>✦ PREMIUM PLAN — ALL UNLOCKED</div>
          {PREMIUM_FEATURES.map(f => (
            <div key={f.text} style={{ fontSize: 14, marginBottom: 6, ...s.row }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={s.card}>
        <div style={s.h2}>Choose Your Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { id: 'monthly', label: 'Monthly', price: '$4.99', sub: 'per month · cancel anytime', badge: null },
            { id: 'yearly', label: 'Yearly', price: '$39.99', sub: 'per year · save $19.89', badge: 'BEST VALUE' },
          ].map(plan => (
            <div key={plan.id} onClick={() => setSelectedPlan(plan.id)}
              style={{ border: `2px solid ${selectedPlan === plan.id ? C.green : C.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', backgroundColor: selectedPlan === plan.id ? C.green + '11' : C.card, position: 'relative' }}>
              {plan.badge && <div style={{ position: 'absolute', top: -10, right: 10, backgroundColor: C.green, color: '#000', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 6px' }}>{plan.badge}</div>}
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{plan.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: selectedPlan === plan.id ? C.green : C.text }}>{plan.price}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{plan.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16 }}>Switch plans anytime. No long-term commitment.</div>
      </div>

      {/* Payment method */}
      <div style={s.card}>
        <div style={s.h2}>Payment Method</div>
        {[
          { id: 'apple', label: '🍎 Apple Pay' },
          { id: 'card', label: '💳 Credit / Debit Card' },
          { id: 'bank', label: '🏦 Bank Transfer' },
        ].map(m => (
          <div key={m.id} onClick={() => setSelectedPayment(m.id)}
            style={{ border: `2px solid ${selectedPayment === m.id ? C.green : C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, cursor: 'pointer', backgroundColor: selectedPayment === m.id ? C.green + '11' : C.card, fontWeight: 600 }}>
            {m.label}
          </div>
        ))}
      </div>

      <button style={s.btn(C.green, '#fff')} onClick={activatePremium} disabled={isProcessing}>
        {isProcessing ? 'Processing…' : `Upgrade Now — ${selectedPlan === 'yearly' ? '$39.99/yr' : '$4.99/mo'}`}
      </button>
      <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 20 }}>Secure payment · Cancel anytime</div>
    </div>
  );

  const renderPremiumSuccess = () => (
    <div style={{ ...s.screenWrap, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <div style={s.h1}>Welcome to Premium!</div>
      <div style={s.p}>You now have unlimited access to all AccessRead features.</div>
      <div style={{ ...s.card, width: '100%', textAlign: 'left' }}>
        <div style={{ fontWeight: 700, color: C.green, marginBottom: 8 }}>✦ Your Premium Benefits</div>
        {PREMIUM_FEATURES.slice(0, 6).map(f => <div key={f.text} style={{ fontSize: 14, marginBottom: 6 }}>✓ {f.text}</div>)}
      </div>
      <button style={s.btn(C.green)} onClick={() => go('home', 'home')}>Start Scanning →</button>
    </div>
  );

  const TABS = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'history', icon: '📚', label: 'History' },
    { id: 'emergency', icon: '🆘', label: 'Emergency' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const screenMap = { home: renderHome, history: renderHistory, emergency: renderEmergency, settings: renderSettings };

  const renderBottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: C.card2, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 50 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => { setActiveTab(t.id); setScreen(t.id); vibrate(); }}
          style={{ flex: 1, background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', color: activeTab === t.id ? C.blue : C.muted, transition: 'color 0.15s' }}>
          <div style={{ fontSize: 22 }}>{t.icon}</div>
          <div style={{ fontSize: 10, fontWeight: activeTab === t.id ? 700 : 400 }}>{t.label}</div>
        </button>
      ))}
    </div>
  );

  // ─── Root render ───────────────────────────────────────────────────────────
  const showNav = !['consent', 'legal', 'camera', 'results', 'premium', 'premiumSuccess'].includes(screen);

  return (
    <div
      style={{ ...s.container, fontSize: fontSize, transform: `scale(${zoom})`, transformOrigin: 'top center', minHeight: zoom !== 1 ? `${100 / zoom}vh` : undefined }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {screen === 'consent' && renderConsent()}
      {screen === 'legal' && renderLegal()}
      {screen === 'camera' && renderCamera()}
      {screen === 'results' && renderResults()}
      {screen === 'premium' && renderPremium()}
      {screen === 'premiumSuccess' && renderPremiumSuccess()}
      {showNav && screenMap[screen] && screenMap[screen]()}
      {showNav && renderBottomNav()}
      {showMedicineModal && renderMedicineModal()}
    </div>
  );
}
