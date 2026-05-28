import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pgPool: Pool
  bracketDeletedAtEnsured: boolean
  eventIsActiveEnsured: boolean
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Pool pg singleton para queries raw (ex: migrations inline)
function getPgPool(): Pool {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString: process.env.DATABASE_URL! })
  }
  return globalForPrisma.pgPool
}

// Garante que a coluna deletedAt existe na tabela brackets (idempotente)
export async function ensureBracketDeletedAt(): Promise<void> {
  if (globalForPrisma.bracketDeletedAtEnsured) return
  try {
    const pool = getPgPool()
    await pool.query('ALTER TABLE brackets ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)')
    globalForPrisma.bracketDeletedAtEnsured = true
  } catch {
    // falha silenciosa — a coluna pode já existir ou o banco não estar acessível ainda
  }
}

// Garante que a coluna isActive existe na tabela events (idempotente)
export async function ensureEventIsActive(): Promise<void> {
  if (globalForPrisma.eventIsActiveEnsured) return
  try {
    const pool = getPgPool()
    await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true')
    globalForPrisma.eventIsActiveEnsured = true
  } catch {
    // falha silenciosa — a coluna pode já existir ou o banco não estar acessível ainda
  }
}

export default prisma
