// ── Alt-History Map Types ─────────────────────────────────────────────────────
// These types describe the JSON structure returned by Claude after a scenario
// winner is decided. The Globe uses this to overlay changed political borders.

export interface AltRegion {
  isoA3: string;             // e.g. "TUR", "DEU", "FRA"
  altName: string;           // name in this alternate timeline
  color: string;             // hex — which power controls this territory
  controller?: string;       // e.g. "Ottoman Federation"
  status: 'expanded' | 'shrunk' | 'renamed' | 'occupied' | 'liberated' | 'unchanged';
  notes: string;
}

export interface AltNewCountry {
  name: string;
  capital: { lat: number; lng: number; name: string };
  color: string;
  coords: [number, number][];   // [lat, lng] pairs
  notes: string;
}

export interface BorderChange {
  from: string;   // ISO_A3 losing territory
  to: string;     // ISO_A3 or name gaining territory
  region: string; // human-readable region name  (e.g. "Istanbul", "Alsace")
  lat: number;
  lng: number;
}

export interface CapitalChange {
  country: string;    // ISO_A3
  oldCapital: string;
  newCapital: string;
  lat: number;
  lng: number;
}

export interface AltHistoryMap {
  scenario: string;
  winnerAI: string;
  globeNarrative: string;              // ≤ 80 chars, shown as globe overlay
  changedRegions: AltRegion[];
  disappearedCountries: string[];      // ISO_A3 codes
  newCountries: AltNewCountry[];
  borderChanges: BorderChange[];
  capitalChanges: CapitalChange[];
}

