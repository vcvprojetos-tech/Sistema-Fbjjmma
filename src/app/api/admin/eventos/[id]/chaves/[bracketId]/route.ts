import { NextRequest, NextResponse } from "next/server"
import { BracketStatus } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, eventId: id },
    include: {
      weightCategory: true,
      tatame: true,
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
        include: {
          position1: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { id: true, name: true } } } },
                  team: { select: { id: true, name: true } },
                },
              },
            },
          },
          position2: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { id: true, name: true } } } },
                  team: { select: { id: true, name: true } },
                },
              },
            },
          },
          winner: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { id: true, name: true } } } },
                  team: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  })

  if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })
  return NextResponse.json(bracket)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    const body = await req.json()
    const { tatameId, status } = body

    const bracket = await prisma.bracket.findFirst({ where: { id: bracketId, eventId: id } })
    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })

    const updated = await prisma.bracket.update({
      where: { id: bracketId },
      data: {
        ...(tatameId !== undefined && { tatameId: tatameId || null }),
        ...(status !== undefined && { status: status as BracketStatus }),
      },
    })

    // Notify affected tatame(s) so coordinator screens update instantly
    if (tatameId) notifyTatame(tatameId)
    if (bracket.tatameId && bracket.tatameId !== tatameId) notifyTatame(bracket.tatameId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[BRACKET PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar chave." }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    const bracket = await prisma.bracket.findFirst({ where: { id: bracketId, eventId: id } })
    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })

    await prisma.match.deleteMany({ where: { bracketId } })
    await prisma.bracketPosition.deleteMany({ where: { bracketId } })
    await prisma.bracket.delete({ where: { id: bracketId } })

    if (bracket.tatameId) notifyTatame(bracket.tatameId)

    return NextResponse.json({ message: "Chave removida." })
  } catch (error) {
    console.error("[BRACKET DELETE ERROR]", error)
    return NextResponse.json({ error: "Erro ao remover chave." }, { status: 500 })
  }
}
