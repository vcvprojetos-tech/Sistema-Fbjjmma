import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      cpf,
      birthDate,
      email,
      phone,
      sex,
      belt,
      weight,
      teamId,
      professor,
      street,
      city,
      state,
      zipCode,
      password,
    } = body

    // Validations
    if (!name || !cpf || !birthDate || !email || !sex || !belt || !weight || !password) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      )
    }

    // Format CPF for storage (with mask)
    const rawCpf = cpf.replace(/\D/g, "")
    if (rawCpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 })
    }
    const formattedCpf = rawCpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    )

    // Check CPF uniqueness
    const existingCpf = await prisma.user.findFirst({
      where: {
        OR: [{ cpf: formattedCpf }, { cpf: rawCpf }],
      },
    })
    if (existingCpf) {
      return NextResponse.json(
        { error: "CPF já cadastrado no sistema." },
        { status: 409 }
      )
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: "E-mail já cadastrado no sistema." },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and athlete in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          cpf: formattedCpf,
          email: email.toLowerCase(),
          phone: phone || null,
          password: hashedPassword,
          role: "ATLETA",
        },
      })

      await tx.athlete.create({
        data: {
          userId: newUser.id,
          birthDate: new Date(birthDate),
          sex,
          belt,
          weight: parseFloat(weight),
          teamId: teamId || null,
          professor: professor || null,
          street: street || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
        },
      })

      return newUser
    })

    // TODO: Send verification email
    console.log(`[REGISTER] New athlete registered: ${user.email} (${user.id})`)

    return NextResponse.json(
      { message: "Cadastro realizado com sucesso!", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("[REGISTER ERROR]", error)
    return NextResponse.json(
      { error: "Erro interno. Tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
