# 🎬 CINESTREAM NOVA • [BETA]

<div align="center">

![CINESTREAM NOVA](https://img.shields.io/badge/CINESTREAM-NOVA_BETA-E50914?style=for-the-badge&logo=netflix&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.2.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-13.2-black?style=for-the-badge&logo=framer&logoColor=white)
![WebRTC PeerJS](https://img.shields.io/badge/PeerJS-WebRTC-FF4154?style=for-the-badge&logo=webrtc&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <strong>Platform Streaming Sinematik Generasi Berikutnya Berstandar Visual Awwwards</strong><br />
  Menghadirkan kurasi film layar lebar, serial drama, anime, dan serial televisi premium dengan performa kilat, integrasi pemutar multi-server, fitur Watch Party P2P tanpa server terpusat, serta sistem Autoplay Next cerdas bergaya Netflix.
</p>

[Fitur Utama](#-fitur-utama-cinestream-nova) • [Sistem Pemutar](#-sistem-pemutar-sinematik-cinematicplayer) • [Watch Party P2P](#-watch-party-p2p-nonton-bareng) • [Teknologi & Arsitektur](#-teknologi--arsitektur) • [Instalasi & Menjalankan](#-instalasi--menjalankan-proyek) • [Pintasan Keyboard](#-pintasan-keyboard)

---

</div>

## 🌟 Tentang Cinestream Nova

**CINESTREAM NOVA** adalah evolusi mutakhir dari platform web streaming modern yang dirancang untuk memberikan pengalaman menonton sinematik bebas distraksi (*distraction-free viewing experience*). Menggabungkan estetika mewah bernuansa *dark cinema*, tipografi editorial (*Bebas Neue*, *Inter*, *Montserrat*, dan *Plus Jakarta Sans*), serta mikrointeraksi berbasis *Framer Motion* yang sangat mulus.

Kini proyek ini telah resmi memasuki **Tahap Beta**, menghadirkan stabilitas tingkat tinggi, sistem mitigasi kegagalan server otomatis, pemutaran episode berkelanjutan lintas season, serta pengalaman *responsive layout* di perangkat Desktop, Tablet, hingga Layar Ponsel Pintar (*Mobile*).

---

## ✨ Fitur Utama Cinestream Nova

### 1. 🎥 Pemutar Sinematik Multi-Server (`CinematicPlayer`)
- **Multi-Server Streaming & Auto-Failover**: Mendukung berbagai penyedia embed dan native streaming dengan fitur pengecekan latensi/kecepatan server serta perpindahan server cadangan dalam 1-klik jika server utama terblokir ISP.
- **Deteksi Cerdas Kredit Penutup & Autoplay Next**:
  - **Serial Panjang ($\ge 30$ Menit)**: *Autoplay next* otomatis muncul tepat pada **2 menit (120 detik)** sebelum episode tamat.
  - **Serial Sedang ($15 - 30$ Menit / Anime / Sitcom)**: Otomatis muncul pada **45 detik** sebelum episode tamat.
  - **Serial Pendek ($5 - 15$ Menit)**: Otomatis muncul pada **25 detik** sebelum episode tamat.
- **Popup Autoplay Next Responsif Multi-Device**:
  - **Desktop (Fullscreen / 1080p / 4K)**: Kartu lega berukuran 490px yang melayang aman di atas kontrol seekbar tanpa tabrakan HUD.
  - **Tablet (768px – 1024px)**: Proporsi optimal (420–460px) yang mudah dibaca dari jarak jangkauan tangan.
  - **Mobile (< 640px)**: Kartu membentang proporsional dengan margin tepi 12px dan tombol sentuh jempol $\ge 44\text{px}$ (*Apple HIG & Android Material Touch Target compliant*).
  - **Pratinjau Thumbnail 16:9**: Cuplikan visual adegan episode berikutnya lengkap dengan label `S{season}:E{episode}` dan sinopsis singkat.
  - **Animated Gold Progress Bar**: Garis animasi emas yang menghitung mundur waktu secara visual dari 8 detik hingga 0 detik.
  - **Deteksi Mundur Cerdas (*Backward Seek Auto-Dismiss*)**: Menggeser mundur 5–10 detik saat kartu muncul akan langsung menyembunyikan kartu dan mereset hitung mundur secara instan.
  - **Tombol "Tonton Kredit" (*Watch Credits*)**: Memberikan fleksibilitas bagi penonton untuk menikmati kredit akhir lagu/penutup hingga video selesai (0s), lalu otomatis melanjutkan ke episode berikutnya tanpa macet.
- **Picture-in-Picture (PiP) & Mini Player Melayang**:
  - Mini Player yang dapat digeser (*drag-and-drop*) dengan sistem *magnetic snapping* otomatis ke 4 sudut layar (*Bottom-Right, Bottom-Left, Top-Left, Top-Right*).
  - Skalasi takarir (*subtitles*) otomatis proporsional agar teks terjemahan tidak pernah menutupi video kecil.
- **Mode Bioskop (*Theater Mode*) & Fullscreen**:
  - Mode fokus layar lebar dengan fitur *auto-hide controls* cerdas pada perangkat mobile saat tidak ada sentuhan.

---

### 2. 🍿 Watch Party P2P (Nonton Bareng Real-Time)
- **Arsitektur Peer-to-Peer (WebRTC & PeerJS)**:
  - Berjalan langsung antarlayar pengguna tanpa memerlukan server WebSocket atau backend relay pihak ketiga.
  - Kemudahan berbagi kamar (*room*) instan menggunakan **Kode QR** atau **1-Click Salin Tautan**.
- **Sinkronisasi Pemutaran Terpadu (*Host Playback Sync*)**:
  - Aksi *Play*, *Pause*, *Seek/Scrubbing*, dan pergantian episode oleh Host langsung tersinkronisasi secara presisi ke seluruh anggota kamar.
- **Penghitung Partisipan Akurat & Anti-Ghosting**:
  - Dilengkapi sistem *Heartbeat Ping/Pong* berkala yang mengeliminasi anggota yang terputus (*ghost members*) secara real-time.
- **Floating Live Reactions Overlay**:
  - Kirimkan reaksi emoji langsung di atas layar video (❤️, 🔥, 👏, 😂, 🍿, 😱) yang melayang dengan efek partikel visual interaktif.
- **Obrolan Langsung (*In-Player Live Chat*)**:
  - Kolom chat terintegrasi di dalam pemutar dengan lencana Host/Member dan penanda waktu pesan.

---

### 3. 📑 Navigasi Serial & Arsitektur Episode
- **Transisi Episode Lintas Season**:
  - Kemampuan lompat antar-musim otomatis (misalnya dari Musim 1 Episode Terakhir langsung ke Musim 2 Episode 1) tanpa kembali ke menu utama.
- **Drawer Episode di Dalam Pemutar (*In-Player Episode Drawer*)**:
  - Buka daftar episode dan musim langsung saat video sedang berjalan tanpa menghentikan pemutaran.
- **Indikator Musim Lengkap (*Complete / On Going*)**:
  - Penanda visual status musim yang sudah tamat (*✓ Complete*) atau masih tayang (*● On Going*).
- **Agregasi Riwayat Riil (*Watched Tab Consolidation*)**:
  - Menyatukan puluhan episode dari serial yang sama ke dalam **1 Kartu Ringkas** dengan menu *dropdown* episode di tab riwayat, menjaga tampilan tetap rapi.

---

### 4. 🔍 Penelusuran & Kurasi Cerdas Multi-Sumber
- **Hybrid Search Engine**:
  - Mengintegrasikan metadata kaya dari berbagai sumber database global (TMDB, TVMaze, OMDb, IMDb, serta katalog anime).
- **Filter Pencarian Lengkap**:
  - Temukan tayangan berdasarkan kategori film, serial, anime, drama Asia, tahun rilis, genre, negara asal, dan tingkat popularitas.
- **Hero Banner Sinematik**:
  - Carousel dinamis dengan backdrop resolusi tinggi, integrasi pratinjau cuplikan video (*trailer*), dan tombol aksi cepat.

---

### 5. 🌐 Lokalisasi Dwibahasa (Bahasa Indonesia & English)
- **100% Dukungan Dwibahasa Penuh**:
  - Setiap teks tombol, takarir, modal, panduan, hingga pesan kesalahan tersedia dalam **Bahasa Indonesia** dan **English**.
  - Beralih bahasa seketika lewat tombol sakelar di bilah navigasi tanpa perlu memuat ulang halaman (*zero page reload*).

---

### 6. 🔊 Desain Suara Sinematik (*Web Audio API*)
- Efek suara taktil untuk interaksi UI (klik tombol, efek hover, perpindahan episode, dan buka modal) yang disintesis langsung menggunakan Web Audio API murni.
- **Nol Unduhan File Audio Tambahan** (hemat kuota dan memuat secepat kilat).
- Tersedia tombol sakelar untuk mematikan/menyalakan audio efek sesuai kenyamanan penonton.

---

### 7. 🛡️ Panduan Jaringan & Mitigasi DNS / VPN
- Modal panduan bawaan untuk konfigurasi **Cloudflare 1.1.1.1 DNS** dan VPN saat server video dibatasi oleh penyedia internet (*ISP*).
- Dilengkapi mekanisme *scroll-lock* otomatis saat modal terbuka agar navigasi pengguna tetap nyaman.

---

## ⌨️ Pintasan Keyboard (Keyboard Shortcuts)

Nikmati kontrol pemutaran penuh tanpa menyentuh mouse:

| Tombol | Fungsi |
| :--- | :--- |
| <kbd>Spasi</kbd> / <kbd>K</kbd> | Putar / Jeda (*Play / Pause*) |
| <kbd>F</kbd> | Masuk / Keluar Layar Penuh (*Fullscreen*) |
| <kbd>T</kbd> | Mode Bioskop (*Theater Mode*) |
| <kbd>M</kbd> | Senyapkan / Bunyikan Suara (*Mute / Unmute*) |
| <kbd>←</kbd> / <kbd>J</kbd> | Mundur 10 Detik (*Rewind*) |
| <kbd>→</kbd> / <kbd>L</kbd> | Maju 10 Detik (*Fast Forward*) |
| <kbd>↑</kbd> | Naikkan Volume (+5%) |
| <kbd>↓</kbd> | Turunkan Volume (-5%) |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Putar Episode Selanjutnya (*Next Episode*) |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Putar Episode Sebelumnya (*Previous Episode*) |
| <kbd>Esc</kbd> | Keluar dari Fullscreen / Tutup Modal |

---

## 🛠️ Teknologi & Arsitektur

Cinestream Nova dibangun dengan standar performa modern:

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tooling**: [Vite 8](https://vitejs.dev/) (dengan Fast Refresh & esbuild / oxc compiler)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) dengan palet kustom *cinema luxury* (`brand-gold`, `brand-champagne`, `cinema-950`)
- **Micro-Animations**: [Framer Motion 13](https://www.framer.com/motion/)
- **Iconography**: [Lucide React](https://lucide.dev/)
- **Networking P2P**: [PeerJS](https://peerjs.com/) (WebRTC Data Channels & Media Streams)
- **Kode QR**: [qrcode](https://www.npmjs.com/package/qrcode)
- **Linter & Code Quality**: [Oxlint](https://oxc.rs/)

---

## 📂 Struktur Direktori Proyek

```plaintext
streaming/
├── public/                     # Aset statis publik (favicon, wallpaper, svg icons)
├── src/
│   ├── assets/                 # Aset grafis & animasi lokal
│   ├── components/
│   │   ├── custom/             # Komponen UI kustom & badge
│   │   ├── details/            # Modal detail media & WatchSection
│   │   ├── explore/            # Halaman jelajah & filter kategori
│   │   ├── history/            # Manajemen riwayat & kartu serial gabungan
│   │   ├── home/               # Hero banner, baris film, & kurasi beranda
│   │   ├── layout/             # Navbar, Footer, & bilah navigasi utama
│   │   ├── party/              # Watch Party button, chat box, & emoji reactions
│   │   ├── player/             # CinematicPlayer, EpisodeList, AudioBooster, ServerSelector
│   │   ├── profile/            # Pengaturan profil & preferensi penonton
│   │   └── search/             # Panel pencarian & saran otomatis
│   ├── context/                # React Context (Language, Watchlist, Party, Sound, Profile)
│   ├── data/                   # Data mock, daftar genre, & konfigurasi awal
│   ├── services/               # API clients (TMDB, TVMaze, IMDb, Anime, Server Resolver)
│   ├── types/                  # TypeScript interfaces & types (Media, Server, Episode)
│   ├── utils/                  # Utility functions (formatters, series navigation, sound FX)
│   ├── App.tsx                 # Root application component & routing
│   ├── main.tsx                # Entry point aplikasi
│   └── index.css               # Gaya global & Tailwind directives
├── vercel.json                 # Konfigurasi rewrite SPA Vercel
├── vite.config.ts              # Konfigurasi Vite
└── package.json                # Dependensi proyek & scripts
```

---

## 🚀 Instalasi & Menjalankan Proyek

### Prasyarat:
- [Node.js](https://nodejs.org/) versi `18.0.0` atau lebih baru
- `npm` atau `pnpm` / `yarn`

### Langkah-Langkah:

1. **Clone repositori**:
   ```bash
   git clone https://github.com/RedLineBoomBoom/Cinestream.git
   cd Cinestream
   ```

2. **Instal seluruh dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Dev Mode)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal di `http://localhost:5173`.

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```
   Hasil kompilasi siap produksi akan tersedia di direktori `dist/`.

5. **Pratinjau Hasil Build**:
   ```bash
   npm run preview
   ```

6. **Pemeriksaan Linter**:
   ```bash
   npm run lint
   ```

---

## ☁️ Panduan Deployment (Vercel)

Cinestream Nova sudah dilengkapi dengan konfigurasi `vercel.json` bawaan untuk mendukung perutean URL bersih (*path-based routing* seperti `/watch/:id`):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Cukup sambungkan repositori GitHub ini ke dashboard Vercel Anda, dan proses deploy akan selesai secara otomatis!

---

## 🗺️ Roadmap Tahap Beta

- [x] Deteksi kredit penutup pintar & Autoplay Next Episode terkalibrasi.
- [x] Desain ulang kartu popup Autoplay Next kompatibel di Desktop, Tablet, dan Mobile.
- [x] Fitur Watch Party P2P dengan eliminasi anggota hantu (*ghost member fix*).
- [x] Konsolidasi kartu serial pada riwayat tontonan (*Watched Tab*).
- [x] Dukungan penuh dwibahasa (ID & EN) di seluruh komponen.
- [ ] Penambahan fitur sinkronisasi profil multi-perangkat via Cloud sync (opsional).
- [ ] Fitur kustomisasi ukuran dan warna takarir (*Subtitle Customizer*).
- [ ] Mode Audio Equalizer & Virtual Surround Sound lanjutan.

---

## 📄 Lisensi & Catatan Edukasi

Didistribusikan di bawah Lisensi **MIT**.

> **⚠️ Catatan Edukasi:**
> Proyek **CINESTREAM NOVA** dikembangkan semata-mata sebagai sarana eksplorasi rekayasa antarmuka pengguna (*frontend engineering*), interaktivitas WebRTC modern, estetika sinematik digital, dan studi kasus desain platform penayangan media. Seluruh aset metadata film dan serial bersumber dari penyedia data terbuka (seperti TMDB, TVMaze).
