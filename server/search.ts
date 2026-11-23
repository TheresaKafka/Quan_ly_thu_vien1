import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  DauSachWithStats,
  FacetBucket,
  LibraryDatabase,
  RelatedBookRecommendation,
  SearchFacets,
  SearchMode,
  SearchResponse,
  SearchResultTitle,
} from '../src/types/library.ts';
import { getTitlesWithStats } from './db.ts';

const CACHE_DIR = path.resolve(process.cwd(), 'data');
const EMBED_CACHE_PATH = path.join(CACHE_DIR, 'embeddings-cache.json');

interface EmbeddingCacheEntry {
  hash: string;
  vector: number[];
}

type EmbeddingCacheStore = Record<string, EmbeddingCacheEntry>;

// Từ điển viết tắt & đồng nghĩa thư viện (Phương án 1)
const LIBRARY_SYNONYMS: Record<string, string[]> = {
  csdl: ['co so du lieu', 'database', 'sql', 'quan he'],
  db: ['database', 'co so du lieu'],
  cntt: ['cong nghe thong tin', 'phan mem', 'he thong', 'lap trinh'],
  it: ['cong nghe thong tin', 'phan mem'],
  kt: ['kinh te', 'vi mo', 'tai chinh'],
  vh: ['van hoc', 'tieu thuyet'],
  kh: ['khoa hoc', 'vat ly', 'luong tu'],
  khtn: ['khoa hoc tu nhien', 'vu tru', 'vat ly'],
  ls: ['lich su', 'sapiens', 'loai nguoi'],
  tl: ['tam ly', 'tu duy'],
  nxb: ['nha xuat ban'],
  code: ['ma sach', 'clean code', 'phan mem', 'lap trinh'],
  microservices: ['phan manh', 'he thong phan tan'],
};

export function normalizeVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[m][n];
}

function expandQueryTokens(rawQuery: string): {
  normalizedQuery: string;
  tokens: string[];
  expandedPhrases: string[];
} {
  const norm = normalizeVietnamese(rawQuery);
  const tokens = norm.split(' ').filter(Boolean);
  const expandedPhrases: string[] = [];

  for (const t of tokens) {
    if (LIBRARY_SYNONYMS[t]) {
      for (const syn of LIBRARY_SYNONYMS[t]) {
        if (!expandedPhrases.includes(syn)) expandedPhrases.push(syn);
      }
    }
  }
  return { normalizedQuery: norm, tokens, expandedPhrases };
}

