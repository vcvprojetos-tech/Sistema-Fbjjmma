import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, ensureBracketDeletedAt } from "@/lib/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    await ensureBracketDeletedAt()
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, eventId: id, deletedAt: { not: null } },
    })
    if (!bracket) return NextResponse.json({ error: "Chave não encontrada na lixeira." }, { status: 404 })

    const restored = await prisma.bracket.update({
      where: { id: bracketId },
      data: { deletedAt: null },
      include: {
        weightCategory: true,
        positions: {
          include: {
            registration: {
              include: {
                athlete: { include: { user: { select: { id: true, name: true } } } },
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
    })

    return NextResponse.json(restored)
  } catch (error) {
    console.error("[BRACKET RESTAURAR ERROR]", error)
    return NextResponse.json({ error: "Erro ao restaurar chave." }, { status: 500 })
  }
}
