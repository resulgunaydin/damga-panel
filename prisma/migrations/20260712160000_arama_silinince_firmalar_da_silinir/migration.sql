-- Arama silinince bağlı firmalar da silinsin (SetNull → Cascade).
-- SetNull'da firmalar searchId=null ile öksüz kalıyordu: segment listesi onları
-- göstermiyor ama placeId dedup'ı "zaten var" sayıp yeniden taramada atlıyordu.
-- Sonuç: silinen alan yeniden taranınca o firmalar bir daha asla çıkmıyordu.
ALTER TABLE "Business" DROP CONSTRAINT "Business_searchId_fkey";

ALTER TABLE "Business" ADD CONSTRAINT "Business_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
