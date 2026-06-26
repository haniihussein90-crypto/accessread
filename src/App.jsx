import React, { useState, useRef, useEffect } from 'react';

const AccessRead = () => {
  // State Management
  const [screen, setScreen] = useState('ageGate');
  const [hasAgreedToLegal, setHasAgreedToLegal] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [scanType, setScanType] = useState('general');
  const [scannedImage, setScannedImage] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [savedItems, setSavedItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [scanCount, setScanCount] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(22);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [currentVoices, setCurrentVoices] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState(null); // 'monthly' or 'yearly'
  const [premiumStartDate, setPremiumStartDate] = useState(null);
  const [buttonFeedback, setButtonFeedback] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showMedicineChecklist, setShowMedicineChecklist] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [emergencyNumberInput, setEmergencyNumberInput] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [medicineChecklist, setMedicineChecklist] = useState({
    readLabel: false,
    checkedAllergies: false,
    checkedInteractions: false,
    consultedDoctor: false,
    notPregnant: false
  });
  const [productClassification, setProductClassification] = useState(null);

  const cameraRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;



  // Load Tesseract.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.0/tesseract.min.js';
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Haptic Feedback Helper
  const triggerHaptic = () => {
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Button Press Feedback (Premium)
  const reactiveButton = async (callback) => {
    if (buttonFeedback && isPremium) {
      triggerHaptic();
      setIsScanning(true);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (callback) callback();
      
      setIsScanning(false);
    } else {
      triggerHaptic();
      if (callback) callback();
    }
  };

  // Process Premium Payment
  const processPremiumPayment = async () => {
    triggerHaptic();
    
    if (!selectedPaymentMethod || !selectedPlan) {
      alert('Please select payment method and plan');
      return;
    }

    // Simulate payment processing
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Upgrade user to premium
    const now = new Date();
    setPremiumStartDate(now.toLocaleString());
    setIsPremium(true);
    setPremiumPlan(selectedPlan);
    setButtonFeedback(true); // Auto-enable button feedback
    
    setIsProcessing(false);
    setScreen('premiumSuccess');
  };

  // Calculate renewal date
  const getRenewalDate = () => {
    if (!premiumStartDate) return null;
    const date = new Date(premiumStartDate);
    if (premiumPlan === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (premiumPlan === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toLocaleDateString();
  };

  // Camera Access
  const startCamera = async () => {
    await reactiveButton(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
          setScreen('camera');
        }
      } catch (error) {
        alert('Camera access denied. Please enable camera permissions.');
      }
    });
  };

  // Capture Photo from Camera
  const capturePhoto = async () => {
    await reactiveButton(() => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = cameraRef.current.videoWidth;
      canvas.height = cameraRef.current.videoHeight;
      context.drawImage(cameraRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setScannedImage(imageData);
      
      if (scanType === 'medicine') {
        setShowMedicineChecklist(true);
      } else {
        processImage(imageData);
      }
    });
  };

  // Photo Upload
  const handlePhotoUpload = async (e) => {
    await reactiveButton(() => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setScannedImage(event.target.result);
          
          if (scanType === 'medicine') {
            setShowMedicineChecklist(true);
          } else {
            processImage(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // OCR Processing
  const processImage = async (imageData) => {
    setIsProcessing(true);
    setProductClassification(null);
    
    if (!window.Tesseract) {
      alert('OCR library loading. Please try again.');
      setIsProcessing(false);
      return;
    }

    try {
      const result = await window.Tesseract.recognize(imageData, 'eng');
      let text = result.data.text.trim();
      
      // Check if text was actually detected
      if (!text || text.length < 5) {
        alert('❌ No text detected. Please try:\n• Better lighting\n• Straight angle\n• Clearer image\n• Flat surface (not curved)');
        setIsProcessing(false);
        return;
      }
      
      if (scanType === 'medicine') {
        text = parseMedicineLabel(text);
      } else if (scanType === 'food') {
        text = parseFoodLabel(text);
      } else if (scanType === 'currency') {
        text = parseCurrency(text);
      }
      
      setExtractedText(text);
      
      // Classify the product with Claude AI
      const classification = await classifyProduct(text);
      if (classification) {
        setProductClassification(classification);
      }
      
      if (!isPremium && scanCount >= 50) {
        alert('Free limit reached (50 scans/month). Upgrade to Premium for unlimited scans.');
        setIsProcessing(false);
        return;
      }
      
      if (!isPremium) {
        setScanCount(scanCount + 1);
      }

      const newHistoryItem = {
        id: Date.now(),
        text: text,
        type: scanType,
        timestamp: new Date().toLocaleString(),
        image: imageData
      };
      setHistory([newHistoryItem, ...history].slice(0, 10));

      setScreen('results');
      
    } catch (error) {
      alert('❌ OCR processing failed. Please try again with better lighting or a clearer image.');
      console.error('OCR error:', error);
    }
    
    setIsProcessing(false);
  };

  // Smart Label Parsers
  const parseMedicineLabel = (text) => {
    return `MEDICINE:\n\n${text}\n\n⚠️ DISCLAIMER: This information may be incorrect. Always verify with pharmacist.`;
  };

  const parseFoodLabel = (text) => {
    return `FOOD PRODUCT:\n\n${text}\n\n🚨 CHECK FOR ALLERGENS: Review ingredients carefully.`;
  };

  const parseCurrency = (text) => {
    if (text.includes('20') || text.includes('twenty')) return '💵 This is a $20 bill';
    if (text.includes('10') || text.includes('ten')) return '💵 This is a $10 bill';
    if (text.includes('5') || text.includes('five')) return '💵 This is a $5 bill';
    if (text.includes('100')) return '💵 This is a $100 bill';
    if (text.includes('50')) return '💵 This is a $50 bill';
    return '💵 Currency detected:\n' + text;
  };

  // Text-to-Speech (Using ElevenLabs API)
  const readAloud = async () => {
    triggerHaptic();
    
    if (isReading) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsReading(false);
      return;
    }

    setIsReading(true);
    
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsReading(false);
        audioRef.current = null;
      };
      
      audio.play().catch(err => {
        console.error('Playback error:', err);
        setIsReading(false);
      });
    } catch (error) {
      console.error('Speech generation error:', error);
      alert('Failed to generate speech');
      setIsReading(false);
    }
  };

  const stopReading = () => {
    triggerHaptic();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsReading(false);
  };

  // Classify Product with Claude AI
  const classifyProduct = async (text) => {
    const prompt = `Analyze this product label text and classify it. Return ONLY a JSON object (no other text):
{
  "productType": "food|medication|cosmetic|perfume|supplement|other",
  "brandName": "extracted brand name or 'Unknown'",
  "productName": "what is this product called",
  "keyInfo": "1-2 key details (ingredients, active component, or main benefit)"
}

Label text:
"${text}"`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY || 'YOUR_API_KEY_HERE',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.log('Product classification skipped');
    }
    return null;
  };

  // AI Features
  const getSmartContext = async (text) => {
    const prompt = `User scanned a ${scanType} label with this text:
    
"${text}"

Provide a brief explanation (2-3 sentences max).`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY || 'YOUR_API_KEY_HERE',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiText = data.content[0].text;
        setAiResponse(aiText);
        setShowAIPanel(true);
      }
    } catch (error) {
      console.log('AI analysis skipped');
    }
  };

  // Ask AI
  const askAI = async () => {
    if (!userQuestion.trim()) return;

    triggerHaptic();
    const newMessage = { user: userQuestion, ai: '' };
    setChatMessages([...chatMessages, newMessage]);
    setUserQuestion('');

    const prompt = `User scanned a ${scanType} label:
"${extractedText}"

User question: "${userQuestion}"

Answer briefly (1-2 sentences max).`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY || 'YOUR_API_KEY_HERE',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiAnswer = data.content[0].text;
        newMessage.ai = aiAnswer;
        setChatMessages([...chatMessages.slice(0, -1), newMessage]);
      }
    } catch (error) {
      alert('AI Q&A unavailable');
    }
  };

  // Save/Bookmark
  const saveItem = () => {
    triggerHaptic();
    if (!isPremium && savedItems.length >= 20) {
      alert('Free limit: max 20 saved items. Upgrade to Premium for unlimited.');
      return;
    }

    const newSave = {
      id: Date.now(),
      text: extractedText,
      type: scanType,
      timestamp: new Date().toLocaleString(),
    };
    setSavedItems([newSave, ...savedItems]);
    alert('✅ Saved!');
  };

  // Copy to Clipboard
  const copyToClipboard = () => {
    triggerHaptic();
    navigator.clipboard.writeText(extractedText);
    alert('✅ Copied!');
  };

  // Clear Current
  const clearCurrent = () => {
    triggerHaptic();
    setExtractedText('');
    setScannedImage(null);
    setAiResponse('');
    setChatMessages([]);
    setUserQuestion('');
    setShowAIPanel(false);
    setShowMedicineChecklist(false);
    setMedicineChecklist({
      readLabel: false,
      checkedAllergies: false,
      checkedInteractions: false,
      consultedDoctor: false,
      notPregnant: false
    });
    setScreen('home');
  };

  // Styles
  const bgColor = darkMode ? '#1f2937' : '#ffffff';
  const textColor = darkMode ? '#ffffff' : '#0b0b0b';
  const accentColor = '#10b981';
  const borderColor = darkMode ? '#374151' : '#e5e7eb';

  const baseStyle = {
    backgroundColor: bgColor,
    color: textColor,
    fontFamily: 'system-ui, sans-serif',
    minHeight: '100vh',
    padding: '20px',
    transition: 'all 0.3s ease'
  };

  const buttonStyle = {
    backgroundColor: accentColor,
    color: '#000000',
    padding: '15px 25px',
    borderRadius: '8px',
    border: 'none',
    fontSize: `${fontSize}px`,
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '10px',
    width: '100%',
    minHeight: '48px',
    transition: 'all 0.2s',
    transform: isScanning ? 'scale(0.95)' : 'scale(1)',
    opacity: isScanning ? 0.8 : 1
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: darkMode ? '#374151' : '#e5e7eb',
    color: textColor
  };

  const containerStyle = {
    maxWidth: '500px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  };

  const warningStyle = {
    backgroundColor: darkMode ? '#7c2d12' : '#fed7aa',
    color: darkMode ? '#ffedd5' : '#92400e',
    padding: '15px',
    borderRadius: '8px',
    borderLeft: '4px solid #ea580c',
    marginBottom: '15px'
  };

  // AGE GATE SCREEN
  if (screen === 'ageGate') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h1 style={{ fontSize: `${fontSize + 8}px`, margin: '0 0 20px 0' }}>📖 AccessRead</h1>
          <p style={{ fontSize: `${fontSize}px`, margin: '0 0 30px 0' }}>Age Verification</p>
          
          <div style={warningStyle}>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>
              ⚠️ Medical app. Must be 18+ to continue.
            </p>
          </div>

          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 30px 0' }}>
            Are you 18 years or older?
          </p>

          <button style={buttonStyle} onClick={() => { setIsOver18(true); setScreen('legalAgreement'); }}>
            ✅ Yes, I'm 18+
          </button>

          <button style={secondaryButtonStyle} onClick={() => alert('You must be 18+ to use AccessRead')}>
            ❌ No, I'm Under 18
          </button>
        </div>
      </div>
    );
  }

  // LEGAL AGREEMENT SCREEN
  if (screen === 'legalAgreement') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h1 style={{ fontSize: `${fontSize + 4}px`, margin: '0 0 20px 0' }}>⚠️ Legal Agreement</h1>

        <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: `${fontSize}px`, margin: '0 0 10px 0' }}>Medical Disclaimer</h3>
          <p style={{ fontSize: `${fontSize - 2}px`, lineHeight: '1.6', margin: '0 0 15px 0' }}>
            AccessRead is NOT a medical device or doctor. Always consult healthcare professionals before taking medication.
          </p>

          <h3 style={{ fontSize: `${fontSize}px`, margin: '15px 0 10px 0' }}>Emergency Services</h3>
          <p style={{ fontSize: `${fontSize - 2}px`, lineHeight: '1.6', margin: '0 0 15px 0' }}>
            For emergencies, call your local emergency services immediately. This app is NOT a substitute for emergency care.
          </p>

          <h3 style={{ fontSize: `${fontSize}px`, margin: '15px 0 10px 0' }}>Terms</h3>
          <p style={{ fontSize: `${fontSize - 2}px`, lineHeight: '1.6', margin: '0 0 15px 0' }}>
            • This app may contain errors<br/>
            • You take full responsibility for health decisions<br/>
            • We are not liable for medical harm
          </p>

          <h3 style={{ fontSize: `${fontSize}px`, margin: '15px 0 10px 0' }}>Privacy</h3>
          <p style={{ fontSize: `${fontSize - 2}px`, lineHeight: '1.6', margin: '0' }}>
            We don't store medical info. All processing is on your device.
          </p>
        </div>

        <div style={{ backgroundColor: darkMode ? '#065f46' : '#ecfdf5', padding: '15px', borderRadius: '8px', margin: '15px 0' }}>
          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input
              type="checkbox"
              checked={hasAgreedToLegal}
              onChange={(e) => setHasAgreedToLegal(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px' }}
            />
            <span>I agree to all terms and take responsibility for my health decisions.</span>
          </label>
        </div>

        <button style={{ ...buttonStyle, opacity: hasAgreedToLegal ? 1 : 0.5 }} onClick={() => hasAgreedToLegal && setScreen('home')} disabled={!hasAgreedToLegal}>
          ✅ I Agree & Continue
        </button>

        <button style={secondaryButtonStyle} onClick={() => alert('You must agree to continue')}>
          ❌ I Do Not Agree
        </button>
      </div>
    );
  }

  // EMERGENCY SCREEN
  if (screen === 'emergency') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h1 style={{ fontSize: `${fontSize + 4}px`, margin: '20px 0' }}>🚨 Emergency</h1>

        <div style={warningStyle}>
          <p style={{ fontSize: `${fontSize}px`, fontWeight: 'bold', margin: '0 0 10px 0' }}>IF THIS IS AN EMERGENCY:</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>CALL YOUR LOCAL EMERGENCY SERVICES NOW</p>
        </div>

        {emergencyNumber ? (
          <div style={{ backgroundColor: darkMode ? '#065f46' : '#ecfdf5', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0', fontWeight: 'bold' }}>Your Emergency Number:</p>
            <p style={{ fontSize: `${fontSize + 2}px`, margin: '0', fontWeight: 'bold', color: accentColor }}>{emergencyNumber}</p>
          </div>
        ) : (
          <div style={{ backgroundColor: darkMode ? '#7c2d12' : '#fed7aa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0' }}>⚠️ You haven't saved your emergency number yet.</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>Go to Settings to add it.</p>
          </div>
        )}

        <h3 style={{ fontSize: `${fontSize}px`, margin: '20px 0 10px 0' }}>Global Numbers:</h3>
        <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>🇺🇸 USA: 911</p>
        <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>🇬🇧 UK: 999</p>
        <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>🇦🇺 Australia: 000</p>
        <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>🇮🇳 India: 112</p>
        <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 15px 0' }}>🇻🇳 Vietnam: 113</p>

        <button style={secondaryButtonStyle} onClick={() => setScreen('home')}>🏠 Back</button>
      </div>
    );
  }

  // PREMIUM UPGRADE - PLAN SELECTION
  if (screen === 'premiumUpgrade') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h1 style={{ fontSize: `${fontSize + 4}px`, margin: '0 0 20px 0' }}>💎 Upgrade to Premium</h1>

        <h3 style={{ fontSize: `${fontSize}px`, margin: '20px 0 15px 0' }}>Choose Your Plan:</h3>

        <div
          style={{
            backgroundColor: selectedPlan === 'monthly' ? accentColor : (darkMode ? '#374151' : '#f3f4f6'),
            color: selectedPlan === 'monthly' ? '#000000' : textColor,
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${accentColor}`,
            cursor: 'pointer',
            marginBottom: '10px',
            transition: 'all 0.2s'
          }}
          onClick={() => setSelectedPlan('monthly')}
        >
          <p style={{ fontSize: `${fontSize}px`, fontWeight: '600', margin: '0 0 5px 0' }}>📅 Monthly</p>
          <p style={{ fontSize: `${fontSize + 2}px`, fontWeight: 'bold', margin: '0 0 8px 0' }}>$4.99/month</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: 0, opacity: 0.8 }}>Cancel anytime</p>
        </div>

        <div
          style={{
            backgroundColor: selectedPlan === 'yearly' ? accentColor : (darkMode ? '#374151' : '#f3f4f6'),
            color: selectedPlan === 'yearly' ? '#000000' : textColor,
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${accentColor}`,
            cursor: 'pointer',
            marginBottom: '15px',
            transition: 'all 0.2s'
          }}
          onClick={() => setSelectedPlan('yearly')}
        >
          <p style={{ fontSize: `${fontSize}px`, fontWeight: '600', margin: '0 0 5px 0' }}>📅 Yearly</p>
          <p style={{ fontSize: `${fontSize + 2}px`, fontWeight: 'bold', margin: '0 0 8px 0' }}>$39.99/year</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: 0, opacity: 0.8 }}>Save $19.89 (33% off!)</p>
        </div>

        <div style={{ backgroundColor: darkMode ? '#065f46' : '#ecfdf5', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <h3 style={{ fontSize: `${fontSize}px`, color: accentColor, margin: '0 0 10px 0' }}>What You Get:</h3>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>✨ Unlimited scans</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>✨ Button press feedback</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 5px 0' }}>✨ Advanced AI features</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0' }}>✨ Priority support</p>
        </div>

        <button style={{ ...buttonStyle, opacity: selectedPlan ? 1 : 0.5 }} onClick={() => selectedPlan && setScreen('premiumPayment')} disabled={!selectedPlan}>
          Continue to Payment
        </button>

        <button style={secondaryButtonStyle} onClick={() => setScreen('home')}>Cancel</button>
      </div>
    );
  }

  // PREMIUM UPGRADE - PAYMENT METHOD
  if (screen === 'premiumPayment') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h1 style={{ fontSize: `${fontSize + 4}px`, margin: '0 0 20px 0' }}>💳 Payment Method</h1>

        <h3 style={{ fontSize: `${fontSize}px`, margin: '20px 0 15px 0' }}>Select Payment Method:</h3>

        <button
          style={{
            ...secondaryButtonStyle,
            backgroundColor: selectedPaymentMethod === 'applepay' ? accentColor : (darkMode ? '#374151' : '#f3f4f6'),
            color: selectedPaymentMethod === 'applepay' ? '#000000' : textColor,
            border: selectedPaymentMethod === 'applepay' ? 'none' : `2px solid ${accentColor}`,
            fontWeight: selectedPaymentMethod === 'applepay' ? '600' : '500'
          }}
          onClick={() => setSelectedPaymentMethod('applepay')}
        >
          🍎 Apple Pay (Fastest)
        </button>

        <button
          style={{
            ...secondaryButtonStyle,
            backgroundColor: selectedPaymentMethod === 'card' ? accentColor : (darkMode ? '#374151' : '#f3f4f6'),
            color: selectedPaymentMethod === 'card' ? '#000000' : textColor,
            border: selectedPaymentMethod === 'card' ? 'none' : `2px solid ${accentColor}`,
            fontWeight: selectedPaymentMethod === 'card' ? '600' : '500'
          }}
          onClick={() => setSelectedPaymentMethod('card')}
        >
          💳 Credit Card (Visa, Mastercard, Amex)
        </button>

        <button
          style={{
            ...secondaryButtonStyle,
            backgroundColor: selectedPaymentMethod === 'bank' ? accentColor : (darkMode ? '#374151' : '#f3f4f6'),
            color: selectedPaymentMethod === 'bank' ? '#000000' : textColor,
            border: selectedPaymentMethod === 'bank' ? 'none' : `2px solid ${accentColor}`,
            fontWeight: selectedPaymentMethod === 'bank' ? '600' : '500'
          }}
          onClick={() => setSelectedPaymentMethod('bank')}
        >
          🏦 Bank Transfer
        </button>

        <div style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '15px', borderRadius: '8px', marginTop: '20px', marginBottom: '15px' }}>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0', fontWeight: 'bold' }}>Summary:</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 4px 0' }}>Plan: {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 4px 0' }}>Price: {selectedPlan === 'monthly' ? '$4.99/month' : '$39.99/year'}</p>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>Method: {selectedPaymentMethod === 'applepay' ? 'Apple Pay' : selectedPaymentMethod === 'card' ? 'Credit Card' : 'Bank Transfer'}</p>
        </div>

        <button style={{ ...buttonStyle, opacity: selectedPaymentMethod ? 1 : 0.5 }} onClick={processPremiumPayment} disabled={!selectedPaymentMethod || isProcessing}>
          {isProcessing ? '⏳ Processing...' : '✅ Complete Purchase'}
        </button>

        <button style={secondaryButtonStyle} onClick={() => setScreen('premiumUpgrade')}>← Back to Plans</button>
      </div>
    );
  }

  // PREMIUM SUCCESS SCREEN
  if (screen === 'premiumSuccess') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <h1 style={{ fontSize: `${fontSize + 8}px`, margin: '0 0 10px 0' }}>🎉</h1>
          <h2 style={{ fontSize: `${fontSize + 4}px`, margin: '0 0 20px 0' }}>Welcome to Premium!</h2>

          <div style={{ backgroundColor: darkMode ? '#065f46' : '#ecfdf5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ fontSize: `${fontSize}px`, fontWeight: 'bold', color: accentColor, margin: '0 0 15px 0' }}>✨ You Now Have:</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 10px 0' }}>✅ Unlimited scans (unlimited!)</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 10px 0' }}>✅ Button Press Feedback (enabled)</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 10px 0' }}>✅ Advanced AI features (3 agents)</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0' }}>✅ Offline mode (coming soon)</p>
          </div>

          <div style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0', fontWeight: 'bold' }}>Subscription Details:</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 4px 0' }}>Plan: {premiumPlan === 'monthly' ? 'Monthly ($4.99/month)' : 'Yearly ($39.99/year)'}</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 4px 0' }}>Started: {premiumStartDate}</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>Renews: {getRenewalDate()}</p>
          </div>

          <button style={buttonStyle} onClick={() => setScreen('home')}>
            🚀 Start Using Premium
          </button>

          <button style={secondaryButtonStyle} onClick={() => setScreen('settings')}>
            ⚙️ Go to Settings
          </button>
        </div>
      </div>
    );
  }

  // MEDICINE CHECKLIST SCREEN
  if (screen === 'home' && showMedicineChecklist) {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h2 style={{ fontSize: `${fontSize + 4}px` }}>⚠️ Safety Checklist</h2>

        <div style={warningStyle}>
          <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>
            Before taking ANY medication, check all boxes below.
          </p>
        </div>

        <div style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={medicineChecklist.readLabel}
              onChange={(e) => setMedicineChecklist({ ...medicineChecklist, readLabel: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            I have read the OFFICIAL label
          </label>

          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={medicineChecklist.checkedAllergies}
              onChange={(e) => setMedicineChecklist({ ...medicineChecklist, checkedAllergies: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            I am NOT allergic to any ingredient
          </label>

          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={medicineChecklist.checkedInteractions}
              onChange={(e) => setMedicineChecklist({ ...medicineChecklist, checkedInteractions: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            I checked for drug interactions
          </label>

          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={medicineChecklist.consultedDoctor}
              onChange={(e) => setMedicineChecklist({ ...medicineChecklist, consultedDoctor: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            I consulted my doctor/pharmacist
          </label>

          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={medicineChecklist.notPregnant}
              onChange={(e) => setMedicineChecklist({ ...medicineChecklist, notPregnant: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            I'm not pregnant/breastfeeding
          </label>
        </div>

        <button 
          style={{ ...buttonStyle, opacity: Object.values(medicineChecklist).every(v => v) ? 1 : 0.5 }} 
          onClick={() => {
            if (Object.values(medicineChecklist).every(v => v)) {
              processImage(scannedImage);
              setShowMedicineChecklist(false);
            } else {
              alert('Check all boxes');
            }
          }}
          disabled={!Object.values(medicineChecklist).every(v => v)}
        >
          ✅ Continue
        </button>

        <button style={secondaryButtonStyle} onClick={() => { setShowMedicineChecklist(false); clearCurrent(); }}>
          ❌ Cancel
        </button>

        <button style={{ ...secondaryButtonStyle, backgroundColor: '#dc2626', color: 'white' }} onClick={() => setScreen('emergency')}>
          🚨 Emergency
        </button>
      </div>
    );
  }

  // HOME SCREEN
  if (screen === 'home') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h1 style={{ fontSize: `${fontSize + 8}px`, textAlign: 'center', margin: '20px 0' }}>📖 AccessRead</h1>
        
        {isPremium ? (
          <p style={{ textAlign: 'center', fontSize: `${fontSize - 2}px`, color: accentColor, fontWeight: 'bold' }}>
            💎 Premium Member
          </p>
        ) : (
          <p style={{ textAlign: 'center', fontSize: `${fontSize - 2}px`, opacity: 0.8 }}>
            Scans: {scanCount}/50
          </p>
        )}

        <button style={buttonStyle} onClick={startCamera} disabled={isScanning}>
          {isScanning ? '⏳ Scanning...' : '📷 Take Photo'}
        </button>
        <button style={buttonStyle} onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
          {isScanning ? '⏳ Scanning...' : '📁 Upload Photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />

        <button style={{ ...secondaryButtonStyle, backgroundColor: '#dc2626', color: 'white' }} onClick={() => setScreen('emergency')}>
          🚨 Emergency
        </button>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '20px', marginTop: '20px' }}>
          <h3 style={{ fontSize: `${fontSize}px` }}>Quick Scan Type</h3>
          {['general', 'medicine', 'food', 'currency', 'color', 'barcode'].map((type) => (
            <button
              key={type}
              style={{
                ...secondaryButtonStyle,
                backgroundColor: scanType === type ? accentColor : 'transparent',
                color: scanType === type ? '#000000' : textColor,
                border: scanType === type ? 'none' : `2px solid ${accentColor}`,
                fontWeight: scanType === type ? '600' : '500',
                marginBottom: '8px'
              }}
              onClick={() => setScanType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button style={{ ...secondaryButtonStyle, flex: 1 }} onClick={() => setScreen('history')}>📜 History</button>
          <button style={{ ...secondaryButtonStyle, flex: 1 }} onClick={() => setScreen('settings')}>⚙️ Settings</button>
        </div>
      </div>
    );
  }

  // CAMERA SCREEN
  if (screen === 'camera') {
    return (
      <div style={baseStyle}>
        <div style={containerStyle}>
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: `2px solid ${accentColor}`
            }}
          />
          
          <button style={buttonStyle} onClick={capturePhoto} disabled={isProcessing}>
            {isProcessing ? '⏳ Processing...' : '✅ Capture & Scan'}
          </button>
          
          <button style={secondaryButtonStyle} onClick={() => {
            triggerHaptic();
            cameraRef.current?.srcObject?.getTracks().forEach(track => track.stop());
            setScreen('home');
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // RESULTS SCREEN
  if (screen === 'results') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h2 style={{ fontSize: `${fontSize + 4}px` }}>Extracted Text</h2>

        {scanType === 'medicine' && (
          <div style={warningStyle}>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0', fontWeight: 'bold' }}>⚠️ DISCLAIMER:</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: 0 }}>May be incorrect. Verify with pharmacist.</p>
          </div>
        )}

        {scannedImage && (
          <img src={scannedImage} alt="Scanned" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
        )}

        {productClassification && (
          <div style={{
            backgroundColor: 'transparent',
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${accentColor}`,
            marginBottom: '15px'
          }}>
            <h3 style={{ fontSize: `${fontSize}px`, color: accentColor, margin: '0 0 10px 0' }}>🏷️ Product Classification</h3>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '5px 0', color: textColor }}>
              <strong>Type:</strong> {productClassification.productType?.toUpperCase() || 'Unknown'}
            </p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '5px 0', color: textColor }}>
              <strong>Brand:</strong> {productClassification.brandName || 'Not identified'}
            </p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '5px 0', color: textColor }}>
              <strong>Product:</strong> {productClassification.productName || 'N/A'}
            </p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '5px 0', color: textColor }}>
              <strong>Key Info:</strong> {productClassification.keyInfo || 'No details available'}
            </p>
          </div>
        )}

        <div style={{
          backgroundColor: darkMode ? '#374151' : '#f3f4f6',
          padding: '15px',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          border: `1px solid ${borderColor}`
        }}>
          <p style={{ fontSize: `${fontSize}px`, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {extractedText}
          </p>
        </div>

        {showAIPanel && aiResponse && (
          <div style={{
            backgroundColor: darkMode ? '#065f46' : '#ecfdf5',
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${accentColor}`
          }}>
            <h3 style={{ fontSize: `${fontSize}px`, color: accentColor }}>✨ AI Insight</h3>
            <p style={{ fontSize: `${fontSize - 2}px` }}>{aiResponse}</p>
          </div>
        )}

        <div style={{
          backgroundColor: darkMode ? '#1f2937' : '#f9fafb',
          padding: '15px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: `${fontSize}px`, marginBottom: '10px' }}>💬 Ask Me</h3>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: `${fontSize - 2}px`, fontWeight: '500' }}>You: {msg.user}</p>
              {msg.ai && <p style={{ fontSize: `${fontSize - 2}px`, color: accentColor }}>AI: {msg.ai}</p>}
            </div>
          ))}
          
          <input
            type="text"
            placeholder="Ask..."
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: `${fontSize - 2}px`,
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              backgroundColor: darkMode ? '#374151' : '#ffffff',
              color: textColor,
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
            onKeyPress={(e) => e.key === 'Enter' && askAI()}
          />
          <button style={buttonStyle} onClick={askAI}>🤖 Ask</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <button style={buttonStyle} onClick={readAloud}>{isReading ? '⏸' : '🔊'}</button>
          <button style={secondaryButtonStyle} onClick={stopReading}>⏹</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <button style={buttonStyle} onClick={saveItem}>💾</button>
          <button style={buttonStyle} onClick={copyToClipboard}>📋</button>
          <button style={buttonStyle} onClick={clearCurrent}>🏠</button>
        </div>
      </div>
    );
  }

  // HISTORY SCREEN
  if (screen === 'history') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h2 style={{ fontSize: `${fontSize + 4}px` }}>📜 History</h2>

        {history.length === 0 ? (
          <p style={{ fontSize: `${fontSize}px`, textAlign: 'center', opacity: 0.6 }}>No scans yet</p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                padding: '12px',
                borderRadius: '6px',
                borderLeft: `4px solid ${accentColor}`,
                cursor: 'pointer'
              }}
              onClick={() => {
                setExtractedText(item.text);
                setScannedImage(item.image);
                setScanType(item.type);
                setScreen('results');
              }}
            >
              <p style={{ fontSize: `${fontSize - 2}px`, fontWeight: '500', margin: '0 0 4px 0' }}>
                {item.type.toUpperCase()}
              </p>
              <p style={{ fontSize: `${fontSize - 2}px`, opacity: 0.7, margin: '0 0 4px 0' }}>
                {item.text.substring(0, 50)}...
              </p>
              <p style={{ fontSize: `${fontSize - 4}px`, opacity: 0.5, margin: 0 }}>
                {item.timestamp}
              </p>
            </div>
          ))
        )}

        <button style={secondaryButtonStyle} onClick={() => setScreen('home')}>🏠 Home</button>
      </div>
    );
  }

  // SETTINGS SCREEN
  if (screen === 'settings') {
    return (
      <div style={{ ...baseStyle, ...containerStyle }}>
        <h2 style={{ fontSize: `${fontSize + 4}px` }}>⚙️ Settings</h2>

        {isPremium && (
          <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px', backgroundColor: darkMode ? '#065f46' : '#ecfdf5', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: `${fontSize}px`, color: accentColor, margin: '0 0 10px 0' }}>💎 PREMIUM MEMBER</h3>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0' }}>Plan: {premiumPlan === 'monthly' ? 'Monthly ($4.99/month)' : 'Yearly ($39.99/year)'}</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 8px 0' }}>Renews: {getRenewalDate()}</p>
            <p style={{ fontSize: `${fontSize - 2}px`, margin: '0 0 15px 0' }}>Total Scans: Unlimited ✨</p>
            <button style={{ ...secondaryButtonStyle, backgroundColor: '#dc2626', color: 'white', marginBottom: '8px' }} onClick={() => alert('Subscription cancelled. (Coming in app)')}>
              ⏹ Cancel Subscription
            </button>
            <button style={secondaryButtonStyle} onClick={() => alert('View invoices (Coming soon)')}>
              📄 View Invoices
            </button>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
          <h3 style={{ fontSize: `${fontSize}px`, margin: '0 0 10px 0' }}>📞 Emergency Contact</h3>
          <input
            type="text"
            placeholder="e.g. 911, 999, 112, 113..."
            value={emergencyNumberInput}
            onChange={(e) => setEmergencyNumberInput(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: `${fontSize - 2}px`,
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              backgroundColor: darkMode ? '#374151' : '#ffffff',
              color: textColor,
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
          />
          <button style={buttonStyle} onClick={() => { setEmergencyNumber(emergencyNumberInput); alert('✅ Saved!'); }}>
            💾 Save
          </button>
          {emergencyNumber && (
            <p style={{ fontSize: `${fontSize - 2}px`, color: accentColor, margin: '10px 0 0 0' }}>
              ✅ Saved: {emergencyNumber}
            </p>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
          <label style={{ fontSize: `${fontSize - 2}px`, display: 'block', marginBottom: '8px' }}>Font Size: {fontSize}px</label>
          <input
            type="range"
            min="16"
            max="32"
            step="2"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            style={{ width: '100%', height: '8px' }}
          />
        </div>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
            Dark Mode
          </label>
        </div>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
          <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={hapticEnabled} onChange={(e) => setHapticEnabled(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
            Haptic Feedback
          </label>
        </div>

        {isPremium && (
          <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
            <label style={{ fontSize: `${fontSize - 2}px`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={buttonFeedback} onChange={(e) => setButtonFeedback(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
              Button Press Feedback
            </label>
          </div>
        )}

        {!isPremium && (
          <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px', backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: `${fontSize}px`, color: accentColor, margin: '0 0 15px 0' }}>💎 Upgrade to Premium</h3>
            <button style={buttonStyle} onClick={() => setScreen('premiumUpgrade')}>
              🚀 Upgrade Now
            </button>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
          <button style={secondaryButtonStyle} onClick={() => alert('Terms (tap to view)')}>📋 Terms</button>
          <button style={secondaryButtonStyle} onClick={() => alert('Privacy (tap to view)')}>🔒 Privacy</button>
          <button style={secondaryButtonStyle} onClick={() => setScreen('emergency')}>🚨 Emergency</button>
        </div>

        <button style={secondaryButtonStyle} onClick={() => setScreen('home')}>🏠 Home</button>
      </div>
    );
  }

  return null;
};

export default AccessRead;
