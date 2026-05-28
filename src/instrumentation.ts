export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { Pool } = await import("pg")
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

  try {
    await pool.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS "pesoDoc" TEXT,
        ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true
    `)
    console.log("[instrumentation] colunas de events garantidas")
  } catch (e) {
    console.warn("[instrumentation] events ALTER falhou:", e)
  }

  try {
    await pool.query(`
      ALTER TABLE brackets
        ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)
    `)
    console.log("[instrumentation] colunas de brackets garantidas")
  } catch (e) {
    console.warn("[instrumentation] brackets ALTER falhou:", e)
  }

  try {
    await pool.query(`
      ALTER TABLE tatames
        ADD COLUMN IF NOT EXISTS "panelBracketIds" TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "panelUpdatedAt" TIMESTAMP(3)
    `)
    console.log("[instrumentation] colunas de tatames garantidas")
  } catch (e) {
    console.warn("[instrumentation] tatames ALTER falhou:", e)
  }

  await pool.end()
}
