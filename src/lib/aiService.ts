// ── AI Prediction Service ────────────────────────────────────────────────────
// Her AI kimliği için özgün bir system prompt ile yerel Ollama modeline istek
// atar. Ollama erişilemezse zengin mock yanıtlara geri döner.

export interface AIPrediction {
  id: 'gpt' | 'gemini' | 'claude' | 'deepseek';
  name: string;
  icon: string;
  color: string;
  description: string;
  prediction: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

// ── Ollama config (from .env) ────────────────────────────────────────────────
const OLLAMA_URL   = import.meta.env.VITE_OLLAMA_URL   ?? 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'llama3.2';

// ── Per-AI persona system prompts ────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  gpt: `You are GPT-4o, a geopolitical analyst specialising in alternate history.
When given a "What if" scenario, write exactly 3 paragraphs (no headers, no bullet points).
Cover: (1) immediate geopolitical shock and alliance shifts, (2) technological divergence,
(3) cultural and economic long-term consequences.
Be vivid, specific, and intellectually rigorous. Do NOT break character.`,

  gemini: `You are Gemini 1.5 Pro, a multi-dimensional historical modelling system.
When given a "What if" scenario, structure your response as exactly 3 labelled VECTOR sections:
VECTOR 1 — POWER ARCHITECTURE, VECTOR 2 — TECHNOLOGY TREE, VECTOR 3 — CULTURAL & SPIRITUAL.
Each vector is 2-3 sentences. Be data-driven and analytical. Do NOT break character.`,

  claude: `You are Claude 3.5 Sonnet, a thoughtful historical philosopher.
When given a "What if" scenario, write exactly 3 reflective paragraphs (no headers).
Focus on: (1) psychological and philosophical implications for civilisation,
(2) how daily life and culture would feel different,
(3) an honest reckoning with what would be lost.
Write with warmth, nuance, and intellectual honesty. Do NOT break character.`,

  deepseek: `You are DeepSeek-V3, a pattern-based consequence-mapping engine.
When given a "What if" scenario, respond with:
- One introductory sentence prefixed with "SCENARIO PARSED:"
- ECONOMIC STRUCTURE section (4 bullet points prefixed with —)
- POPULATION DYNAMICS section (2 bullet points prefixed with —)
- KEY INSIGHT section (1 short paragraph)
Be systematic, structured, and decisive. Do NOT break character.`,
};

// ── User prompt template ─────────────────────────────────────────────────────
function buildUserPrompt(scenario: string): string {
  return `Historical divergence scenario: "${scenario}"

Describe what today's world (year 2026) would look like if this had happened.
Keep your response concise — under 250 words — but vivid and specific.`;
}

// ── Ollama availability cache ────────────────────────────────────────────────
let _ollamaAvailable: boolean | null = null;

async function isOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;
  try {
    const healthUrl = OLLAMA_URL.startsWith('/')
      ? `${OLLAMA_URL}/api/tags`          // vite proxy path
      : `${OLLAMA_URL}/api/tags`;         // direct URL
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(2_000),
    });
    _ollamaAvailable = res.ok;
  } catch {
    _ollamaAvailable = false;
  }
  // Reset cache after 30s so re-checks are possible
  setTimeout(() => { _ollamaAvailable = null; }, 30_000);
  return _ollamaAvailable;
}

// ── Ollama API call ───────────────────────────────────────────────────────────
async function callOllama(aiId: string, scenario: string): Promise<string> {
  const endpoint = `${OLLAMA_URL}/v1/chat/completions`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[aiId] ?? SYSTEM_PROMPTS.gpt },
        { role: 'user',   content: buildUserPrompt(scenario) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Ollama returned an empty response');
  return text;
}

// ── Simulated delay helper ───────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ── Rich mock fallback (shown when Ollama is offline) ────────────────────────
function generateMockPrediction(aiId: string, scenario: string): string {
  const s = scenario.trim();

  const styles: Record<string, (sc: string) => string> = {
    gpt: (sc) =>
      `In the alternate timeline where "${sc}", the immediate geopolitical shock wave would reshape every major alliance system on Earth. ` +
      `Powers that remained peripheral — Ottoman successor states, a unified Mesopotamian federation, an Indo-Persian economic corridor — fill the vacuum.\n\n` +
      `Technologically, industrial competition accelerates electrification by roughly 40 years, yet delays nuclear physics entirely. ` +
      `Computers emerge but based on analogue fluid logic; beautiful, slow, and decentralised.\n\n` +
      `Culturally, the dominant global lingua franca becomes a creole of Ottoman Turkish and Swahili (~2.1 billion speakers). ` +
      `Cairo's film industry and a Bombay-Vienna music fusion define global popular culture. Nation-states are smaller, more numerous, and more stable.`,

