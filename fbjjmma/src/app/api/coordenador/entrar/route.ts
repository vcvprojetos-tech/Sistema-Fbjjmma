import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logAction, getClientIP } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cpf, tatameNum, eventId } = body

  if (!cpf || !tatameNum) {
    return NextResponse.json({ error: "CPF e número do tatame são obrigatórios." }, { status: 400 })
  }

  const cleanCpf = String(cpf).replace(/\D/g, "")

  const user = await prisma.user.findFirst({
    where: { cpf: cleanCpf, role: { in: ["COORDENADOR_TATAME", "COORDENADOR_GERAL", "PRESIDENTE"] }, isActive: true },
  })

  if (!user) {
    return NextResponse.json({ error: "CPF não encontrado ou sem permissão de acesso." }, { status: 403 })
  }

  let event
  if (eventId) {
    event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: { not: "ENCERRADO" } },
    })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado ou já encerrado." }, { status: 404 })
    }
  } else {
    // Fallback: pega o evento mais próximo de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    event = await prisma.event.findFirst({
      where: { deletedAt: null, date: { gte: today }, status: { not: "ENCERRADO" } },
      orderBy: { date: "asc" },
    })
    if (!event) {
      event = await prisma.event.findFirst({
        where: { deletedAt: null, status: { not: "ENCERRADO" } },
        orderBy: { date: "desc" },
      })
    }
    if (!event) {
      return NextResponse.json({ error: "Nenhum evento ativo encontrado." }, { status: 404 })
    }
  }

  const tatameName = `${user.name} - Tatame ${tatameNum}`

  // Busca o tatame do coordenador antecipadamente para excluí-lo da verificação de sessão ativa
  const existingTatame = await prisma.tatame.findFirst({
    where: { eventId: event.id, name: tatameName },
  })

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

  // Verifica se este coordenador já está conectado em OUTRO tatame em outro dispositivo.
  // Reconexão ao mesmo tatame (ex: página recarregada ou fechada e reaberta) é sempre permitida.
  const heartbeatCutoff = new Date(Date.now() - 2 * 60 * 1000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessaoAtiva = await (prisma.tatameOperation as any).findFirst({
    where: {
      userId: user.id,
      endedAt: null,
      lastHeartbeat: { gte: heartbeatCutoff },
      ...(existingTatame ? { tatameId: { not: existingTatame.id } } : {}),
    },
    include: { tatame: { select: { name: true } } },
  })

  if (sessaoAtiva) {
    return NextResponse.json(
      { error: `Você já está conectado no ${sessaoAtiva.tatame.name} em outro dispositivo. Feche a outra sessão antes de continuar.` },
      { status: 409 }
    )
  }

  let tatame = existingTatame

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

  await logAction({
    userId: user.id,
    module: "COORDENADOR",
    action: "ACESSO_TATAME",
    details: { tatame: tatameName, evento: event.name },
    ip: getClientIP(req),
  })

  return NextResponse.json({
    tatameId: tatame.id,
    tatameName: tatame.name,
    pin: tatame.pin,
    event: { id: event.id, name: event.name },
  })
}
