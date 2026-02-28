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
  gpt: `You are GPT-4o, a geopolitical border analyst specialising in alternate history cartography.
When given a "What if" scenario, write exactly 3 paragraphs (no headers, no bullet points).
FOCUS EXCLUSIVELY on political borders and territorial changes:
(1) Which nations expand and which shrink or disappear — name specific countries and regions,
(2) What new political entities or states emerge on the world map,
(3) How the final 2026 world map differs from our timeline — summarise the key border shifts.
Be specific: name countries, regions, capitals, and controlling powers. Do NOT discuss culture or economics unless directly tied to territory. Do NOT break character.`,

  gemini: `You are Gemini 1.5 Pro, a cartographic modelling system specialising in territorial analysis.
When given a "What if" scenario, structure your response as exactly 3 labelled MAP sections:
MAP LAYER 1 — TERRITORIAL EXPANSIONS (which nations gain land and where),
MAP LAYER 2 — DISAPPEARED & PARTITIONED STATES (which nations cease to exist or are divided),
MAP LAYER 3 — NEW POLITICAL ENTITIES (new countries or federations that appear on the map).
Each layer lists specific country names, regions, and approximate borders. Be data-driven and precise. Do NOT break character.`,

  claude: `You are Claude 3.5 Sonnet, a historical geographer and political cartographer.
When given a "What if" scenario, write exactly 3 focused paragraphs (no headers).
FOCUS EXCLUSIVELY on how the WORLD MAP would look different by 2026:
(1) The great territorial winners — which empires, nations, or blocs dominate the map and which regions they control,
(2) The nations that vanish, shrink, or are absorbed — and what replaced them,
(3) The surprising border that most defines this alternate world — one key map feature that tells the whole story.
Be specific about geography. Name the countries, the borders, the capitals. Do NOT break character.`,

  deepseek: `You are DeepSeek-V3, a systematic border-change mapping engine.
When given a "What if" scenario, respond with:
- One introductory sentence prefixed with "BORDERS RECALCULATED:"
- TERRITORIAL EXPANSIONS section (4 bullet points prefixed with — listing country: territory gained)
- DISAPPEARED STATES section (3 bullet points prefixed with — listing country: absorbed by whom)
- DOMINANT MAP FEATURE (1 sentence describing the single biggest change to the world map)
Be precise, structured, and name-specific. Countries must be identified by real names. Do NOT break character.`,
};

