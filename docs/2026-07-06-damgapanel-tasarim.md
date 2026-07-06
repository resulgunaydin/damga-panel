# DamgaPanel — AI Satış Zekâsı Sistemi
## Tasarım / Proje Dokümanı

**Tarih:** 2026-07-06
**Durum:** Fikir netleşti — uygulama planına hazır
**Dil:** Türkçe (ürün arayüzü ve içerik Türkçe)

---

## 0. Bu doküman nedir?

Bu belge, dijital bir ajansın **kendi iç kullanımı** için geliştireceği AI destekli satış zekâsı panelinin tam tasarımıdır. Amaç: dağınık fikir kararlarını, uygulamaya başlanabilecek tek bir kaynağa dönüştürmek. Satılık bir ürün (SaaS) **değildir** — tek şirket, tek kullanıcı içindir.

---

## 1. Ürün felsefesi ve amaç

Bir ajansın satış öncesi harcadığı emek yoğun işleri yapay zekâ ile hızlandırmak:
müşteri bulma → firma araştırma → web/rakip analizi → teklif/sunum hazırlama → mesaj yazma → takip.

**Tek cümlelik hedef:** *"Şehir + sektör yaz; sistem sana satışa hazır, sıralanmış, mesajı yazılmış bir müşteri listesi çıkarsın."*

Sistem satış temsilcisine şu soruların cevabını hazır verir: **kime, neyi, hangi mesajla sat.**

---

## 2. Değişmez kurallar

Tüm sistemi ayakta tutan üç ilke — hiçbir modül bunları ihlal edemez:

1. **Sistem hiçbir mesajı kendisi ATMAZ.** Metni üretir, kullanıcının önüne koyar; göndermeyi **her zaman kullanıcı** yapar (WhatsApp ban riskini önler, kontrolü kullanıcıda tutar).
2. **Pahalı hiçbir iş kendiliğinden başlamaz.** Derin analiz, rakip taraması, sunum üretimi — hepsi **elle tetiklenir.** Sistem "hazırım, dersen yaparım" diye bekler.
3. **Para hunide aşağı indikçe harcanır.** Tepe (liste) bedava, dip (sunum) pahalı. Para yalnızca kullanıcı **"bu firma"** dediğinde yanar — çöp firmalara değil.

---

## 3. Uçtan uca akış (huni) ve durumlar

Firmalar üç aşamalı bir yaşam döngüsünden geçer. Para hunide aşağı indikçe harcanır.

### 3.1 Akış özeti

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

### 3.2 Aşamalar ve durumlar

**AŞAMA 1 — ELEME MÜŞTERİSİ** *(bedava, sadece liste)*
- `Yeni` — bulundu, dokunulmadı
- `Ön mesaj gönderildi` — nabız yoklandı, dönüş bekleniyor (zaman sayacı işler)
- `Ulaşılamadı` — dönmedi / numara ölü → **park edilir, silinmez** (2 ay sonra tekrar denenebilir)

**⬇️ dönüş gelince kullanıcı terfi ettirir**

**AŞAMA 2 — POTANSİYEL MÜŞTERİ** *(kozlar burada açılır: analiz, sunum)*
- `Potansiyel` — cevap verdi, derin analiz bekliyor
- `Sunum yapıldı` — analiz + sunum gönderildi
- `Teklif yapıldı` — resmi teklif geçildi
- `Kayıp` — olmadı; **sebebiyle** kaydedilir (ilgisiz / fiyat / rakibe gitti / ihtiyaç yok / ulaşılamadı)

**⬇️ anlaşınca terfi**

**AŞAMA 3 — GERÇEK MÜŞTERİ** *(satış değil, iş takibi)*
- `İş devam ediyor` · `İş bitti`
- Detay: çoklu iş satırı + ödeme (elle) + deadline + notlar

### 3.3 Görünüm
Durumlar bir **Kanban panosu**nda sütunlardır; kartlar butonla veya sürükle-bırak ilerler. Üç aşama renkle ayrılır (eleme = nötr, potansiyel = sıcak, müşteri = yeşil).

### 3.4 Kritik ayrım: Seçim ≠ Potansiyel
Kullanıcı bir firmayı seçince o firma **"Çalışma Listeme"** eklenir; durumu hâlâ `Yeni`'dir. **Potansiyel olması için önce ön mesaja dönüş yapması gerekir.** Bu ayrım huninin sayılarını dürüst tutar (dönmeyen firma "potansiyel" görünmez).

