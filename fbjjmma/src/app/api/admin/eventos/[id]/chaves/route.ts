import { NextRequest, NextResponse } from "next/server"
import { Belt, Sex, AgeGroup } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)

  const sexo = searchParams.get("sexo") || ""
  const categoria = searchParams.get("categoria") || ""
  const faixa = searchParams.get("faixa") || ""
  const pesoNome = searchParams.get("pesoNome") || ""
  const absoluto = searchParams.get("absoluto") === "1"

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  }

  const whereCategory: Record<string, unknown> = {}
  if (sexo) whereCategory.sex = sexo
  if (categoria) whereCategory.ageGroup = categoria
  if (pesoNome) whereCategory.name = { equals: pesoNome, mode: "insensitive" }

  const whereBracket: Record<string, unknown> = { eventId: id }
  if (faixa) whereBracket.belt = faixa
  if (absoluto) whereBracket.isAbsolute = true
  if (Object.keys(whereCategory).length > 0) whereBracket.weightCategory = whereCategory

  const brackets = await prisma.bracket.findMany({
    where: whereBracket,
    include: {
      weightCategory: true,
      positions: {
        include: {
          registration: {
            include: {
              athlete: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
              team: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      matches: {
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
    orderBy: { bracketNumber: "asc" },
  })

  return NextResponse.json(brackets)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
    }

    // Get all approved registrations with weight category info
    const registrations = await prisma.registration.findMany({
      where: { eventId: id, status: "APROVADO" },
      include: { weightCategory: true },
    })

    if (registrations.length === 0) {
      return NextResponse.json({ error: "Nenhuma inscrição aprovada encontrada." }, { status: 400 })
    }

    // Agrupamento de inscrições:
    // - Chave de peso: todas as inscrições, agrupadas por (weightCategoryId, belt)
    // - Chave de absoluto: apenas inscrições com isAbsolute = true, agrupadas por (sex, ageGroup, belt)
    // Uma mesma inscrição pode aparecer em ambos os grupos (peso + absoluto)
    const normalGroups = new Map<string, typeof registrations>()
    const absoluteGroups = new Map<string, typeof registrations>()

    for (const reg of registrations) {
      // Toda inscrição vai para a chave de peso
      if (reg.weightCategoryId) {
        const key = `${reg.weightCategoryId}::${reg.belt}`
        if (!normalGroups.has(key)) normalGroups.set(key, [])
        normalGroups.get(key)!.push(reg)
      }

      // Somente quem tem isAbsolute = true entra também na chave de absoluto
      if (reg.isAbsolute) {
        const key = `${reg.sex}::${reg.ageGroup}::${reg.belt}`
        if (!absoluteGroups.has(key)) absoluteGroups.set(key, [])
        absoluteGroups.get(key)!.push(reg)
      }
    }

    // Delete existing brackets for this event (regenerate) — order matters for FK constraints
    await prisma.match.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracketPosition.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracket.deleteMany({ where: { eventId: id } })

    const MAX_BRACKET_SIZE = 16 // acima disso, divide em 2 sub-chaves com grande final
    let bracketNumber = 1
    const createdBrackets: string[] = []

    // Cria uma ou duas sub-chaves para um grupo de inscrições.
    // Quando regs.length > MAX_BRACKET_SIZE, divide aleatoriamente em 2 partes
    // e marca ambas com o mesmo bracketGroupId para que, ao finalizarem,
    // uma grande final seja criada automaticamente.
    async function createBracketGroup(
      regs: typeof registrations,
      weightCategoryId: string,
      belt: Belt,
      isAbsolute: boolean,
    ) {
      const shuffled = [...regs].sort(() => Math.random() - 0.5)

      if (shuffled.length <= MAX_BRACKET_SIZE) {
        const bracket = await prisma.bracket.create({
          data: { eventId: id, weightCategoryId, belt, isAbsolute, bracketNumber: bracketNumber++ },
        })
        for (let i = 0; i < shuffled.length; i++) {
          await prisma.bracketPosition.create({
            data: { bracketId: bracket.id, position: i + 1, registrationId: shuffled[i].id },
          })
        }
        createdBrackets.push(bracket.id)
        return
      }

      // Divide em 2 sub-chaves: metade superior e metade inferior
      const half = Math.ceil(shuffled.length / 2)
      const groupA = shuffled.slice(0, half)
      const groupB = shuffled.slice(half)
      const bracketGroupId = `${id}-${weightCategoryId}-${belt}-${isAbsolute}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bA = await (prisma.bracket.create as any)({
        data: { eventId: id, weightCategoryId, belt, isAbsolute, bracketNumber: bracketNumber++, bracketGroupId },
      })
      for (let i = 0; i < groupA.length; i++) {
        await prisma.bracketPosition.create({
          data: { bracketId: bA.id, position: i + 1, registrationId: groupA[i].id },
        })
      }
      createdBrackets.push(bA.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bB = await (prisma.bracket.create as any)({
        data: { eventId: id, weightCategoryId, belt, isAbsolute, bracketNumber: bracketNumber++, bracketGroupId },
      })
      for (let i = 0; i < groupB.length; i++) {
        await prisma.bracketPosition.create({
          data: { bracketId: bB.id, position: i + 1, registrationId: groupB[i].id },
        })
      }
      createdBrackets.push(bB.id)
    }

    // Create normal brackets
    for (const [key, regs] of normalGroups) {
      const [weightCategoryId, belt] = key.split("::")
      await createBracketGroup(regs, weightCategoryId, belt as Belt, false)
    }

    // Create absolute brackets — one per (sex, ageGroup, belt)
    for (const [key, regs] of absoluteGroups) {
      const [sexStr, ageGroupStr, belt] = key.split("::")
      let weightCategoryId = regs.find(r => r.weightCategoryId)?.weightCategoryId
      if (!weightCategoryId) {
        const fallback = await prisma.weightCategory.findFirst({
          where: { sex: sexStr as Sex, ageGroup: ageGroupStr as AgeGroup },
        })
        if (!fallback) continue
        weightCategoryId = fallback.id
      }
      await createBracketGroup(regs, weightCategoryId, belt as Belt, true)
    }

    return NextResponse.json({ message: `${createdBrackets.length} chave(s) gerada(s).`, count: createdBrackets.length })
  } catch (error: unknown) {
    console.error("[CHAVES POST ERROR]", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao gerar chaves.", detail: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  try {
    await prisma.match.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracketPosition.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracket.deleteMany({ where: { eventId: id } })
    return NextResponse.json({ message: "Chaves removidas." })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao remover chaves.", detail: msg }, { status: 500 })
  }
}
