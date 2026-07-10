// Keşif motoru — adaptive/özyinelemeli grid (Bölüm 4.2).
// "Devamını Gör" mantığı: her çağrı frontier'dan küçük bir grup iş çeker (~6 sorgu),
// dolan hücreleri 4'e böler, place_id ile tekilleştirir, yalnızca YENİ firmaları döner.
// Sabit ince grid YOK: boş bölgeye sorgu harcanmaz, sadece taşan hücre bölünür.

import { prisma } from "@/lib/prisma";
import {
  resolveAreaRect,
  rectSpan,
  searchText,
  splitRect,
  type PlaceResult,
  type Rect,
} from "@/lib/places";
import { getCaps, getDailyUsage, incrementUsage } from "@/lib/quota";

// Korkuluk sabitleri
const BATCH_QUERIES = 6; // "Devamını Gör" başına en fazla sorgu (~3–6)
const MAX_DEPTH = 4; // grid bölme derinlik limiti
const MIN_SPAN = 0.004; // ~400m; bundan küçük hücre bölünmez
const PAGE_LIMIT = 3; // Places: sayfa başına 20, en fazla 3 sayfa = 60

type Task = {
  rect: Rect;
  keyword: string;
  depth: number;
  page: number;
  pageToken?: string;
  cellCount: number; // bu hücre+kelime için o ana dek toplanan sonuç
};

type GridState = {
  initialized: boolean;
  frontier: Task[];
  queriesUsed: number; // bu segment taraması boyunca toplam sorgu
  done: boolean;
  stoppedReason?: string | null;
};

export type ScanSummary = {
  newCount: number;
  queriesThisBatch: number;
  totalQueries: number;
  done: boolean;
  stopped: boolean;
  stoppedReason: string | null;
  frontierSize: number;
};

function uniqueKeywords(sector: string, extra: string[]): string[] {
  const all = [sector, ...extra]
    .map((k) => k.trim())
    .filter(Boolean);
  return Array.from(new Set(all));
}

function canSplit(task: Task): boolean {
  return task.depth < MAX_DEPTH && rectSpan(task.rect) > MIN_SPAN * 2;
}

// Bir Places sonucunu firma olarak kaydeder (place_id ile dedup). Yeni ise döner.
async function saveBusiness(
  searchId: string,
  p: PlaceResult,
): Promise<boolean> {
  // Telefonu olmayan firma asla çekilmez (soğuk temas telefon pivotu — numarasız firma işe yaramaz).
  if (!p.phone || !p.phone.trim()) return false;
  const existing = await prisma.business.findUnique({ where: { placeId: p.id } });
  if (existing) return false; // zaten listede / geçmişte → dedup (kara liste dahil)
  await prisma.business.create({
    data: {
      searchId,
      placeId: p.id,
      name: p.name,
      phone: p.phone,
      website: p.website,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      googleRating: p.rating,
      googleReviews: p.reviews,
      social: p.googleMapsUri ? { googleMapsUri: p.googleMapsUri } : undefined,
    },
  });
  return true;
}