function scoreFuzzyTitle(
  title: DauSachWithStats,
  rawQuery: string
): { score: number; reasons: string[] } {
  const { normalizedQuery, tokens, expandedPhrases } = expandQueryTokens(rawQuery);
  if (!normalizedQuery) return { score: 1, reasons: [] };

  const titleNorm = normalizeVietnamese(title.TenSach);
  const authorNorm = normalizeVietnamese(title.TacGia);
  const catNorm = normalizeVietnamese(title.TheLoai);
  const descNorm = normalizeVietnamese(title.MoTa || '');
  const isbnNorm = (title.ISBN || '').toLowerCase();
  const idNorm = title.MaDauSach.toLowerCase();
  const copyCodes = (title.BanSaoList || []).map((b) => b.MaBanSao.toLowerCase());

  let score = 0;
  const reasons: string[] = [];

  // 1. Direct barcode / ISBN / ID check
  const rawLower = rawQuery.trim().toLowerCase();
  if (
    idNorm.includes(rawLower) ||
    isbnNorm.includes(rawLower) ||
    copyCodes.some((c) => c.includes(rawLower))
  ) {
    score += 100;
    reasons.push('Khớp mã định danh / ISBN / Bản sao');
  }

  // 2. Accent-insensitive phrase match
  if (titleNorm.includes(normalizedQuery)) {
    score += 80;
    reasons.push('Khớp không dấu trong tên sách');
  } else if (authorNorm.includes(normalizedQuery)) {
    score += 70;
    reasons.push('Khớp không dấu tên tác giả');
  } else if (catNorm.includes(normalizedQuery) || descNorm.includes(normalizedQuery)) {
    score += 45;
    reasons.push('Khớp không dấu thể loại / mô tả');
  }

  // 3. Synonym / Abbreviation expansion match
  for (const phrase of expandedPhrases) {
    if (
      titleNorm.includes(phrase) ||
      catNorm.includes(phrase) ||
      descNorm.includes(phrase)
    ) {
      score += 55;
      reasons.push(`Mở rộng từ đồng nghĩa: "${phrase}"`);
    }
  }

  // 4. Token-level Damerau-Levenshtein fuzzy match (typo tolerance)
  const fieldWords = `${titleNorm} ${authorNorm} ${catNorm}`.split(' ').filter(Boolean);
  let matchedTokens = 0;
  const fuzzyCorrections: string[] = [];

  for (const qToken of tokens) {
    if (qToken.length < 2) continue;
    let bestWord = '';
    let bestDist = Infinity;

    for (const w of fieldWords) {
      if (w.includes(qToken)) {
        bestDist = 0;
        bestWord = w;
        break;
      }
      if (Math.abs(w.length - qToken.length) <= 2 && qToken.length >= 4) {
        const d = damerauLevenshtein(qToken, w);
        const maxAllowed = qToken.length >= 7 ? 2 : 1;
        if (d <= maxAllowed && d < bestDist) {
          bestDist = d;
          bestWord = w;
        }
      }
    }

    if (bestDist === 0) {
      matchedTokens++;
      score += 18;
    } else if (bestDist <= 2) {
      matchedTokens++;
      score += 12;
      fuzzyCorrections.push(`${qToken} → ${bestWord}`);
    }
  }

  if (fuzzyCorrections.length > 0) {
    reasons.push(`Khớp gần đúng: ${fuzzyCorrections.slice(0, 2).join(', ')}`);
  }

  // Require at least half the tokens or synonym/exact match
  if (
    score > 0 &&
    tokens.length > 1 &&
    matchedTokens < Math.ceil(tokens.length * 0.5) &&
    expandedPhrases.length === 0 &&
    !titleNorm.includes(normalizedQuery) &&
    !authorNorm.includes(normalizedQuery)
  ) {
    score = 0;
  }

  return { score, reasons: Array.from(new Set(reasons)) };
}

function getTitleContentHash(t: DauSachWithStats): string {
  const text = `${t.TenSach}|${t.TacGia}|${t.TheLoai}|${t.MoTa || ''}`;
  return crypto.createHash('sha1').update(text).digest('hex');
}

function loadEmbeddingCache(): EmbeddingCacheStore {
  if (!fs.existsSync(EMBED_CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(EMBED_CACHE_PATH, 'utf-8')) as EmbeddingCacheStore;
  } catch {
    return {};
  }
}

function saveEmbeddingCache(cache: EmbeddingCacheStore): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(EMBED_CACHE_PATH, JSON.stringify(cache), 'utf-8');
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trong Settings > Secrets để chạy Tìm kiếm ngữ nghĩa (Phương án 2).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function ensureTitleEmbeddings(
  titles: DauSachWithStats[]
): Promise<Map<string, number[]>> {
  const cache = loadEmbeddingCache();
  const missing: Array<{ title: DauSachWithStats; hash: string; text: string }> = [];

  for (const t of titles) {
    const hash = getTitleContentHash(t);
    const cached = cache[t.MaDauSach];
    if (!cached || cached.hash !== hash || !Array.isArray(cached.vector)) {
      missing.push({
        title: t,
        hash,
        text: `Nhan đề: ${t.TenSach}. Tác giả: ${t.TacGia}. Thể loại: ${t.TheLoai}. Mô tả: ${t.MoTa || ''}`,
      });
    }
  }

  if (missing.length > 0) {
    const ai = getGeminiClient();
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: missing.map((m) => m.text),
    });

    const embeddings = result.embeddings || [];
    missing.forEach((m, idx) => {
      const vec = embeddings[idx]?.values;
      if (vec && vec.length > 0) {
        cache[m.title.MaDauSach] = { hash: m.hash, vector: vec };
      }
    });
    saveEmbeddingCache(cache);
  }

  const map = new Map<string, number[]>();
  for (const t of titles) {
    if (cache[t.MaDauSach]?.vector) {
      map.set(t.MaDauSach, cache[t.MaDauSach].vector);
    }
  }
  return map;
}

