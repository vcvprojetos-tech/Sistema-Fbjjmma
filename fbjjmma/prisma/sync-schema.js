// Script de sincronização de schema — usado no deploy
// Tenta via pg client; se falhar por permissão, usa sudo -u postgres psql
const { Client } = require("pg")
const { execSync, spawnSync } = require("child_process")
const path = require("path")
const fs = require("fs")

function findDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  try {
    const list = JSON.parse(
      execSync("pm2 jlist", { stdio: ["pipe", "pipe", "ignore"] }).toString()
    )
    const app = list.find((a) => a.name === "fbjjmma")
    if (app?.pm2_env?.DATABASE_URL) return app.pm2_env.DATABASE_URL
  } catch (_) {}

  const configPaths = ["./ecosystem.config.js", "../ecosystem.config.js"]
  for (const p of configPaths) {
    try {
      const full = path.resolve(p)
      if (fs.existsSync(full)) {
        const cfg = require(full)
        const a = Array.isArray(cfg.apps) ? cfg.apps[0] : null
        const url =
          a?.env?.DATABASE_URL ||
          a?.env_production?.DATABASE_URL ||
          a?.env_development?.DATABASE_URL
        if (url) return url
      }
    } catch (_) {}
  }

  return null
}

const alterations = [
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "pesoDoc" TEXT`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "callTimes" JSONB`,
]

async function syncViaPgClient(dbUrl) {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    for (const sql of alterations) {
      await client.query(sql)
      console.log("OK:", sql)
    }
  } finally {
    await client.end().catch(() => {})
  }
}

function syncViaSudoPsql(dbUrl) {
  const url = new URL(dbUrl)
  const dbName = url.pathname.slice(1)
  const sql = alterations.join("; ") + ";"

  console.log(`Tentando sudo -u postgres psql -d ${dbName} ...`)
  const result = spawnSync(
    "sudo",
    ["-n", "-u", "postgres", "psql", "-d", dbName, "-c", sql],
    { stdio: "inherit" }
  )

  if (result.status !== 0) {
    throw new Error(
      `sudo psql falhou (código ${result.status}). ` +
        `Execute manualmente:\n  sudo -u postgres psql -d ${dbName} -c "${sql}"`
    )
  }
}

async function main() {
  const dbUrl = findDatabaseUrl()
  if (!dbUrl) {
    console.warn("⚠  DATABASE_URL não encontrada — sync de schema ignorado.")
    return
  }

  console.log("Conectado ao banco. Sincronizando schema...")

  try {
    await syncViaPgClient(dbUrl)
    console.log("Schema sincronizado via pg client.")
  } catch (e) {
    if (e.message.includes("owner") || e.message.includes("permission denied")) {
      console.warn("Usuário sem permissão DDL. Tentando sudo psql...")
      syncViaSudoPsql(dbUrl)
      console.log("Schema sincronizado via sudo psql.")
    } else {
      throw e
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro ao sincronizar schema:", e.message)
    process.exit(1)
  })
