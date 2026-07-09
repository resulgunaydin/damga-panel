-- Google Takvim entegrasyonu kaldırıldı: Appointment.googleEventId sütunu düşürülür.
-- Randevular artık uygulama içi takvimde + Görev Kutusu hatırlatmasıyla yönetilir.
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "googleEventId";
