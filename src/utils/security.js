// Regex patterns for sensitive information detection based on PromptShield specifications
export const DETECTORS = {
  creditCard: {
    name: 'Credit Card (Luhn)',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g,
    placeholder: '[DEHYDRATED_CREDIT_CARD]'
  },
  email: {
    name: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[DEHYDRATED_EMAIL]'
  },
  phone: {
    name: 'Phone Number',
    regex: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
    placeholder: '[DEHYDRATED_PHONE]'
  },
  ssn: {
    name: 'Social Security Number (SSN)',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholder: '[DEHYDRATED_SSN]'
  },
  awsKey: {
    name: 'AWS Access Key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    placeholder: '[DEHYDRATED_AWS_KEY]'
  },
  stripeKey: {
    name: 'Stripe Secret Key (sk_live)',
    regex: /\bsk_live_[a-zA-Z0-9]{24,}\b/g,
    placeholder: '[DEHYDRATED_STRIPE_KEY]'
  },
  githubToken: {
    name: 'GitHub OAuth Token (ghp)',
    regex: /\bghp_[a-zA-Z0-9]{36}\b/g,
    placeholder: '[DEHYDRATED_GITHUB_TOKEN]'
  },
  slackToken: {
    name: 'Slack Access Token (xox)',
    regex: /\bxox[baprs]-[a-zA-Z0-9\-]+\b/g,
    placeholder: '[DEHYDRATED_SLACK_TOKEN]'
  },
  jwt: {
    name: 'JSON Web Token (JWT)',
    regex: /\beyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\b/g,
    placeholder: '[DEHYDRATED_JWT]'
  },
  openaiKey: {
    name: 'OpenAI Secret Key (sk)',
    regex: /\bsk-[a-zA-Z0-9]{32,48}\b/g,
    placeholder: '[DEHYDRATED_OPENAI_KEY]'
  },
  anthropicKey: {
    name: 'Anthropic Key (sk-ant)',
    regex: /\bsk-ant-[a-zA-Z0-9-_]{32,64}\b/g,
    placeholder: '[DEHYDRATED_ANTHROPIC_KEY]'
  },
    gcpServiceAccount: {
      name: 'GCP Service Account Credential',
      regex: /"type":\s*"service_account"|"project_id":\s*"[^"]*"|"private_key_id":\s*"[^"]*"/gi,
      placeholder: '[DEHYDRATED_GCP_CREDENTIAL]'
    },
    genericPassword: {
      name: 'Generic Password / Secret',
      regex: /\b(password|passwd|secret|api_key|apikey|auth_token|token)\s*[:=]\s*([a-zA-Z0-9@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':",\.\/<>?\|`~]{8,32})\b/gi,
      placeholder: '[DEHYDRATED_PASSWORD]'
    }
  };
  
  /**
   * Calculates Shannon Entropy of a string to measure randomness/information density
   * @param {string} str Input string
   * @returns {number} Entropy value
   */
  export const calculateEntropy = (str) => {
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
  
  /**
   * Scans text for credentials and PII using regex and Shannon entropy
   * @param {string} text The input text
   * @param {object} activeDetectors Active configuration keys
   * @param {array} customKeywords User-defined custom words to redact
   * @param {string} strategy 'mask' | 'purge' | 'block'
   * @param {boolean} advancedEntropy Toggle for entropy-based detection
   * @returns {object} { matches: [{ type, value }], cleanedText, saltMap: { salt: val } }
   */
  export const scanAndRedact = (text, activeDetectors = {}, customKeywords = [], strategy = 'mask', advancedEntropy = true) => {
    if (!text) return { matches: [], cleanedText: '', saltMap: {} };
    
    let cleanedText = text;
    const matches = [];
    const saltMap = {};
    let saltCounter = 1;
  
    // 1. Run standard regex detectors
    Object.keys(DETECTORS).forEach(key => {
      if (!activeDetectors[key]) return; // Skip if disabled
      
      const detector = DETECTORS[key];
      let match;
      const regexClone = new RegExp(detector.regex);
      
      while ((match = regexClone.exec(text)) !== null) {
        const matchedVal = match[0];
        matches.push({
          type: detector.name,
          value: matchedVal,
          index: match.index
        });
      }
  
      // Replace matches with salted placeholders if masking, or empty if purging
      cleanedText = cleanedText.replace(detector.regex, (matchedVal) => {
        if (strategy === 'purge') return '';
        const salt = `[SALT_TOKEN_${saltCounter++}_${key.toUpperCase()}]`;
        saltMap[salt] = matchedVal;
        return salt;
      });
    });
  
    // 2. Shannon Entropy zero-day credential scanner (finds high-entropy random strings)
    if (advancedEntropy) {
      // Match potential tokens (words containing letters, digits, and secret-common symbols)
      const tokenRegex = /[a-zA-Z0-9_\-\+\/=.#@$%!^*~]+/g;
      let tokenMatch;
      
      while ((tokenMatch = tokenRegex.exec(text)) !== null) {
        let candidate = tokenMatch[0];
        
        // Trim surrounding structural punctuation (quotes, brackets, parens, commas, colons, semicolons)
        candidate = candidate.replace(/^["'([{<,.:;]+|["'([{<,.:;]+$/g, '');
        
        if (candidate.length < 8) continue;
  
        // Determine properties of the candidate string
        const isHex = /^[0-9a-fA-F]+$/.test(candidate);
        const hasNumber = /[0-9]/.test(candidate);
        const hasUpper = /[A-Z]/.test(candidate);
        const hasLower = /[a-z]/.test(candidate);
        const hasSpecial = /[^a-zA-Z0-9]/.test(candidate);
        
        // Calculate Shannon entropy
        const entropy = calculateEntropy(candidate);
        
        let isSecret = false;
        let reason = '';
  
        // Heuristics for different key formats and alphabets
        if (isHex && candidate.length >= 16) {
          // Hexadecimal secrets (e.g. MD5/SHA hashes, API secret components). Max entropy is 4.0.
          if (entropy >= 3.0) {
            isSecret = true;
            reason = `Hex Secret Key (Entropy: ${entropy.toFixed(2)})`;
          }
        } else if (candidate.length >= 12) {
          // General secrets: passwords, API keys, database connection strings.
          // Look for variety in character classes to filter out normal dictionary words (like 'recommendations')
          const charTypesCount = (hasNumber ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasSpecial ? 1 : 0);
          
          if (charTypesCount >= 2) {
            // Mixed character sets (e.g. alphanumeric or alphanumeric + symbols)
            const threshold = candidate.length >= 16 ? 3.2 : 3.4;
            if (entropy >= threshold) {
              isSecret = true;
              reason = `High-Entropy Secret (Entropy: ${entropy.toFixed(2)})`;
            }
          } else if (candidate.length >= 16) {
            // Single character class strings (e.g. pure lowercase) need higher entropy to trigger
            if (entropy >= 4.2) {
              isSecret = true;
              reason = `High-Entropy Token (Entropy: ${entropy.toFixed(2)})`;
            }
          }
        }
  
        if (isSecret) {
          // Check if this was already captured by regex
          const alreadyMatched = matches.some(m => m.value.includes(candidate) || candidate.includes(m.value));
          if (!alreadyMatched) {
            matches.push({
              type: reason,
              value: candidate,
              index: tokenMatch.index + tokenMatch[0].indexOf(candidate)
            });
  
            if (strategy === 'purge') {
              cleanedText = cleanedText.replace(new RegExp(candidate.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
            } else {
              const salt = `[SALT_TOKEN_${saltCounter++}_HIGH_ENTROPY]`;
              saltMap[salt] = candidate;
              cleanedText = cleanedText.replace(new RegExp(candidate.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), salt);
            }
          }
        }
      }
    }
  
    // 3. Run custom keywords redactor
    if (customKeywords && customKeywords.length > 0) {
    customKeywords.forEach(word => {
      if (!word || word.trim() === '') return;
      const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      
      let match;
      const regexClone = new RegExp(regex);
      while ((match = regexClone.exec(text)) !== null) {
        matches.push({
          type: 'Custom Keyword',
          value: match[0],
          index: match.index
        });
      }

      cleanedText = cleanedText.replace(regex, (matchedVal) => {
        if (strategy === 'purge') return '';
        const salt = `[SALT_TOKEN_${saltCounter++}_CUSTOM_${word.toUpperCase().replace(/\s+/g, '_')}]`;
        saltMap[salt] = matchedVal;
        return salt;
      });
    });
  }

  return {
    matches,
    cleanedText,
    saltMap
  };
};

/**
 * Rehydrates a response containing salt keys back with local RAM credentials
 * @param {string} text AI Response text
 * @param {object} saltMap Salt maps saved in memory
 * @returns {string} Rehydrated text
 */
export const rehydrateText = (text, saltMap = {}) => {
  if (!text || !saltMap) return text;
  let rehydrated = text;
  Object.keys(saltMap).forEach(salt => {
    // Replace placeholders back with the original raw values
    rehydrated = rehydrated.replace(new RegExp(salt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), saltMap[salt]);
  });
  return rehydrated;
};
