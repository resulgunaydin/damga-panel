-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "themeId" TEXT;

-- AlterTable
ALTER TABLE "PresentationTemplate" ADD COLUMN     "agencyName" TEXT,
ADD COLUMN     "defaultThemeId" TEXT,
ADD COLUMN     "website" TEXT;
