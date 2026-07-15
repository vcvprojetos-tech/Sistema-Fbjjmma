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

  // Usuários que acessam o painel administrativo (excluindo Coord. Tatame — eles ficam na seção de tatame)
  const adminUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["PRESIDENTE", "COORDENADOR_GERAL", "CUSTOM"] },
    },
    select: { id: true, name: true, role: true, forceLogoutAt: true },
    orderBy: { name: "asc" },
  })

  // Todos os logins recentes (30 dias) para cada usuário admin — sem deduplicação
  const adminUserIds = adminUsers.map((u) => u.id)
  const allLoginLogs = adminUserIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          action: "LOGIN",
          module: "SISTEMA",
          userId: { in: adminUserIds },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { userId: true, createdAt: true, ip: true },
        orderBy: { createdAt: "desc" },
      })
    : []

  // Agrupa logins por userId (mais recente primeiro)
  const loginsByUser = new Map<string, Array<{ createdAt: Date; ip: string | null }>>()
  for (const log of allLoginLogs) {
    if (log.userId) {
      if (!loginsByUser.has(log.userId)) loginsByUser.set(log.userId, [])
      loginsByUser.get(log.userId)!.push({ createdAt: log.createdAt, ip: log.ip })
    }
  }

  const adminSessions = adminUsers.map((u) => {
    const logins = loginsByUser.get(u.id) ?? []
    const lastLogin = logins[0] ?? null
    const encerrada = u.forceLogoutAt
      ? lastLogin
        ? u.forceLogoutAt.getTime() > lastLogin.createdAt.getTime()
        : true
      : false
    return {
      userId: u.id,
      user: { id: u.id, name: u.name, role: u.role },
      logins: logins.map((l) => ({ loginAt: l.createdAt, ip: l.ip })),
      lastLoginAt: lastLogin?.createdAt ?? null,
      lastIp: lastLogin?.ip ?? null,
      encerrada,
    }
  })

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
