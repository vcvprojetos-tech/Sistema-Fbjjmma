import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tatameId: string }> }
) {
  const { tatameId } = await params
  const pin = req.headers.get("x-tatame-pin")

  if (!pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const tatame = await prisma.tatame.findFirst({ where: { id: tatameId, pin } })
  if (!tatame) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma.tatameOperation as any).updateMany({
    where: { tatameId, endedAt: null },
    data: { lastHeartbeat: now },
  })

  // Se não há sessão ativa, reabre a mais recente fechada nos últimos 5 minutos.
  // Cobre reloads acidentais, reinício do servidor e beforeunload tardio sem bloquear
  // a lógica de reconexão do entrar/route.ts (que exclui o próprio tatame da checagem).
  if (updated.count === 0) {
    const recentlyClosed = new Date(Date.now() - 5 * 60 * 1000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastOp = await (prisma.tatameOperation as any).findFirst({
      where: { tatameId, endedAt: { gte: recentlyClosed } },
      orderBy: { endedAt: "desc" },
    })
    if (lastOp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.tatameOperation as any).update({
        where: { id: lastOp.id },
        data: { endedAt: null, lastHeartbeat: now },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
