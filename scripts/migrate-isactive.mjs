// Script de migração: adiciona coluna isActive na tabela events via pg direto
import { createRequire } from "module"
const require = createRequire(import.meta.url)

// Tenta carregar dotenv se disponível
try { require("dotenv").config() } catch {}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL não definido, pulando migration")
  process.exit(0)
}

let pg
try { pg = require("pg") } catch { pg = (await import("pg")).default }

const pool = new pg.Pool({ connectionString })
try {
  await pool.query(`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`)
  console.log("isActive: coluna criada/confirmada com sucesso")
} catch (e) {
  console.error("isActive migration error:", e.message)
} finally {
  await pool.end()
}
