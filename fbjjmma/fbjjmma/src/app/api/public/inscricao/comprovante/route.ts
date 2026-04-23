import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const registrationId = formData.get("registrationId") as string
    const file = formData.get("file") as File | null

    if (!registrationId || !file) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    // Verify registration belongs to this athlete
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { athlete: true },
    })

    if (!user?.athlete) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 })
    }

    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, athleteId: user.athlete.id },
    })

    if (!registration) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 })
    }

    // TODO: In production, upload file to R2/S3 and use the returned URL
    // For now, store the file name as a placeholder
    const proofValue = `pendente_${file.name}_${Date.now()}`

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentProof: proofValue },
    })

    return NextResponse.json({ ok: true, proof: proofValue })
  } catch (error) {
    console.error("[COMPROVANTE POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao enviar comprovante." }, { status: 500 })
  }
}
