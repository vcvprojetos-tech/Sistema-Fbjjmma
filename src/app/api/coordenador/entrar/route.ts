import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const { tatameNum } = body

  if (!tatameNum) return NextResponse.json({ error: "Número do tatame obrigatório." }, { status: 400 })

  // Busca o evento ativo (EM_ANDAMENTO) ou o mais recente
  const event = await prisma.event.findFirst({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  })

  if (!event) return NextResponse.json({ error: "Nenhum evento encontrado." }, { status: 404 })

  const tatameName = `${session.user.name} - Tatame ${tatameNum}`

  // Cria ou encontra o tatame para esse coordenador nesse evento
  let tatame = await prisma.tatame.findFirst({
    where: { eventId: event.id, name: tatameName },
  })

  if (!tatame) {
    // Gera um PIN aleatório de 4 dígitos
    const pin = String(Math.floor(1000 + Math.random() * 9000))
    tatame = await prisma.tatame.create({
      data: {
        eventId: event.id,
        name: tatameName,
        pin,
        isActive: true,
      },
    })
  } else {
    // Garante que está ativo
    tatame = await prisma.tatame.update({
      where: { id: tatame.id },
      data: { isActive: true },
    })
  }

  // Encerra operações anteriores do usuário
  await prisma.tatameOperation.updateMany({
    where: { userId: session.user.id, endedAt: null },
    data: { endedAt: new Date() },
  })

  // Cria nova operação
  await prisma.tatameOperation.create({
    data: { tatameId: tatame.id, userId: session.user.id },
  })

  return NextResponse.json({ tatameId: tatame.id, tatameName: tatame.name, event: { id: event.id, name: event.name } })
}
