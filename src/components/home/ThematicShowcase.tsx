import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Info,
  ExternalLink,
  Star,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { fetchFullMediaItem } from '../../services/tmdb';
import { createMovieServers, createTvServers } from '../../data/mockCatalog';
import { PrimeHoverCard } from './PrimeHoverCard';
import {
  getActiveWeekIndex,
  getCuratedGenresForWeek,
  ARCHIVE_INITIAL_GENRES,
  type ShowcaseMediaDef,
  type WeekScheduleInfo,
} from '../../data/weeklyHighlights';

interface ThematicShowcaseProps {
  onPlayMedia: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
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
  cutoutPosition?: string;
  logoArt: string;
  logoAlt: string;
  items: ShowcaseMediaDef[];
}

// Fallback image constants ensuring no card is ever a blank void
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

// ─────────────────────────────────────────────────────────────
// DATA: 5 Thematic Curated Banners (5 Curated Titles Each, Bilingual)
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
    radialGlow: 'radial-gradient(circle at 75% 38%, rgba(225,29,72,0.42) 0%, rgba(159,18,57,0.18) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/hotd-cutout.png',
    cutoutAlt: 'House of the Dragon - Daemon Targaryen',
    cutoutPosition: 'right-2 sm:right-6 md:right-10 lg:right-16 xl:right-22 2xl:right-28',
    logoArt: 'https://image.tmdb.org/t/p/w500/aMYpHPNO3ZXH9dR3Mchrg2AgoNw.png',
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
        synopsisEn: 'A sharp social satire following the exploits of employees and guests at an exclusive luxury resort over a turbulent week.',
        synopsisId: 'Skandal dan intrik para tamu kaya di resor tropis mewah nan penuh rahasia gelap.',
        logoArt: 'https://image.tmdb.org/t/p/w500/krsdhZRZlwx8D31LzXTs893jvYl.png',
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
        synopsisId: 'Potret garis depan tenaga medis unit gawat darurat Pittsburgh berjuang menyelamatkan nyawa.',
        logoArt: 'https://image.tmdb.org/t/p/w500/7gQc9y2EORn9pZhGtAEdlEbpcpz.png',
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
        synopsisEn: 'The Roy family is known for controlling the biggest media and entertainment company in the world.',
        synopsisId: 'Keluarga Roy bersaing memperebutkan kendali atas konglomerat media global Waystar RoyCo.',
        logoArt: 'https://image.tmdb.org/t/p/w500/5MAURYSb9Q98fRWuSTOGFlztKIZ.png',
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
    radialGlow: 'radial-gradient(circle at 72% 38%, rgba(245,158,11,0.42) 0%, rgba(180,83,9,0.18) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/dune-cutout.png',
    cutoutAlt: 'Dune: Part Two - Paul Atreides & Chani',
    cutoutPosition: 'right-5 sm:right-10 md:right-16 lg:right-24 xl:right-32 2xl:right-40',
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
    radialGlow: 'radial-gradient(circle at 80% 38%, rgba(56,189,248,0.38) 0%, rgba(14,116,144,0.18) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/got-cutout.png',
    cutoutAlt: 'Game of Thrones - Daenerys Targaryen & Jon Snow',
    cutoutPosition: 'right-0 sm:right-0 md:right-1 lg:right-2 xl:right-4 2xl:right-8',
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
    radialGlow: 'radial-gradient(circle at 72% 38%, rgba(20,184,166,0.42) 0%, rgba(13,148,136,0.18) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/naked-and-afraid-cutout.png',
    cutoutAlt: 'Wilderness Survival Documentary Duo',
    cutoutPosition: 'right-0 sm:right-2 md:right-6 lg:right-12 xl:right-18 2xl:right-24',
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
    radialGlow: 'radial-gradient(circle at 76% 38%, rgba(234,179,8,0.42) 0%, rgba(161,98,7,0.18) 45%, transparent 75%)',
    cutoutArt: '/assets/cutouts/family-cutout.png',
    cutoutAlt: 'Adventure Time - Finn & Jake',
    cutoutPosition: 'right-2 sm:right-6 md:right-10 lg:right-14 xl:right-20 2xl:right-26',
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

  // Automated weekly rotation engine starting Sunday, 20 September 2026 00:00:00
  const realTimeWeekIndex = getActiveWeekIndex();
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(realTimeWeekIndex);
  const [isArchiveMode, setIsArchiveMode] = useState<boolean>(false);

  // Curated genres for the active or user-selected week
  const { weekInfo, discoverGenres } = useMemo(() => {
    if (isArchiveMode) {
      return {
        weekInfo: {
          index: -1,
          weekNumber: 0,
          startDate: new Date(2026, 8, 1),
          endDate: new Date(2026, 8, 19, 23, 59, 59),
          labelEn: 'Archive • Prior to 20 Sep 2026',
          labelId: 'Arsip • Sebelum 20 Sep 2026',
          badgeEn: 'Archive Collection',
          badgeId: 'Koleksi Arsip Awal',
        } as WeekScheduleInfo,
        discoverGenres: ARCHIVE_INITIAL_GENRES,
      };
    }
    const res = getCuratedGenresForWeek(selectedWeekIndex);
    return {
      weekInfo: res.weekInfo,
      discoverGenres: res.genres,
    };
  }, [selectedWeekIndex, isArchiveMode]);

  const activeGenre = discoverGenres[selectedGenreIndex] || discoverGenres[0];

  const handlePrevGenre = () => {
    playClick();
    setSelectedGenreIndex((prev) => (prev > 0 ? prev - 1 : discoverGenres.length - 1));
  };

  const handleNextGenre = () => {
    playClick();
    setSelectedGenreIndex((prev) => (prev < discoverGenres.length - 1 ? prev + 1 : 0));
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
        {/* Header with Title, Weekly Rotation Schedule Badge & Genre Switcher */}
        <div className="flex flex-col items-center text-center space-y-2.5 sm:space-y-3.5">
          {/* Weekly Curated Schedule Badge & Rotation Info */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-400/35 text-[10px] sm:text-[11px] font-sans tracking-[0.16em] sm:tracking-[0.2em] text-amber-300 uppercase font-semibold shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>
                {language === 'en'
                  ? `Weekly Curated • ${weekInfo.badgeEn}`
                  : `Pilihan Mingguan • ${weekInfo.badgeId}`}
              </span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10.5px] text-slate-300 font-light">
              <Clock className="w-3 h-3 text-amber-400/90" />
              <span>
                {language === 'en'
                  ? 'Refreshes every Sunday'
                  : 'Berganti otomatis setiap hari Minggu'}
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-3xl lg:text-4xl font-display font-medium text-white tracking-wide">
            {language === 'en' ? 'Discover The Best Of' : 'Jelajahi Yang Terbaik'}
          </h2>

          {/* Interactive Week Selector (Pekan 1 mulai 20 Sep 2026, Pekan 2, Arsip Awal) */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-inner">
            <button
              onClick={() => {
                playClick();
                setIsArchiveMode(false);
                setSelectedWeekIndex(0);
                setSelectedGenreIndex(0);
              }}
              className={`px-3 py-1 rounded-full text-[10.5px] sm:text-xs transition-all duration-200 cursor-pointer ${
                !isArchiveMode && selectedWeekIndex === 0
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/25 scale-[1.03]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'en' ? 'Week of 20 Sep - 26 Sep 2026 (New Recommended Highlight)' : 'Edisi 20 Sep - 26 Sep 2026 (Highlight Rekomendasi Baru)'}
            >
              {language === 'en' ? 'Week 1 (Sep 20)' : 'Pekan 1 (20 Sep)'}
            </button>

            <button
              onClick={() => {
                playClick();
                setIsArchiveMode(false);
                setSelectedWeekIndex(1);
                setSelectedGenreIndex(0);
              }}
              className={`px-3 py-1 rounded-full text-[10.5px] sm:text-xs transition-all duration-200 cursor-pointer ${
                !isArchiveMode && selectedWeekIndex === 1
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/25 scale-[1.03]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'en' ? 'Week of 27 Sep - 3 Oct 2026' : 'Edisi 27 Sep - 3 Okt 2026'}
            >
              {language === 'en' ? 'Week 2 (Sep 27)' : 'Pekan 2 (27 Sep)'}
            </button>

            <button
              onClick={() => {
                playClick();
                setIsArchiveMode(true);
                setSelectedGenreIndex(0);
              }}
              className={`px-2.5 py-1 rounded-full text-[10.5px] sm:text-xs transition-all duration-200 cursor-pointer ${
                isArchiveMode
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/25 scale-[1.03]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'en' ? 'Initial Archive (Prior to 20 Sep)' : 'Arsip Awal (Sebelum 20 Sep)'}
            >
              {language === 'en' ? 'Archive' : 'Arsip Awal'}
            </button>
          </div>

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
              {discoverGenres.map((g, idx) => {
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

        {/* 6 Landscape / Backdrop Grid Cards with Prime Video-style Hover Cards Centered Over Each Item */}
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
              className={`relative w-full bg-gradient-to-r ${banner.bgGradient} pt-10 pb-8 sm:pt-16 sm:pb-10 lg:pt-20 lg:pb-12 overflow-hidden transition-colors duration-500`}
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
              <div className="absolute inset-y-0 inset-x-0 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto pointer-events-none overflow-hidden z-[3]">
                <div
                  className="absolute right-0 top-0 bottom-0 w-full sm:w-[680px] lg:w-[840px] pointer-events-none select-none opacity-90"
                  style={{
                    background: banner.radialGlow,
                  }}
                />
              </div>

              {/* High-Impact Character Cutout PNG (Proportionally framed within the content container) */}
              <div className="absolute inset-y-0 inset-x-0 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-6 lg:px-12 3xl:px-16 pointer-events-none overflow-visible z-[12]">
                <div
                  className={`absolute ${banner.cutoutPosition || 'right-4 sm:right-8 md:right-14 lg:right-20 xl:right-28 2xl:right-32'} top-1 sm:top-2 md:top-3 lg:top-4 h-[370px] sm:h-[490px] md:h-[570px] lg:h-[650px] xl:h-[730px] 2xl:h-[800px] pointer-events-none select-none flex items-start`}
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 7%, black 74%, transparent 100%), linear-gradient(to left, transparent 0%, black 14%, black 100%)',
                    maskComposite: 'intersect',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 7%, black 74%, transparent 100%), linear-gradient(to left, transparent 0%, black 14%, black 100%)',
                    WebkitMaskComposite: 'source-in',
                  }}
                >
                  <img
                    src={banner.cutoutArt}
                    alt={banner.cutoutAlt}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-auto object-contain object-top filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)] drop-shadow-[0_0_50px_rgba(0,0,0,0.4)] brightness-[0.97] contrast-[1.01] saturate-[0.95]
                      blur-[3px] opacity-25
                      sm:blur-[2.5px] sm:opacity-35
                      md:blur-[1.5px] md:opacity-55
                      lg:blur-[0.6px] lg:opacity-100"
                  />
                </div>
              </div>

              {/* Mobile + Tablet: left-side dark scrim so text stays legible over the blurred cutout */}
              <div className="lg:hidden absolute inset-y-0 left-0 right-0 pointer-events-none z-[14]"
                style={{
                  background: 'linear-gradient(to right, #141414 25%, #141414dd 55%, #141414aa 72%, transparent 100%)',
                }}
              />

              <div className="relative max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-6 lg:px-12 3xl:px-16 space-y-3.5 sm:space-y-4.5 z-20">
                {/* Banner Header: Prestigious Category Title, Spotlight Show Logo, & Tagline / Synopsis */}
                <div className="space-y-2 sm:space-y-2.5 max-w-[85%] sm:max-w-xl lg:max-w-2xl min-h-[125px] sm:min-h-[150px] lg:min-h-[175px] flex flex-col justify-end">
                  {/* Category Eyebrow & Glowing Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border border-amber-400/35 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/20 w-fit">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
                        {language === 'en' ? 'Curated Collection' : 'Koleksi Pilihan'}
                      </span>
                    </div>

                    {isItemHovered && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] text-white/90 font-medium animate-banner-fade">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{activeGenre}</span>
                      </span>
                    )}
                  </div>

                  {/* Grand Category Title: Bold, Majestic & Premium */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black font-display tracking-wide uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                      <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
                        {displayTitle}
                      </span>
                    </h3>
                    <div className="hidden sm:block flex-1 max-w-[120px] h-[2px] bg-gradient-to-r from-amber-400/70 to-transparent rounded-full" />
                  </div>

                  {/* Official Show Logo PNG or Typographic Fallback */}
                  <div className="h-8 sm:h-11 lg:h-13 flex items-center pt-0.5">
                    {activeLogo && !failedLogos[String(activeItem.id)] ? (
                      <img
                        key={String(activeItem.id)}
                        src={activeLogo}
                        alt={activeItem.title}
                        loading="eager"
                        onError={() => {
                          setFailedLogos((prev) => ({ ...prev, [String(activeItem.id)]: true }));
                        }}
                        className="max-h-full max-w-[170px] sm:max-w-[240px] lg:max-w-[300px] object-contain object-left filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] brightness-110 animate-banner-fade"
                      />
                    ) : (
                      <span
                        key={String(activeItem.id)}
                        className="text-base sm:text-xl lg:text-2xl font-black font-display text-white tracking-wider uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] line-clamp-1 animate-banner-fade"
                      >
                        {activeItem.title}
                      </span>
                    )}
                  </div>

                  {/* Tagline / Synopsis with smooth fade animation */}
                  <p
                    key={String(activeItem.id) + (isItemHovered ? '-h' : '-d')}
                    className="text-xs sm:text-[13px] lg:text-sm text-slate-300/90 font-light leading-relaxed line-clamp-2 drop-shadow animate-banner-fade min-h-[32px] sm:min-h-[36px]"
                  >
                    {activeDescription}
                  </p>
                </div>

                {/* Poster Cards: Widescreen-safe, unclipped on hover with sm:overflow-visible and breathing room */}
                <div
                  className={`flex sm:grid ${
                    banner.items.length === 6 ? 'sm:grid-cols-6' : 'sm:grid-cols-5'
                  } overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar gap-3 sm:gap-3.5 md:gap-4 lg:gap-4.5 xl:gap-5 -mx-3.5 px-3.5 -my-2.5 py-2.5 sm:mx-0 sm:px-0 sm:-my-3.5 sm:py-3.5 max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1680px] relative z-20`}
                >
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
                        className={`group relative w-[155px] xs:w-[170px] sm:w-full min-w-0 shrink-0 snap-start sm:shrink-0 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-950 border ${
                          isCardActive
                            ? 'border-amber-400/80 ring-2 ring-amber-400/40 -translate-y-2 shadow-2xl shadow-amber-500/20'
                            : 'border-white/[0.1] hover:border-white/40'
                        } shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer`}
                      >
                        {/* Poster Image with onError fallback */}
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.src !== item.backdrop && item.backdrop) {
                              e.currentTarget.src = item.backdrop;
                            } else if (e.currentTarget.src !== FALLBACK_POSTER) {
                              e.currentTarget.src = FALLBACK_POSTER;
                            }
                          }}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-95 group-hover:brightness-105"
                        />

                        {/* Gradient Shadow Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                        {/* Top Rating Badge */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[9.5px] sm:text-[10.5px] font-bold text-amber-400 shadow-md">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>

                        {/* Bottom Information with Title & Metadata */}
                        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 z-10 space-y-0.5 sm:space-y-1 bg-gradient-to-t from-black/95 via-black/85 to-transparent pt-7 sm:pt-10 pr-7 sm:pr-3">
                          <h4 className="text-xs sm:text-[13px] lg:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors drop-shadow leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] lg:text-[11px] text-amber-300/90 font-medium">
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
                          className="md:hidden absolute bottom-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                          aria-label="Play Now"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
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
                            className="w-11 h-11 rounded-full bg-[#E50914] hover:bg-[#f40612] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-transform cursor-pointer"
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
