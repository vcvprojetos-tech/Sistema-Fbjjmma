import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tatameId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { tatameId } = await params

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
  return NextResponse.json(tatame)
}