---

## 4. Modüller

### 4.1 Çalışma Alanı & klasör düzeni
Kullanıcı onlarca il/ilçe × sektör araması yapacak. Bunları düzenli tutmak için:
- Sol menüde **klasör/ağaç yapısı**; kullanıcı istediği mantıkla gruplar (il'e / sektöre / kampanyaya göre).
- Klasörler **arama yapılmadan önce** boş olarak oluşturulabilir.
- Her arama bir "segment" kartı; klasörlere sürükle-bırak ile yerleşir.
- Her şey **veritabanında** durur → başka bilgisayardan girince aynı düzen gelir.
- **Toplu çalıştırma yok** — her aramayı kullanıcı tek tek açar/çalıştırır.

### 4.2 Keşif motoru (veri toplama)
- **Kaynak: yalnızca Google Places API** (OSM/Yandex vb. kullanılmayacak).
- **60 sonuç sınırı** (20×3 sayfa) var. Aşmak için **adaptive/özyinelemeli grid (hücre)** + **anahtar kelime çeşitleme** (ör. "diş kliniği", "ağız diş sağlığı", "diş hekimi").
  - **Sabit ince grid YASAK** (binlerce sorguya yol açar). Adaptive: önce geniş alan aranır; 60 dönerse (taşıyorsa) 4 parçaya bölünür, sadece dolu parçalar tekrar bölünür. Boş bölgeye sorgu harcanmaz.
- **"Devamını Gör" butonu:** her tık yeni grid hücresi/kelime varyantı çalıştırır (~3–6 sorgu), kayıtlı firmaları eleyip yalnızca **yeni** firmaları gösterir. Otomatik toplu tarama yok.
- **place_id ile tekilleştirme** (dedup). Google'da "hariç tut" parametresi olmadığı için dışlama kendi tarafımızda yapılır.
- **Zorunlu korkuluklar (quota koruması):**
  - Sert sorgu tavanı (tarama başına + günlük); dolunca **DUR ve sor**.
  - Grid derinlik limiti (belli küçüklükten sonra bölme).
  - Sadece-gerektiğinde sayfalama (hücre 20'den az verirse 2./3. sayfa istenmez).
  - Canlı sorgu sayacı + tarama öncesi tahmin & onay.
- **Manuel firma ekleme:** referansla gelen firmayı elle ekleyip aynı huniye sokma.
- **Çakışma koruması / Kara liste:** keşif ve manuel eklemede place_id + isim/telefon kontrolü; "bu firma zaten listende / geçmişte X durumdaydı" uyarısı. Kara liste = bir daha gösterme.

### 4.3 Kaba Eleme (AI'sız otomatik puanlama)
Google'dan gelen ham veriyle (ad, telefon, web var/yok, puan, yorum sayısı) + ucuz kontrollerle (SSL, mobil, açılıyor mu) **fırsat skoru** hesaplanır. "Ne kadar açığı var = ne kadar satılır" mantığı.

Örnek puanlama: site yok +40, SSL yok +15, mobil bozuk +15, yorum <30 +15, son yorum >3 ay +10, puan <4.0 +10.

Üç kova: **🔥 Sıcak (70+)** en üstte · **🟡 Ilık (40–69)** · **⚪ Soğuk (<40)** en altta (zaten iyi durumda, satacak şey az).

### 4.4 Ön mesaj (nabız yoklama)
Kozları açmadan önce "bu firma canlı ve ilgili mi?" sorusunu ucuza yanıtlar.
- Sistem kısa, kişisel bir metin **üretir**; kullanıcı kopyalar, **kendi WhatsApp'ından** yollar, firmayı `Ön mesaj gönderildi` işaretler.
- Dönüş ("buyrun?" bile) → firma **Potansiyel**'e terfiye hazır.
- Dallar: dönüş → Potansiyel · 3 gün sessiz → "takip at?" · ikinci mesaja da sessiz → Ulaşılamadı · "ilgilenmiyorum" → Kayıp.
- Aynı anda iki çöp firmayı eler: ölü/WhatsApp'sız numaralar **ve** dönmeyen firmalar.

### 4.5 Analiz motorları (elle tetiklenen pahalı adım)
Firma Potansiyel olunca kartı "kilitli" gelir. Kullanıcı **[Derin Analiz + Sunum]**'a basınca — ve ancak o an — çalışır:
- **Website Analiz Motoru:** tasarım, mobil, hız, SSL, SEO altyapısı → kalite puanı. (Playwright ile gerçek tarayıcı + Google PageSpeed Insights API.)
- **Google Business Motoru:** yorum sayısı, son yorum, fotoğraf, cevaplanan yorum oranı, aktivite.
- **Rakip Analizi:** aynı şehir+sektörde en üst 2–3 firma (kendi keşif verimizden) ile kıyas; AI "neden geride" açıklar.
- **Analiz dürüstlüğü kuralı:** teknik olarak güvenilir tespit edilebilenler gösterilir; edilemeyenler (ör. rakip Google Ads kullanıyor mu) **"tespit edilemedi"** diye açıkça belirtilir. **Asla hayal/uydurma satılmaz.** Her sinyal kesin / tahmini / imkânsız diye ele alınır.

### 4.6 Satış Fırsatı Motoru (fiyatsız)
Analiz çıktısını hizmet bazlı önceliğe dönüştürür: "bu firmaya önce web sitesi, sonra yorum çalışması satılabilir" (yıldız/skor ile). Beslendiği kaynak: kullanıcının tanımladığı **Hizmet Listesi (fiyatsız)** — sadece "hangi hizmetler var", "kaça" değil.

> **Fiyat sistemden tamamen kaldırılmıştır.** Tahmini ciro motoru yok, dashboard'da potansiyel ciro yok, sunumda fiyatlandırma bölümü yok. (Yalnızca Gerçek Müşteride, kapanmış işin gerçek parası **elle** girilir — bkz. 4.11.)

### 4.7 AI mesaj üretimi
Her mesaj türünü sistem yazar, kullanıcı gönderir: **ön mesaj · sunum sonrası mesaj · takip · itiraz cevabı.**
- Her firma için kişiselleştirilir (analiz verisinden beslenir).
- **İtiraz kategorileri:** pahalı / düşüneceğim / zamanım yok / rakiple çalışıyorum / ihtiyacım yok → AI o firmaya özel cevap üretir.
- **Gönderim kolaylığı:** hem salt "Kopyala" hem **`wa.me` linki** (numara+metin hazır açılır). Gönderimi yine kullanıcı yapar.

### 4.8 Sunum Editörü (tam kullanıcı kontrolü)
Sunum bir rapor değil, **ikna aracı**dır. Hikâye akışı: *aynayı tut → rakip önde → hasta/fırsat kaybı → çözüm → başlayalım* (fiyat/ROI yok). AI taslağı hazırlar; **son söz her öğede kullanıcıda** (AI yardımcı editör).

**İki katman:**
- **Şablon (bir kez ayarlanır):** varsayılan format, varsayılan açık bölümler, logo/renk/iletişim.
- **Her sunumda firmaya özel tam kontrol.**

**Format (kullanıcı seçer):** (A) HTML web sunum-link (açılma takibi var, önerilen) / (B) PDF / (C) ikisi.

**Editör kontrolleri:** her bölüm aç/kapat, sürükle-sırala, AI taslağını elle düzenle, yeniden üret, öğe sil, kendi özel bölümünü ekle, canlı önizleme. Sonra: Önizle → Onayla → Üret → mesajı al → **kullanıcı gönderir** (otomatik gönderim/kesinleştirme yok).

**Bölümler ve varsayılan durumu** (Fiyatlandırma bölümü kaldırıldı):
1. Kapak ✅
2. Mevcut durum (website skoru) ✅
3. Kayıp hesabı ✅ *(en vurucu ama agresif; kolay kapatılır)*
4. Rakip kıyası ✅
5. Çözüm & yapılacaklar ✅
6. Sonraki adım / CTA ✅
7. Neden biz / referans ⬜ *(varsayılan kapalı, uygunsa açılır)*

Hepsi her firmada tek tıkla aç/kapat.

### 4.9 CRM / Aktivite Geçmişi
- **CRM:** durum panosu (bkz. 3.2). Her `Kayıp` bir sebep taşır (→ ileride "neden kaybediyoruz" raporu).
- **Aktivite Geçmişi (firma defteri):** her firmada kronolojik günlük = sistem olayları (mesaj üretildi, durum değişti) + kullanıcının elle notları (aradım/konuştuk).

### 4.10 Takip Otomasyonu + Görev Kutusu
- **Kural bazlı sessizlik sayacı:** ön mesaj 3g→"takip at"; sunum 3g→"ara", 7g→"teklif hatırlat", 15g→"yeni kampanya". Süreler ayarlardan değişir (varsayılan 3/7/15).
- **Görev Kutusu:** tek ekran "bugünün işleri" = takip görevleri + deadline hatırlatmaları + elle eklenenler. Tamamla / ertele. (Otomasyon uyarılarının gittiği yer burasıdır.)

### 4.11 Gerçek Müşteri iş takibi
Firma buraya gelince kimlik değiştirir: satış kartı değil, iş kartı olur.
- **Çoklu iş satırı** (önce site, sonra SEO…). Her iş: durum (başlamadı/devam/bitti) + deadline + not.
- **Ödeme tamamen ELLE girilir:** kullanıcı anlaştığı fiyatı / aldığı ücreti / kalan alacağı kendi yazar. **Sistem bu rakamları asla üretmez, sadece saklar.**
- Deadline yaklaşınca Görev Kutusuna hatırlatma.

### 4.12 Kullanım / Bütçe göstergesi
Bu ay kaç sorgu/analiz harcandı + tavana ne kaldı. Sistemin masraf-kontrol felsefesini görünür kılar; tavan dolunca dur-sor.

---

## 5. Cache & kalıcılık ilkesi (çapraz-kesen)

Limit/maliyet harcayan **her** dış çağrı önce veritabanından kontrol edilir; veri varsa API'ye **hiç gidilmez.** Kapsam: Google Places keşif + place details, website analizi, Google Business analizi, rakip analizi, PageSpeed, AI metin/analiz üretimleri. Tüm sonuçlar DB'ye yazılır; firma/analiz tekrar açılınca yeniden API çağrısı yapılmaz. "Tazele" ancak kullanıcı elle isterse çalışır. Özet: **aynı veriyi iki kez satın alma.**

---

## 6. Teknoloji & mimari

Seçim kriteri: en sağlam + Claude'un en güvenilir/rahat ürettiği yığın.

| Katman | Seçim |
|---|---|
| Dil | **TypeScript** (tek dil, front+back) |
| Framework | **Next.js (App Router)** — frontend + backend API tek çatıda |
| UI | **Tailwind + shadcn/ui** (kanban, editör vb.) |
| DB + ORM | **PostgreSQL + Prisma** |
| Tarayıcı otomasyonu | **Playwright** — website analizi, rakip ekran görüntüsü, HTML→PDF sunum |
| Arka plan işleri | küçük **worker süreci + BullMQ (Redis)** — grid tarama + takip görevleri |
| AI | resmi **Anthropic TypeScript SDK** (`@anthropic-ai/sdk`); varsayılan model `claude-opus-4-8`, basit üretimlerde istenirse `claude-haiku-4-5` |
| Dış API | Google Places API (New), Google PageSpeed Insights API |

**Kurulum:** kullanıcının **VPS'i**; mevcut projenin **yanına paralel** — ayrı klasör + ayrı DB + subdomain + kendi süreçleri (Next uygulaması + worker). Uzun süren işler worker'da; Next arayüz + API için.

---

## 7. Veri modeli (özet — ana varlıklar)

- **Workspace/Folder** — kullanıcının klasör ağacı.
- **Search (segment)** — bir il/ilçe + sektör araması; sonuçları cache'lenir; klasöre bağlı.
- **Business (firma)** — place_id, ad, telefon, web, Google puanı/yorum, sosyal; kaba skor; durum; çalışma-listesinde-mi; kara-liste bayrağı.
- **Analysis** — bir firmaya ait derin analiz (website/GBP/rakip sonuçları, üretim tarihi → tazeleme için).
- **Message** — üretilen mesajlar (tür, metin, üretim tarihi).
- **Presentation** — sunum (format, bölüm konfigürasyonu, içerik, HTML/PDF çıktısı).
- **Activity (defter)** — firma bazlı kronolojik olay/not.
- **Task (görev)** — takip/deadline görevleri (Görev Kutusu).
- **Customer / Job / Payment** — gerçek müşteri, çoklu iş, elle ödeme kayıtları.
- **ServiceCatalog** — fiyatsız hizmet listesi.
- **ApiUsage** — sorgu/analiz sayaçları + tavan.

*(Kesin şema uygulama planında Prisma modeli olarak detaylandırılacak.)*

---

## 8. Kapsam dışı / ertelenen

- **Multi-tenant SaaS** → çıkarıldı (iç kullanım, tek kurulum).
- **Fiyatlandırma / tahmini ciro** → tamamen çıkarıldı (bkz. 4.6).
- **Öğrenen AI** (satışlardan otomatik öğrenme) → v1 için ertelendi.
- **Ajans Performans Merkezi** (detaylı raporlar) → tek kullanıcı için hafif tutulur / ertelenir.
- **Ekip/çok kullanıcı, satışçı ataması** → tek kullanıcı olduğu için yok.

---

## 9. Riskler (akılda tutulacak)

- **KVKK + İYS izni:** soğuk ticari mesaj Türkiye'de izne tabi. Elle gönderim riski azaltır; tasarımda basit "izinli mi" alanı düşünülebilir.
- **WhatsApp ban:** elle gönderimle azaltıldı (sistem asla otomatik atmaz).
- **Google quota:** adaptive grid + cache + sert sorgu tavanı ile kontrol altında.

---

## 10. GitHub / Sürüm kontrolü iş akışı

Proje baştan sona GitHub üzerinden, **kontrollü ve görünür** ilerleyecek. Amaç: her adımda ne yapıldığını tek diff ekranında görebilmek.

### 10.1 Repo bilgileri
- **GitHub hesabı:** `resulgunaydin` (gh CLI ile girişli)
- **Repo adı:** **`damga-panel`** (tireli) — bu ad kullanılacak.
  - Not: Eski bir `damgapanel` (tiresiz) reposu var ama **kullanılmayacak** (silme yetkisi olmadığı için duruyor, private/zararsız). Yeni her şey `damga-panel`'de.
- **Görünürlük:** **private**
- **Yerel klasör:** kullanıcının açacağı proje klasörü (temiz başlangıç)

### 10.2 İlk kurulum adımları (Claude sırayla yapar)
1. `git init -b main`
2. **`.gitignore`** (Next.js / TypeScript / Node / Prisma / Playwright / `.env`)
3. **`README.md`** (proje özeti, teknoloji, değişmez kurallar, kurulum)
4. Tasarım dokümanını `docs/` altına koy
5. **İlk commit**
6. `gh repo create damga-panel --private --source . --push`

### 10.3 Geliştirme iş akışı (her modül/iş için)
```
main (her zaman çalışır durumda)
  └─ feature/<modül-adı>   ← iş burada yazılır
       → Pull Request açılır
       → kullanıcı DIFF'i inceler
       → onaylarsa main'e merge → branch silinir
```
- Her iş kendi **feature branch**'inde (`feature/kesif-motoru`, `feature/kanban` …).
- İş bitince **Pull Request** açılır; kullanıcı incelemeden **main'e merge YOK**.
- **main'e doğrudan push YOK** (küçük doküman düzeltmeleri hariç, o da kullanıcı onayıyla).
- **Force push / geçmiş silme YOK.**

### 10.4 Commit kuralları
- Anlamlı, **Türkçe** commit mesajları; her commit tek bir mantıksal değişiklik.
- Commit mesajı sonuna: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 10.5 Issues & Milestones (uygulama planı buraya dökülür)
- Her modül/adım bir **Issue** (ör. "Veritabanı şeması", "Keşif motoru", "Kanban panosu").
- **Milestone**'lar = sürümler (v0.1, v0.2 …); Issue'lar milestone'lara gruplanır.
- Böylece "ne yapıldı, ne kaldı, sıradaki ne" panoda görünür.

### 10.6 Claude'un yetkisi ve sınırları
- **Yapar:** repo kurma, branch açma, commit, PR açma, Issue/Milestone oluşturma (gh CLI ile).
- **Yapmaz (kullanıcı onayı şart):** main'e merge, force push, repo silme, geçmiş değiştirme.

### 10.7 Fresh-start kontrol listesi
- [ ] Yeni proje klasörü oluştur
- [ ] Tasarım dokümanını (`docs/`) klasöre koy
- [ ] `git init` + `.gitignore` + `README.md`
- [ ] İlk commit
- [ ] `gh repo create damga-panel --private --source . --push`
- [ ] Uygulama planını **Issues + Milestone**'lara dök
- [ ] İlk modülün `feature/` branch'ini açıp koda başla

---

## 11. Sonraki adım

Bu doküman onaylandıktan sonra **uygulama planına** (adım adım, modül modül yapılacaklar; Prisma şeması, ekranlar, iş sırası) geçilecek ve plan **GitHub Issues + Milestone**'lara dökülecek (bkz. 10.5).
