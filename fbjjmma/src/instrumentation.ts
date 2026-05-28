export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  let pool: import("pg").Pool | undefined
  try {
    const { Pool } = await import("pg")
    pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    await pool.query('ALTER TABLE brackets ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)')
    console.log("[instrumentation] coluna deletedAt garantida em brackets")
  } catch (e) {
    console.warn("[instrumentation] não foi possível garantir coluna deletedAt:", e)
  } finally {
    if (pool) await pool.end().catch(() => {})
  }
}
