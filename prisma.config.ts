import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// Carrega variáveis de ambiente seguindo a ordem que o Next.js usa
config({ path: ".env" })
config({ path: ".env.local" })
config({ path: ".env.production" })
config({ path: ".env.production.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
