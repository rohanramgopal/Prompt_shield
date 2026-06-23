// PromptShield Content Script for intercepting pasted credentials
const DETECTORS = {
  creditCard: {
    name: 'Credit Card (Luhn)',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g
  },
  email: {
    name: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
  },
  awsKey: {
    name: 'AWS Access Key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g
  },
  stripeKey: {
    name: 'Stripe key',
    regex: /\bsk_live_[a-zA-Z0-9]{24,}\b/g
  },
  githubToken: {
    name: 'GitHub Token',
    regex: /\bghp_[a-zA-Z0-9]{36}\b/g
  },
  slackToken: {
    name: 'Slack Token',
    regex: /\bxox[baprs]-[a-zA-Z0-9\-]+\b/g
  },
  jwt: {
    name: 'JSON Web Token (JWT)',
    regex: /\beyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\b/g
  },
  openaiKey: {
    name: 'OpenAI Secret Key',
    regex: /\bsk-[a-zA-Z0-9]{32,48}\b/g
  },
  anthropicKey: {
    name: 'Anthropic Key',
    regex: /\bsk-ant-[a-zA-Z0-9-_]{32,64}\b/g
  }
};

const calculateEntropy = (str) => {
  if (!str) return 0;
  const len = str.length;
  const frequencies = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  Object.keys(frequencies).forEach(char => {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  });
  return entropy;
};

// Listen globally for paste events
document.addEventListener('paste', (e) => {
  const activeEl = document.activeElement;
  if (!activeEl) return;

  // Read clipboard text
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return;
  const rawText = clipboardData.getData('text');
  if (!rawText) return;

  const matches = [];
  const lines = rawText.split('\n');

  // 1. Scan standard regexes
  Object.keys(DETECTORS).forEach(key => {
    const detector = DETECTORS[key];
    const regexClone = new RegExp(detector.regex);
    let match;
    while ((match = regexClone.exec(rawText)) !== null) {
      const matchVal = match[0];
      
      // Calculate line number
      let lineNo = 1;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].includes(matchVal)) {
          lineNo = l + 1;
          break;
        }
      }

      matches.push({
        name: detector.name,
        value: matchVal,
        line: lineNo,
        chars: matchVal.length
      });
    }
  });

  // 2. Scan Shannon Entropy for zero-day keys
  const words = rawText.split(/[\s,.;:!?()"{}\[\]<>]/);
  words.forEach(word => {
    const cleanWord = word.trim();
    if (cleanWord.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(cleanWord)) {
      const entropy = calculateEntropy(cleanWord);
      if (entropy >= 4.3) {
        const alreadyMatched = matches.some(m => m.value.includes(cleanWord) || cleanWord.includes(m.value));
        if (!alreadyMatched) {
          let lineNo = 1;
          for (let l = 0; l < lines.length; l++) {
            if (lines[l].includes(cleanWord)) {
              lineNo = l + 1;
              break;
            }
          }
          matches.push({
            name: 'Connection string with credentials',
            value: cleanWord,
            line: lineNo,
            chars: cleanWord.length
          });
        }
      }
    }
  });

  // If secrets detected, block paste and show custom popup!
  if (matches.length > 0) {
    e.preventDefault();
    showInterceptModal(rawText, matches, activeEl);
  }
}, true);

// Render beautiful modal matching Screenshot 2
function showInterceptModal(rawText, matches, targetEl) {
  // Remove existing modals if any
  const existing = document.getElementById('si-intercept-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'si-intercept-modal';
  overlay.className = 'si-modal-overlay';

  const modalBox = document.createElement('div');
  modalBox.className = 'si-modal-box';

  // Modal Header
  const header = document.createElement('div');
  header.className = 'si-modal-header';

  const logo = document.createElement('div');
  logo.className = 'si-modal-logo';
  logo.innerText = '// PromptShield.ai';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'si-modal-close';
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.onclick = () => overlay.remove();

  header.appendChild(logo);
  header.appendChild(closeBtn);
  modalBox.appendChild(header);

  // List of matching secrets
  const listContainer = document.createElement('div');
  listContainer.className = 'si-modal-list';

  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'si-modal-item';

    const left = document.createElement('span');
    left.className = 'si-modal-item-name';
    left.innerText = m.name;

    const right = document.createElement('span');
    right.className = 'si-modal-item-meta';
    right.innerText = `line ${m.line} • ${m.chars} chars`;

    item.appendChild(left);
    item.appendChild(right);
    listContainer.appendChild(item);
  });
  modalBox.appendChild(listContainer);

  // Buttons Footer
  const footer = document.createElement('div');
  footer.className = 'si-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'si-btn si-btn-cancel';
  cancelBtn.innerText = 'CANCEL';
  cancelBtn.onclick = () => overlay.remove();

  const anywayBtn = document.createElement('button');
  anywayBtn.className = 'si-btn si-btn-anyway';
  anywayBtn.innerText = 'PASTE ANYWAY';
  anywayBtn.onclick = () => {
    insertText(targetEl, rawText);
    overlay.remove();
  };

  const anonBtn = document.createElement('button');
  anonBtn.className = 'si-btn si-btn-anon';
  anonBtn.innerText = 'PASTE ANONYMOUSLY';
  anonBtn.onclick = () => {
    // Redact secret values using short hashes
    let anonymizedText = rawText;
    const saltMap = {};
    matches.forEach(m => {
      const shortHash = Math.random().toString(16).slice(2, 10);
      const replacement = `[SI:${shortHash}]`;
      // Escape value for safe regex replace
      const escapedVal = m.value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      anonymizedText = anonymizedText.replace(new RegExp(escapedVal, 'g'), replacement);
    });

    insertText(targetEl, anonymizedText);

    // Save statistics locally in extension memory
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ interceptedCount: 0 }, (data) => {
        chrome.storage.local.set({ interceptedCount: data.interceptedCount + matches.length });
      });
    }

    overlay.remove();
  };

  footer.appendChild(cancelBtn);
  footer.appendChild(anywayBtn);
  footer.appendChild(anonBtn);
  modalBox.appendChild(footer);

  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);
}

// Utility to insert text into input elements or contenteditable
function insertText(targetEl, text) {
  targetEl.focus();
  
  // Handle textareas and input fields
  if (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT') {
    const start = targetEl.selectionStart;
    const end = targetEl.selectionEnd;
    const currentVal = targetEl.value;
    targetEl.value = currentVal.slice(0, start) + text + currentVal.slice(end);
    targetEl.selectionStart = targetEl.selectionEnd = start + text.length;
    
    // Dispatch input events so framework bindings (React, Vue) trigger updates
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (targetEl.isContentEditable) {
    // Contenteditable fields (like Claude, Gemini editor boxes)
    const selection = window.getSelection();
    if (selection.rangeCount) {
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(text));
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    // Fallback paste
    document.execCommand('insertText', false, text);
  }
}
