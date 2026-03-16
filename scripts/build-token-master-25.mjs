import { readFileSync, writeFileSync } from 'node:fs';

const KEEP_GECKO_IDS = new Set([
  'dogecoin', 'shiba-inu', 'memecore', 'pepe', 'pump-fun', 'bonk', 'pudgy-penguins',
  'floki', 'spx6900', 'pippin', 'cheems-token', 'toshi', 'based-brett', 'baby-doge-coin',
  'turbo', 'mog-coin', 'dogelon-mars', 'fartcoin', 'dogwifcoin', 'melania-meme',
  'ape-and-pepe', 'peanut-the-squirrel', 'popcat', 'official-trump', 'pepe-unchained'
]);

const master50 = JSON.parse(readFileSync('data/archive/token-master-50.json', 'utf8'));
const tokens25 = master50.tokens
  .filter(t => KEEP_GECKO_IDS.has(t.coingeckoId))
  .map((t, i) => ({ ...t, setOrder: i + 1, editorial: { ...t.editorial, cardNumber: `G01-${String(i+1).padStart(3,'0')}` }}));

if (tokens25.length !== 25) throw new Error(`Expected 25 tokens, got ${tokens25.length}`);

const payload = {
  ...master50,
  generatedAt: new Date().toISOString(),
  summary: { ...master50.summary, total: 25 },
  tokens: tokens25,
};

writeFileSync('data/token-master-25.json', JSON.stringify(payload, null, 2));
console.log('Written data/token-master-25.json with', tokens25.length, 'tokens');
console.log(tokens25.map(t => t.displayName).join(', '));
