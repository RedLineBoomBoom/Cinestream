import type { MediaItem } from '../types/media';

// High definition legal streaming streams (MP4 & HLS capable)
const VIDEO_STREAMS = {
  TEARS_OF_STEEL: 'https://vjs.zencdn.net/v/oceans.mp4',
  SINTEL: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  BIG_BUCK: 'https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4',
  ELEPHANTS: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
  BLAZES: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
  ESCAPES: 'https://www.w3schools.com/html/mov_bbb.mp4',
};

// Multi-Engine High Availability Streaming Servers with Auto-Failover
export const createMovieServers = (tmdbId: number, _fallbackUrl?: string) => [
  {
    id: 'srv-vidsrc',
    name: 'Server 1 • VidSrc Prime (Ultra Stabil)',
    speed: '5 ms',
    quality: '1080p FHD',
    url: `https://vidsrc.to/embed/movie/${tmdbId}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: 'srv-autoembed',
    name: 'Server 2 • AutoEmbed Ultra (Anti-Macet HD)',
    speed: '8 ms',
    quality: '1080p / 60fps HD',
    url: `https://player.autoembed.co/embed/movie/${tmdbId}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: 'srv-2embed',
    name: 'Server 3 • 2Embed Cinema (Sinema Asia & Anime)',
    speed: '11 ms',
    quality: '1080p FHD',
    url: `https://www.2embed.cc/embed/${tmdbId}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: 'srv-multiembed',
    name: 'Server 4 • MultiStream Pro (Multi-Sumber & Failover)',
    speed: '13 ms',
    quality: '1080p FHD',
    url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: 'srv-vidsrc-pro',
    name: 'Server 5 • VidSrc Pro (Multi-Sub & Cepat)',
    speed: '10 ms',
    quality: '1080p FHD',
    url: `https://vidsrc.pm/embed/movie/${tmdbId}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: 'srv-vidlink',
    name: 'Server 6 • VidLink HD (Audio Stereo Jernih)',
    speed: '19 ms',
    quality: '1080p FHD',
    url: `https://vidlink.pro/movie/${tmdbId}`,
    status: 'online' as const,
    isEmbed: true,
  },
];

