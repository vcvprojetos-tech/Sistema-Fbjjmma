import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      cpf: true,
      email: true,
      phone: true,
      isActive: true,
      athlete: {
        include: {
          team: { select: { id: true, name: true } },
          registrations: {
            orderBy: { registeredAt: "desc" },
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  city: true,
                  state: true,
                  status: true,
                },
              },
              weightCategory: {
                select: { name: true, maxWeight: true, ageGroup: true, sex: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { phone, professor, street, city, state, zipCode } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { athlete: true },
    })

    if (!user?.athlete) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { phone: phone || null },
      }),
      prisma.athlete.update({
        where: { id: user.athlete.id },
        data: {
          professor: professor || null,
          street: street || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
        },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 })
  }
}
