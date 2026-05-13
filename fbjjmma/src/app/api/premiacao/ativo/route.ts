import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const event = await prisma.event.findFirst({
    where: {
      deletedAt: null,
      status: { in: ["EM_ANDAMENTO", "PUBLICADO"] },
    },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  })

  if (!event) {
    return NextResponse.json({ error: "Nenhum evento ativo encontrado." }, { status: 404 })
  }

  return NextResponse.json(event)
}
