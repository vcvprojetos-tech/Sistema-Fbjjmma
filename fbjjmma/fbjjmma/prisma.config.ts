import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Tenta carregar DATABASE_URL de múltiplos arquivos (ordem: .env.local > .env.production.local > .env)
config({ path: ".env.local" });
config({ path: ".env.production.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
