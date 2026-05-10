import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  const pin = req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")
  const q = searchParams.get("q")?.trim().toLowerCase() ?? ""
  const sex = searchParams.get("sex") ?? ""
  const ageGroup = searchParams.get("ageGroup") ?? ""
  const belt = searchParams.get("belt") ?? ""
  const weightCategoryId = searchParams.get("weightCategoryId") ?? ""

  if (!eventId) return NextResponse.json({ error: "eventId obrigatório." }, { status: 400 })

  const cutoff = new Date(Date.now() - 2 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brackets = await (prisma.bracket as any).findMany({
    where: {
      eventId,
      ...(belt ? { belt } : {}),
      weightCategory: {
        ...(sex ? { sex } : {}),
        ...(ageGroup ? { ageGroup } : {}),
        ...(weightCategoryId ? { id: weightCategoryId } : {}),
      },
    },
    include: {
      weightCategory: { select: { name: true, ageGroup: true, sex: true, maxWeight: true } },
      tatame: {
        select: {
          name: true,
          operations: {
            where: { endedAt: null, lastHeartbeat: { gte: cutoff } },
            include: { user: { select: { name: true } } },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      },
      positions: {
        include: {
          registration: {
            select: {
              guestName: true,
              athlete: { include: { user: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { bracketNumber: "asc" },
  })

  // Filtro por nome do atleta
  const filtered = q
    ? brackets.filter((b: any) =>
        b.positions.some((p: any) => {
          const name =
            p.registration?.athlete?.user?.name ??
            p.registration?.guestName ??
            ""
          return name.toLowerCase().includes(q)
        })
      )
    : brackets

  // Monta resultado resumido
  const result = filtered.map((b: any) => {
    const athletes: string[] = b.positions
      .map((p: any) =>
        p.registration?.athlete?.user?.name ??
        p.registration?.guestName ??
        null
      )
      .filter(Boolean)

    let localizacao = ""
    let localizacaoTipo: "tatame" | "premiacao" | "aguardando" | "finalizada" | "premiada" = "aguardando"

    if (b.status === "PREMIADA") {
      localizacao = "Premiação concluída"
      localizacaoTipo = "premiada"
    } else if (b.status === "FINALIZADA") {
      localizacao = "Aguardando coordenador de premiação"
      localizacaoTipo = "premiacao"
    } else if ((b.status === "EM_ANDAMENTO" || b.status === "DESIGNADA") && b.tatame) {
      const op = b.tatame.operations?.[0]
      const coord = op?.user?.name ?? null
      localizacao = coord
        ? `${b.tatame.name} — Coordenador: ${coord}`
        : `${b.tatame.name} — sem coordenador ativo`
      localizacaoTipo = "tatame"
    } else {
      localizacao = "Aguardando designação pelo coordenador geral"
      localizacaoTipo = "aguardando"
    }

    return {
      id: b.id,
      bracketNumber: b.bracketNumber,
      belt: b.belt,
      isAbsolute: b.isAbsolute,
      status: b.status,
      weightCategory: b.weightCategory,
      athletes,
      localizacao,
      localizacaoTipo,
      tatameName: b.tatame?.name ?? null,
    }
  })

  return NextResponse.json(result)
}
