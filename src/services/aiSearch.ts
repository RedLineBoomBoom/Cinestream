/**
 * AI CineFinder Search Engine
 * Identifies movies, series, and anime from natural language plot, scene, or character descriptions.
 * Multi-Tier Engine: Google Gemini Flash (Tier 1) -> Intelligent Semantic Cinema Engine & Archetypes (Tier 2) -> Dynamic TMDB Discovery (Tier 3).
 */

import type { UnifiedSearchResult } from './hybridSearch';
import { searchHybrid } from './hybridSearch';
import { getTmdbApiKey } from './tmdb';
import { translateText } from './translator';

export interface AiRecommendationItem {
  title: string;
  year?: number;
  type?: 'movie' | 'series' | 'anime';
  matchReason: string;
  confidence: number;
}

interface ArchetypeRule {
  target: string;
  year?: number;
  type: 'movie' | 'series' | 'anime';
  keywords: string[];
  reasonId: string;
  reasonEn: string;
  related?: {
    title: string;
    year?: number;
    type: 'movie' | 'series' | 'anime';
    reasonId: string;
    reasonEn: string;
  }[];
}

const GEMINI_STORAGE_KEY = 'cinestream_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {}
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
      } else {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
      }
    }
  } catch {}
}

export interface GeminiStatus {
  status: 'idle' | 'success' | 'failed';
  message?: string;
  model?: string;
  timestamp?: number;
}

let lastGeminiStatus: GeminiStatus = { status: 'idle' };

export function getLastGeminiStatus(): GeminiStatus {
  return lastGeminiStatus;
}

/**
 * Validate and test connection to Google Gemini API with the given key
 */
export async function testGeminiApiKey(
  apiKey: string
): Promise<{ ok: boolean; message: string; model?: string }> {
  const trimmed = (apiKey || '').trim();
  if (!trimmed) {
    return { ok: false, message: 'Kunci API kosong / API key is empty' };
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmed}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Respond with "OK"' }],
            },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        lastGeminiStatus = {
          status: 'success',
          message: `Terhubung ke Google Gemini (${model})`,
          model,
          timestamp: Date.now(),
        };
        return {
          ok: true,
          message: `Berhasil terhubung ke Google Gemini (${model})`,
          model,
        };
      }

      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      lastGeminiStatus = {
        status: 'failed',
        message: errMsg,
        model,
        timestamp: Date.now(),
      };
      return { ok: false, message: errMsg };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, message: 'Koneksi timeout (server tidak merespons dalam 8 detik)' };
      }
      return { ok: false, message: err.message || 'Gagal menghubungi server Gemini' };
    }
  }
  return { ok: false, message: 'Tidak dapat terhubung ke model Gemini' };
}

/**
 * Direct query to Google Gemini Flash API
 */