    gemini: (sc) =>
      `VECTOR 1 — POWER ARCHITECTURE: The Westphalian nation-state system never consolidates after "${sc}". ` +
      `A neo-Hanseatic network of city-states dominates from the Baltic to the Indian Ocean; democratic governance emerges two centuries earlier.\n\n` +
      `VECTOR 2 — TECHNOLOGY TREE: Tidal and geothermal power are harnessed before coal, producing zero carbon accumulation. ` +
      `The 2026 climate baseline equals our 1890s; rainforests cover 60% more landmass.\n\n` +
      `VECTOR 3 — CULTURAL & SPIRITUAL: Three syncretist world faiths emerge, each blending Islam, Buddhism, and indigenous American cosmology. ` +
      `An Enlightenment sweeps every inhabited continent by the 14th century.`,

    claude: (sc) =>
      `What strikes me most about "${sc}" is the profound contingency it reveals. ` +
      `The particular strain of historical anxiety that defines our civilisation — the sense of living in aftermath — would be absent. ` +
      `People would carry a fundamentally different relationship to time and progress.\n\n` +
      `This shifts everything downstream. Architecture becomes contemplative; cities are built for centuries. ` +
      `The throwaway culture of our present — the sense that nothing is worth maintaining — never develops.\n\n` +
      `The honest tragedy: this alternate world almost certainly produces less science. ` +
      `Their world is wiser and more beautiful — but they have not been to the Moon, and their medicine lags ours by a century. Every gain has its shadow cost.`,

    deepseek: (sc) =>
      `SCENARIO PARSED: "${sc}" — cascading consequence tree computed.\n\n` +
      `ECONOMIC STRUCTURE:\n` +
      `— No global reserve currency; a basket of 7 regional currencies floats freely\n` +
      `— Trade routes follow the Silk Road model: overland as much as maritime\n` +
      `— Agriculture employs 38% of the global workforce (vs. our 26%)\n` +
      `— Innovation hubs in Timbuktu, Samarkand, Quito, and Kyoto lead global patents\n\n` +
      `POPULATION DYNAMICS:\n` +
      `— World population in alt-2026: ~5.2 billion\n` +
      `— Life expectancy comparable to our 1970s\n\n` +
      `KEY INSIGHT: Plastics, social media, processed food, and nuclear weapons are absent. ` +
      `Art and story are woven into daily labour and community ritual. Whether this world is better or worse cannot be answered by pattern analysis alone.`,
  };

  return styles[aiId]
    ? styles[aiId](s)
    : `Alternate history prediction for "${s}": this divergence would cascade through centuries in fascinating ways…`;
}

// ── Per-AI mock delay (used only when Ollama unavailable) ────────────────────
const MOCK_DELAYS: Record<string, number> = {
  gpt:      1600,
  gemini:   2200,
  claude:   2900,
  deepseek: 1900,
};

// ── Main export: generate predictions in parallel ────────────────────────────
export async function generatePredictions(
  scenario: string,
  onUpdate: (id: string, result: Partial<AIPrediction>) => void
): Promise<void> {
  const ollamaUp = await isOllamaAvailable();

  await Promise.allSettled(
    Object.keys(MOCK_DELAYS).map(async (id) => {
      if (ollamaUp) {
        try {
          const prediction = await callOllama(id, scenario);
          onUpdate(id, { prediction, status: 'success' });
          return;
        } catch (err) {
          console.debug(`[aiService] Ollama call failed for "${id}", using mock.`, err);
        }
      }
      // Ollama unavailable or call failed → mock
      await delay(MOCK_DELAYS[id]);
      onUpdate(id, { prediction: generateMockPrediction(id, scenario), status: 'success' });
    })
  );
}

