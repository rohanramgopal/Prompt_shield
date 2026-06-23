export const MODELS = {
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputCostPerMillion: 12.45, outputCostPerMillion: 49.80 },
    { id: 'gpt-4o', name: 'GPT-4o', inputCostPerMillion: 207.50, outputCostPerMillion: 830.00 },
    { id: 'o3-mini', name: 'o3-mini', inputCostPerMillion: 91.30, outputCostPerMillion: 365.20 },
    { id: 'o1-mini', name: 'o1-mini', inputCostPerMillion: 249.00, outputCostPerMillion: 996.00 }
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', inputCostPerMillion: 66.40, outputCostPerMillion: 332.00 },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', inputCostPerMillion: 249.00, outputCostPerMillion: 1245.00 },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', inputCostPerMillion: 1245.00, outputCostPerMillion: 6225.00 }
  ],
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', inputCostPerMillion: 6.225, outputCostPerMillion: 24.90 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', inputCostPerMillion: 103.75, outputCostPerMillion: 415.00 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', inputCostPerMillion: 6.225, outputCostPerMillion: 24.90 }
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek-V3', inputCostPerMillion: 11.62, outputCostPerMillion: 23.24 },
    { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner)', inputCostPerMillion: 45.65, outputCostPerMillion: 181.77 }
  ],
  groq: [
    { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B (Groq)', inputCostPerMillion: 48.97, outputCostPerMillion: 65.57 },
    { id: 'llama3-8b-8192', name: 'Llama 3 8B (Groq)', inputCostPerMillion: 4.15, outputCostPerMillion: 6.64 }
  ],
  mock: [
    { id: 'mock-model', name: 'Sandbox Simulator model', inputCostPerMillion: 8.30, outputCostPerMillion: 16.60 }
  ]
};

export const calculateSavings = (originalTokens, optimizedTokens, model) => {
  if (!originalTokens || !model) return 0;
  const saved = Math.max(0, originalTokens - optimizedTokens);
  return (saved / 1000000) * model.inputCostPerMillion;
};

export const generateMockResponse = (prompt, modelId) => {
  const responses = [
    `[Response from ${modelId}]: I've processed your optimized context prompt. The system tokens were condensed by stripping redundant verbs and punctuation elements. Output logic remains fully aligned.`,
    `[Response from ${modelId}]: Content ingested. Executed semantic parsing. The response stream behaves as expected. You are successfully calling the ${modelId} sandbox layer.`,
    `[Response from ${modelId}]: Prompt optimization saved input credits! Under direct production parameters, compact syntax reduces the payload overhead. Happy coding!`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

