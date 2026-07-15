import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAction, getClientIP } from "@/lib/audit"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
    }

    const body = await req.json()
    const { customSex, customCategory, customBelt, customWeight, athletes } = body as {
      customSex?: string
      customCategory?: string
      customBelt?: string
      customWeight?: string
      athletes: string[]
    }

    if (!athletes || athletes.length < 2) {
      return NextResponse.json({ error: "Informe pelo menos 2 atletas." }, { status: 400 })
    }
    if (athletes.length > 16) {
      return NextResponse.json({ error: "Máximo de 16 atletas por chave personalizada." }, { status: 400 })
    }

    // Próximo número de chave e número de chave personalizada
    const maxBracket = await prisma.bracket.findFirst({
      where: { eventId: id },
      orderBy: { bracketNumber: "desc" },
      select: { bracketNumber: true },
    })
    const bracketNumber = (maxBracket?.bracketNumber ?? 0) + 1

    const customCount = await (prisma as any).bracket.count({
      where: { eventId: id, isCustom: true },
    })
    const customNumber = (customCount ?? 0) + 1

    const bracket = await (prisma as any).bracket.create({
      data: {
        eventId: id,
        bracketNumber,
        isAbsolute: false,
        isCustom: true,
        customNumber,
        customSex: customSex?.trim() || null,
        customCategory: customCategory?.trim() || null,
        customBelt: customBelt?.trim() || null,
        customWeight: customWeight?.trim() || null,
      },
    })

    // Cria posições com os nomes dos atletas
    for (let i = 0; i < athletes.length; i++) {
      await prisma.bracketPosition.create({
        data: {
          bracketId: bracket.id,
          position: i + 1,
          customName: athletes[i]?.trim() || `Atleta ${i + 1}`,
        },
      })
    }

    await logAction({
      userId: session.user.id,
      module: "CHAVES",
      action: "CRIAR_PERSONALIZADA",
      details: {
        evento: event.name,
        numero: customNumber,
        sexo: customSex || null,
        categoria: customCategory || null,
        atletas: athletes.length,
      },
      ip: getClientIP(req),
    })

    return NextResponse.json({ message: "Chave personalizada criada.", bracketId: bracket.id })
  } catch (error: unknown) {
    console.error("[CHAVE PERSONALIZADA POST ERROR]", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao criar chave personalizada.", detail: msg }, { status: 500 })
  }
}
