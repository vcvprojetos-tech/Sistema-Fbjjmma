import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const tatames = await prisma.tatame.findMany({
    where: { eventId: id, isActive: true },
    include: {
      brackets: {
        select: { id: true, bracketNumber: true, status: true, weightCategory: true, belt: true, isAbsolute: true },
        orderBy: { bracketNumber: "asc" },
      },
      operations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { endedAt: null, lastHeartbeat: { gte: new Date(Date.now() - 3 * 60 * 1000) } } as any,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(tatames)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const { name } = body
    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 })

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

    const pin = String(Math.floor(1000 + Math.random() * 9000))

    const tatame = await prisma.tatame.create({
      data: { eventId: id, name: name.trim(), pin },
    })

    return NextResponse.json(tatame, { status: 201 })
  } catch (error) {
    console.error("[TATAMES POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao criar tatame." }, { status: 500 })
  }
}
