import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"
import { Belt, Sex, AgeGroup } from "@prisma/client"

const BELT_MAP: Record<string, Belt> = {
  "BRANCA": "BRANCA",
  "BRANCA/COLORIDA": "BRANCA",
  "BRANCA/CINZA": "BRANCA",
  "AMARELA/LARANJA/VERDE": "AMARELA_LARANJA_VERDE",
  "AMARELA": "AMARELA_LARANJA_VERDE",
  "AZUL": "AZUL",
  "ROXA": "ROXA",
  "MARROM": "MARROM",
  "PRETA": "PRETA",
}

function mapSex(sexo: string): Sex | null {
  const s = sexo.trim().toUpperCase()
  if (s === "MASCULINO") return "MASCULINO"
  if (s === "FEMININO") return "FEMININO"
  return null
}

function mapBelt(faixa: string): Belt | null {
  return BELT_MAP[faixa.trim().toUpperCase()] ?? null
}

function mapAgeGroup(categoria: string): AgeGroup | null {
  const c = categoria.toUpperCase()
  if (/4\s*(E|A)\s*5/.test(c)) return "PRE_MIRIM"
  if (/6\s*(E|A)\s*7/.test(c)) return "MIRIM"
  if (/8\s*(E|A)\s*9/.test(c)) return "INFANTIL_A"
  if (/10\s*(E|A)\s*11/.test(c)) return "INFANTIL_B"
  if (/12\s*(E|A)\s*13/.test(c)) return "INFANTO_JUVENIL_A"
  if (/14\s*(E|A)\s*15/.test(c)) return "INFANTO_JUVENIL_B"
  if (/16\s*(E|A)\s*17/.test(c)) return "JUVENIL"
  if (/18\s*A\s*29/.test(c)) return "ADULTO"
  if (/30\s*A\s*35/.test(c)) return "MASTER_1"
  if (/36\s*A\s*40/.test(c)) return "MASTER_2"
  if (/41\s*A\s*45/.test(c)) return "MASTER_3"
  if (/46\s*A\s*50/.test(c)) return "MASTER_4"
  if (/51\s*A\s*55/.test(c)) return "MASTER_5"
  if (/56/.test(c)) return "MASTER_6"
  return null
}

function parseWeight(pesoText: string): number | null {
  const normalized = pesoText.replace(",", ".")
  const match = normalized.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : null
}

function isPesadissimo(pesoText: string): boolean {
  const p = pesoText.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return p.startsWith("+") || p.includes("ACIMA") || p.includes("PESADISSIMO") || p.includes("PESADISSIMO")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    include: { weightTable: { include: { categories: true } } },
  })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })

  const results: { nome: string; status: "ok" | "ignorado" | "erro"; motivo?: string }[] = []

  for (const row of rows) {
    const nome = String(row["Nome"] || "").trim()
    if (!nome) continue

    const sexoRaw = String(row["Sexo"] || "").trim()
    const categoriaRaw = String(row["Categoria"] || "").trim()
    const faixaRaw = String(row["Faixa"] || "").trim()
    const pesoRaw = String(row["Peso"] || "").trim()
    const equipeRaw = String(row["Equipe"] || "").trim()
    const absoluteRaw = String(row["Absoluto"] || "").trim().toUpperCase()
    const statusRaw = String(row["Status"] || "").trim().toUpperCase()

    if (statusRaw !== "APROVADO") {
      results.push({ nome, status: "ignorado", motivo: `Status: ${row["Status"] || "vazio"}` })
      continue
    }

    const sex = mapSex(sexoRaw)
    if (!sex) { results.push({ nome, status: "erro", motivo: `Sexo inválido: "${sexoRaw}"` }); continue }

    const ageGroup = mapAgeGroup(categoriaRaw)
    if (!ageGroup) { results.push({ nome, status: "erro", motivo: `Categoria não reconhecida: "${categoriaRaw}"` }); continue }

    const belt = mapBelt(faixaRaw)
    if (!belt) { results.push({ nome, status: "erro", motivo: `Faixa não reconhecida: "${faixaRaw}"` }); continue }

    const categoriesForGroup = event.weightTable.categories.filter(
      (c) => c.sex === sex && c.ageGroup === ageGroup
    )

    let weightCategory: typeof categoriesForGroup[0] | undefined

    if (isPesadissimo(pesoRaw)) {
      // Pesadíssimo = categoria com maior maxWeight do grupo
      weightCategory = categoriesForGroup.reduce<typeof categoriesForGroup[0] | undefined>(
        (best, c) => (!best || c.maxWeight > best.maxWeight ? c : best),
        undefined
      )
    } else {
      const maxWeight = parseWeight(pesoRaw)
      if (!maxWeight) { results.push({ nome, status: "erro", motivo: `Peso não reconhecido: "${pesoRaw}"` }); continue }
      weightCategory = categoriesForGroup.find((c) => Math.abs(c.maxWeight - maxWeight) < 1)
    }

    if (!weightCategory) {
      results.push({ nome, status: "erro", motivo: `Categoria de peso não encontrada: ${sex} / ${ageGroup} / "${pesoRaw}"` })
      continue
    }

    // Find or create team
    let team = null
    if (equipeRaw) {
      team = await prisma.team.findFirst({ where: { name: { equals: equipeRaw, mode: "insensitive" } } })
      if (!team) {
        team = await prisma.team.create({ data: { name: equipeRaw } })
      }
    }

    try {
      const participaAbsoluto = absoluteRaw === "SIM"

      // Uma única inscrição por atleta; isAbsolute = true indica que também entra no absoluto
      const existing = await prisma.registration.findFirst({
        where: { eventId: id, guestName: nome, weightCategoryId: weightCategory.id },
      })
      if (!existing) {
        await prisma.registration.create({
          data: {
            eventId: id,
            guestName: nome,
            teamId: team?.id ?? null,
            sex,
            ageGroup,
            belt,
            weightCategoryId: weightCategory.id,
            isAbsolute: participaAbsoluto,
            status: "APROVADO",
          },
        })
      } else if (participaAbsoluto && !existing.isAbsolute) {
        // Atualiza se a planilha indicar absoluto e a inscrição ainda não tiver essa flag
        await prisma.registration.update({
          where: { id: existing.id },
          data: { isAbsolute: true },
        })
      }

      results.push({ nome, status: "ok" })
    } catch (e) {
      results.push({ nome, status: "erro", motivo: String(e) })
    }
  }

  const importados = results.filter((r) => r.status === "ok").length
  const ignorados = results.filter((r) => r.status === "ignorado")
  const erros = results.filter((r) => r.status === "erro")

  return NextResponse.json({ total: rows.length, importados, ignorados, erros })
}