async function queryGeminiApi(
  userQuery: string,
  apiKey: string,
  language: 'id' | 'en'
): Promise<AiRecommendationItem[]> {
  const promptInstruction = `You are CineStream AI CineFinder, an expert cinematic knowledge engine.
The user describes a movie, TV show, or anime using their own words (plot points, scenes, character traits, atmosphere, twists, or memorable moments).
Your task is to accurately identify the top 3-5 real titles that best match this description.
Respond ONLY with a valid JSON array of objects without markdown formatting or other text:
[
  {
    "title": "Exact English / Official Title",
    "year": 2014,
    "type": "movie",
    "confidence": 98,
    "matchReason": "1-2 sentences explaining specifically why this matches what the user described."
  }
]
Note for matchReason: ${
    language === 'id'
      ? 'Must be written in natural, fluent Bahasa Indonesia'
      : 'Must be written in fluent English'
  }.
type must be "movie", "series", or "anime". confidence must be integer between 60 and 99.`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${promptInstruction}\n\nUser Description: "${userQuery}"` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        lastGeminiStatus = {
          status: 'success',
          message: `Model ${model} aktif`,
          model,
          timestamp: Date.now(),
        };
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let parsed: any = null;

        // Try direct JSON array extraction
        const startIdx = rawText.indexOf('[');
        const endIdx = rawText.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          try {
            parsed = JSON.parse(rawText.slice(startIdx, endIdx + 1));
          } catch {}
        }

        if (!parsed) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
          try {
            parsed = JSON.parse(cleaned);
          } catch {}
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const items: AiRecommendationItem[] = parsed.map((item: any) => {
            const mediaType: 'movie' | 'series' | 'anime' =
              item.type === 'anime' ? 'anime' : item.type === 'series' ? 'series' : 'movie';
            return {
              title: String(item.title || '').trim(),
              year: typeof item.year === 'number' ? item.year : undefined,
              type: mediaType,
              matchReason: String(item.matchReason || '').trim(),
              confidence: Math.min(99, Math.max(60, Number(item.confidence) || 85)),
            };
          });
          const valid = items.filter((it) => it.title.length > 0);
          if (valid.length > 0) return valid;
        }
      } else {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        lastGeminiStatus = {
          status: 'failed',
          message: errMsg,
          model,
          timestamp: Date.now(),
        };
        console.warn(`[Gemini AI] Model ${model} returned HTTP ${res.status}:`, errMsg);
      }
    } catch (err: any) {
      lastGeminiStatus = {
        status: 'failed',
        message: err?.message || 'Gagal menghubungi server Gemini',
        model,
        timestamp: Date.now(),
      };
      console.warn(`[Gemini AI] Call failed for ${model}:`, err);
    }
  }
  return [];
}

/**
 * Curated Semantic Cinema Archetypes Index
 * Maps distinctive plot concepts, motifs, characters, and scenes to their definitive cinematic titles.
 */
const CINEMA_ARCHETYPES: ArchetypeRule[] = [
  // 1. Interstellar
  {
    target: 'Interstellar',
    year: 2014,
    type: 'movie',
    keywords: [
      'black hole', 'lubang hitam', 'wormhole', 'astronot', 'astronaut', 'saturn', 'tesseract',
      'time dilation', 'dilasi waktu', 'cooper', 'murph', 'selamatkan bumi', 'save earth',
      'anaknya di bumi', 'daughter on earth', 'his daughter', 'gelombang raksasa', 'miller planet'
    ],
    reasonId: 'Sangat cocok dengan alur cerita mantan pilot astronot yang menjelajahi black hole dan wormhole demi menyelamatkan bumi dan putrinya.',
    reasonEn: 'Matches the story of an astronaut piloting through a black hole to save humanity and his daughter on Earth.',
    related: [
      {
        title: 'The Martian',
        year: 2015,
        type: 'movie',
        reasonId: 'Kisah bertahan hidup seorang astronot yang tertinggal sendirian di permukaan planet Mars.',
        reasonEn: 'Story of an astronaut stranded alone on Mars fighting for survival.'
      },
      {
        title: 'Contact',
        year: 1997,
        type: 'movie',
        reasonId: 'Eksplorasi ilmuwan terhadap sinyal kosmik luar angkasa dan perjalanan menembus dimensi antarbintang.',
        reasonEn: 'Deep-space radio transmission and interstellar journey of scientific discovery.'
      }
    ]
  },
  // 2. Memento
  {
    target: 'Memento',
    year: 2000,
    type: 'movie',
    keywords: [
      'hilang ingatan', 'ingatan jangka pendek', 'short term memory', 'amnesia', 'amnesiac',
      'tato', 'tattoo', 'tattoos', 'body tattoos', 'polaroid', 'balas dendam', 'revenge',
      'kematian istri', 'wife murder', "wife's murder", 'membalas dendam', 'leonard shelby',
      'petunjuk pembunuhan', 'anterograde'
    ],
    reasonId: 'Cocok dengan kisah pria penderita amnesia jangka pendek yang mentato tubuhnya dan memakai foto Polaroid untuk membalas pembunuh istrinya.',
    reasonEn: 'Matches the psychological thriller of an anterograde amnesiac tracking his wife\'s killer using tattoos and polaroids.',
    related: [
      {
        title: 'Shutter Island',
        year: 2010,
        type: 'movie',
        reasonId: 'Investigasi misteri di rumah sakit jiwa pulau terpencil dengan twist psikologis yang mengejutkan.',
        reasonEn: 'Psychological thriller investigating an asylum escapee on an isolated island with shocking twists.'
      },
      {
        title: 'The Prestige',
        year: 2006,
        type: 'movie',
        reasonId: 'Persaingan sengit dua pesulap yang penuh teka-teki, tipuan pikiran, dan rahasia berbahaya.',
        reasonEn: 'Intense rivalry between two stage magicians full of deception, mind games, and sacrifice.'
      }
    ]
  },
  // 3. Death Note
  {
    target: 'Death Note',
    year: 2006,
    type: 'anime',
    keywords: [
      'buku kematian', 'buku catatan kematian', 'death note', 'shinigami', 'malaikat maut',
      'dewa kematian', 'death god', 'ryuk', 'light yagami', 'kira', 'tulis nama', 'write name',
      'anak sma jenius', 'siswa sma', 'high school student', 'notebook', 'detektif l'
    ],
    reasonId: 'Cocok dengan anime legendaris tentang anak SMA jenius yang menemukan buku kematian milik malaikat maut (Shinigami).',
    reasonEn: 'Matches the iconic anime about a brilliant high schooler who finds a supernatural death notebook belonging to a Shinigami.',
    related: [
      {
        title: 'Monster',
        year: 2004,
        type: 'anime',
        reasonId: 'Perburuan psikologis mendalam seorang dokter terhadap psikopat jenius manipulatif.',
        reasonEn: 'Gripping psychological pursuit of a brilliant brain surgeon hunting a manipulative psychopath.'
      },
      {
        title: 'Code Geass',
        year: 2006,
        type: 'anime',
        reasonId: 'Kisah pemuda jenius yang memimpin pemberontakan menggunakan kekuatan manipulasi pikiran mutlak.',
        reasonEn: 'Brilliant youth leading a revolution with the supernatural power of absolute obedience.'
      }
    ]
  },
  // 4. Knives Out
  {
    target: 'Knives Out',
    year: 2019,
    type: 'movie',
    keywords: [
      'benoit blanc', 'novelis', 'novelist', 'mansion', 'rumah mewah', 'detektif', 'detective',
      'pembunuhan', 'murder mystery', 'harlan thrombey', 'warisan', 'kakek kaya', 'keluarga kaya',
      'wealthy family', 'detective investigates', 'pembunuhan misterius', 'pisau', 'whodunit'
    ],
    reasonId: 'Cocok dengan investigasi detektif Benoit Blanc atas kematian misterius seorang novelis kaya di mansion keluarganya.',
    reasonEn: 'Matches Detective Benoit Blanc investigating the mysterious death of a wealthy patriarch in his mansion.',
    related: [
      {
        title: 'Glass Onion: A Knives Out Mystery',
        year: 2022,
        type: 'movie',
        reasonId: 'Kasus teka-teki pembunuhan kedua Benoit Blanc di pulau pribadi mewah miliarder teknologi.',
        reasonEn: 'Benoit Blanc\'s second murder mystery on a tech billionaire\'s private Greek island.'
      },
      {
        title: 'Murder on the Orient Express',
        year: 2017,
        type: 'movie',
        reasonId: 'Misteri pembunuhan klasik karya Agatha Christie di atas kereta api mewah bersalju.',
        reasonEn: 'Classic Agatha Christie murder mystery aboard a luxury train stranded in the snow.'
      }
    ]
  },
  // 5. Your Name.
  {
    target: 'Your Name.',
    year: 2016,
    type: 'anime',
    keywords: [
      'bertukar tubuh', 'tukar tubuh', 'body swap', 'swapping bodies', 'swap bodies', 'komet',
      'comet', 'meteor', 'taki', 'mitsuha', 'tokyo', 'itomori', 'benang merah', 'dua remaja',
      'terhubung lewat mimpi', 'connected across time', 'pria dan wanita yang bertukar tubuh', 'komet jatuh'
    ],
    reasonId: 'Cocok dengan mahakarya anime tentang pria dan wanita muda yang secara misterius bertukar tubuh dengan latar belakang jatuhnya komet.',
    reasonEn: 'Matches the acclaimed anime about a boy and girl who mysteriously swap bodies linked by a falling comet.',
    related: [
      {
        title: 'Weathering with You',
        year: 2019,
        type: 'anime',
        reasonId: 'Kisah romansa fantasi gadis yang mampu mengendalikan cuaca dan menurunkan hujan di Tokyo.',
        reasonEn: 'Romantic fantasy of a runaway boy and a girl who can control the weather in Tokyo.'
      },
      {
        title: 'Suzume',
        year: 2022,
        type: 'anime',
        reasonId: 'Petualangan fantasi gadis remaja yang bertugas menutup pintu-pintu bencana gempa bumi di Jepang.',
        reasonEn: 'Fantasy adventure about a girl traveling across Japan to close supernatural disaster doors.'
      }
    ]
  },
  // 6. Inception
  {
    target: 'Inception',
    year: 2010,
    type: 'movie',
    keywords: [
      'mimpi', 'dream', 'dreams', 'masuk mimpi', 'subconscious', 'bawah sadar', 'mencuri ide',
      'steal idea', 'menanamkan ide', 'gasing', 'totem', 'spinning top', 'cobb', 'leonardo dicaprio',
      'mimpi dalam mimpi'
    ],
    reasonId: 'Cocok dengan kisah pencuri ulung yang masuk ke alam bawah sadar dan mimpi orang lain untuk menanamkan ide rahasia.',
    reasonEn: 'Matches the story of a skilled thief who enters people\'s subconscious dreams to implant an idea.',
    related: [
      {
        title: 'Paprika',
        year: 2006,
        type: 'anime',
        reasonId: 'Anime legendaris Satoshi Kon tentang mesin yang memungkinkan terapis masuk ke dalam dunia mimpi pasien.',
        reasonEn: 'Visionary anime about a device allowing therapists to enter and navigate patient dreams.'
      }
    ]
  },
  // 7. Barbie
  {
    target: 'Barbie',
    year: 2023,
    type: 'movie',
    keywords: [
      'barbie', 'boneka', 'doll', 'ken', 'barbieland', 'dunia nyata', 'real world', 'mattel',
      'margot robbie', 'ryan gosling', 'berwarna pink', 'boneka barbie'
    ],
    reasonId: 'Cocok dengan film boneka Barbie dan Ken yang melakukan petualangan seru dari Barbieland ke dunia nyata manusia.',
    reasonEn: 'Matches the live-action movie of Barbie and Ken venturing into the human real world.'
  },
  // 8. Titanic
  {
    target: 'Titanic',
    year: 1997,
    type: 'movie',
    keywords: [
      'titanic', 'kapal pesiar', 'cruise ship', 'gunung es', 'iceberg', 'tenggelam', 'sinking',
      'jack', 'rose', 'samudra atlantik', 'leonardo dicaprio', 'kate winslet'
    ],
    reasonId: 'Cocok dengan kisah cinta abadi Jack dan Rose di atas kapal pesiar termewah yang menabrak gunung es dan tenggelam.',
    reasonEn: 'Matches the epic romance of Jack and Rose aboard the ill-fated ocean liner that struck an iceberg.'
  },
  // 9. Parasyte: The Maxim
  {
    target: 'Parasyte: The Maxim',
    year: 2014,
    type: 'anime',
    keywords: [
      'parasit', 'parasyte', 'alien', 'tangan kanan', 'right hand', 'shinichi', 'migi',
      'memakan manusia', 'parasit alien', 'kepala terbelah'
    ],
    reasonId: 'Cocok dengan anime aksi tentang parasit alien yang gagal mengambil alih otak dan bersarang di tangan kanan anak SMA bernama Shinichi.',
    reasonEn: 'Matches the anime about an alien parasite that infects and bonds with the right hand of high schooler Shinichi.'
  },
  // 10. The Matrix
  {
    target: 'The Matrix',
    year: 1999,
    type: 'movie',
    keywords: [
      'red pill', 'blue pill', 'pil merah', 'pil biru', 'simulasi', 'simulation', 'morpheus',
      'neo', 'trinity', 'mesin memperbudak manusia', 'bullet time', 'keanu reeves', 'dunia ilusi'
    ],
    reasonId: 'Cocok dengan kisah hacker yang menyadari kenyataan manusia hanyalah simulasi ilusi yang dikendalikan oleh mesin.',
    reasonEn: 'Matches the sci-fi classic where a hacker discovers reality is a simulated illusion created by machines.'
  },
  // 11. Fight Club
  {
    target: 'Fight Club',
    year: 1999,
    type: 'movie',
    keywords: [
      'fight club', 'insomniac', 'sabun', 'soap', 'tyler durden', 'alter ego', 'kepribadian ganda',
      'split personality', 'jangan bicarakan', 'brad pitt', 'edward norton'
    ],
    reasonId: 'Cocok dengan kisah pekerja insomnia yang mendirikan klub pertarungan bawah tanah bersama pembuat sabun eksentrik Tyler Durden.',
    reasonEn: 'Matches the story of an insomniac office worker founding an underground fight club with Tyler Durden.'
  },
  // 12. Shutter Island
  {
    target: 'Shutter Island',
    year: 2010,
    type: 'movie',
    keywords: [
      'shutter island', 'rumah sakit jiwa', 'asilum', 'asylum', 'pulau terpencil',
      'marshal teddy daniels', 'lobotomi', 'pasien kabur', 'twist ingatan', 'leonardo dicaprio'
    ],
    reasonId: 'Cocok dengan penyelidikan US Marshal di rumah sakit jiwa terisolasi di pulau karang dengan rahasia ingatan yang mengejutkan.',
    reasonEn: 'Matches the psychological mystery of a US Marshal investigating a psychiatric facility on a remote island.'
  },
  // 13. Everything Everywhere All at Once
  {
    target: 'Everything Everywhere All at Once',
    year: 2022,
    type: 'movie',
    keywords: [
      'multiverse', 'bagel', 'laundromat', 'jari sosis', 'hot dog fingers', 'pajak', 'tax audit',
      'evelyn', 'waymond', 'michelle yeoh', 'batu bermata'
    ],
    reasonId: 'Cocok dengan komedi sci-fi aksi pemilik laundromat yang terhubung dengan ribuan varian dirinya di seluruh multiverse.',
    reasonEn: 'Matches the multi-award-winning multiverse adventure of an immigrant laundromat owner connecting across realities.'
  },
  // 14. Squid Game
  {
    target: 'Squid Game',
    year: 2021,
    type: 'series',
    keywords: [
      'squid game', 'permainan bertahan hidup', 'game kematian', 'permainan mematikan', 'survival game',
      'baju hijau', 'baju olahraga', 'green tracksuit', 'lampu merah lampu hijau', 'red light green light',
      'jembatan kaca', '456', 'nomor 456', 'seong gi-hun'
    ],
    reasonId: 'Cocok dengan serial permainan mematikan di mana ratusan peserta berpakaian olahraga hijau berebut hadiah ratusan miliar rupiah.',
    reasonEn: 'Matches the Korean survival drama where desperate contestants in green tracksuits compete in fatal children\'s games.'
  },
  // 15. Alice in Borderland
  {
    target: 'Alice in Borderland',
    year: 2020,
    type: 'series',
    keywords: [
      'alice in borderland', 'tokyo kosong', 'bermain kartu', 'playing cards', 'laser dari langit',
      'arisu', 'chishiya', 'usagi', 'kartu remi', 'borderland'
    ],
    reasonId: 'Cocok dengan serial live-action para pemuda yang terjebak di kota Tokyo kosong dan harus menyelesaikan permainan kartu mematikan.',
    reasonEn: 'Matches the thriller about gamers trapped in an abandoned Tokyo forced to clear deadly card-based games to survive.'
  },
  // 16. Breaking Bad
  {
    target: 'Breaking Bad',
    year: 2008,
    type: 'series',
    keywords: [
      'guru kimia', 'chemistry teacher', 'kanker paru', 'lung cancer', 'masak sabu', 'blue meth',
      'heisenberg', 'walter white', 'jesse pinkman', 'narkoba sabu biru', 'kartel'
    ],
    reasonId: 'Cocok dengan mahakarya serial guru kimia penderita kanker yang memproduksi sabu-sabu kristal biru bersama mantan muridnya.',
    reasonEn: 'Matches the legendary drama about a cancer-stricken chemistry teacher who starts manufacturing blue crystal meth.'
  },
  // 17. The Last of Us
  {
    target: 'The Last of Us',
    year: 2023,
    type: 'series',
    keywords: [
      'jamur cordyceps', 'zombie jamur', 'clicker', 'gadis kebal', 'immune girl', 'joel',
      'ellie', 'infeksi jamur', 'post-apocalyptic'
    ],
    reasonId: 'Cocok dengan serial adaptasi game tentang pria penyelundup yang mengawal seorang gadis remaja yang kebal terhadap infeksi jamur mutan.',
    reasonEn: 'Matches the post-apocalyptic saga of a hardened smuggler escorting an immune teenage girl across fungal wasteland.'
  },
  // 18. A Quiet Place
  {
    target: 'A Quiet Place',
    year: 2018,
    type: 'movie',
    keywords: [
      'jangan bersuara', 'monsters hear sound', 'monster buta peka suara', 'bahasa isyarat',
      'quiet place', 'jangan membuat suara', 'john krasinski', 'emily blunt'
    ],
    reasonId: 'Cocok dengan film horor bertahan hidup keluarga di dunia yang dikuasai monster buta dengan pendengaran ultrasonik mematikan.',
    reasonEn: 'Matches the suspense horror about a family forced to navigate life in near-complete silence to evade blind monsters.'
  },
  // 19. Bird Box
  {
    target: 'Bird Box',
    year: 2018,
    type: 'movie',
    keywords: [
      'tutup mata', 'blindfold', 'jangan melihat', 'monster buat bunuh diri', 'sungai',
      'perahu', 'sandra bullock', 'burung dalam kotak'
    ],
    reasonId: 'Cocok dengan film thriller pasca-apokaliptik seorang ibu yang menyeberangi sungai dengan mata tertutup kain agar tidak melihat entitas pembuat bunuh diri.',
    reasonEn: 'Matches the post-apocalyptic thriller where survivors must wear blindfolds to avoid seeing creatures that induce suicide.'
  },
  // 20. Ready Player One
  {
    target: 'Ready Player One',
    year: 2018,
    type: 'movie',
    keywords: [
      'oasis', 'dunia vr', 'game virtual reality', 'mencari easter egg', 'wade watts',
      'kunci emas', 'parzival', 'steven spielberg'
    ],
    reasonId: 'Cocok dengan petualangan sci-fi seorang pemuda yang berburu easter egg dan kunci rahasia di dalam dunia virtual reality OASIS.',
    reasonEn: 'Matches the sci-fi adventure of a teen hunting for an Easter egg in the vast virtual reality universe OASIS.'
  },
  // 21. Edge of Tomorrow
  {
    target: 'Edge of Tomorrow',
    year: 2014,
    type: 'movie',
    keywords: [
      'time loop', 'mati hidup lagi', 'alien mimics', 'rita vrataski', 'tom cruise',
      'mengulang hari', 'live die repeat', 'invasi alien eropa'
    ],
    reasonId: 'Cocok dengan aksi sci-fi prajurit yang terjebak dalam perulangan waktu (time loop) bertarung melawan alien setiap kali tewas.',
    reasonEn: 'Matches the sci-fi time-loop action film where a soldier relives the same brutal battle against aliens repeatedly.'
  },
  // 22. Get Out
  {
    target: 'Get Out',
    year: 2017,
    type: 'movie',
    keywords: [
      'keluarga pacar kulit putih', 'hipnotis', 'sendok cangkir teh', 'mencuri tubuh',
      'sunken place', 'chris washington', 'jordan peele', 'cangkir teh berdentang'
    ],
    reasonId: 'Cocok dengan thriller psikologis tentang pria berkulit hitam yang mengunjungi keluarga pacarnya dan menemukan rahasia hipnotis mengerikan.',
    reasonEn: 'Matches Jordan Peele\'s acclaimed thriller about a young Black man visiting his girlfriend\'s unsettling family estate.'
  },
  // 23. Whiplash
  {
    target: 'Whiplash',
    year: 2014,
    type: 'movie',
    keywords: [
      'drummer ambisius', 'guru musik kejam', 'lempar simbal', 'tangan berdarah',
      'andrew neiman', 'terence fletcher', 'jazz tempo', 'caravan'
    ],
    reasonId: 'Cocok dengan drama intens seorang drummer muda ambisius yang ditekan habis-habisan oleh instruktur musik jazz perfeksionis tanpa ampun.',
    reasonEn: 'Matches the intense musical drama of an ambitious young jazz drummer pushed to the brink by an abusive conductor.'
  },
  // 24. Oppenheimer
  {
    target: 'Oppenheimer',
    year: 2023,
    type: 'movie',
    keywords: [
      'bapak bom atom', 'manhattan project', 'los alamos', 'bom nuklir', 'trinity test',
      'j robert oppenheimer', 'cillian murphy', 'christopher nolan'
    ],
    reasonId: 'Cocok dengan film biopik epik karya Christopher Nolan tentang fisikawan J. Robert Oppenheimer yang memimpin pembuatan bom atom pertama dunia.',
    reasonEn: 'Matches Christopher Nolan\'s historical epic about J. Robert Oppenheimer leading the development of the atomic bomb.'
  },
  // 25. Dune
  {
    target: 'Dune: Part One',
    year: 2021,
    type: 'movie',
    keywords: [
      'planet gurun', 'cacing raksasa', 'sand worm', 'rempah-rempah', 'spice melange',
      'arrakis', 'paul atreides', 'fremen', 'timothee chalamet'
    ],
    reasonId: 'Cocok dengan epik sci-fi megah tentang perebutan planet gurun Arrakis yang menjadi sumber rempah-rempah paling berharga di alam semesta.',
    reasonEn: 'Matches the visually breathtaking sci-fi saga of Paul Atreides arriving on the harsh desert planet Arrakis.'
  },
  // 26. Spirited Away
  {
    target: 'Spirited Away',
    year: 2001,
    type: 'anime',
    keywords: [
      'orang tua jadi babi', 'pemandian air panas roh', 'bathhouse', 'chihiro', 'haku',
      'no face', 'studio ghibli', 'alam gaib roh', 'yubaba'
    ],
    reasonId: 'Cocok dengan mahakarya animasi Studio Ghibli tentang gadis kecil yang bekerja di pemandian roh setelah orang tuanya berubah menjadi babi.',
    reasonEn: 'Matches the timeless Studio Ghibli classic about a girl who wanders into a supernatural bathhouse for spirits.'
  },
  // 27. Attack on Titan
  {
    target: 'Attack on Titan',
    year: 2013,
    type: 'anime',
    keywords: [
      'titan raksasa', 'manusia makan raksasa', 'dinding maria', 'eren yeager', 'mikasa',
      'survey corps', 'rumbling', 'maneuver gear', 'dinding raksasa'
    ],
    reasonId: 'Cocok dengan anime legendaris tentang perjuangan manusia yang terkurung di balik dinding raksasa menghadapi ancaman para Titan kanibal.',
    reasonEn: 'Matches the dark fantasy anime about humanity walled off against towering flesh-eating humanoid Titans.'
  },
  // 28. Jujutsu Kaisen
  {
    target: 'Jujutsu Kaisen',
    year: 2020,
    type: 'anime',
    keywords: [
      'makan jari sukuna', 'kutukan', 'jujutsu tech', 'satoru gojo', 'yuji itadori',
      'megumi fushiguro', 'domain expansion', 'penyihir kutukan'
    ],
    reasonId: 'Cocok dengan anime aksi supernatural tentang anak SMA yang menelan jari kutukan Raja Iblis Sukuna dan masuk ke akademi Jujutsu.',
    reasonEn: 'Matches the hit supernatural anime about a high schooler who swallows the cursed talisman finger of Ryomen Sukuna.'
  },
  // 29. Demon Slayer
  {
    target: 'Demon Slayer: Kimetsu no Yaiba',
    year: 2019,
    type: 'anime',
    keywords: [
      'adik jadi iblis', 'kotak kayu di punggung', 'pedang nichirin', 'tanjiro', 'nezuko',
      'pernapasan air', 'korps pembasmi iblis', 'muzan'
    ],
    reasonId: 'Cocok dengan anime petualangan Tanjiro menggendong adiknya yang menjadi iblis dalam kotak kayu sambil berburu obat pemulih.',
    reasonEn: 'Matches the fantasy anime of Tanjiro carrying his demon-turned sister in a wooden box while fighting evil demons.'
  },
  // 30. Chainsaw Man
  {
    target: 'Chainsaw Man',
    year: 2022,
    type: 'anime',
    keywords: [
      'iblis gergaji mesin', 'anjing pochita', 'tali di dada ditarik keluar gergaji',
      'denji', 'makima', 'pemburu iblis keamanan publik'
    ],
    reasonId: 'Cocok dengan anime tentang pemuda miskin yang bergabung dengan iblis gergaji Pochita dan mampu mengeluarkan bilah gergaji dari tubuhnya.',
    reasonEn: 'Matches the anime of Denji fusing with chainsaw devil Pochita to sprout chainsaws from his body and hunt devils.'
  },
  // 31. Stranger Things
  {
    target: 'Stranger Things',
    year: 2016,
    type: 'series',
    keywords: [
      'anak hilang di dimensi lain', 'upside down', 'monster demogorgon', 'kekuatan telekinesis',
      'eleven', 'hawkins', 'anak berkekuatan super mimisan'
    ],
    reasonId: 'Cocok dengan serial petualangan anak-anak era 80-an yang mengungkap dimensi paralel mengerikan Upside Down dan eksperimen laboratorium rahasia.',
    reasonEn: 'Matches the 80s sci-fi series about a missing boy, the shadowy Upside Down dimension, and a telekinetic young girl.'
  },
  // 32. Wednesday
  {
    target: 'Wednesday',
    year: 2022,
    type: 'series',
    keywords: [
      'keluarga addams', 'anak perempuan gotik dingin', 'sekolah nevermore', 'monster di hutan',
      'tangan thing', 'wednesday addams', 'jenna ortega'
    ],
    reasonId: 'Cocok dengan serial misteri komedi gotik putri keluarga Addams saat bersekolah di Akademi Nevermore menyelidiki pembunuhan monster.',
    reasonEn: 'Matches the dark comedy mystery series about Wednesday Addams investigating murders at Nevermore Academy.'
  },
  // 33. The Queen's Gambit
  {
    target: 'The Queen\'s Gambit',
    year: 2020,
    type: 'series',
    keywords: [
      'anak yatim piatu jenius catur', 'papan catur di langit-langit', 'pil penenang',
      'beth harmon', 'grandmaster catur', 'kejuaraan catur dunia'
    ],
    reasonId: 'Cocok dengan miniseri drama anak perempuan yatim piatu jenius catur yang menaklukkan pecatur dunia sambil berjuang melawan kecanduan.',
    reasonEn: 'Matches the award-winning miniseries of an orphaned chess prodigy rising through world championships while battling addiction.'
  },
  // 34. Parasite (Bong Joon-ho)
  {
    target: 'Parasite',
    year: 2019,
    type: 'movie',
    keywords: [
      'keluarga miskin menyusup', 'pekerja keluarga kaya', 'ruang bawah tanah rahasia',
      'banjir rumah semibasement', 'keluarga kim', 'bong joon ho', 'batu pembawa rejeki'
    ],
    reasonId: 'Cocok dengan mahakarya Korea tentang keluarga miskin yang menyamar satu per satu untuk bekerja di rumah megah keluarga konglomerat.',
    reasonEn: 'Matches the Oscar-winning South Korean thriller about a destitute family conning their way into serving a wealthy household.'
  },
  // 35. The Truman Show
  {
    target: 'The Truman Show',
    year: 1998,
    type: 'movie',
    keywords: [
      'hidupnya reality show tv', 'kamera tersembunyi sejak lahir', 'truman burbank',
      'jim carrey', 'kota buatan kubah besar', 'layar tv 24 jam'
    ],
    reasonId: 'Cocok dengan film legendaris tentang pria yang tanpa sadar seluruh hidupnya sejak lahir disiarkan langsung sebagai acara reality show TV.',
    reasonEn: 'Matches the classic film of a man discovering his entire life has been broadcast continuously as a reality TV show.'
  },
  // 36. The Shawshank Redemption
  {
    target: 'The Shawshank Redemption',
    year: 1994,
    type: 'movie',
    keywords: [
      'bankir dituduh membunuh istri', 'kabur dari penjara terowongan', 'poster wanita penjara',
      'andy dufresne', 'morgan freeman red', 'shawshank'
    ],
    reasonId: 'Cocok dengan film legendaris nomor 1 IMDb tentang bankir yang dipenjara seumur hidup namun diam-diam menggali terowongan kabur selama 19 tahun.',
    reasonEn: 'Matches the highest-rated movie about a wrongfully convicted banker quietly planning his escape over decades behind prison walls.'
  },
  // 37. Coco
  {
    target: 'Coco',
    year: 2017,
    type: 'movie',
    keywords: [
      'anak ingin bermusik', 'alam orang mati', 'jembatan marigold', 'gitar tengkorak',
      'miguel', 'hector', 'mama coco', 'hari kematian meksiko'
    ],
    reasonId: 'Cocok dengan animasi Disney Pixar tentang anak laki-laki pecinta musik yang secara magis tersesat di Negeri Orang Mati.',
    reasonEn: 'Matches the Pixar animated gem about young Miguel journeying across the marigold bridge into the Land of the Dead.'
  },
  // 38. Pengabdi Setan
  {
    target: 'Pengabdi Setan',
    year: 2017,
    type: 'movie',
    keywords: [
      'ibu sakit membunyikan lonceng', 'sekte pemuja setan', 'mayat hidup berjalan hujan lebat',
      'rini', 'joko anwar', 'lonceng ibu', 'tara basro'
    ],
    reasonId: 'Cocok dengan horor legendaris karya Joko Anwar tentang ibu sakit di kasur yang membunyikan lonceng dan ikatan kelam sekte pemuja setan.',
    reasonEn: 'Matches the Indonesian horror blockbuster about a mother\'s eerie bell and dark pacts with a sinister demonic cult.'
  },
  // 39. Siksa Kubur
  {
    target: 'Siksa Kubur',
    year: 2024,
    type: 'movie',
    keywords: [
      'wanita tidak percaya agama', 'masuk liang kubur orang berdosa', 'bawa handycam perekam',
      'sita', 'kuburan bergetar', 'faradina mufti', 'joko anwar siksa kubur'
    ],
    reasonId: 'Cocok dengan film horor religi tentang wanita yang tidak mempercayai agama dan nekat ikut dikubur ke liang lahat orang paling berdosa.',
    reasonEn: 'Matches the psychological religious horror about a disillusioned woman burying herself alive to witness punishment of the grave.'
  },
  // 40. KKN di Desa Penari
  {
    target: 'KKN di Desa Penari',
    year: 2022,
    type: 'movie',
    keywords: [
      'mahasiswa kkn desa terpencil', 'penari ular mistis', 'melanggar pantangan',
      'badarawuhi', 'desa penari', 'bima dan ayu'
    ],
    reasonId: 'Cocok dengan film horor fenomena Indonesia tentang kelompok mahasiswa KKN di desa terpencil yang melanggar pantangan siluman ular Badarawuhi.',
    reasonEn: 'Matches the record-setting horror about university students trapped in a remote village haunted by a serpent dancer spirit.'
  },
  // 41. Agak Laen
  {
    target: 'Agak Laen',
    year: 2024,
    type: 'movie',
    keywords: [
      'wahana rumah hantu pasar malam', 'caleg mati jantungan dikubur', 'rumah hantu sepi',
      'boris bokir', 'bene dion', 'indra jegel', 'okiroot', 'agak laen'
    ],
    reasonId: 'Cocok dengan film horor komedi empat sekawan penjaga rumah hantu pasar malam yang menguburkan jasad calon caleg demi membuat wahananya viral.',
    reasonEn: 'Matches the smash-hit horror-comedy about four friends burying a deceased politician inside their haunted carnival attraction.'
  },
  // 42. Joker
  {
    target: 'Joker',
    year: 2019,
    type: 'movie',
    keywords: [
      'badut jalanan komedian', 'tertawa tak terkendali', 'gotham', 'arthur fleck',
      'joaquin phoenix', 'tangga jalanan joget badut'
    ],
    reasonId: 'Cocok dengan kisah psikologis Arthur Fleck, badut jalanan yang mengalami gangguan tawa saraf hingga bertransformasi menjadi simbol anarki di Gotham.',
    reasonEn: 'Matches the character study of Arthur Fleck, an isolated clown whose descent into madness ignites a violent counter-culture in Gotham.'
  },
  // 43. The Dark Knight
  {
    target: 'The Dark Knight',
    year: 2008,
    type: 'movie',
    keywords: [
      'batman melawan badut perusuh', 'joker heath ledger', 'two face koin', 'harvey dent',
      'christopher nolan batman', 'knights gotham'
    ],
    reasonId: 'Cocok dengan mahakarya superhero karya Christopher Nolan di mana Batman menghadapi teror anarki psikologis Joker di kota Gotham.',
    reasonEn: 'Matches Christopher Nolan\'s definitive masterpiece pitting Batman against Heath Ledger\'s chaotic and anarchic Joker.'
  },
  // 44. Gone Girl
  {
    target: 'Gone Girl',
    year: 2014,
    type: 'movie',
    keywords: [
      'istri tiba-tiba menghilang', 'suami dituduh membunuh dijebak', 'buku harian palsu',
      'amy dunne', 'nick dunne', 'rosamund pike', 'david fincher'
    ],
    reasonId: 'Cocok dengan film thriller psikologis tentang suami yang dituduh membunuh istrinya yang hilang, padahal direncanakan dengan manipulasi dingin.',
    reasonEn: 'Matches the twisted psychological thriller of a husband becoming prime suspect in his wife\'s meticulously staged disappearance.'
  },
  // 45. Ex Machina
  {
    target: 'Ex Machina',
    year: 2015,
    type: 'movie',
    keywords: [
      'tes turing robot wanita', 'robot humanoid ava', 'rumah terpencil miliarder',
      'kecerdasan buatan robot cantik', 'alicia vikander', 'alex garland'
    ],
    reasonId: 'Cocok dengan sci-fi psikologis tentang programmer yang diundang menguji kesadaran seorang robot humanoid wanita berparas manusia bernama Ava.',
    reasonEn: 'Matches the intelligent sci-fi thriller where a programmer administers a Turing test to a sophisticated humanoid robot named Ava.'
  },
  // 46. Don\'t Breathe
  {
    target: 'Don\'t Breathe',
    year: 2016,
    type: 'movie',
    keywords: [
      'pencuri bobol rumah veteran buta', 'orang tua buta mematikan', 'ruang bawah tanah wanita terikat',
      'jangan bernapas', 'stephen lang'
    ],
    reasonId: 'Cocok dengan thriller menegangkan tentang tiga pemuda pembobol rumah veteran buta yang ternyata adalah mantan tentara mematikan dan menyimpan rahasia kelam.',
    reasonEn: 'Matches the nail-biting thriller of thieves breaking into the house of a blind veteran who turns out to be lethally dangerous.'
  },
  // 47. A Silent Voice
  {
    target: 'A Silent Voice',
    year: 2016,
    type: 'anime',
    keywords: [
      'mantan perundung menebus dosa', 'gadis tuna rungu', 'shoya ishida', 'shoko nishimiya',
      'buku catatan komunikasi', 'koe no katachi'
    ],
    reasonId: 'Cocok dengan anime mengharukan tentang seorang mantan pelaku perundungan di masa SD yang ingin menebus kesalahannya kepada gadis tuna rungu.',
    reasonEn: 'Matches the emotional anime of a former school bully seeking redemption by reconnecting with the deaf girl he once tormented.'
  },
  // 48. Train to Busan
  {
    target: 'Train to Busan',
    year: 2016,
    type: 'movie',
    keywords: [
      'kereta cepat zombie korea', 'ayah anak perempuan kereta', 'zombie di stasiun',
      'gong yoo', 'ma dong-seok', 'busan kereta api'
    ],
    reasonId: 'Cocok dengan film aksi zombie Korea tentang perjuangan seorang ayah melindungi putrinya di dalam gerbong kereta berkecepatan tinggi menuju Busan.',
    reasonEn: 'Matches the high-speed South Korean action thriller of passengers fighting for survival against a zombie outbreak on a bullet train.'
  },
  // 49. Money Heist
  {
    target: 'Money Heist',
    year: 2017,
    type: 'series',
    keywords: [
      'perampokan pabrik uang spanyol', 'topeng dali', 'rencana professor', 'tokyo berlin',
      'bella ciao', 'baju terusan merah', 'la casa de papel'
    ],
    reasonId: 'Cocok dengan serial kriminal tentang sekelompok perampok bertopeng Salvador Dali yang menyandera Percetakan Uang Spanyol di bawah instruksi Sang Profesor.',
    reasonEn: 'Matches the global hit series of a mastermind named The Professor orchestrating daring heists in iconic Dali masks.'
  },
  // 50. Solo Leveling
  {
    target: 'Solo Leveling',
    year: 2024,
    type: 'anime',
    keywords: [
      'hunter terlemah sedunia', 'sistem game leveling up', 'sung jinwoo', 'dungeon ganda',
      'patung tersenyum mengerikan', 'prajurit bayangan arise'
    ],
    reasonId: 'Cocok dengan anime fantasi tentang hunter terlemah berperingkat E yang mendapatkan kemampuan khusus sistem video game untuk terus naik level tanpa batas.',
    reasonEn: 'Matches the hit anime of an E-rank hunter awakening a mysterious leveling system granting him boundless growth.'
  },
  // 51. Kingdom
  {
    target: 'Kingdom',
    year: 2019,
    type: 'series',
    keywords: [
      'film korea tentang sebuah kerajaan yang di serang zombie',
      'film korea kerajaan diserang zombie',
      'kerajaan yang di serang zombie',
      'kerajaan diserang zombie',
      'kerajaan diserang mayat hidup',
      'kerajaan zombie korea',
      'korean kingdom zombie',
      'zombie kerajaan korea',
      'wabah zombie era joseon',
      'putra mahkota lee chang',
      'putera mahkota lee chang',
      'zombie di istana kerajaan',
      'zombie dinasti joseon',
      'bunga pembangkit mayat zombie'
    ],
    reasonId: 'Sangat cocok dengan alur serial epik Korea tentang Putra Mahkota era Dinasti Joseon yang menyelidiki wabah mayat hidup (zombie) mengerikan yang melanda istana dan seluruh kerajaannya.',
    reasonEn: 'Matches the acclaimed South Korean historical thriller series where a Joseon crown prince investigates a mysterious zombie plague threatening the royal kingdom.',
    related: [
      {
        title: 'Rampant',
        year: 2018,
        type: 'movie',
        reasonId: 'Film aksi sejarah Korea tentang pangeran yang kembali ke istana Joseon yang dikepung wabah iblis malam zombie.',
        reasonEn: 'South Korean period action film about a prince defending the royal palace against nocturnal zombie hordes.'
      },
      {
        title: 'All of Us Are Dead',
        year: 2022,
        type: 'series',
        reasonId: 'Serial horor Korea tentang murid-murid SMA yang terjebak di sekolah di tengah wabah virus zombie mematikan.',
        reasonEn: 'Hit Korean zombie apocalypse series following high school students trapped during a sudden viral outbreak.'
      }
    ]
  },
  // 52. Squid Game
  {
    target: 'Squid Game',
    year: 2021,
    type: 'series',
    keywords: [
      'permainan bertahan hidup anak-anak dengan hadiah uang',
      'permainan bertahan hidup hadiah uang',
      'permainan anak-anak mematikan hadiah miliaran',
      'permainan anak hadiah uang',
      'squid game',
      'boneka lampu merah lampu hijau',
      'hadiah 45 miliar won',
      'seragam hijau penjaga pink',
      'seong gi-hun'
    ],
    reasonId: 'Sangat cocok dengan alur serial fenomena global Korea tentang ratusan orang berhutang yang mempertaruhkan nyawa memainkan permainan anak-anak demi hadiah uang tunai 45,6 miliar won.',
    reasonEn: 'Matches the global smash-hit Korean thriller where hundreds of debt-ridden contestants play deadly children\'s games for a massive cash prize.',
    related: [
      {
        title: 'Alice in Borderland',
        year: 2020,
        type: 'series',
        reasonId: 'Serial thriller Jepang tentang sekelompok pemuda yang terjebak di kota Tokyo kosong dan dipaksa bermain game kartu mematikan.',
        reasonEn: 'Japanese survival series where players in an abandoned Tokyo are forced to clear lethal card games.'
      }
    ]
  },
  // 53. Inception
  {
    target: 'Inception',
    year: 2010,
    type: 'movie',
    keywords: [
      'film tentang orang yang terjebak di dalam mimpi berlapis-lapis',
      'mimpi berlapis-lapis',
      'mimpi di dalam mimpi',
      'alat masuk ke mimpi alam bawah sadar',
      'spinning totem gasing berputar',
      'mencuri rahasia dalam mimpi',
      'dom cobb leonardo dicaprio',
      'kick jatuh dalam mimpi'
    ],
    reasonId: 'Sangat cocok dengan alur cerita sci-fi legendaris tentang pencuri ahli yang menyusup ke alam bawah sadar target melalui mimpi berlapis-lapis untuk menanamkan ide.',
    reasonEn: 'Matches Christopher Nolan\'s acclaimed sci-fi masterpiece about a team of thieves who infiltrate minds through multi-layered dreams to plant an idea.',
    related: [
      {
        title: 'Shutter Island',
        year: 2010,
        type: 'movie',
        reasonId: 'Thriller psikologis misteri investigasi rumah sakit jiwa di pulau terpencil dengan plot twist mengejutkan.',
        reasonEn: 'Tense psychological thriller following US Marshals investigating a disappearance on a psychiatric island.'
      }
    ]
  },
  // 54. Parasite
  {
    target: 'Parasite',
    year: 2019,
    type: 'movie',
    keywords: [
      'keluarga miskin menyusup keluarga kaya',
      'seluruh keluarga miskin bekerja di rumah kaya',
      'bunker rahasia bawah tanah rumah mewah',
      'sopir guru les pembantu keluarga kaya',
      'parasite bong joon ho',
      'batu scholar pembawa keberuntungan'
    ],
    reasonId: 'Sangat cocok dengan mahakarya satire Korea tentang satu keluarga miskin yang secara terencana menyusup dan bekerja sebagai staf di rumah keluarga konglomerat kaya raya.',
    reasonEn: 'Matches the Oscar-winning South Korean dark comedy thriller of a poor family scheming to become employed by a wealthy household.',
    related: [
      {
        title: 'Knives Out',
        year: 2019,
        type: 'movie',
        reasonId: 'Misteri detektif investigasi pembunuhan novelis kaya dengan keluarga penuh intrik dan rahasia.',
        reasonEn: 'Whodunnit mystery about a master detective investigating the eccentric family of a deceased wealthy author.'
      }
    ]
  },
  // 55. All of Us Are Dead
  {
    target: 'All of Us Are Dead',
    year: 2022,
    type: 'series',
    keywords: [
      'zombie di sekolah sma korea',
      'wabah zombie murid sma terkurung',
      'sma hyosan zombie virus',
      'seragam sekolah bertahan hidup zombie korea',
      'guru sains ciptakan virus zombie'
    ],
    reasonId: 'Sangat cocok dengan serial Korea tentang sekelompok siswa SMA yang terjebak di gedung sekolah mereka ketika virus zombie tiba-tiba merebak.',
    reasonEn: 'Matches the South Korean coming-of-age zombie thriller where trapped high school students struggle to survive an outbreak.',
    related: [
      {
        title: 'Train to Busan',
        year: 2016,
        type: 'movie',
        reasonId: 'Film horor aksi Korea tentang penumpang kereta cepat yang berjuang melawan wabah zombie.',
        reasonEn: 'Action-packed Korean thriller about survivors trapped on a bullet train during a zombie apocalypse.'
      }
    ]
  },
  // 56. Oppenheimer
  {
    target: 'Oppenheimer',
    year: 2023,
    type: 'movie',
    keywords: [
      'bapak pembuat bom atom',
      'proyek manhattan los alamos',
      'uji coba bom atom trinity',
      'j robert oppenheimer fisikawan',
      'cillian murphy bom nuklir nolan'
    ],
    reasonId: 'Sangat cocok dengan film biopik epik Christopher Nolan tentang fisikawan J. Robert Oppenheimer yang memimpin Proyek Manhattan dalam penciptaan bom atom pertama di dunia.',
    reasonEn: 'Matches Christopher Nolan\'s historical epic about J. Robert Oppenheimer leading the Manhattan Project to develop the atomic bomb.'
  },
  // 57. Dune
  {
    target: 'Dune',
    year: 2021,
    type: 'movie',
    keywords: [
      'planet gurun pasir arrakis',
      'cacing raksasa padang pasir',
      'rempah spice melange',
      'paul atreides timothee chalamet',
      'kaum fremen mata biru gurun'
    ],
    reasonId: 'Sangat cocok dengan mahakarya fiksi ilmiah epik tentang perjalanan Paul Atreides ke planet gurun paling berbahaya di alam semesta, Arrakis, tempat cacing raksasa dan Spice berharga.',
    reasonEn: 'Matches Denis Villeneuve\'s sci-fi epic following Paul Atreides on the dangerous desert planet of Arrakis, home to colossal sandworms and the coveted spice.'
  },
  // 58. Jujutsu Kaisen
  {
    target: 'Jujutsu Kaisen',
    year: 2020,
    type: 'anime',
    keywords: [
      'makan jari iblis kutukan sukuna',
      'guru penutup mata gojo satoru',
      'akademi sihir jujutsu tokyo',
      'itadori yuji menelan jari',
      'domain expansion jurus'
    ],
    reasonId: 'Sangat cocok dengan anime dark-fantasy populer tentang siswa SMA yang menelan jari iblis terkutuk Raja Sukuna dan bergabung dengan sekolah penyihir Jujutsu.',
    reasonEn: 'Matches the acclaimed dark-fantasy anime where Yuji Itadori swallows a legendary cursed demon finger and trains at Tokyo Jujutsu High.'
  },
  // 59. Alice in Borderland
  {
    target: 'Alice in Borderland',
    year: 2020,
    type: 'series',
    keywords: [
      'kota tokyo kosong permainan kartu mematikan',
      'arisu terjebak di tokyo sepi game bertahan hidup',
      'game kartu arena kematian tokyo',
      'visa bertahan hidup tokyo kosong'
    ],
    reasonId: 'Sangat cocok dengan serial survival thriller Jepang di mana seorang gamer dan teman-temannya mendapati kota Tokyo tiba-tiba kosong dan dipaksa bermain game mematikan untuk memperpanjang visa hidup.',
    reasonEn: 'Matches the thrilling Japanese series of an obsessed gamer transported to an eerily vacant Tokyo forced into deadly games.'
  },
  // 60. Attack on Titan
  {
    target: 'Attack on Titan',
    year: 2013,
    type: 'anime',
    keywords: [
      'raksasa pemakan manusia di balik dinding',
      'titan colossus meruntuhkan tembok',
      'alat bermanuver 3d odm gear',
      'eren yeager korps penyelidik',
      'shingeki no kyojin dinding maria'
    ],
    reasonId: 'Sangat cocok dengan anime epik legendaris tentang sisa peradaban manusia yang bertahan di balik tiga lapis dinding tinggi dari serangan para raksasa pemakan manusia (Titan).',
    reasonEn: 'Matches the iconic dark-fantasy anime about humanity living within massive walled cities defending against giant man-eating Titans.'
  }
];

/**
 * Match user natural language prompt against the curated archetypes database
 */
function matchArchetypes(userPrompt: string, language: 'id' | 'en'): AiRecommendationItem[] {
  const lower = userPrompt.toLowerCase();
  const matched: (AiRecommendationItem & { score: number })[] = [];
  const seen = new Set<string>();

  for (const arc of CINEMA_ARCHETYPES) {
    let score = 0;
    for (const kw of arc.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Multi-word exact matches get heavier weight
        score += kw.includes(' ') ? 3 : 2;
      }
    }

    if (score >= 3) {
      const confidence = Math.min(99, 82 + score * 3);
      if (!seen.has(arc.target.toLowerCase())) {
        seen.add(arc.target.toLowerCase());
        matched.push({
          title: arc.target,
          year: arc.year,
          type: arc.type,
          confidence,
          matchReason: language === 'id' ? arc.reasonId : arc.reasonEn,
          score,
        });

        // Add related titles if available
        if (arc.related) {
          for (const rel of arc.related) {
            if (!seen.has(rel.title.toLowerCase())) {
              seen.add(rel.title.toLowerCase());
              matched.push({
                title: rel.title,
                year: rel.year,
                type: rel.type,
                confidence: Math.max(75, confidence - 10),
                matchReason: language === 'id' ? rel.reasonId : rel.reasonEn,
                score: score - 2,
              });
            }
          }
        }
      }
    }
  }

  return matched.sort((a, b) => b.confidence - a.confidence);
}

const THEMATIC_CONCEPT_DICTIONARY: Record<string, string[]> = {
  // Horror / Supernatural / Monsters
  kerajaan: ['kingdom', 'dynasty', 'joseon', 'royal', 'palace', 'monarchy'],
  istana: ['palace', 'castle', 'royal', 'joseon', 'emperor'],
  zombie: ['zombie', 'undead', 'plague', 'infected', 'living dead'],
  mayat: ['corpse', 'undead', 'zombie', 'dead body'],
  wabah: ['outbreak', 'plague', 'epidemic', 'virus', 'infection'],
  virus: ['virus', 'outbreak', 'pandemic', 'epidemic', 'infection'],
  kutukan: ['curse', 'cursed', 'demon', 'sorcery', 'occult'],
  iblis: ['demon', 'devil', 'satan', 'exorcism', 'possession'],
  hantu: ['ghost', 'haunting', 'spirit', 'paranormal'],
  vampir: ['vampire', 'dracula', 'blood', 'immortal'],

  // Actions & Conflict
  serang: ['attack', 'invasion', 'war', 'siege', 'plague'],
  serangan: ['attack', 'invasion', 'assault', 'raid'],
  invasi: ['invasion', 'alien invasion', 'attack', 'conquest'],
  perang: ['war', 'battle', 'combat', 'warfare'],
  bertahan: ['survival', 'survive', 'last survivor'],
  penjara: ['prison', 'escape', 'jail', 'inmate', 'convict'],
  perampokan: ['heist', 'robbery', 'bank robbery', 'theft'],
  balas: ['revenge', 'vengeance', 'retribution', 'payback'],
  dendam: ['revenge', 'vengeance', 'vendetta'],

  // Game / Contest / Thriller
  permainan: ['game', 'survival game', 'death game', 'contest'],
  hadiah: ['prize', 'reward', 'cash prize', 'jackpot'],
  uang: ['cash', 'money', 'prize', 'wealth', 'debt'],
  kartu: ['card', 'cards', 'card game', 'poker'],
  judi: ['gambling', 'casino', 'poker', 'stakes'],

  // Sci-Fi / Mind / Time
  mimpi: ['dream', 'dreams', 'subconscious', 'inception', 'lucid'],
  lapis: ['layers', 'layered', 'levels', 'dimensions'],
  waktu: ['time travel', 'time loop', 'time dilation', 'timeline'],
  lingkaran: ['loop', 'time loop', 'repeating'],
  ingatan: ['memory', 'amnesia', 'short term memory', 'subconscious'],
  amnesia: ['amnesia', 'memory loss', 'identity', 'memento'],
  angkasa: ['space', 'astronaut', 'interstellar', 'cosmic'],
  astronot: ['astronaut', 'spacecraft', 'mars', 'black hole'],
  lubang: ['black hole', 'wormhole', 'portal'],
  robot: ['robot', 'cyborg', 'android', 'artificial intelligence', 'ai'],
  alien: ['alien', 'extraterrestrial', 'spaceship', 'ufo'],
  bumi: ['earth', 'apocalypse', 'extinction', 'post-apocalyptic'],

  // School / Youth / Professions
  sekolah: ['school', 'high school', 'academy', 'students'],
  murid: ['student', 'students', 'pupil', 'classmates'],
  sma: ['high school', 'teenagers', 'school'],
  detektif: ['detective', 'investigation', 'inspector', 'police'],
  pembunuh: ['killer', 'serial killer', 'murderer', 'assassin'],
  koki: ['chef', 'cooking', 'restaurant', 'food'],
  masak: ['cooking', 'culinary', 'chef', 'kitchen'],
  catur: ['chess', 'grandmaster', 'prodigy', 'tournament'],
  atom: ['atomic', 'nuclear', 'bomb', 'manhattan', 'oppenheimer'],
  nuklir: ['nuclear', 'atomic', 'radiation', 'fallout'],
  dokter: ['doctor', 'surgeon', 'hospital', 'medical'],
  pangeran: ['prince', 'crown prince', 'royal', 'joseon']
};

const THEMATIC_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'on', 'at', 'to', 'from', 'into',
  'by', 'as', 'who', 'where', 'when', 'that', 'which', 'what', 'how', 'why', 'movie', 'film',
  'show', 'series', 'anime', 'about', 'someone', 'person', 'story', 'tells', 'scene', 'character',
  'enters', 'goes', 'went', 'save', 'saving', 'see', 'saw', 'past', 'future', 'make', 'called',
  'named', 'know', 'because', 'tentang', 'yang', 'dan', 'di', 'ke', 'dari', 'seorang', 'orang',
  'sebuah', 'suatu', 'cerita', 'kisah', 'menceritakan', 'ada', 'itu', 'ini', 'seperti', 'mirip',
  'judul', 'judulnya', 'bisa', 'akan', 'demi', 'adalah', 'punya', 'milik', 'sama', 'banget',
  'korea', 'korean', 'drakor', 'jepang', 'japanese', 'japan', 'indonesia', 'indonesian', 'china',
  'chinese', 'mandarin', 'barat', 'hollywood', 'terbaru', 'bagus', 'terbaik', 'populer'
]);

function parseThematicConcepts(userQuery: string, translatedEn: string) {
  const lowerOrig = userQuery.toLowerCase();
  const lowerEn = translatedEn.toLowerCase();

  let langHint: string | undefined = undefined;
  if (lowerOrig.includes('korea') || lowerOrig.includes('drakor') || lowerEn.includes('korean')) {
    langHint = 'ko';
  } else if (lowerOrig.includes('jepang') || lowerOrig.includes('anime') || lowerEn.includes('japanese')) {
    langHint = 'ja';
  } else if (lowerOrig.includes('indonesia') || lowerEn.includes('indonesian')) {
    langHint = 'id';
  } else if (lowerOrig.includes('china') || lowerOrig.includes('mandarin') || lowerEn.includes('chinese')) {
    langHint = 'zh';
  }

  let formatHint: 'movie' | 'series' | 'all' = 'all';
  if (
    lowerOrig.includes('serial') ||
    lowerOrig.includes('series') ||
    lowerOrig.includes('drama') ||
    lowerOrig.includes('drakor') ||
    lowerEn.includes('series') ||
    lowerEn.includes('tv show')
  ) {
    formatHint = 'series';
  } else if (
    lowerOrig.includes('film') ||
    lowerOrig.includes('movie') ||
    lowerOrig.includes('bioskop') ||
    lowerEn.includes('movie')
  ) {
    formatHint = 'movie';
  }

  // Extract concept tokens from original Indonesian text
  const origTokens = lowerOrig
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !THEMATIC_STOPWORDS.has(w));

  // Extract concept tokens from translated English text
  const enTokens = lowerEn
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !THEMATIC_STOPWORDS.has(w));

  const allConcepts = new Set<string>();
  for (const w of origTokens) {
    if (THEMATIC_CONCEPT_DICTIONARY[w]) {
      THEMATIC_CONCEPT_DICTIONARY[w].forEach((c) => allConcepts.add(c));
    } else {
      allConcepts.add(w);
    }
  }
  for (const w of enTokens) {
    allConcepts.add(w);
  }

  return {
    langHint,
    formatHint,
    origTokens,
    enTokens,
    concepts: Array.from(allConcepts),
  };
}

/**
 * Intelligent Deep Thematic Engine
 * Searches multi-concept keyword intersections, dual movie/tv discover, and scores co-occurrence in synopses.
 */
async function queryTmdbThematicSearch(
  userQuery: string,
  language: 'id' | 'en'
): Promise<AiRecommendationItem[]> {
  try {
    const tmdbKey = getTmdbApiKey();
    const translatedEn =
      language === 'id' ? await translateText(userQuery, 'en') : userQuery;

    const parsed = parseThematicConcepts(userQuery, translatedEn);
    if (parsed.concepts.length === 0 && parsed.enTokens.length === 0) return [];

    const candidateMap = new Map<number, any>();

    // Strategy 1: Compound multi-search with concept pairs
    const phrases: string[] = [];
    const topC = parsed.concepts;
    if (topC.length >= 2) {
      phrases.push(`${topC[0]} ${topC[1]}`);
      phrases.push(`${topC[1]} ${topC[0]}`);
    }
    if (topC.length >= 3) {
      phrases.push(`${topC[0]} ${topC[2]}`);
      phrases.push(`${topC[1]} ${topC[2]}`);
    }
    if (parsed.enTokens.length >= 2) {
      phrases.push(parsed.enTokens.slice(0, 3).join(' '));
    }

    for (const phrase of phrases.slice(0, 4)) {
      try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(
          phrase
        )}&page=1&include_adult=false`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          for (const it of data.results || []) {
            if (it.id && !candidateMap.has(it.id)) {
              candidateMap.set(it.id, it);
            }
          }
        }
      } catch {}
    }

    // Strategy 2: Concurrently Discover Movie & TV with keyword IDs and language filtering
    for (const kw of parsed.concepts.slice(0, 3)) {
      try {
        const kwRes = await fetch(
          `https://api.themoviedb.org/3/search/keyword?api_key=${tmdbKey}&query=${encodeURIComponent(
            kw
          )}`
        );
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          const kwId = kwData.results?.[0]?.id;
          if (kwId) {
            const langParam = parsed.langHint
              ? `&with_original_language=${parsed.langHint}`
              : '';
            const [mRes, tRes] = await Promise.all([
              fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&with_keywords=${kwId}${langParam}&sort_by=vote_count.desc&page=1`
              ),
              fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&with_keywords=${kwId}${langParam}&sort_by=vote_count.desc&page=1`
              ),
            ]);

            const [mData, tData] = await Promise.all([
              mRes.ok ? mRes.json() : { results: [] },
              tRes.ok ? tRes.json() : { results: [] },
            ]);

            for (const m of mData.results || []) {
              if (m.id && !candidateMap.has(m.id)) {
                candidateMap.set(m.id, { ...m, media_type: 'movie' });
              }
            }
            for (const t of tData.results || []) {
              if (t.id && !candidateMap.has(t.id)) {
                candidateMap.set(t.id, { ...t, media_type: 'tv' });
              }
            }
          }
        }
      } catch {}
    }

    if (candidateMap.size === 0) return [];

    // Strategy 3: Multi-Factor Synopsis and Concept Co-occurrence Scorer
    const scored = Array.from(candidateMap.values()).map((item) => {
      let score = 0;
      const title = (item.title || item.name || '').toLowerCase();
      const overview = (item.overview || '').toLowerCase();
      const text = `${title} ${overview}`;

      // Country / Original Language alignment
      if (parsed.langHint && item.original_language === parsed.langHint) {
        score += 40;
      }

      // Format alignment
      if (parsed.formatHint === 'series' && item.media_type === 'tv') {
        score += 25;
      } else if (parsed.formatHint === 'movie' && item.media_type === 'movie') {
        score += 20;
      }

      // Thematic concepts presence in title & synopsis
      let conceptsFound = 0;
      for (const c of parsed.concepts) {
        if (text.includes(c.toLowerCase())) {
          conceptsFound++;
          score += 25;
        }
      }

      // Co-occurrence bonus (multiple concepts present together)
      if (conceptsFound >= 2) score += 50;
      if (conceptsFound >= 3) score += 60;

      // Real-world popularity / Vote reliability weight
      const votes = item.vote_count || 0;
      if (votes > 1000) score += 25;
      else if (votes > 100) score += 15;
      else if (votes < 10) score -= 40;

      return { item, score, conceptsFound };
    });

    scored.sort((a, b) => b.score - a.score);

    const recommendations: AiRecommendationItem[] = [];
    const seenTitles = new Set<string>();

    for (const entry of scored.slice(0, 4)) {
      const it = entry.item;
      const t = it.title || it.name;
      if (!t || seenTitles.has(t.toLowerCase())) continue;
      seenTitles.add(t.toLowerCase());

      const year = it.release_date
        ? parseInt(it.release_date.slice(0, 4))
        : it.first_air_date
        ? parseInt(it.first_air_date.slice(0, 4))
        : undefined;

      const mediaType: 'movie' | 'series' =
        it.media_type === 'tv' ? 'series' : 'movie';

      const keyConceptsSummary = parsed.concepts.slice(0, 3).join(', ');

      const matchReason =
        language === 'id'
          ? `Karya yang sangat cocok dengan tema alur cerita (${keyConceptsSummary}). ${
              it.overview ? `Ringkasan: "${it.overview.slice(0, 110)}..."` : ''
            }`
          : `Strong thematic match for concepts (${keyConceptsSummary}). ${
              it.overview ? `Synopsis: "${it.overview.slice(0, 110)}..."` : ''
            }`;

      recommendations.push({
        title: t,
        year,
        type: mediaType,
        confidence: Math.min(96, Math.max(78, 75 + Math.round(entry.score / 6))),
        matchReason,
      });
    }

    return recommendations;
  } catch {
    return [];
  }
}

