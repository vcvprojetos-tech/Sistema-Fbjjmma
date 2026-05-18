-- AlterEnum
ALTER TYPE "WOType" ADD VALUE 'DESCLASSIFICACAO';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "woReason" TEXT;