// Tek bir "Devamını Gör" / tarama grubunu çalıştırır.
export async function runScanBatch(searchId: string): Promise<ScanSummary> {
  const search = await prisma.search.findUnique({ where: { id: searchId } });
  if (!search) throw new Error("Segment bulunamadı.");

  const caps = await getCaps();
  let daily = await getDailyUsage("PLACES_SEARCH");

  const state: GridState =
    (search.gridState as GridState | null) ?? {
      initialized: false,
      frontier: [],
      queriesUsed: 0,
      done: false,
      stoppedReason: null,
    };

  let queriesThisBatch = 0;
  let newCount = 0;
  let stopped = false;
  let stoppedReason: string | null = null;

  const overCaps = () => {
    if (daily >= caps.dailyCap) {
      stopped = true;
      stoppedReason = "gunluk-tavan";
      return true;
    }
    if (state.queriesUsed >= caps.perScanCap) {
      stopped = true;
      stoppedReason = "tarama-tavani";
      return true;
    }
    return false;
  };

  // İlk çağrı: alan dikdörtgenini çöz, frontier'ı kelimelerle tohumla.
  if (!state.initialized) {
    if (overCaps()) {
      await persist(search.id, state, stoppedReason);
      return summary(newCount, queriesThisBatch, state, stopped, stoppedReason);
    }
    const areaQuery = `${search.district ? search.district + ", " : ""}${search.city}, Türkiye`;
    const rect = await resolveAreaRect(areaQuery);
    await incrementUsage("PLACES_SEARCH");
    daily++;
    state.queriesUsed++;
    queriesThisBatch++;

    if (!rect) {
      state.initialized = true;
      state.done = true;
      state.stoppedReason = "alan-bulunamadi";
      await persist(search.id, state, "alan-bulunamadi");
      return summary(newCount, queriesThisBatch, state, false, "alan-bulunamadi");
    }
    const keywords = uniqueKeywords(search.sector, search.keywords);
    state.frontier = keywords.map((keyword) => ({
      rect,
      keyword,
      depth: 0,
      page: 1,
      cellCount: 0,
    }));
    state.initialized = true;
  }

  // Frontier'dan bu grup için iş çek.
  while (state.frontier.length > 0 && queriesThisBatch < BATCH_QUERIES) {
    if (overCaps()) break;

    const task = state.frontier.shift()!;
    let resp;
    try {
      resp = await searchText({
        textQuery: task.keyword,
        rect: task.rect,
        pageToken: task.pageToken,
      });
    } catch (err) {
      // Hata olursa bu görevi geri koymadan dur; kullanıcıya bildir.
      stopped = true;
      stoppedReason =
        err instanceof Error ? `places-hata: ${err.message}` : "places-hata";
      break;
    }
    await incrementUsage("PLACES_SEARCH");
    daily++;
    state.queriesUsed++;
    queriesThisBatch++;

    for (const place of resp.places) {
      if (await saveBusiness(search.id, place)) newCount++;
    }

    const cellCount = task.cellCount + resp.places.length;
    const full = resp.places.length >= 20;

    if (full && task.page < PAGE_LIMIT && resp.nextPageToken) {
      // Aynı hücrenin bir sonraki sayfası (yalnızca sayfa doluysa istenir).
      state.frontier.push({
        ...task,
        pageToken: resp.nextPageToken,
        page: task.page + 1,
        cellCount,
      });
    } else if (full && canSplit(task)) {
      // Hücre taşıyor → 4 çeyreğe böl (adaptive). Boş/az dolu hücre bölünmez.
      for (const quad of splitRect(task.rect)) {
        state.frontier.push({
          rect: quad,
          keyword: task.keyword,
          depth: task.depth + 1,
          page: 1,
          cellCount: 0,
        });
      }
    }
    // Aksi halde hücre tükendi; hiçbir şey eklemeyiz.
  }

  state.done = state.frontier.length === 0 && !stopped;
  state.stoppedReason = stoppedReason;
  await persist(search.id, state, stoppedReason);
  return summary(newCount, queriesThisBatch, state, stopped, stoppedReason);
}

async function persist(
  searchId: string,
  state: GridState,
  stoppedReason: string | null,
) {
  await prisma.search.update({
    where: { id: searchId },
    data: {
      gridState: { ...state, stoppedReason } as object,
      queryCount: state.queriesUsed,
      lastRunAt: new Date(),
    },
  });
}

function summary(
  newCount: number,
  queriesThisBatch: number,
  state: GridState,
  stopped: boolean,
  stoppedReason: string | null,
): ScanSummary {
  return {
    newCount,
    queriesThisBatch,
    totalQueries: state.queriesUsed,
    done: state.done,
    stopped,
    stoppedReason,
    frontierSize: state.frontier.length,
  };
}
