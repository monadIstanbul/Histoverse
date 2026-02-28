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

// ── Quick-test mock (used in dev when real API is unavailable) ────────────────
export const MOCK_ALT_MAP: AltHistoryMap = {
  scenario: 'Ottoman Empire never fell',
  winnerAI: 'Claude',
  globeNarrative: 'Ottoman Federation — 2026 CE',
  changedRegions: [
    {
      isoA3: 'TUR', altName: 'Osmanlı Anadolu Vilayeti', color: '#3a1a0a',
      controller: 'Ottoman Federation', status: 'expanded',
      notes: 'Core Ottoman Anatolian territory',
    },
    {
      isoA3: 'SYR', altName: 'Suriye Vilayeti', color: '#2a1205',
      controller: 'Ottoman Federation', status: 'occupied',
      notes: 'Ottoman province — Damascus as regional capital',
    },
    {
      isoA3: 'IRQ', altName: 'Irak Vilayeti', color: '#2a1205',
      controller: 'Ottoman Federation', status: 'occupied',
      notes: 'Mesopotamia province',
    },
    {
      isoA3: 'ISR', altName: 'Filistin Vilayeti', color: '#2a1205',
      controller: 'Ottoman Federation', status: 'renamed',
      notes: 'No Israel in this timeline, Palestinian province',
    },
    {
      isoA3: 'GRC', altName: 'Yunan Vilayeti', color: '#2a1205',
      controller: 'Ottoman Federation', status: 'occupied',
      notes: 'Re-absorbed into the Federation',
    },
  ],
  disappearedCountries: ['ISR'],
  newCountries: [
    {
      name: 'Osmanlı Arap Federasyonu',
      capital: { lat: 33.3, lng: 44.4, name: 'Bağdat' },
      color: '#2a1205',
      coords: [
        [37, 37], [30, 38], [24, 39], [20, 44], [20, 55],
        [28, 55], [33, 47], [36, 42], [38, 38], [37, 37],
      ],
      notes: 'Autonomous Arab region within the Federation',
    },
  ],
  borderChanges: [
    { from: 'ISR', to: 'Ottoman Federation', region: 'Kudüs', lat: 31.8, lng: 35.2 },
    { from: 'SYR', to: 'Ottoman Federation', region: 'Şam',   lat: 33.5, lng: 36.3 },
    { from: 'GRC', to: 'Ottoman Federation', region: 'Selanik', lat: 40.6, lng: 22.9 },
  ],
  capitalChanges: [
    { country: 'TUR', oldCapital: 'Ankara', newCapital: 'İstanbul', lat: 41.0, lng: 28.9 },
  ],
};
