import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

    // Campos que afetam qual chave o atleta pertence
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

    // Reposicionar nas chaves se algum campo relevante mudou
    if (bracketFieldsChanged && registration.bracketPositions.length > 0) {
      for (const pos of registration.bracketPositions) {
        const bracket = pos.bracket
        const oldBracketId = bracket.id

        // Remover da chave antiga
        await prisma.bracketPosition.delete({ where: { id: pos.id } })

        // Se a chave ficou vazia, removê-la
        const remaining = await prisma.bracketPosition.count({ where: { bracketId: oldBracketId } })
        if (remaining === 0) {
          await prisma.match.deleteMany({ where: { bracketId: oldBracketId } })
          await prisma.bracket.delete({ where: { id: oldBracketId } })
        }

        // Determinar a chave destino
        let destBracket: { id: string; status: string } | null = null

        if (bracket.isAbsolute) {
          // Atleta sai do absoluto se newIsAbsolute = false
          if (!newIsAbsolute) continue

          // Procura chave absoluta com os novos dados
          destBracket = await prisma.bracket.findFirst({
            where: {
              eventId: id,
              isAbsolute: true,
              belt: newBelt,
              weightCategory: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
            },
            select: { id: true, status: true },
          })

          if (!destBracket) {
            // Criar nova chave absoluta
            const wc = await prisma.weightCategory.findFirst({
              where: { sex: newSex as "MASCULINO" | "FEMININO", ageGroup: newAgeGroup as never },
            })
            if (wc) {
              destBracket = await prisma.bracket.create({
                data: { eventId: id, weightCategoryId: wc.id, belt: newBelt as never, isAbsolute: true, bracketNumber: 0 },
                select: { id: true, status: true },
              })
            }
          }
        } else {
          // Chave de peso: procura pela nova categoria + faixa
          destBracket = await prisma.bracket.findFirst({
            where: { eventId: id, isAbsolute: false, belt: newBelt, weightCategoryId: newWeightCategoryId },
            select: { id: true, status: true },
          })

          if (!destBracket) {
            // Criar nova chave de peso
            destBracket = await prisma.bracket.create({
              data: { eventId: id, weightCategoryId: newWeightCategoryId, belt: newBelt as never, isAbsolute: false, bracketNumber: 0 },
              select: { id: true, status: true },
            })
          }
        }

        if (!destBracket) continue

        // Verificar status da chave destino
        if (destBracket.status !== "PENDENTE" && destBracket.status !== "DESIGNADA") {
          return NextResponse.json(
            { error: "A chave de destino já está em andamento. Não é possível mover o atleta." },
            { status: 400 }
          )
        }

        // Adicionar à chave destino
        const nextPos = (await prisma.bracketPosition.count({ where: { bracketId: destBracket.id } })) + 1
        await prisma.bracketPosition.create({
          data: { bracketId: destBracket.id, registrationId: atletaId, position: nextPos },
        })
      }

      // Se isAbsolute mudou de false → true, adicionar na chave absoluta
      if (newIsAbsolute && !registration.isAbsolute) {
        const absPos = registration.bracketPositions.find(p => p.bracket.isAbsolute)
        if (!absPos) {
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
              absBracket = await prisma.bracket.create({
                data: { eventId: id, weightCategoryId: wc.id, belt: newBelt as never, isAbsolute: true, bracketNumber: 0 },
                select: { id: true, status: true },
              })
            }
          }

          if (absBracket) {
            if (absBracket.status !== "PENDENTE" && absBracket.status !== "DESIGNADA") {
              return NextResponse.json(
                { error: "A chave absoluta de destino já está em andamento." },
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

    // Find brackets that contain this registration
    const affectedPositions = await prisma.bracketPosition.findMany({
      where: { registrationId: atletaId },
      select: { bracketId: true },
    })
    const affectedBracketIds = [...new Set(affectedPositions.map((p) => p.bracketId))]

    if (affectedBracketIds.length > 0) {
      // Remove registration from positions
      await prisma.bracketPosition.updateMany({
        where: { registrationId: atletaId },
        data: { registrationId: null },
      })

      // Check which brackets now have zero athletes
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
