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
  await (prisma.tatameOperation as any).updateMany({
    where: { tatameId, endedAt: null },
    data: { lastHeartbeat: now },
  })

  return NextResponse.json({ ok: true })
}
