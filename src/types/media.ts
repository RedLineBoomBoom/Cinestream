export interface Server {
  id: string;
  name: string;
  speed: string;
  quality: string;
  url: string;
  status: 'online' | 'busy';
  isEmbed?: boolean;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber?: number;
  title: string;
  duration: string;
  thumbnail: string;
  synopsis: string;
  videoUrl: string;
  servers: Server[];
  airDate?: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface CastMember {
  name: string;
  role: string;
  avatar: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
  likes: number;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  title: string;
  titleId?: string;
  titleEn?: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime' | 'drama';
  poster: string;
  posterId?: string;
  posterEn?: string;
  backdrop: string;
  backdropId?: string;
  backdropEn?: string;
  originCountry?: string[];
  originalLanguage?: string;
  synopsis: string;
  synopsisId?: string;
  synopsisEn?: string;
  rating: number;
  rottenTomatoes?: number;
  year: number;
  releaseDate: string;
  duration: string;
  episodeDuration?: string;
  quality: '4K ULTRA HD' | '1080p FHD' | '720p HD' | 'CAM';
  ageRating: 'SU' | '13+' | '17+' | '21+';
  genres: string[];
  country: string;
  director: string;
  writer?: string;
  awards?: string;
  boxOffice?: string;
  imdbId?: string;
  imdbRating?: number;
  imdbVotes?: string;
  imdbUrl?: string;
  imdbPlot?: string;
  cast: CastMember[];
  servers: Server[];
  seasons?: Season[];
  trailerUrl?: string;
  trailerYoutubeKey?: string;
  logoUrl?: string;
  featured?: boolean;
  trending?: boolean;
  topRated?: boolean;
  audioTracks: string[];
  subtitles: string[];
  reviews?: Review[];
  status?: string;
  isOngoing?: boolean;
  totalEpisodes?: number;
  releasedEpisodes?: number;
  currentSeasonTotalEpisodes?: number;
  currentSeasonReleasedEpisodes?: number;
  nextEpisodeToAir?: string;
  nextEpisodeInfo?: NextEpisodeAirInfo;
  totalSeasons?: number;
  currentSeason?: number;
  completedSeasons?: number[];
  ongoingSeason?: number;
  seasonBreakdown?: string;
  isSpotlight?: boolean;
  customBadge?: string;
  customBadgeColor?: string;
  customTagline?: string;
}

export interface NextEpisodeAirInfo {
  airDate: string;
  episodeNumber: number;
  seasonNumber: number;
  title?: string;
  overview?: string;
  stillPath?: string;
}

export interface PlayProgress {
  mediaId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
  lastWatched: number;
}

export interface WatchHistoryItem {
  historyId?: string;
  mediaId: string;
  media: MediaItem;
  episodeId?: string;
  episodeTitle?: string;
  episodeThumbnail?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  currentTime: number;
  duration: number;
  lastWatched: number;
  completed?: boolean;
}

