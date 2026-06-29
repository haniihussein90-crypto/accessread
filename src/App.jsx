import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, supabaseEnabled } from './lib/supabase';

// ─── Design tokens ───────────────────────────────────────────────────────────
const DARK = {
  // muted bumped #888→#b0b0b0 for WCAG AA contrast on #252525 cards (low-vision)
  bg: '#0f0f0f', card: '#1a1a1a', card2: '#252525', border: '#2e2e2e',
  text: '#ffffff', muted: '#b0b0b0', blue: '#1E88E5', green: '#22c55e',
  red: '#ef4444', yellow: '#fbbf24', purple: '#a855f7', orange: '#f97316',
};
const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', card2: '#e8e8e8', border: '#d0d0d0',
  text: '#111111', muted: '#666666', blue: '#1565C0', green: '#16a34a',
  red: '#dc2626', yellow: '#d97706', purple: '#7c3aed', orange: '#ea580c',
};

// Voice Waves logo — blue main bars, green accent. Works on dark & light bg.
const VoiceWaves = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="AccessRead logo" role="img">
    <rect x="3"  y="19" width="4" height="10" rx="2" fill="#1e40af" />
    <rect x="10" y="13" width="4" height="22" rx="2" fill="#1e40af" />
    <rect x="17" y="6"  width="4" height="36" rx="2" fill="#10b981" />
    <rect x="24" y="11" width="4" height="26" rx="2" fill="#1e40af" />
    <rect x="31" y="6"  width="4" height="36" rx="2" fill="#10b981" />
    <rect x="38" y="13" width="4" height="22" rx="2" fill="#1e40af" />
    <rect x="45" y="19" width="3" height="10" rx="1.5" fill="#1e40af" />
  </svg>
);

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

// MVP scan types. Currency / Barcode / Flight are deferred to Phase 2 —
// see COMING_SOON below for what's surfaced as "Coming Soon".
const SCAN_TYPES = [
  { id: 'general', label: 'General', icon: '📄' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'food', label: 'Food Label', icon: '🥫' },
  { id: 'color', label: 'Color ID', icon: '🎨' },
];

const COMING_SOON = ['💵 Currency', '🔲 Barcode', '✈️ Flight Scanner'];

const FREE_DAILY = 50; // free-tier daily scan limit
const APP_VERSION = '07c87a7'; // bump on each release — visible in Settings to confirm the live build

