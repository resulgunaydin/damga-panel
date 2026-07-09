-- Telefon-arama pivotu: soğuk temas artık telefon; ön mesaj → arama script'i;
-- yeni durumlar + Call/Appointment modelleri. Mevcut veri güvenle map edilir.

-- ── BusinessStatus enum'unu yeniden kur + eski değerleri map et ──────────────
ALTER TABLE "Business" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "BusinessStatus" RENAME TO "BusinessStatus_old";
CREATE TYPE "BusinessStatus" AS ENUM ('YENI', 'ARAMAYA_HAZIR', 'ARANDI_ULASILAMADI', 'SUNUM_GONDERILDI', 'RANDEVU', 'TEKLIF_YAPILDI', 'KAYIP', 'IS_DEVAM', 'IS_BITTI');
ALTER TABLE "Business" ALTER COLUMN "status" TYPE "BusinessStatus" USING (
  CASE "status"::text
    WHEN 'ON_MESAJ_GONDERILDI' THEN 'YENI'
    WHEN 'ULASILAMADI' THEN 'ARANDI_ULASILAMADI'
    WHEN 'POTANSIYEL' THEN 'SUNUM_GONDERILDI'
    WHEN 'SUNUM_YAPILDI' THEN 'SUNUM_GONDERILDI'
    ELSE "status"::text
  END::"BusinessStatus"
);
ALTER TABLE "Business" ALTER COLUMN "status" SET DEFAULT 'YENI';
DROP TYPE "BusinessStatus_old";

-- ── MessageKind: ON_MESAJ → ARAMA_SCRIPT ─────────────────────────────────────
ALTER TYPE "MessageKind" RENAME TO "MessageKind_old";
CREATE TYPE "MessageKind" AS ENUM ('ARAMA_SCRIPT', 'SUNUM_SONRASI', 'TAKIP', 'ITIRAZ_CEVABI');
ALTER TABLE "Message" ALTER COLUMN "kind" TYPE "MessageKind" USING (
  CASE "kind"::text WHEN 'ON_MESAJ' THEN 'ARAMA_SCRIPT' ELSE "kind"::text END::"MessageKind"
);
DROP TYPE "MessageKind_old";

-- ── Yeni enum'lar ────────────────────────────────────────────────────────────
CREATE TYPE "CallOutcome" AS ENUM ('ULASILDI_KABUL', 'ULASILDI_RET', 'ULASILAMADI', 'TEKRAR_ARA');
CREATE TYPE "AppointmentStatus" AS ENUM ('PLANLANDI', 'YAPILDI', 'IPTAL');

-- ── Business: arama kuyruğu alanları ─────────────────────────────────────────
ALTER TABLE "Business" ADD COLUMN "inCallList" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "nextCallAt" TIMESTAMP(3);
CREATE INDEX "Business_inCallList_idx" ON "Business"("inCallList");

-- ── Call ─────────────────────────────────────────────────────────────────────
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outcome" "CallOutcome" NOT NULL,
    "note" TEXT,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCallAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Call_businessId_calledAt_idx" ON "Call"("businessId", "calledAt");
ALTER TABLE "Call" ADD CONSTRAINT "Call_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Appointment ──────────────────────────────────────────────────────────────
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "note" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PLANLANDI',
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Appointment_businessId_idx" ON "Appointment"("businessId");
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
