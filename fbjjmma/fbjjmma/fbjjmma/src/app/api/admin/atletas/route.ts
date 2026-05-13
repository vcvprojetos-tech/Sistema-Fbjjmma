import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const nome = searchParams.get("nome") || ""
  const sexo = searchParams.get("sexo") || ""
  const faixa = searchParams.get("faixa") || ""
  const equipeId = searchParams.get("equipeId") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (sexo) where.sex = sexo
  if (faixa) where.belt = faixa
  if (equipeId) where.teamId = equipeId
  if (nome) {
    where.user = {
      name: { contains: nome, mode: "insensitive" },
    }
  }

  const [athletes, total] = await Promise.all([
    prisma.athlete.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, cpf: true, isActive: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: "asc" } },
      skip,
      take: limit,
    }),
    prisma.athlete.count({ where }),
  ])

  return NextResponse.json({ athletes, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      name,
      cpf,
      email,
      password,
      phone,
      birthDate,
      sex,
      belt,
      weight,
      teamId,
      professor,
      street,
      city,
      state,
      zipCode,
      isAffiliated,
      photo,
    } = body

    const existing = await prisma.user.findFirst({
      where: { OR: [{ cpf }, { email }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: "CPF ou e-mail já cadastrado." },
        { status: 400 }
      )
    }

    const bcrypt = await import("bcryptjs")
    const hashed = await bcrypt.hash(password || cpf.replace(/\D/g, ""), 10)

    const user = await prisma.user.create({
      data: {
        name,
        cpf,
        email,
        password: hashed,
        phone: phone || null,
        role: "ATLETA",
        athlete: {
          create: {
            birthDate: new Date(birthDate),
            sex,
            belt: belt || "BRANCA",
            weight: parseFloat(weight) || 0,
            teamId: teamId || null,
            professor: professor || null,
            street: street || null,
            city: city || null,
            state: state || null,
            zipCode: zipCode || null,
            isAffiliated: isAffiliated === true || isAffiliated === "true",
            photo: photo || null,
          },
        },
      },
      include: {
        athlete: {
          include: {
            team: true,
          },
        },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[ATLETAS POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao criar atleta." }, { status: 500 })
  }
}
