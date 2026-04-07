import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// POST: Verify tatame PIN and start operation session
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const body = await req.json()
    const { pin } = body

    if (!pin) return NextResponse.json({ error: "PIN obrigatório." }, { status: 400 })

    const tatame = await prisma.tatame.findFirst({
      where: { pin: String(pin), isActive: true },
      include: { event: { select: { id: true, name: true, status: true } } },
    })

    if (!tatame) return NextResponse.json({ error: "PIN inválido ou tatame inativo." }, { status: 404 })

    // Close any previous open operations by this user
    await prisma.tatameOperation.updateMany({
      where: { userId: session.user.id, endedAt: null },
      data: { endedAt: new Date() },
    })

    // Create new operation
    const operation = await prisma.tatameOperation.create({
      data: { tatameId: tatame.id, userId: session.user.id },
    })

    return NextResponse.json({ tatameId: tatame.id, tatameName: tatame.name, event: tatame.event, operationId: operation.id })
  } catch (error) {
    console.error("[PIN POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao verificar PIN." }, { status: 500 })
  }
}
