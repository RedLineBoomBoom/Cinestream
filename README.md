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
  <strong>Next-Generation Cinematic Streaming Platform</strong><br />
  Featuring curated blockbuster movies, award-winning series, Asian dramas, and anime with blazing performance, multi-server streaming with automated failover, serverless P2P Watch Party, and intelligent Netflix-style Autoplay Next.
</p>

[Key Features](#-key-features) • [Cinematic Player](#-cinematic-player-engine) • [P2P Watch Party](#-peer-to-peer-watch-party) • [Tech Stack](#-technologies--stack) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Beta Roadmap](#-beta-roadmap)

---

</div>

## 🌟 About Cinestream Nova

**CINESTREAM NOVA** is an advanced evolution in modern web streaming, architected to provide a distraction-free, ultra-premium cinematic experience. Blending a lavish dark-cinema aesthetic, editorial typography (*Bebas Neue*, *Inter*, *Montserrat*, and *Plus Jakarta Sans*), and fluid micro-interactions powered by *Framer Motion*.

Officially entering its **Beta Phase**, the platform delivers enterprise-grade stability, automated multi-server failover, cross-season episode progression, and a meticulously crafted responsive interface tailored for Desktop, Tablet, and Mobile devices.

---

## ✨ Key Features

### 1. 🎥 Cinematic Player Engine (`CinematicPlayer`)
- **Multi-Server Streaming & Auto-Failover**: Seamless playback across multiple embed and native stream providers with real-time server speed and latency monitoring, plus 1-click fallback switching if a primary source is restricted by ISPs.
- **Calibrated End Credits Detection & Autoplay Next**:
  - **Long Series ($\ge 30$ Minutes)**: Autoplay next prompt triggers precisely at **2 minutes (120 seconds)** before the episode ends.
  - **Medium Series ($15 - 30$ Minutes / Anime / Sitcoms)**: Triggers at **45 seconds** before the episode ends.
  - **Short Series ($5 - 15$ Minutes)**: Triggers at **25 seconds** before the episode ends.
- **Responsive Multi-Device Autoplay Next Card**:
  - **Desktop (Fullscreen / 1080p / 4K)**: Spacious 490px card floating safely above the seekbar without HUD collisions.
  - **Tablet (768px – 1024px)**: Ergonomic 420–460px card easily readable at arm's length.
  - **Mobile (< 640px)**: Edge-to-edge layout with 12px margins and touch-friendly buttons ($\ge 44\text{px}$) complying with Apple HIG and Android Material guidelines.
  - **16:9 Thumbnail Preview**: Crisp scene preview of the upcoming episode with `S{season}:E{episode}` badges and synopsis excerpt.
  - **Animated Gold Progress Bar**: Visual linear gold countdown timer depleting smoothly from 8s to 0s.
  - **Intelligent Backward Seek Auto-Dismiss**: Scrubbing or skipping back 5–10 seconds instantly hides the prompt and resets the countdown timer.
  - **"Watch Credits" Button**: Gives viewers the choice to stay and watch post-credit scenes or ending music themes, advancing seamlessly to the next episode upon natural completion (0s).
- **Picture-in-Picture (PiP) & Floating Mini Player**:
  - Draggable, snappable mini player with magnetic 4-corner docking (*Bottom-Right, Bottom-Left, Top-Left, Top-Right*).
  - Proportional subtitle autoscaling ensuring subtitles never obstruct the mini player view.
- **Theater Mode & True Fullscreen**:
  - Distraction-free widescreen theater mode and browser fullscreen with intelligent auto-hiding controls on touch devices.

---

### 2. 🍿 Peer-to-Peer Watch Party (Co-Watching)
- **Decentralized P2P Architecture (WebRTC & PeerJS)**:
  - Connects directly between viewers' browsers without requiring dedicated backend relays or central streaming servers.
  - Instant room sharing via **QR Code** or **1-Click Shareable Link**.
- **Unified Host Playback Synchronization**:
  - Host actions (*Play*, *Pause*, *Seek/Scrubbing*, and Episode Changes) synchronize instantaneously across all connected room participants.
  - Non-hosts enjoy seamless lockstep playback without desynchronization.
- **Accurate Member Counter & Anti-Ghosting**:
  - Continuous heartbeat ping/pong protocol that immediately prunes disconnected peers in real time.
- **Floating Interactive Emoji Reactions**:
  - Stream animated emoji reactions (❤️, 🔥, 👏, 😂, 🍿, 😱) directly over the video canvas with realistic particle physics.
- **In-Player Live Chat**:
  - Integrated chat overlay with host/member badges and real-time message timestamps.

---

### 3. 📑 Series Navigation & Episode Architecture
- **Cross-Season Progression**:
  - Seamlessly advances between seasons (e.g., from Season 1 Finale directly to Season 2 Episode 1) without exiting to browse menus.
- **In-Player Episode Drawer**:
  - Quick-browse full seasons and episode lists directly inside the player HUD during active playback.
- **Season Status Badges**:
  - Clear visual indicators distinguishing completed series (*✓ Complete*) from ongoing broadcasts (*● On Going*).
- **Consolidated History (Watched Tab)**:
  - Consolidates multiple watched episodes of the same series into a single elegant card with an interactive episode dropdown, keeping viewing history clean and organized.

---

### 4. 🔍 Hybrid Multi-Source Discovery & Smart Search
- **Multi-Source Metadata Aggregation**:
  - Aggregates comprehensive metadata from global databases (TMDB, TVMaze, OMDb, IMDb, and specialized anime catalogs).
- **Advanced Discovery Filters**:
  - Filter content by type (movies, series, anime, Asian dramas), release year, genres, origin country, and popularity metrics.
- **Dynamic Hero Banner**:
  - High-resolution cinematic backdrop carousel with trailer integration and instant-play shortcuts.

---

### 5. 🌐 Full Bilingual Localization (EN / ID)
- **100% Bilingual Interface**:
  - Complete English and Bahasa Indonesia translations across all navigation items, player tooltips, modals, and notifications.
  - Instant zero-reload language toggle accessible directly from the main navigation bar.

---

### 6. 🔊 Pure Web Audio API Soundscapes
- Synthetic tactile UI sound effects (button clicks, hovers, episode transitions, modal toggles) generated via pure Web Audio API synthesis.
- **Zero External Audio Assets Required** (zero bandwidth overhead, instant loading).
- Dedicated audio toggle in settings to enable or mute sound effects according to user preference.

---

### 7. 🛡️ Network & Region Advisory
- Built-in advisory modal for configuring **Cloudflare 1.1.1.1 DNS** and VPNs for seamless playback when streaming servers face ISP restrictions.
- Automatic background scroll-lock prevents page drift while advisory dialogs are active.

---

## ⌨️ Keyboard Shortcuts

Full playback control without touching the mouse:

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>T</kbd> | Toggle Theater Mode |
| <kbd>M</kbd> | Mute / Unmute Audio |
| <kbd>←</kbd> / <kbd>J</kbd> | Rewind 10 Seconds |
| <kbd>→</kbd> / <kbd>L</kbd> | Fast Forward 10 Seconds |
| <kbd>↑</kbd> | Volume Up (+5%) |
| <kbd>↓</kbd> | Volume Down (-5%) |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Next Episode |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Previous Episode |
| <kbd>Esc</kbd> | Exit Fullscreen / Close Modals |

---

## 🛠️ Technologies & Stack

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with custom luxury cinema palettes (`brand-gold`, `brand-champagne`, `cinema-950`)
- **Animation Engine**: [Framer Motion 13](https://www.framer.com/motion/)
- **Iconography**: [Lucide React](https://lucide.dev/)
- **P2P Networking**: [PeerJS](https://peerjs.com/) (WebRTC Data & Media Channels)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 🗺️ Beta Roadmap

- [x] Calibrated credit lead time & intelligent Autoplay Next Episode engine.
- [x] Redesigned responsive Autoplay Next card for Desktop, Tablet, and Mobile.
- [x] Serverless P2P Watch Party with heartbeat ping/pong anti-ghosting.
- [x] Consolidated series history cards with episode dropdown selector.
- [x] Full bilingual localization (English & Indonesian).
- [ ] Multi-device profile synchronization (Cloud sync).
- [ ] Subtitle style customizer (font size, background opacity, colors).
- [ ] Advanced audio equalizer & virtual surround sound enhancement.

---

## 📄 License & Educational Disclaimer

Distributed under the **MIT License**.

> **⚠️ Educational Disclaimer:**
> **CINESTREAM NOVA** is developed solely as an exploration of modern frontend engineering, WebRTC peer-to-peer interactivity, and digital cinematic interface design. All movie and television metadata are retrieved from public, open-access databases (e.g., TMDB, TVMaze).
