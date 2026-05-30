-- AlterTable: adiciona campos de foto da balança para registrar desclassificação por peso
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "pesoPhoto1" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "pesoPhoto2" TEXT;
