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
  await Promise.allSettled(
    Object.keys(MOCK_DELAYS).map(async (id) => {
      try {
        const prediction = await callOllama(id, scenario);
        onUpdate(id, { prediction, status: 'success' });
      } catch (err) {
        console.debug(`[aiService] Ollama offline for "${id}", using mock.`);
        await delay(MOCK_DELAYS[id]);
        onUpdate(id, { prediction: generateMockPrediction(id, scenario), status: 'success' });
      }
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
