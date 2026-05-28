import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pgPool: Pool
  allColumnsEnsured: boolean
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

// Garante todas as colunas adicionadas por migrations que podem ter falhado no deploy
export async function ensureAllColumns(): Promise<void> {
  if (globalForPrisma.allColumnsEnsured) return
  const pool = getPgPool()

  try {
    await pool.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS "pesoDoc" TEXT,
        ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true
    `)
  } catch (e) {
    console.warn("[db] events ALTER falhou:", e)
  }

  try {
    await pool.query(`
      ALTER TABLE brackets
        ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)
    `)
  } catch (e) {
    console.warn("[db] brackets ALTER falhou:", e)
  }

  try {
    await pool.query(`
      ALTER TABLE tatames
        ADD COLUMN IF NOT EXISTS "panelBracketIds" TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "panelUpdatedAt" TIMESTAMP(3)
    `)
  } catch (e) {
    console.warn("[db] tatames ALTER falhou:", e)
  }

  globalForPrisma.allColumnsEnsured = true
}

// Aliases mantidos para compatibilidade com chamadas existentes
export async function ensureBracketDeletedAt(): Promise<void> {
  await ensureAllColumns()
}

export async function ensureEventIsActive(): Promise<void> {
  await ensureAllColumns()
}

export default prisma