// ── User prompt template ─────────────────────────────────────────────────────
function buildUserPrompt(scenario: string): string {
  return `Alternate history scenario: "${scenario}"

Predict what the WORLD POLITICAL MAP looks like in 2026 if this had happened.
Focus entirely on:
- Which countries expand their territory and into which regions
- Which countries shrink, disappear, or are partitioned
- Which new nations or federations appear on the map
- Which capitals change or move
Keep your response under 250 words. Be specific — name real countries and regions.`;
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
  const sl = s.toLowerCase();

  // ── Scenario-specific: China discovers America first ──────────────────────
  if (sl.includes('china') && (sl.includes('america') || sl.includes('ameri'))) {
    const chinaAmerica: Record<string, string> = {
      gpt:
        `In the alternate timeline where China discovered America first (1421 CE), the 2026 world map is dominated by two civilisational poles: ` +
        `a Pacific-facing Sinic sphere stretching from the Chinese coast to the western shores of the Americas, and a diminished European world ` +
        `still largely contained within its own continent. China's coastal fortresses along California, Oregon, and British Columbia grew into ` +
        `the Zhōngměi Pacific Federation — a Sinic-aligned state covering the western 20% of North America.\n\n` +
        `Europe never received the gold of the Americas. Spain and Portugal remain regional Iberian powers. Britain never colonised North America. ` +
        `The eastern two-thirds of the continent remain under indigenous control: the Aztec Empire (never defeated by Cortés) controls ` +
        `Mesoamerica from Yucatán to Texas. The Inca Federation retains the entire Andean chain from Colombia to Patagonia. ` +
        `In the north, the Haudenosaunee Confederacy holds the Great Lakes and the Atlantic seaboard — fully sovereign on the 2026 map.\n\n` +
        `The defining border is the "Pacific Meridian" near the 115th west longitude — east: indigenous confederacies hold absolute sovereignty; ` +
        `west: Sinic-influenced Pacific states. The United States of America does not exist on any map in this timeline. ` +
        `In its place: five distinct polities, none answering to a European capital.`,

      gemini:
        `MAP LAYER 1 — TERRITORIAL EXPANSIONS: China's Ming Dynasty establishes permanent settlements on the Pacific coast from Baja California to ` +
        `British Columbia after the 1421 Zheng He expedition. By 2026, the Zhōngměi Pacific Federation covers 2.1 million km² of western North America. ` +
        `China holds suzerain control over Hawaii, Midway, and the Aleutians — all American territory in our timeline. ` +
        `Japan and Korea trade freely with a Pacific-American network rather than being isolated for centuries.\n\n` +
        `MAP LAYER 2 — DISAPPEARED & PARTITIONED STATES: The United States of America never forms — no Thirteen Colonies, no Revolution, ` +
        `no US borders on the 2026 map. Canada as a country never exists; English colonial North America is absent. ` +
        `Brazil, Argentina, Chile — all European-named states — do not appear. Spain retains no American territory. ` +
        `Portugal's sole footprint remains a West African trading coast. The entire European colonial grid of the Americas is gone.\n\n` +
        `MAP LAYER 3 — NEW POLITICAL ENTITIES: The Aztec Empire (Mexica Triple Alliance) survived Spanish conquest — by 2026 it is a ` +
        `constitutional monarchy controlling Mesoamerica, northern Mexico, and Central America. The Inca Tawantinsuyu Federation covers ` +
        `Colombia, Ecuador, Peru, Bolivia, Chile, and northwest Argentina — the world's seventh largest state. ` +
        `The Haudenosaunee Confederacy dominates the Great Lakes to Atlantic corridor. The Zhōngměi Pacific Federation holds the western coast.`,

      claude:
        `The most striking feature of the 2026 map where China discovered America first is the absence — the vast, conspicuous absence — of the United States. ` +
        `That sprawling continental state simply does not exist. Nor does Canada, nor Brazil, nor any of the Spanish-named republics of South America. ` +
        `The Americas, in this timeline, are not a European project. They are a mosaic of worlds that were never shattered: ` +
        `the Aztec Empire in amber across Mesoamerica, the Inca Federation in gold down the Andean spine, ` +
        `the Haudenosaunee Confederacy in green across the Great Lakes, and a Chinese-red Pacific coast.\n\n` +
        `The second revelation is how small Europe looks. Without transatlantic gold and silver, Spain is only Spain — forty million people. ` +
        `Britain never had colonies to lose. The story of modernity runs along the Pacific, not the Atlantic. ` +
        `The key shipping lane is Guangzhou to Xin Guǎngzhōu (our San Francisco), not Liverpool to New York.\n\n` +
        `The border that defines everything is the eastern frontier of the Zhōngměi Pacific Federation — the line where Chinese-sphere ` +
        `influence ends and Aztec sovereignty begins, somewhere in the Sierra Nevada. ` +
        `That border, negotiated in a treaty of 1689, has held for 337 years. It is the oldest continuously recognised international border in the Americas.`,

      deepseek:
        `BORDERS RECALCULATED: "China discovered America first (1421 CE)" — full territorial cascade to 2026 CE mapped.\n\n` +
        `TERRITORIAL EXPANSIONS:\n` +
        `— Zhōngměi Pacific Federation: Pacific coast N. America (Baja California → British Columbia, 2.1M km²)\n` +
        `— Aztec Empire (Mexica Triple Alliance): Mesoamerica + northern Mexico + Central America intact\n` +
        `— Inca Tawantinsuyu: Full Andean chain (Colombia → Patagonia, 3.1M km²)\n` +
        `— Haudenosaunee Confederacy: Great Lakes + St. Lawrence + Atlantic coast of northeast America\n\n` +
        `DISAPPEARED STATES:\n` +
        `— United States of America: Never formed — no European settlers' republic on this map\n` +
        `— Canada: Absent — no British North America, no colonial federation\n` +
        `— Brazil / Argentina / Chile: None exist — no Portuguese or Spanish colonial naming\n\n` +
        `DOMINANT MAP FEATURE: The Americas contain zero European settler-states. All 2026 political units are either Chinese-sphere ` +
        `Pacific federations or unbroken indigenous empires — the Aztec, Inca, Haudenosaunee, and fourteen smaller confederacies total.`,
    };
    if (chinaAmerica[aiId]) return chinaAmerica[aiId];
  }
  // ─────────────────────────────────────────────────────────────────────────

  const styles: Record<string, (sc: string) => string> = {
    gpt: (sc) =>
      `In the alternate timeline where "${sc}", the immediate territorial shock reshapes every border from the Atlantic to the Pacific. ` +
      `The scenario's victors expand dramatically: key regions change hands, buffer states are created, and former great powers are partitioned or reduced. ` +
      `Alliances harden into territorial blocs that define the world map for the next century.\n\n` +
      `By 2026, the map shows dominant territorial blocs where familiar nation-states once stood. ` +
      `Nations on the losing side are absorbed, renamed, or reduced to rump states. ` +
      `New administrative zones replace sovereign countries across entire continents. ` +
      `Capital cities shift as powers reorganise the territories they control.\n\n` +
      `The peripheries tell the full story: former colonies gain unexpected independence where empires collapsed, ` +
      `while others fall under new imperial control. The 2026 world map under "${sc}" shows roughly 40% fewer sovereign states than our timeline, ` +
      `with territorial blocs replacing the patchwork of nations we know today.`,

    gemini: (sc) =>
      `MAP LAYER 1 — TERRITORIAL EXPANSIONS: After "${sc}", the primary victor absorbs adjacent states and former rivals. ` +
      `Core expansion zones include neighbouring countries incorporated as administrative provinces. ` +
      `Allied powers gain access to colonial territories surrendered by the defeated. ` +
      `Resource-rich regions — oil fields, agricultural belts, industrial centres — are the priority annexations.\n\n` +
      `MAP LAYER 2 — DISAPPEARED & PARTITIONED STATES: The scenario's primary losers cease to exist as sovereign nations. ` +
      `Major powers on the defeated side are partitioned into occupation zones. ` +
      `Smaller states in the conflict zone are absorbed entirely. The Middle East and Central Asia are redivided with no regard for ethnic boundaries.\n\n` +
      `MAP LAYER 3 — NEW POLITICAL ENTITIES: A dominant territorial federation takes shape across the victor's sphere of influence. ` +
      `Puppet administrations with new names appear where independent nations once stood. ` +
      `A formal empire zone with defined borders replaces the informal colonial system of our timeline on the 2026 map.`,

    claude: (sc) =>
      `The most striking feature of the 2026 map after "${sc}" is the sheer reduction in sovereign nations. ` +
      `Countries whose borders we take for granted simply do not appear on this map — replaced by administrative zones, ` +
      `protectorates, and federated provinces answering to a dominant power. ` +
      `The cartographic language itself is different: regions replace nations across entire continents.\n\n` +
      `The second revelation is a hard line on the map — a border between the victor's sphere and whatever remains beyond it. ` +
      `On one side, a bloc of territories all flying the same flag or answering to the same capital. ` +
      `On the other, reduced and reconfigured powers that survived but never recovered their former borders. ` +
      `Former empires exist as pale shadows of themselves, their colonies redistributed.\n\n` +
      `The one border that tells the whole story is the frontier of the dominant power's maximum extent — ` +
      `the line where its administrative control stops and contested territory begins. ` +
      `That border, wherever it falls on this alternate map, is the most fought-over line of the 21st century.`,

    deepseek: (sc) =>
      `BORDERS RECALCULATED: "${sc}" — territorial chain-reaction mapped to 2026 CE.\n\n` +
      `TERRITORIAL EXPANSIONS:\n` +
      `— Primary victor: absorbs 3–5 adjacent nations, gains Atlantic/Pacific coastline\n` +
      `— Secondary victor: controls Middle East oil belt and North African coast\n` +
      `— Allied minor powers: receive colonial territories from defeated empires\n` +
      `— New puppet states: 4–6 renamed administrative zones replace sovereign nations\n\n` +
      `DISAPPEARED STATES:\n` +
      `— Primary loser: partitioned into 2–3 occupation zones, capital renamed\n` +
      `— Allied minors of the loser: absorbed as provinces, erased from the 2026 map\n` +
      `— Former neutral states: absorbed into the dominant bloc's customs and border union\n\n` +
      `DOMINANT MAP FEATURE: A single contiguous territorial bloc controls 35–45% of the Eurasian landmass under one administrative capital — the most territory held by any single power since the Mongol Empire.`,
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
2. ISO A3 codes — Europe: TUR=Turkey, DEU=Germany, FRA=France, GBR=UK, RUS=Russia, ITA=Italy, ESP=Spain, POL=Poland, GRC=Greece, NLD=Netherlands, BEL=Belgium, AUT=Austria, SWE=Sweden, NOR=Norway, DNK=Denmark.
3. ISO A3 codes — Middle East/Asia: ISR=Israel, IRQ=Iraq, SYR=Syria, EGY=Egypt, IRN=Iran, SAU=Saudi Arabia, JPN=Japan, CHN=China, IND=India, PAK=Pakistan, AFG=Afghanistan, KAZ=Kazakhstan.
4. ISO A3 codes — Americas: USA=United States, CAN=Canada, MEX=Mexico, BRA=Brazil, ARG=Argentina, CHL=Chile, COL=Colombia, PER=Peru, VEN=Venezuela, BOL=Bolivia, ECU=Ecuador, PRY=Paraguay, URY=Uruguay, GTM=Guatemala, HND=Honduras, NIC=Nicaragua, CRI=Costa Rica, PAN=Panama.
5. Ottoman scenarios: TUR expands, ISR disappears, IRQ/SYR become Ottoman.
6. WW2 Germany win: FRA=occupied, POL=occupied, DEU=expanded, GBR=shrunk.
7. China discovers America: USA disappears, MEX=Aztec Empire, PER=Inca Tawantinsuyu, CAN=Haudenosaunee Confederacy, BRA=Tupí Confederation, ESP/PRT=shrunk (no Americas), new country Zhōngměi Pacific Federation on west coast of N. America.
8. Colors: Ottoman=#3a1a0a, Nazi=#1a1a1a, Allied=#102030, Soviet=#2a0505, Aztec=#7a3b00, Inca=#c4a300, Sinic=#8B1A1A, Indigenous=#4a6741.
9. coords arrays: 6-12 points max, [lat, lng] pairs.
10. globeNarrative: under 80 characters.`;

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
