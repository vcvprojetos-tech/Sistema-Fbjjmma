import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  if (event.status !== "ENCERRADO")
    return NextResponse.json({ error: "Evento não está encerrado." }, { status: 400 })

  await prisma.event.update({
    where: { id },
    data: { status: "EM_ANDAMENTO" },
  })

  return NextResponse.json({ ok: true })
}
