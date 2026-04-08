import { prisma } from "@/lib/db"

/**
 * Calcula os pares de índices (0-based) que se enfrentam na próxima rodada
 * para um round com `n` partidas.
 *
 * Regra da árvore de chaves single-elimination:
 *   - Divide o round em dois blocos de n/2 (esquerda e direita da chave)
 *   - Dentro de cada bloco, emparelha a 1ª metade com a 2ª metade elemento a elemento
 *
 * Exemplos:
 *   n=2  → [(0,1)]
 *   n=4  → [(0,1),(2,3)]                              (step=1)
 *   n=8  → [(0,2),(1,3),(4,6),(5,7)]                  (step=2)
 *   n=16 → [(0,4),(1,5),(2,6),(3,7),(8,12)...]        (step=4)
 *
 * Isso garante que, numa chave de 16 posições com 8 partidas na R1,
 * o seed5 (W.O.) enfrente o vencedor de (seed1 vs seed9) e não seed7.
 */
function computeNextRoundPairs(n: number): [number, number][] {
  if (n < 2) return []
  const half = Math.floor(n / 2)
  const quarter = Math.max(1, Math.floor(n / 4))
  const pairs: [number, number][] = []
  for (let b = 0; b < 2; b++) {
    const base = b * half
    for (let i = 0; i < quarter; i++) {
      const idxA = base + i
      const idxB = base + i + quarter
      if (idxA < n && idxB < n) pairs.push([idxA, idxB])
    }
  }
  return pairs
}

/**
 * Propaga vencedores para criar partidas nas rodadas seguintes
 * assim que ambos os atletas de um par já estiverem definidos.
 * Retorna true se o bracket está completo (todas as partidas têm vencedor).
 *
 * O emparelhamento usa `computeNextRoundPairs` que respeita a estrutura
 * da árvore de chaves — posições do mesmo lado da chave só se encontram
 * na semifinal, nunca em rodadas anteriores.
 */
export async function propagateBracket(bracketId: string): Promise<boolean> {
  const allMatches = await prisma.match.findMany({
    where: { bracketId },
    orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
  })

  if (allMatches.length === 0) return false

  // Quantidade de partidas na rodada 1 define a estrutura do bracket inteiro
  const round1Count = allMatches.filter((m) => m.round === 1).length
  if (round1Count === 0) return false

  // Agrupa por rodada
  const byRound = new Map<number, typeof allMatches>()
  for (const m of allMatches) {
    if (!byRound.has(m.round)) byRound.set(m.round, [])
    byRound.get(m.round)!.push(m)
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b)

  for (const round of rounds) {
    // Quantas partidas são esperadas nesta rodada pela progressão da árvore
    const expectedCount = Math.round(round1Count / Math.pow(2, round - 1))
    if (expectedCount <= 1) continue // rodada final, nada a propagar

    const sorted = [...(byRound.get(round) ?? [])].sort((a, b) => a.matchNumber - b.matchNumber)
    const nextRound = round + 1
    const nextRoundMatches = byRound.get(nextRound) ?? []

    const pairs = computeNextRoundPairs(expectedCount)

    for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
      const [i, j] = pairs[pairIdx]
      const nextMN = pairIdx + 1

      if (nextRoundMatches.some((m) => m.matchNumber === nextMN)) continue

      const m1 = sorted[i]
      const m2 = sorted[j]
      if (!m1 || !m2) continue // partida ainda não existe (resultado pendente)
      if (!m1.winnerId || !m2.winnerId) continue // ainda sem vencedor

      const created = await prisma.match.create({
        data: { bracketId, round: nextRound, matchNumber: nextMN, position1Id: m1.winnerId, position2Id: m2.winnerId },
      })
      // Atualiza rastreamento em memória para permitir propagação na mesma chamada
      if (!byRound.has(nextRound)) byRound.set(nextRound, [])
      byRound.get(nextRound)!.push(created)
    }
  }

  const pending = await prisma.match.count({ where: { bracketId, winnerId: null } })
  return pending === 0
}

/**
 * Retorna a partida final real de uma lista de partidas (excluindo W.O. fantasmas).
 */
function getFinalMatch(matches: { round: number; matchNumber: number; position1Id: string | null; position2Id: string | null; winnerId: string | null }[]) {
  const real = matches.filter(m => m.position1Id !== null && m.position2Id !== null)
  if (real.length === 0) return null
  const maxRound = Math.max(...real.map(m => m.round))
  return real.find(m => m.round === maxRound && m.matchNumber === 1) ?? null
}

