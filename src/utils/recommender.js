// Recommender system to evaluate prompt intent and recommend the best LLM
export const analyzePromptIntent = (text) => {
  if (!text) {
    return {
      intent: 'general',
      recommendations: []
    };
  }

  const prompt = text.toLowerCase();

  // Intention categories & matching keywords
  const codingKeywords = [
    'code', 'function', 'bug', 'debug', 'python', 'javascript', 'html', 'css', 
    'react', 'sql', 'database', 'refactor', 'compile', 'error', 'exception', 
    'class', 'java', 'c++', 'rust', 'git', 'array', 'json', 'api'
  ];

  const creativeKeywords = [
    'write', 'story', 'poem', 'email', 'draft', 'blog', 'article', 'essay', 
    'copywrite', 'creative', 'novel', 'letter', 'marketing', 'ad copy', 'summarize'
  ];

  const mathKeywords = [
    'math', 'solve', 'equation', 'physics', 'calculus', 'algebra', 'logic', 
    'proof', 'theorem', 'academic', 'scientific', 'calculate', 'formula'
  ];

  const costKeywords = [
    'cheap', 'cost', 'budget', 'save', 'pricing', 'price', 'inexpensive', 'low-cost', 'rupee'
  ];

  const speedKeywords = [
    'fast', 'speed', 'quick', 'realtime', 'instant', 'latency', 'real-time', 'rapid'
  ];

  // Count matches
  const codingCount = codingKeywords.filter(k => prompt.includes(k)).length;
  const creativeCount = creativeKeywords.filter(k => prompt.includes(k)).length;
  const mathCount = mathKeywords.filter(k => prompt.includes(k)).length;
  const costCount = costKeywords.filter(k => prompt.includes(k)).length;
  const speedCount = speedKeywords.filter(k => prompt.includes(k)).length;

  // Determine weights based on intent counts
  let intent = 'general';
  let weights = { coding: 0.25, reasoning: 0.25, speed: 0.25, cost: 0.25 };

  const maxVal = Math.max(codingCount, creativeCount, mathCount, costCount, speedCount);

  if (maxVal > 0) {
    if (maxVal === codingCount) {
      intent = 'coding';
      weights = { coding: 0.60, reasoning: 0.20, speed: 0.10, cost: 0.10 };
    } else if (maxVal === mathCount) {
      intent = 'reasoning';
      weights = { coding: 0.20, reasoning: 0.60, speed: 0.10, cost: 0.10 };
    } else if (maxVal === creativeCount) {
      intent = 'creative';
      weights = { coding: 0.10, reasoning: 0.50, speed: 0.20, cost: 0.20 };
    } else if (maxVal === costCount) {
      intent = 'cost';
      weights = { coding: 0.10, reasoning: 0.10, speed: 0.10, cost: 0.70 };
    } else if (maxVal === speedCount) {
      intent = 'speed';
      weights = { coding: 0.10, reasoning: 0.10, speed: 0.70, cost: 0.10 };
    }
  }

  // Model Profiles
  // Scores out of 10
  const modelProfiles = [
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      id: 'claude-3-5-sonnet',
      scores: { coding: 9.8, reasoning: 9.6, speed: 7.2, cost: 4.5 },
      pricingLabel: '₹249.00 / M input',
      strengths: 'Gold standard for logical code structure and multi-file refactoring.'
    },
    {
      name: 'DeepSeek-V3',
      provider: 'deepseek',
      id: 'deepseek-v3',
      scores: { coding: 9.5, reasoning: 9.3, speed: 7.5, cost: 9.8 },
      pricingLabel: '₹11.62 / M input',
      strengths: 'Outstanding code syntax logic and reasoning at a fraction of the cost.'
    },
    {
      name: 'GPT-4o',
      provider: 'openai',
      id: 'gpt-4o',
      scores: { coding: 9.2, reasoning: 9.4, speed: 8.0, cost: 5.5 },
      pricingLabel: '₹207.50 / M input',
      strengths: 'Highly balanced general-purpose model with excellent API integration support.'
    },
    {
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      id: 'gemini-2-0-flash',
      scores: { coding: 8.5, reasoning: 8.2, speed: 9.0, cost: 9.2 },
      pricingLabel: '₹6.23 / M input',
      strengths: 'Extremely fast response speeds with vast 1M+ context window capacity.'
    },
    {
      name: 'Groq Llama 3 (70B)',
      provider: 'groq',
      id: 'llama3-70b-groq',
      scores: { coding: 8.0, reasoning: 8.0, speed: 9.9, cost: 8.5 },
      pricingLabel: '₹48.97 / M input',
      strengths: 'Ultra-low latency inference, perfect for real-time interactive tasks.'
    }
  ];

  // Calculate recommendation scores
  const results = modelProfiles.map(profile => {
    const finalScore = (
      profile.scores.coding * weights.coding +
      profile.scores.reasoning * weights.reasoning +
      profile.scores.speed * weights.speed +
      profile.scores.cost * weights.cost
    );

    // Normalize match percent to range [70, 99]%
    const matchPercent = Math.round(70 + ((finalScore - 5) / 5) * 29);

    return {
      ...profile,
      matchPercent: Math.min(99, Math.max(70, matchPercent)),
      finalScore
    };
  });

  // Sort by highest recommendation score
  results.sort((a, b) => b.finalScore - a.finalScore);

  // Generate customized rationales
  let rationale = '';
  const best = results[0];

  if (intent === 'coding') {
    rationale = `${best.name} is recommended because your prompt involves programming or technical debugging. ${best.strengths} It scored ${best.scores.coding}/10 for technical accuracy.`;
  } else if (intent === 'reasoning') {
    rationale = `${best.name} is recommended for mathematical proofs or logic. ${best.strengths} It scores ${best.scores.reasoning}/10 for computational reasoning.`;
  } else if (intent === 'creative') {
    rationale = `For creative generation and drafting, ${best.name} is highly recommended. ${best.strengths}`;
  } else if (intent === 'cost') {
    rationale = `${best.name} offers the best economics (₹${best.pricingLabel}). It gives you top-tier output while saving you over 90% in token pricing.`;
  } else if (intent === 'speed') {
    rationale = `Your prompt prioritizes response speed. ${best.name} running on dedicated hardware delivers sub-100ms response times.`;
  } else {
    rationale = `${best.name} is the best overall fit for your prompt, offering a great balance of logic (${best.scores.reasoning}/10) and speed (${best.scores.speed}/10).`;
  }

  return {
    intent,
    rationale,
    recommendations: results
  };
};
