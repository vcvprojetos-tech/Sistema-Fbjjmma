-- AlterTable
ALTER TABLE "tatames" ADD COLUMN "panelBracketIds" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN "panelUpdatedAt" TIMESTAMP(3);
