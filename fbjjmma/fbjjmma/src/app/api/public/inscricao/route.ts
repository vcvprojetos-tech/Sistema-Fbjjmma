import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { athlete: true },
  })

  if (!user?.athlete) {
    return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
  }

  const where = {
    athleteId: user.athlete.id,
    ...(eventId ? { eventId } : {}),
  }

  const registrations = await prisma.registration.findMany({
    where,
    orderBy: { registeredAt: "desc" },
    include: {
      event: { select: { id: true, name: true, date: true, city: true, state: true, status: true, value: true } },
      weightCategory: { select: { name: true, maxWeight: true, ageGroup: true, sex: true } },
      team: { select: { name: true } },
    },
  })

  return NextResponse.json(registrations)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { eventId, ageGroup, belt, weightCategoryId, isAbsolute, acceptedTerms } = body

    if (!eventId || !ageGroup || !belt || !weightCategoryId) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 })
    }

    if (!acceptedTerms) {
      return NextResponse.json({ error: "Você deve aceitar os termos." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { athlete: { include: { team: true } } },
    })

    if (!user?.athlete) {
      return NextResponse.json({ error: "Perfil de atleta não encontrado. Contate a federação." }, { status: 400 })
    }

    // Verify event is open
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, registrationOpen: true },
    })

    if (!event) {
      return NextResponse.json({ error: "Inscrições não estão abertas para este evento." }, { status: 400 })
    }

    // Check deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return NextResponse.json({ error: "Prazo de inscrição encerrado." }, { status: 400 })
    }

    // Check duplicate (non-absolute)
    const existing = await prisma.registration.findFirst({
      where: { eventId, athleteId: user.athlete.id, isAbsolute: false },
    })
    if (existing) {
      return NextResponse.json({ error: "Você já está inscrito neste evento." }, { status: 400 })
    }

    // Check duplicate absolute
    if (isAbsolute) {
      const existingAbsolute = await prisma.registration.findFirst({
        where: { eventId, athleteId: user.athlete.id, isAbsolute: true },
      })
      if (existingAbsolute) {
        return NextResponse.json({ error: "Você já está inscrito no absoluto deste evento." }, { status: 400 })
      }
    }

    // Verify weight category belongs to event's weight table
    const weightCategory = await prisma.weightCategory.findUnique({
      where: { id: weightCategoryId },
    })

    if (!weightCategory) {
      return NextResponse.json({ error: "Categoria de peso inválida." }, { status: 400 })
    }

    const registration = await prisma.registration.create({
      data: {
        eventId,
        athleteId: user.athlete.id,
        teamId: user.athlete.teamId || null,
        professor: user.athlete.professor || null,
        sex: user.athlete.sex,
        ageGroup,
        belt,
        weightCategoryId,
        isAbsolute: Boolean(isAbsolute),
        affiliated: user.athlete.isAffiliated,
      },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    console.error("[INSCRICAO POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao realizar inscrição." }, { status: 500 })
  }
}
