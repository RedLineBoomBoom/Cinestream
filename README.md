# 🎬 CINESTREAM NOVA • [OFFICIAL FULL RELEASE]

<div align="center">

![CINESTREAM NOVA](https://img.shields.io/badge/CINESTREAM-FULL_RELEASE_v1.4.3-E50914?style=for-the-badge&logo=netflix&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![React 19](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.2.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-4A90E2?style=for-the-badge&logo=pwa&logoColor=white)
![WebRTC PeerJS](https://img.shields.io/badge/PeerJS-WebRTC-FF4154?style=for-the-badge&logo=webrtc&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <strong>Next-Generation Cinematic Web Streaming Platform</strong><br />
  Curated blockbuster movies, top-rated TV series, Asian dramas, and anime with blazing performance, multi-server streaming with automated failover, serverless P2P Watch Party, real-time Danmaku bullet comments, and intelligent Netflix-style Autoplay Next.
</p>

[🎉 Full Release Announcement](#-full-release-announcement) • [✨ Key Features](#-key-features) • [🚀 Changelog](#-whats-new-in-full-release) • [⌨️ Shortcuts](#️-keyboard-shortcuts) • [🛠️ Tech Stack](#️-technologies--stack)

---

</div>

## 🎉 Full Release Announcement

> [!IMPORTANT]
> **CINESTREAM NOVA RESMI KELUAR DARI TAHAP BETA DAN KINI FULL RILIS!**  
> Kami dengan bangga mengumumkan bahwa **Cinestream Nova** telah resmi menyelesaikan fase pengujian Beta dan kini memasuki tahap **Official Full Production Release (v1.4.3)**. Seluruh infrastruktur inti—mulai dari *multi-server failover*, sinkronisasi Cloud profil, *serverless P2P Watch Party*, *Airing Schedule* dengan jam rilis akurat, hingga interaktivitas *Danmaku timed comments*—kini telah mencapai tingkat kestabilan, responsivitas, dan performa tinggi yang siap dinikmati di semua perangkat.

---

## 🌟 About Cinestream Nova

**CINESTREAM NOVA** adalah platform web streaming modern yang dirancang untuk memberikan pengalaman menonton sinematik premium tanpa gangguan iklan pop-up (*distraction-free*). Menggabungkan estetika *dark luxury cinema*, tipografi editorial (*Bebas Neue*, *Plus Jakarta Sans*, *Montserrat*), serta animasi mikro halus bertenaga *Framer Motion*.

Kini dalam tahap **Full Release**, Cinestream menawarkan keandalan tingkat tinggi, pemulihan otomatis server pemutar, pelacakan riwayat tontonan lintas musim yang teratur, dan antarmuka responsif sempurna untuk Desktop, Tablet, maupun Smartphone (PWA).

---

## 🚀 What's New in Full Release (Rangkuman Update Fitur)

Berikut adalah rangkuman pembaruan fitur utama dan penyempurnaan yang telah diterapkan menjelang dan saat peluncuran Full Release:

### 1. 💬 Danmaku Floating Timed Comments (Fitur Baru)
- **Komentar Melayang Real-Time**: Penonton dapat mengirim reaksi dan komentar yang melayang secara horizontal melintasi layar video sesuai menit/detik penayangan (*timestamp-pinned*).
- **Anti-Duplikasi Cerdas**: Memastikan komentar yang baru dikirim oleh pengguna langsung tampil mulus satu kali tanpa duplikasi warna/lajur.
- **Kontrol Cepat di Player**: Tombol cepat untuk mengaktifkan (*Danmaku ON*) atau menyembunyikan (*Danmaku OFF*) komentar kapan saja tanpa menghentikan video.
- **Sinkronisasi Otomatis**: Komentar tersimpan di penyimpanan lokal dan sinkron ke Cloud Supabase agar dapat dinikmati penonton lainnya.

### 2. 📅 Airing Schedule & Episode Countdown (Jadwal Tayang Akurat)
- **Jadwal Rilis Serial Berjalan**: Tampilan kalender jadwal tayang serial TV, drakor, dan anime yang sedang *on-going*.
- **Jam Rilis Episode Pasti**: Dilengkapi jam tayang akurat dan badge hitung mundur (*countdown badge*) interaktif yang mempermudah pengguna mengetahui kapan episode berikutnya akan rilis.
- **Deduplikasi Cerdas**: Menghilangkan judul berulang antar-tanggal dan saat *load more*, sehingga jadwal tampil bersih dan teratur.

### 3. 🎭 AI CineFinder & Mood Picker (Eksplorasi Judul Bervariasi)
- **Mood Picker Cerdas**: Menampilkan rekomendasi film dan series beragam sesuai suasana hati (Santai, Tegang, Romantis, Mind-Bending, dll.) dengan beberapa opsi rekomendasi sekaligus dan variasi judul nyata yang dinamis.
- **AI CineFinder**: Pencarian semantik berbahasa natural bertenaga AI untuk menemukan film berdasarkan deskripsi alur cerita atau tema spesifik.

### 4. 👤 Profil Pengguna & Kartu Profil Publik yang Dapat Dibagikan
- **Kustomisasi Persona & Warna Tema**: Pilihan avatar emoji, monogram inisial, dan palet warna sinematik (*Netflix Crimson, Cyberpunk Neon, Golden Luxury, Emerald Oasis, dll.*).
- **Kartu Profil Publik (/u/:username)**: Desain kartu profil modern yang menampilkan statistik menonton, watchlist, dan genre favorit yang dapat dibagikan langsung via tautan atau QR Code.
- **Navigasi & Toggle Profil Sempurna**: Penyempurnaan alur buka-tutup profil (*click toggle close*), perbaikan batas layout banner tanpa tumpang tindih (*clean solid background*), dan pencegahan tersangkutnya modal profil.

### 5. 🎬 Penyempurnaan Hero Banner & Player Experience
- **Trailer Video Lebih Luas & Jernih**: Penurunan posisi vertikal teks highlight dan pengurangan ketebalan gradien hitam bawah (dari 70% menjadi 36%) sehingga video trailer di latar belakang tidak lagi tertutup bayangan gelap pekat.
- **Pembersihan Baris Aksi**: Menghilangkan tombol Watch Party yang redundan pada baris aksi detail film agar tampilan tombol esensial (*Watchlist, Trailer, Share*) tetap rapi dan terfokus.
- **Autoplay Next Episode dengan End-Credits Detection**: Transisi otomatis antar-episode dengan jeda waktu credit yang terkalibrasi presisi sesuai durasi film/series.
- **Mini Player & Theater Mode**: Floating PiP player yang dapat digeser dan disematkan di 4 sudut layar dengan subtitle yang otomatis menyesuaikan ukuran.

### 6. 📱 PWA Engine v1.4.3 & Hot Cache-Busting
- **Pembaruan Instan Tanpa Cache Nyangkut**: Sistem deteksi Service Worker otomatis yang memicu notifikasi pembaruan dan tombol *Hard Reload* saat versi baru dirilis.
- **Desain Native Mobile**: Optimalisasi *safe-area insets* untuk smartphone berponi (*notch*) dan navigasi bawah yang mulus.

---

## ✨ Key Features Overview

| Kategori | Fitur Unggulan |
| :--- | :--- |
| **Streaming Engine** | Multi-server failover otomatis, monitoring latensi server, pemutaran 1080p, audio synchro. |
| **Interaktivitas** | Danmaku floating comments, Watch Party P2P (WebRTC) dengan sinkronisasi playback & obrolan langsung. |
| **Serial & Episode** | Navigasi lintas musim (*Cross-Season Progression*), Drawer episode di dalam player, riwayat tontonan ringkas (*Watched Tab*). |
| **Personalisasi** | Profil dengan tema warna & avatar kustom, Sinkronisasi Cloud (Supabase), daftar tontonan pribadi. |
| **Bahasa & Audio** | 100% Bilingual (Bahasa Indonesia & English), terjemahan sinopsis dinamis, soundscape UI Web Audio API tanpa file eksternal. |
| **Admin Control** | Dashboard analitik komprehensif, metrik penonton, broadcast pengumuman global, manajemen server & konten. |

---

## ⌨️ Keyboard Shortcuts

Nikmati kontrol pemutaran penuh tanpa menyentuh mouse:

| Tombol | Aksi Pemutar |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>K</kbd> | Putar / Jeda (*Play / Pause*) |
| <kbd>F</kbd> | Layar Penuh (*Toggle Fullscreen*) |
| <kbd>T</kbd> | Mode Bioskop (*Toggle Theater Mode*) |
| <kbd>M</kbd> | Bisukan Suara (*Mute / Unmute*) |
| <kbd>←</kbd> / <kbd>J</kbd> | Mundur 10 Detik |
| <kbd>→</kbd> / <kbd>L</kbd> | Maju 10 Detik |
| <kbd>↑</kbd> | Naikkan Volume (+5%) |
| <kbd>↓</kbd> | Turunkan Volume (-5%) |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Episode Selanjutnya (*Next Episode*) |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Episode Sebelumnya (*Previous Episode*) |
| <kbd>Esc</kbd> | Keluar Layar Penuh / Tutup Dialog Modal |

---

## 🛠️ Technologies & Stack

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) dengan palet custom *luxury cinema*
- **Animation**: [Framer Motion 13](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **P2P Networking**: [PeerJS](https://peerjs.com/) (WebRTC Data & Media Channels)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Cloud Sync)
- **PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) (Workbox Service Worker)
- **Metadata Sources**: TMDB API, TVMaze, OMDb

---

## 📄 License & Disclaimer

Didistribusikan di bawah lisensi **MIT License**.

> **⚠️ Educational Disclaimer:**  
> **CINESTREAM NOVA** dikembangkan sebagai proyek eksplorasi rekayasa perangkat lunak modern, arsitektur peer-to-peer WebRTC, dan desain antarmuka web sinematik. Semua metadata film dan televisi bersumber dari basis data publik terbuka (seperti TMDB dan TVMaze).
