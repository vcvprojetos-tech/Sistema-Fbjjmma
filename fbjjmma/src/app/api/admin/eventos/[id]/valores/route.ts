import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      categoryValues: true,
      weightTable: {
        include: {
          categories: {
            orderBy: [{ ageGroup: "asc" }, { sex: "asc" }],
          },
        },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  }

  // Build a matrix of all sex x ageGroup combos from the weight table categories
  const combos = new Map<string, { sex: string; ageGroup: string }>()
  for (const cat of event.weightTable.categories) {
    const key = `${cat.sex}|${cat.ageGroup}`
    if (!combos.has(key)) {
      combos.set(key, { sex: cat.sex, ageGroup: cat.ageGroup })
    }
  }

  const valuesMap = new Map<string, typeof event.categoryValues[0]>()
  for (const v of event.categoryValues) {
    valuesMap.set(`${v.sex}|${v.ageGroup}`, v)
  }

  const result = Array.from(combos.values()).map((combo) => {
    const existing = valuesMap.get(`${combo.sex}|${combo.ageGroup}`)
    return {
      sex: combo.sex,
      ageGroup: combo.ageGroup,
      value: existing?.value ?? event.value,
      hasAbsolute: existing?.hasAbsolute ?? event.hasAbsolute,
      absoluteValue: existing?.absoluteValue ?? event.absoluteValue,
      id: existing?.id ?? null,
    }
  })

  return NextResponse.json(result)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { values } = body

    if (!Array.isArray(values)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
    }

    for (const v of values) {
      await prisma.eventCategoryValue.upsert({
        where: {
          eventId_sex_ageGroup: {
            eventId: id,
            sex: v.sex,
            ageGroup: v.ageGroup,
          },
        },
        update: {
          value: parseFloat(v.value) || 0,
          hasAbsolute: Boolean(v.hasAbsolute),
          absoluteValue: v.absoluteValue ? parseFloat(v.absoluteValue) : null,
        },
        create: {
          eventId: id,
          sex: v.sex,
          ageGroup: v.ageGroup,
          value: parseFloat(v.value) || 0,
          hasAbsolute: Boolean(v.hasAbsolute),
          absoluteValue: v.absoluteValue ? parseFloat(v.absoluteValue) : null,
        },
      })
    }

    return NextResponse.json({ message: "Valores salvos com sucesso." })
  } catch (error) {
    console.error("[VALORES PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao salvar valores." }, { status: 500 })
  }
}
