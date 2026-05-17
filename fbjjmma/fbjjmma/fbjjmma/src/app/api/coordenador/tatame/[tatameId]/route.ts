import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isPanelVisible } from "@/lib/panel-visibility"

async function verificarAcesso(req: NextRequest, tatameId: string): Promise<boolean> {
  const session = await auth()
  if (session) return true
  const pin = req.headers.get("x-tatame-pin")
  if (!pin) return false
  const tatame = await prisma.tatame.findFirst({ where: { id: tatameId, pin } })
  return !!tatame
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tatameId: string }> }
) {
  const { tatameId } = await params

  if (!(await verificarAcesso(req, tatameId))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const tatame = await prisma.tatame.findUnique({
    where: { id: tatameId },
    include: {
      event: { select: { id: true, name: true, status: true } },
      brackets: {
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
              winner: { select: { id: true } },
            },
            orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
          },
        },
        orderBy: { bracketNumber: "asc" },
      },
      operations: {
        where: { endedAt: null },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  })

  if (!tatame) return NextResponse.json({ error: "Tatame não encontrado." }, { status: 404 })

  return NextResponse.json({
    ...tatame,
    brackets: tatame.brackets.map(b => ({
      ...b,
      inPanel: isPanelVisible(tatameId, b.id),
    })),
  })
}

// Coordenador desconecta: encerra a operação ativa
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tatameId: string }> }
) {
  const { tatameId } = await params
  const pin = req.headers.get("x-tatame-pin")

  if (!pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const tatame = await prisma.tatame.findFirst({ where: { id: tatameId, pin } })
  if (!tatame) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  await prisma.tatameOperation.updateMany({
    where: { tatameId, endedAt: null },
    data: { endedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
