import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, ensureBracketDeletedAt } from "@/lib/db"
import { Pool } from "pg"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    await ensureBracketDeletedAt()
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

    // Verifica se existe na lixeira via raw SQL
    const check = await pool.query<{ id: string }>(
      `SELECT id FROM brackets WHERE id = $1 AND "eventId" = $2 AND "deletedAt" IS NOT NULL`,
      [bracketId, id]
    )
    if (check.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: "Chave não encontrada na lixeira." }, { status: 404 })
    }

    // Remove o deletedAt via raw SQL
    await pool.query(`UPDATE brackets SET "deletedAt" = NULL WHERE id = $1`, [bracketId])
    await pool.end()

    // Retorna a chave restaurada via Prisma (sem filtro deletedAt)
    const restored = await prisma.bracket.findFirst({
      where: { id: bracketId, eventId: id },
      include: {
        weightCategory: true,
        positions: {
          include: {
            registration: {
              include: {
                athlete: { include: { user: { select: { id: true, name: true } } } },
                team: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { position: "asc" },
        },
        matches: {
          orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
        },
      },
    })

    return NextResponse.json(restored)
  } catch (error) {
    console.error("[BRACKET RESTAURAR ERROR]", error)
    return NextResponse.json({ error: "Erro ao restaurar chave." }, { status: 500 })
  }
}
