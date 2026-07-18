import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "PRESIDENTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  }

  const cutoff2min = new Date(Date.now() - 2 * 60 * 1000)

  // Sessões de coordenadores de tatame (TatameOperation ativas)
  const tatameSessions = await (prisma.tatameOperation as any).findMany({
    where: { endedAt: null },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { lastHeartbeat: "desc" },
  })

  const tatameIds = [...new Set(tatameSessions.map((s: any) => s.tatameId))] as string[]
  const tatames = tatameIds.length > 0
    ? await prisma.tatame.findMany({
        where: { id: { in: tatameIds } },
        select: { id: true, name: true, event: { select: { name: true } } },
      })
    : []
  const tatameMap = Object.fromEntries(tatames.map((t) => [t.id, t]))

  // Sessões administrativas individuais (UserSession com invalidatedAt null)
  const userSessions = await (prisma as any).userSession.findMany({
    where: {
      invalidatedAt: null,
      user: {
        isActive: true,
        role: { in: ["PRESIDENTE", "COORDENADOR_GERAL", "CUSTOM"] },
      },
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const currentSessionId = session.user.sessionId

  const adminSessions = userSessions.map((s: any) => ({
    id: s.id,
    userId: s.userId,
    user: s.user,
    ip: s.ip,
    userAgent: s.userAgent ?? null,
    lastSeenAt: s.lastSeenAt ?? null,
    createdAt: s.createdAt,
    isCurrentSession: s.id === currentSessionId,
  }))

  return NextResponse.json(
    {
      tatameSessions: tatameSessions.map((s: any) => ({
        id: s.id,
        userId: s.userId,
        user: s.user,
        tatame: tatameMap[s.tatameId] ?? null,
        lastHeartbeat: s.lastHeartbeat,
        ativo: new Date(s.lastHeartbeat) >= cutoff2min,
      })),
      adminSessions,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "PRESIDENTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  }

  const body = await req.json()
  const { type, id, all } = body as { type?: string; id?: string; all?: boolean }

  if (all) {
    // Invalida todas as UserSessions (exceto a do usuário atual)
    await (prisma as any).userSession.updateMany({
      where: { invalidatedAt: null, userId: { not: session.user.id } },
      data: { invalidatedAt: new Date() },
    })
    // Encerra todas as sessões de tatame
    await (prisma.tatameOperation as any).updateMany({
      where: { endedAt: null },
      data: { endedAt: new Date() },
    })
    // Força logout para sessões antigas sem sessionToken
    await prisma.user.updateMany({
      where: {
        role: { in: ["PRESIDENTE", "COORDENADOR_GERAL", "COORDENADOR_TATAME", "CUSTOM"] },
        id: { not: session.user.id },
      },
      data: { forceLogoutAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  if (type === "tatame" && id) {
    await (prisma.tatameOperation as any).update({
      where: { id },
      data: { endedAt: new Date() },
    })
  } else if (type === "session" && id) {
    // Encerra uma sessão administrativa individual
    await (prisma as any).userSession.update({
      where: { id },
      data: { invalidatedAt: new Date() },
    })
  } else {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
