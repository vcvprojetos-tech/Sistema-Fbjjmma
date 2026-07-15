import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { Pool } from "pg"
import { prisma } from "@/lib/db"
import { logAction, getClientIP } from "@/lib/audit"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  if (session.user.role !== "PRESIDENTE") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })
  }

  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  const { permissions } = body

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: "Permissões inválidas." }, { status: 400 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  try {
    await pool.query(
      `UPDATE users SET permissions = $1::text[] WHERE id = $2`,
      [permissions, userId]
    )

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    await logAction({
      userId: session.user.id,
      module: "USUARIOS",
      action: "EDITAR_PERMISSOES",
      details: { usuario: targetUser?.name ?? userId, permissoes: permissions.join(", ") || "nenhuma" },
      ip: getClientIP(req),
    })

    return NextResponse.json({ message: "Permissões atualizadas." })
  } catch (error) {
    console.error("[PERMISSOES PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar permissões." }, { status: 500 })
  } finally {
    await pool.end()
  }
}