export function buildFacets(titles: DauSachWithStats[]): SearchFacets {
  const catCounts = new Map<string, number>();
  const shelfCounts = new Map<string, number>();
  const yearCounts = new Map<string, number>();
  let available = 0;
  let unavailable = 0;

  for (const t of titles) {
    catCounts.set(t.TheLoai, (catCounts.get(t.TheLoai) || 0) + 1);
    const shelf = t.ViTriKe || 'Chưa xếp kệ';
    shelfCounts.set(shelf, (shelfCounts.get(shelf) || 0) + 1);
    const yr = String(t.NamXuatBan);
    yearCounts.set(yr, (yearCounts.get(yr) || 0) + 1);
    if (t.SoBanSanSang > 0) available++;
    else unavailable++;
  }

  const toBuckets = (m: Map<string, number>, sortNumericDesc = false): FacetBucket[] =>
    Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) =>
        sortNumericDesc
          ? Number(b.value) - Number(a.value)
          : b.count - a.count || a.value.localeCompare(b.value)
      );

  return {
    categories: toBuckets(catCounts),
    shelves: toBuckets(shelfCounts),
    years: toBuckets(yearCounts, true),
    availability: { available, unavailable },
  };
}

export async function executeLibrarySearch(
  db: LibraryDatabase,
  params: {
    q?: string;
    mode?: SearchMode;
    theLoai?: string;
    viTriKe?: string;
    nam?: string;
    chiConSach?: boolean;
  }
): Promise<SearchResponse> {
  const start = performance.now();
  const q = (params.q || '').trim();
  const mode: SearchMode = params.mode || 'traditional';
  const allTitles = getTitlesWithStats(db, true);

  let matchedTitles: SearchResultTitle[] = [];
  let expandedTerms: string[] | undefined;

  if (!q) {
    matchedTitles = allTitles;
  } else if (mode === 'traditional') {
    const kw = q.toLowerCase();
    matchedTitles = allTitles
      .filter(
        (t) =>
          t.TenSach.toLowerCase().includes(kw) ||
          t.TacGia.toLowerCase().includes(kw) ||
          (t.ISBN && t.ISBN.toLowerCase().includes(kw)) ||
          t.MaDauSach.toLowerCase().includes(kw) ||
          (t.BanSaoList && t.BanSaoList.some((b) => b.MaBanSao.toLowerCase().includes(kw)))
      )
      .map((t) => ({
        ...t,
        searchMeta: { score: 1, reasons: ['Khớp chuỗi truyền thống'] },
      }));
  } else if (mode === 'fuzzy') {
    const { expandedPhrases } = expandQueryTokens(q);
    expandedTerms = expandedPhrases;
    matchedTitles = allTitles
      .map((t) => {
        const { score, reasons } = scoreFuzzyTitle(t, q);
        return {
          ...t,
          searchMeta: { score, reasons },
        };
      })
      .filter((t) => (t.searchMeta?.score || 0) > 0)
      .sort((a, b) => (b.searchMeta?.score || 0) - (a.searchMeta?.score || 0));
  } else if (mode === 'semantic') {
    const [titleVectors, queryEmbedRes] = await Promise.all([
      ensureTitleEmbeddings(allTitles),
      (async () => {
        const ai = getGeminiClient();
        return ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: [q],
        });
      })(),
    ]);

    const queryVec = queryEmbedRes.embeddings?.[0]?.values;
    if (!queryVec || queryVec.length === 0) {
      throw new Error('Không nhận được vector embedding từ Gemini API.');
    }

    // 1. Semantic ranking
    const semanticScored = allTitles.map((t) => {
      const vec = titleVectors.get(t.MaDauSach);
      const sim = vec ? cosineSimilarity(queryVec, vec) : 0;
      return { title: t, sim };
    });
    const semanticSorted = [...semanticScored].sort((a, b) => b.sim - a.sim);
    const semanticRankMap = new Map<string, number>();
    semanticSorted.forEach((item, idx) => semanticRankMap.set(item.title.MaDauSach, idx + 1));

    // 2. Lexical / Fuzzy ranking
    const lexicalScored = allTitles.map((t) => ({
      title: t,
      lex: scoreFuzzyTitle(t, q),
    }));
    const lexicalSorted = [...lexicalScored]
      .filter((x) => x.lex.score > 0)
      .sort((a, b) => b.lex.score - a.lex.score);
    const lexicalRankMap = new Map<string, number>();
    lexicalSorted.forEach((item, idx) => lexicalRankMap.set(item.title.MaDauSach, idx + 1));

    // 3. Reciprocal Rank Fusion (RRF)
    const K = 60;
    const simById = new Map(semanticScored.map((s) => [s.title.MaDauSach, s.sim]));
    const lexById = new Map(lexicalScored.map((l) => [l.title.MaDauSach, l.lex]));

    matchedTitles = allTitles
      .map((t) => {
        const sim = simById.get(t.MaDauSach) || 0;
        const lex = lexById.get(t.MaDauSach)!;
        const semRank = semanticRankMap.get(t.MaDauSach) || 999;
        const lexRank = lexicalRankMap.get(t.MaDauSach);

        const rrf =
          1 / (K + semRank) + (lexRank !== undefined ? 1 / (K + lexRank) : 0);

        const reasons: string[] = [];
        const simPct = Math.round(sim * 100);
        if (simPct >= 45) {
          reasons.push(`Tương đồng ngữ nghĩa ${simPct}%`);
        }
        if (lex.reasons.length > 0) {
          reasons.push(...lex.reasons);
        }

        return {
          ...t,
          searchMeta: {
            score: Number(rrf.toFixed(4)),
            semanticScore: simPct,
            reasons,
          },
        };
      })
      .filter(
        (t) =>
          (t.searchMeta?.semanticScore || 0) >= 48 ||
          lexicalRankMap.has(t.MaDauSach)
      )
      .sort((a, b) => (b.searchMeta?.score || 0) - (a.searchMeta?.score || 0));
  }

  // Facets computed BEFORE applying selected facet filters (Phương án 4)
  const facets = buildFacets(matchedTitles);
  const totalBeforeFacets = matchedTitles.length;

  // Apply selected Facets
  let filtered = matchedTitles;
  if (params.theLoai && params.theLoai !== 'ALL') {
    filtered = filtered.filter((t) => t.TheLoai === params.theLoai);
  }
  if (params.viTriKe && params.viTriKe !== 'ALL') {
    filtered = filtered.filter((t) => (t.ViTriKe || 'Chưa xếp kệ') === params.viTriKe);
  }
  if (params.nam && params.nam !== 'ALL') {
    filtered = filtered.filter((t) => String(t.NamXuatBan) === params.nam);
  }
  if (params.chiConSach) {
    filtered = filtered.filter((t) => t.SoBanSanSang > 0);
  }

  return {
    mode,
    query: q,
    expandedTerms,
    titles: filtered,
    facets,
    totalBeforeFacets,
    durationMs: Math.max(1, Math.round(performance.now() - start)),
  };
}

