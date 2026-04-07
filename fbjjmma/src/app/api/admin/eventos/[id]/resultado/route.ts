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

  const sexo = searchParams.get("sexo") || ""
  const categoria = searchParams.get("categoria") || ""
  const faixa = searchParams.get("faixa") || ""
  const pesoId = searchParams.get("pesoId") || ""
  const equipeId = searchParams.get("equipeId") || ""

  const where: Record<string, unknown> = {
    eventId: id,
    status: "APROVADO",
  }

  if (sexo) where.sex = sexo
  if (faixa) where.belt = faixa
  if (pesoId) where.weightCategoryId = pesoId
  if (equipeId) where.teamId = equipeId
  if (categoria) where.ageGroup = categoria

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      athlete: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      team: { select: { id: true, name: true } },
      weightCategory: true,
    },
    orderBy: [{ weightCategoryId: "asc" }, { medal: "asc" }],
  })

  return NextResponse.json(registrations)
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
    const { results } = body

    if (!Array.isArray(results)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
    }

    for (const r of results) {
      await prisma.registration.update({
        where: { id: r.id },
        data: {
          medal: r.medal !== undefined ? r.medal || null : undefined,
          teamPoints: r.teamPoints !== undefined ? Boolean(r.teamPoints) : undefined,
          awarded: r.awarded !== undefined ? Boolean(r.awarded) : undefined,
          affiliated: r.affiliated !== undefined ? Boolean(r.affiliated) : undefined,
          pointDiff: r.pointDiff !== undefined ? Boolean(r.pointDiff) : undefined,
        },
      })
    }

    return NextResponse.json({ message: "Resultados salvos com sucesso." })
  } catch (error) {
    console.error("[RESULTADO PUT ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao salvar resultados." },
      { status: 500 }
    )
  }
}
