// Script de sincronização de schema — usado no deploy quando DATABASE_URL
// está no pm2 e não nos arquivos .env
const { Client } = require("pg")
const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

function findDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  // Tenta obter do pm2 (onde a DATABASE_URL fica quando configurada via ecosystem.config.js)
  try {
    const list = JSON.parse(
      execSync("pm2 jlist", { stdio: ["pipe", "pipe", "ignore"] }).toString()
    )
    const app = list.find((a) => a.name === "fbjjmma")
    if (app?.pm2_env?.DATABASE_URL) return app.pm2_env.DATABASE_URL
  } catch (_) {}

  // Tenta ecosystem.config.js em locais comuns
  const configPaths = [
    "./ecosystem.config.js",
    "../ecosystem.config.js",
    "./fbjjmma/ecosystem.config.js",
  ]
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

const dbUrl = findDatabaseUrl()
if (!dbUrl) {
  console.error("Erro: DATABASE_URL não encontrada em nenhuma fonte.")
  console.error("Fontes tentadas: variável de ambiente, pm2, ecosystem.config.js")
  process.exit(1)
}

const client = new Client({ connectionString: dbUrl })

async function main() {
  await client.connect()
  console.log("Conectado ao banco. Sincronizando schema...")

  const alterations = [
    `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "pesoDoc" TEXT`,
    `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "callTimes" JSONB`,
  ]

  for (const sql of alterations) {
    await client.query(sql)
    console.log("OK:", sql)
  }

  console.log("Schema sincronizado com sucesso.")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro ao sincronizar schema:", e.message)
    process.exit(1)
  })
  .finally(() => client.end().catch(() => {}))