// Phương án 4: Khám phá liên kết đồng mượn (Co-Borrowing Graph) & Cùng kệ
export function getRelatedBooksDiscovery(
  db: LibraryDatabase,
  maDauSach: string
): RelatedBookRecommendation[] {
  const titles = getTitlesWithStats(db, false);
  const target = titles.find((t) => t.MaDauSach === maDauSach);
  if (!target) return [];

  const copyToTitle = new Map<string, string>();
  for (const b of db.BanSaoSach) {
    copyToTitle.set(b.MaBanSao, b.MaDauSach);
  }

  // Group borrowed title IDs by Slip (MaPhieu) and by Patron (MaDocGia)
  const slipToTitles = new Map<string, Set<string>>();
  const slipToPatron = new Map<string, string>();
  for (const p of db.PhieuMuonTra) {
    slipToPatron.set(p.MaPhieu, p.MaDocGia);
  }

  const patronToTitles = new Map<string, Set<string>>();
  for (const ct of db.ChiTietMuonTra) {
    const tid = copyToTitle.get(ct.MaBanSao);
    if (!tid) continue;
    if (!slipToTitles.has(ct.MaPhieu)) slipToTitles.set(ct.MaPhieu, new Set());
    slipToTitles.get(ct.MaPhieu)!.add(tid);

    const patronId = slipToPatron.get(ct.MaPhieu);
    if (patronId) {
      if (!patronToTitles.has(patronId)) patronToTitles.set(patronId, new Set());
      patronToTitles.get(patronId)!.add(tid);
    }
  }

  const coBorrowSlipCount = new Map<string, number>();
  for (const titleSet of slipToTitles.values()) {
    if (titleSet.has(maDauSach)) {
      for (const otherId of titleSet) {
        if (otherId !== maDauSach) {
          coBorrowSlipCount.set(otherId, (coBorrowSlipCount.get(otherId) || 0) + 1);
        }
      }
    }
  }

  const coBorrowPatronCount = new Map<string, number>();
  for (const titleSet of patronToTitles.values()) {
    if (titleSet.has(maDauSach)) {
      for (const otherId of titleSet) {
        if (otherId !== maDauSach) {
          coBorrowPatronCount.set(otherId, (coBorrowPatronCount.get(otherId) || 0) + 1);
        }
      }
    }
  }

  const targetShelfPrefix = target.ViTriKe ? target.ViTriKe.split('-')[0].trim() : '';

  const recs: RelatedBookRecommendation[] = [];
  for (const t of titles) {
    if (t.MaDauSach === maDauSach) continue;

    const slipCnt = coBorrowSlipCount.get(t.MaDauSach) || 0;
    const patronCnt = coBorrowPatronCount.get(t.MaDauSach) || 0;
    const sameShelf =
      targetShelfPrefix &&
      t.ViTriKe &&
      t.ViTriKe.split('-')[0].trim() === targetShelfPrefix;
    const sameCategory = t.TheLoai === target.TheLoai;

    if (slipCnt > 0) {
      recs.push({
        MaDauSach: t.MaDauSach,
        TenSach: t.TenSach,
        TacGia: t.TacGia,
        TheLoai: t.TheLoai,
        ViTriKe: t.ViTriKe,
        SoBanSanSang: t.SoBanSanSang,
        TongBanSao: t.TongBanSao,
        relationType: 'CO_BORROWED',
        relationLabel: `Thường mượn cùng phiếu (${slipCnt} lượt)`,
        weight: 100 + slipCnt * 20,
      });
    } else if (patronCnt > 0) {
      recs.push({
        MaDauSach: t.MaDauSach,
        TenSach: t.TacGia ? t.TenSach : t.TenSach,
        TacGia: t.TacGia,
        TheLoai: t.TheLoai,
        ViTriKe: t.ViTriKe,
        SoBanSanSang: t.SoBanSanSang,
        TongBanSao: t.TongBanSao,
        relationType: 'SAME_PATRON',
        relationLabel: `Cùng độc giả đã mượn (${patronCnt} người)`,
        weight: 70 + patronCnt * 10,
      });
    } else if (sameShelf) {
      recs.push({
        MaDauSach: t.MaDauSach,
        TenSach: t.TenSach,
        TacGia: t.TacGia,
        TheLoai: t.TheLoai,
        ViTriKe: t.ViTriKe,
        SoBanSanSang: t.SoBanSanSang,
        TongBanSao: t.TongBanSao,
        relationType: 'SAME_SHELF',
        relationLabel: `Cùng khu vực ${targetShelfPrefix}`,
        weight: 45,
      });
    } else if (sameCategory) {
      recs.push({
        MaDauSach: t.MaDauSach,
        TenSach: t.TenSach,
        TacGia: t.TacGia,
        TheLoai: t.TheLoai,
        ViTriKe: t.ViTriKe,
        SoBanSanSang: t.SoBanSanSang,
        TongBanSao: t.TongBanSao,
        relationType: 'SAME_CATEGORY',
        relationLabel: `Cùng thể loại ${t.TheLoai}`,
        weight: 30,
      });
    }
  }

  return recs.sort((a, b) => b.weight - a.weight).slice(0, 6);
}
