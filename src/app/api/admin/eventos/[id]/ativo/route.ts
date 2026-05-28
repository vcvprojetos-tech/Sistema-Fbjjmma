import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  // Garante que a coluna existe
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`
  ).catch(() => {})

  const rows = await prisma.$queryRaw<{ isActive: boolean }[]>`
    SELECT "isActive" FROM "events" WHERE id = ${id} LIMIT 1
  `
  if (!rows.length) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const newValue = !rows[0].isActive
  await prisma.$executeRawUnsafe(
    `UPDATE "events" SET "isActive" = $1 WHERE id = $2`,
    newValue,
    id
  )

  return NextResponse.json({ isActive: newValue })
}
