-- CreateEnum
CREATE TYPE "FunnelStage" AS ENUM ('ELEME', 'POTANSIYEL', 'MUSTERI');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('YENI', 'ON_MESAJ_GONDERILDI', 'ULASILAMADI', 'POTANSIYEL', 'SUNUM_YAPILDI', 'TEKLIF_YAPILDI', 'KAYIP', 'IS_DEVAM', 'IS_BITTI');

-- CreateEnum
CREATE TYPE "LossReason" AS ENUM ('ILGISIZ', 'FIYAT', 'RAKIBE_GITTI', 'IHTIYAC_YOK', 'ULASILAMADI');

-- CreateEnum
CREATE TYPE "AnalysisKind" AS ENUM ('WEBSITE', 'GOOGLE_BUSINESS', 'COMPETITOR');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('ON_MESAJ', 'SUNUM_SONRASI', 'TAKIP', 'ITIRAZ_CEVABI');

-- CreateEnum
CREATE TYPE "ObjectionCategory" AS ENUM ('PAHALI', 'DUSUNECEGIM', 'ZAMANIM_YOK', 'RAKIPLE_CALISIYORUM', 'IHTIYACIM_YOK');

-- CreateEnum
CREATE TYPE "PresentationFormat" AS ENUM ('HTML', 'PDF', 'IKISI');

-- CreateEnum
CREATE TYPE "PresentationStatus" AS ENUM ('TASLAK', 'URETILDI');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('TAKIP', 'DEADLINE', 'MANUEL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACIK', 'TAMAM', 'ERTELENDI');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('BASLAMADI', 'DEVAM', 'BITTI');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('SISTEM', 'NOT');

-- CreateEnum
CREATE TYPE "ApiUsageKind" AS ENUM ('PLACES_SEARCH', 'PLACE_DETAILS', 'WEBSITE_ANALYSIS', 'PAGESPEED', 'GBP_ANALYSIS', 'COMPETITOR_ANALYSIS', 'AI_MESSAGE', 'AI_ANALYSIS');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "sector" TEXT NOT NULL,
    "keywords" TEXT[],
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "gridState" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "searchId" TEXT,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googleRating" DOUBLE PRECISION,
    "googleReviews" INTEGER,
    "social" JSONB,
    "manualAdded" BOOLEAN NOT NULL DEFAULT false,
    "coarseScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "stage" "FunnelStage" NOT NULL DEFAULT 'ELEME',
    "status" "BusinessStatus" NOT NULL DEFAULT 'YENI',
    "lossReason" "LossReason",
    "inWorkList" BOOLEAN NOT NULL DEFAULT false,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "AnalysisKind" NOT NULL,
    "result" JSONB NOT NULL,
    "score" INTEGER,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "objectionCategory" "ObjectionCategory",
    "content" TEXT NOT NULL,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "format" "PresentationFormat" NOT NULL DEFAULT 'HTML',
    "sectionConfig" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "htmlOutput" TEXT,
    "pdfPath" TEXT,
    "status" "PresentationStatus" NOT NULL DEFAULT 'TASLAK',
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationTemplate" (
    "id" TEXT NOT NULL,
    "defaultFormat" "PresentationFormat" NOT NULL DEFAULT 'HTML',
    "defaultSections" JSONB NOT NULL,
    "logoUrl" TEXT,
    "brandColor" TEXT,
    "contact" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresentationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL DEFAULT 'SISTEM',
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "TaskKind" NOT NULL DEFAULT 'MANUEL',
    "status" "TaskStatus" NOT NULL DEFAULT 'ACIK',
    "dueAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "businessId" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'BASLAMADI',
    "deadline" TIMESTAMP(3),
    "note" TEXT,
    "agreedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "kind" "ApiUsageKind" NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Search_folderId_idx" ON "Search"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_placeId_key" ON "Business"("placeId");

-- CreateIndex
CREATE INDEX "Business_searchId_idx" ON "Business"("searchId");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE INDEX "Business_stage_idx" ON "Business"("stage");

-- CreateIndex
CREATE INDEX "Analysis_businessId_kind_idx" ON "Analysis"("businessId", "kind");

-- CreateIndex
CREATE INDEX "Message_businessId_idx" ON "Message"("businessId");

-- CreateIndex
CREATE INDEX "Presentation_businessId_idx" ON "Presentation"("businessId");

-- CreateIndex
CREATE INDEX "Activity_businessId_createdAt_idx" ON "Activity"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_businessId_idx" ON "Task"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_key" ON "Customer"("businessId");

-- CreateIndex
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");

-- CreateIndex
CREATE INDEX "Payment_jobId_idx" ON "Payment"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsage_kind_day_key" ON "ApiUsage"("kind", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