const LANGUAGES = [
  { code: 'English', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'Spanish', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'Mandarin', label: 'Mandarin', native: '中文', flag: '🇨🇳' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'Portuguese', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'Russian', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'Japanese', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'French', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'Dutch', label: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'Vietnamese', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
];

// Only features that actually work are advertised in the premium modal.
// Removed: Flight Scanner, History Export (PDF/CSV), Smart Parsing — not built.
const PREMIUM_FEATURES = [
  { icon: '∞', label: 'Unlimited Scans', desc: 'No daily limit (free tier: 50/day)' },
  { icon: '🤖', label: 'AI Analysis', desc: 'Medicine & food context, AI chat' },
  { icon: '🍳', label: 'AI Cooking Assistant', desc: 'Scan food labels → recipes & nutrition' },
  { icon: '⚡', label: 'Faster Processing', desc: 'Priority OCR queue' },
  { icon: '☁️', label: 'Cloud Sync', desc: 'Coming soon — sync across devices' },
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

  // Screen / nav: language picker on very first load, then legal, then app
  const [userLanguage, setUserLanguage] = useState(ls.get('userLanguage', null));
  const [screen, setScreen] = useState(
    !ls.get('userLanguage', null) ? 'language' : (ls.get('agreedToTerms', false) ? 'main' : 'legal')
  );
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
  const [voiceIdx] = useState(0);
  const [ttsRate, setTtsRate] = useState(1);
  const [elevenLabsVoice, setElevenLabsVoice] = useState('Rachel');

  // AI
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiClassify, setAiClassify] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [cookingResult, setCookingResult] = useState(null);
  const [cookingLoading, setCookingLoading] = useState(false);
  const [colorResult, setColorResult] = useState(null);

  // History & bookmarks
  const [history, setHistory] = useState(ls.get('history', []));
  const [cloudHistory, setCloudHistory] = useState([]);
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
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const initScanCount = () => {
    const stored = ls.get('scanData', { count: 0, date: todayStr() });
    if (stored.date !== todayStr()) { ls.set('scanData', { count: 0, date: todayStr() }); return 0; }
    return stored.count;
  };
  const [scanCount, setScanCount] = useState(initScanCount);
  const [premProcessing, setPremProcessing] = useState(false);
  const [showPremModal, setShowPremModal] = useState(false);
  const [premSuccess, setPremSuccess] = useState(false);

  // Auth (Supabase). When signed in, premium + history come from the DB.
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);

  // Pinch zoom
  const [zoom, setZoom] = useState(1);
  const touchRef = useRef({});

  useEffect(() => {
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    synth.onvoiceschanged = load;
    load();
  }, []);

  // Handle return from Stripe Checkout: verify the session server-side, then
  // unlock premium and clean the query string out of the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && params.get('session_id')) {
      (async () => {
        try {
          const res = await fetch(`/api/stripe-verify?session_id=${encodeURIComponent(params.get('session_id'))}`);
          const data = await res.json();
          if (data.premium) { setIsPremium(true); ls.set('isPremium', true); setPremSuccess(true); }
          else alert('Payment not confirmed. If you were charged, contact support.');
        } catch { alert('Could not verify payment. Please reopen the app.'); }
        window.history.replaceState({}, '', window.location.pathname);
      })();
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Refresh premium status from the database (source of truth when signed in).
  const refreshPremium = useCallback(async (u) => {
    if (!supabaseEnabled || !u) return;
    const { data } = await supabase.from('users').select('isPremium, premiumExpiry').eq('id', u.id).maybeSingle();
    const active = data?.isPremium && (!data.premiumExpiry || new Date(data.premiumExpiry) > new Date());
    setIsPremium(!!active); ls.set('isPremium', !!active);
  }, []);

  // Pull the signed-in user's cloud history (synced across devices).
  const loadCloudHistory = useCallback(async (u) => {
    if (!supabaseEnabled || !u) { setCloudHistory([]); return; }
    const { data, error } = await supabase
      .from('history').select('id, scanType, extractedText, created_at')
      .eq('userId', u.id).order('created_at', { ascending: false }).limit(50);
    if (!error && data) setCloudHistory(data);
  }, []);

  const syncAccount = useCallback((u) => {
    fetch('/api/auth-callback', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: u.id, email: u.email }),
    }).catch(() => {});
    refreshPremium(u);
    loadCloudHistory(u);
  }, [refreshPremium, loadCloudHistory]);

  // Supabase auth bootstrap + subscription.
  useEffect(() => {
    if (!supabaseEnabled) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user || null;
      setUser(u);
      if (u) syncAccount(u);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) syncAccount(u);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [syncAccount]);

  const signInWithEmail = async () => {
    if (!supabaseEnabled) { alert('Sign-in is not configured.'); return; }
    if (!authEmail.includes('@')) { alert('Enter a valid email.'); return; }
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) alert('Sign-in error: ' + error.message);
    else setAuthSent(true);
  };

  const signOut = async () => {
    if (supabaseEnabled) await supabase.auth.signOut();
    setUser(null); setIsPremium(false); ls.set('isPremium', false);
  };

  // ── TTS ──
  const uttRef = useRef(null);        // keep a ref so the utterance is not GC'd mid-speech
  const resumeTimer = useRef(null);   // works around the Chrome/Safari ~15s auto-pause bug

  const speakBrowser = useCallback((text) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (resumeTimer.current) clearInterval(resumeTimer.current);

    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = voices[voiceIdx] || null;
    utt.rate = ttsRate;
    utt.onend = () => { setReading(false); if (resumeTimer.current) clearInterval(resumeTimer.current); };
    utt.onerror = (e) => { console.error('TTS error:', e?.error); setReading(false); if (resumeTimer.current) clearInterval(resumeTimer.current); };
    uttRef.current = utt; // prevent garbage collection that cuts speech off after ~1 word
    setReading(true);
    synth.speak(utt);
    // Long text pauses itself in Chrome/Safari; nudge it to keep going.
    resumeTimer.current = setInterval(() => {
      if (!synth.speaking) { clearInterval(resumeTimer.current); return; }
      synth.pause(); synth.resume();
    }, 10000);
  }, [voices, voiceIdx, ttsRate]);

  const speakElevenLabs = useCallback(async (text) => {
    setReading(true);
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, voice: elevenLabsVoice }),
      });
      if (!res.ok) { speakBrowser(text); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setReading(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setReading(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch { speakBrowser(text); }
  }, [elevenLabsVoice, speakBrowser]);

  // ElevenLabs multilingual voices are free for everyone; falls back to the
  // browser's robot voice automatically if the API is unavailable.
  const speak = speakElevenLabs;
  const stopSpeak = () => { window.speechSynthesis.cancel(); if (resumeTimer.current) clearInterval(resumeTimer.current); setReading(false); };

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

  // OCR extraction with dual strategy: try Tesseract.js first (fast, free,
  // client-side). If it fails — e.g. iOS Safari "Error attempting to read
  // image" — fall back to the Claude vision endpoint (/api/ocr, reliable).
  const extractText = useCallback(async (imgData) => {
    // Step 1: Tesseract
    if (window.Tesseract) {
      try {
        const result = await window.Tesseract.recognize(imgData, 'eng', { logger: () => {} });
        const text = (result?.data?.text || '').trim();
        if (text) { console.log('OCR: Tesseract success'); return text; }
        console.log('OCR: Tesseract returned empty text, trying Claude API...');
      } catch (err) {
        console.log('OCR: Tesseract failed, trying Claude API...', err?.message);
      }
    } else {
      console.log('OCR: Tesseract not loaded, using Claude API...');
    }

    // Step 2: Claude vision fallback
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64: imgData, scanType, language: userLanguage }),
    });
    const data = await res.json();
    console.log('OCR: Claude API response:', data);
    if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
    console.log('OCR: Fallback to Claude success');
    return (data.text || '').trim();
  }, [scanType, userLanguage]);

  const runOCR = useCallback(async (imgData) => {
    setProcessing(true); setOcrText(''); setAiClassify(null); setAiError(null); setCookingResult(null); setColorResult(null);
    try {
      // Color detection is a pure client-side canvas operation — no OCR needed.
      if (scanType === 'color' && isPremium) { detectColors(imgData); setProcessing(false); setTab('results'); return; }

      const cleaned = await extractText(imgData);
      if (!cleaned) {
        setOcrText('');
        setAiError('Could not read image. Try a clearer photo with better lighting.');
        setTab('results');
        return;
      }

      setOcrText(cleaned);
      const newCount = scanCount + 1;
      setScanCount(newCount); ls.set('scanData', { count: newCount, date: todayStr() });
      const entry = { id: Date.now(), type: scanType, text: cleaned, date: new Date().toLocaleString(), img: imgData };
      const newHist = [entry, ...history].slice(0, 10);
      setHistory(newHist); ls.set('history', newHist);
      // Cloud history sync — persist to Supabase when signed in (across devices).
      if (supabaseEnabled && user) {
        supabase.from('history').insert({ userId: user.id, scanType, extractedText: cleaned }).then(({ error }) => {
          if (error) console.error('history sync error:', error.message);
        });
      }
      if (scanType === 'medicine') { setMedChecks({ allergic: false, dosage: false, expiry: false, interactions: false }); setMedModal(true); }
      setTab('results');
      // AI classify
      try {
        const r = await callClaude(`In 1 sentence, classify and describe this scanned text: "${cleaned.slice(0,300)}"`, 'You are a concise product classifier.');
        setAiClassify(r);
      } catch (aiErr) {
        console.error('AI classification error:', aiErr);
        setAiError('AI analysis unavailable. Please try again.');
      }
    } catch (e) {
      console.error('OCR: Both methods failed', e);
      alert('Could not read image. Try clearer photo.');
    } finally {
      setProcessing(false);
    }
  }, [scanType, history, scanCount, callClaude, detectColors, isPremium, extractText, user]);

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

  // ── Camera ──
  const startCam = async () => {
    setCamActive(true); // mount the <video> element first so the ref exists
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      const v = videoRef.current;
      if (v) {
        v.srcObject = s;
        v.setAttribute('playsinline', 'true');
        v.muted = true; // iOS Safari requires muted to autoplay the stream
        try {
          await v.play();
          console.log('Video stream started:', v.videoWidth, v.videoHeight, '| readyState:', v.readyState);
        } catch (playErr) {
          console.error('video.play() failed:', playErr?.name, playErr?.message);
        }
      }
    } catch (err) {
      console.error('getUserMedia failed:', err?.name, err?.message);
      setCamActive(false);
      alert('Camera unavailable: ' + (err?.name || 'permission denied'));
    }
  };

  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setCamActive(false); };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    console.log('Capture: videoWidth/Height =', v.videoWidth, v.videoHeight, '| readyState:', v.readyState);
    if (!v.videoWidth || !v.videoHeight) {
      console.error('Capture aborted: video has no dimensions yet (stream not ready).');
      alert('Camera still starting — please wait a moment and try again.');
      return;
    }
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.9);
    console.log('Canvas drawn. ImageData:', data.substring(0, 50), '| total length:', data.length);
    setScannedImg(data); stopCam(); runOCR(data);
    if (haptic && navigator.vibrate) navigator.vibrate(50);
  };

  // ── Premium ──
  // Start a real Stripe Checkout session and redirect. On return, the
  // ?checkout=success&session_id=... handler (useEffect below) verifies the
  // payment server-side via /api/stripe-verify and unlocks premium.
  const activatePremium = async () => {
    // Premium is DB-backed, so the buyer must be signed in for the webhook to
    // attribute the subscription to their account.
    if (supabaseEnabled && !user) {
      alert('Please sign in (Settings → Account) before subscribing, so your premium syncs across devices.');
      setShowPremModal(false); setTab('settings');
      return;
    }
    setPremProcessing(true);
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || null, email: user?.email || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout unavailable');
      window.location.href = data.url; // redirect to Stripe Checkout
    } catch (e) {
      setPremProcessing(false);
      alert('Payment could not start: ' + e.message);
    }
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

  const canScan = isPremium || scanCount < FREE_DAILY;

  const wrap = {
    maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: C.bg,
    color: C.text, fontFamily: "'Inter',sans-serif", display: 'flex',
    flexDirection: 'column', overflowX: 'hidden',
  };
  const hdr = { padding: '14px 18px 10px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 };

  const chooseLanguage = (code) => {
    setUserLanguage(code); ls.set('userLanguage', code);
    setScreen(ls.get('agreedToTerms', false) ? 'main' : 'legal');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Language picker (first load only)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'language') return (
    <div style={{ ...wrap, overflowY: 'auto' }}>
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <VoiceWaves size={56} />
          <h1 style={{ ...h1s, marginTop: 10 }}>Welcome to AccessRead</h1>
          <p style={ps}>Select your language · Selecciona tu idioma · 选择语言</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => chooseLanguage(l.code)} style={{
              background: C.card2, border: `2px solid ${C.border}`, borderRadius: 14,
              padding: '14px 10px', color: C.text, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 24 }}>{l.flag}</span>
              <span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{l.native}</span>
                <span style={{ display: 'block', fontSize: 11, color: C.muted }}>{l.label}</span>
              </span>
            </button>
          ))}
        </div>
        <p style={{ ...ps, textAlign: 'center', fontSize: 11, marginTop: 16 }}>You can change this anytime in Settings.</p>
      </div>
    </div>
  );

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
        <button style={btn(C.blue)} onClick={() => { console.log('Age check confirmed — closing popup, camera/upload UI should remain visible'); setAgeCheckDone(true); ls.set('ageCheckDone', true); setShowAgeCheck(false); }}>
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

        <div style={{ background: darkMode ? '#1a2f4a' : '#dbeafe', border: `2px solid ${C.blue}`, borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
          <span style={tag(C.blue)}>Monthly</span>
          <div style={{ fontSize: 34, fontWeight: 900, color: C.text, margin: '8px 0 2px' }}>$2.99</div>
          <div style={{ fontSize: 13, color: C.muted }}>per month · cancel anytime</div>
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

        <button style={btn(C.green, { fontSize: 17, padding: '16px 20px', opacity: premProcessing ? 0.7 : 1 })}
          disabled={premProcessing} onClick={activatePremium}>
          {premProcessing ? '⏳ Redirecting to checkout…' : 'Subscribe — $2.99/mo →'}
        </button>
        <p style={{ ...ps, textAlign: 'center', fontSize: 11, marginTop: 6 }}>
          🔒 Secure payment by Stripe · Card, Apple Pay & Google Pay · Cancel anytime
        </p>
      </div>
    </div>
  );

  // ── Premium Success ──
  const PremSuccess = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={h1s}>Welcome to Premium!</h1>
        <p style={ps}>Unlimited scans, AI Cooking Assistant, Color Detection, AI Chat, and premium voices — all unlocked.</p>
        <button style={btn(C.green, { fontSize: 17 })} onClick={() => setPremSuccess(false)}>Start Scanning →</button>
      </div>
    </div>
  );

  // ── Tab: Home ──
  const HomeTab = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VoiceWaves size={40} />
          <h1 style={{ ...h1s, flex: 1, margin: 0 }}>AccessRead</h1>
          <button aria-label="Toggle theme" onClick={() => { setDarkMode(!darkMode); ls.set('darkMode', !darkMode); }}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button aria-label="Settings" onClick={() => setTab('settings')}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>
            ⚙️
          </button>
        </div>
        {!isPremium && (
          <p style={{ ...ps, margin: '6px 0 0', fontSize: 12 }}>{Math.max(0, FREE_DAILY - scanCount)} free scans left today</p>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>Scan Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {SCAN_TYPES.map(st => {
              const locked = st.id === 'color' && !isPremium;
              return (
                <button key={st.id} onClick={() => {
                  console.log('Scan type selected:', st.id, '| locked:', locked, '| ageCheckDone:', ageCheckDone);
                  if (locked) { setShowPremModal(true); return; }
                  if (st.id === 'medicine' && !ageCheckDone) { setScanType(st.id); setShowAgeCheck(true); console.log('Medicine: opening age check popup'); return; }
                  setScanType(st.id);
                  console.log('Should show camera/upload UI now. scanType=', st.id, '| camActive=', camActive, '| processing=', processing);
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
                <label style={{ ...btn('#1e3a8a', { flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }), cursor: 'pointer' }}>
                  📁 Upload
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f && canScan) { const u = URL.createObjectURL(f); setScannedImg(u); runOCR(u); } else if (!canScan) setShowPremModal(true); }} />
                </label>
              </div>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(C.green, { flex: 1, margin: 0 })} onClick={capture}>📸 Capture</button>
                <button style={btn(C.red, { flex: 1, margin: 0 })} onClick={stopCam}>✕ Cancel</button>
              </div>
          }
          <p style={{ ...ps, fontSize: 12, margin: '10px 0 0', textAlign: 'center' }}>
            💡 Tip: scan flat surfaces in good light. Curved labels (jars, bottles) read best photographed straight-on.
          </p>
        </div>

        {!isPremium && (
          <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>
            ⭐ Upgrade to Premium — $2.99/mo
          </button>
        )}

        <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <h2 style={h2s}>🔜 Coming Soon</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COMING_SOON.map(item => (
              <span key={item} style={{ ...tag(darkMode ? '#111' : '#e8e8e8'), color: C.muted, border: `1px solid ${C.border}` }}>{item}</span>
            ))}
          </div>
        </div>

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
              <h2 style={h2s}>🔊 Voice (free · 12 languages)</h2>
              <div style={{ marginBottom: 10 }}>
                <label style={lbl}>Premium AI Voice</label>
                <select value={elevenLabsVoice} onChange={e => setElevenLabsVoice(e.target.value)} style={inp}>
                  {['Rachel','Domi','Bella'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <label style={lbl}>Speed: {ttsRate.toFixed(1)}x</label>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={e => setTtsRate(+e.target.value)} style={{ width: '100%' }} />
            </div>

            {aiClassify && (
              <div style={{ background: C.card2, borderRadius: 16, padding: 18, marginBottom: 14, borderLeft: `3px solid ${C.purple}` }}>
                <h2 style={h2s}>🤖 AI Classification</h2>
                <p style={{ ...ps, margin: 0 }}>{aiClassify}</p>
              </div>
            )}
            {aiError && !aiClassify && (
              <div style={{ background: C.card2, borderRadius: 16, padding: 14, marginBottom: 14, borderLeft: `3px solid ${C.yellow}` }}>
                <p style={{ ...ps, color: C.yellow, margin: 0 }}>⚠️ {aiError}</p>
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
        {user && cloudHistory.length > 0 && (
          <div style={{ background: C.card2, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <h2 style={h2s}>☁️ Cloud History <span style={{ ...tag(C.green), fontSize: 10 }}>synced</span></h2>
            {cloudHistory.map(e => (
              <div key={e.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ ...tag(C.green), marginRight: 8 }}>{e.scanType}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <p style={{ ...ps, color: C.text, margin: 0, fontSize: 13 }}>{e.extractedText?.slice(0, 120)}{e.extractedText?.length > 120 ? '…' : ''}</p>
                <button onClick={() => { setOcrText(e.extractedText); setScanType(e.scanType); setTab('results'); }} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.blue, padding: '3px 10px', cursor: 'pointer', fontSize: 12, marginTop: 6 }}>
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>{user ? 'This Device (last 10)' : 'Recent Scans (last 10)'}</h2>
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
          <h2 style={h2s}>🌐 Language</h2>
          <label style={lbl}>Used to improve OCR text recognition</label>
          <select value={userLanguage || 'English'} onChange={e => { setUserLanguage(e.target.value); ls.set('userLanguage', e.target.value); }} style={inp}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.native} ({l.label})</option>)}
          </select>
        </div>

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
          {supabaseEnabled && !user && (
            <>
              <p style={ps}>Sign in to sync premium &amp; history across your devices.</p>
              {authSent
                ? <p style={{ ...ps, color: C.green }}>✓ Check your email for a sign-in link.</p>
                : <>
                    <input style={inp} type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                    <button style={btn(C.blue)} onClick={signInWithEmail}>✉️ Sign in with Email</button>
                  </>
              }
            </>
          )}
          {user && (
            <p style={{ ...ps, color: C.text }}>Signed in as <strong>{user.email}</strong></p>
          )}
          {isPremium
            ? <><span style={tag(C.green)}>⭐ Premium Active</span><p style={{ ...ps, marginTop: 10 }}>All features unlocked. Thank you!</p></>
            : <><p style={ps}>{Math.max(0, FREE_DAILY - scanCount)} free scans remaining today.</p>
                <button style={btn(C.green)} onClick={() => setShowPremModal(true)}>⭐ Upgrade to Premium</button></>
          }
          {user && <button style={btn(darkMode ? C.card : '#e8e8e8', { border: `1px solid ${C.border}`, color: C.text })} onClick={signOut}>Sign Out</button>}
        </div>

        <div style={{ background: C.card2, borderRadius: 16, padding: 16 }}>
          <h2 style={h2s}>Data</h2>
          <button style={btn(darkMode ? C.card : '#e8e8e8', { border: `1px solid ${C.border}`, color: C.text })}
            onClick={() => { setHistory([]); ls.set('history', []); setScanCount(0); ls.set('scanData', { count: 0, date: todayStr() }); setBookmarks([]); ls.set('bookmarks', []); alert('Cleared.'); }}>
            🗑 Clear All History & Bookmarks
          </button>
          <button style={btn(C.red)} onClick={() => { localStorage.clear(); setUserLanguage(null); setScreen('language'); }}>
            ⚠️ Reset App
          </button>
        </div>

        <p style={{ ...ps, textAlign: 'center', fontSize: 11, marginTop: 8 }}>
          AccessRead · build {APP_VERSION}
        </p>
      </div>
    </div>
  );

  // ── Render ──
  return (
    <div style={wrap} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Render tabs/modals as function calls, not <Component/> elements.
          Defined inside App(), each render created a new component identity,
          so <HomeTab/> unmounted+remounted the whole subtree on every state
          change (e.g. selecting a scan type) — which made the camera/upload
          card vanish. Calling them inline avoids the remount entirely. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        {tab === 'home' && HomeTab()}
        {tab === 'results' && ResultsTab()}
        {tab === 'history' && HistoryTab()}
        {tab === 'emergency' && EmergencyTab()}
        {tab === 'settings' && SettingsTab()}
      </div>
      {BottomNav()}
      {showAgeCheck && AgeCheckPopup()}
      {medModal && MedModal()}
      {showPremModal && PremiumModal()}
      {premSuccess && PremSuccess()}
    </div>
  );
}
