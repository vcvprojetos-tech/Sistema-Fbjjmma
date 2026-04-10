import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cpf, tatameNum } = body

  if (!cpf || !tatameNum) {
    return NextResponse.json({ error: "CPF e número do tatame são obrigatórios." }, { status: 400 })
  }

  const cleanCpf = String(cpf).replace(/\D/g, "")

  const user = await prisma.user.findFirst({
    where: { cpf: cleanCpf, role: "COORDENADOR_TATAME", isActive: true },
  })

  if (!user) {
    return NextResponse.json({ error: "CPF não encontrado ou sem permissão de acesso." }, { status: 403 })
  }

  const event = await prisma.event.findFirst({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  })

  if (!event) {
    return NextResponse.json({ error: "Nenhum evento encontrado." }, { status: 404 })
  }

  const tatameName = `${user.name} - Tatame ${tatameNum}`

  let tatame = await prisma.tatame.findFirst({
    where: { eventId: event.id, name: tatameName },
  })

  if (!tatame) {
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
    tatame = await prisma.tatame.update({
      where: { id: tatame.id },
      data: { isActive: true },
    })
  }

  await prisma.tatameOperation.updateMany({
    where: { userId: user.id, endedAt: null },
    data: { endedAt: new Date() },
  })

  await prisma.tatameOperation.create({
    data: { tatameId: tatame.id, userId: user.id },
  })

  return NextResponse.json({
    tatameId: tatame.id,
    tatameName: tatame.name,
    event: { id: event.id, name: event.name },
  })
}
