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

  // Pega o evento mais próximo de hoje (próximo futuro ou o mais recente passado)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let event = await prisma.event.findFirst({
    where: { deletedAt: null, date: { gte: today } },
    orderBy: { date: "asc" },
  })

  if (!event) {
    event = await prisma.event.findFirst({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
    })
  }

  if (!event) {
    return NextResponse.json({ error: "Nenhum evento encontrado." }, { status: 404 })
  }

  // Verifica se o número do tatame já está sendo operado por outro coordenador
  const tatameOcupado = await prisma.tatame.findFirst({
    where: {
      eventId: event.id,
      name: { endsWith: `- Tatame ${tatameNum}` },
      isActive: true,
      operations: {
        some: {
          endedAt: null,
          NOT: { userId: user.id },
        },
      },
    },
    include: {
      operations: {
        where: { endedAt: null },
        include: { user: { select: { name: true } } },
        take: 1,
      },
    },
  })

  if (tatameOcupado) {
    const operador = tatameOcupado.operations[0]?.user.name || "outro coordenador"
    return NextResponse.json(
      { error: `Tatame ${tatameNum} já está sendo operado por ${operador}.` },
      { status: 409 }
    )
  }

  // Verifica se este coordenador já está conectado em outro dispositivo
  // Considera ativo apenas se houve heartbeat nos últimos 2 minutos
  const heartbeatCutoff = new Date(Date.now() - 2 * 60 * 1000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessaoAtiva = await (prisma.tatameOperation as any).findFirst({
    where: {
      userId: user.id,
      endedAt: null,
      lastHeartbeat: { gte: heartbeatCutoff },
    },
    include: { tatame: { select: { name: true } } },
  })

  if (sessaoAtiva) {
    return NextResponse.json(
      { error: `Você já está conectado no ${sessaoAtiva.tatame.name} em outro dispositivo. Feche a outra sessão antes de continuar.` },
      { status: 409 }
    )
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

  await prisma.$transaction([
    prisma.tatameOperation.updateMany({
      where: { userId: user.id, endedAt: null },
      data: { endedAt: new Date() },
    }),
    prisma.tatameOperation.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { tatameId: tatame.id, userId: user.id, lastHeartbeat: new Date() } as any,
    }),
  ])

  return NextResponse.json({
    tatameId: tatame.id,
    tatameName: tatame.name,
    pin: tatame.pin,
    event: { id: event.id, name: event.name },
  })
}