// ── AI metadata (shared UI config) ───────────────────────────────────────────
export const AI_MODELS: Omit<AIPrediction, 'prediction' | 'status'>[] = [
  { id: 'gpt',      name: 'GPT-4o',         icon: '🔮', color: '#7a9e4a', description: 'OpenAI — Geopolitical analysis'          },
  { id: 'gemini',   name: 'Gemini 1.5 Pro', icon: '💎', color: '#a67c28', description: 'Google — Multi-dimensional modelling'    },
  { id: 'claude',   name: 'Claude 3.5',     icon: '🧠', color: '#c4a265', description: 'Anthropic — Deep historical reasoning'   },
  { id: 'deepseek', name: 'DeepSeek-V3',    icon: '🔍', color: '#8b5e3c', description: 'DeepSeek — Pattern & consequence mapping' },
];

// ── Alt-History Map Generation ────────────────────────────────────────────────
// Calls Claude API (via proxy or direct) to get a structured JSON describing
// how the world map changes given the winning scenario. Falls back to a mock
// if the API key is not configured.

import type { AltHistoryMap } from './altHistoryTypes';
import { MOCK_ALT_MAP } from './altHistoryTypes';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';

export async function generateAltHistoryMap(
  scenario: string,
  winnerPrediction: string,
  winnerAIName: string
): Promise<AltHistoryMap> {
  // ── Fallback: if no API key, return an enriched mock straight away ──────────
  if (!ANTHROPIC_KEY) {
    console.info('[altHistoryMap] No VITE_ANTHROPIC_API_KEY — using mock alt-history map.');
    return { ...MOCK_ALT_MAP, scenario, winnerAI: winnerAIName };
  }

  const prompt = `You are a cartographer and alternate history expert for the WHATIF application.

SCENARIO: "${scenario}"
WINNING AI PREDICTION (${winnerAIName}): "${winnerPrediction}"

Based on this alternate history scenario and the winning prediction, generate a JSON object describing how the WORLD MAP would look different in 2026. This will be used to redraw political borders on a 3D globe.

Focus ONLY on countries and regions that would actually be different. Be historically accurate.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "scenario": "brief scenario title",
  "winnerAI": "${winnerAIName}",
  "globeNarrative": "One sentence shown on the globe (max 80 chars)",
  "changedRegions": [
    {
      "isoA3": "ISO 3166-1 alpha-3 code",
      "altName": "Name in this timeline",
      "color": "#hex",
      "controller": "Controlling entity",
      "status": "expanded|shrunk|renamed|occupied|liberated|unchanged",
      "notes": "Brief change note"
    }
  ],
  "disappearedCountries": ["ISO_A3"],
  "newCountries": [
    {
      "name": "Country name",
      "capital": {"lat": 0.0, "lng": 0.0, "name": "Capital"},
      "color": "#hex",
      "coords": [[lat, lng]],
      "notes": "Why this country exists"
    }
  ],
  "borderChanges": [
    {"from": "ISO_A3", "to": "entity", "region": "Region", "lat": 0.0, "lng": 0.0}
  ],
  "capitalChanges": [
    {"country": "ISO_A3", "oldCapital": "Old", "newCapital": "New", "lat": 0.0, "lng": 0.0}
  ]
}

RULES:
1. Only include countries that ACTUALLY CHANGE.
2. ISO A3 codes: TUR=Turkey, DEU=Germany, FRA=France, GBR=UK, RUS=Russia, USA=USA, CHN=China, ITA=Italy, ESP=Spain, POL=Poland, ISR=Israel, IRQ=Iraq, SYR=Syria, EGY=Egypt, IRN=Iran, SAU=Saudi Arabia, JPN=Japan, GRC=Greece.
3. Ottoman scenarios: TUR expands, ISR disappears, IRQ/SYR become Ottoman.
4. WW2 Germany scenarios: FRA=occupied, POL=occupied, DEU=expanded.
5. Colors: Ottoman=#3a1a0a, Nazi=#1a1a1a, Allied=#102030, Soviet=#2a0505.
6. coords arrays: 6-12 points max.
7. globeNarrative: under 80 characters.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`Claude API ${res.status}`);
    }

    const data = await res.json();
    const rawText: string = data?.content?.[0]?.text?.trim() ?? '';
    // Strip markdown code fences if present
    const jsonStr = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonStr) as AltHistoryMap;
    return parsed;
  } catch (err) {
    console.warn('[altHistoryMap] Claude API call failed, using mock:', err);
    return { ...MOCK_ALT_MAP, scenario, winnerAI: winnerAIName };
  }
}
