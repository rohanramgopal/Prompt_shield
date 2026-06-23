import React, { useState, useEffect, useRef } from 'react';
import { encode } from 'gpt-tokenizer';
import { 
  Sparkles, 
  Trash2, 
  Play, 
  Send, 
  Copy, 
  CheckCircle2, 
  Terminal, 
  ArrowRightLeft, 
  RefreshCw, 
  Bot,
  LayoutDashboard,
  KeyRound,
  FileSpreadsheet,
  Layers,
  Image as ImageIcon,
  Download,
  Shield,
  ShieldAlert,
  ShieldCheck,
  EyeOff,
  Plus,
  AlertTriangle,
  Fingerprint,
  HeartHandshake
} from 'lucide-react';
import { optimizeText } from './utils/optimizer';
import { analyzePromptIntent } from './utils/recommender';
import { MODELS, calculateSavings, generateMockResponse } from './utils/pricing';
import { sendPromptToAI } from './utils/apiService';
import { scanAndRedact, rehydrateText, DETECTORS } from './utils/security';
import './index.css';

function App() {
  // Navigation: 'optimizer' | 'matrix' | 'keys' | 'poster' | 'security'
  const [activeScreen, setActiveScreen] = useState('optimizer');
  const [activeTab, setActiveTab] = useState('output'); // 'output' or 'chat'

  // Input & Shared States
  const [inputText, setInputText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  
  // API Integration state
  const [provider, setProvider] = useState(() => localStorage.getItem('token_min_provider') || 'mock');
  const [modelId, setModelId] = useState(() => localStorage.getItem('token_min_model') || 'mock-model');
  
  // Keys
  const [keys, setKeys] = useState({
    openai: localStorage.getItem('token_min_key_openai') || '',
    anthropic: localStorage.getItem('token_min_key_anthropic') || '',
    gemini: localStorage.getItem('token_min_key_gemini') || '',
    deepseek: localStorage.getItem('token_min_key_deepseek') || '',
    groq: localStorage.getItem('token_min_key_groq') || ''
  });

  // Cumulative statistics
  const [cumulativeSavings, setCumulativeSavings] = useState(() => {
    return parseFloat(localStorage.getItem('token_min_cumulative_savings') || '0.00');
  });
  const [lifetimeQueries, setLifetimeQueries] = useState(() => {
    return parseInt(localStorage.getItem('token_min_lifetime_queries') || '0');
  });
  const [totalRedactions, setTotalRedactions] = useState(() => {
    return parseInt(localStorage.getItem('token_min_total_redactions') || '0');
  });

  // Toggles for optimizer
  const [options, setOptions] = useState({
    strength: 'advanced',
    condenseWhitespace: true,
    removeFillers: true,
    shrinkPunctuation: true,
    minifyJson: false,
    minifyCode: true
  });

  // Security guard states (PromptShield)
  const [securityEnabled, setSecurityEnabled] = useState(true);
  const [activeDetectors, setActiveDetectors] = useState({
    creditCard: true,
    email: true,
    phone: true,
    ssn: true,
    awsKey: true,
    stripeKey: true,
    githubToken: true,
    slackToken: true,
    jwt: true,
    openaiKey: true,
    anthropicKey: true,
    gcpServiceAccount: true,
    genericPassword: true
  });
  const [customKeywordsInput, setCustomKeywordsInput] = useState('');
  const [redactionStrategy, setRedactionStrategy] = useState('mask'); // 'mask' | 'purge' | 'block'
  const [advancedEntropy, setAdvancedEntropy] = useState(true);
  const [dehydrateRehydrate, setDehydrateRehydrate] = useState(true);

  // In-RAM local session salt mapping
  const [sessionSalts, setSessionSalts] = useState({});

  // Chat history
  const [chatHistory, setChatHistory] = useState([]);

  // Local Audit Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('promptshield_audit_logs') || '[]');
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('promptshield_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (originalText, optimizedText, sourceAction) => {
    const originalTokens = originalText ? encode(originalText).length : 0;
    const optimizedTokens = optimizedText ? encode(optimizedText).length : 0;
    const savings = Math.max(0, originalTokens - optimizedTokens);
    const savingsINR = calculateSavings(originalTokens, optimizedTokens, currentModel);
    
    const scanResult = securityEnabled
      ? scanAndRedact(originalText, activeDetectors, customKeywords, redactionStrategy, advancedEntropy)
      : { matches: [] };

    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      originalText,
      optimizedText,
      originalTokens,
      optimizedTokens,
      savings,
      savingsINR,
      secretsBlocked: scanResult.matches.length,
      action: sourceAction,
      modelName: currentModel.name
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Matrix console overlay state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Security scanning and redaction logic
  const customKeywords = customKeywordsInput
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const securityReport = securityEnabled
    ? scanAndRedact(inputText, activeDetectors, customKeywords, redactionStrategy, advancedEntropy)
    : { matches: [], cleanedText: inputText, saltMap: {} };

  const recommendation = analyzePromptIntent(inputText);

  const isBlocked = securityEnabled && redactionStrategy === 'block' && securityReport.matches.length > 0;

  // Sync token counting based on cleaned/redacted text
  const inTokens = inputText ? encode(inputText).length : 0;
  const outText = isBlocked ? 'Blocked by PromptShield: PII / Key Detected' : optimizeText(securityReport.cleanedText, options);
  const outTokens = outText ? encode(outText).length : 0;
  const savedTokens = Math.max(0, inTokens - outTokens);
  const savedPercent = inTokens > 0 ? Math.round((savedTokens / inTokens) * 100) : 0;

  // Selected active model config
  const currentModel = (() => {
    const list = MODELS[provider] || [];
    return list.find(m => m.id === modelId) || MODELS.mock[0];
  })();

  const currentPromptSavings = calculateSavings(inTokens, outTokens, currentModel);

  // Auto update optimized text
  useEffect(() => {
    setOptimizedText(outText);
    // Accumulate salts in session mapping
    if (securityEnabled && securityReport.saltMap) {
      setSessionSalts(prev => ({ ...prev, ...securityReport.saltMap }));
    }
  }, [inputText, options, securityReport.cleanedText, isBlocked]);

  // Persist selections
  useEffect(() => {
    localStorage.setItem('token_min_provider', provider);
    const list = MODELS[provider] || [];
    if (list.length > 0 && !list.some(m => m.id === modelId)) {
      setModelId(list[0].id);
    }
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('token_min_model', modelId);
  }, [modelId]);

  useEffect(() => {
    Object.keys(keys).forEach(k => {
      localStorage.setItem(`token_min_key_${k}`, keys[k]);
    });
  }, [keys]);

  useEffect(() => {
    localStorage.setItem('token_min_cumulative_savings', cumulativeSavings.toFixed(6));
  }, [cumulativeSavings]);

  useEffect(() => {
    localStorage.setItem('token_min_lifetime_queries', lifetimeQueries.toString());
  }, [lifetimeQueries]);

  useEffect(() => {
    localStorage.setItem('token_min_total_redactions', totalRedactions.toString());
  }, [totalRedactions]);

  // Matrix Falling rain canvas
  useEffect(() => {
    if (!showTerminal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    const columns = Math.floor(canvas.width / 14);
    const ypos = Array(columns).fill(0);

    const drawMatrix = () => {
      ctx.fillStyle = 'rgba(5, 7, 10, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#39ff14';
      ctx.font = '12px monospace';

      for (let i = 0; i < ypos.length; i++) {
        const text = String.fromCharCode(Math.floor(Math.random() * 96) + 33);
        const x = i * 14;
        const y = ypos[i];

        ctx.fillText(text, x, y);

        if (y > 100 + Math.random() * 10000) {
          ypos[i] = 0;
        } else {
          ypos[i] = y + 14;
        }
      }
    };

    const interval = setInterval(drawMatrix, 40);
    return () => clearInterval(interval);
  }, [showTerminal]);

  // Simulation loading delay pipeline (PromptShield)
  const runCyberPipeline = async (actionCallback) => {
    setShowTerminal(true);
    setTerminalLogs([]);

    const steps = [
      '[SYSTEM] Initiating PromptShield prompt protection module...',
      `[SECURITY] Scanning payload. Active Shield: ${securityEnabled ? 'ENABLED' : 'DISABLED'}.`,
      advancedEntropy ? '[SECURITY] Running Advanced Shannon Entropy heuristic audit...' : null,
      securityEnabled && securityReport.matches.length > 0
        ? `[SECURITY WARNING] Flagged ${securityReport.matches.length} credential/PII leaks. Strategy: ${redactionStrategy.toUpperCase()}.`
        : '[SECURITY] Verification clean. 0 vulnerabilities detected.',
      Object.keys(securityReport.saltMap || {}).length > 0 && dehydrateRehydrate
        ? `[DEHYDRATOR] Salting ${Object.keys(securityReport.saltMap).length} secrets in local RAM state.`
        : null,
      `[OPTIMIZER] Validated input: ${inTokens} original tokens.`,
      options.removeFillers ? '[OPTIMIZER] Stripping conversational stop-words...' : null,
      options.condenseWhitespace ? '[OPTIMIZER] Purging redundant tabs and spacing metrics...' : null,
      options.shrinkPunctuation ? '[OPTIMIZER] Shrinking multiple punctuation characters...' : null,
      options.minifyJson ? '[OPTIMIZER] Minifying JSON blocks...' : null,
      `[OPTIMIZER] Decompression threshold set. Size: ${outTokens} tokens (${savedPercent}% saved).`,
      `[ROUTER] Packaging request for ${provider.toUpperCase()} [Model: ${modelId}]...`,
      provider === 'mock' 
        ? '[ROUTER] Sandbox simulation active. Local reply construction started...'
        : `[ROUTER] Transmitting secure request packets to ${provider.toUpperCase()} servers...`
    ].filter(Boolean);

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 180));
      setTerminalLogs(prev => [...prev, steps[i]]);
    }

    try {
      await actionCallback();
      if (dehydrateRehydrate && Object.keys(sessionSalts).length > 0) {
        setTerminalLogs(prev => [...prev, `[DEHYDRATOR] Rehydrating credentials from secure RAM...`]);
        await new Promise(resolve => setTimeout(resolve, 180));
      }
      setTerminalLogs(prev => [...prev, '[SYSTEM] Context packet resolved. Clean payload returned.']);
      await new Promise(resolve => setTimeout(resolve, 180));
    } catch (err) {
      setTerminalLogs(prev => [...prev, `[FATAL] Pipeline Error: ${err.message}`]);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setShowTerminal(false);
    }
  };

  const handleCopy = () => {
    if (!optimizedText || isBlocked) return;
    navigator.clipboard.writeText(optimizedText);
    setCopied(true);
    addAuditLog(inputText, optimizedText, 'Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendPrompt = async () => {
    if (!optimizedText.trim() || isBlocked) return;

    const userMessage = { 
      role: 'user', 
      content: optimizedText,
      rawContent: inputText,
      showRaw: false
    };
    setChatHistory(prev => [...prev, userMessage]);

    const activeApiKey = keys[provider];
    
    addAuditLog(inputText, optimizedText, 'Sandbox Run');

    await runCyberPipeline(async () => {
      let responseText = '';
      if (provider === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 700));
        responseText = generateMockResponse(optimizedText, modelId);
      } else {
        responseText = await sendPromptToAI(provider, modelId, optimizedText, activeApiKey);
      }

      // Rehydrate the reply if enabled
      let finalResponse = responseText;
      if (dehydrateRehydrate && Object.keys(sessionSalts).length > 0) {
        // Force mock responses or general replies to refer back to variables if they repeat them
        // In real cases, the LLM mentions the salt placeholder, and we swap it in local memory
        finalResponse = rehydrateText(responseText, sessionSalts);
      }

      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: finalResponse,
        sanitizedContent: responseText,
        showSanitized: false
      }]);
      setCumulativeSavings(prev => prev + currentPromptSavings);
      setLifetimeQueries(prev => prev + 1);
      if (securityReport.matches.length > 0) {
        setTotalRedactions(prev => prev + securityReport.matches.length);
      }
    });
  };

  const clearChat = () => {
    setChatHistory([]);
    setSessionSalts({});
  };

  const handleKeyChange = (providerName, val) => {
    setKeys(prev => ({ ...prev, [providerName]: val }));
  };

  const resetStats = () => {
    setCumulativeSavings(0);
    setLifetimeQueries(0);
    setTotalRedactions(0);
    localStorage.removeItem('token_min_cumulative_savings');
    localStorage.removeItem('token_min_lifetime_queries');
    localStorage.removeItem('token_min_total_redactions');
  };

  const getComparisonMatrix = () => {
    const list = [];
    Object.keys(MODELS).forEach(p => {
      MODELS[p].forEach(m => {
        if (m.id === 'mock-model') return;
        const saved = Math.max(0, inTokens - outTokens);
        const estSavedCost = (saved / 1000000) * m.inputCostPerMillion;
        const estPayloadCost = (outTokens / 1000000) * m.inputCostPerMillion;
        list.push({
          provider: p,
          ...m,
          savedCount: saved,
          estSavedCost,
          estPayloadCost
        });
      });
    });
    return list;
  };

  return (
    <div className="window-container">
      {/* macOS Titlebar Chrome */}
      <div className="titlebar">
        <div className="window-controls">
          <div className="window-dot red"></div>
          <div className="window-dot yellow"></div>
          <div className="window-dot green"></div>
          <div className="app-menu-items">
            <span>File</span>
            <span>Edit</span>
            <span>Policy</span>
            <span>Window</span>
            <span>Help</span>
          </div>
        </div>
        <div className="titlebar-center">PromptShield Dashboard - Local Security Gateway</div>
        <div className="titlebar-right">
          <span className="badge-mode" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
            SHANNON ENTROPY ACTIVE
          </span>
        </div>
      </div>

      {/* Main app layout */}
      <div className="app-layout">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-menu">
            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={22} color="var(--accent-green)" />
              <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.5px' }}>PromptShield</span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'optimizer' ? 'active' : ''}`}
              onClick={() => setActiveScreen('optimizer')}
            >
              <LayoutDashboard size={18} />
              <span>Prompt Optimizer</span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'security' ? 'active' : ''}`}
              onClick={() => setActiveScreen('security')}
              style={{ borderLeft: '3px solid var(--accent-green)' }}
            >
              <ShieldCheck size={18} color="var(--accent-green)" />
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Security Guard</span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveScreen('matrix')}
            >
              <FileSpreadsheet size={18} />
              <span>Comparison Matrix</span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'keys' ? 'active' : ''}`}
              onClick={() => setActiveScreen('keys')}
            >
              <KeyRound size={18} />
              <span>API Integration Hub</span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveScreen('logs')}
            >
              <Fingerprint size={18} />
              <span>Audit Trail (Logs)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Zero Retention Architecture</span>
            PromptShield runs 100% locally. Passwords and credentials never leave your RAM.
          </div>
        </aside>

        {/* Workspace views */}
        <main className="workspace-content">
          
          {/* Header Stats Dashboard */}
          <section className="dashboard-grid">
            <div className="dashboard-card cyan">
              <span className="card-lbl">Token Deflation</span>
              <span className="card-num cyan">{savedPercent}%</span>
            </div>
            <div className="dashboard-card purple">
              <span className="card-lbl">Batch Deflated</span>
              <span className="card-num purple">{savedTokens.toLocaleString()}</span>
            </div>
            <div className="dashboard-card green">
              <span className="card-lbl">Lifetime Saved (₹)</span>
              <span className="card-num green">₹{cumulativeSavings.toFixed(4)}</span>
            </div>
            <div className="dashboard-card">
              <span className="card-lbl">Leaks Blocked</span>
              <span className="card-num" style={{ color: 'var(--accent-green)', textShadow: '0 0 10px var(--glow-green)' }}>{totalRedactions}</span>
              <button 
                onClick={resetStats}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <RefreshCw size={10} /> Reset
              </button>
            </div>
          </section>

          {/* Render Active Nav Screen */}
          {activeScreen === 'optimizer' && (
            <>
              {/* Configuration bar */}
              <section className="config-strip">
                <div className="flex-row">
                  <Layers size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Node:</span>
                  <select 
                    className="select-box"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="mock">Sandbox Simulation</option>
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="groq">Groq (Llama)</option>
                  </select>
                </div>

                {/* Real-time Security Scan Indicator */}
                {securityEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: securityReport.matches.length > 0 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(57, 255, 20, 0.05)', border: '1px solid', borderColor: securityReport.matches.length > 0 ? '#ff5252' : 'var(--accent-green)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                    {securityReport.matches.length > 0 ? (
                      <>
                        <ShieldAlert size={14} color="#ff5252" />
                        <span style={{ color: '#ff5252', fontWeight: 600 }}>
                          {securityReport.matches.length} Secrets Sanitized ({redactionStrategy.toUpperCase()})
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} color="var(--accent-green)" />
                        <span style={{ color: 'var(--accent-green)' }}>PromptShield Guard: Clean</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex-row">
                  <select 
                    className="select-box"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  >
                    {(MODELS[provider] || []).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (₹{m.inputCostPerMillion}/M)
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* AI Recommendation Banner */}
              {inputText.trim().length > 5 && recommendation.recommendations.length > 0 && (
                <div className="glass-box" style={{ flexShrink: 0, padding: '0.85rem 1.25rem', marginBottom: '1rem', border: '1px solid rgba(0, 242, 254, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0, 242, 254, 0.04)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={16} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Recommended Model: <span style={{ color: 'var(--accent-cyan)', textShadow: '0 0 8px rgba(0, 242, 254, 0.3)' }}>{recommendation.recommendations[0].name}</span> ({recommendation.recommendations[0].matchPercent}% Match)
                      </span>
                    </div>
                    {(provider !== recommendation.recommendations[0].provider || modelId !== recommendation.recommendations[0].id) && (
                      <button 
                        className="btn btn-cyan"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => {
                          const best = recommendation.recommendations[0];
                          setProvider(best.provider);
                          setModelId(best.id);
                        }}
                      >
                        Apply Recommended Node
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                    {recommendation.rationale}
                  </p>
                  
                  {/* Detailed scores breakdown drawer */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--panel-border)', overflowX: 'auto' }}>
                    {recommendation.recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={rec.id} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', minWidth: '120px' }}>
                        <span style={{ fontWeight: 600, color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                          {idx === 0 ? '🏆 ' : ''}{rec.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Match: {rec.matchPercent}% | Code: {rec.scores.coding}/10 | Cost: {rec.scores.cost}/10
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editors */}
              <section className="editors-split">
                <div className="glass-box">
                  <div className="glass-box-header">
                    <h2 className="glass-box-title"><ArrowRightLeft size={16} /> Input Prompt Payload</h2>
                    <span className="badge-info">{inTokens.toLocaleString()} tokens</span>
                  </div>

                  <textarea 
                    className="glass-textarea custom-scrollbar"
                    placeholder="Paste credentials, prompt templates, or code here. PromptShield filters secrets in real time..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />

                  {/* Level Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Optimization Level</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        background: options.strength === 'ultra' ? 'rgba(0, 242, 254, 0.12)' : options.strength === 'standard' ? 'rgba(255,255,255,0.05)' : 'rgba(179, 136, 255, 0.12)',
                        color: options.strength === 'ultra' ? 'var(--accent-cyan)' : options.strength === 'standard' ? 'var(--text-secondary)' : 'var(--accent-purple)',
                        fontWeight: 600
                      }}>
                        {options.strength === 'ultra' ? 'ULTRA 99%' : options.strength === 'standard' ? 'STANDARD' : 'ADVANCED'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className={`btn ${options.strength === 'standard' ? 'btn-cyan' : ''}`}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                        onClick={() => setOptions(prev => ({ ...prev, strength: 'standard' }))}
                      >
                        Standard
                      </button>
                      <button 
                        className={`btn ${options.strength === 'advanced' ? 'btn-cyan' : ''}`}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                        onClick={() => setOptions(prev => ({ ...prev, strength: 'advanced' }))}
                      >
                        Advanced
                      </button>
                      <button 
                        className={`btn ${options.strength === 'ultra' ? 'btn-cyan' : ''}`}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                        onClick={() => setOptions(prev => ({ ...prev, strength: 'ultra' }))}
                      >
                        Ultra 99%
                      </button>
                    </div>
                  </div>

                  <div className="toggles-matrix">
                    <div 
                      className={`opt-toggle ${options.removeFillers ? 'active' : ''}`}
                      onClick={() => setOptions(prev => ({ ...prev, removeFillers: !prev.removeFillers }))}
                      style={{ opacity: options.strength === 'standard' ? 0.4 : 1 }}
                    >
                      <div className="opt-toggle-title">Strip Fillers</div>
                      <input type="checkbox" checked={options.removeFillers} readOnly style={{ display: 'none' }} />
                    </div>

                    <div 
                      className={`opt-toggle ${options.condenseWhitespace ? 'active' : ''}`}
                      onClick={() => setOptions(prev => ({ ...prev, condenseWhitespace: !prev.condenseWhitespace }))}
                    >
                      <div className="opt-toggle-title">Condense Space</div>
                      <input type="checkbox" checked={options.condenseWhitespace} readOnly style={{ display: 'none' }} />
                    </div>

                    <div 
                      className={`opt-toggle ${options.shrinkPunctuation ? 'active' : ''}`}
                      onClick={() => setOptions(prev => ({ ...prev, shrinkPunctuation: !prev.shrinkPunctuation }))}
                    >
                      <div className="opt-toggle-title">Trim Punctuation</div>
                      <input type="checkbox" checked={options.shrinkPunctuation} readOnly style={{ display: 'none' }} />
                    </div>

                    <div 
                      className={`opt-toggle ${options.minifyJson ? 'active' : ''}`}
                      onClick={() => setOptions(prev => ({ ...prev, minifyJson: !prev.minifyJson }))}
                    >
                      <div className="opt-toggle-title">Minify JSON Structure</div>
                      <input type="checkbox" checked={options.minifyJson} readOnly style={{ display: 'none' }} />
                    </div>

                    <div 
                      className={`opt-toggle ${options.minifyCode ? 'active' : ''}`}
                      onClick={() => setOptions(prev => ({ ...prev, minifyCode: !prev.minifyCode }))}
                    >
                      <div className="opt-toggle-title">Minify Code Comments</div>
                      <input type="checkbox" checked={options.minifyCode} readOnly style={{ display: 'none' }} />
                    </div>
                  </div>
                </div>

                <div className="glass-box">
                  <div className="tabs-nav">
                    <button 
                      className={`tab-element ${activeTab === 'output' ? 'active' : ''}`}
                      onClick={() => setActiveTab('output')}
                    >
                      <Sparkles size={14} /> Sanitized & Optimized
                    </button>
                    <button 
                      className={`tab-element ${activeTab === 'chat' ? 'active' : ''}`}
                      onClick={() => setActiveTab('chat')}
                    >
                      <Terminal size={14} /> Local RAM Sandbox
                    </button>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    {activeTab === 'output' ? (
                      <>
                        <textarea 
                          className="glass-textarea custom-scrollbar"
                          readOnly
                          style={{ borderColor: isBlocked ? '#ff5252' : 'var(--panel-border)', color: isBlocked ? '#ff5252' : 'var(--text-primary)' }}
                          placeholder="Sanitized prompt will output here..."
                          value={optimizedText}
                        />

                        <div className="glass-box-header">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Est. Input Cost: ₹{(outTokens / 1000000 * currentModel.inputCostPerMillion).toFixed(4)}
                          </span>

                          <div className="flex-row">
                            <button className="btn" onClick={handleCopy} disabled={!optimizedText || isBlocked}>
                              {copied ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Copy size={14} />}
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <button 
                              className="btn btn-cyan"
                              onClick={() => {
                                setActiveTab('chat');
                                handleSendPrompt();
                              }}
                              disabled={!optimizedText || isBlocked}
                            >
                              <Play size={14} /> Run in Sandbox
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="chat-window custom-scrollbar">
                          {chatHistory.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              <Bot size={36} style={{ marginBottom: '0.5rem', color: 'var(--accent-green)' }} />
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Secure Sandbox Empty</div>
                              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Prompt rehydrates keys locally in memory.</p>
                            </div>
                          ) : (
                            chatHistory.map((m, idx) => {
                              const isUser = m.role === 'user';
                              return (
                                <div key={idx} className={`chat-bubble ${m.role}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isUser ? 'var(--accent-cyan)' : 'var(--accent-purple)' }}>
                                      {isUser ? 'User Prompt' : currentModel.name}
                                    </span>
                                    
                                    {/* Tab toggle control inside bubble */}
                                    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '1px' }}>
                                      {isUser ? (
                                        <>
                                          <button 
                                            style={{ background: !m.showRaw ? 'rgba(0, 242, 254, 0.1)' : 'none', border: 'none', color: !m.showRaw ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
                                            onClick={() => {
                                              setChatHistory(prev => prev.map((item, idx2) => idx2 === idx ? { ...item, showRaw: false } : item));
                                            }}
                                          >
                                            🔒 Sanitized (LLM View)
                                          </button>
                                          <button 
                                            style={{ background: m.showRaw ? 'rgba(255, 255, 255, 0.05)' : 'none', border: 'none', color: m.showRaw ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
                                            onClick={() => {
                                              setChatHistory(prev => prev.map((item, idx2) => idx2 === idx ? { ...item, showRaw: true } : item));
                                            }}
                                          >
                                            📄 Original
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button 
                                            style={{ background: !m.showSanitized ? 'rgba(57, 255, 20, 0.1)' : 'none', border: 'none', color: !m.showSanitized ? 'var(--accent-green)' : 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
                                            onClick={() => {
                                              setChatHistory(prev => prev.map((item, idx2) => idx2 === idx ? { ...item, showSanitized: false } : item));
                                            }}
                                          >
                                            🔓 Rehydrated (RAM Local)
                                          </button>
                                          <button 
                                            style={{ background: m.showSanitized ? 'rgba(255, 255, 255, 0.05)' : 'none', border: 'none', color: m.showSanitized ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
                                            onClick={() => {
                                              setChatHistory(prev => prev.map((item, idx2) => idx2 === idx ? { ...item, showSanitized: true } : item));
                                            }}
                                          >
                                            🔒 Raw Received
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    fontSize: '0.8rem', 
                                    lineHeight: 1.4,
                                    color: (isUser && !m.showRaw) || (!isUser && m.showSanitized) ? 'var(--text-secondary)' : 'var(--text-primary)'
                                  }}>
                                    {isUser 
                                      ? (m.showRaw ? m.rawContent : m.content) 
                                      : (m.showSanitized ? m.sanitizedContent : m.content)
                                    }
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="flex-row">
                          {chatHistory.length > 0 && (
                            <button className="btn" onClick={clearChat} style={{ color: '#ff5252' }}>
                              <Trash2 size={14} /> Clear
                            </button>
                          )}
                          <button 
                            className="btn btn-cyan"
                            style={{ flex: 1 }}
                            onClick={handleSendPrompt}
                            disabled={!optimizedText || isBlocked}
                          >
                            <Send size={14} /> Transmit Sanitized Prompt
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Loading matrix overlay screen */}
                  <div className={`terminal-overlay ${showTerminal ? 'active' : ''}`}>
                    <canvas ref={canvasRef} className="matrix-canvas" />
                    <div className="terminal-header">
                      <span>PROMPTSHIELD AGENT SHIELD</span>
                      <span>STATUS: REHYDRATING IN RAM</span>
                    </div>
                    <div className="terminal-body custom-scrollbar">
                      {terminalLogs.map((log, index) => (
                        <div key={index}>{log}</div>
                      ))}
                      <div style={{ display: 'inline-block', width: '8px', height: '14px', background: 'var(--accent-green)' }} />
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeScreen === 'security' && (
            <div className="glass-box" style={{ gap: '1.5rem' }}>
              <div className="glass-box-header">
                <h2 className="glass-box-title" style={{ color: 'var(--accent-green)' }}>
                  <ShieldCheck size={22} color="var(--accent-green)" /> PromptShield Security Guard
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <button 
                    className={`btn ${securityEnabled ? 'btn-cyan' : ''}`}
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: securityEnabled ? '' : 'rgba(255, 82, 82, 0.1)', borderColor: securityEnabled ? '' : '#ff5252', color: securityEnabled ? '' : '#ff5252' }}
                    onClick={() => setSecurityEnabled(!securityEnabled)}
                  >
                    {securityEnabled ? 'SHIELD ACTIVE' : 'SHIELD DISABLED'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                  <Fingerprint size={18} color="var(--accent-green)" />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>100% Auditable Code</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Zero retention local architecture</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                  <HeartHandshake size={18} color="var(--accent-cyan)" />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Dehydrate & Rehydrate</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Rehydrates values in local RAM</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                {/* Left Config Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div className="glass-box" style={{ padding: '1.25rem', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Advanced Security Features</span>
                    </div>

                    <div 
                      className={`opt-toggle ${advancedEntropy ? 'active' : ''}`}
                      onClick={() => setAdvancedEntropy(!advancedEntropy)}
                      style={{ padding: '0.6rem 0.85rem' }}
                    >
                      <div>
                        <div className="opt-toggle-title">Shannon Entropy Scanning</div>
                        <div className="opt-toggle-desc">Scans zero-day high-entropy secret structures</div>
                      </div>
                    </div>

                    <div 
                      className={`opt-toggle ${dehydrateRehydrate ? 'active' : ''}`}
                      onClick={() => setDehydrateRehydrate(!dehydrateRehydrate)}
                      style={{ padding: '0.6rem 0.85rem' }}
                    >
                      <div>
                        <div className="opt-toggle-title">Dehydrate & Rehydrate in RAM</div>
                        <div className="opt-toggle-desc">Restore redacted items locally upon LLM reply</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-box" style={{ padding: '1.25rem', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Secrets & PII Scope ({Object.keys(DETECTORS).length} rules)</span>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
                      {Object.keys(DETECTORS).map(key => (
                        <div 
                          key={key}
                          className={`opt-toggle ${activeDetectors[key] ? 'active' : ''}`}
                          onClick={() => setActiveDetectors(prev => ({ ...prev, [key]: !prev[key] }))}
                          style={{ padding: '0.5rem 0.75rem' }}
                        >
                          <div className="opt-toggle-title" style={{ fontSize: '0.75rem' }}>{DETECTORS[key].name}</div>
                          <input type="checkbox" checked={activeDetectors[key]} readOnly style={{ display: 'none' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Config Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="glass-box" style={{ padding: '1.25rem', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sanitize Strategy</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div 
                        className={`opt-toggle ${redactionStrategy === 'mask' ? 'active' : ''}`}
                        onClick={() => setRedactionStrategy('mask')}
                        style={{ padding: '0.75rem' }}
                      >
                        <div>
                          <div className="opt-toggle-title">Placeholder Masking</div>
                          <div className="opt-toggle-desc">Replace secrets with salted placeholder tags</div>
                        </div>
                      </div>

                      <div 
                        className={`opt-toggle ${redactionStrategy === 'purge' ? 'active' : ''}`}
                        onClick={() => setRedactionStrategy('purge')}
                        style={{ padding: '0.75rem' }}
                      >
                        <div>
                          <div className="opt-toggle-title">Complete Purge</div>
                          <div className="opt-toggle-desc">Erase secrets completely from the prompt</div>
                        </div>
                      </div>

                      <div 
                        className={`opt-toggle ${redactionStrategy === 'block' ? 'active' : ''}`}
                        onClick={() => setRedactionStrategy('block')}
                        style={{ padding: '0.75rem', borderColor: redactionStrategy === 'block' ? '#ff5252' : '' }}
                      >
                        <div>
                          <div className="opt-toggle-title" style={{ color: redactionStrategy === 'block' ? '#ff5252' : '' }}>Strict Block</div>
                          <div className="opt-toggle-desc">Prevent transit if any secrets or PII are found</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-box" style={{ padding: '1.25rem', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Custom Redaction Keywords</span>
                    <input 
                      type="text" 
                      className="text-input" 
                      placeholder="e.g. MyPassword, SecretProject"
                      value={customKeywordsInput}
                      onChange={(e) => setCustomKeywordsInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Scan Violation panel */}
              <div className="glass-box" style={{ padding: '1.25rem', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Real-time Audit Log</span>
                <div className="chat-window custom-scrollbar" style={{ height: '120px', background: 'rgba(0,0,0,0.1)' }}>
                  {securityReport.matches.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <ShieldCheck size={20} color="var(--accent-green)" style={{ marginBottom: '0.25rem' }} />
                      <div>No credentials or high-entropy secrets found in active buffer.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {securityReport.matches.map((match, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.15)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <AlertTriangle size={12} color="#ff5252" />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{match.type}</span>
                            <span style={{ marginLeft: '0.25rem', color: 'var(--text-secondary)' }}>
                              ({match.value.length > 8 ? `${match.value.slice(0, 4)}...${match.value.slice(-4)}` : 'Sensitive'})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'matrix' && (
            <div className="glass-box" style={{ gap: '1.5rem' }}>
              <div className="glass-box-header">
                <h2 className="glass-box-title"><FileSpreadsheet size={20} color="var(--accent-cyan)" /> Model Cost & Token Comparison Matrix</h2>
                <span className="badge-info">Auto Calculated Based on Active Prompt</span>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Compare cost and size metrics across different LLMs for your prompt of <strong>{inTokens} tokens</strong> and optimized payload of <strong>{outTokens} tokens</strong>.
              </p>

              <div className="comparison-grid">
                {getComparisonMatrix().map((m, idx) => (
                  <div className="comparison-card" key={idx}>
                    <div className="comparison-header">
                      <span className="comparison-name">{m.name}</span>
                      <span className="comparison-provider">{m.provider}</span>
                    </div>
                    
                    <div className="comparison-stat-line">
                      <span style={{ color: 'var(--text-secondary)' }}>Original Input Cost</span>
                      <span>₹{(inTokens / 1000000 * m.inputCostPerMillion).toFixed(4)}</span>
                    </div>

                    <div className="comparison-stat-line">
                      <span style={{ color: 'var(--text-secondary)' }}>Optimized Input Cost</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>₹{(outTokens / 1000000 * m.inputCostPerMillion).toFixed(4)}</span>
                    </div>

                    <div className="comparison-stat-line">
                      <span style={{ color: 'var(--text-secondary)' }}>Tokens Saved</span>
                      <span>{m.savedCount.toLocaleString()}</span>
                    </div>

                    <div className="comparison-stat-line total">
                      <span style={{ color: 'var(--accent-green)' }}>Cost Saved / Call</span>
                      <span style={{ color: 'var(--accent-green)' }}>₹{m.estSavedCost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeScreen === 'keys' && (
            <div className="glass-box" style={{ gap: '1.5rem' }}>
              <div className="glass-box-header">
                <h2 className="glass-box-title"><KeyRound size={20} color="var(--accent-purple)" /> API Integration Hub</h2>
                <span className="badge-info">Secure Browser Store</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Provide key mappings below to interface directly with raw server nodes. PromptShield passes requests directly from your browser client using these keys without routing through external databases.
              </p>

              <div className="integration-list">
                <div className="integration-item">
                  <div className="integration-info">
                    <span className="integration-name">OpenAI API Key</span>
                    <span className="integration-desc">Integrate with ChatGPT models (e.g. GPT-4o, GPT-4o Mini)</span>
                  </div>
                  <div className="integration-field-group">
                    <input 
                      type="password" 
                      className="text-input" 
                      placeholder="sk-proj-..."
                      value={keys.openai}
                      onChange={(e) => handleKeyChange('openai', e.target.value)}
                    />
                  </div>
                </div>

                <div className="integration-item">
                  <div className="integration-info">
                    <span className="integration-name">Anthropic API Key</span>
                    <span className="integration-desc">Integrate with Claude models (e.g. Claude 3.5 Sonnet, Haiku)</span>
                  </div>
                  <div className="integration-field-group">
                    <input 
                      type="password" 
                      className="text-input" 
                      placeholder="sk-ant-..."
                      value={keys.anthropic}
                      onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                    />
                  </div>
                </div>

                <div className="integration-item">
                  <div className="integration-info">
                    <span className="integration-name">Google Gemini API Key</span>
                    <span className="integration-desc">Integrate with Gemini endpoints (e.g. Gemini 1.5 Flash, 2.0 Flash)</span>
                  </div>
                  <div className="integration-field-group">
                    <input 
                      type="password" 
                      className="text-input" 
                      placeholder="AIzaSy..."
                      value={keys.gemini}
                      onChange={(e) => handleKeyChange('gemini', e.target.value)}
                    />
                  </div>
                </div>

                <div className="integration-item">
                  <div className="integration-info">
                    <span className="integration-name">DeepSeek API Key</span>
                    <span className="integration-desc">Integrate with DeepSeek Chat & Reasoner nodes</span>
                  </div>
                  <div className="integration-field-group">
                    <input 
                      type="password" 
                      className="text-input" 
                      placeholder="ds-..."
                      value={keys.deepseek}
                      onChange={(e) => handleKeyChange('deepseek', e.target.value)}
                    />
                  </div>
                </div>

                <div className="integration-item">
                  <div className="integration-info">
                    <span className="integration-name">Groq API Key</span>
                    <span className="integration-desc">Run ultra-fast Llama integrations through Groq endpoints</span>
                  </div>
                  <div className="integration-field-group">
                    <input 
                      type="password" 
                      className="text-input" 
                      placeholder="gsk_..."
                      value={keys.groq}
                      onChange={(e) => handleKeyChange('groq', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'logs' && (
            <div className="glass-box" style={{ gap: '1.5rem' }}>
              <div className="glass-box-header">
                <h2 className="glass-box-title"><Fingerprint size={20} color="var(--accent-purple)" /> Audit Trail & Local Logs</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {auditLogs.length > 0 && (
                    <button className="btn" onClick={() => setAuditLogs([])} style={{ color: '#ff5252', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                      <Trash2 size={12} /> Clear Logs
                    </button>
                  )}
                  <span className="badge-info">{auditLogs.length} Records</span>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                PromptShield tracks optimizations strictly locally in your browser storage. This data is never sent to any remote server and serves as your private local compliance logs.
              </p>

              {auditLogs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', border: '1px dashed var(--panel-border)', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                  <Fingerprint size={32} style={{ marginBottom: '0.5rem', opacity: 0.5, color: 'var(--accent-purple)' }} />
                  <span style={{ fontSize: '0.85rem' }}>No logged actions found. Optimize a prompt to start recording logs.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }} className="custom-scrollbar">
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.timestamp}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px', 
                            background: log.action === 'Copied' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(57, 255, 20, 0.12)',
                            color: log.action === 'Copied' ? 'var(--accent-cyan)' : 'var(--accent-green)',
                            fontWeight: 600
                          }}>
                            {log.action.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{log.modelName}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', margin: '0.25rem 0', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', marginBottom: '2px' }}>Original Size</span>
                          <span style={{ fontWeight: 500 }}>{log.originalTokens} tokens</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', marginBottom: '2px' }}>Optimized Size</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>{log.optimizedTokens} tokens</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', marginBottom: '2px' }}>Deflation</span>
                          <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                            {log.originalTokens > 0 ? Math.round(((log.originalTokens - log.optimizedTokens) / log.originalTokens) * 100) : 0}%
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', marginBottom: '2px' }}>INR Saved</span>
                          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{log.savingsINR.toFixed(4)}</span>
                        </div>
                      </div>

                      {log.secretsBlocked > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--accent-green)', background: 'rgba(57,255,20,0.03)', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(57,255,20,0.1)' }}>
                          <ShieldCheck size={12} />
                          <span>Neutralized {log.secretsBlocked} PII / secret leak{log.secretsBlocked > 1 ? 's' : ''} during scan</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', flex: 1 }}
                          onClick={() => {
                            setInputText(log.originalText);
                            setActiveScreen('optimizer');
                          }}
                        >
                          Restore in Editor
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#ff5252' }}
                          onClick={() => setAuditLogs(prev => prev.filter(item => item.id !== log.id))}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



        </main>
      </div>
    </div>
  );
}

export default App;