/**
 * Normalize title strings for high-precision matching
 */
function normalizeAiTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Detect documentary, behind-the-scenes, specials, or bonus content
 */
function isDocumentaryOrSpecialTitle(title: string): boolean {
  const lower = (title || '').toLowerCase();
  return (
    lower.includes("inside '") ||
    lower.startsWith('inside ') ||
    lower.includes('making of') ||
    lower.includes("making '") ||
    lower.includes('behind the scenes') ||
    lower.includes('the making') ||
    lower.includes('relight') ||
    lower.includes('special:') ||
    lower.includes('specials') ||
    lower.includes('bonus features') ||
    lower.includes('featurette') ||
    lower.includes('documentary')
  );
}

/**
 * Score a TMDB/Catalog candidate against an AI recommendation item
 * Ensures iconic blockbuster/series titles outrank obscure behind-the-scenes or subtitle variations
 */
function scoreAiCandidate(candidate: UnifiedSearchResult, rec: AiRecommendationItem): number {
  let score = 0;
  const candNorm = normalizeAiTitle(candidate.title);
  const candEnNorm = normalizeAiTitle(candidate.titleEn || '');
  const candIdNorm = normalizeAiTitle(candidate.titleId || '');
  const candOrigNorm = normalizeAiTitle(candidate.originalTitle || '');
  const candRomajiNorm = normalizeAiTitle(candidate.romajiTitle || '');
  const recNorm = normalizeAiTitle(rec.title);

  const isExactTitle =
    candNorm === recNorm ||
    candEnNorm === recNorm ||
    candIdNorm === recNorm ||
    candOrigNorm === recNorm ||
    candRomajiNorm === recNorm;

  if (isExactTitle) {
    score += 50000;
  } else {
    if (candNorm.startsWith(recNorm) || candEnNorm.startsWith(recNorm)) {
      score += 5000;
    } else if (candNorm.includes(recNorm) || candEnNorm.includes(recNorm)) {
      score += 2000;
    }
  }

  // Heavily penalize documentary / behind-the-scenes titles unless recommended title asks for it
  if (isDocumentaryOrSpecialTitle(candidate.title) && !isDocumentaryOrSpecialTitle(rec.title)) {
    score -= 40000;
  }

  // Release year proximity
  if (rec.year && candidate.year) {
    const yearDiff = Math.abs(candidate.year - rec.year);
    if (yearDiff === 0) {
      score += 15000;
    } else if (yearDiff === 1) {
      score += 3000;
    } else if (yearDiff <= 3) {
      score += 500;
    } else {
      score -= Math.min(10000, yearDiff * 500);
    }
  }

  // Media type match
  const recIsTv = rec.type === 'series' || rec.type === 'anime';
  const candIsTv = candidate.mediaType === 'series' || candidate.mediaType === 'anime';
  if (rec.type) {
    if ((recIsTv && candIsTv) || (rec.type === 'movie' && candidate.mediaType === 'movie')) {
      score += 10000;
    } else {
      score -= 8000;
    }
  }

  // Vote count & Popularity (distinguishes real iconic works from obscure titles)
  const votes = candidate.voteCount || 0;
  if (votes > 10000) {
    score += 10000;
  } else if (votes > 100) {
    score += 6000;
  } else if (votes > 50) {
    score += 3000;
  } else if (votes < 10) {
    score -= 5000;
  }

  const pop = candidate.popularity || 0;
  score += Math.min(5000, Math.round(pop * 20));

  return score;
}

