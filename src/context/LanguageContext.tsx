import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'id' | 'en';

export const translations = {
  id: {
    // Navbar
    navHome: 'Beranda',
    navAdvancedSearch: 'Pencarian Lanjutan',
    navWatchlist: 'Daftar Saya',
    navHistory: 'Riwayat Tonton',
    navWatched: 'Sudah Ditonton',
    searchQuick: 'Pencarian film...',
    soundOn: 'Suara Haptik Aktif',
    soundOff: 'Suara Dibisukan',
    switchLang: 'Ganti Bahasa',
    langLabel: 'ID',
    langTooltip: 'Ganti ke Bahasa Inggris',

    // History & Continue Watching
    historyTitle: 'Riwayat Tontonan',
    historySubtitle: 'Daftar film dan serial yang sedang atau telah Anda tonton. Lanjutkan tontonan kapan saja.',
    continueWatching: 'Lanjutkan Menonton',
    continueWatchingShelf: 'Lanjutkan Menonton',
    continueWatchingDesc: 'Lanjutkan tontonan Anda dari menit terakhir',
    watchAgain: 'Tonton Ulang',
    completed: 'Selesai Ditonton',
    inProgress: 'Sedang Ditonton',
    markAsCompleted: 'Tandai Selesai',
    markAsUncompleted: 'Batal Selesai',
    allHistory: 'Semua Riwayat',
    resumeAt: 'Lanjutkan dari',
    timeLeft: 'tersisa',
    removeFromHistory: 'Hapus dari Riwayat',
    clearAllHistory: 'Bersihkan Riwayat',
    clearHistoryConfirm: 'Apakah Anda yakin ingin menghapus seluruh riwayat tontonan Anda?',
    emptyHistoryTitle: 'Belum Ada Riwayat Tontonan',
    emptyHistoryDesc: 'Film dan serial yang Anda putar akan otomatis tersimpan di sini sehingga Anda dapat melanjutkannya kapan saja.',
    exploreMovies: 'Jelajahi Sinema',
    historyCount: 'Tontonan Tercatat',
    lastWatched: 'Terakhir ditonton',
    episodeProgress: 'Episode',

    // Watched Tab
    watchedTitle: 'Sudah Ditonton',
    watchedSubtitle: 'Film dan serial yang telah Anda tandai selesai.',
    watchedCount: 'Judul Selesai',
    emptyWatchedTitle: 'Belum Ada Film yang Diselesaikan',
    emptyWatchedDesc: 'Tandai film atau serial sebagai selesai dari halaman Riwayat Tonton atau saat menonton.',
    markAsUnwatched: 'Tandai Belum Selesai',
    watchedOn: 'Ditonton pada',

    // Watch Party
    partyTitle: 'Watch Party',
    partyOnline: 'Online',
    partyCreateTab: 'Buat Room',
    partyJoinTab: 'Gabung',
    partyDisplayName: 'Nama Tampilan',
    partyDisplayNamePlaceholder: 'Nama kamu...',
    partyRoomCode: 'Kode Room',
    partyRoomCodePlaceholder: 'Contoh: A2BX7Y',
    partyConnecting: 'Menghubungkan...',
    partyCreateHint: 'Bagikan link atau QR code kepada teman setelah room dibuat.',
    partyJoinHint: 'Minta host untuk membagikan kode atau link invite.',
    partyCopyCode: 'Salin Kode',
    partyCopyLink: 'Salin link invite',
    partyScanJoin: 'Scan untuk bergabung',
    partyParticipants: 'Peserta',
    partyYou: 'Kamu',
    partySignalLabel: 'Peringatan:',
    partyPlaySignal: 'Kirim peringatan Play ke semua anggota room',
    partyPauseSignal: 'Kirim peringatan Pause ke semua anggota room',
    partyAlertTitle: 'PERINGATAN NONTON BARENG',
    partyPlayAlertTitle: 'PEMBERITAHUAN NONTON BARENG',
    partyPauseAlertDesc: 'ingin MENJEDA film/series yang sedang ditonton bersama!',
    partyPlayAlertDesc: 'ingin MEMUTAR film/series yang sedang ditonton bersama!',
    partyPauseAlertHint: 'Silakan jeda pemutar video Anda agar tayangan tetap sinkron bersama.',
    partyPlayAlertHint: 'Silakan putar kembali video Anda untuk melanjutkan nonton bersama.',
    partyPauseSent: 'Peringatan jeda terkirim ke anggota room 📢',
    partyPlaySent: 'Peringatan putar terkirim ke anggota room 📢',
    partyPauseMyVideo: 'Jeda Video Saya',
    partyPlayMyVideo: 'Putar Video Saya',
    partyAlertDismiss: 'Mengerti',
    partyEmptyChat: 'Belum ada obrolan. Mulai ngobrol! 💬',
    partyChatPlaceholder: 'Ketik pesan...',
    partyChatSend: 'Kirim',
    partyCloseRoom: 'Tutup Room',
    partyLeaveRoom: 'Keluar dari Room',
    partyDisconnected: 'Terputus',
    partyDisconnectedDesc: 'Koneksi ke room telah berakhir.',
    partyBack: 'Kembali',
    partyMinimize: 'Kecilkan Popup',
    partyClose: 'Tutup Watch Party',
    partyMoveCorner: 'Pindah Sudut',
    partyOpenChat: 'Buka Chat Watch Party',
    partyDragHint: 'Tahan & geser untuk memindahkan ke sudut layar',
    partySnapRelease: 'Lepas untuk Snap ke',
    partyHostLeft: 'Host telah meninggalkan room.',
    miniPlayer: 'Mini Player',
    miniPlayerTooltip: 'Buka Pemutar Mini Mengambang',
    restorePlayer: 'Perbesar ke Layar Penuh',
    closeMiniPlayer: 'Tutup Pemutar',
    miniPlayerDragResize: 'Tarik sudut untuk mengubah ukuran (rasio 16:9)',

    // Audio Booster
    audioBooster: 'Penguat Suara',
    audioBoosterTitle: 'Audio Booster & Penjernih Suara',
    audioBoosterDesc: 'Perbesar volume hingga 300% dan perjelas vokal dialog film.',
    audioMaxFull: 'Maksimalkan Volume (100% Full + Unmute)',
    audioMaxSuccess: 'Volume dimaksimalkan ke level tertinggi! 🔊',
    dialogueClarity: 'Tingkatkan Dialog & Vokal (Night Mode)',
    dialogueClarityDesc: 'Membuat suara percakapan terdengar jelas dan tajam di speaker HP.',
    audioBoostLevel: 'Tingkat Penguatan Audio:',
    recommendedAudioServers: 'Rekomendasi Server dengan Audio Kencang:',
    audioTipIframe: 'Sebagian besar film memiliki format audio 5.1 bioskop di mana vokal aktor berada di channel tengah yang sering terdengar pelan di speaker HP/laptop. Pastikan volume slider di pojok kanan bawah pemutar video ditarik ke 100%, atau ganti ke Server 6 / Server 4 yang memiliki audio stereo kencang.',

    // Hero Banner
    trendingSpotlight: 'Sedang Populer & Trending',
    watchMovie: 'Tonton Film',
    watchSeries: 'Tonton Series',
    detailsReviews: 'Detail & Ulasan',
    popularNow: 'Populer Sekarang',
    votes: 'Voting',
    cinematicCollection: 'Koleksi Sinematik',

    // Home Live Search
    exploreWorld: 'Jelajahi Sinema Dunia',
    exploreSubtitle: 'Akses ribuan film, drama, animasi, dan serial televisi premium dengan pemutar sinematik Full HD tanpa batas.',
    searchPlaceholder: 'Cari judul film, anime, atau serial TV...',
    searchingTmdb: 'Mencari di basis data TMDB...',
    filterAll: 'Semua',
    filterMovies: 'Film',
    filterSeries: 'Serial TV',
    trendingToday: 'Tren Hari Ini',
    searchResults: 'Hasil Pencarian',
    titlesFound: 'judul ditemukan',
    noResultsTitle: 'Tidak Ada Hasil Ditemukan',
    noResultsDesc: 'Coba periksa kembali ejaan kata kunci atau pilih salah satu rekomendasi judul populer di atas.',
    backToTrending: 'Kembali ke Tren Hari Ini',
    playNow: 'Putar Sekarang',
    viewDetails: 'Detail Karya',
    loading: 'Memuat...',

    // Movie Card
    playTooltip: 'Putar Film',
    addWatchlistTooltip: 'Tambah ke Daftar Tonton',
    removeWatchlistTooltip: 'Hapus dari Daftar',
    detailsTooltip: 'Detail Sinopsis',
    openInNewTab: 'Buka di Tab Baru',
    openInNewTabTooltip: 'Buka film atau series ini di tab baru browser',
    badgeFilm: 'Film',
    badgeSeries: 'Series',
    badgeAnime: 'Anime',
    badgeDrama: 'Drakor',

    // Watch Section
    back: 'Kembali',
    backToHome: 'Kembali ke Beranda',
    tabEpisodes: 'Episode',
    tabInfo: 'Informasi & Sinopsis',
    tabReviews: 'Ulasan Penonton',
    tabReviewsOfficial: 'Ulasan Resmi & Kritik',
    officialPortalsHub: 'Portal Ulasan & Agregator Resmi',
    officialPortalsDesc: 'Konsensus agregasi skor dan ulasan resmi dari Metacritic, Rotten Tomatoes, Montase Film, IMDb, dan Letterboxd',
    allPortals: 'Semua Portal',
    userReviewsTab: 'Catatan Penonton',
    verifiedCriticReview: 'Ulasan Kritik Terverifikasi',
    openOnPortal: 'Buka di Portal',
    visitPortal: 'Kunjungi Portal',
    activeServer: 'Server Pemutaran Aktif',
    selectServer: 'Pilih Jalur Aliran',
    share: 'Bagikan',
    copied: 'Tautan Tersalin!',
    inWatchlist: 'Tersimpan',
    addToWatchlist: 'Tambah ke Daftar',
    fullSynopsis: 'Sinopsis Lengkap',
    showIndo: 'Bahasa Indonesia',
    showEn: 'Bahasa Inggris (IMDb)',
    prodInfo: 'Informasi Produksi',
    director: 'Sutradara',
    writer: 'Penulis Naskah',
    country: 'Negara',
    awards: 'Penghargaan',
    boxOffice: 'Pendapatan Box Office',
    mainCast: 'Pemeran Utama',
    relatedCurated: 'Karya Terkait Pilihan',
    recommendationsFor: 'Rekomendasi tayangan pilihan yang relevan berdasarkan',
    updatingRecs: 'Memperbarui rekomendasi...',
    writeReview: 'Beri Ulasan Anda',
    reviewPlaceholder: 'Tuliskan kesan atau catatan sinematik Anda...',
    submitReview: 'Kirim Ulasan',
    appreciations: 'Apresiasi',
    encryptedStream: 'Jalur Enkripsi Aktif',

    // Server & Player
    serverStreamingRoutes: 'Jalur Pemutaran Film',
    activeAndStable: 'Aktif & Stabil',
    switchRouteNotice: 'Alihkan jalur streaming bila mengalami penurunan resolusi atau kendala jaringan.',
    encryptedStreamProtected: 'Enkripsi Jalur Terproteksi',
    guide: 'Panduan',
    guideServerNotice: 'Tersedia 6 server streaming independen. Jika server mengalami kendala atau 404, silakan beralih ke Server 2, Server 3 (2Embed Asia), atau Server 4 (MultiStream).',
    changeRoute: 'Ganti Jalur',
    ultraSmooth: 'Ultra Lancar',
    playbackSpeed: 'Kecepatan Putar',
    standardSpeed: 'Standar (1x)',
    forward10s: 'Maju 10 detik',
    rewind10s: 'Mundur 10 detik',
    protectedServerNotice: 'Server Terproteksi & Bebas Hambatan',
    singleTransmissionNotice: 'Jalur transmisi multi-engine terverifikasi dengan Takarir multi-bahasa & latensi instan',
    switchServerIfError: '404 / Video Eror? Ganti Server ⚡',
    findingBestServer: 'Memilih Server Lancar...',
    autoSwitchedServer: 'Otomatis Beralih ke',
    serverVerifiedSmooth: 'Lancar & Terverifikasi',
    nextServer: 'Server Berikutnya',
    switchedToServer: 'Beralih ke',
    serverTroubleshootingTip: 'Tips: Jika video mengalami kendala atau 404, klik tombol otomatis di atas untuk memindai server lancar.',
    allEnginesActive: '6 Mesin Streaming Aktif',
    autoFailoverNotice: 'Multi-Engine Failover: 6 server mandiri siap sedia untuk memastikan semua film dan serial dapat dimainkan.',

    // Details & Watch Section & YouTube Trailer
    tabTrailerOfficial: 'Trailer Resmi (YouTube)',
    watchTrailer: 'Tonton Trailer',
    officialTrailerTitle: 'Trailer & Cuplikan Resmi YouTube',
    officialTrailerDesc: 'Cuplikan resolusi tinggi resmi dari kanal studio penyiaran YouTube.',
    watchOnYoutube: 'Tonton di YouTube Resmi',
    noTrailerAvailable: 'Trailer resmi belum tersedia di YouTube untuk karya ini.',
    originalReleaseTitle: 'Judul Rilis Internasional',
    ageRatingRated: 'Bimbingan',
    imdbOfficialData: 'Data Resmi Internet Movie Database (IMDb)',
    syncing: 'menyinkronkan...',
    openOfficialImdb: 'Buka Halaman IMDb Resmi',
    imdbStoryline: 'Alur Cerita IMDb',

    // Episode List
    episodeListTitle: 'Daftar Episode',
    season: 'Musim',
    episode: 'Episode',
    playEpisode: 'Putar Episode',

    // Watchlist Modal
    myWatchlistTitle: 'Daftar Tonton Saya',
    watchlistSubtitle: 'Koleksi judul yang Anda simpan untuk dinikmati nanti',
    emptyWatchlistTitle: 'Daftar Tonton Anda Kosong',
    emptyWatchlistDesc: 'Tambahkan film dan serial favorit Anda untuk memudahkan akses menonton di kemudian hari.',
    clearAll: 'Hapus Semua',

    // Search Modal
    quickSearchModalTitle: 'Pencarian Sinema Cepat',
    quickSearchPlaceholder: 'Ketik judul film, anime, serial TV...',
    pressEscToClose: 'Tutup Pencarian',
    popularRecommendations: 'Rekomendasi Populer',
    noResultsFor: 'Tidak ada hasil pencarian untuk',

    matchScore: 'Cocok',
    newRelease: 'Baru',
    audioFormat: 'Format Audio',
    subtitles: 'Takarir / Subtitle',
    rateScore: 'Beri Nilai',
    imdbAudienceVotes: 'Voting Penonton IMDb',
    nowPlaying: 'Sedang Diputar',
    availableEpisodes: 'Tersedia dalam musim ini',
    catalogMovies: 'Katalog Film Layar Lebar',
    catalogSeries: 'Serial Televisi Eksklusif',
    catalogAnime: 'Animasi & Sinema Jepang',
    catalogDrama: 'Drama Pilihan Asia',
    catalogDesc: 'Koleksi sinema beresolusi tinggi dengan takarir bahasa Indonesia dan stabilitas streaming tanpa gangguan.',
    titlesRegistered: 'Karya Terdaftar',
    allCollections: 'Semua Koleksi',
    cinemaFilms: 'Film Bioskop',
    tvSeries: 'Serial TV',
    animeCollection: 'Koleksi Anime',
    asianDrama: 'Drama Asia',
    resetFilter: 'Reset Filter',
    genreLabel: 'Genre',
    countryLabel: 'Negara',
    releaseYear: 'Tahun Rilis',
    sortByLabel: 'Urutkan',
    sortCurated: 'Paling Terkurasi',
    sortRating: 'Rating Tertinggi (IMDb)',
    sortLatest: 'Tahun Produksi Terbaru',
    tmdbGlobal: 'TMDB Global (Jutaan Judul)',
    catalogCurated: 'Katalog Pilihan',
    liveTmdbConnected: 'Live TMDB Terhubung',
    globalSearchTitle: 'Pencarian Sinema Global TMDB',
    globalSearchDesc: 'Ketik judul apa saja untuk memindai jutaan film bioskop, serial TV, drama, dan anime dari seluruh dunia.',
    quickSearchSuggestions: 'Rekomendasi Pencarian Cepat',
    scanningTmdb: 'Memindai jutaan arsip film & series di server The Movie Database...',
    noTmdbFound: 'Tidak ditemukan karya di TMDB untuk',
    noTmdbHint: 'Pastikan ejaan judul sudah benar atau coba gunakan kata kunci judul asli (bahasa Inggris).',
    noLocalFound: 'Tidak ditemukan di katalog pilihan untuk',
    noLocalHint: 'Coba ganti ke tab TMDB Global untuk mencari jutaan film dunia.',
    originalTitleLabel: 'Judul asli',
    directorBy: 'Sutradara',

    // Multi-Database Search
    hybridAll: 'Semua (Hybrid)',
    animeDatabase: 'Anime (Kitsu/MAL)',
    tvmazeDatabase: 'Serial TV (TVMaze)',
    omdbDatabase: 'IMDb / Klasik',
    scanningDatabases: 'Memindai jutaan arsip film, anime & series di multi-database...',
    noDatabasesFound: 'Tidak ditemukan karya untuk',
    multiDatabaseConnected: 'Multi-Database Aktif (TMDB, Kitsu, TVMaze, IMDb)',
    searchPlaceholderMulti: 'Cari judul film, serial, anime, atau pemeran...',

    // Player Controls
    fullscreen: 'Layar Penuh',
    exitFullscreen: 'Keluar Layar Penuh',
    theaterMode: 'Mode Bioskop',
    exitTheaterMode: 'Keluar Mode Bioskop',
    subtitlesLabel: 'Takarir',

    // Footer
    footerDesc: 'Platform penayangan sinema digital dengan kurasi terdepan, menyajikan karya film layar lebar, seri televisi pemenang penghargaan, drama Asia, dan animasi terpilih dalam resolusi tinggi.',
    eduNotice: 'Catatan Edukasi',
    eduDesc: 'CINESTREAM merupakan antarmuka streaming sinematik modern berstandar premium, berfokus pada estetika visual elegan, tipografi editorial, dan pengalaman menonton bebas distraksi.',
    backToTop: 'Kembali ke Atas',
    copyrightDedication: 'Dedikasi kurasi visual sinema kelas dunia • Hak cipta dilindungi.',
    edition: 'Edition Prestigious.',
  },
  en: {
    // Navbar
    navHome: 'Home',
    navAdvancedSearch: 'Advanced Search',
    navWatchlist: 'My Watchlist',
    navHistory: 'Watch History',
    navWatched: 'Watched',
    searchQuick: 'Search titles...',
    soundOn: 'Haptic Sound On',
    soundOff: 'Sound Muted',
    switchLang: 'Change Language',
    langLabel: 'EN',
    langTooltip: 'Switch to Indonesian',

    // History & Continue Watching
    historyTitle: 'Watch History',
    historySubtitle: 'Movies and series you are watching or have completed. Resume playback anytime.',
    continueWatching: 'Continue Watching',
    continueWatchingShelf: 'Continue Watching',
    continueWatchingDesc: 'Pick up right where you left off',
    watchAgain: 'Watch Again',
    completed: 'Completed',
    inProgress: 'In Progress',
    markAsCompleted: 'Mark as Watched',
    markAsUncompleted: 'Mark as In Progress',
    allHistory: 'All History',
    resumeAt: 'Resume at',
    timeLeft: 'left',
    removeFromHistory: 'Remove from History',
    clearAllHistory: 'Clear Watch History',
    clearHistoryConfirm: 'Are you sure you want to clear your entire watch history?',
    emptyHistoryTitle: 'No Watch History Yet',
    emptyHistoryDesc: 'Movies and series you stream will automatically appear here so you can easily resume playback.',
    exploreMovies: 'Explore Cinema',
    historyCount: 'Recorded Titles',
    lastWatched: 'Last watched',
    episodeProgress: 'Episode',

    // Watched Tab
    watchedTitle: 'Watched',
    watchedSubtitle: 'Movies and series you have marked as completed.',
    watchedCount: 'Completed Titles',
    emptyWatchedTitle: 'Nothing Marked as Watched Yet',
    emptyWatchedDesc: 'Mark movies or series as watched from your Watch History or while playing.',
    markAsUnwatched: 'Mark as In Progress',
    watchedOn: 'Watched on',

    // Watch Party
    partyTitle: 'Watch Party',
    partyOnline: 'Online',
    partyCreateTab: 'Create Room',
    partyJoinTab: 'Join',
    partyDisplayName: 'Display Name',
    partyDisplayNamePlaceholder: 'Your name...',
    partyRoomCode: 'Room Code',
    partyRoomCodePlaceholder: 'Example: A2BX7Y',
    partyConnecting: 'Connecting...',
    partyCreateHint: 'Share the link or QR code with friends after creating the room.',
    partyJoinHint: 'Ask the host to share the code or invite link.',
    partyCopyCode: 'Copy Code',
    partyCopyLink: 'Copy invite link',
    partyScanJoin: 'Scan to join',
    partyParticipants: 'Participants',
    partyYou: 'You',
    partySignalLabel: 'Alert:',
    partyPlaySignal: 'Send Play alert to all room members',
    partyPauseSignal: 'Send Pause alert to all room members',
    partyAlertTitle: 'WATCH PARTY ALERT',
    partyPlayAlertTitle: 'WATCH PARTY NOTIFICATION',
    partyPauseAlertDesc: 'wants to PAUSE the movie/series being watched together!',
    partyPlayAlertDesc: 'wants to PLAY the movie/series being watched together!',
    partyPauseAlertHint: 'Please pause your video player so everyone stays in sync.',
    partyPlayAlertHint: 'Please resume your video player to continue watching together.',
    partyPauseSent: 'Pause alert sent to room members 📢',
    partyPlaySent: 'Play alert sent to room members 📢',
    partyPauseMyVideo: 'Pause My Video',
    partyPlayMyVideo: 'Play My Video',
    partyAlertDismiss: 'Dismiss',
    partyEmptyChat: 'No messages yet. Start chatting! 💬',
    partyChatPlaceholder: 'Type a message...',
    partyChatSend: 'Send',
    partyCloseRoom: 'Close Room',
    partyLeaveRoom: 'Leave Room',
    partyDisconnected: 'Disconnected',
    partyDisconnectedDesc: 'The connection to the room has ended.',
    partyBack: 'Back',
    partyMinimize: 'Minimize Popup',
    partyClose: 'Close Watch Party',
    partyMoveCorner: 'Move Corner',
    partyOpenChat: 'Open Watch Party Chat',
    partyDragHint: 'Hold & drag to move to a screen corner',
    partySnapRelease: 'Release to snap to',
    partyHostLeft: 'The host has left the room.',
    miniPlayer: 'Mini Player',
    miniPlayerTooltip: 'Floating Mini Player',
    restorePlayer: 'Expand to Full Player',
    closeMiniPlayer: 'Close Player',
    miniPlayerDragResize: 'Drag corner to resize (16:9 ratio)',

    // Audio Booster
    audioBooster: 'Audio Booster',
    audioBoosterTitle: 'Audio Booster & Voice Clarity',
    audioBoosterDesc: 'Boost volume up to 300% and enhance dialogue clarity.',
    audioMaxFull: 'Maximize Volume (100% Full + Unmute)',
    audioMaxSuccess: 'Volume maximized to peak level! 🔊',
    dialogueClarity: 'Enhance Dialogue & Vocals (Night Mode)',
    dialogueClarityDesc: 'Makes character speech crisp and intelligible on mobile speakers.',
    audioBoostLevel: 'Audio Boost Multiplier:',
    recommendedAudioServers: 'Recommended Loud Audio Servers:',
    audioTipIframe: 'Most cinema movies use 5.1 surround mixes where dialogue is in the center channel, which can sound quiet on stereo speakers. Set the player volume slider in the bottom-right corner to 100%, or switch to Server 6 / Server 4 for louder stereo mastering.',

    // Hero Banner
    trendingSpotlight: 'Trending & Popular Now',
    watchMovie: 'Watch Movie',
    watchSeries: 'Watch Series',
    detailsReviews: 'Details & Reviews',
    popularNow: 'Popular Now',
    votes: 'Votes',
    cinematicCollection: 'Cinematic Collection',

    // Home Live Search
    exploreWorld: 'Explore World Cinema',
    exploreSubtitle: 'Access thousands of premium movies, dramas, anime, and television series with unlimited Full HD cinematic playback.',
    searchPlaceholder: 'Search movies, anime, or TV series...',
    searchingTmdb: 'Searching TMDB database...',
    filterAll: 'All',
    filterMovies: 'Movies',
    filterSeries: 'TV Series',
    trendingToday: 'Trending Today',
    searchResults: 'Search Results',
    titlesFound: 'titles found',
    noResultsTitle: 'No Results Found',
    noResultsDesc: 'Please check your spelling or choose from the popular trending titles above.',
    backToTrending: 'Back to Trending Today',
    playNow: 'Play Now',
    viewDetails: 'View Details',
    loading: 'Loading...',

    // Movie Card
    playTooltip: 'Play Movie',
    addWatchlistTooltip: 'Add to Watchlist',
    removeWatchlistTooltip: 'Remove from Watchlist',
    detailsTooltip: 'Synopsis Details',
    openInNewTab: 'Open in New Tab',
    openInNewTabTooltip: 'Open this movie or series in a new browser tab',
    badgeFilm: 'Movie',
    badgeSeries: 'Series',
    badgeAnime: 'Anime',
    badgeDrama: 'K-Drama',

    // Watch Section
    back: 'Back',
    backToHome: 'Back to Home',
    tabEpisodes: 'Episodes',
    tabInfo: 'Info & Synopsis',
    tabReviews: 'Viewer Reviews',
    tabReviewsOfficial: 'Official Reviews & Critics',
    officialPortalsHub: 'Official Review Portals & Aggregators',
    officialPortalsDesc: 'Consensus score aggregation and official reviews from Metacritic, Rotten Tomatoes, Montase Film, IMDb, and Letterboxd',
    allPortals: 'All Portals',
    userReviewsTab: 'Audience Notes',
    verifiedCriticReview: 'Verified Critic Review',
    openOnPortal: 'Open on Portal',
    visitPortal: 'Visit Portal',
    activeServer: 'Active Streaming Server',
    selectServer: 'Select Streaming Server',
    share: 'Share',
    copied: 'Link Copied!',
    inWatchlist: 'In Watchlist',
    addToWatchlist: 'Add to Watchlist',
    fullSynopsis: 'Full Synopsis',
    showIndo: 'Indonesian',
    showEn: 'English (IMDb)',
    prodInfo: 'Production Details',
    director: 'Director',
    writer: 'Screenplay / Writer',
    country: 'Country',
    awards: 'Awards',
    boxOffice: 'Box Office',
    mainCast: 'Main Cast',
    relatedCurated: 'Curated Recommendations',
    recommendationsFor: 'Curated recommendations based on',
    updatingRecs: 'Updating recommendations...',
    writeReview: 'Write a Review',
    reviewPlaceholder: 'Write your cinematic impressions or review...',
    submitReview: 'Submit Review',
    appreciations: 'Likes',
    encryptedStream: 'Encrypted Stream Active',

    // Server & Player
    serverStreamingRoutes: 'Streaming Server Routes',
    activeAndStable: 'Active & Stable',
    switchRouteNotice: 'Switch streaming route if you encounter resolution drops or network issues.',
    encryptedStreamProtected: 'Encrypted Stream Protected',
    guide: 'Guide',
    guideServerNotice: '6 independent streaming servers available. If a server has issues or shows 404, switch to Server 2, Server 3 (2Embed Asia), or Server 4 (MultiStream).',
    changeRoute: 'Switch Route',
    ultraSmooth: 'Ultra Smooth',
    playbackSpeed: 'Playback Speed',
    standardSpeed: 'Normal (1x)',
    forward10s: 'Forward 10s',
    rewind10s: 'Rewind 10s',
    protectedServerNotice: 'Protected & Unrestricted Server',
    singleTransmissionNotice: 'Verified multi-engine transmission routes with multi-language subtitles & instant latency',
    switchServerIfError: '404 / Error? Switch Server ⚡',
    findingBestServer: 'Finding Best Server...',
    autoSwitchedServer: 'Auto-Switched to',
    serverVerifiedSmooth: 'Verified Smooth',
    nextServer: 'Next Server',
    switchedToServer: 'Switched to',
    serverTroubleshootingTip: 'Tips: If video encounters 404 or buffering, click the auto-resolve button above to select a smooth server.',
    allEnginesActive: '6 Streaming Engines Active',
    autoFailoverNotice: 'Multi-Engine Failover: 6 independent servers ready to ensure all movies and series can be played.',

    // Details & Watch Section & YouTube Trailer
    tabTrailerOfficial: 'Official Trailer (YouTube)',
    watchTrailer: 'Watch Trailer',
    officialTrailerTitle: 'Official YouTube Trailer & Teaser',
    officialTrailerDesc: 'Official high-resolution teaser and trailer from YouTube broadcasting studios.',
    watchOnYoutube: 'Watch on Official YouTube',
    noTrailerAvailable: 'Official trailer is not yet available on YouTube for this title.',
    originalReleaseTitle: 'International Release Title',
    ageRatingRated: 'Rated',
    imdbOfficialData: 'Official Internet Movie Database (IMDb) Data',
    syncing: 'syncing...',
    openOfficialImdb: 'Open Official IMDb Page',
    imdbStoryline: 'IMDb Storyline',

    // Episode List
    episodeListTitle: 'Episode List',
    season: 'Season',
    episode: 'Episode',
    playEpisode: 'Play Episode',

    // Watchlist Modal
    myWatchlistTitle: 'My Watchlist',
    watchlistSubtitle: 'Collection of titles you saved to enjoy later',
    emptyWatchlistTitle: 'Your Watchlist is Empty',
    emptyWatchlistDesc: 'Add your favorite movies and series for quick access anytime.',
    clearAll: 'Clear All',

    // Search Modal
    quickSearchModalTitle: 'Quick Cinema Search',
    quickSearchPlaceholder: 'Type movie, anime, or TV series title...',
    pressEscToClose: 'Close Search',
    popularRecommendations: 'Popular Recommendations',
    noResultsFor: 'No search results for',
    matchScore: 'Match',
    newRelease: 'New',
    audioFormat: 'Audio Format',
    subtitles: 'Subtitles',
    rateScore: 'Rate',
    imdbAudienceVotes: 'IMDb Audience Votes',
    nowPlaying: 'Now Playing',
    availableEpisodes: 'available this season',
    catalogMovies: 'Feature Films Catalog',
    catalogSeries: 'Exclusive Television Series',
    catalogAnime: 'Japanese Animation & Cinema',
    catalogDrama: 'Selected Asian Dramas',
    catalogDesc: 'High-definition cinema collection with premium streaming stability and seamless subtitle options.',
    titlesRegistered: 'Titles Registered',
    allCollections: 'All Collections',
    cinemaFilms: 'Feature Movies',
    tvSeries: 'TV Series',
    animeCollection: 'Anime Collection',
    asianDrama: 'Asian Drama',
    resetFilter: 'Reset Filter',
    genreLabel: 'Genre',
    countryLabel: 'Country',
    releaseYear: 'Release Year',
    sortByLabel: 'Sort By',
    sortCurated: 'Most Curated',
    sortRating: 'Highest Rated (IMDb)',
    sortLatest: 'Latest Release Year',
    tmdbGlobal: 'TMDB Global (Millions of Titles)',
    catalogCurated: 'Curated Catalog',
    liveTmdbConnected: 'Live TMDB Connected',
    globalSearchTitle: 'Global TMDB Cinema Search',
    globalSearchDesc: 'Type any title to scan millions of cinema movies, TV series, dramas, and anime worldwide.',
    quickSearchSuggestions: 'Quick Search Suggestions',
    scanningTmdb: 'Scanning millions of film & series archives on TMDB servers...',
    noTmdbFound: 'No titles found on TMDB for',
    noTmdbHint: 'Please verify your spelling or try using original English keywords.',
    noLocalFound: 'Not found in curated catalog for',
    noLocalHint: 'Try switching to TMDB Global tab to search millions of titles worldwide.',
    originalTitleLabel: 'Original title',
    directorBy: 'Director',

    // Multi-Database Search
    hybridAll: 'All (Hybrid)',
    animeDatabase: 'Anime (Kitsu/MAL)',
    tvmazeDatabase: 'TV Shows (TVMaze)',
    omdbDatabase: 'IMDb / Classic',
    scanningDatabases: 'Scanning millions of movies, anime & series across databases...',
    noDatabasesFound: 'No titles found for',
    multiDatabaseConnected: 'Multi-Database Live (TMDB, Kitsu, TVMaze, IMDb)',
    searchPlaceholderMulti: 'Search movies, series, anime, or cast...',

    // Player Controls
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    theaterMode: 'Theater Mode',
    exitTheaterMode: 'Exit Theater Mode',
    subtitlesLabel: 'Subtitles',

    // Footer
    footerDesc: 'World-class curated digital cinema platform, featuring blockbuster films, award-winning television series, Asian dramas, and select animation in high definition.',
    eduNotice: 'Educational Notice',
    eduDesc: 'CINESTREAM is a premium modern cinematic streaming interface focused on elegant visual aesthetics, editorial typography, and a distraction-free viewing experience.',
    backToTop: 'Back to Top',
    copyrightDedication: 'Dedicated to world-class cinema curation • All rights reserved.',
    edition: 'Edition Prestigious.',
  },
};

export type TranslationKey = keyof typeof translations['id'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Check localStorage first
    try {
      const saved = localStorage.getItem('cinestream_lang');
      if (saved === 'id' || saved === 'en') return saved;
    } catch {
      // ignore
    }

    // 2. Auto translate / detect browser language
    try {
      const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      if (browserLang.startsWith('en')) {
        return 'en';
      } else if (browserLang.startsWith('id')) {
        return 'id';
      }
    } catch {
      // ignore
    }

    return 'id'; // default
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('cinestream_lang', lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations['id']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
