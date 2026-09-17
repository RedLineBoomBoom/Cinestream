import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Info,
  ExternalLink,
  Star,
  Sparkles,
  Film,
  Tv,
  Loader2,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { fetchFullMediaItem } from '../../services/tmdb';
import { createMovieServers, createTvServers } from '../../data/mockCatalog';

interface ThematicShowcaseProps {
  onPlayMedia: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
}

interface ShowcaseMediaDef {
  id: number | string;
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  genre: string;
  tagline?: string;
  synopsis: string;
}

interface GenreCategory {
  id: string;
  name: string;
  nameId: string;
  items: ShowcaseMediaDef[];
}

interface ThematicBannerDef {
  id: string;
  titleEn: string;
  titleId: string;
  taglineEn: string;
  taglineId: string;
  bgGradient: string;
  accentGlow: string;
  borderAccent: string;
  characterArt: string;
  characterAlt: string;
  items: ShowcaseMediaDef[];
}

// Fallback image constants ensuring no card is ever a blank void
const FALLBACK_BACKDROP =
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80';
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

// ─────────────────────────────────────────────────────────────
// DATA: "Discover The Best Of" by Genres (100% Verified TMDB CDN)
// ─────────────────────────────────────────────────────────────
const DISCOVER_GENRES: GenreCategory[] = [
  {
    id: 'drama',
    name: 'Drama',
    nameId: 'Drama',
    items: [
      {
        id: 'tv-94997',
        tmdbId: 94997,
        type: 'tv',
        title: 'House of the Dragon',
        poster: 'https://image.tmdb.org/t/p/w500/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/577eXC8wFQT0eUrJcgznSiFPRmk.jpg',
        year: 2022,
        rating: 8.4,
        genre: 'Drama, Fantasi',
        synopsis: 'Perang saudara berdarah klan Targaryen memperebutkan Tahta Besi di Westeros.',
      },
      {
        id: 'tv-111803',
        tmdbId: 111803,
        type: 'tv',
        title: 'The White Lotus',
        poster: 'https://image.tmdb.org/t/p/w500/gbSaK9v1CbcYH1ISgbM7XObD2dW.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/qVBIAcZkK5j6WRq7JehJcOMbdgb.jpg',
        year: 2021,
        rating: 7.6,
        genre: 'Drama, Komedi Hitam',
        synopsis: 'Skandal dan intrik para tamu kaya di resor tropis mewah nan penuh rahasia gelap.',
      },
      {
        id: 'tv-250307',
        tmdbId: 250307,
        type: 'tv',
        title: 'The Pitt',
        poster: 'https://image.tmdb.org/t/p/w500/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg',
        year: 2025,
        rating: 8.7,
        genre: 'Drama Medis, Realistis',
        synopsis: 'Dedikasi tanpa henti para dokter unit gawat darurat Pittsburgh menyelamatkan nyawa.',
      },
      {
        id: 'tv-85552',
        tmdbId: 85552,
        type: 'tv',
        title: 'Euphoria',
        poster: 'https://image.tmdb.org/t/p/w500/ypmtwojDd751Peszi62DVLytqqC.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/mez2Z3WqlPKNXpi7mWoiiE5guE9.jpg',
        year: 2019,
        rating: 8.3,
        genre: 'Drama Remaja, Intrik',
        synopsis: 'Pencarian jati diri, cinta, dan luka remaja di tengah gemerlap dunia modern.',
      },
      {
        id: 'tv-100088',
        tmdbId: 100088,
        type: 'tv',
        title: 'The Last of Us',
        poster: 'https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
        year: 2023,
        rating: 8.4,
        genre: 'Drama, Post-Apokaliptik',
        synopsis: 'Perjalanan berbahaya Joel dan Ellie melintasi Amerika yang hancur demi secercah harapan.',
      },
      {
        id: 'tv-194764',
        tmdbId: 194764,
        type: 'tv',
        title: 'The Penguin',
        poster: 'https://image.tmdb.org/t/p/w500/vOWcqC4oDQws1doDWLO7d3dh5qc.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/4TdmuuwiIiKw3JOjIuhdgYxRXnN.jpg',
        year: 2024,
        rating: 8.3,
        genre: 'Drama Kriminal, Noir',
        synopsis: 'Oswald Cobb merayap merebut tahta penguasa dunia hitam Kota Gotham pasca banjir besar.',
      },
    ],
  },
  {
    id: 'comedy',
    name: 'Comedy',
    nameId: 'Komedi',
    items: [
      {
        id: 'tv-1668',
        tmdbId: 1668,
        type: 'tv',
        title: 'Friends',
        poster: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg',
        year: 1994,
        rating: 8.4,
        genre: 'Komedi, Sitkom Klasik',
        synopsis: 'Kisah kocak dan hangat enam sahabat mengarungi lika-liku hidup dan cinta di New York.',
      },
      {
        id: 'tv-1418',
        tmdbId: 1418,
        type: 'tv',
        title: 'The Big Bang Theory',
        poster: 'https://image.tmdb.org/t/p/w500/euKFiO5M125rpngFRBbSW83beeI.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/rwYvhVv0vwbulMwxOfEsuAr1JrT.jpg',
        year: 2007,
        rating: 7.9,
        genre: 'Komedi, Sitkom Genius',
        synopsis: 'Keseruan hidup para fisikawan kutu buku saat bertetangga dengan gadis pirang ceria.',
      },
      {
        id: 'tv-124834',
        tmdbId: 124834,
        type: 'tv',
        title: 'Hacks',
        poster: 'https://image.tmdb.org/t/p/w500/dQc0QbDiHjGmWxTfKtBgYtS4bj5.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/8cpXau1LjYMBjiaHUS75JmlgGsU.jpg',
        year: 2021,
        rating: 8.6,
        genre: 'Komedi, Showbiz',
        synopsis: 'Kolaborasi tak terduga antara komedian senior Las Vegas dan penulis muda yang bermasalah.',
      },
      {
        id: 'tv-97546',
        tmdbId: 97546,
        type: 'tv',
        title: 'Ted Lasso',
        poster: 'https://image.tmdb.org/t/p/w500/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/nE94ejEbzNCU48bW1oju0dqBONz.jpg',
        year: 2020,
        rating: 8.4,
        genre: 'Komedi, Olahraga Hangat',
        synopsis: 'Pelatih sepak bola Amerika dengan optimisme membara mengasuh tim sepak bola Inggris.',
      },
      {
        id: 'tv-60573',
        tmdbId: 60573,
        type: 'tv',
        title: 'Silicon Valley',
        poster: 'https://image.tmdb.org/t/p/w500/4ptpmWBVD9HY9hMh8Cbs6SMiy7p.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/4pfXAnWxOfEJsUgDPW0zqzs5UWv.jpg',
        year: 2014,
        rating: 8.1,
        genre: 'Komedi Satir, Teknologi',
        synopsis: 'Perjuangan kocak para programmer mendirikan startup kompresi data revolusioner.',
      },
      {
        id: 'tv-71728',
        tmdbId: 71728,
        type: 'tv',
        title: 'Young Sheldon',
        poster: 'https://image.tmdb.org/t/p/w500/kidkbZRBGbsEIrX7pODRSKi9ipl.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/yBfSD3hUCCS2JVlDCRlpivVE7II.jpg',
        year: 2017,
        rating: 8.0,
        genre: 'Komedi Keluarga',
        synopsis: 'Masa kecil jenius Sheldon Cooper di Texas Timur bersama keluarganya yang eksentrik.',
      },
    ],
  },
  {
    id: 'action',
    name: 'Action & Adventure',
    nameId: 'Aksi & Petualangan',
    items: [
      {
        id: 'movie-693134',
        tmdbId: 693134,
        type: 'movie',
        title: 'Dune: Part Two',
        poster: 'https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
        year: 2024,
        rating: 8.1,
        genre: 'Aksi, Sci-Fi Epik',
        synopsis: 'Paul Atreides memimpin kaum Fremen dalam revolusi suci melawan kekaisaran galaksi.',
      },
      {
        id: 'movie-533535',
        tmdbId: 533535,
        type: 'movie',
        title: 'Deadpool & Wolverine',
        poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
        year: 2024,
        rating: 7.6,
        genre: 'Aksi, Komedi Superhero',
        synopsis: 'Wade Wilson dan Wolverine bersatu demi menyelamatkan alam semesta dalam aksi kocak nan brutal.',
      },
      {
        id: 'tv-126308',
        tmdbId: 126308,
        type: 'tv',
        title: 'Shōgun',
        poster: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg',
        year: 2024,
        rating: 8.4,
        genre: 'Aksi, Sejarah Samurai',
        synopsis: 'Ketegangan politik dan pedang di era feodal Jepang antara Lord Toranaga dan sekutunya.',
      },
      {
        id: 'movie-414906',
        tmdbId: 414906,
        type: 'movie',
        title: 'The Batman',
        poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg',
        year: 2022,
        rating: 7.7,
        genre: 'Aksi Kriminal, Detektif',
        synopsis: 'Sang Ksatria Kegelapan menyelidiki jejak teka-teki mematikan The Riddler di Gotham.',
      },
      {
        id: 'movie-603692',
        tmdbId: 603692,
        type: 'movie',
        title: 'John Wick: Chapter 4',
        poster: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
        year: 2023,
        rating: 7.7,
        genre: 'Aksi Bela Diri, Neo-Noir',
        synopsis: 'John Wick menghadapi High Table dengan aliansi baru dalam perang hidup dan mati di seluruh dunia.',
      },
      {
        id: 'movie-558449',
        tmdbId: 558449,
        type: 'movie',
        title: 'Gladiator II',
        poster: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/tOqIwliWMovSIZ9DyvHcHI7p2im.jpg',
        year: 2024,
        rating: 6.6,
        genre: 'Aksi, Kolosal Romawi',
        synopsis: 'Lucius memasuki Colosseum demi kehormatan dan kebebasan Roma dari tirani kaisar.',
      },
    ],
  },
  {
    id: 'scifi',
    name: 'Sci-Fi & Fantasy',
    nameId: 'Sci-Fi & Fantasi',
    items: [
      {
        id: 'movie-157336',
        tmdbId: 157336,
        type: 'movie',
        title: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
        year: 2014,
        rating: 8.5,
        genre: 'Sci-Fi, Petualangan Angkasa',
        synopsis: 'Misi melintasi lubang cacing antar-galaksi demi menemukan rumah baru bagi umat manusia.',
      },
      {
        id: 'tv-106379',
        tmdbId: 106379,
        type: 'tv',
        title: 'Fallout',
        poster: 'https://image.tmdb.org/t/p/w500/c15BtJxCXMrISLVmysdsnZUPQft.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg',
        year: 2024,
        rating: 8.1,
        genre: 'Sci-Fi, Post-Apokaliptik',
        synopsis: 'Penghuni bunker bawah tanah menghadapi keanehan dunia luar bumi yang terdistorsi radiasi nuklir.',
      },
      {
        id: 'tv-95557',
        tmdbId: 95557,
        type: 'tv',
        title: 'Severance',
        poster: 'https://image.tmdb.org/t/p/w500/4tblBrslcKSifMVZ3TmtT2ukMor.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/9qrroces8C6R9aKr08hACNPVXdZ.jpg',
        year: 2022,
        rating: 8.6,
        genre: 'Sci-Fi Misteri, Thriller',
        synopsis: 'Prosedur pemisahan memori kerja dan pribadi membuka misteri konspirasi menyeramkan.',
      },
      {
        id: 'tv-63247',
        tmdbId: 63247,
        type: 'tv',
        title: 'Westworld',
        poster: 'https://image.tmdb.org/t/p/w500/ALlSU9du9iRiKIIoY1sREGNqQ5.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/rX5hvSRB2k4YoIvRg6Zky52rWk0.jpg',
        year: 2016,
        rating: 8.0,
        genre: 'Sci-Fi, AI & Kesadaran',
        synopsis: 'Taman hiburan berteknologi kecerdasan buatan mengalami kebangkitan kesadaran sintetis.',
      },
      {
        id: 'tv-66732',
        tmdbId: 66732,
        type: 'tv',
        title: 'Stranger Things',
        poster: 'https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        year: 2016,
        rating: 8.6,
        genre: 'Sci-Fi Retro, Misteri',
        synopsis: 'Anak-anak Hawkins berhadapan dengan dimensi terbalik Upside Down dan monster supernatural.',
      },
      {
        id: 'movie-19995',
        tmdbId: 19995,
        type: 'movie',
        title: 'Avatar',
        poster: 'https://image.tmdb.org/t/p/w500/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg',
        year: 2009,
        rating: 7.6,
        genre: 'Sci-Fi, Visual Spektakuler',
        synopsis: 'Jake Sully membaur dengan suku Na\'vi di planet Pandora yang elok nan berbahaya.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: 5 Thematic Curated Banners (6 Curated Titles Each)
// ─────────────────────────────────────────────────────────────
const THEMATIC_BANNERS: ThematicBannerDef[] = [
  {
    id: 'groundbreaking-series',
    titleEn: 'Groundbreaking Series',
    titleId: 'Serial Fenomenal',
    taglineEn: 'Emmy-winning masterpieces and prestige storytelling',
    taglineId: 'Karya peraih Emmy dengan narasi sinematik terbaik',
    bgGradient: 'from-[#380b18]/80 via-[#1b060d]/90 to-[#0c0407]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(225,29,72,0.3)]',
    borderAccent: 'border-rose-900/30 hover:border-rose-500/40',
    characterArt: 'https://image.tmdb.org/t/p/w780/577eXC8wFQT0eUrJcgznSiFPRmk.jpg',
    characterAlt: 'House of the Dragon Characters',
    items: [
      {
        id: 'tv-100088',
        tmdbId: 100088,
        type: 'tv',
        title: 'The Last of Us',
        poster: 'https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
        year: 2023,
        rating: 8.4,
        genre: 'Drama, Apokaliptik',
        synopsis: 'Perjalanan berbahaya Joel dan Ellie melintasi sisa-sisa peradaban manusia yang hancur pasca wabah jamur.',
      },
      {
        id: 'tv-111803',
        tmdbId: 111803,
        type: 'tv',
        title: 'The White Lotus',
        poster: 'https://image.tmdb.org/t/p/w500/gbSaK9v1CbcYH1ISgbM7XObD2dW.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/qVBIAcZkK5j6WRq7JehJcOMbdgb.jpg',
        year: 2021,
        rating: 7.6,
        genre: 'Drama, Satir',
        synopsis: 'Kemelut intrik para tamu berduit dan rahasia gelap para pegawai di resor tropis mewah.',
      },
      {
        id: 'tv-250307',
        tmdbId: 250307,
        type: 'tv',
        title: 'The Pitt',
        poster: 'https://image.tmdb.org/t/p/w500/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg',
        year: 2025,
        rating: 8.7,
        genre: 'Drama, Medis',
        synopsis: 'Perjuangan para tenaga medis di unit gawat darurat tersibuk menyelamatkan nyawa di garis depan.',
      },
      {
        id: 'tv-76331',
        tmdbId: 76331,
        type: 'tv',
        title: 'Succession',
        poster: 'https://image.tmdb.org/t/p/w500/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/d87JXX3DLkRJMfm5StCmmnmhHuX.jpg',
        year: 2018,
        rating: 8.3,
        genre: 'Drama, Bisnis & Politik',
        synopsis: 'Intrik perebutan tahta kekuasaan dinasti media raksasa keluarga Roy yang kejam dan tak terduga.',
      },
      {
        id: 'tv-46648',
        tmdbId: 46648,
        type: 'tv',
        title: 'True Detective',
        poster: 'https://image.tmdb.org/t/p/w500/cuV2O5ZyDLHSOWzg3nLVljp1ubw.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/v8YFr8BbU9qsO8PYIulzTeM6Qk.jpg',
        year: 2014,
        rating: 8.3,
        genre: 'Drama Kriminal, Neo-Noir',
        synopsis: 'Penyelidikan kasus pembunuhan misterius penuh teka-teki gelap di pelosok wilayah Amerika.',
      },
      {
        id: 'tv-200875',
        tmdbId: 200875,
        type: 'tv',
        title: 'IT: Welcome to Derry',
        poster: 'https://image.tmdb.org/t/p/w500/nyy3BITeIjviv6PFIXtqvc8i6xi.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2fOKVDoc2O3eZmBZesWPuE5kgPN.jpg',
        year: 2025,
        rating: 8.2,
        genre: 'Horor, Misteri',
        synopsis: 'Asal-usul teror Pennywise di kota Derry tahun 1960-an sebelum peristiwa film IT dimulai.',
      },
    ],
  },
  {
    id: 'blockbuster-movies',
    titleEn: 'Blockbuster Movies',
    titleId: 'Film Terlaris Dunia',
    taglineEn: 'Epic spectacles, colossal heroes, and unforgettable action',
    taglineId: 'Koleksi film layar lebar termegah penuh aksi spektakuler',
    bgGradient: 'from-[#854d0e]/75 via-[#451a03]/85 to-[#0f0703]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(245,158,11,0.3)]',
    borderAccent: 'border-amber-900/30 hover:border-amber-500/40',
    characterArt: 'https://image.tmdb.org/t/p/w780/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    characterAlt: 'Dune Characters',
    items: [
      {
        id: 'movie-1061474',
        tmdbId: 1061474,
        type: 'movie',
        title: 'Superman',
        poster: 'https://image.tmdb.org/t/p/w500/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/yRBc6WY3r1Fz5Cjd6DhSvzqunED.jpg',
        year: 2025,
        rating: 7.3,
        genre: 'Aksi, Superhero',
        synopsis: 'Awal era baru sang Man of Steel arahan sutradara James Gunn dalam kisah kepahlawanan modern.',
      },
      {
        id: 'movie-693134',
        tmdbId: 693134,
        type: 'movie',
        title: 'Dune: Part Two',
        poster: 'https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
        year: 2024,
        rating: 8.1,
        genre: 'Aksi, Sci-Fi Epik',
        synopsis: 'Paul Atreides memimpin kaum Fremen dalam revolusi suci melawan kekaisaran galaksi di gurun Arrakis.',
      },
      {
        id: 'movie-533535',
        tmdbId: 533535,
        type: 'movie',
        title: 'Deadpool & Wolverine',
        poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
        year: 2024,
        rating: 7.6,
        genre: 'Aksi, Komedi Superhero',
        synopsis: 'Wade Wilson dan Wolverine bekerja sama menyelamatkan multiverse dengan aksi brutal dan kocak.',
      },
      {
        id: 'movie-575265',
        tmdbId: 575265,
        type: 'movie',
        title: 'Mission: Impossible - The Final Reckoning',
        poster: 'https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/538U9snNc2fpnOmYXAPUh3zn31H.jpg',
        year: 2025,
        rating: 7.2,
        genre: 'Aksi, Spionase',
        synopsis: 'Misi pamungkas Ethan Hunt menghentikan kecerdasan buatan The Entity demi nasib peradaban dunia.',
      },
      {
        id: 'movie-1234821',
        tmdbId: 1234821,
        type: 'movie',
        title: 'Jurassic World Rebirth',
        poster: 'https://image.tmdb.org/t/p/w500/1RICxzeoNCAO5NpcRMIgg1XT6fm.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/zNriRTr0kWwyaXPzdg1EIxf0BWk.jpg',
        year: 2025,
        rating: 6.3,
        genre: 'Aksi, Dinosaurus',
        synopsis: 'Operasi rahasia mengamankan materi genetik purba dari pulau predator raksasa paling berbahaya.',
      },
      {
        id: 'movie-1233413',
        tmdbId: 1233413,
        type: 'movie',
        title: 'Sinners',
        poster: 'https://image.tmdb.org/t/p/w500/fWPgbnt2LSqkQ6cdQc0SZN9CpLm.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/nAxGnGHOsfzufThz20zgmRwKur3.jpg',
        year: 2025,
        rating: 7.5,
        genre: 'Horor, Aksi Thriller',
        synopsis: 'Kisah saudara kembar berhadapan dengan teror kegelapan supranatural di tanah kelahiran mereka.',
      },
    ],
  },
  {
    id: 'iconic-hits',
    titleEn: 'Iconic Hits',
    titleId: 'Karya Ikonik Abadi',
    taglineEn: 'Timeless pop culture legends and binge-worthy phenomena',
    taglineId: 'Legenda budaya pop yang tak lekang oleh waktu',
    bgGradient: 'from-[#1e293b]/85 via-[#0f172a]/90 to-[#040812]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(96,165,250,0.25)]',
    borderAccent: 'border-slate-800/40 hover:border-sky-500/40',
    characterArt: 'https://image.tmdb.org/t/p/w780/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg',
    characterAlt: 'Game of Thrones Characters',
    items: [
      {
        id: 'tv-1668',
        tmdbId: 1668,
        type: 'tv',
        title: 'Friends',
        poster: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg',
        year: 1994,
        rating: 8.4,
        genre: 'Sitkom Komedi',
        synopsis: 'Persahabatan abadi enam kawan mengarungi lika-liku hidup dan asmara di New York.',
      },
      {
        id: 'tv-1418',
        tmdbId: 1418,
        type: 'tv',
        title: 'The Big Bang Theory',
        poster: 'https://image.tmdb.org/t/p/w500/euKFiO5M125rpngFRBbSW83beeI.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/rwYvhVv0vwbulMwxOfEsuAr1JrT.jpg',
        year: 2007,
        rating: 7.9,
        genre: 'Sitkom Genius',
        synopsis: 'Humor sains dan persahabatan Sheldon, Leonard, dan kawan-kawan saat bertetangga dengan Penny.',
      },
      {
        id: 'tv-1396',
        tmdbId: 1396,
        type: 'tv',
        title: 'Breaking Bad',
        poster: 'https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        year: 2008,
        rating: 8.9,
        genre: 'Drama Kriminal Legendaris',
        synopsis: 'Transformasi dramatis guru kimia yang terdesak menjadi raja obat bius terhebat demi keluarganya.',
      },
      {
        id: 'tv-1399',
        tmdbId: 1399,
        type: 'tv',
        title: 'Game of Thrones',
        poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg',
        year: 2011,
        rating: 8.5,
        genre: 'Fantasi Epik',
        synopsis: 'Perebutan Tahta Besi di benua Westeros yang penuh intrik politik dan perang naga berdarah.',
      },
      {
        id: 'movie-155',
        tmdbId: 155,
        type: 'movie',
        title: 'The Dark Knight',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg',
        year: 2008,
        rating: 8.5,
        genre: 'Aksi Kriminal, Masterpiece',
        synopsis: 'Pertarungan fisik dan psikologis sang Ksatria Kegelapan menghadapi anarki The Joker di Gotham.',
      },
      {
        id: 'movie-120',
        tmdbId: 120,
        type: 'movie',
        title: 'The Lord of the Rings: The Fellowship of the Ring',
        poster: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/oiwc338EoBgS4sEI2ixAny4KQKg.jpg',
        year: 2001,
        rating: 8.4,
        genre: 'Fantasi Epik',
        synopsis: 'Perjalanan epik Frodo Baggins bersama Persaudaraan Cincin demi menghancurkan Cincin Utama di Mordor.',
      },
    ],
  },
  {
    id: 'real-life-stories',
    titleEn: 'Real-life Stories',
    titleId: 'Kisah Nyata & Dokumenter',
    taglineEn: 'Riveting documentaries, unscripted reality, and true legends',
    taglineId: 'Dokumenter memikat, realita nyata, dan kisah inspiratif',
    bgGradient: 'from-[#075985]/70 via-[#0c2e4e]/85 to-[#020b14]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(14,165,233,0.25)]',
    borderAccent: 'border-cyan-900/30 hover:border-cyan-500/40',
    characterArt: 'https://image.tmdb.org/t/p/w780/8rft8A9nH43IReybFtYt21ezfMK.jpg',
    characterAlt: 'Harry Potter 20th Anniversary',
    items: [
      {
        id: 'movie-872585',
        tmdbId: 872585,
        type: 'movie',
        title: 'Oppenheimer',
        poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/7CENyUim29IEsaJhUxIGymCRvPu.jpg',
        year: 2023,
        rating: 8.0,
        genre: 'Biopik, Sejarah & Drama',
        synopsis: 'Kisah J. Robert Oppenheimer memimpin Proyek Manhattan dan pergulatan moral senjata pemusnah massal.',
      },
      {
        id: 'tv-87108',
        tmdbId: 87108,
        type: 'tv',
        title: 'Chernobyl',
        poster: 'https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg',
        year: 2019,
        rating: 8.7,
        genre: 'Sejarah, Drama Bencana',
        synopsis: 'Kisah nyata kepahlawanan dan pengorbanan manusia di balik ledakan reaktor nuklir terburuk dalam sejarah.',
      },
      {
        id: 'tv-4614',
        tmdbId: 4614,
        type: 'tv',
        title: 'Band of Brothers',
        poster: 'https://image.tmdb.org/t/p/w500/mBcu8d6x6zB1el3MPNl7cZQEQ31.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/c1aBrG5s5xFa6Tbnihu2Hhj4t2q.jpg',
        year: 2001,
        rating: 8.5,
        genre: 'Sejarah Perang Dunia II',
        synopsis: 'Perjuangan nyata kompi terjun payung Easy Company dalam pertempuran sengit PD II di tanah Eropa.',
      },
      {
        id: 'movie-899082',
        tmdbId: 899082,
        type: 'movie',
        title: 'Harry Potter 20th Anniversary: Return to Hogwarts',
        poster: 'https://image.tmdb.org/t/p/w500/jntLBq0MLR3hrwKaTQswxACRPMs.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/8rft8A9nH43IReybFtYt21ezfMK.jpg',
        year: 2022,
        rating: 7.3,
        genre: 'Dokumenter Reuni',
        synopsis: 'Reuni magis para pemeran legendaris di Aula Utama Hogwarts mengenang 20 tahun keajaiban film.',
      },
      {
        id: 'tv-61818',
        tmdbId: 61818,
        type: 'tv',
        title: '90 Day Fiancé',
        poster: 'https://image.tmdb.org/t/p/w500/u8VruEGv7mtyJihVn2CSA1u90pk.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/dfX2UaHVE5c7kLBFbgmEZJuy4Ev.jpg',
        year: 2014,
        rating: 6.7,
        genre: 'Reality Show',
        synopsis: 'Dinamika cinta dan drama pasangan lintas negara dalam tenggat visa K-1 selama 90 hari.',
      },
      {
        id: 'tv-17937',
        tmdbId: 17937,
        type: 'tv',
        title: 'Ghost Adventures',
        poster: 'https://image.tmdb.org/t/p/w500/xLJZuDxdeUqRFHFlqs0mIk9faMR.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/u64huzTnF3jEYUXJ4BDlpHy2L3K.jpg',
        year: 2008,
        rating: 7.4,
        genre: 'Paranormal Realita',
        synopsis: 'Investigasi langsung ke lokasi-lokasi paling berhantu di dunia oleh Zak Bagans dan kru paranormal.',
      },
    ],
  },
  {
    id: 'family-favorites',
    titleEn: 'Family Favorites',
    titleId: 'Favorit Keluarga & Animasi',
    taglineEn: 'Heartwarming animated adventures and delightful fun for all ages',
    taglineId: 'Petualangan animasi hangat dan tontonan seru seluruh keluarga',
    bgGradient: 'from-[#a16207]/75 via-[#713f12]/80 to-[#120a02]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(234,179,8,0.3)]',
    borderAccent: 'border-yellow-900/30 hover:border-yellow-500/40',
    characterArt: 'https://image.tmdb.org/t/p/w780/pe4B3OYBb7qYCdkAz7nKWordbls.jpg',
    characterAlt: 'Adventure Time & Cartoon Characters',
    items: [
      {
        id: 'movie-1022789',
        tmdbId: 1022789,
        type: 'movie',
        title: 'Inside Out 2',
        poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg',
        year: 2024,
        rating: 7.5,
        genre: 'Animasi, Keluarga & Emosi',
        synopsis: 'Riley memasuki masa remaja dengan emosi-emosi baru yang mengambil alih ruang kendali di kepalanya.',
      },
      {
        id: 'movie-1184918',
        tmdbId: 1184918,
        type: 'movie',
        title: 'The Wild Robot',
        poster: 'https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/1pmXyN3sKeYoUhu5VBZiDU4BX21.jpg',
        year: 2024,
        rating: 8.3,
        genre: 'Animasi, Petualangan Menyentuh',
        synopsis: 'Robot Roz terdampar di pulau liar dan menjalin ikatan kasih menyentuh dengan seekor anak angsa yatim.',
      },
      {
        id: 'movie-1087192',
        tmdbId: 1087192,
        type: 'movie',
        title: 'How to Train Your Dragon',
        poster: 'https://image.tmdb.org/t/p/w500/53dsJ3oEnBhTBVMigWJ9tkA5bzJ.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg',
        year: 2025,
        rating: 7.9,
        genre: 'Fantasi, Petualangan',
        synopsis: 'Persahabatan magis Hiccup dan naga Toothless mengubah takdir Pulau Berk selamanya.',
      },
      {
        id: 'movie-1175942',
        tmdbId: 1175942,
        type: 'movie',
        title: 'The Bad Guys 2',
        poster: 'https://image.tmdb.org/t/p/w500/26oSPnq0ct59l07QOXZKyzsiRtN.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/jvpkBenB6hv19WWYVlaiow8zklq.jpg',
        year: 2025,
        rating: 7.6,
        genre: 'Animasi, Komedi Heist',
        synopsis: 'Geng Bad Guys berusaha menjadi pahlawan sebelum terseret misi pencurian baru yang mendebarkan.',
      },
      {
        id: 'movie-950387',
        tmdbId: 950387,
        type: 'movie',
        title: 'A Minecraft Movie',
        poster: 'https://image.tmdb.org/t/p/w500/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
        year: 2025,
        rating: 6.2,
        genre: 'Keluarga, Petualangan',
        synopsis: 'Empat orang terlempar ke Overworld kotak-kotak bersama Steve sang ahli merakit legendaris.',
      },
      {
        id: 'tv-15260',
        tmdbId: 15260,
        type: 'tv',
        title: 'Adventure Time',
        poster: 'https://image.tmdb.org/t/p/w500/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/pe4B3OYBb7qYCdkAz7nKWordbls.jpg',
        year: 2010,
        rating: 8.5,
        genre: 'Animasi, Fantasi Ajaib',
        synopsis: 'Petualangan surreal Finn si bocah petualang dan Jake si anjing ajaib di Negeri Ooo yang penuh keajaiban.',
      },
    ],
  },
];

export const ThematicShowcase: React.FC<ThematicShowcaseProps> = ({
  onPlayMedia,
  onOpenDetails,
}) => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();

  const [selectedGenreIndex, setSelectedGenreIndex] = useState(0);
  const [loadingMediaId, setLoadingMediaId] = useState<string | number | null>(null);

  const activeGenre = DISCOVER_GENRES[selectedGenreIndex] || DISCOVER_GENRES[0];

  const handlePrevGenre = () => {
    playClick();
    setSelectedGenreIndex((prev) => (prev > 0 ? prev - 1 : DISCOVER_GENRES.length - 1));
  };

  const handleNextGenre = () => {
    playClick();
    setSelectedGenreIndex((prev) => (prev < DISCOVER_GENRES.length - 1 ? prev + 1 : 0));
  };

  // Resolve item to full playable MediaItem with fallback
  const handleItemAction = async (
    item: ShowcaseMediaDef,
    action: 'play' | 'details'
  ) => {
    playClick();
    setLoadingMediaId(item.id);

    try {
      const fullMedia = await fetchFullMediaItem(item.tmdbId, item.type);
      if (fullMedia) {
        if (action === 'play') {
          onPlayMedia(fullMedia);
        } else {
          onOpenDetails(fullMedia);
        }
        return;
      }
    } catch (err) {
      console.warn('Failed to resolve TMDB item:', err);
    } finally {
      setLoadingMediaId(null);
    }

    // Fallback: construct instant MediaItem
    const isMovie = item.type === 'movie';
    const fallbackMedia: MediaItem = {
      id: `${item.type}-${item.tmdbId}`,
      tmdbId: item.tmdbId,
      title: item.title,
      type: isMovie ? 'movie' : 'series',
      poster: item.poster,
      backdrop: item.backdrop,
      rating: item.rating,
      year: item.year,
      releaseDate: String(item.year),
      duration: isMovie ? '120 min' : '45 min',
      quality: '1080p FHD',
      ageRating: '13+',
      genres: item.genre.split(',').map((g) => g.trim()),
      country: 'United States',
      director: 'Warner Bros / HBO Discovery',
      cast: [],
      audioTracks: ['English (Original)', 'Indonesian'],
      subtitles: ['Indonesia', 'English'],
      synopsis: item.synopsis,
      servers: isMovie ? createMovieServers(item.tmdbId) : createTvServers(item.tmdbId, 1, 1),
    };

    if (action === 'play') {
      onPlayMedia(fallbackMedia);
    } else {
      onOpenDetails(fallbackMedia);
    }
  };

  return (
    <section className="relative w-full py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-12 overflow-hidden">
      {/* ───────────────────────────────────────────────────────── */}
      {/* SECTION 1: "DISCOVER THE BEST OF" (Interactive Genre Hub) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-6 lg:px-12 3xl:px-16 space-y-4 sm:space-y-6">
        {/* Header with Title & Genre Switcher */}
        <div className="flex flex-col items-center text-center space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-[10px] sm:text-[11px] font-sans tracking-[0.2em] sm:tracking-[0.25em] text-brand-champagne uppercase font-medium">
            <Sparkles className="w-3 h-3 text-brand-gold" />
            <span>{language === 'en' ? 'Curated Selection' : 'Pilihan Paling Populer'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl lg:text-4xl font-display font-medium text-white tracking-wide">
            {language === 'en' ? 'Discover The Best Of' : 'Jelajahi Yang Terbaik'}
          </h2>

          {/* Genre Tabs with Navigation Arrows (Touch-friendly & Responsive) */}
          <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
            <button
              onClick={handlePrevGenre}
              onMouseEnter={playHover}
              className="hidden md:flex p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
              aria-label="Previous Genre"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap mx-auto sm:mx-0">
              {DISCOVER_GENRES.map((g, idx) => {
                const isActive = idx === selectedGenreIndex;
                const displayName = language === 'en' ? g.name : g.nameId;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      playClick();
                      setSelectedGenreIndex(idx);
                    }}
                    onMouseEnter={playHover}
                    className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-black font-semibold shadow-lg shadow-white/10 scale-105'
                        : 'text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextGenre}
              onMouseEnter={playHover}
              className="hidden md:flex p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
              aria-label="Next Genre"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Landscape / Backdrop Grid Cards (2 cols mobile, 2 cols tablet, 3 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
          {activeGenre.items.map((item) => {
            const isLoading = loadingMediaId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleItemAction(item, 'details')}
                onMouseEnter={playHover}
                className="group relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-900 border border-white/[0.08] hover:border-white/30 shadow-lg sm:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              >
                {/* Backdrop Image with onError fallback */}
                <img
                  src={item.backdrop}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = item.poster || FALLBACK_BACKDROP;
                  }}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                />

                {/* Dark Vignette & Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

                {/* Top Badge: Type & Rating */}
                <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between pointer-events-none z-10">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                    <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
                  </span>

                  <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] sm:text-[11px] font-bold text-amber-400">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Bottom Content / Title + Synopsis */}
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-10 space-y-0.5 sm:space-y-1 pr-7 sm:pr-0">
                  <h3 className="text-xs sm:text-sm lg:text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 drop-shadow-md">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-amber-300/90 font-medium">
                    <span>{item.year}</span>
                    <span>•</span>
                    <span className="line-clamp-1 text-slate-300 font-normal">{item.genre}</span>
                  </div>
                  <p className="hidden xs:line-clamp-2 text-[10px] sm:text-[11px] text-slate-300/90 font-light leading-relaxed">
                    {item.synopsis}
                  </p>
                </div>

                {/* Mobile / Tablet Quick-Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemAction(item, 'play');
                  }}
                  className="md:hidden absolute bottom-2 right-2 z-20 w-7 h-7 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                  aria-label="Play Now"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  )}
                </button>

                {/* Desktop Hover Quick-Action Controls */}
                <div className="hidden md:flex absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-center justify-center gap-3 z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemAction(item, 'play');
                    }}
                    className="w-11 h-11 rounded-full bg-[#E50914] hover:bg-[#f40612] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={language === 'en' ? 'Play Now' : 'Putar Sekarang'}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemAction(item, 'details');
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={language === 'en' ? 'View Details' : 'Lihat Detail'}
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <a
                    href={getAbsoluteWatchUrl(String(item.id || item.tmdbId))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer no-underline"
                    title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* SECTION 2: THE 5 HBO MAX-STYLE THEMATIC BANNERS          */}
      {/* (More compact, 6 recommendations per banner, with synopsis) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">
        {THEMATIC_BANNERS.map((banner) => {
          const displayTitle = language === 'en' ? banner.titleEn : banner.titleId;
          const displayTagline = language === 'en' ? banner.taglineEn : banner.taglineId;

          return (
            <div
              key={banner.id}
              className={`relative w-full bg-gradient-to-r ${banner.bgGradient} border-y ${banner.borderAccent} py-5 sm:py-7 lg:py-8 overflow-hidden transition-colors duration-500`}
            >
              {/* Subtle background ambient overlay */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />

              {/* Character Floating Artwork (Scaled compactly) */}
              <div className="absolute -top-3 sm:-top-6 lg:-top-8 -right-2 sm:right-6 lg:right-12 w-28 sm:w-48 lg:w-64 h-28 sm:h-48 lg:h-64 pointer-events-none opacity-15 sm:opacity-20 lg:opacity-25 select-none mix-blend-screen overflow-hidden">
                <img
                  src={banner.characterArt}
                  alt={banner.characterAlt}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_BACKDROP;
                  }}
                  className="w-full h-full object-cover object-center filter contrast-125 brightness-110 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)]"
                />
              </div>

              <div className="relative max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-6 lg:px-12 3xl:px-16 space-y-3.5 sm:space-y-5 z-10">
                {/* Banner Heading */}
                <div className="space-y-0.5 sm:space-y-1 max-w-[80%] sm:max-w-xl">
                  <h3 className="text-base sm:text-xl lg:text-2xl font-display font-medium text-white tracking-wide drop-shadow-md">
                    {displayTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/80 font-light leading-relaxed line-clamp-1 sm:line-clamp-none">
                    {displayTagline}
                  </p>
                </div>

                {/* 6 Poster Cards: Mobile Swipe Carousel, Tablet 3-Col, Desktop 6-Col Grid */}
                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-2.5 -mx-3.5 px-3.5 pb-2 sm:grid sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 sm:gap-3 lg:gap-3.5 sm:mx-0 sm:px-0 sm:pb-0">
                  {banner.items.map((item) => {
                    const isLoading = loadingMediaId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemAction(item, 'details')}
                        onMouseEnter={playHover}
                        className="group relative w-[140px] xs:w-[155px] shrink-0 snap-start sm:w-auto sm:shrink aspect-[2/3] rounded-xl sm:rounded-xl overflow-hidden bg-cinema-950 border border-white/[0.1] hover:border-white/40 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                      >
                        {/* Poster Image with onError fallback */}
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = item.backdrop || FALLBACK_POSTER;
                          }}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-95 group-hover:brightness-105"
                        />

                        {/* Gradient Shadow Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                        {/* Top Rating Badge */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-bold text-amber-400">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>

                        {/* Bottom Information with Title, Metadata, and Synopsis */}
                        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 z-10 space-y-0.5 sm:space-y-1 bg-gradient-to-t from-black/95 via-black/85 to-transparent pt-8 sm:pt-10 pr-7 sm:pr-2.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors drop-shadow">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-amber-300/90 font-medium">
                            <span>{item.year}</span>
                            <span>•</span>
                            <span className="line-clamp-1 text-slate-300 font-normal">{item.genre}</span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-slate-300/90 font-light line-clamp-2 leading-relaxed drop-shadow-sm">
                            {item.synopsis}
                          </p>
                        </div>

                        {/* Mobile / Tablet Quick-Play Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemAction(item, 'play');
                          }}
                          className="md:hidden absolute bottom-2 right-2 z-20 w-6 h-6 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                          aria-label="Play Now"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-white ml-0.5" />
                          )}
                        </button>

                        {/* Desktop Hover Overlay Buttons */}
                        <div className="hidden md:flex absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-center justify-center gap-2 z-20">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemAction(item, 'play');
                            }}
                            className="w-10 h-10 rounded-full bg-[#E50914] hover:bg-[#f40612] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title={language === 'en' ? 'Play Now' : 'Putar Sekarang'}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemAction(item, 'details');
                            }}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title={language === 'en' ? 'View Details' : 'Lihat Detail'}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={getAbsoluteWatchUrl(String(item.id || item.tmdbId))}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick();
                            }}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer no-underline"
                            title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
