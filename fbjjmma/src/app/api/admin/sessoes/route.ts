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

  // Para cada sessão de tatame, buscar o nome do tatame
  const tatameIds = [...new Set(tatameSessions.map((s: any) => s.tatameId))] as string[]
  const tatames = tatameIds.length > 0
    ? await prisma.tatame.findMany({
        where: { id: { in: tatameIds } },
        select: { id: true, name: true, event: { select: { name: true } } },
      })
    : []
  const tatameMap = Object.fromEntries(tatames.map((t) => [t.id, t]))

  // Logins recentes das últimas 8 horas (sessões administrativas)
  const recentLogins = await prisma.auditLog.findMany({
    where: {
      action: "LOGIN",
      module: "SISTEMA",
      createdAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    },
    include: {
      user: { select: { id: true, name: true, role: true, forceLogoutAt: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Deduplica por userId (mais recente por usuário)
  const seenUsers = new Set<string>()
  const adminSessions: {
    id: string
    userId: string | null
    user: { id: string; name: string; role: string } | null
    ip: string | null
    loginAt: Date
    encerrada: boolean
  }[] = []

  for (const log of recentLogins) {
    const uid = log.userId ?? "__guest"
    if (!seenUsers.has(uid)) {
      seenUsers.add(uid)
      const u = log.user as { id: string; name: string; role: string; forceLogoutAt: Date | null } | null
      adminSessions.push({
        id: log.id,
        userId: log.userId,
        user: u ? { id: u.id, name: u.name, role: u.role } : null,
        ip: log.ip,
        loginAt: log.createdAt,
        encerrada: u?.forceLogoutAt
          ? u.forceLogoutAt.getTime() > new Date(log.createdAt).getTime()
          : false,
      })
    }
  }

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
    // Encerra todas as sessões de tatame
    await (prisma.tatameOperation as any).updateMany({
      where: { endedAt: null },
      data: { endedAt: new Date() },
    })
    // Força logout de todos os usuários não-atletas, exceto o usuário atual
    await prisma.user.updateMany({
      where: {
        role: { in: ["PRESIDENTE", "COORDENADOR_GERAL", "COORDENADOR_TATAME"] },
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
  } else if (type === "usuario" && id) {
    await prisma.user.update({
      where: { id },
      data: { forceLogoutAt: new Date() },
    })
  } else {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
