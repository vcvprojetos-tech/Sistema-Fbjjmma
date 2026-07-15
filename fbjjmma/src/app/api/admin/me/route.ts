import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { Pool } from "pg"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  try {
    const result = await pool.query<{ permissions: string[] }>(
      `SELECT COALESCE(permissions, '{}') as permissions FROM users WHERE id = $1`,
      [session.user.id]
    )
    const permissions: string[] = result.rows[0]?.permissions ?? []
    return NextResponse.json({ permissions })
  } catch {
    return NextResponse.json({ permissions: [] })
  } finally {
    await pool.end()
  }
}
