import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const { matchId, bracketId } = await req.json()

  if (!matchId || !bracketId) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, bracketId, bracket: { eventId } },
    include: { bracket: { select: { tatameId: true } } },
  })

  if (!match) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 })

  const existing = (match.callTimes as { call: number }[] | null) ?? []
  if (existing.some(c => c.call === 1)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { callTimes: [{ call: 1, at: new Date().toISOString(), pos: null }] },
  })

  if (match.bracket.tatameId) notifyTatame(match.bracket.tatameId)
  return NextResponse.json({ ok: true })
}