// ── Quick-test mock (China discovers America first — used when API key absent) ──
export const MOCK_ALT_MAP: AltHistoryMap = {
  scenario: 'China discovered America first (1421 CE)',
  winnerAI: 'GPT-4o',
  globeNarrative: 'Sinic Pacific World — No USA, Aztec & Inca survive to 2026',
  changedRegions: [
    {
      isoA3: 'USA', altName: 'Eastern Indigenous Territories', color: '#4a6741',
      controller: 'Various Indigenous Confederacies', status: 'renamed',
      notes: 'USA never formed — indigenous polities hold the interior continent',
    },
    {
      isoA3: 'CAN', altName: 'Haudenosaunee & Northern Nations', color: '#3d5e38',
      controller: 'Haudenosaunee Confederacy', status: 'renamed',
      notes: 'No British colonisation — sovereign indigenous confederacies',
    },
    {
      isoA3: 'MEX', altName: 'Mexica Tēnōchca Empire', color: '#7a3b00',
      controller: 'Aztec Triple Alliance', status: 'renamed',
      notes: 'Aztec Empire never fell — capital Tenochtitlan (Mexico City area)',
    },
    {
      isoA3: 'BRA', altName: 'Tupí-Guaraní Confederacy', color: '#2a4a1a',
      controller: 'Tupí Confederation', status: 'renamed',
      notes: 'Portuguese never colonised — Amazon indigenous federation',
    },
    {
      isoA3: 'PER', altName: 'Tawantinsuyu — Inca Core', color: '#c4a300',
      controller: 'Inca Federation', status: 'renamed',
      notes: 'Inca Empire never conquered — capital Cusco',
    },
    {
      isoA3: 'CHL', altName: 'Tawantinsuyu Southern Province', color: '#b09000',
      controller: 'Inca Federation', status: 'occupied',
      notes: 'Southern extension of the Inca empire',
    },
    {
      isoA3: 'COL', altName: 'Tawantinsuyu Northern Province', color: '#b09000',
      controller: 'Inca Federation', status: 'occupied',
      notes: 'Northern extension of Tawantinsuyu',
    },
    {
      isoA3: 'ARG', altName: 'Mapuche-Guaraní Southern Lands', color: '#3a5a2a',
      controller: 'Southern Confederacy', status: 'renamed',
      notes: 'Southern cone indigenous confederacy — no European settlers',
    },
    {
      isoA3: 'ESP', altName: 'Kingdom of Spain', color: '#6a3a3a',
      controller: 'Spanish Crown', status: 'shrunk',
      notes: 'No American empire — reduced to Iberian peninsula only',
    },
    {
      isoA3: 'PRT', altName: 'Kingdom of Portugal', color: '#5a2a2a',
      controller: 'Portuguese Crown', status: 'shrunk',
      notes: 'No Brazilian empire — only West African trading posts remain',
    },
    {
      isoA3: 'GBR', altName: 'Kingdom of Great Britain', color: '#4a4a6a',
      controller: 'British Crown', status: 'shrunk',
      notes: 'No North American colonies — purely a European power',
    },
  ],
  disappearedCountries: ['USA'],
  newCountries: [
    {
      name: 'Zhōngměi Pacific Federation',
      capital: { lat: 37.8, lng: -122.4, name: 'Xin Guǎngzhōu (San Francisco)' },
      color: '#8B1A1A',
      coords: [
        [32, -117], [35, -120], [38, -123], [42, -124], [46, -124],
        [49, -124], [52, -128], [54, -130], [54, -124], [49, -118],
        [46, -116], [42, -117], [38, -119], [35, -117], [32, -117],
      ],
      notes: 'Chinese-sphere Pacific Federation — western coast of North America',
    },
    {
      name: 'Mexica Tēnōchca Empire',
      capital: { lat: 19.4, lng: -99.1, name: 'Tenochtitlan' },
      color: '#7a3b00',
      coords: [
        [30, -108], [28, -104], [24, -104], [16, -96], [15, -92],
        [16, -88], [20, -87], [22, -90], [21, -97], [24, -100],
        [26, -105], [28, -109], [30, -108],
      ],
      notes: 'Aztec Triple Alliance — never conquered by Spain',
    },
    {
      name: 'Tawantinsuyu Federation',
      capital: { lat: -13.5, lng: -71.9, name: 'Cusco' },
      color: '#c4a300',
      coords: [
        [0, -78], [-5, -80], [-10, -76], [-15, -75], [-20, -70],
        [-30, -68], [-40, -68], [-45, -66], [-40, -62], [-30, -56],
        [-15, -58], [-5, -60], [0, -67], [2, -73], [0, -78],
      ],
      notes: 'Inca Empire — Andean super-state from Colombia to Patagonia',
    },
    {
      name: 'Haudenosaunee Confederacy',
      capital: { lat: 43.0, lng: -76.1, name: 'Onondaga' },
      color: '#4a6741',
      coords: [
        [52, -80], [50, -70], [47, -65], [44, -65], [42, -72],
        [40, -76], [42, -80], [44, -83], [47, -84], [50, -84],
        [52, -80],
      ],
      notes: 'Iroquois Confederacy — Great Lakes to Atlantic, fully sovereign',
    },
  ],
  borderChanges: [
    { from: 'USA', to: 'Zhōngměi Pacific Federation', region: 'California Coast', lat: 37.0, lng: -120.0 },
    { from: 'USA', to: 'Haudenosaunee Confederacy',   region: 'Great Lakes',       lat: 44.0, lng: -78.0 },
    { from: 'MEX', to: 'Mexica Tēnōchca Empire',      region: 'Tenochtitlan',      lat: 19.4, lng: -99.1 },
    { from: 'PER', to: 'Tawantinsuyu Federation',     region: 'Cusco',             lat: -13.5, lng: -71.9 },
    { from: 'BRA', to: 'Tupí-Guaraní Confederacy',    region: 'Amazon Basin',      lat: -3.0, lng: -60.0 },
    { from: 'ESP', to: 'Shrunk — no Americas',         region: 'Iberian Peninsula', lat: 40.4, lng: -3.7 },
  ],
  capitalChanges: [
    { country: 'MEX', oldCapital: 'Mexico City',  newCapital: 'Tenochtitlan', lat: 19.4,  lng: -99.1 },
    { country: 'PER', oldCapital: 'Lima',          newCapital: 'Cusco',        lat: -13.5, lng: -71.9 },
    { country: 'CAN', oldCapital: 'Ottawa',        newCapital: 'Onondaga',     lat: 43.0,  lng: -76.1 },
  ],
};
