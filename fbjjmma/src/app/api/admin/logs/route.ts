import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  if (session.user.role !== "PRESIDENTE" && session.user.role !== "COORDENADOR_GERAL") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const module = searchParams.get("module") || undefined
  const modulesRaw = searchParams.get("modules") || undefined
  const userId = searchParams.get("userId") || undefined
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined

  const where: Record<string, unknown> = {}
  if (module) {
    where.module = module
  } else if (modulesRaw) {
    where.module = { in: modulesRaw.split(",").map(m => m.trim()).filter(Boolean) }
  }
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / PAGE_SIZE),
    })
  } catch {
    return NextResponse.json({ error: "Erro ao carregar logs." }, { status: 500 })
  }
}
