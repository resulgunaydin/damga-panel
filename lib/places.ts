// Google Places API (New) istemcisi — yalnızca bu kaynak kullanılır (Bölüm 4.2).
// Text Search (New) + dikdörtgen (rectangle) konum kısıtı ile adaptive grid tabanı.

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

// Keşif alan maskesi: kaba eleme için gereken alanlar (site/puan/yorum) dahil.
const DISCOVERY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
].join(",");

export type LatLng = { lat: number; lng: number };
export type Rect = { low: LatLng; high: LatLng };

export type PlaceResult = {
  id: string;
  name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviews: number | null;
  lat: number | null;
  lng: number | null;
  googleMapsUri: string | null;
};

type RawPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

function mapPlace(p: RawPlace): PlaceResult {
  return {
    id: p.id,
    name: p.displayName?.text ?? "(isimsiz)",
    address: p.formattedAddress ?? null,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    googleMapsUri: p.googleMapsUri ?? null,
  };
}

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY tanımlı değil.");
  return key;
}

// Bir metin aramasını (opsiyonel dikdörtgen kısıtı + sayfa jetonu ile) çalıştırır.
// Her çağrı = 1 sorgu (kota sayacında bu şekilde sayılır).
export async function searchText(opts: {
  textQuery: string;
  rect?: Rect;
  pageToken?: string;
}): Promise<{ places: PlaceResult[]; nextPageToken: string | null }> {
  const body: Record<string, unknown> = {
    textQuery: opts.textQuery,
    languageCode: "tr",
    regionCode: "TR",
    pageSize: 20,
  };
  if (opts.rect) {
    body.locationRestriction = {
      rectangle: {
        low: { latitude: opts.rect.low.lat, longitude: opts.rect.low.lng },
        high: { latitude: opts.rect.high.lat, longitude: opts.rect.high.lng },
      },
    };
  }
  if (opts.pageToken) body.pageToken = opts.pageToken;

  const res = await fetch(SEARCH_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": DISCOVERY_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Places hatası (${res.status})`);
  }
  return {
    places: (data.places ?? []).map(mapPlace),
    nextPageToken: data.nextPageToken ?? null,
  };
}

// Bir il/ilçe adının kabaca kapsayan dikdörtgenini (viewport) çözer.
// Adaptive grid'in başlangıç hücresi budur. Başarısızsa location ± ~0.05° kutu.
export async function resolveAreaRect(query: string): Promise<Rect | null> {
  const res = await fetch(SEARCH_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "places.viewport,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "tr",
      regionCode: "TR",
      pageSize: 1,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Places hatası (${res.status})`);
  }
  const place = data.places?.[0];
  const vp = place?.viewport;
  if (vp?.low && vp?.high) {
    return {
      low: { lat: vp.low.latitude, lng: vp.low.longitude },
      high: { lat: vp.high.latitude, lng: vp.high.longitude },
    };
  }
  const loc = place?.location;
  if (loc?.latitude != null && loc?.longitude != null) {
    const d = 0.05;
    return {
      low: { lat: loc.latitude - d, lng: loc.longitude - d },
      high: { lat: loc.latitude + d, lng: loc.longitude + d },
    };
  }
  return null;
}

// Dikdörtgeni dört eşit çeyreğe böler (adaptive grid).
export function splitRect(r: Rect): Rect[] {
  const midLat = (r.low.lat + r.high.lat) / 2;
  const midLng = (r.low.lng + r.high.lng) / 2;
  return [
    { low: { lat: r.low.lat, lng: r.low.lng }, high: { lat: midLat, lng: midLng } },
    { low: { lat: r.low.lat, lng: midLng }, high: { lat: midLat, lng: r.high.lng } },
    { low: { lat: midLat, lng: r.low.lng }, high: { lat: r.high.lat, lng: midLng } },
    { low: { lat: midLat, lng: midLng }, high: { lat: r.high.lat, lng: r.high.lng } },
  ];
}

// Dikdörtgenin en kısa kenarı (derece) — bölme derinlik limiti için.
export function rectSpan(r: Rect): number {
  return Math.min(r.high.lat - r.low.lat, r.high.lng - r.low.lng);
}

export type PlaceReview = {
  rating: number | null;
  text: string | null;
  publishTime: string | null;
};
export type PlaceDetails = {
  rating: number | null;
  reviewCount: number | null;
  reviews: PlaceReview[];
  photoCount: number | null; // Places en fazla ~10 foto referansı döner
  googleMapsUri: string | null;
};

const DETAILS_FIELD_MASK = [
  "id",
  "rating",
  "userRatingCount",
  "reviews",
  "photos",
  "googleMapsUri",
].join(",");

// Bir firmanın Google Business detayını çeker (Bölüm 4.5 GBP motoru).
export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Places detay hatası (${res.status})`);
  }
  const reviews: PlaceReview[] = (data.reviews ?? []).map(
    (r: {
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      publishTime?: string;
    }) => ({
      rating: typeof r.rating === "number" ? r.rating : null,
      text: r.text?.text ?? r.originalText?.text ?? null,
      publishTime: r.publishTime ?? null,
    }),
  );
  return {
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    reviews,
    photoCount: Array.isArray(data.photos) ? data.photos.length : null,
    googleMapsUri: data.googleMapsUri ?? null,
  };
}
