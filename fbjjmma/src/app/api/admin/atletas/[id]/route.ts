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

  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: {
      user: true,
      team: true,
      teamHistory: { include: { team: true }, orderBy: { startDate: "desc" } },
      registrations: {
        include: { event: true, weightCategory: true },
        orderBy: { registeredAt: "desc" },
        take: 10,
      },
    },
  })

  if (!athlete) {
    return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
  }

  return NextResponse.json(athlete)
}

export async function PUT(
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
      name,
      email,
      phone,
      birthDate,
      sex,
      belt,
      weight,
      teamId,
      professor,
      street,
      city,
      state,
      zipCode,
      isAffiliated,
      photo,
      isActive,
    } = body

    const athlete = await prisma.athlete.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!athlete) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
    }

    const [updatedAthlete] = await prisma.$transaction([
      prisma.athlete.update({
        where: { id },
        data: {
          birthDate: birthDate ? new Date(birthDate) : undefined,
          sex: sex || undefined,
          belt: belt || undefined,
          weight: weight !== undefined ? parseFloat(weight) : undefined,
          teamId: teamId !== undefined ? teamId || null : undefined,
          professor: professor !== undefined ? professor || null : undefined,
          street: street !== undefined ? street || null : undefined,
          city: city !== undefined ? city || null : undefined,
          state: state !== undefined ? state || null : undefined,
          zipCode: zipCode !== undefined ? zipCode || null : undefined,
          isAffiliated:
            isAffiliated !== undefined
              ? isAffiliated === true || isAffiliated === "true"
              : undefined,
          photo: photo !== undefined ? photo || null : undefined,
        },
        include: {
          user: { select: { id: true, name: true, cpf: true, isActive: true } },
          team: true,
        },
      }),
      prisma.user.update({
        where: { id: athlete.userId },
        data: {
          name: name || undefined,
          email: email || undefined,
          phone: phone !== undefined ? phone || null : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      }),
    ])

    return NextResponse.json(updatedAthlete)
  } catch (error) {
    console.error("[ATLETAS PUT ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao atualizar atleta." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!athlete) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: athlete.userId },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Atleta desativado." })
  } catch (error) {
    console.error("[ATLETAS DELETE ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao desativar atleta." },
      { status: 500 }
    )
  }
}
