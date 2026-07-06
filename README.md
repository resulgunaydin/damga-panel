# DamgaPanel — AI Satış Zekâsı Sistemi

Bir dijital ajansın **kendi iç kullanımı** için geliştirilen, yapay zekâ destekli satış zekâsı paneli. Satılık bir ürün (SaaS) değildir — tek şirket, tek kullanıcı içindir.

> **Tek cümlelik hedef:** *"Şehir + sektör yaz; sistem sana satışa hazır, sıralanmış, mesajı yazılmış bir müşteri listesi çıkarsın."*

Sistem satış temsilcisine şunun cevabını hazır verir: **kime, neyi, hangi mesajla sat.**

---

## Değişmez kurallar

Tüm sistemi ayakta tutan üç ilke — hiçbir modül bunları ihlal edemez:

1. **Sistem hiçbir mesajı kendisi ATMAZ.** Metni üretir, kullanıcının önüne koyar; göndermeyi her zaman kullanıcı yapar (WhatsApp ban riskini önler).
2. **Pahalı hiçbir iş kendiliğinden başlamaz.** Derin analiz, rakip taraması, sunum üretimi — hepsi elle tetiklenir.
3. **Para hunide aşağı indikçe harcanır.** Tepe (liste) bedava, dip (sunum) pahalı. Para yalnızca kullanıcı "bu firma" dediğinde yanar.

Ek çapraz-kesen ilke — **Cache:** Limit/maliyet harcayan her dış çağrı önce veritabanından kontrol edilir; veri varsa API'ye hiç gidilmez. *Aynı veriyi iki kez satın alma.*

---

## Uçtan uca akış (huni)

```
Şehir+sektör ara
  → Kaba Eleme (AI'sız otomatik puanlama, 3 kova)
  → Kullanıcı ilgilendiklerini "Çalışma Listeme" seçer
  → Ön mesaj üret (kullanıcı kendi WhatsApp'ından yollar)
  → Dönüş gelirse → POTANSİYEL'e terfi
  → [Derin Analiz + Sunum] (elle, pahalı adım)
  → Teklif / takip / itiraz mesajları
  → Anlaşınca → GERÇEK MÜŞTERİ (iş + ödeme takibi)
```

**Üç aşama:** Eleme Müşterisi (bedava, liste) → Potansiyel Müşteri (analiz/sunum) → Gerçek Müşteri (iş + ödeme takibi).

---

## Teknoloji

| Katman | Seçim |
|---|---|
| Dil | TypeScript (tek dil, front+back) |
| Framework | Next.js (App Router) |
| UI | Tailwind + shadcn/ui |
| DB + ORM | PostgreSQL + Prisma |
| Tarayıcı otomasyonu | Playwright (website analizi, HTML→PDF sunum) |
| Arka plan işleri | Worker süreci + BullMQ (Redis) |
| AI | Anthropic TypeScript SDK (`@anthropic-ai/sdk`); varsayılan `claude-opus-4-8`, basit üretimlerde `claude-haiku-4-5` |
| Dış API | Google Places API (New), Google PageSpeed Insights API |

---

## Kurulum

> Ön koşullar: Node.js 22+, PostgreSQL, Redis.

```bash
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri
cp .env.example .env
#   DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY,
#   GOOGLE_PLACES_API_KEY, GOOGLE_PAGESPEED_API_KEY doldur

# 3. Veritabanı şeması
npx prisma migrate dev

# 4. Geliştirme sunucusu
npm run dev

# 5. Arka plan worker'ı (ayrı süreç)
npm run worker
```

**Dağıtım:** Kullanıcının VPS'i; mevcut projenin yanına paralel — ayrı klasör + ayrı DB + subdomain + kendi süreçleri (Next uygulaması + worker).

---

## Geliştirme iş akışı

- `main` her zaman çalışır durumdadır; **doğrudan push yok.**
- Her iş kendi `feature/<modül-adı>` branch'inde yazılır → **Pull Request** açılır → kullanıcı diff'i inceler → onaylarsa merge.
- Commit mesajları anlamlı ve **Türkçe**; her commit tek mantıksal değişiklik.
- Force push / geçmiş silme yok.

Detaylı tasarım: [`docs/2026-07-06-damgapanel-tasarim.md`](docs/2026-07-06-damgapanel-tasarim.md)

---

## Durum

🚧 Geliştirme başlangıcı. İlerleme **GitHub Issues + Milestones** üzerinden takip edilir.
