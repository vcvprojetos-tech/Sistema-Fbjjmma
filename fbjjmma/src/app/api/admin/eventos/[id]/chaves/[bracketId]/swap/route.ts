import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    const { fromPosId, toPosId } = await req.json()

    if (!fromPosId || !toPosId || fromPosId === toPosId) {
      return NextResponse.json({ ok: true })
    }

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true, eventId: true, status: true },
    })

    if (!bracket || bracket.eventId !== id) {
      return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })
    }

    if (bracket.status !== "PENDENTE" && bracket.status !== "DESIGNADA") {
      return NextResponse.json(
        { error: "Não é possível trocar posições em uma chave já iniciada." },
        { status: 400 }
      )
    }

    const [posA, posB] = await Promise.all([
      prisma.bracketPosition.findFirst({ where: { id: fromPosId, bracketId } }),
      prisma.bracketPosition.findFirst({ where: { id: toPosId, bracketId } }),
    ])

    if (!posA) return NextResponse.json({ error: "Posição de origem não encontrada." }, { status: 404 })
    if (!posB) return NextResponse.json({ error: "Posição de destino não encontrada." }, { status: 404 })

    // Troca usando valor temporário negativo para contornar a constraint unique(bracketId, position)
    await prisma.$transaction([
      prisma.bracketPosition.update({ where: { id: fromPosId }, data: { position: -1 } }),
      prisma.bracketPosition.update({ where: { id: toPosId }, data: { position: posA.position } }),
      prisma.bracketPosition.update({ where: { id: fromPosId }, data: { position: posB.position } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[SWAP POSITION ERROR]", error)
    return NextResponse.json({ error: "Erro ao trocar posições." }, { status: 500 })
  }
}
