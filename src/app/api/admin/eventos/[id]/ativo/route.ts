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

  // Garante que a coluna existe (idempotente)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`
  ).catch(() => {})

  const rows = await prisma.$queryRaw<{ id: string; isActive: boolean }[]>`
    SELECT id, "isActive" FROM "events" WHERE id = ${id} LIMIT 1
  `
  if (!rows.length) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const newValue = !rows[0].isActive
  await prisma.$executeRaw`UPDATE "events" SET "isActive" = ${newValue} WHERE id = ${id}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma.event as any).findUnique({ where: { id } })
  return NextResponse.json(updated)
}
