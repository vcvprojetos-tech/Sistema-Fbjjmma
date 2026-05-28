import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Recompacta posições de uma chave para que não haja lacunas (1, 2, 3, ...)
// Só executa em chaves PENDENTE ou DESIGNADA (sem partidas em andamento).
async function compactBracketPositions(bracketId: string) {
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { status: true },
  })
  if (!bracket || (bracket.status !== "PENDENTE" && bracket.status !== "DESIGNADA")) return

  await prisma.bracketPosition.deleteMany({ where: { bracketId, registrationId: null } })

  const positions = await prisma.bracketPosition.findMany({
    where: { bracketId },
    orderBy: { position: "asc" },
    select: { id: true },
  })
  if (positions.length === 0) return

  // Passo 1: negativos para evitar conflito de unique constraint (bracketId, position)
  for (let i = 0; i < positions.length; i++) {
    await prisma.bracketPosition.update({ where: { id: positions[i].id }, data: { position: -(i + 1) } })
  }
  // Passo 2: valores finais sequenciais
  for (let i = 0; i < positions.length; i++) {
    await prisma.bracketPosition.update({ where: { id: positions[i].id }, data: { position: i + 1 } })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; atletaId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id, atletaId } = await params

  const registration = await prisma.registration.findUnique({
    where: { id: atletaId },
    include: {
      event: { select: { id: true, name: true } },
      athlete: {
        include: {
          user: { select: { id: true, name: true, cpf: true } },
        },
      },
      team: true,
      weightCategory: true,
      bracketPositions: {
        include: {
          bracket: {
            select: {
              id: true,
              bracketNumber: true,
              isAbsolute: true,
              status: true,
              weightCategory: { select: { name: true, ageGroup: true, sex: true } },
            },
          },
        },
      },
    },
  })

  if (!registration || registration.eventId !== id) {
    return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 })
  }

  return NextResponse.json(registration)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; atletaId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id, atletaId } = await params

  try {
    const body = await req.json()
    const {
      sex,
      ageGroup,
      belt,
      weightCategoryId,
      teamId,
      professor,
      isAbsolute,
      status,
      paymentMethod,
      observation,
      medal,
      teamPoints,
      awarded,
      affiliated,
      pointDiff,
    } = body

    const registration = await prisma.registration.findUnique({
      where: { id: atletaId },
      include: {
        bracketPositions: {
          include: {
            bracket: { select: { id: true, isAbsolute: true, status: true, weightCategoryId: true, belt: true } },
          },
        },
      },
    })

    if (!registration || registration.eventId !== id) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 })
    }

    const newWeightCategoryId = weightCategoryId || registration.weightCategoryId
    const newBelt = belt || registration.belt
    const newSex = sex || registration.sex
    const newAgeGroup = ageGroup || registration.ageGroup
    const newIsAbsolute = isAbsolute !== undefined ? Boolean(isAbsolute) : registration.isAbsolute

    const bracketFieldsChanged =
      newWeightCategoryId !== registration.weightCategoryId ||
      newBelt !== registration.belt ||
      newAgeGroup !== registration.ageGroup ||
      newSex !== registration.sex ||
      newIsAbsolute !== registration.isAbsolute

    // Detecta atleta "órfão": sem posições em nenhuma chave.
    // Pode ocorrer quando uma operação anterior falhou parcialmente após deletar
    // a posição antiga mas antes de criar a nova. Recovery é feito ao final do PUT.
    const isOrphan = registration.bracketPositions.length === 0

    // Verificar se alguma chave atual já foi iniciada
    if (bracketFieldsChanged && registration.bracketPositions.length > 0) {
      for (const pos of registration.bracketPositions) {
        const s = pos.bracket.status
        if (s !== "PENDENTE" && s !== "DESIGNADA") {
          return NextResponse.json(
            { error: `A chave #${pos.bracket.id} já está em andamento. Não é possível alterar a categoria do atleta.` },
            { status: 400 }
          )
        }
      }
    }

    // Atualizar a inscrição
    const updated = await prisma.registration.update({
      where: { id: atletaId },
      data: {
        sex: sex || undefined,
        ageGroup: ageGroup || undefined,
        belt: belt || undefined,
        weightCategoryId: weightCategoryId || undefined,
        teamId: teamId !== undefined ? teamId || null : undefined,
        professor: professor !== undefined ? professor || null : undefined,
        isAbsolute: isAbsolute !== undefined ? Boolean(isAbsolute) : undefined,
        status: status || undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod || null : undefined,
        observation: observation !== undefined ? observation || null : undefined,
        medal: medal !== undefined ? medal || null : undefined,
        teamPoints: teamPoints !== undefined ? Boolean(teamPoints) : undefined,
        awarded: awarded !== undefined ? Boolean(awarded) : undefined,
        affiliated: affiliated !== undefined ? Boolean(affiliated) : undefined,
        pointDiff: pointDiff !== undefined ? Boolean(pointDiff) : undefined,
      },
      include: {
        athlete: { include: { user: { select: { id: true, name: true } } } },
        team: true,
        weightCategory: true,
      },
    })

    // Reposicionar nas chaves quando campos de categoria mudaram
    if (bracketFieldsChanged && registration.bracketPositions.length > 0) {
      // Fase 1: determinar todos os destinos ANTES de qualquer mutação nas posições.
      // Se alguma validação falhar aqui, nenhuma posição foi alterada.
      type Move = {
        posId: string
        oldBracketId: string
        destBracketId: string | null  // null = atleta sai da categoria (ex: isAbsolute false→false)
      }
      const moves: Move[] = []

      for (const pos of registration.bracketPositions) {
        const bracket = pos.bracket

        if (bracket.isAbsolute) {
          if (!newIsAbsolute) {
            moves.push({ posId: pos.id, oldBracketId: bracket.id, destBracketId: null })
            continue
          }
          let dest = await prisma.bracket.findFirst({
            where: {
              eventId: id,
              isAbsolute: true,
              belt: newBelt,
              weightCategory: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
            },
            select: { id: true, status: true },
          })
          if (!dest) {
            const wc = await prisma.weightCategory.findFirst({
              where: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
            })
            if (wc) {
              const agg = await prisma.bracket.aggregate({ where: { eventId: id }, _max: { bracketNumber: true } })
              dest = await prisma.bracket.create({
                data: { eventId: id, weightCategoryId: wc.id, belt: newBelt as never, isAbsolute: true, bracketNumber: (agg._max.bracketNumber ?? 0) + 1 },
                select: { id: true, status: true },
              })
            }
          }
          if (!dest) continue
          if (dest.status !== "PENDENTE" && dest.status !== "DESIGNADA") {
            return NextResponse.json(
              { error: "A chave de destino já está em andamento. Não é possível mover o atleta." },
              { status: 400 }
            )
          }
          moves.push({ posId: pos.id, oldBracketId: bracket.id, destBracketId: dest.id })
        } else {
          let dest = await prisma.bracket.findFirst({
            where: { eventId: id, isAbsolute: false, belt: newBelt, weightCategoryId: newWeightCategoryId },
            select: { id: true, status: true },
          })
          if (!dest) {
            const agg = await prisma.bracket.aggregate({ where: { eventId: id }, _max: { bracketNumber: true } })
            dest = await prisma.bracket.create({
              data: { eventId: id, weightCategoryId: newWeightCategoryId, belt: newBelt as never, isAbsolute: false, bracketNumber: (agg._max.bracketNumber ?? 0) + 1 },
              select: { id: true, status: true },
            })
          }
          if (dest.status !== "PENDENTE" && dest.status !== "DESIGNADA") {
            return NextResponse.json(
              { error: "A chave de destino já está em andamento. Não é possível mover o atleta." },
              { status: 400 }
            )
          }
          moves.push({ posId: pos.id, oldBracketId: bracket.id, destBracketId: dest.id })
        }
      }

      // Fase 2: executar os moves — CRIAR nova posição PRIMEIRO, depois DELETAR a antiga.
      // Essa ordem garante que o atleta nunca fica sem chave mesmo se houver falha parcial.
      const oldBracketIds = new Set<string>()
      for (const move of moves) {
        if (move.destBracketId) {
          const nextPos = (await prisma.bracketPosition.count({ where: { bracketId: move.destBracketId } })) + 1
          await prisma.bracketPosition.create({
            data: { bracketId: move.destBracketId, registrationId: atletaId, position: nextPos },
          })
        }
        await prisma.bracketPosition.delete({ where: { id: move.posId } })
        oldBracketIds.add(move.oldBracketId)
      }

      // Limpar chaves antigas
      for (const oldBracketId of oldBracketIds) {
        const remaining = await prisma.bracketPosition.count({ where: { bracketId: oldBracketId } })
        if (remaining === 0) {
          await prisma.match.deleteMany({ where: { bracketId: oldBracketId } })
          await prisma.bracket.delete({ where: { id: oldBracketId } })
        } else {
          await compactBracketPositions(oldBracketId)
        }
      }
    }

    // Recovery de atleta órfão: sem posições em nenhuma chave por falha anterior.
    // Garante que o atleta seja recolocado na chave de peso correta ao salvar novamente.
    if (isOrphan && newWeightCategoryId) {
      const jaEmChaveCorreta = await prisma.bracketPosition.findFirst({
        where: {
          registrationId: atletaId,
          bracket: { eventId: id, isAbsolute: false, belt: newBelt, weightCategoryId: newWeightCategoryId },
        },
      })
      if (!jaEmChaveCorreta) {
        let dest = await prisma.bracket.findFirst({
          where: { eventId: id, isAbsolute: false, belt: newBelt, weightCategoryId: newWeightCategoryId },
          select: { id: true, status: true },
        })
        if (!dest) {
          const agg = await prisma.bracket.aggregate({ where: { eventId: id }, _max: { bracketNumber: true } })
          dest = await prisma.bracket.create({
            data: { eventId: id, weightCategoryId: newWeightCategoryId, belt: newBelt as never, isAbsolute: false, bracketNumber: (agg._max.bracketNumber ?? 0) + 1 },
            select: { id: true, status: true },
          })
        }
        if (dest.status === "PENDENTE" || dest.status === "DESIGNADA") {
          const nextPos = (await prisma.bracketPosition.count({ where: { bracketId: dest.id } })) + 1
          await prisma.bracketPosition.create({
            data: { bracketId: dest.id, registrationId: atletaId, position: nextPos },
          })
        }
      }
    }

    // Adicionar à chave absoluta quando isAbsolute muda de false → true.
    // Roda independente de o atleta já ter posições em outras chaves ou não
    // (caso comum: atleta adicionado ao evento após a geração das chaves).
    if (newIsAbsolute && !registration.isAbsolute) {
      const jaNoAbsoluto = registration.bracketPositions.some(p => p.bracket.isAbsolute)
      if (!jaNoAbsoluto) {
        let absBracket: { id: string; status: string } | null = await prisma.bracket.findFirst({
          where: {
            eventId: id,
            isAbsolute: true,
            belt: newBelt,
            weightCategory: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
          },
          select: { id: true, status: true },
        })

        if (!absBracket) {
          const wc = await prisma.weightCategory.findFirst({
            where: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
          })
          if (wc) {
            const agg = await prisma.bracket.aggregate({ where: { eventId: id }, _max: { bracketNumber: true } })
            absBracket = await prisma.bracket.create({
              data: { eventId: id, weightCategoryId: wc.id, belt: newBelt as never, isAbsolute: true, bracketNumber: (agg._max.bracketNumber ?? 0) + 1 },
              select: { id: true, status: true },
            })
          }
        }

        if (absBracket) {
          if (absBracket.status !== "PENDENTE" && absBracket.status !== "DESIGNADA") {
            return NextResponse.json(
              { error: "A chave absoluta de destino já está em andamento. Não é possível adicionar atleta." },
              { status: 400 }
            )
          }
          const nextPos = (await prisma.bracketPosition.count({ where: { bracketId: absBracket.id } })) + 1
          await prisma.bracketPosition.create({
            data: { bracketId: absBracket.id, registrationId: atletaId, position: nextPos },
          })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[EVENTO ATLETA PUT ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao atualizar inscrição." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; atletaId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, atletaId } = await params

  try {
    const registration = await prisma.registration.findUnique({
      where: { id: atletaId },
    })

    if (!registration || registration.eventId !== id) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      )
    }

    await prisma.registration.update({
      where: { id: atletaId },
      data: { status: "CANCELADO" },
    })

    const affectedPositions = await prisma.bracketPosition.findMany({
      where: { registrationId: atletaId },
      select: { bracketId: true },
    })
    const affectedBracketIds = [...new Set(affectedPositions.map((p) => p.bracketId))]

    if (affectedBracketIds.length > 0) {
      await prisma.bracketPosition.updateMany({
        where: { registrationId: atletaId },
        data: { registrationId: null },
      })

      const bracketsWithAthletes = await prisma.bracketPosition.findMany({
        where: { bracketId: { in: affectedBracketIds }, registrationId: { not: null } },
        select: { bracketId: true },
        distinct: ["bracketId"],
      })
      const stillPopulated = new Set(bracketsWithAthletes.map((p) => p.bracketId))
      const emptyBracketIds = affectedBracketIds.filter((bid) => !stillPopulated.has(bid))

      if (emptyBracketIds.length > 0) {
        await prisma.match.deleteMany({ where: { bracketId: { in: emptyBracketIds } } })
        await prisma.bracketPosition.deleteMany({ where: { bracketId: { in: emptyBracketIds } } })
        await prisma.bracket.deleteMany({ where: { id: { in: emptyBracketIds } } })
      }

      for (const bracketId of affectedBracketIds.filter((bid) => stillPopulated.has(bid))) {
        await compactBracketPositions(bracketId)
      }
    }

    return NextResponse.json({ message: "Inscrição cancelada." })
  } catch (error) {
    console.error("[EVENTO ATLETA DELETE ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao cancelar inscrição." },
      { status: 500 }
    )
  }
}
