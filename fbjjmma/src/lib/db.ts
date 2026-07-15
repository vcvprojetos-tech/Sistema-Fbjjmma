import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pgPool: Pool
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

function getPgPool(): Pool {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString: process.env.DATABASE_URL! })
  }
  return globalForPrisma.pgPool
}

export { getPgPool }

// Mantidos por compatibilidade com chamadas existentes — migrations agora são feitas no deploy
export async function ensureBracketDeletedAt(): Promise<void> {}
export async function ensureEventIsActive(): Promise<void> {}

export default prisma
