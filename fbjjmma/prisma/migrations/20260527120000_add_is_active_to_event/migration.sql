-- AlterTable: adiciona campo isActive em events com default true
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