// Multi-Engine High Availability Streaming Servers for TV Series
export const createTvServers = (
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  _fallbackUrl?: string
) => [
  {
    id: `srv-vidsrc-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 1 • VidSrc Prime (Ultra Stabil)',
    speed: '5 ms',
    quality: '1080p FHD',
    url: `https://vidsrc.to/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: `srv-autoembed-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 2 • AutoEmbed Ultra (Anti-Macet HD)',
    speed: '8 ms',
    quality: '1080p / 60fps HD',
    url: `https://player.autoembed.co/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: `srv-2embed-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 3 • 2Embed Series (Sinema Asia & Anime)',
    speed: '11 ms',
    quality: '1080p FHD',
    url: `https://www.2embed.cc/embedtv/${tmdbId}&s=${seasonNumber}&e=${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: `srv-multiembed-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 4 • MultiStream TV (Multi-Sumber & Failover)',
    speed: '13 ms',
    quality: '1080p FHD',
    url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${seasonNumber}&e=${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: `srv-vidsrc-pro-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 5 • VidSrc Pro TV (Multi-Sub & Cepat)',
    speed: '10 ms',
    quality: '1080p FHD',
    url: `https://vidsrc.pm/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
  {
    id: `srv-vidlink-s${seasonNumber}e${episodeNumber}`,
    name: 'Server 6 • VidLink TV (Audio Stereo Jernih)',
    speed: '19 ms',
    quality: '1080p FHD',
    url: `https://vidlink.pro/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`,
    status: 'online' as const,
    isEmbed: true,
  },
];

const RAW_MOCK_CATALOG: MediaItem[] = [
  // 1. DUNE: PART TWO
  {
    id: 'dune-part-2',
    tmdbId: 693134,
    imdbId: 'tt15239678',
    imdbUrl: 'https://www.imdb.com/title/tt15239678/',
    imdbRating: 8.5,
    imdbVotes: '550,000+',
    imdbPlot: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
    writer: 'Denis Villeneuve, Jon Spaihts, Frank Herbert',
    awards: 'Nominated for 5 Oscars, 48 wins & 120 nominations total',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    synopsis: 'Paul Atreides bersatu dengan Chani dan suku Fremen untuk membalas dendam terhadap para konspirator yang menghancurkan keluarganya. Menghadapi dilema takdir alam semesta, ia harus memimpin perang suci di planet gurun Arrakis.',
    rating: 8.6,
    rottenTomatoes: 93,
    year: 2024,
    releaseDate: '1 Maret 2024',
    duration: '2j 46m',
    quality: '1080p FHD',
    ageRating: '13+',
    genres: ['Action', 'Adventure', 'Sci-Fi', 'Drama'],
    country: 'Amerika Serikat',
    director: 'Denis Villeneuve',
    featured: true,
    trending: true,
    topRated: true,
    audioTracks: ['English [Dolby Atmos 7.1]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(693134, VIDEO_STREAMS.TEARS_OF_STEEL),
    cast: [
      { name: 'Timothée Chalamet', role: 'Paul Atreides', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Zendaya', role: 'Chani', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { name: 'Rebecca Ferguson', role: 'Lady Jessica', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
      { name: 'Austin Butler', role: 'Feyd-Rautha', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
    ],
    reviews: [
      { id: 'r1', author: 'Rian Pratama', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop', rating: 5, date: '2 hari lalu', content: 'Visual spektakuler dan audio menggelegar! Masterpiece sci-fi abad ini.', likes: 42 },
      { id: 'r2', author: 'Siti Nurhaliza', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop', rating: 5, date: '5 hari lalu', content: 'Akting Austin Butler luar biasa dingin. Subtitle Indonesia sangat pas!', likes: 18 },
    ]
  },

  // 2. AGAK LAEN (Film Indonesia Terlaris 2024)
  {
    id: 'agak-laen',
    tmdbId: 1175161,
    imdbId: 'tt28856462',
    imdbUrl: 'https://www.imdb.com/title/tt28856462/',
    imdbRating: 8.0,
    imdbVotes: '3,800+',
    imdbPlot: 'Four haunted house workers at a night fair accidentally cause the death of an elderly politician with a heart condition, forcing them to bury the corpse inside the attraction which unexpectedly becomes wildly popular.',
    writer: 'Muhadkly Acho',
    awards: 'Highest-grossing Indonesian comedy film of 2024 (9.1M+ admissions)',
    title: 'Agak Laen',
    titleId: 'Agak Laen',
    titleEn: 'Agak Laen',
    originalTitle: 'Agak Laen (2024)',
    originCountry: ['ID'],
    originalLanguage: 'id',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg5YzA5MmEtN2NkOC00M2JhLTgzZjktZjg1M2U3ZmEyN2IyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/aMD179LsRq3oyFeAUSjij3dDtRX.jpg',
    synopsis: 'Empat sekawan pengelola rumah hantu di pasar malam yang sepi pengunjung berupaya mencari cara agar wahana mereka kembali ramai. Namun sebuah insiden tak terduga terjadi saat seorang caleg meninggal karena serangan jantung di dalam wahana.',
    rating: 8.0,
    rottenTomatoes: 88,
    year: 2024,
    releaseDate: '1 Februari 2024',
    duration: '1j 59m',
    quality: '1080p FHD',
    ageRating: '13+',
    genres: ['Comedy', 'Horror', 'Mystery'],
    country: 'Indonesia',
    director: 'Muhadkly Acho',
    featured: true,
    trending: true,
    topRated: false,
    audioTracks: ['Indonesia [Original Audio]'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(1175161, VIDEO_STREAMS.BIG_BUCK),
    cast: [
      { name: 'Bene Dion', role: 'Bene', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Boris Bokir', role: 'Boris', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Indra Jegel', role: 'Jegel', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Oki Rengga', role: 'Oki', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop' },
    ]
  },

  // 3. SIKSA KUBUR (Joko Anwar Horor 2024)
  {
    id: 'siksa-kubur',
    tmdbId: 1119527,
    imdbId: 'tt27004148',
    imdbUrl: 'https://www.imdb.com/title/tt27004148/',
    imdbRating: 6.2,
    imdbVotes: '2,953 votes',
    imdbPlot: 'When a violent act kills her parents, Sita vows to debunk the idea of supernatural torment after death — a fixation that leads her on a dark quest.',
    writer: 'Joko Anwar',
    awards: '2 wins & 20 nominations total',
    title: 'Siksa Kubur',
    titleId: 'Siksa Kubur',
    titleEn: 'Grave Torture',
    originalTitle: 'Siksa Kubur',
    originCountry: ['ID'],
    originalLanguage: 'id',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzdkZmQ2MjUtOTdiMC00ODQ4LThlYmMtZDU3YjY1NDRlNTM3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/fTDCrqJ9uxXHP4F6gY9SUWN6Xsa.jpg',
    synopsis: 'Setelah kedua orang tuanya menjadi korban bom bunuh diri, Sita menjadi tidak percaya pada agama. Sita mencari orang paling berdosa untuk membuktikan bahwa siksa kubur tidak ada dengan ikut masuk ke dalam liang kuburnya.',
    rating: 7.6,
    year: 2024,
    releaseDate: '11 April 2024',
    duration: '1j 57m',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Horror', 'Mystery', 'Drama'],
    country: 'Indonesia',
    director: 'Joko Anwar',
    featured: false,
    trending: true,
    topRated: false,
    audioTracks: ['Indonesia [Dolby Atmos]'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(1119527, VIDEO_STREAMS.ESCAPES),
    cast: [
      { name: 'Faradina Mufti', role: 'Sita', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { name: 'Reza Rahadian', role: 'Adil', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Christine Hakim', role: 'Nani', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
    ]
  },

  // 4. DEADPOOL & WOLVERINE (2024)
  {
    id: 'deadpool-and-wolverine',
    tmdbId: 533535,
    imdbId: 'tt6263850',
    imdbUrl: 'https://www.imdb.com/title/tt6263850/',
    imdbRating: 7.7,
    imdbVotes: '565,000+',
    imdbPlot: 'Deadpool is offered a place in the Marvel Cinematic Universe by the Time Variance Authority, but instead recruits a variant of Wolverine to save his universe from extinction.',
    writer: 'Ryan Reynolds, Rhett Reese, Paul Wernick',
    awards: '31 wins & 71 nominations total',
    title: 'Deadpool & Wolverine',
    originalTitle: 'Deadpool & Wolverine',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BZTk5ODY0MmQtMzA3Ni00NGY1LThiYzItZThiNjFiNDM4MTM3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    synopsis: 'Wade Wilson yang telah pensiun sebagai tentara bayaran terpaksa kembali beraksi ketika Time Variance Authority (TVA) mengancam garis waktunya. Bersama varian Wolverine yang enggan, mereka melintasi Void.',
    rating: 8.0,
    rottenTomatoes: 79,
    year: 2024,
    releaseDate: '26 Juli 2024',
    duration: '2j 08m',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    country: 'Amerika Serikat',
    director: 'Shawn Levy',
    featured: true,
    trending: true,
    topRated: false,
    audioTracks: ['English [Dolby Atmos]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(533535, VIDEO_STREAMS.BLAZES),
    cast: [
      { name: 'Ryan Reynolds', role: 'Wade Wilson / Deadpool', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Hugh Jackman', role: 'Logan / Wolverine', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Emma Corrin', role: 'Cassandra Nova', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
    ]
  },

  // 5. SHŌGUN (Emmy Winner 2024)
  {
    id: 'shogun',
    tmdbId: 126308,
    imdbId: 'tt2788316',
    imdbUrl: 'https://www.imdb.com/title/tt2788316/',
    imdbRating: 8.7,
    imdbVotes: '240,000+',
    imdbPlot: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power and devastate his formidable enemies.',
    writer: 'Rachel Kondo, Justin Marks, James Clavell',
    awards: 'Record-breaking 18 Primetime Emmy Awards',
    title: 'Shōgun',
    originalTitle: 'Shōgun (2024 FX Series)',
    type: 'series',
    poster: 'https://m.media-amazon.com/images/M/MV5BZmJkMDRjYzEtMWI3Ny00OWE3LWJlNTItMGQ1MTQzMzc3NDY5XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg',
    synopsis: 'Di Jepang abad ke-17 menjelang perang saudara yang menentukan satu abad berikutnya, Lord Yoshii Toranaga berjuang untuk bertahan hidup saat Dewan Bupati bersatu melawannya, sampai kapal Eropa misterius terdampar di desa nelayan.',
    rating: 8.8,
    rottenTomatoes: 99,
    year: 2024,
    releaseDate: '27 Februari 2024',
    duration: '10 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Action', 'Adventure', 'Drama', 'History'],
    country: 'Amerika Serikat',
    director: 'Rachel Kondo, Justin Marks',
    featured: true,
    trending: true,
    topRated: true,
    audioTracks: ['Japanese / English [Original]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(126308, 1, 1, VIDEO_STREAMS.TEARS_OF_STEEL),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Musim 1 (2024)',
        episodes: [
          {
            id: 'shogun-s1e1',
            episodeNumber: 1,
            title: 'Bab Satu: Anjin',
            duration: '1j 02m',
            thumbnail: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?q=80&w=400&auto=format&fit=crop',
            synopsis: 'John Blackthorne terdampar di Izu, mendapati dirinya berada di tengah intrik politik feodal Jepang yang rumit.',
            videoUrl: 'https://vidlink.pro/tv/126308/1/1',
            servers: createTvServers(126308, 1, 1, VIDEO_STREAMS.TEARS_OF_STEEL)
          },
          {
            id: 'shogun-s1e2',
            episodeNumber: 2,
            title: 'Bab Dua: Pelayan Dua Tuan',
            duration: '58m',
            thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Kedatangan Blackthorne di Osaka memicu perpecahan tajam di antara Dewan Bupati yang berniat menyingkirkannya.',
            videoUrl: 'https://vidlink.pro/tv/126308/1/2',
            servers: createTvServers(126308, 1, 2, VIDEO_STREAMS.BLAZES)
          },
          {
            id: 'shogun-s1e3',
            episodeNumber: 3,
            title: 'Bab Tiga: Hari Esok Adalah Hari Esok',
            duration: '56m',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Toranaga mengatur pelarian rahasia dari Osaka saat pasukan musuh mulai mengepung perbatasan teluk.',
            videoUrl: 'https://vidlink.pro/tv/126308/1/3',
            servers: createTvServers(126308, 1, 3, VIDEO_STREAMS.ESCAPES)
          }
        ]
      }
    ],
    cast: [
      { name: 'Hiroyuki Sanada', role: 'Lord Yoshii Toranaga', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Cosmo Jarvis', role: 'John Blackthorne', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Anna Sawai', role: 'Toda Mariko', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
    ]
  },

  // 6. THE LAST OF US
  {
    id: 'the-last-of-us',
    tmdbId: 100088,
    imdbId: 'tt3581920',
    imdbUrl: 'https://www.imdb.com/title/tt3581920/',
    imdbRating: 8.8,
    imdbVotes: '540,000+',
    imdbPlot: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.',
    writer: 'Craig Mazin, Neil Druckmann',
    awards: '8 Primetime Emmy Awards, 37 wins & 142 nominations total',
    title: 'The Last of Us',
    originalTitle: 'The Last of Us',
    type: 'series',
    poster: 'https://m.media-amazon.com/images/M/MV5BYWI3ODJlMzktY2U5NC00ZjdlLWE1MGItNWQxZDk3NWNjN2RhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
    synopsis: 'Dua puluh tahun setelah pandemi jamur menghancurkan peradaban, Joel, seorang penyintas yang tangguh, disewa untuk menyelundupkan Ellie, gadis berusia 14 tahun, keluar dari zona karantina yang menindas.',
    rating: 8.8,
    rottenTomatoes: 96,
    year: 2023,
    releaseDate: '15 Januari 2023',
    duration: '9 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 9,
    releasedEpisodes: 9,
    genres: ['Action', 'Adventure', 'Drama', 'Horror', 'Sci-Fi'],
    country: 'Amerika Serikat',
    director: 'Craig Mazin, Neil Druckmann',
    featured: true,
    trending: true,
    topRated: true,
    audioTracks: ['English [Dolby 5.1]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(100088, 1, 1, VIDEO_STREAMS.BLAZES),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1 (2023)',
        episodes: [
          {
            id: 'tlou-s1e1',
            episodeNumber: 1,
            title: 'When You\'re Lost in the Darkness',
            duration: '1j 21m',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Dua puluh tahun setelah wabah jamur menghancurkan planet, Joel dan Tess harus menjalankan misi berbahaya yang mengubah segalanya.',
            videoUrl: 'https://vidlink.pro/tv/100088/1/1',
            servers: createTvServers(100088, 1, 1, VIDEO_STREAMS.BLAZES)
          },
          {
            id: 'tlou-s1e2',
            episodeNumber: 2,
            title: 'Infected',
            duration: '53m',
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Meninggalkan zona karantina, Joel, Tess, dan Ellie melintasi Boston yang hancur dan sarat akan ancaman Clicker.',
            videoUrl: 'https://vidlink.pro/tv/100088/1/2',
            servers: createTvServers(100088, 1, 2, VIDEO_STREAMS.TEARS_OF_STEEL)
          },
          {
            id: 'tlou-s1e3',
            episodeNumber: 3,
            title: 'Long, Long Time',
            duration: '1j 15m',
            thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Kisah bertahan hidup Bill yang membangun benteng terisolasi hingga kedatangan Frank yang tak terduga.',
            videoUrl: 'https://vidlink.pro/tv/100088/1/3',
            servers: createTvServers(100088, 1, 3, VIDEO_STREAMS.ESCAPES)
          }
        ]
      }
    ],
    cast: [
      { name: 'Pedro Pascal', role: 'Joel Miller', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Bella Ramsey', role: 'Ellie Williams', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { name: 'Gabriel Luna', role: 'Tommy Miller', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 7. OPPENHEIMER
  {
    id: 'oppenheimer',
    tmdbId: 872585,
    imdbId: 'tt15398776',
    imdbUrl: 'https://www.imdb.com/title/tt15398776/',
    imdbRating: 8.2,
    imdbVotes: '1,024,000+',
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
    synopsis: 'Kisah fisikawan teoritis J. Robert Oppenheimer yang memimpin Proyek Manhattan di Los Alamos untuk mengembangkan senjata nuklir pertama di dunia yang mengubah jalannya peradaban manusia selamanya.',
    synopsisEn: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during the Manhattan Project at Los Alamos.',
    rating: 8.9,
    rottenTomatoes: 93,
    year: 2023,
    releaseDate: '19 Juli 2023',
    duration: '3j 00m',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Biography', 'Drama', 'History'],
    country: 'Amerika Serikat',
    director: 'Christopher Nolan',
    featured: false,
    trending: true,
    topRated: true,
    audioTracks: ['English [Dolby Atmos 7.1]'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(872585, VIDEO_STREAMS.ESCAPES),
    cast: [
      { name: 'Cillian Murphy', role: 'J. Robert Oppenheimer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Emily Blunt', role: 'Katherine Oppenheimer', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
      { name: 'Robert Downey Jr.', role: 'Lewis Strauss', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 8. FALLOUT (2024 Series)
  {
    id: 'fallout',
    tmdbId: 106379,
    imdbId: 'tt12637874',
    imdbUrl: 'https://www.imdb.com/title/tt12637874/',
    imdbRating: 8.3,
    imdbVotes: '389,000+',
    title: 'Fallout',
    originalTitle: 'Fallout Season 1',
    type: 'series',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzE1MTZmY2ItMTgxNi00OGU5LTk4NTItMmY2ODFhYzhjZjRkXkEyXkFqcGc@._V1_QL75_UX380_CR0,57,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg',
    synopsis: 'Dua ratus tahun setelah kiamat nuklir, penghuni bunker perlindungan mewah terpaksa kembali ke permukaan Los Angeles yang liar dan penuh radiasi, menemukan alam semesta yang aneh, brutal, dan penuh intrik.',
    synopsisEn: 'Two hundred years after a nuclear apocalypse, the gentle residents of luxury fallout shelters are forced to return to the irradiated surface of Los Angeles, discovering an incredibly complex, gleefully weird, and violent universe.',
    rating: 8.4,
    rottenTomatoes: 94,
    year: 2024,
    releaseDate: '10 April 2024',
    duration: '8 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 8,
    releasedEpisodes: 8,
    genres: ['Action', 'Adventure', 'Sci-Fi', 'Drama'],
    country: 'Amerika Serikat',
    director: 'Jonathan Nolan, Lisa Joy',
    featured: false,
    trending: true,
    topRated: false,
    audioTracks: ['English [Dolby Atmos]'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(106379, 1, 1, VIDEO_STREAMS.TEARS_OF_STEEL),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Musim 1 (2024)',
        episodes: [
          {
            id: 'fallout-s1e1',
            episodeNumber: 1,
            title: 'Akhir Dunia (The End)',
            duration: '1j 14m',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Lucy meninggalkan kenyamanan Vault 33 demi mencari ayahnya yang diculik ke gurun tandus California.',
            videoUrl: 'https://vidlink.pro/tv/106379/1/1',
            servers: createTvServers(106379, 1, 1, VIDEO_STREAMS.TEARS_OF_STEEL)
          }
        ]
      }
    ],
    cast: [
      { name: 'Ella Purnell', role: 'Lucy MacLean', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { name: 'Walton Goggins', role: 'The Ghoul / Cooper Howard', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Aaron Moten', role: 'Maximus', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 9. SOLO LEVELING (Anime)
  {
    id: 'solo-leveling',
    tmdbId: 127532,
    imdbId: 'tt21209876',
    imdbUrl: 'https://www.imdb.com/title/tt21209876/',
    imdbRating: 8.5,
    imdbVotes: '112,000+',
    title: 'Solo Leveling',
    originalTitle: 'Solo Leveling',
    type: 'anime',
    poster: 'https://m.media-amazon.com/images/M/MV5BM2M4YzdkMTEtMjUyYy00ZWY0LWI5ODQtNGRkZWQ1MzU5MWM2XkEyXkFqcGc@._V1_QL75_UY562_CR9,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg',
    synopsis: 'Sung Jin-woo, hunter terlemah berperingkat E, secara misterius terpilih oleh program Sistem setelah insiden Dungeon Ganda mematikan, memberinya kemampuan unik untuk naik level tanpa batas.',
    synopsisEn: 'When the world is plagued by dangerous monsters, weak hunter Sung Jin-woo is granted mysterious powers through a quest system that allows him to level up without limitations.',
    rating: 8.5,
    year: 2024,
    releaseDate: '7 Januari 2024',
    duration: '12 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 12,
    releasedEpisodes: 12,
    genres: ['Anime', 'Action', 'Fantasy', 'Adventure'],
    country: 'Jepang',
    director: 'Shunsuke Nakashige',
    featured: true,
    trending: true,
    topRated: true,
    audioTracks: ['Jepang [Original]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(127532, 1, 1, VIDEO_STREAMS.BLAZES),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1: Arise',
        episodes: [
          {
            id: 'sl-e1',
            episodeNumber: 1,
            title: 'I\'m Used to It',
            duration: '24m',
            thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Jin-woo mempertaruhkan nyawanya di Dungeon tingkat D untuk membiayai pengobatan ibunya.',
            videoUrl: 'https://vidlink.pro/tv/127532/1/1',
            servers: createTvServers(127532, 1, 1, VIDEO_STREAMS.BLAZES)
          },
          {
            id: 'sl-e2',
            episodeNumber: 2,
            title: 'If I Had One More Chance',
            duration: '24m',
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Ujian mematikan dari Patung Dewa di Dungeon Ganda menghadapkan para hunter pada keputusasaan total.',
            videoUrl: 'https://vidlink.pro/tv/127532/1/2',
            servers: createTvServers(127532, 1, 2, VIDEO_STREAMS.TEARS_OF_STEEL)
          }
        ]
      }
    ],
    cast: [
      { name: 'Taito Ban', role: 'Sung Jin-woo (Voice)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Genta Nakamura', role: 'Yoo Jin-ho (Voice)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 10. QUEEN OF TEARS (Drakor)
  {
    id: 'queen-of-tears',
    tmdbId: 215720,
    imdbId: 'tt27668559',
    imdbUrl: 'https://www.imdb.com/title/tt27668559/',
    imdbRating: 8.2,
    imdbVotes: '25,800+',
    title: 'Queen of Tears',
    originalTitle: 'Queen of Tears',
    type: 'drama',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWNmYmQ2NzctNTA1NS00NGU2LThjOTQtYTgxNmUyYmNjODYyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/wcP3FsRLog4GNEs9PFrDKKQdcof.jpg',
    synopsis: 'Ratu department store dan pangeran supermarket menghadapi krisis pernikahan di tahun ketiga mereka, sampai sebuah kabar mengejutkan menyulut kembali bara cinta di tengah intrik konglomerat Queens Group.',
    synopsisEn: 'The queen of department stores and the prince of supermarkets weather a marital crisis, until love miraculously begins to bloom again amidst high-stakes corporate drama.',
    rating: 8.4,
    year: 2024,
    releaseDate: '9 Maret 2024',
    duration: '16 Episode',
    quality: '1080p FHD',
    ageRating: '13+',
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 16,
    releasedEpisodes: 16,
    genres: ['Drama', 'Romance', 'Comedy'],
    country: 'Korea Selatan',
    director: 'Jang Young-woo, Kim Hee-won',
    featured: false,
    trending: true,
    topRated: true,
    audioTracks: ['Korean [Original]'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(215720, 1, 1, VIDEO_STREAMS.BIG_BUCK),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            id: 'qot-e1',
            episodeNumber: 1,
            title: 'Episode 1: Keajaiban Pernikahan',
            duration: '1j 18m',
            thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Baek Hyun-woo merencanakan perceraian dengan sang pewaris chaebol Hong Hae-in, hingga kabar medis mengejutkan datang.',
            videoUrl: 'https://vidlink.pro/tv/215720/1/1',
            servers: createTvServers(215720, 1, 1, VIDEO_STREAMS.BIG_BUCK)
          }
        ]
      }
    ],
    cast: [
      { name: 'Kim Soo-hyun', role: 'Baek Hyun-woo', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Kim Ji-won', role: 'Hong Hae-in', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 11. SPIDER-MAN: ACROSS THE SPIDER-VERSE
  {
    id: 'spider-man-across-spiderverse',
    tmdbId: 569094,
    imdbId: 'tt9362722',
    imdbUrl: 'https://www.imdb.com/title/tt9362722/',
    imdbRating: 8.7,
    imdbVotes: '390,000+',
    title: 'Spider-Man: Across the Spider-Verse',
    originalTitle: 'Spider-Man: Across the Spider-Verse',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BNThiZjA3MjItZGY5Ni00ZmJhLWEwN2EtOTBlYTA4Y2E0M2ZmXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg',
    synopsis: 'Miles Morales terlempar melintasi Multiverse, di mana ia bertemu tim Spider-Society pimpinan Miguel O\'Hara yang bertugas melindungi keberadaan semesta. Konflik muncul saat mereka berselisih tentang cara menghadapi ancaman The Spot.',
    synopsisEn: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence, but clashes on how to handle a catastrophic threat.',
    rating: 8.7,
    rottenTomatoes: 95,
    year: 2023,
    releaseDate: '2 Juni 2023',
    duration: '2j 20m',
    quality: '1080p FHD',
    ageRating: 'SU',
    genres: ['Animation', 'Action', 'Adventure', 'Sci-Fi'],
    country: 'Amerika Serikat',
    director: 'Joaquim Dos Santos, Kemp Powers',
    featured: false,
    trending: true,
    topRated: true,
    audioTracks: ['English [Dolby Atmos 7.1]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(569094, VIDEO_STREAMS.TEARS_OF_STEEL),
    cast: [
      { name: 'Shameik Moore', role: 'Miles Morales (Voice)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Hailee Steinfeld', role: 'Gwen Stacy (Voice)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { name: 'Oscar Isaac', role: 'Miguel O\'Hara (Voice)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 12. GADIS KRETEK (Cigarette Girl)
  {
    id: 'gadis-kretek',
    tmdbId: 228957,
    imdbId: 'tt21279114',
    imdbUrl: 'https://www.imdb.com/title/tt21279114/',
    imdbRating: 8.0,
    imdbVotes: '3,800+',
    title: 'Gadis Kretek',
    titleId: 'Gadis Kretek',
    titleEn: 'Cigarette Girl',
    originalTitle: 'Gadis Kretek',
    originCountry: ['ID'],
    originalLanguage: 'id',
    type: 'series',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjk1NDVhYjAtMGIxOS00NTBhLWEyNGItYTIyNTBiMGFiZTIxXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/akjmJsCDpvDP5tLoAQCF9AiWqJb.jpg',
    synopsis: 'Perjalanan melintasi waktu untuk mencari Jeng Yah, peracik saus kretek istimewa di masa kejayaan industri tembakau Indonesia tahun 1960-an, mengungkap rahasia keluarga dan cinta terlarang.',
    synopsisEn: 'A family seeks a mysterious woman named Jeng Yah who perfected an artisanal cigarette sauce in 1960s Indonesia, uncovering long-buried secrets and forbidden love.',
    rating: 8.2,
    year: 2023,
    releaseDate: '2 November 2023',
    duration: '5 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 5,
    releasedEpisodes: 5,
    genres: ['Drama', 'History', 'Romance'],
    country: 'Indonesia',
    director: 'Kamila Andini, Ifa Isfansyah',
    featured: false,
    trending: true,
    topRated: false,
    audioTracks: ['Indonesia [Spatial Audio]'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(228957, 1, 1, VIDEO_STREAMS.ESCAPES),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            id: 'gk-e1',
            episodeNumber: 1,
            title: 'Jeng Yah',
            duration: '1j 08m',
            thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Soeraja yang terbaring sekarat memanggil nama Jeng Yah, mendorong putranya Lebas untuk mencari perempuan misterius itu.',
            videoUrl: 'https://vidlink.pro/tv/228957/1/1',
            servers: createTvServers(228957, 1, 1, VIDEO_STREAMS.ESCAPES)
          }
        ]
      }
    ],
    cast: [
      { name: 'Dian Sastrowardoyo', role: 'Dasiyah / Jeng Yah', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
      { name: 'Ario Bayu', role: 'Soeraja', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Arya Saloka', role: 'Lebas', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 13. MOVING (Drama Korea Aksi Manhwa)
  {
    id: 'moving',
    tmdbId: 126485,
    imdbId: 'tt24640580',
    imdbUrl: 'https://www.imdb.com/title/tt24640580/',
    imdbRating: 8.5,
    imdbVotes: '16,000+',
    title: 'Moving',
    originalTitle: 'Moving (2023)',
    type: 'drama',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTg4NTI5NmItNGJjNC00ZmFhLTg0NzctZWQxZjAzYTAyNTQwXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/mdgDziNKuZ7HwDLeaAw3sd5Am7p.jpg',
    synopsis: 'Tiga remaja sekolah menengah yang mewarisi kekuatan super luar biasa dari orang tua mereka yang mantan agen rahasia, berusaha menyembunyikan identitas mereka dari pembunuh misterius Frank.',
    synopsisEn: 'Children who possess inherited supernatural abilities and their secret-agent parents work together to evade deadly government intelligence operatives and ruthless assassins.',
    rating: 8.5,
    year: 2023,
    releaseDate: '9 Agustus 2023',
    duration: '20 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Action', 'Drama', 'Fantasy', 'Sci-Fi'],
    country: 'Korea Selatan',
    director: 'Park In-je',
    featured: false,
    trending: true,
    topRated: true,
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 20,
    releasedEpisodes: 20,
    audioTracks: ['Korean [Dolby 5.1]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(126485, 1, 1, VIDEO_STREAMS.BLAZES),
    seasons: [
      {
        seasonNumber: 1,
        title: 'Musim 1',
        episodes: [
          {
            id: 'moving-e1',
            episodeNumber: 1,
            title: 'Kelahiran Sang Penerbang',
            duration: '48m',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Bong-seok berjuang menyembunyikan kemampuannya melayang di udara saat bertemu siswi pindahan Jang Hui-soo.',
            videoUrl: 'https://vidlink.pro/tv/126485/1/1',
            servers: createTvServers(126485, 1, 1, VIDEO_STREAMS.BLAZES)
          }
        ]
      }
    ],
    cast: [
      { name: 'Ryu Seung-ryong', role: 'Jang Ju-won', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Han Hyo-joo', role: 'Lee Mi-hyun', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
      { name: 'Zo In-sung', role: 'Kim Doo-shik', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 14. JUJUTSU KAISEN (Shibuya Incident)
  {
    id: 'jujutsu-kaisen-shibuya',
    tmdbId: 95479,
    imdbId: 'tt12343534',
    imdbUrl: 'https://www.imdb.com/title/tt12343534/',
    imdbRating: 8.6,
    imdbVotes: '115,000+',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    originalTitle: 'Jujutsu Kaisen Season 2',
    type: 'anime',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjBlNTExMDAtMWZjZi00MDc5LWFkMjgtZDU0ZWQ5ODk3YWY5XkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/qpin8cASXEVtwhzNsprHYFiOAGk.jpg',
    synopsis: 'Pada malam Halloween di Shibuya, tirai kutukan turun mengurung ribuan warga sipil. Rencana licik Pseudo-Geto untuk menyegel Satoru Gojo dimulai dalam pertempuran kutukan paling mematikan.',
    synopsisEn: 'On Halloween night in Shibuya, a veil descends trapping thousands of civilians as Pseudo-Geto initiates an ambush to seal Satoru Gojo in a desperate battle of sorcery.',
    rating: 8.6,
    year: 2023,
    releaseDate: '31 Agustus 2023',
    duration: '23 Episode',
    quality: '1080p FHD',
    ageRating: '17+',
    genres: ['Anime', 'Action', 'Supernatural', 'Fantasy'],
    country: 'Jepang',
    director: 'Shota Goshozono',
    featured: false,
    trending: true,
    topRated: true,
    status: 'Completed',
    isOngoing: false,
    totalEpisodes: 23,
    releasedEpisodes: 23,
    audioTracks: ['Jepang [Original]', 'Indonesia Dub'],
    subtitles: ['Indonesia', 'English'],
    servers: createTvServers(95479, 2, 1, VIDEO_STREAMS.TEARS_OF_STEEL),
    seasons: [
      {
        seasonNumber: 2,
        title: 'Season 2: Shibuya Incident',
        episodes: [
          {
            id: 'jjk-e1',
            episodeNumber: 1,
            title: 'Gerbang Shibuya Ditutup',
            duration: '24m',
            thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400&auto=format&fit=crop',
            synopsis: 'Gojo memasuki stasiun bawah tanah Shibuya seorang diri untuk menghadapi roh kutukan tingkat khusus.',
            videoUrl: 'https://vidlink.pro/tv/95479/2/1',
            servers: createTvServers(95479, 2, 1, VIDEO_STREAMS.TEARS_OF_STEEL)
          }
        ]
      }
    ],
    cast: [
      { name: 'Yuichi Nakamura', role: 'Satoru Gojo (Voice)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { name: 'Junya Enoki', role: 'Yuji Itadori (Voice)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 15. JOHN WICK: CHAPTER 4
  {
    id: 'john-wick-4',
    tmdbId: 603692,
    imdbId: 'tt10366206',
    imdbUrl: 'https://www.imdb.com/title/tt10366206/',
    imdbRating: 7.7,
    imdbVotes: '350,000+',
    title: 'John Wick: Chapter 4',
    originalTitle: 'John Wick: Chapter 4',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BY2Q2ZmI5ZjUtNWVhMC00YzJkLTlmYjMtY2RmZDhkNzEzYjZhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
    synopsis: 'John Wick menemukan jalan untuk mengalahkan The High Table. Namun sebelum memperoleh kebebasannya, Wick harus berhadapan dengan Marquis de Gramont dan teman lamanya, Caine.',
    synopsisEn: 'John Wick uncovers a path to defeating The High Table, but before earning his freedom, he must face off against a new enemy with powerful alliances across the globe.',
    rating: 7.7,
    rottenTomatoes: 94,
    year: 2023,
    releaseDate: '24 Maret 2023',
    duration: '2j 49m',
    quality: '1080p FHD',
    ageRating: '21+',
    genres: ['Action', 'Crime', 'Thriller'],
    country: 'Amerika Serikat',
    director: 'Chad Stahelski',
    featured: false,
    trending: true,
    topRated: false,
    audioTracks: ['English [Dolby Atmos]'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(603692, VIDEO_STREAMS.BLAZES),
    cast: [
      { name: 'Keanu Reeves', role: 'John Wick', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Donnie Yen', role: 'Caine', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Bill Skarsgård', role: 'Marquis', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }
    ]
  },

  // 16. INTERSTELLAR (Arsip Klasik HD)
  {
    id: 'interstellar',
    tmdbId: 157336,
    imdbId: 'tt0816692',
    imdbUrl: 'https://www.imdb.com/title/tt0816692/',
    imdbRating: 8.7,
    imdbVotes: '2,100,000+',
    title: 'Interstellar',
    originalTitle: 'Interstellar',
    type: 'movie',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg',
    synopsis: 'Ketika bumi dilanda badai debu mematikan dan kepunahan massal, sekelompok penjelajah melintasi lubang cacing di dekat Saturnus dalam upaya mencari planet baru yang layak huni bagi kelangsungan ras manusia.',
    synopsisEn: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft through a wormhole to find a new home for humanity.',
    rating: 8.7,
    rottenTomatoes: 73,
    year: 2014,
    releaseDate: '7 November 2014',
    duration: '2j 49m',
    quality: '1080p FHD',
    ageRating: '13+',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    country: 'Amerika Serikat',
    director: 'Christopher Nolan',
    featured: false,
    trending: false,
    topRated: true,
    audioTracks: ['English [Hans Zimmer Uncompressed]'],
    subtitles: ['Indonesia', 'English'],
    servers: createMovieServers(157336, VIDEO_STREAMS.ESCAPES),
    cast: [
      { name: 'Matthew McConaughey', role: 'Cooper', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      { name: 'Anne Hathaway', role: 'Brand', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
      { name: 'Jessica Chastain', role: 'Murph', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' }
    ]
  }
];

export const MOCK_CATALOG: MediaItem[] = RAW_MOCK_CATALOG.map((item) => ({
  ...item,
  synopsisId: item.synopsisId || item.synopsis,
  synopsisEn: item.synopsisEn || item.imdbPlot || undefined,
}));

export const GENRE_LIST = [
  'Semua Genre',
  'Action',
  'Sci-Fi',
  'Horror',
  'Drama',
  'Adventure',
  'Anime',
  'Romance',
  'Mystery',
  'Comedy',
  'Thriller',
  'Biography',
  'History'
];

export const COUNTRY_LIST = [
  'Semua Negara',
  'Indonesia',
  'Amerika Serikat',
  'Korea Selatan',
  'Jepang',
  'Inggris'
];

export const YEAR_LIST = [
  'Semua Tahun',
  '2024',
  '2023',
  '2022',
  '2021',
  '2014'
];
