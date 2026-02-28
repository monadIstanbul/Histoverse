# WHATIF — Alternate History Simulator

**WHATIF**, kullanıcıların dünya tarihindeki herhangi bir olayı değiştirerek alternatif evrenler simüle edebildiği, Monad blockchain tabanlı bir **tahmin oylaması + dünya tarihi simülasyonu** uygulamasıdır.

> Monad Blitz Ankara Hackathon 2025 için geliştirilmektedir.

## 🚀 Proje Durumu

### ✅ Tamamlanan Özellikler

- **React + Vite + TypeScript** proje yapısı
- **Tailwind CSS** ile tasarım sistemi
- **MetaMask entegrasyonu** (Monad Testnet desteği)
- **Monad Testnet odaklı UI**:
  - MonadWelcome karşılama ekranı
  - Otomatik ağ ekleme/değiştirme
  - Connection status göstergeleri
  - Monad Testnet bilgilendirme panelleri
- **Temel UI bileşenleri**:
  - Header (wallet connection & Monad status)
  - ScenarioPanel (senaryo girişi + connection alerts)
  - Globe (2D Canvas + Monad branding)
  - AICards (4 AI tahmin kartları)
  - VotePanel (oylama + pool bilgisi)
  - BottomBar (Monad links & stats)
  - Toast (bildirimler)

### 🎨 Tasarım Sistemi

- **Dark Space Theme**: Uzay temasında koyu renkler
- **Fonts**: Cinzel (başlıklar) + Rajdhani (UI)
- **Colors**: Glow blue (#00b4ff), Gold (#f0c040), Purple (#9060ff)
- **Animasyonlar**: CRT scanlines, glow effects, rotating globe

### 🌐 Blockchain Entegrasyonu

- **Monad Testnet** otomatik ağ değiştirme
- **MetaMask** wallet bağlantısı
- **1 MON = 1 oy** sistemi
- **70/20/10** ödeme dağıtımı modeli

## 📁 Proje Yapısı

```
Histoverse/
├── src/
│   ├── components/           # React bileşenleri
│   │   ├── Header/
│   │   ├── ScenarioPanel/
│   │   ├── Globe/
│   │   ├── AICards/
│   │   ├── VotePanel/
│   │   ├── BottomBar/
│   │   └── Toast/
│   ├── hooks/
│   │   └── useMetaMask.ts    # MetaMask entegrasyonu
│   ├── lib/
│   │   └── monadClient.ts    # Monad ağ konfigürasyonu
│   ├── App.tsx               # Ana uygulama
│   ├── main.tsx              # Giriş noktası
│   └── index.css             # Tasarım sistemi
├── tailwind.config.js        # Tailwind konfigürasyonu
├── vite.config.ts           # Vite konfigürasyonu
├── package.json
└── .env                     # Environment variables
```

## 🛠️ Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- MetaMask browser extension
- Monad Testnet MON tokens

### Adımlar

1. **Dependencies yükle**:
   ```bash
   npm install
   ```

2. **Environment variables ayarla**:
   ```bash
   cp .env .env.local
   # .env.local dosyasını düzenle
   ```

3. **Development server başlat**:
   ```bash
   npm run dev
   ```

4. **Tarayıcıda aç**: http://localhost:3000

## 🌐 Monad Testnet Setup

### Otomatik Konfigürasyon

Uygulama MetaMask'ı otomatik olarak Monad Testnet'e bağlar:

- **Chain ID**: 10143 (0x279F)
- **RPC URL**: https://testnet-rpc.monad.xyz  
- **Explorer**: https://testnet.monadexplorer.com
- **Faucet**: https://faucet.monad.xyz

### Manuel Ekleme

MetaMask → Networks → Add Network:

```json
{
  "chainId": "0x279F",
  "chainName": "Monad Testnet",  
  "nativeCurrency": {
    "name": "MON",
    "symbol": "MON",
    "decimals": 18
  },
  "rpcUrls": ["https://testnet-rpc.monad.xyz"],
  "blockExplorerUrls": ["https://testnet.monadexplorer.com"]
}
```

## 🎮 Kullanım Akışı

1. **Wallet bağla**: MetaMask ile Monad Testnet'e bağlan
2. **Senaryo yaz**: "What if..." sorusu yaz veya hazır seçeneklerden seç  
3. **AI tahminlerine bak**: 4 AI modelinin alternatif tarih tahmini
4. **Oy ver**: En iyi tahmini seç ve 1 MON ile oy ver
5. **Sonuçları gör**: Kazanan tahmini yeni "gerçek tarih" olur

## 🔧 Yapılacaklar

### Sprint 2 — AI & Blockchain
- [ ] Claude API entegrasyonu (gerçek AI tahminleri)
- [ ] Mock AI tahminlerini gerçek API'lerle değiştir
- [ ] Solidity akıllı kontrat geliştirimi
- [ ] Contract deployment (Hardhat)
- [ ] Monad Testnet faucet entegrasyonu

### Sprint 3 — Advanced Features  
- [ ] Senaryo veritabanı sistemi
- [ ] Timeline devamı (alternatif tarih ilerlemesi)
- [ ] Three.js ile 3D globe upgrade
- [ ] Pool finalizasyonu ve ödeme dağıtımı

### Sprint 4 — Agent Architecture
- [ ] ScenarioAgent (kürasyon)
- [ ] OracleAgent (AI API yönetimi)  
- [ ] VotingAgent (round yönetimi)
- [ ] RewardAgent (ödeme dağıtımı)

### Sprint 5 — Production Ready
- [ ] Mobile responsive design
- [ ] Error handling iyileştirmeleri
- [ ] Performance optimizasyonları
- [ ] Deployment (Vercel/Netlify)

## 🔑 Environment Variables

```bash
# .env.local
VITE_ANTHROPIC_API_KEY=your_claude_api_key_here
VITE_MONAD_RPC=https://testnet-rpc.monad.xyz
VITE_CONTRACT_ADDRESS=0x_deployed_contract_address  
VITE_SERVER_TREASURY=0x_your_treasury_wallet
VITE_CHAIN_ID=10143
VITE_MONAD_EXPLORER=https://testnet.monadexplorer.com
```

## 🧰 Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Blockchain | Monad Testnet |
| Wallet | MetaMask (window.ethereum) |
| 3D Graphics | Canvas 2D (upgrade: Three.js) |
| Smart Contracts | Solidity (gelecek) |
| AI API | Claude (gelecek) |

## 🎯 Hackathon Hedefleri

- ✅ **Monad Native**: Tüm işlemler Monad Testnet üzerinde
- ✅ **Web3 UX**: Seamless MetaMask entegrasyonu + otomatik ağ ekleme
- ✅ **Monad Focused**: Tamamen Monad Testnet odaklı kullanıcı deneyimi
- 🚧 **AI Integration**: Claude API ile gerçek tahminler
- 🚧 **Agent Architecture**: Otonom agent sistemi
- ✅ **Innovative Concept**: Tarih simülasyonu + oylama kombinasyonu

## 📝 Notlar

- **Demo Mode**: MetaMask olmadan da çalışır (mock transactions)
- **Mobile Support**: Responsive design planlanmış
- **API Security**: Production'da backend proxy gerekli
- **Contract**: Hardhat ile deploy edilecek

---

**WHATIF — Tarihi değiştir, geleceği oyla.**  
*Powered by Monad Testnet - Monad Blitz İstanbul 2026*