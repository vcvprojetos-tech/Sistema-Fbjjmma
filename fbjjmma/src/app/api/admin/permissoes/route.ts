import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { Pool } from "pg"

interface CoordenadorRow {
  id: string
  name: string
  email: string
  isActive: boolean
  permissions: string[]
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  if (session.user.role !== "PRESIDENTE") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  try {
    const result = await pool.query<CoordenadorRow>(
      `SELECT id, name, email, "isActive", COALESCE(permissions, '{}') as permissions
       FROM users
       WHERE role = 'COORDENADOR_GERAL' AND "deletedAt" IS NULL
       ORDER BY name ASC`
    )
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: "Erro ao carregar permissões." }, { status: 500 })
  } finally {
    await pool.end()
  }
}
