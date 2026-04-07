// @ts-nocheck
import { config } from "dotenv"
config()
import pkg from "@prisma/client"
const { PrismaClient, UserRole, Sex, Belt, AgeGroup } = pkg
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed...")

  // Tipo de evento
  const tipoJJ = await prisma.eventType.upsert({
    where: { name: "Jiu-Jitsu" },
    update: {},
    create: { name: "Jiu-Jitsu" },
  })
  console.log("✅ Tipo de evento criado: Jiu-Jitsu")

  // Usuário Presidente
  const senhaHash = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { cpf: "00000000000" },
    update: {},
    create: {
      name: "Rafael Torres",
      cpf: "00000000000",
      email: "admin@fbjjmma.com.br",
      password: senhaHash,
      phone: "71900000000",
      role: UserRole.PRESIDENTE,
      isActive: true,
      emailVerified: new Date(),
    },
  })
  console.log("✅ Usuário presidente criado: admin@fbjjmma.com.br / admin123")

  // Equipes iniciais
  const equipes = [
    "Alliance Jiu Jitsu", "CheckMat", "GF Team", "Gracie Barra",
    "Nova União", "RAIZ JIU JITSU", "Start Combat", "Team Kamui",
    "Team Passos", "Atrito Team", "Prayer Jiu Jitsu", "Nordeste Jiu Jitsu",
  ]
  for (const nome of equipes) {
    await prisma.team.upsert({
      where: { name: nome },
      update: {},
      create: { name: nome },
    })
  }
  console.log("✅ Equipes criadas")

  // Tabela de peso GI 2026
  const tabela = await prisma.weightTable.upsert({
    where: { name: "TABELA DE PESO 2026 - GI" },
    update: {},
    create: { name: "TABELA DE PESO 2026 - GI" },
  })

  // Pesos infantis (mesmo para M e F)
  const pesosInfantis = (list: { name: string; maxWeight: number; order: number }[], ag: AgeGroup) => [
    { ageGroup: ag, sex: Sex.MASCULINO, categorias: list },
    { ageGroup: ag, sex: Sex.FEMININO,  categorias: list },
  ]

  // Pesos adulto/master masculino
  const adultoM = [
    { name: "GALO",         maxWeight: 57.5,  order: 1 },
    { name: "PLUMA",        maxWeight: 64.0,  order: 2 },
    { name: "PENA",         maxWeight: 70.0,  order: 3 },
    { name: "LEVE",         maxWeight: 76.0,  order: 4 },
    { name: "MÉDIO",        maxWeight: 82.3,  order: 5 },
    { name: "MEIO PESADO",  maxWeight: 88.3,  order: 6 },
    { name: "PESADO",       maxWeight: 94.3,  order: 7 },
    { name: "SUPER PESADO", maxWeight: 100.5, order: 8 },
    { name: "PESADÍSSIMO",  maxWeight: 999,   order: 9 },
  ]
  // Pesos adulto/master feminino
  const adultoF = [
    { name: "GALO",         maxWeight: 48.5, order: 1 },
    { name: "PLUMA",        maxWeight: 53.0, order: 2 },
    { name: "PENA",         maxWeight: 58.5, order: 3 },
    { name: "LEVE",         maxWeight: 64.0, order: 4 },
    { name: "MÉDIO",        maxWeight: 69.0, order: 5 },
    { name: "MEIO PESADO",  maxWeight: 74.0, order: 6 },
    { name: "PESADO",       maxWeight: 79.3, order: 7 },
    { name: "SUPER PESADO", maxWeight: 84.3, order: 8 },
    { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
  ]
  // Pesos juvenil masculino
  const juvenilM = [
    { name: "GALO",         maxWeight: 53.5, order: 1 },
    { name: "PLUMA",        maxWeight: 58.5, order: 2 },
    { name: "PENA",         maxWeight: 64.0, order: 3 },
    { name: "LEVE",         maxWeight: 69.0, order: 4 },
    { name: "MÉDIO",        maxWeight: 74.0, order: 5 },
    { name: "MEIO PESADO",  maxWeight: 79.3, order: 6 },
    { name: "PESADO",       maxWeight: 84.3, order: 7 },
    { name: "SUPER PESADO", maxWeight: 89.3, order: 8 },
    { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
  ]
  // Pesos juvenil feminino
  const juvenilF = [
    { name: "GALO",         maxWeight: 44.3, order: 1 },
    { name: "PLUMA",        maxWeight: 48.3, order: 2 },
    { name: "PENA",         maxWeight: 52.5, order: 3 },
    { name: "LEVE",         maxWeight: 56.0, order: 4 },
    { name: "MÉDIO",        maxWeight: 60.5, order: 5 },
    { name: "MEIO PESADO",  maxWeight: 65.0, order: 6 },
    { name: "PESADO",       maxWeight: 69.0, order: 7 },
    { name: "SUPER PESADO", maxWeight: 73.0, order: 8 },
    { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
  ]

  // Categorias de peso
  const categorias = [
    // PRÉ MIRIM (4-5 anos) — M e F iguais, sem GALO
    ...pesosInfantis([
      { name: "PLUMA",        maxWeight: 14.7, order: 1 },
      { name: "PENA",         maxWeight: 18.0, order: 2 },
      { name: "LEVE",         maxWeight: 21.0, order: 3 },
      { name: "MÉDIO",        maxWeight: 24.0, order: 4 },
      { name: "MEIO PESADO",  maxWeight: 27.0, order: 5 },
      { name: "PESADO",       maxWeight: 30.0, order: 6 },
      { name: "SUPER PESADO", maxWeight: 33.0, order: 7 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 8 },
    ], AgeGroup.PRE_MIRIM),
    // MIRIM (6-7 anos) — M e F iguais
    ...pesosInfantis([
      { name: "GALO",         maxWeight: 18.0, order: 1 },
      { name: "PLUMA",        maxWeight: 20.0, order: 2 },
      { name: "PENA",         maxWeight: 23.0, order: 3 },
      { name: "LEVE",         maxWeight: 26.0, order: 4 },
      { name: "MÉDIO",        maxWeight: 29.3, order: 5 },
      { name: "MEIO PESADO",  maxWeight: 32.3, order: 6 },
      { name: "PESADO",       maxWeight: 35.5, order: 7 },
      { name: "SUPER PESADO", maxWeight: 38.5, order: 8 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
    ], AgeGroup.MIRIM),
    // INFANTIL A (8-9 anos) — M e F iguais
    ...pesosInfantis([
      { name: "GALO",         maxWeight: 23.0, order: 1 },
      { name: "PLUMA",        maxWeight: 26.0, order: 2 },
      { name: "PENA",         maxWeight: 29.3, order: 3 },
      { name: "LEVE",         maxWeight: 32.0, order: 4 },
      { name: "MÉDIO",        maxWeight: 35.5, order: 5 },
      { name: "MEIO PESADO",  maxWeight: 38.5, order: 6 },
      { name: "PESADO",       maxWeight: 41.7, order: 7 },
      { name: "SUPER PESADO", maxWeight: 44.7, order: 8 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
    ], AgeGroup.INFANTIL_A),
    // INFANTIL B (10-11 anos) — M e F iguais
    ...pesosInfantis([
      { name: "GALO",         maxWeight: 29.3, order: 1 },
      { name: "PLUMA",        maxWeight: 32.3, order: 2 },
      { name: "PENA",         maxWeight: 35.5, order: 3 },
      { name: "LEVE",         maxWeight: 38.0, order: 4 },
      { name: "MÉDIO",        maxWeight: 41.0, order: 5 },
      { name: "MEIO PESADO",  maxWeight: 44.0, order: 6 },
      { name: "PESADO",       maxWeight: 47.0, order: 7 },
      { name: "SUPER PESADO", maxWeight: 51.0, order: 8 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
    ], AgeGroup.INFANTIL_B),
    // INFANTO JUVENIL A (12-13 anos) — M e F iguais
    ...pesosInfantis([
      { name: "GALO",         maxWeight: 34.5, order: 1 },
      { name: "PLUMA",        maxWeight: 38.5, order: 2 },
      { name: "PENA",         maxWeight: 42.7, order: 3 },
      { name: "LEVE",         maxWeight: 46.0, order: 4 },
      { name: "MÉDIO",        maxWeight: 51.0, order: 5 },
      { name: "MEIO PESADO",  maxWeight: 55.0, order: 6 },
      { name: "PESADO",       maxWeight: 59.0, order: 7 },
      { name: "SUPER PESADO", maxWeight: 63.5, order: 8 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
    ], AgeGroup.INFANTO_JUVENIL_A),
    // INFANTO JUVENIL B (14-15 anos) — M e F iguais
    ...pesosInfantis([
      { name: "GALO",         maxWeight: 43.7, order: 1 },
      { name: "PLUMA",        maxWeight: 48.0, order: 2 },
      { name: "PENA",         maxWeight: 52.5, order: 3 },
      { name: "LEVE",         maxWeight: 56.0, order: 4 },
      { name: "MÉDIO",        maxWeight: 60.0, order: 5 },
      { name: "MEIO PESADO",  maxWeight: 65.0, order: 6 },
      { name: "PESADO",       maxWeight: 69.0, order: 7 },
      { name: "SUPER PESADO", maxWeight: 73.0, order: 8 },
      { name: "PESADÍSSIMO",  maxWeight: 999,  order: 9 },
    ], AgeGroup.INFANTO_JUVENIL_B),
    // JUVENIL (16-17 anos) — M e F diferentes
    { ageGroup: AgeGroup.JUVENIL, sex: Sex.MASCULINO, categorias: juvenilM },
    { ageGroup: AgeGroup.JUVENIL, sex: Sex.FEMININO,  categorias: juvenilF },
    // ADULTO
    { ageGroup: AgeGroup.ADULTO, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.ADULTO, sex: Sex.FEMININO,  categorias: adultoF },
    // MASTER 1 ao 6 — mesmos pesos do adulto
    { ageGroup: AgeGroup.MASTER_1, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_1, sex: Sex.FEMININO,  categorias: adultoF },
    { ageGroup: AgeGroup.MASTER_2, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_2, sex: Sex.FEMININO,  categorias: adultoF },
    { ageGroup: AgeGroup.MASTER_3, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_3, sex: Sex.FEMININO,  categorias: adultoF },
    { ageGroup: AgeGroup.MASTER_4, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_4, sex: Sex.FEMININO,  categorias: adultoF },
    { ageGroup: AgeGroup.MASTER_5, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_5, sex: Sex.FEMININO,  categorias: adultoF },
    { ageGroup: AgeGroup.MASTER_6, sex: Sex.MASCULINO, categorias: adultoM },
    { ageGroup: AgeGroup.MASTER_6, sex: Sex.FEMININO,  categorias: adultoF },
  ]

  for (const grupo of categorias) {
    for (const cat of grupo.categorias) {
      await prisma.weightCategory.upsert({
        where: {
          tableId_ageGroup_sex_name: {
            tableId: tabela.id,
            ageGroup: grupo.ageGroup,
            sex: grupo.sex,
            name: cat.name,
          },
        },
        update: { maxWeight: cat.maxWeight, order: cat.order },
        create: {
          tableId: tabela.id,
          ageGroup: grupo.ageGroup,
          sex: grupo.sex,
          name: cat.name,
          maxWeight: cat.maxWeight,
          order: cat.order,
        },
      })
    }
  }
  console.log("✅ Tabela de peso e categorias criadas")

  console.log("\n🎉 Seed concluído!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Login: admin@fbjjmma.com.br")
  console.log("Senha: admin123")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
