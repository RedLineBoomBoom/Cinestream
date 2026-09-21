# 🎬 CINESTREAM NOVA • [OFFICIAL FULL RELEASE]

<div align="center">

![CINESTREAM NOVA](https://img.shields.io/badge/CINESTREAM-FULL_RELEASE_v1.4.4-E50914?style=for-the-badge&logo=netflix&logoColor=white)
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

[🎉 Full Release Announcement](#-full-release-announcement) • [✨ Key Features](#-key-features-overview) • [🚀 What's New](#-whats-new-in-full-release) • [⌨️ Shortcuts](#️-keyboard-shortcuts) • [🛠️ Tech Stack](#️-technologies--stack)

---

</div>

## 🎉 Full Release Announcement

> [!IMPORTANT]
> **CINESTREAM NOVA HAS OFFICIALLY GRADUATED FROM BETA TO FULL PRODUCTION RELEASE!**  
> We are proud to announce that **Cinestream Nova** has successfully completed its Beta testing phase and has officially entered **Full Production Release (v1.4.4)**. Every pillar of the platform—from automated multi-server failover, Cloud profile synchronization, serverless P2P Watch Party, Airing Schedule with exact release timestamps, to real-time Danmaku bullet comments and dedicated Android APK distribution—has achieved enterprise-grade stability, fluid responsiveness, and high performance ready to be experienced across all modern devices.

---

## 🌟 About Cinestream Nova

**CINESTREAM NOVA** is a modern, distraction-free web streaming platform engineered to deliver an ultra-premium cinematic experience without disruptive pop-up advertisements. It seamlessly blends a lavish *dark-cinema aesthetic*, editorial typography (*Bebas Neue*, *Plus Jakarta Sans*, *Montserrat*), and fluid micro-interactions powered by *Framer Motion*.

Now in its **Full Production Release**, Cinestream guarantees high reliability, automatic player server recovery, organized cross-season episode progression, and a meticulously crafted responsive interface tailored for Desktop, Tablet, and Mobile devices (PWA).

---

## 🚀 What's New in Full Release (Feature Updates & Highlights)

Here is a comprehensive summary of key feature updates, architectural innovations, and refinements shipped leading up to and included in this Full Release:

### 1. 💬 Danmaku Floating Timed Comments (New Feature)
- **Real-Time Synchronized Bullet Comments**: Viewers can post timestamped reactions and commentary that fly horizontally across the video canvas in sync with the playback time.
- **Smart Anti-Duplication Engine**: Ensures comments submitted by the user appear instantaneously on-screen exactly once without duplicate lanes or conflicting dot colors.
- **In-Player Quick Toggle**: Easily switch Danmaku visibility on or off anytime via a dedicated HUD button without interrupting video playback.
- **Cloud & Local Persistence**: Timed comments are saved instantly to local storage and synchronized with Cloud Supabase so other viewers can experience community reactions.

### 2. 📅 Airing Schedule & Episode Countdown (Accurate Release Times)
- **Live Ongoing Broadcast Calendar**: A dedicated airing schedule calendar tracking ongoing TV series, K-dramas, and anime broadcasts.
- **Exact Release Hour & Countdown Badges**: Equipped with precise release timestamps and interactive countdown badges (`EpisodeCountdownBadge`) informing viewers exactly when the next episode drops.
- **Clean Deduplication**: Eliminates duplicate titles across different dates and during *load more* pagination for a clean, organized browsing experience.

### 3. 🎭 AI CineFinder & Mood Picker (Diverse & Smart Discovery)
- **Multi-Option Mood Picker**: Recommends varied, handpicked movies and series matching your current vibe (Chill, Thrill, Laugh, Cry, Mind-Bending, etc.) with real title diversity rather than repeated selections.
- **AI CineFinder**: Natural-language semantic search engine powered by AI that surfaces films based on storyline descriptions, plot twists, or specific thematic prompts.

### 4. 👤 User Profiles & Shareable Public Profile Cards
- **Persona & Cinema Palette Customization**: Choose from diverse emoji personas, monogram initials, and luxurious color themes (*Netflix Crimson, Cyberpunk Neon, Golden Luxury, Emerald Oasis, etc.*).
- **Public Profile Cards (/u/:username)**: Modern profile cards highlighting watch stats, watchlist counts, and completed titles, shareable with 1-click links or QR codes.
- **Refined Navigation & Toggle State**: Perfected dropdown toggle-close behavior when clicking the profile avatar, zero-overlap banner layouts, and modal dismiss handling.

### 5. 🎬 Refined Hero Banner & Cinematic Player Experience
- **Unobstructed Trailer View**: Lowered highlight text placement and reduced bottom black gradient height (from 70% down to 36%) so background trailer footage is wide, bright, and clearly visible.
- **Streamlined Action Bar**: Removed redundant buttons on media detail action rows to keep essential controls (*Add to Watchlist, Watch Trailer, Share*) focused and elegant.
- **Calibrated Autoplay Next Episode**: Intelligent credit-detection triggers next episode countdown seamlessly based on content duration.
- **Floating PiP Mini Player**: Draggable, snappable mini player with magnetic 4-corner docking and autoscaling subtitles.

### 6. 📱 PWA Engine v1.4.4 & Hot Cache-Busting
- **Instant Version Sync**: Automatic Service Worker update detection alerts users and provides 1-click *Hard Reload*, preventing stale cache issues across all PWA devices and mobile browsers.
- **Mobile Native Adaptation**: Comprehensive safe-area insets optimization for edge-to-edge screens, notches, and navigation bars.

### 7. 📱 Cinestream App (APK Download & Android TV)
- **Direct APK Distribution**: One-click download for `Cinestream-v1.4.4.apk` with live QR code scanning for seamless mobile sideloading.
- **Big Screen & Android TV Ready**: Fully compatible with Android TV, Mi Box, and Smart TVs with native remote control D-pad navigation.
- **Dedicated App Portal (/app)**: Comprehensive installation walkthroughs for Android (APK), Android TV, and Apple iOS (Safari PWA).

---

## ✨ Key Features Overview

| Category | Highlights & Capabilities |
| :--- | :--- |
| **Streaming Engine** | Multi-server automated failover, real-time latency monitoring, 1080p playback, seamless audio synchronization. |
| **Interactivity & Social** | Danmaku floating timed comments, Serverless P2P Watch Party (WebRTC) with synchronized playback and in-player chat. |
| **Series & Episodes** | Cross-season progression, in-player episode drawer, consolidated series cards in viewing history (*Watched Tab*). |
| **Personalization** | Custom profile personas & color themes, Cloud sync (Supabase), personalized watchlists & history tracking. |
| **Localization & Audio** | 100% Bilingual (English & Indonesian), dynamic auto-translated synopses, synthetic Web Audio API sound effects without external files. |

---

## ⌨️ Keyboard Shortcuts

Enjoy complete playback control directly from your keyboard:

| Key | Player Action |
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
| <kbd>Esc</kbd> | Exit Fullscreen / Close Dialog Modals |

---

## 🛠️ Technologies & Stack

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with custom luxury cinema palettes
- **Animation Engine**: [Framer Motion 13](https://www.framer.com/motion/)
- **Iconography**: [Lucide React](https://lucide.dev/)
- **P2P Networking**: [PeerJS](https://peerjs.com/) (WebRTC Data & Media Channels)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Cloud Sync)
- **PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) (Workbox Service Worker)
- **Metadata Aggregation**: TMDB API, TVMaze, OMDb

---

## 📄 License & Disclaimer

Distributed under the **MIT License**.

> **⚠️ Educational Disclaimer:**  
> **CINESTREAM NOVA** is developed as an open-source technical exploration of modern frontend web engineering, WebRTC peer-to-peer interactivity, and digital cinematic interface design. All movie and television metadata are retrieved from publicly accessible open APIs (such as TMDB and TVMaze).
