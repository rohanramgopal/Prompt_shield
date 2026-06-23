// Abbreviation mapping dictionary for common business, tech, and linguistic words
const ABBREVIATIONS = {
  technology: 'tech',
  technologies: 'techs',
  information: 'info',
  development: 'dev',
  developer: 'dev',
  developers: 'devs',
  application: 'app',
  applications: 'apps',
  database: 'db',
  databases: 'dbs',
  optimize: 'opt',
  optimization: 'opt',
  optimizations: 'opts',
  optimizer: 'opt',
  management: 'mgt',
  manager: 'mgr',
  message: 'msg',
  messages: 'msgs',
  response: 'resp',
  responses: 'resps',
  request: 'req',
  requests: 'reqs',
  configuration: 'config',
  configurations: 'configs',
  computer: 'comp',
  network: 'net',
  networks: 'nets',
  connection: 'conn',
  connections: 'conns',
  marketing: 'mktg',
  internship: 'intern',
  internships: 'interns',
  creative: 'crtv',
  professional: 'prof',
  company: 'co',
  companies: 'cos',
  business: 'biz',
  businesses: 'biz',
  parameter: 'param',
  parameters: 'params',
  variable: 'var',
  variables: 'vars',
  function: 'func',
  functions: 'funcs',
  environment: 'env',
  environments: 'envs',
  analytics: 'stats',
  system: 'sys',
  systems: 'sys',
  software: 'sw',
  hardware: 'hw',
  user: 'usr',
  users: 'usrs',
  server: 'svr',
  servers: 'svrs',
  client: 'clt',
  clients: 'clts',
  document: 'doc',
  documents: 'docs',
  documentation: 'docs',
  project: 'proj',
  projects: 'projs',
  program: 'prog',
  programs: 'progs',
  programming: 'prog',
  code: 'src',
  source: 'src',
  picture: 'pic',
  pictures: 'pics',
  image: 'img',
  images: 'imgs',
  graphic: 'gfx',
  graphics: 'gfx',
  poster: 'pstr',
  posters: 'pstrs',
  advertisement: 'ad',
  advertisements: 'ads',
  account: 'acct',
  accounts: 'accts',
  security: 'sec',
  science: 'sci',
  scientific: 'sci',
  analysis: 'analys',
  analyze: 'anz',
  statistics: 'stats',
  algorithm: 'algo',
  algorithms: 'algos',
  intelligence: 'intel',
  processing: 'proc',
  instagram: 'insta',
  linkedin: 'lnkdn'
};

const stripVowels = (word) => {
  if (word.length <= 3) return word;
  const firstLetter = word[0];
  const rest = word.slice(1);
  // Strip vowels (a, e, i, o, u, y) but leave the first letter intact
  const strippedRest = rest.replace(/[aeiouy]/gi, '');
  return firstLetter + strippedRest;
};

export const optimizeText = (text, options) => {
  if (!text) return '';
  let optimized = text;

  // Level selection (options.strength: 'standard' | 'advanced' | 'ultra')
  const strength = options.strength || 'advanced';

  if (strength === 'standard') {
    // Only compress spacing and handle JSON minification
    if (options.condenseWhitespace) {
      optimized = optimized.replace(/\s+/g, ' ').trim();
    }
    if (options.minifyJson) {
      try {
        const parsed = JSON.parse(optimized);
        optimized = JSON.stringify(parsed);
      } catch (e) {
        optimized = optimized.replace(/\n/g, '').replace(/\s*([{}\[\]:,])\s*/g, '$1');
      }
    }
    return optimized;
  }

  // Advanced or Ultra mode
  // 1. Remove common multi-word conversational greetings/templates
  const complexFillers = [
    /i\s+want\s+you\s+to\s+do\s+a/gi,
    /i\s+want\s+you\s+to\s+create\s+a/gi,
    /i\s+want\s+you\s+to\s+write\s+a/gi,
    /i\s+want\s+you\s+to\s+generate\s+a/gi,
    /i\s+want\s+you\s+to/gi,
    /i\s+would\s+like\s+you\s+to/gi,
    /i\s+need\s+you\s+to/gi,
    /would\s+you\s+mind/gi,
    /could\s+you\s+please/gi,
    /could\s+you/gi,
    /can\s+you/gi,
    /help\s+me\s+to/gi,
    /help\s+me/gi,
    /thank\s+you/gi,
    /thanks\s+a\s+lot/gi,
    /best\s+regards/gi,
    /kind\s+regards/gi,
    /write\s+a/gi,
    /create\s+a/gi,
    /generate\s+a/gi,
    /make\s+a/gi,
    /produce\s+a/gi,
    /do\s+a/gi,
    /give\s+me\s+a/gi,
    /provide\s+a/gi,
    /explain\s+to\s+me/gi,
    /tell\s+me/gi,
    /show\s+me/gi
  ];

  complexFillers.forEach(pattern => {
    optimized = optimized.replace(pattern, ' ');
  });

  // 2. Remove single-word conversational and stop-word fillers
  const singleFillers = [
    'hi', 'hello', 'hey', 'yo', 'sup', 'greetings', 'dear',
    'thanks', 'thank', 'please', 'kindly', 'sincerely', 'regards',
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
    'to', 'of', 'and', 'in', 'that', 'have', 'has', 'had', 'for', 'not', 'on',
    'with', 'as', 'you', 'do', 'at', 'this', 'but', 'by', 'from', 'or', 'will',
    'would', 'could', 'should', 'can', 'want', 'like', 'need', 'about', 'just',
    'my', 'your', 'me', 'us', 'we', 'i', 'they', 'them', 'he', 'she', 'it', 'its'
  ];

  const regex = new RegExp(`\\b(${singleFillers.join('|')})\\b`, 'gi');
  optimized = optimized.replace(regex, ' ');

  // 3. Ultra / 99% Aggressive Vowel Strip & Vocabulary Abbreviation Mode
  if (strength === 'ultra') {
    // Split into tokens (words and punctuation)
    const tokens = optimized.split(/(\s+)/);
    
    const processedTokens = tokens.map(token => {
      // Skip whitespace
      if (/^\s+$/.test(token)) return token;
      
      // Clean word boundaries and extract pure alphabet letters
      const cleanWord = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (!cleanWord) return token; // Keep punctuation
      
      // Check abbreviation mapping
      if (ABBREVIATIONS[cleanWord]) {
        // Keep original casing style if possible
        const abbr = ABBREVIATIONS[cleanWord];
        return token.replace(new RegExp(cleanWord, 'i'), abbr);
      }
      
      // Check if it's a regular vocabulary word and strip vowels
      const stripped = stripVowels(cleanWord);
      return token.replace(new RegExp(cleanWord, 'i'), stripped);
    });

    optimized = processedTokens.join('');
  }

  // Formatting cleanups
  if (options.condenseWhitespace) {
    optimized = optimized.replace(/\s+/g, ' ').trim();
  }

  if (options.shrinkPunctuation) {
    optimized = optimized.replace(/\.{2,}/g, '.');
    optimized = optimized.replace(/,{2,}/g, ',');
    optimized = optimized.replace(/\s+([.,!?:;])/g, '$1');
    optimized = optimized.replace(/[.,!?:;]+$/g, '');
  }

  if (options.minifyJson) {
    try {
      const parsed = JSON.parse(optimized);
      optimized = JSON.stringify(parsed);
    } catch (e) {
      optimized = optimized.replace(/\n/g, '').replace(/\s*([{}\[\]:,])\s*/g, '$1');
    }
  }

  return optimized.trim();
};