function smartPickAiMatch(
  matches: UnifiedSearchResult[],
  rec: AiRecommendationItem
): UnifiedSearchResult | null {
  if (!matches || matches.length === 0) return null;
  const scored = matches.map((m) => ({ match: m, score: scoreAiCandidate(m, rec) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.match || null;
}

/**
 * Main AI Search Entrypoint
 * Identifies movie/show by description and resolves into full UnifiedSearchResult objects with streaming servers
 */
export async function searchWithAI(
  userDescription: string,
  language: 'id' | 'en' = 'id'
): Promise<UnifiedSearchResult[]> {
  const cleanDesc = userDescription.trim();
  if (!cleanDesc || cleanDesc.length < 3) return [];

  let recommendations: AiRecommendationItem[] = [];

  // Tier 1: Check if user configured custom Gemini API Key
  const geminiKey = getStoredGeminiApiKey();
  if (geminiKey) {
    recommendations = await queryGeminiApi(cleanDesc, geminiKey, language);
  }

  // Tier 2: Curated Semantic Cinema Archetypes Engine
  if (recommendations.length === 0) {
    recommendations = matchArchetypes(cleanDesc, language);
  }

  // Tier 3: Dynamic TMDB Thematic Discovery (if archetypes gave few or zero results)
  if (recommendations.length < 3) {
    const dynamicResults = await queryTmdbThematicSearch(cleanDesc, language);
    const existingTitles = new Set(recommendations.map((r) => r.title.toLowerCase()));

    for (const item of dynamicResults) {
      if (!existingTitles.has(item.title.toLowerCase())) {
        existingTitles.add(item.title.toLowerCase());
        recommendations.push(item);
      }
    }
  }

  if (recommendations.length === 0) return [];

  // Step 4: Resolve each recommended title into rich UnifiedSearchResult from live catalogs
  const resolvedPromises = recommendations.map(async (rec, index) => {
    try {
      const searchSource = rec.type === 'anime' ? 'all' : 'tmdb';
      const hybridMatches = await searchHybrid(rec.title, searchSource, language);
      if (hybridMatches && hybridMatches.length > 0) {
        const best = smartPickAiMatch(hybridMatches, rec);
        if (best) {
          return {
            item: {
              ...best,
              source: 'ai' as const,
              aiMatchReason: rec.matchReason,
              aiConfidence: rec.confidence,
            },
            index,
            confidence: rec.confidence,
          };
        }
      }
    } catch (err) {
      console.warn(`[AI Search] Failed to resolve recommendation "${rec.title}":`, err);
    }
    return null;
  });

  const settled = await Promise.all(resolvedPromises);
  const validResolved = settled
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.index - b.index;
    });

  const finalResults: UnifiedSearchResult[] = [];
  const seenIds = new Set<string>();

  for (const entry of validResolved) {
    if (!seenIds.has(entry.item.id)) {
      seenIds.add(entry.item.id);
      finalResults.push(entry.item);
    }
  }

  return finalResults;
}

