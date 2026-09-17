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

// ─────────────────────────────────────────────────────────────
// DATA: "Discover The Best Of" by Genres
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
        poster: 'https://image.tmdb.org/t/p/w500/7ZzkqF5fJcK8N9h21nLw8q39Y2k.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/t3n9Q25n940v334237.jpg',
        year: 2021,
        rating: 8.0,
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
        poster: 'https://image.tmdb.org/t/p/w500/3Q0hd3heuWw6trDVsCQUm9EjwHp.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/oKt4J3gH1CvR3ghbrHG23LBaAQ.jpg',
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
        poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrHG.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
        year: 2023,
        rating: 8.6,
        genre: 'Drama, Post-Apokaliptik',
        synopsis: 'Perjalanan berbahaya Joel dan Ellie melintasi Amerika yang hancur demi secercah harapan.',
      },
      {
        id: 'tv-194764',
        tmdbId: 194764,
        type: 'tv',
        title: 'The Penguin',
        poster: 'https://image.tmdb.org/t/p/w500/vOWcqD4q50Dk7wS1mD0X3hXg5mP.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/tEcsjY4Tq4k0D0tP6G9V4k7W0f1.jpg',
        year: 2024,
        rating: 8.5,
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
        backdrop: 'https://image.tmdb.org/t/p/w1280/l0qVZIpXtIo7km9u5Yqm0C9vr04.jpg',
        year: 1994,
        rating: 8.5,
        genre: 'Komedi, Sitkom Klasik',
        synopsis: 'Kisah kocak dan hangat enam sahabat mengarungi lika-liku hidup dan cinta di New York.',
      },
      {
        id: 'tv-1418',
        tmdbId: 1418,
        type: 'tv',
        title: 'The Big Bang Theory',
        poster: 'https://image.tmdb.org/t/p/w500/ooBGRQBOGi7Mi6eh59jQxIw3AcL.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/f7UQWl6g3rQ1o7sU0s5y5v2eG.jpg',
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
        poster: 'https://image.tmdb.org/t/p/w500/kZ0hC4qF8b2pT3bN0yN4r5j2K0z.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/6xK4tXyW4K6u9k8Y6K3r5p8z9b.jpg',
        year: 2021,
        rating: 8.2,
        genre: 'Komedi, Showbiz',
        synopsis: 'Kolaborasi tak terduga antara komedian senior Las Vegas dan penulis muda yang bermasalah.',
      },
      {
        id: 'tv-97546',
        tmdbId: 97546,
        type: 'tv',
        title: 'Ted Lasso',
        poster: 'https://image.tmdb.org/t/p/w500/3A9vT3uQ0f0v1W9y5N4z5G8z9r0.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/9K4X6K4u8k6r4r8z9b4z5G8z9r0.jpg',
        year: 2020,
        rating: 8.5,
        genre: 'Komedi, Olahraga Hangat',
        synopsis: 'Pelatih sepak bola Amerika dengan optimisme membara mengasuh tim sepak bola Inggris.',
      },
      {
        id: 'tv-60573',
        tmdbId: 60573,
        type: 'tv',
        title: 'Silicon Valley',
        poster: 'https://image.tmdb.org/t/p/w500/q2K4tXyW4K6u9k8Y6K3r5p8z9b.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/7K4X6K4u8k6r4r8z9b4z5G8z9r0.jpg',
        year: 2014,
        rating: 8.3,
        genre: 'Komedi Satir, Teknologi',
        synopsis: 'Perjuangan kocak para programmer mendirikan startup kompresi data revolusioner.',
      },
      {
        id: 'tv-71728',
        tmdbId: 71728,
        type: 'tv',
        title: 'Young Sheldon',
        poster: 'https://image.tmdb.org/t/p/w500/MpdOpGtVRoskg922Nwc8H7m9yP.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/nVRyd8hlg075xeUSZ0Qh9qJ9D26.jpg',
        year: 2017,
        rating: 8.1,
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
        poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520gh0.jpg',
        year: 2024,
        rating: 8.2,
        genre: 'Aksi, Sci-Fi Epik',
        synopsis: 'Paul Atreides memimpin kaum Fremen dalam revolusi suci melawan kekaisaran galaksi.',
      },
      {
        id: 'movie-533535',
        tmdbId: 533535,
        type: 'movie',
        title: 'Deadpool & Wolverine',
        poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/yDHYTjiQHeAxtUR1HQOz5StN4zx.jpg',
        year: 2024,
        rating: 7.7,
        genre: 'Aksi, Komedi Superhero',
        synopsis: 'Wade Wilson dan Wolverine bersatu demi menyelamatkan alam semesta dalam aksi kocak nan brutal.',
      },
      {
        id: 'tv-126308',
        tmdbId: 126308,
        type: 'tv',
        title: 'Shōgun',
        poster: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/54Q6nQzD25547K6Xg0mG8s0y9b.jpg',
        year: 2024,
        rating: 8.5,
        genre: 'Aksi, Sejarah Samurai',
        synopsis: 'Ketegangan politik dan pedang di era feodal Jepang antara Lord Toranaga dan sekutunya.',
      },
      {
        id: 'movie-414906',
        tmdbId: 414906,
        type: 'movie',
        title: 'The Batman',
        poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/tRS6jvPM9qPrrnx2KRx3ew96Yot.jpg',
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
        poster: 'https://image.tmdb.org/t/p/w500/vZloFAK7NKnMGKEslUsZloNXsoW.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/h8gHn0OzBoaefW0w1jW19F6z9r0.jpg',
        year: 2023,
        rating: 7.8,
        genre: 'Aksi Bela Diri, Neo-Noir',
        synopsis: 'John Wick menghadapi High Table dengan aliansi baru dalam perang hidup dan mati di seluruh dunia.',
      },
      {
        id: 'movie-558449',
        tmdbId: 558449,
        type: 'movie',
        title: 'Gladiator II',
        poster: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/euYIwmwkmz95mnExlogQIJuEGqh.jpg',
        year: 2024,
        rating: 6.8,
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
        poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
        year: 2014,
        rating: 8.4,
        genre: 'Sci-Fi, Petualangan Angkasa',
        synopsis: 'Misi melintasi lubang cacing antar-galaksi demi menemukan rumah baru bagi umat manusia.',
      },
      {
        id: 'tv-106379',
        tmdbId: 106379,
        type: 'tv',
        title: 'Fallout',
        poster: 'https://image.tmdb.org/t/p/w500/AnsSKR9LuK0T9bAILezUVq3HGKV.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1TddutaLIxqq.jpg',
        year: 2024,
        rating: 8.3,
        genre: 'Sci-Fi, Post-Apokaliptik',
        synopsis: 'Penghuni bunker bawah tanah menghadapi keanehan dunia luar bumi yang terdistorsi radiasi nuklir.',
      },
      {
        id: 'tv-95557',
        tmdbId: 95557,
        type: 'tv',
        title: 'Severance',
        poster: 'https://image.tmdb.org/t/p/w500/l2ezW1dpGGMUG0h10a1p3s0w5G.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1z9b5G8z9r0.jpg',
        year: 2022,
        rating: 8.4,
        genre: 'Sci-Fi Misteri, Thriller',
        synopsis: 'Prosedur pemisahan memori kerja dan pribadi membuka misteri konspirasi menyeramkan.',
      },
      {
        id: 'tv-63247',
        tmdbId: 63247,
        type: 'tv',
        title: 'Westworld',
        poster: 'https://image.tmdb.org/t/p/w500/8MfgyFHf7XEhu2bnQ12gWZwipd0.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/9K4X6K4u8k6r4r8z9b4z5G8z9r0.jpg',
        year: 2016,
        rating: 8.1,
        genre: 'Sci-Fi, AI & Kesadaran',
        synopsis: 'Taman hiburan berteknologi kecerdasan buatan mengalami kebangkitan kesadaran sintetis.',
      },
      {
        id: 'tv-66732',
        tmdbId: 66732,
        type: 'tv',
        title: 'Stranger Things',
        poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
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
        poster: 'https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/vL5LR6WdxWPjCmv2286Zf441y.jpg',
        year: 2009,
        rating: 7.6,
        genre: 'Sci-Fi, Visual Spektakuler',
        synopsis: 'Jake Sully membaur dengan suku Na\'vi di planet Pandora yang elok nan berbahaya.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: 5 Thematic Curated Banners (HBO Max Aesthetic)
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
        poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrHG.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
        year: 2023,
        rating: 8.6,
        genre: 'Drama, Apokaliptik',
        synopsis: 'Joel dan Ellie melintasi sisa-sisa peradaban manusia.',
      },
      {
        id: 'tv-111803',
        tmdbId: 111803,
        type: 'tv',
        title: 'The White Lotus',
        poster: 'https://image.tmdb.org/t/p/w500/7ZzkqF5fJcK8N9h21nLw8q39Y2k.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/t3n9Q25n940v334237.jpg',
        year: 2021,
        rating: 8.0,
        genre: 'Drama, Satir',
        synopsis: 'Kemelut intrik para tamu berduit di resor eksotis.',
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
        synopsis: 'Perjuangan para tenaga medis di IGD paling padat.',
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
        synopsis: 'Asal-usul teror Pennywise di kota Derry tahun 1960-an.',
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
    characterArt: 'https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s520gh0.jpg',
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
        synopsis: 'Awal era baru sang Man of Steel arahan sutradara James Gunn.',
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
        synopsis: 'Misi pamungkas Ethan Hunt menghentikan kecerdasan buatan The Entity.',
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
        synopsis: 'Operasi rahasia mengamankan materi genetik predator purba.',
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
        synopsis: 'Kisah saudara kembar berhadapan dengan kegelapan di tanah kelahiran.',
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
    characterArt: 'https://image.tmdb.org/t/p/w780/8f9dnOtpQ17Acq3L9TghGKaTNuv.jpg',
    characterAlt: 'Harry Potter Characters',
    items: [
      {
        id: 'tv-1668',
        tmdbId: 1668,
        type: 'tv',
        title: 'Friends',
        poster: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/l0qVZIpXtIo7km9u5Yqm0C9vr04.jpg',
        year: 1994,
        rating: 8.5,
        genre: 'Sitkom Komedi',
        synopsis: 'Persahabatan abadi enam kawan di Central Perk New York.',
      },
      {
        id: 'tv-1418',
        tmdbId: 1418,
        type: 'tv',
        title: 'The Big Bang Theory',
        poster: 'https://image.tmdb.org/t/p/w500/ooBGRQBOGi7Mi6eh59jQxIw3AcL.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/f7UQWl6g3rQ1o7sU0s5y5v2eG.jpg',
        year: 2007,
        rating: 7.9,
        genre: 'Sitkom Genius',
        synopsis: 'Humor sains dan persahabatan Sheldon, Leonard, dan kawan-kawan.',
      },
      {
        id: 'tv-1399',
        tmdbId: 1399,
        type: 'tv',
        title: 'Game of Thrones',
        poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
        year: 2011,
        rating: 8.4,
        genre: 'Fantasi Epik',
        synopsis: 'Perebutan Tahta Besi di benua Westeros yang penuh intrik berdarah.',
      },
      {
        id: 'movie-120',
        tmdbId: 120,
        type: 'movie',
        title: 'The Lord of the Rings: The Fellowship of the Ring',
        poster: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cDK6.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/9DeGfFIqjph5CBmuUNHbJqkoqvL.jpg',
        year: 2001,
        rating: 8.4,
        genre: 'Fantasi Epik',
        synopsis: 'Awal perjalanan Frodo Baggins menghancurkan Cincin Utama ke Mordor.',
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
    characterArt: 'https://image.tmdb.org/t/p/w780/jntLBq0J1v1zgYq1b3w3G.jpg',
    characterAlt: 'Documentary Real Life Hero',
    items: [
      {
        id: 'movie-899082',
        tmdbId: 899082,
        type: 'movie',
        title: 'Harry Potter 20th Anniversary: Return to Hogwarts',
        poster: 'https://image.tmdb.org/t/p/w500/jntLBq0J1v1zgYq1b3w3G.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/8s4h9friP6Ci3adRGahHARVd76E.jpg',
        year: 2022,
        rating: 7.3,
        genre: 'Dokumenter Reuni',
        synopsis: 'Reuni magis para pemeran legendaris di Aula Utama Hogwarts setelah 20 tahun.',
      },
      {
        id: 'tv-61818',
        tmdbId: 61818,
        type: 'tv',
        title: '90 Day Fiancé',
        poster: 'https://image.tmdb.org/t/p/w500/s9Yk8Y6K3r5p8z9b4z5G8z9r0k.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/b7n4j9r0k6r4r8z9b4z5G8z9r0.jpg',
        year: 2014,
        rating: 6.7,
        genre: 'Reality Show',
        synopsis: 'Dinamika pasangan lintas negara dalam tenggat visa K-1 selama 90 hari.',
      },
      {
        id: 'tv-12211',
        tmdbId: 12211,
        type: 'tv',
        title: 'Ghost Adventures',
        poster: 'https://image.tmdb.org/t/p/w500/1X6K4u8k6r4r8z9b4z5G8z9r0k.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2X6K4u8k6r4r8z9b4z5G8z9r0k.jpg',
        year: 2008,
        rating: 7.2,
        genre: 'Paranormal Realita',
        synopsis: 'Investigasi lokasi paling berhantu di dunia oleh Zak Bagans dan kru.',
      },
      {
        id: 'tv-61775',
        tmdbId: 61775,
        type: 'tv',
        title: 'Property Brothers: At Home',
        poster: 'https://image.tmdb.org/t/p/w500/3X6K4u8k6r4r8z9b4z5G8z9r0k.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/4X6K4u8k6r4r8z9b4z5G8z9r0k.jpg',
        year: 2014,
        rating: 7.0,
        genre: 'Renovasi Realita',
        synopsis: 'Kakak-beradik Drew dan Jonathan Scott merenovasi rumah impian keluarga.',
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
        id: 'movie-950387',
        tmdbId: 950387,
        type: 'movie',
        title: 'A Minecraft Movie',
        poster: 'https://image.tmdb.org/t/p/w500/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
        year: 2025,
        rating: 6.2,
        genre: 'Keluarga, Petualangan',
        synopsis: 'Empat orang terlempar ke Overworld kotak-kotak bersama Steve sang ahli merakit.',
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
        synopsis: 'Persahabatan magis Hiccup dan naga Toothless di Pulau Berk.',
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
        synopsis: 'Geng Bad Guys berusaha jadi baik sebelum terlibat misi pencurian global baru.',
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
        synopsis: 'Petualangan surreal Finn si bocah dan Jake anjing ajaib di Negeri Ooo.',
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
    <section className="relative w-full py-10 sm:py-14 space-y-12 sm:space-y-16 overflow-hidden">
      {/* ───────────────────────────────────────────────────────── */}
      {/* SECTION 1: "DISCOVER THE BEST OF" (Interactive Genre Hub) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 space-y-6 sm:space-y-8">
        {/* Header with Title & Genre Switcher */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-sans tracking-[0.25em] text-brand-champagne uppercase font-medium">
            <Sparkles className="w-3 h-3 text-brand-gold" />
            <span>{language === 'en' ? 'Curated Selection' : 'Pilihan Paling Populer'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-display font-medium text-white tracking-wide">
            {language === 'en' ? 'Discover The Best Of' : 'Jelajahi Yang Terbaik'}
          </h2>

          {/* Genre Tabs with Navigation Arrows */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full overflow-x-auto no-scrollbar py-2">
            <button
              onClick={handlePrevGenre}
              onMouseEnter={playHover}
              className="p-1.5 sm:p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
              aria-label="Previous Genre"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
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
                    className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer shrink-0 ${
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
              className="p-1.5 sm:p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
              aria-label="Next Genre"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Landscape / Title Grid Cards (2 rows x 3 cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {activeGenre.items.map((item) => {
            const isLoading = loadingMediaId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleItemAction(item, 'details')}
                onMouseEnter={playHover}
                className="group relative aspect-video rounded-2xl overflow-hidden bg-cinema-900 border border-white/[0.08] hover:border-white/30 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              >
                {/* Backdrop Image */}
                <img
                  src={item.backdrop}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                />

                {/* Dark Vignette & Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

                {/* Top Badge: Type & Rating */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                    <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
                  </span>

                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Bottom Content / Title */}
                <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-white line-clamp-1 drop-shadow-md">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300 font-light">
                    <span>{item.year}</span>
                    <span>•</span>
                    <span className="line-clamp-1">{item.genre}</span>
                  </div>
                </div>

                {/* Hover Quick-Action Controls */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20">
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
      {/* ───────────────────────────────────────────────────────── */}
      <div className="space-y-8 sm:space-y-12">
        {THEMATIC_BANNERS.map((banner) => {
          const displayTitle = language === 'en' ? banner.titleEn : banner.titleId;
          const displayTagline = language === 'en' ? banner.taglineEn : banner.taglineId;

          return (
            <div
              key={banner.id}
              className={`relative w-full bg-gradient-to-r ${banner.bgGradient} border-y ${banner.borderAccent} py-8 sm:py-12 overflow-hidden transition-colors duration-500`}
            >
              {/* Subtle background ambient overlay */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />

              {/* Character Floating Artwork at Top-Right */}
              <div className="absolute -top-6 sm:-top-10 right-2 sm:right-12 lg:right-24 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 pointer-events-none opacity-25 sm:opacity-35 select-none mix-blend-screen overflow-hidden">
                <img
                  src={banner.characterArt}
                  alt={banner.characterAlt}
                  loading="lazy"
                  className="w-full h-full object-cover object-center filter contrast-125 brightness-110 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
                />
              </div>

              <div className="relative max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 space-y-6 sm:space-y-8 z-10">
                {/* Banner Heading */}
                <div className="space-y-1 max-w-2xl">
                  <h3 className="text-2xl sm:text-4xl font-display font-medium text-white tracking-wide drop-shadow-lg">
                    {displayTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/80 font-light leading-relaxed">
                    {displayTagline}
                  </p>
                </div>

                {/* 4 Poster Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                  {banner.items.map((item) => {
                    const isLoading = loadingMediaId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemAction(item, 'details')}
                        onMouseEnter={playHover}
                        className="group relative aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-950 border border-white/[0.1] hover:border-white/40 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer"
                      >
                        {/* Poster Image */}
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-95 group-hover:brightness-105"
                        />

                        {/* Gradient Shadow Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                        {/* Top Rating Badge */}
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-amber-400">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>

                        {/* Bottom Information */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300/80">
                            <span>{item.year}</span>
                            <span>•</span>
                            <span className="line-clamp-1">{item.genre}</span>
                          </div>
                        </div>

                        {/* Hover Overlay Buttons */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20">
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
