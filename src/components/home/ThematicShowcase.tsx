import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Info,
  ExternalLink,
  Star,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { fetchFullMediaItem } from '../../services/tmdb';
import { createMovieServers, createTvServers } from '../../data/mockCatalog';
import { PrimeHoverCard } from './PrimeHoverCard';

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
  genreEn: string;
  genreId: string;
  taglineEn?: string;
  taglineId?: string;
  synopsisEn: string;
  synopsisId: string;
  logoArt?: string;
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
  radialGlow: string;
  cutoutArt: string;
  cutoutAlt: string;
  logoArt: string;
  logoAlt: string;
  items: ShowcaseMediaDef[];
}

// Fallback image constants ensuring no card is ever a blank void
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

// ─────────────────────────────────────────────────────────────
// DATA: "Discover The Best Of" by Genres (Bilingual EN / ID)
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
        genreEn: 'Drama, Epic Fantasy',
        genreId: 'Drama, Fantasi',
        synopsisEn: 'The Targaryen dynasty is at the height of its power, but the seeds of a brutal civil war are about to be sown.',
        synopsisId: 'Perang saudara berdarah klan Targaryen memperebutkan Tahta Besi di Westeros.',
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
        genreEn: 'Drama, Dark Comedy',
        genreId: 'Drama, Komedi Hitam',
        synopsisEn: 'A sharp social satire following the exploits of employees and guests at an exclusive luxury resort over a turbulent week.',
        synopsisId: 'Skandal dan intrik para tamu kaya di resor tropis mewah nan penuh rahasia gelap.',
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
        genreEn: 'Medical Drama, Realistic',
        genreId: 'Drama Medis, Realistis',
        synopsisEn: 'A realistic examination of the relentless frontline challenges facing healthcare workers in modern Pittsburgh emergency rooms.',
        synopsisId: 'Dedikasi tanpa henti para dokter unit gawat darurat Pittsburgh menyelamatkan nyawa di garis depan.',
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
        genreEn: 'Teen Drama, Mystery',
        genreId: 'Drama Remaja, Intrik',
        synopsisEn: 'A look at life for a group of high school students as they grapple with issues of drugs, identity, and love.',
        synopsisId: 'Pencarian jati diri, cinta, dan luka remaja di tengah gemerlap dunia modern.',
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
        genreEn: 'Drama, Post-Apocalyptic',
        genreId: 'Drama, Post-Apokaliptik',
        synopsisEn: 'Joel and Ellie form a powerful bond as they traverse a treacherous post-pandemic America devastated by fungal infection.',
        synopsisId: 'Perjalanan berbahaya Joel dan Ellie melintasi Amerika yang hancur demi secercah harapan.',
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
        genreEn: 'Crime Drama, Noir',
        genreId: 'Drama Kriminal, Noir',
        synopsisEn: 'Following the events of The Batman, Oswald Cobb seeks to seize control of Gotham City\'s criminal underworld.',
        synopsisId: 'Oswald Cobb merayap merebut tahta penguasa dunia hitam Kota Gotham pasca banjir besar.',
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
        genreEn: 'Comedy, Classic Sitcom',
        genreId: 'Komedi, Sitkom Klasik',
        synopsisEn: 'Follow the lives of six reckless young friends living in Manhattan as they indulge in adventures and romance.',
        synopsisId: 'Kisah kocak dan hangat enam sahabat mengarungi lika-liku hidup dan cinta di New York.',
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
        genreEn: 'Comedy, Geek Sitcom',
        genreId: 'Komedi, Sitkom Genius',
        synopsisEn: 'The lives of socially awkward physicists are turned upside down when a free-spirited woman moves into the apartment across the hall.',
        synopsisId: 'Keseruan hidup para fisikawan kutu buku saat bertetangga dengan gadis pirang ceria.',
      },
      {
        id: 'tv-124101',
        tmdbId: 124101,
        type: 'tv',
        title: 'Hacks',
        poster: 'https://image.tmdb.org/t/p/w500/ca5XiEFgyGsI38QT3wEKa1QVGX.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/bbAR4qKxjnjyKAt4YMrL725Mtfw.jpg',
        year: 2021,
        rating: 8.2,
        genreEn: 'Comedy, Showbiz',
        genreId: 'Komedi, Showbiz',
        synopsisEn: 'Explores a dark mentorship that forms between a legendary Las Vegas comedian and an entitled 25-year-old outcast.',
        synopsisId: 'Kolaborasi tak terduga antara komedian senior Las Vegas dan penulis muda yang bermasalah.',
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
        genreEn: 'Comedy, Feel-good Sports',
        genreId: 'Komedi, Olahraga Hangat',
        synopsisEn: 'An American college football coach is hired to manage a British soccer team, using infectious optimism to win over his squad.',
        synopsisId: 'Pelatih sepak bola Amerika dengan optimisme membara mengasuh tim sepak bola Inggris.',
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
        genreEn: 'Satirical Comedy, Tech',
        genreId: 'Komedi Satir, Teknologi',
        synopsisEn: 'In the high-tech gold rush of modern Silicon Valley, programmers build a revolutionary data compression startup.',
        synopsisId: 'Perjuangan kocak para programmer mendirikan startup kompresi data revolusioner.',
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
        genreEn: 'Family Comedy, Coming-of-Age',
        genreId: 'Komedi Keluarga',
        synopsisEn: 'Follow nine-year-old child genius Sheldon Cooper as he navigates high school and eccentric family life in East Texas.',
        synopsisId: 'Masa kecil jenius Sheldon Cooper di Texas Timur bersama keluarganya yang eksentrik.',
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
        genreEn: 'Action, Epic Sci-Fi',
        genreId: 'Aksi, Sci-Fi Epik',
        synopsisEn: 'Paul Atreides unites with Chani and the Fremen to lead a holy revolution against the conspirators on Arrakis.',
        synopsisId: 'Paul Atreides memimpin kaum Fremen dalam revolusi suci melawan kekaisaran galaksi di gurun Arrakis.',
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
        genreEn: 'Action, Superhero Comedy',
        genreId: 'Aksi, Komedi Superhero',
        synopsisEn: 'Wade Wilson and Wolverine reluctantly join forces on a high-stakes multiversal mission full of brutal combat and comedy.',
        synopsisId: 'Wade Wilson dan Wolverine bersatu demi menyelamatkan alam semesta dalam aksi kocak nan brutal.',
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
        genreEn: 'Action, Samurai History',
        genreId: 'Aksi, Sejarah Samurai',
        synopsisEn: 'In feudal Japan, Lord Yoshii Toranaga engages in intense political and martial warfare against his council rivals.',
        synopsisId: 'Ketegangan politik dan pedang di era feodal Jepang antara Lord Toranaga dan sekutunya.',
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
        genreEn: 'Crime Action, Detective',
        genreId: 'Aksi Kriminal, Detektif',
        synopsisEn: 'Batman ventures into Gotham City\'s underworld when a sadistic killer leaves behind a trail of cryptic clues.',
        synopsisId: 'Sang Ksatria Kegelapan menyelidiki jejak teka-teki mematikan The Riddler di Gotham.',
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
        genreEn: 'Martial Arts Action, Neo-Noir',
        genreId: 'Aksi Bela Diri, Neo-Noir',
        synopsisEn: 'John Wick takes his fight against the High Table global as he seeks out the most powerful players in the underworld.',
        synopsisId: 'John Wick menghadapi High Table dengan aliansi baru dalam perang hidup dan mati di seluruh dunia.',
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
        genreEn: 'Action, Roman Epic',
        genreId: 'Aksi, Kolosal Romawi',
        synopsisEn: 'Lucius enters the Colosseum after his home is conquered by tyrannical emperors who lead Rome with an iron fist.',
        synopsisId: 'Lucius memasuki Colosseum demi kehormatan dan kebebasan Roma dari tirani kaisar.',
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
        genreEn: 'Sci-Fi, Space Exploration',
        genreId: 'Sci-Fi, Petualangan Angkasa',
        synopsisEn: 'A team of heroic astronauts travels through a wormhole across galaxies to find a habitable future home for humanity.',
        synopsisId: 'Misi melintasi lubang cacing antar-galaksi demi menemukan rumah baru bagi umat manusia.',
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
        genreEn: 'Sci-Fi, Post-Apocalyptic',
        genreId: 'Sci-Fi, Post-Apokaliptik',
        synopsisEn: 'A peaceful vault dweller is forced to surface for the first time into the bizarre, violent irradiated wasteland above.',
        synopsisId: 'Penghuni bunker bawah tanah menghadapi keanehan dunia luar bumi yang terdistorsi radiasi nuklir.',
      },
      {
        id: 'tv-95396',
        tmdbId: 95396,
        type: 'tv',
        title: 'Severance',
        poster: 'https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg',
        year: 2022,
        rating: 8.4,
        genreEn: 'Sci-Fi Mystery, Psychological',
        genreId: 'Sci-Fi Misteri, Thriller',
        synopsisEn: 'Office workers whose memories are split between work and home discover a dark web of corporate conspiracies at Lumon.',
        synopsisId: 'Prosedur pemisahan memori kerja dan pribadi membuka misteri konspirasi menyeramkan.',
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
        genreEn: 'Sci-Fi, AI Consciousness',
        genreId: 'Sci-Fi, AI & Kesadaran',
        synopsisEn: 'A futuristic theme park populated by android hosts descends into chaos when the synthetic beings achieve sentience.',
        synopsisId: 'Taman hiburan berteknologi kecerdasan buatan mengalami kebangkitan kesadaran sintetis.',
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
        genreEn: 'Retro Sci-Fi, Supernatural',
        genreId: 'Sci-Fi Retro, Misteri',
        synopsisEn: 'A group of kids in Hawkins uncover supernatural government experiments and an alternate terrifying dimension known as the Upside Down.',
        synopsisId: 'Anak-anak Hawkins berhadapan dengan dimensi terbalik Upside Down dan monster supernatural.',
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
        genreEn: 'Sci-Fi, Visual Spectacle',
        genreId: 'Sci-Fi, Visual Spektakuler',
        synopsisEn: 'A disabled Marine bonds with the indigenous Na\'vi on lush planet Pandora and leads them in a stand against human colonizers.',
        synopsisId: 'Jake Sully membaur dengan suku Na\'vi di planet Pandora yang elok nan berbahaya.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: 5 Thematic Curated Banners (6 Curated Titles Each, Bilingual)
// ─────────────────────────────────────────────────────────────
const THEMATIC_BANNERS: ThematicBannerDef[] = [
  {
    id: 'groundbreaking-series',
    titleEn: 'Groundbreaking Series',
    titleId: 'Serial Fenomenal',
    taglineEn: 'Emmy-winning masterpieces and prestige storytelling',
    taglineId: 'Karya peraih Emmy dengan narasi sinematik terbaik',
    bgGradient: 'from-[#3a0815]/90 via-[#1e050c]/95 to-[#0b0306]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(225,29,72,0.35)]',
    borderAccent: 'border-rose-900/30 hover:border-rose-500/40',
    radialGlow: 'radial-gradient(circle at 65% 40%, rgba(225,29,72,0.32) 0%, rgba(159,18,57,0.15) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/hotd-cutout.png',
    cutoutAlt: 'House of the Dragon - Daemon Targaryen',
    logoArt: 'https://image.tmdb.org/t/p/w500/sWW8VURTOT0yVLS6Jlxw6BQQUSZ.png',
    logoAlt: 'House of the Dragon',
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
        genreEn: 'Drama, Epic Fantasy',
        genreId: 'Drama, Fantasi',
        synopsisEn: 'The Targaryen dynasty is at the height of its power, but the seeds of a brutal civil war are about to be sown.',
        synopsisId: 'Perang saudara berdarah klan Targaryen memperebutkan Tahta Besi di Westeros.',
        logoArt: 'https://image.tmdb.org/t/p/w500/aMYpHPNO3ZXH9dR3Mchrg2AgoNw.png',
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
        genreEn: 'Drama, Apocalyptic',
        genreId: 'Drama, Apokaliptik',
        synopsisEn: 'Joel and Ellie brave dangerous fungal infected and ruthless human survivors across a post-pandemic America.',
        synopsisId: 'Perjalanan berbahaya Joel dan Ellie melintasi sisa-sisa peradaban manusia yang hancur pasca wabah jamur.',
        logoArt: 'https://image.tmdb.org/t/p/w500/msYtgZbEo8tAOJ37T50kgqulpKf.png',
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
        genreEn: 'Drama, Satire',
        genreId: 'Drama, Satir',
        synopsisEn: 'A sharp social satire chronicling the vacation antics and dark hidden truths of affluent resort guests.',
        synopsisId: 'Kemelut intrik para tamu berduit dan rahasia gelap para pegawai di resor tropis mewah.',
        logoArt: 'https://image.tmdb.org/t/p/w500/2SwIOcXZ4you4EjPCAw7IucCsgX.png',
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
        genreEn: 'Drama, Medical',
        genreId: 'Drama, Medis',
        synopsisEn: 'A gritty, unflinching front-line look at emergency room workers battling to save lives in Pittsburgh.',
        synopsisId: 'Perjuangan para tenaga medis di unit gawat darurat tersibuk menyelamatkan nyawa di garis depan.',
        logoArt: 'https://image.tmdb.org/t/p/w500/zqsePGDhPnk5KpSjlZFpmZyy8h6.png',
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
        genreEn: 'Drama, Business & Politics',
        genreId: 'Drama, Bisnis & Politik',
        synopsisEn: 'The ruthless Roy family fights for ultimate control of Waystar RoyCo when their aging patriarch steps back.',
        synopsisId: 'Intrik perebutan tahta kekuasaan dinasti media raksasa keluarga Roy yang kejam dan tak terduga.',
        logoArt: 'https://image.tmdb.org/t/p/w500/5MAURYSb9Q98fRWuSTOGFlztKIZ.png',
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
        genreEn: 'Crime Drama, Neo-Noir',
        genreId: 'Drama Kriminal, Neo-Noir',
        synopsisEn: 'Uncompromising detectives confront harrowing psychological cases and macabre murders across the American south.',
        synopsisId: 'Penyelidikan kasus pembunuhan misterius penuh teka-teki gelap di pelosok wilayah Amerika.',
        logoArt: 'https://image.tmdb.org/t/p/w500/6q4KzOcM2eEE1IbhFTadUsQkphl.png',
      },
    ],
  },
  {
    id: 'blockbuster-movies',
    titleEn: 'Blockbuster Movies',
    titleId: 'Film Terlaris Dunia',
    taglineEn: 'Epic spectacles, colossal heroes, and unforgettable action',
    taglineId: 'Koleksi film layar lebar termegah penuh aksi spektakuler',
    bgGradient: 'from-[#6b3306]/85 via-[#381602]/95 to-[#0d0501]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(245,158,11,0.35)]',
    borderAccent: 'border-amber-900/30 hover:border-amber-500/40',
    radialGlow: 'radial-gradient(circle at 65% 40%, rgba(245,158,11,0.32) 0%, rgba(180,83,9,0.15) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/dune-cutout.png',
    cutoutAlt: 'Dune: Part Two - Paul Atreides & Chani',
    logoArt: 'https://image.tmdb.org/t/p/w500/eYvF1LhPKuoBxOAmWjFTAK7EPWl.png',
    logoAlt: 'Dune: Part Two',
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
        genreEn: 'Action, Epic Sci-Fi',
        genreId: 'Aksi, Sci-Fi Epik',
        synopsisEn: 'Paul Atreides leads the Fremen in a planetary holy war to reclaim Arrakis and avenge his fallen dynasty.',
        synopsisId: 'Paul Atreides memimpin kaum Fremen dalam revolusi suci melawan kekaisaran galaksi di gurun Arrakis.',
        logoArt: 'https://image.tmdb.org/t/p/w500/eYvF1LhPKuoBxOAmWjFTAK7EPWl.png',
      },
      {
        id: 'movie-1061474',
        tmdbId: 1061474,
        type: 'movie',
        title: 'Superman',
        poster: 'https://image.tmdb.org/t/p/w500/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/yRBc6WY3r1Fz5Cjd6DhSvzqunED.jpg',
        year: 2025,
        rating: 7.3,
        genreEn: 'Action, Superhero',
        genreId: 'Aksi, Superhero',
        synopsisEn: 'The dawn of a new DC Universe as Superman balances his Kryptonian heritage with his human upbringing.',
        synopsisId: 'Awal era baru sang Man of Steel arahan sutradara James Gunn dalam kisah kepahlawanan modern.',
        logoArt: 'https://image.tmdb.org/t/p/w500/7gQc9y2EORn9pZhGtAEdlEbpcpz.png',
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
        genreEn: 'Action, Superhero Comedy',
        genreId: 'Aksi, Komedi Superhero',
        synopsisEn: 'The Merc with a Mouth teams up with a cynical Wolverine on a high-stakes, hilarious mission to save their universe.',
        synopsisId: 'Wade Wilson dan Wolverine bekerja sama menyelamatkan multiverse dengan aksi brutal dan kocak.',
        logoArt: 'https://image.tmdb.org/t/p/w500/2o48U3kMXGIqRAkKZQ3n5OTWSBy.png',
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
        genreEn: 'Action, Espionage',
        genreId: 'Aksi, Spionase',
        synopsisEn: 'Ethan Hunt and the IMF team embark on their ultimate, death-defying mission to dismantle The Entity.',
        synopsisId: 'Misi pamungkas Ethan Hunt menghentikan kecerdasan buatan The Entity demi nasib peradaban dunia.',
        logoArt: 'https://image.tmdb.org/t/p/w500/7yXEfWFDGpqIfq9wdpMOHcHbi8g.png',
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
        genreEn: 'Action, Dinosaurs',
        genreId: 'Aksi, Dinosaurus',
        synopsisEn: 'A daring covert expedition to extract vital dinosaur DNA from isolated equatorial biosphere reserves.',
        synopsisId: 'Operasi rahasia mengamankan materi genetik purba dari pulau predator raksasa paling berbahaya.',
        logoArt: 'https://image.tmdb.org/t/p/w500/tO2Y6RlJuXKtzVMsRRYCGUwgP39.png',
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
        genreEn: 'Horror, Action Thriller',
        genreId: 'Horor, Aksi Thriller',
        synopsisEn: 'Twin brothers return to their troubled hometown only to find an unspeakable evil waiting to consume them.',
        synopsisId: 'Kisah saudara kembar berhadapan dengan teror kegelapan supranatural di tanah kelahiran mereka.',
        logoArt: 'https://image.tmdb.org/t/p/w500/kPUKvxsGgQBZMThi8VbMrTeznX0.png',
      },
    ],
  },
  {
    id: 'iconic-hits',
    titleEn: 'Iconic Hits',
    titleId: 'Karya Ikonik Abadi',
    taglineEn: 'Timeless pop culture legends and binge-worthy phenomena',
    taglineId: 'Legenda budaya pop yang tak lekang oleh waktu',
    bgGradient: 'from-[#0f223d]/90 via-[#0a1527]/95 to-[#020712]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(56,189,248,0.3)]',
    borderAccent: 'border-sky-900/30 hover:border-sky-500/40',
    radialGlow: 'radial-gradient(circle at 65% 40%, rgba(56,189,248,0.3) 0%, rgba(14,116,144,0.15) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/got-cutout.png',
    cutoutAlt: 'Game of Thrones - Daenerys Targaryen & Jon Snow',
    logoArt: 'https://image.tmdb.org/t/p/w500/6pObznbCoxVpY1lPQwJxETd7Phe.png',
    logoAlt: 'Game of Thrones',
    items: [
      {
        id: 'tv-1399',
        tmdbId: 1399,
        type: 'tv',
        title: 'Game of Thrones',
        poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg',
        year: 2011,
        rating: 8.5,
        genreEn: 'Epic Fantasy, Intrigue',
        genreId: 'Fantasi Epik',
        synopsisEn: 'Noble houses clash in a deadly, deceitful war for the Iron Throne of Westeros while an ancient menace wakes.',
        synopsisId: 'Perebutan Tahta Besi di benua Westeros yang penuh intrik politik dan perang naga berdarah.',
        logoArt: 'https://image.tmdb.org/t/p/w500/6pObznbCoxVpY1lPQwJxETd7Phe.png',
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
        genreEn: 'Crime Drama, Legendary',
        genreId: 'Drama Kriminal Legendaris',
        synopsisEn: 'A high school chemistry teacher diagnosed with lung cancer partners with a former student to build an empire.',
        synopsisId: 'Transformasi dramatis guru kimia yang terdesak menjadi raja obat bius terhebat demi keluarganya.',
        logoArt: 'https://image.tmdb.org/t/p/w500/chw44B2VnLha8iiTdyZcIW0ZELC.png',
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
        genreEn: 'Action Crime, Masterpiece',
        genreId: 'Aksi Kriminal, Masterpiece',
        synopsisEn: 'Batman faces his greatest moral and physical test when the sadistic anarchist Joker brings chaos to Gotham.',
        synopsisId: 'Pertarungan fisik dan psikologis sang Ksatria Kegelapan menghadapi anarki The Joker di Gotham.',
        logoArt: 'https://image.tmdb.org/t/p/w500/nO5Uix3Qr4WjOyU1BMPv0okyNWm.png',
      },
      {
        id: 'tv-1668',
        tmdbId: 1668,
        type: 'tv',
        title: 'Friends',
        poster: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg',
        year: 1994,
        rating: 8.4,
        genreEn: 'Sitcom, Comedy',
        genreId: 'Sitkom Komedi',
        synopsisEn: 'Six lifelong friends share laughs, heartbreaks, and coffee across ten iconic seasons in New York City.',
        synopsisId: 'Persahabatan abadi enam kawan mengarungi lika-liku hidup dan asmara di New York.',
        logoArt: 'https://image.tmdb.org/t/p/w500/blVfE2u4uytU0f8yUO2XvhNSS2Y.png',
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
        genreEn: 'Sitcom, Science Comedy',
        genreId: 'Sitkom Genius',
        synopsisEn: 'Caltech physicists Sheldon and Leonard learn about life and romance when aspiring actress Penny moves in next door.',
        synopsisId: 'Humor sains dan persahabatan Sheldon, Leonard, dan kawan-kawan saat bertetangga dengan Penny.',
        logoArt: 'https://image.tmdb.org/t/p/w500/krsdhZRZlwx8D31LzXTs893jvYl.png',
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
        genreEn: 'Epic Fantasy, Adventure',
        genreId: 'Fantasi Epik',
        synopsisEn: 'Young hobbit Frodo Baggins is entrusted with the One Ring and sets off on a legendary quest to Mount Doom.',
        synopsisId: 'Perjalanan epik Frodo Baggins bersama Persaudaraan Cincin demi menghancurkan Cincin Utama di Mordor.',
        logoArt: 'https://image.tmdb.org/t/p/w500/dMAXhf7jVsc8Qsx26wsoOmoQh3r.png',
      },
    ],
  },
  {
    id: 'real-life-stories',
    titleEn: 'Real-life Stories',
    titleId: 'Kisah Nyata & Dokumenter',
    taglineEn: 'Riveting documentaries, unscripted reality, and true legends',
    taglineId: 'Dokumenter memikat, realita nyata, dan kisah inspiratif',
    bgGradient: 'from-[#044336]/85 via-[#022720]/95 to-[#010e0b]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(20,184,166,0.35)]',
    borderAccent: 'border-teal-900/30 hover:border-teal-500/40',
    radialGlow: 'radial-gradient(circle at 65% 40%, rgba(20,184,166,0.32) 0%, rgba(13,148,136,0.15) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/naked-and-afraid-cutout.png',
    cutoutAlt: 'Naked and Afraid Survivalists',
    logoArt: 'https://image.tmdb.org/t/p/w500/8czXfVg26ohZB41TijcXkMcbedc.png',
    logoAlt: 'Naked and Afraid',
    items: [
      {
        id: 'tv-58832',
        tmdbId: 58832,
        type: 'tv',
        title: 'Naked and Afraid',
        poster: 'https://image.tmdb.org/t/p/w500/nDXJn6wEIQ6AfaWbt1APNQmyswU.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/92nx3yNRsDaxLNBj95UZ1cQEMjv.jpg',
        year: 2013,
        rating: 6.8,
        genreEn: 'Reality, Survival Adventure',
        genreId: 'Realita, Bertahan Hidup',
        synopsisEn: 'Two complete strangers are dropped in extreme wilderness with no food, water, or clothes, challenged to survive 21 days.',
        synopsisId: 'Dua orang asing tanpa busana, makanan, dan pakaian diuji bertahan hidup selama 21 hari di alam liar.',
        logoArt: 'https://image.tmdb.org/t/p/w500/aHoUOwrFNAQUhu5IXSbIcMe88wi.png',
      },
      {
        id: 'movie-872585',
        tmdbId: 872585,
        type: 'movie',
        title: 'Oppenheimer',
        poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/7CENyUim29IEsaJhUxIGymCRvPu.jpg',
        year: 2023,
        rating: 8.0,
        genreEn: 'Biopic, History & Drama',
        genreId: 'Biopik, Sejarah & Drama',
        synopsisEn: 'The gripping story of J. Robert Oppenheimer leading the Manhattan Project to create the first atomic bomb.',
        synopsisId: 'Kisah J. Robert Oppenheimer memimpin Proyek Manhattan dan pergulatan moral senjata pemusnah massal.',
        logoArt: 'https://image.tmdb.org/t/p/w500/b07VisHvZb0WzUpA8VB77wfMXwg.png',
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
        genreEn: 'History, Disaster Drama',
        genreId: 'Sejarah, Drama Bencana',
        synopsisEn: 'The true story of the 1986 nuclear disaster in Soviet Ukraine and the courageous responders who saved Europe.',
        synopsisId: 'Kisah nyata kepahlawanan dan pengorbanan manusia di balik ledakan reaktor nuklir terburuk dalam sejarah.',
        logoArt: 'https://image.tmdb.org/t/p/w500/f7kz7QLMMfBnM9sMfri4q6FhuvE.png',
      },
      {
        id: 'tv-4613',
        tmdbId: 4613,
        type: 'tv',
        title: 'Band of Brothers',
        poster: 'https://image.tmdb.org/t/p/w500/pGzV187ogXzgJrvPRy2YPi29ofH.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/2yDV0xLyqW88dn5qE7YCRnoYmfy.jpg',
        year: 2001,
        rating: 8.6,
        genreEn: 'WWII True History, War Drama',
        genreId: 'Sejarah Perang Dunia II',
        synopsisEn: 'The legendary true journey of the US Army Easy Company from jump training to the fall of Nazi Germany.',
        synopsisId: 'Perjuangan nyata kompi terjun payung Easy Company dalam pertempuran sengit PD II di tanah Eropa.',
        logoArt: 'https://image.tmdb.org/t/p/w500/cRYVIUJo0d5JJgD7g37gsq7TDwM.png',
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
        genreEn: 'Documentary, Magical Reunion',
        genreId: 'Dokumenter Reuni',
        synopsisEn: 'Cast members reunite in the Great Hall to celebrate the twenty-year legacy of the Harry Potter film franchise.',
        synopsisId: 'Reuni magis para pemeran legendaris di Aula Utama Hogwarts mengenang 20 tahun keajaiban film.',
        logoArt: 'https://image.tmdb.org/t/p/w500/fByBlUOlgqSQoLMsEEJQ7Hf8aDA.png',
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
        genreEn: 'Paranormal Reality, Investigation',
        genreId: 'Paranormal Realita',
        synopsisEn: 'Zak Bagans and his crew explore notorious haunted sites worldwide, conducting intense dusk-to-dawn lockdowns.',
        synopsisId: 'Investigasi langsung ke lokasi-lokasi paling berhantu di dunia oleh Zak Bagans dan kru paranormal.',
        logoArt: 'https://image.tmdb.org/t/p/w500/8kSwNLygLOYccu9vPSTlIuVquVj.png',
      },
    ],
  },
  {
    id: 'family-favorites',
    titleEn: 'Family Favorites',
    titleId: 'Favorit Keluarga & Animasi',
    taglineEn: 'Heartwarming animated adventures and delightful fun for all ages',
    taglineId: 'Petualangan animasi hangat dan tontonan seru seluruh keluarga',
    bgGradient: 'from-[#713f12]/85 via-[#452207]/95 to-[#120701]',
    accentGlow: 'shadow-[0_0_80px_-20px_rgba(234,179,8,0.35)]',
    borderAccent: 'border-yellow-900/30 hover:border-yellow-500/40',
    radialGlow: 'radial-gradient(circle at 65% 40%, rgba(234,179,8,0.32) 0%, rgba(161,98,7,0.15) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/family-cutout.png',
    cutoutAlt: 'Adventure Time - Finn & Jake',
    logoArt: 'https://image.tmdb.org/t/p/w500/rIi0lY2UftYuKDJ4OlIefDdijve.png',
    logoAlt: 'Adventure Time',
    items: [
      {
        id: 'tv-15260',
        tmdbId: 15260,
        type: 'tv',
        title: 'Adventure Time',
        poster: 'https://image.tmdb.org/t/p/w500/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/pe4B3OYBb7qYCdkAz7nKWordbls.jpg',
        year: 2010,
        rating: 8.5,
        genreEn: 'Animation, Surreal Fantasy',
        genreId: 'Animasi, Fantasi Ajaib',
        synopsisEn: 'Bizarre and wondrous journeys of Finn the Human and his shape-shifting magical canine brother Jake in the Land of Ooo.',
        synopsisId: 'Petualangan surreal Finn si bocah petualang dan Jake si anjing ajaib di Negeri Ooo yang penuh keajaiban.',
        logoArt: 'https://image.tmdb.org/t/p/w500/rIi0lY2UftYuKDJ4OlIefDdijve.png',
      },
      {
        id: 'movie-1022789',
        tmdbId: 1022789,
        type: 'movie',
        title: 'Inside Out 2',
        poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg',
        year: 2024,
        rating: 7.5,
        genreEn: 'Animation, Family & Emotions',
        genreId: 'Animasi, Keluarga & Emosi',
        synopsisEn: 'Teenage Riley faces turbulent new emotions led by Anxiety as her inner Headquarters undergoes a sudden remodel.',
        synopsisId: 'Riley memasuki masa remaja dengan emosi-emosi baru yang mengambil alih ruang kendali di kepalanya.',
        logoArt: 'https://image.tmdb.org/t/p/w500/h40hblm8J1if7T2CBMjCD85HwuD.png',
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
        genreEn: 'Animation, Heartfelt Adventure',
        genreId: 'Animasi, Petualangan Menyentuh',
        synopsisEn: 'Shipwrecked robot Roz adapts to wild island life and forms a tender, maternal bond with an orphaned gosling.',
        synopsisId: 'Robot Roz terdampar di pulau liar dan menjalin ikatan kasih menyentuh dengan seekor anak angsa yatim.',
        logoArt: 'https://image.tmdb.org/t/p/w500/xvXJfGKjHHe1m4Usye198DCw7iJ.png',
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
        genreEn: 'Fantasy, Family Adventure',
        genreId: 'Fantasi, Petualangan',
        synopsisEn: 'Young Viking Hiccup defies generations of dragon-fighting tradition by befriending an injured Night Fury dragon.',
        synopsisId: 'Persahabatan magis Hiccup dan naga Toothless mengubah takdir Pulau Berk selamanya.',
        logoArt: 'https://image.tmdb.org/t/p/w500/mhPb94aGQUaDFINeUMYg1gAXPVO.png',
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
        genreEn: 'Animation, Heist Comedy',
        genreId: 'Animasi, Komedi Heist',
        synopsisEn: 'The reformed Bad Guys struggle to stay on the good side when an all-female criminal squad pulls them into one last job.',
        synopsisId: 'Geng Bad Guys berusaha menjadi pahlawan sebelum terseret misi pencurian baru yang mendebarkan.',
        logoArt: 'https://image.tmdb.org/t/p/w500/83GkJm2rUc0BL2n0ZTHl8RLRE47.png',
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
        genreEn: 'Family, Video Game Adventure',
        genreId: 'Keluarga, Petualangan',
        synopsisEn: 'Four misfits are pulled through a mysterious portal into the blocky Overworld where they team up with crafter Steve.',
        synopsisId: 'Empat orang terlempar ke Overworld kotak-kotak bersama Steve sang ahli merakit legendaris.',
        logoArt: 'https://image.tmdb.org/t/p/w500/5gFN6sNEuzTwx2BY2BrN795JwZl.png',
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
  const [hoveredBannerItem, setHoveredBannerItem] = useState<Record<string, number | null>>({});
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

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

    // Fallback: construct instant MediaItem with active language values
    const isMovie = item.type === 'movie';
    const displaySynopsis = language === 'en' ? item.synopsisEn : item.synopsisId;
    const displayGenre = language === 'en' ? item.genreEn : item.genreId;

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
      genres: displayGenre.split(',').map((g) => g.trim()),
      country: 'United States',
      director: 'Warner Bros / HBO Discovery',
      cast: [],
      audioTracks: ['English (Original)', 'Indonesian'],
      subtitles: ['Indonesia', 'English'],
      synopsis: displaySynopsis,
      synopsisEn: item.synopsisEn,
      synopsisId: item.synopsisId,
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

        {/* 6 Landscape / Backdrop Grid Cards with Prime Video-style Hover Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
          {activeGenre.items.map((item, index) => (
            <PrimeHoverCard
              key={item.id}
              item={item}
              index={index}
              genreName={language === 'en' ? activeGenre.name : activeGenre.nameId}
              isLoading={loadingMediaId === item.id}
              onAction={handleItemAction}
            />
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* SECTION 2: THE 5 HBO MAX-STYLE THEMATIC BANNERS          */}
      {/* (Bilingual Auto-Translate, Compact 6-Col Grid)           */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="space-y-10 sm:space-y-14 lg:space-y-18">
        {THEMATIC_BANNERS.map((banner) => {
          const displayTitle = language === 'en' ? banner.titleEn : banner.titleId;
          const displayTagline = language === 'en' ? banner.taglineEn : banner.taglineId;

          const hoveredIdx = hoveredBannerItem[banner.id];
          const isItemHovered = hoveredIdx !== undefined && hoveredIdx !== null;
          const activeItem = isItemHovered
            ? (banner.items[hoveredIdx] || banner.items[0])
            : banner.items[0];
          const activeLogo = activeItem.logoArt || (isItemHovered ? null : banner.logoArt);
          const activeGenre = language === 'en' ? activeItem.genreEn : activeItem.genreId;
          const activeDescription = isItemHovered
            ? (language === 'en' ? activeItem.synopsisEn : activeItem.synopsisId)
            : displayTagline;

          return (
            <div
              key={banner.id}
              onMouseLeave={() => {
                setHoveredBannerItem((prev) => {
                  if (prev[banner.id] === undefined) return prev;
                  const next = { ...prev };
                  delete next[banner.id];
                  return next;
                });
              }}
              className={`relative w-full bg-gradient-to-r ${banner.bgGradient} pt-8 pb-6 sm:pt-12 sm:pb-8 lg:pt-16 lg:pb-10 overflow-hidden transition-colors duration-500`}
            >
              {/* Vertical Gradient Vignette: smoothly dissolves top and bottom into the website's dark canvas */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#141414] via-transparent to-[#141414] pointer-events-none z-[4]" />

              {/* Top Feathered Gradient Transition */}
              <div className="absolute top-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-b from-[#141414] via-[#141414]/80 to-transparent pointer-events-none z-10" />

              {/* Bottom Feathered Gradient Transition */}
              <div className="absolute bottom-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent pointer-events-none z-10" />


              {/* Subtle background ambient overlay */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none z-[2]" />

              {/* Dynamic Atmospheric Radial Glow behind character cutout */}
              <div
                className="absolute right-0 sm:right-6 lg:right-20 top-0 bottom-0 w-72 sm:w-[500px] lg:w-[680px] pointer-events-none select-none opacity-80 z-[3]"
                style={{
                  background: banner.radialGlow,
                }}
              />

              {/* High-Impact Character Cutout PNG (Feathered top & bottom mask, prominently revealed above compact cards) */}
              <div className="absolute right-1 xs:right-2 sm:right-6 md:right-10 lg:right-16 xl:right-24 2xl:right-28 top-2 sm:top-3 md:top-4 lg:top-5 h-[300px] sm:h-[400px] md:h-[470px] lg:h-[540px] xl:h-[610px] 2xl:h-[660px] pointer-events-none select-none z-[12] flex items-start [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_75%,transparent_100%)]">
                <img
                  src={banner.cutoutArt}
                  alt={banner.cutoutAlt}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-auto object-contain object-top filter drop-shadow-[0_16px_40px_rgba(0,0,0,0.85)] brightness-105"
                />
              </div>

              <div className="relative max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-6 lg:px-12 3xl:px-16 space-y-3 sm:space-y-4 z-20">
                {/* Banner Header: Badge, Show Title Logo, & Tagline / Synopsis */}
                <div className="space-y-1.5 sm:space-y-2 max-w-[75%] sm:max-w-xl min-h-[105px] sm:min-h-[130px] lg:min-h-[155px] flex flex-col justify-end">
                  {/* Category Pill / Badge with dynamic genre hint when hovered */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-300 w-fit transition-all duration-300">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{displayTitle}</span>
                    {isItemHovered && (
                      <>
                        <span className="text-white/30">•</span>
                        <span className="text-white/80 font-normal normal-case">{activeGenre}</span>
                      </>
                    )}
                  </div>

                  {/* Official Show Logo PNG or Typographic Fallback */}
                  <div className="h-9 sm:h-12 lg:h-14 flex items-center">
                    {activeLogo && !failedLogos[String(activeItem.id)] ? (
                      <img
                        key={String(activeItem.id)}
                        src={activeLogo}
                        alt={activeItem.title}
                        loading="eager"
                        onError={() => {
                          setFailedLogos((prev) => ({ ...prev, [String(activeItem.id)]: true }));
                        }}
                        className="max-h-full max-w-[190px] sm:max-w-[270px] lg:max-w-[340px] object-contain object-left filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] brightness-110 animate-banner-fade"
                      />
                    ) : (
                      <h3
                        key={String(activeItem.id)}
                        className="text-lg sm:text-2xl lg:text-3xl font-black font-display text-white tracking-wider uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] line-clamp-1 animate-banner-fade"
                      >
                        {activeItem.title}
                      </h3>
                    )}
                  </div>

                  {/* Tagline / Synopsis with smooth fade animation */}
                  <p
                    key={String(activeItem.id) + (isItemHovered ? '-h' : '-d')}
                    className="text-xs sm:text-sm text-slate-300/85 font-light leading-relaxed line-clamp-2 drop-shadow animate-banner-fade min-h-[32px] sm:min-h-[38px]"
                  >
                    {activeDescription}
                  </p>
                </div>

                {/* 6 Poster Cards: Compact sizing so character cutout behind is prominently visible */}
                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-2 -mx-3.5 px-3.5 pb-2 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:gap-2.5 lg:gap-3 sm:mx-0 sm:px-0 sm:pb-0 max-w-5xl lg:max-w-6xl xl:max-w-[1360px] 2xl:max-w-[1440px] relative z-20">
                  {banner.items.map((item, idx) => {
                    const isLoading = loadingMediaId === item.id;
                    const displayGenre = language === 'en' ? item.genreEn : item.genreId;
                    const isCardActive = hoveredIdx === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setHoveredBannerItem((prev) => ({ ...prev, [banner.id]: idx }));
                          handleItemAction(item, 'details');
                        }}
                        onMouseEnter={() => {
                          playHover();
                          setHoveredBannerItem((prev) => ({ ...prev, [banner.id]: idx }));
                        }}
                        className={`group relative w-[115px] xs:w-[126px] sm:w-auto shrink-0 snap-start sm:shrink aspect-[2/3] max-w-[165px] xl:max-w-[180px] rounded-lg sm:rounded-xl overflow-hidden bg-cinema-950 border ${
                          isCardActive
                            ? 'border-amber-400/80 ring-2 ring-amber-400/40 -translate-y-1.5 shadow-2xl shadow-amber-500/15'
                            : 'border-white/[0.1] hover:border-white/40'
                        } shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer`}
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
                        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[8.5px] sm:text-[9.5px] font-bold text-amber-400">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>

                        {/* Bottom Information with Title & Metadata */}
                        <div className="absolute bottom-0 inset-x-0 p-2 sm:p-2.5 z-10 space-y-0.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-6 sm:pt-8 pr-6 sm:pr-2">
                          <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors drop-shadow leading-tight">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] text-amber-300/90 font-medium">
                            <span>{item.year}</span>
                            <span>•</span>
                            <span className="line-clamp-1 text-slate-300 font-normal">{displayGenre}</span>
                          </div>
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
