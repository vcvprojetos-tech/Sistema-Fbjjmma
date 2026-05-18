import { NextRequest, NextResponse } from "next/server"
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

  const nome = searchParams.get("nome") || ""
  const sexo = searchParams.get("sexo") || ""
  const categoria = searchParams.get("categoria") || ""
  const faixa = searchParams.get("faixa") || ""
  const pesoNome = searchParams.get("pesoNome") || ""
  const equipeId = searchParams.get("equipeId") || ""
  const status = searchParams.get("status") || ""
  const absoluto = searchParams.get("absoluto") === "1"
  const trash = searchParams.get("trash") === "1"

  const where: Record<string, unknown> = { eventId: id }

  if (sexo) where.sex = sexo
  if (faixa) where.belt = faixa
  if (equipeId) where.teamId = equipeId
  if (status) where.status = status
  if (categoria) where.ageGroup = categoria
  if (absoluto) where.isAbsolute = true
  if (pesoNome) where.weightCategory = { name: { equals: pesoNome, mode: "insensitive" } }

  if (nome) {
    where.OR = [
      { athlete: { user: { name: { contains: nome, mode: "insensitive" } } } },
      { guestName: { contains: nome, mode: "insensitive" } },
    ]
  }

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      athlete: {
        include: {
          user: { select: { id: true, name: true, cpf: true } },
        },
      },
      team: { select: { id: true, name: true } },
      weightCategory: true,
    },
    orderBy: { registeredAt: "desc" },
  })

  const result = trash
    ? registrations.filter((r: { status: string }) => r.status === "CANCELADO")
    : registrations.filter((r: { status: string }) => r.status !== "CANCELADO" || status === "CANCELADO")

  return NextResponse.json(result)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const {
      athleteId,
      guestName,
      sex,
      ageGroup,
      belt,
      weightCategoryId,
      teamId,
      professor,
      isAbsolute,
      status,
      paymentMethod,
      observation,
      medal,
    } = body

    if (!athleteId && !guestName) {
      return NextResponse.json({ error: "Informe um atleta ou nome do convidado." }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
    }

    if (athleteId) {
      const existing = await prisma.registration.findFirst({
        where: { eventId: id, athleteId, isAbsolute: Boolean(isAbsolute) },
      })
      if (existing) {
        return NextResponse.json(
          { error: "Atleta já inscrito nesta categoria." },
          { status: 400 }
        )
      }
    }

    const registration = await prisma.registration.create({
      data: {
        eventId: id,
        athleteId: athleteId || null,
        guestName: !athleteId ? (guestName || null) : null,
        sex,
        ageGroup,
        belt,
        weightCategoryId,
        teamId: teamId || null,
        professor: professor || null,
        isAbsolute: Boolean(isAbsolute),
        status: status || "PENDENTE",
        paymentMethod: paymentMethod || null,
        observation: observation || null,
        medal: medal || null,
      },
      include: {
        athlete: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        team: true,
        weightCategory: true,
      },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (error: unknown) {
    console.error("[EVENTO ATLETAS POST ERROR]", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Erro ao inscrever atleta.", detail: msg },
      { status: 500 }
    )
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
    // Remove all brackets first (FK constraints)
    await prisma.match.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracketPosition.deleteMany({ where: { bracket: { eventId: id } } })
    await prisma.bracket.deleteMany({ where: { eventId: id } })

    // Delete all registrations for this event
    const { count } = await prisma.registration.deleteMany({ where: { eventId: id } })

    return NextResponse.json({ message: `${count} inscrição(ões) removida(s).`, count })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao excluir atletas.", detail: msg }, { status: 500 })
  }
}
