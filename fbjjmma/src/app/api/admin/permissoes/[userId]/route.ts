import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { Pool } from "pg"

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
    return NextResponse.json({ message: "Permissões atualizadas." })
  } catch (error) {
    console.error("[PERMISSOES PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar permissões." }, { status: 500 })
  } finally {
    await pool.end()
  }
}
