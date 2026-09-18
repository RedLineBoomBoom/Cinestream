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

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
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
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
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
          return items.filter((it) => it.title.length > 0);
        }
      }
    } catch {
      // Try next model fallback
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

/**
 * Dynamic TMDB Semantic Fallback Search
 * Searches keywords, person filmographies, and thematic discoveries when prompt isn't covered by archetypes.
 */
async function queryTmdbThematicSearch(
  userQuery: string,
  language: 'id' | 'en'
): Promise<AiRecommendationItem[]> {
  try {
    const tmdbKey = getTmdbApiKey();
    const translated = language === 'id' ? await translateText(userQuery, 'en') : userQuery;

    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'on', 'at', 'to', 'from', 'into',
      'by', 'as', 'who', 'where', 'when', 'that', 'which', 'what', 'how', 'why', 'movie', 'film',
      'show', 'series', 'anime', 'about', 'someone', 'person', 'story', 'tells', 'scene', 'character',
      'enters', 'goes', 'went', 'save', 'saving', 'see', 'saw', 'past', 'future', 'make', 'called',
      'named', 'know', 'because', 'tentang', 'yang', 'dan', 'di', 'ke', 'dari', 'seorang', 'orang',
      'cerita', 'kisah', 'menceritakan', 'ada', 'itu', 'ini', 'seperti', 'mirip', 'judul', 'judulnya',
      'bisa', 'akan', 'demi', 'adalah', 'punya', 'milik', 'sama', 'banget'
    ]);

    const cleanTokens = translated
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    if (cleanTokens.length === 0) return [];

    const recommendations: AiRecommendationItem[] = [];
    const seen = new Set<string>();

    // Strategy 1: Search TMDB Keyword Discovery for top 2 tokens
    for (const term of cleanTokens.slice(0, 2)) {
      try {
        const kwRes = await fetch(
          `https://api.themoviedb.org/3/search/keyword?api_key=${tmdbKey}&query=${encodeURIComponent(
            term
          )}`
        );
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          const firstKw = kwData.results?.[0];
          if (firstKw?.id) {
            const discRes = await fetch(
              `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&with_keywords=${firstKw.id}&sort_by=vote_count.desc&page=1`
            );
            if (discRes.ok) {
              const discData = await discRes.json();
              for (const m of (discData.results || []).slice(0, 2)) {
                const key = m.title.toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  recommendations.push({
                    title: m.title,
                    year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
                    type: 'movie',
                    confidence: 86,
                    matchReason:
                      language === 'id'
                        ? `Cocok dengan tema alur cerita: "${firstKw.name}". ${
                            m.overview ? `Ringkasan: "${m.overview.slice(0, 100)}..."` : ''
                          }`
                        : `Matched thematic keyword: "${firstKw.name}". ${
                            m.overview ? `Synopsis: "${m.overview.slice(0, 100)}..."` : ''
                          }`,
                  });
                }
              }
            }
          }
        }
      } catch {}
    }

    // Strategy 2: Multi search for compound phrases
    if (cleanTokens.length >= 2 && recommendations.length < 3) {
      const phrase = `${cleanTokens[0]} ${cleanTokens[1]}`;
      try {
        const multiRes = await fetch(
          `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(
            phrase
          )}&include_adult=false&page=1`
        );
        if (multiRes.ok) {
          const multiData = await multiRes.json();
          for (const it of (multiData.results || []).slice(0, 2)) {
            const t = it.title || it.name;
            if (t && !seen.has(t.toLowerCase())) {
              seen.add(t.toLowerCase());
              recommendations.push({
                title: t,
                year: it.release_date
                  ? parseInt(it.release_date.slice(0, 4))
                  : it.first_air_date
                  ? parseInt(it.first_air_date.slice(0, 4))
                  : undefined,
                type: it.media_type === 'tv' ? 'series' : 'movie',
                confidence: 84,
                matchReason:
                  language === 'id'
                    ? `Ditemukan berdasarkan kecocokan kata kunci "${phrase}". ${
                        it.overview ? `Ringkasan: "${it.overview.slice(0, 100)}..."` : ''
                      }`
                    : `Matched by storyline keywords "${phrase}". ${
                        it.overview ? `Synopsis: "${it.overview.slice(0, 100)}..."` : ''
                      }`,
              });
            }
          }
        }
      } catch {}
    }

    return recommendations.slice(0, 4);
  } catch {
    return [];
  }
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

  // Step 4: Resolve each recommended title into rich UnifiedSearchResult from TMDB live catalog
  const resolvedResults: UnifiedSearchResult[] = [];
  const resolvedIds = new Set<string>();

  await Promise.all(
    recommendations.map(async (rec) => {
      try {
        const hybridMatches = await searchHybrid(rec.title, 'tmdb', language);
        if (hybridMatches.length > 0) {
          // Find best match matching the recommended year/type if possible
          const best =
            hybridMatches.find(
              (m) =>
                rec.year &&
                Math.abs((m.year || 0) - rec.year) <= 1 &&
                (rec.type ? m.mediaType === rec.type : true)
            ) ||
            hybridMatches.find((m) => rec.year && Math.abs((m.year || 0) - rec.year) <= 1) ||
            hybridMatches[0];

          if (best && !resolvedIds.has(best.id)) {
            resolvedIds.add(best.id);
            resolvedResults.push({
              ...best,
              source: 'ai',
              aiMatchReason: rec.matchReason,
              aiConfidence: rec.confidence,
            });
          }
        }
      } catch {
        // Continue with other recommendations
      }
    })
  );

  // Sort by AI confidence descending
  return resolvedResults.sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
}

