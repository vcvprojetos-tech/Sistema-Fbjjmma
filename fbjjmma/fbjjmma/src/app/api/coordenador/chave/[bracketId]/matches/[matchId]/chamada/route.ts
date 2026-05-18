import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"

const CALL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bracketId: string; matchId: string }> }
) {
  const session = await auth()
  const pin = req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { bracketId, matchId } = await params

  const [match, bracketRecord] = await Promise.all([
    prisma.match.findFirst({ where: { id: matchId, bracketId } }),
    prisma.bracket.findUnique({ where: { id: bracketId }, select: { tatameId: true } }),
  ])
  if (!match) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 })
  if (match.endedAt) return NextResponse.json({ error: "Partida já finalizada." }, { status: 400 })

  const body = await req.json()
  // action: "call" | "checkin"
  // call: callNumber (1 | 2 | 3)
  // checkin: position ("p1" | "p2"), checked (boolean)
  const { action, callNumber, position, checked } = body

  if (action === "call") {
    if (![1, 2, 3].includes(callNumber)) {
      return NextResponse.json({ error: "Número de chamada inválido." }, { status: 400 })
    }

    const now = new Date()
    const existing = (match.callTimes as { call: number; at: string; pos?: string | null }[] | null) ?? []

    // Filtra chamadas da mesma posição (atleta ausente)
    // Chamadas com pos=null (ex: 1ª chamada automática ao iniciar) valem para qualquer posição
    const pos: string | null = body.position ?? null
    const posCalls = pos ? existing.filter(c => c.pos === pos || c.pos == null) : existing.filter(c => !c.pos)

    // Verifica se essa chamada já foi registrada para esta posição
    if (posCalls.some(c => c.call === callNumber)) {
      return NextResponse.json({ error: "Chamada já registrada." }, { status: 400 })
    }

    // Verifica intervalo mínimo de 10 min em relação à chamada anterior
    if (callNumber > 1) {
      const prev = posCalls.find(c => c.call === callNumber - 1)
      if (!prev) {
        return NextResponse.json({ error: `Registre a ${callNumber - 1}ª chamada primeiro.` }, { status: 400 })
      }
      const elapsed = now.getTime() - new Date(prev.at).getTime()
      if (elapsed < CALL_INTERVAL_MS) {
        const remaining = Math.ceil((CALL_INTERVAL_MS - elapsed) / 60000)
        return NextResponse.json(
          { error: `Aguarde ${remaining} minuto(s) antes da ${callNumber}ª chamada.`, remaining },
          { status: 429 }
        )
      }
    }

    const newCalls = [...existing, { call: callNumber, at: now.toISOString(), pos }]

    await prisma.match.update({
      where: { id: matchId },
      data: { callTimes: newCalls },
    })

    if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
    return NextResponse.json({ ok: true, callTimes: newCalls })
  }

  if (action === "checkin") {
    if (!["p1", "p2"].includes(position)) {
      return NextResponse.json({ error: "Posição inválida." }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = match as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.match as any).update({
      where: { id: matchId },
      data: {
        p1CheckedIn: position === "p1" ? Boolean(checked) : m.p1CheckedIn,
        p2CheckedIn: position === "p2" ? Boolean(checked) : m.p2CheckedIn,
      },
    })

    if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}