/**
 * Após uma sub-chave (parte de um grupo com > 16 atletas) ser finalizada,
 * verifica se a sub-chave parceira também terminou e, nesse caso, cria
 * automaticamente a "grande final" entre os dois campeões.
 *
 * A grande final (isGrandFinal=true) é criada com status EM_ANDAMENTO,
 * com 2 BracketPositions (os campeões) e 1 partida já pronta para rodar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any

export async function checkAndCreateGrandFinal(bracketId: string): Promise<void> {
  const bracket = await prismaAny.bracket.findUnique({
    where: { id: bracketId },
    select: {
      id: true, eventId: true, weightCategoryId: true, belt: true,
      isAbsolute: true, bracketGroupId: true, isGrandFinal: true, status: true, tatameId: true,
      positions: { select: { id: true, registrationId: true } },
      matches: { select: { round: true, matchNumber: true, position1Id: true, position2Id: true, winnerId: true } },
    },
  })

  if (!bracket || !bracket.bracketGroupId || bracket.isGrandFinal) return

  // Busca a sub-chave parceira (mesmo grupo, outra, não grande final)
  const partner = await prismaAny.bracket.findFirst({
    where: {
      bracketGroupId: bracket.bracketGroupId,
      id: { not: bracketId },
      isGrandFinal: false,
    },
    select: {
      id: true, status: true, tatameId: true,
      positions: { select: { id: true, registrationId: true } },
      matches: { select: { round: true, matchNumber: true, position1Id: true, position2Id: true, winnerId: true } },
    },
  })

  if (!partner || partner.status !== "FINALIZADA") return

  // Verifica se a grande final já existe
  const existing = await prismaAny.bracket.findFirst({
    where: { bracketGroupId: bracket.bracketGroupId, isGrandFinal: true },
  })
  if (existing) return

  // Determina os campeões de cada sub-chave
  const finalA = getFinalMatch(bracket.matches)
  const finalB = getFinalMatch(partner.matches)
  if (!finalA?.winnerId || !finalB?.winnerId) return

  const champAPos = bracket.positions.find((p: { id: string; registrationId: string | null }) => p.id === finalA.winnerId)
  const champBPos = partner.positions.find((p: { id: string; registrationId: string | null }) => p.id === finalB.winnerId)
  if (!champAPos?.registrationId || !champBPos?.registrationId) return

  // Herda o tatameId da sub-chave para que apareça no coordenador de tatame
  const tatameId = bracket.tatameId ?? partner.tatameId ?? null

  // Obtém o próximo bracketNumber do evento
  const agg = await prisma.bracket.aggregate({
    where: { eventId: bracket.eventId },
    _max: { bracketNumber: true },
  })
  const nextNumber = (agg._max.bracketNumber ?? 0) + 1

  // Cria a grande final como PENDENTE — coordenador inicia manualmente
  const grandFinal = await prismaAny.bracket.create({
    data: {
      eventId: bracket.eventId,
      weightCategoryId: bracket.weightCategoryId,
      belt: bracket.belt,
      isAbsolute: bracket.isAbsolute,
      bracketNumber: nextNumber,
      bracketGroupId: bracket.bracketGroupId,
      isGrandFinal: true,
      status: "PENDENTE",
      ...(tatameId ? { tatameId } : {}),
    },
  })

  const gfPos1 = await prisma.bracketPosition.create({
    data: { bracketId: grandFinal.id, position: 1, registrationId: champAPos.registrationId },
  })
  const gfPos2 = await prisma.bracketPosition.create({
    data: { bracketId: grandFinal.id, position: 2, registrationId: champBPos.registrationId },
  })

  // Cria a partida da grande final (ainda sem resultado)
  await prisma.match.create({
    data: {
      bracketId: grandFinal.id,
      round: 1,
      matchNumber: 1,
      position1Id: gfPos1.id,
      position2Id: gfPos2.id,
    },
  })
}

/**
 * Resets awarded=false and medal=null for all registrations attached to
 * positions in the given bracket. Called whenever a bracket transitions to
 * FINALIZADA so the premiação coordinator always sees a clean state.
 */
export async function resetBracketAwards(bracketId: string): Promise<void> {
  const positions = await prisma.bracketPosition.findMany({
    where: { bracketId },
    select: { registrationId: true },
  })

  const regIds = positions
    .map((p) => p.registrationId)
    .filter((id): id is string => !!id)

  if (regIds.length > 0) {
    await prisma.registration.updateMany({
      where: { id: { in: regIds } },
      data: { awarded: false, medal: null },
    })
  }
}
