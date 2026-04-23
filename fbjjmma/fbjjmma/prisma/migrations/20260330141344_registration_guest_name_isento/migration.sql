-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ISENTO';

-- DropForeignKey
ALTER TABLE "registrations" DROP CONSTRAINT "registrations_athleteId_fkey";

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "athleteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
