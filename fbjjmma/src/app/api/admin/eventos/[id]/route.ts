import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import path from "path"
import { writeFile, mkdir } from "fs/promises"

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
    include: { type: true, weightTable: true },
  })

  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  }

  return NextResponse.json(event)
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
    const contentType = req.headers.get("content-type") || ""
    let data: Record<string, unknown> = {}

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()

      // Handle banner upload
      const bannerFile = formData.get("banner") as File | null
      if (bannerFile && bannerFile.size > 0) {
        const bytes = await bannerFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}-${bannerFile.name.replace(/\s/g, "_")}`
        const uploadDir = path.join(process.cwd(), "public", "uploads", "eventos")
        await mkdir(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, filename), buffer)
        data.banner = `/uploads/eventos/${filename}`
      }

      // Handle schedule upload
      const scheduleFile = formData.get("schedule") as File | null
      if (scheduleFile && scheduleFile.size > 0) {
        const bytes = await scheduleFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}-schedule-${scheduleFile.name.replace(/\s/g, "_")}`
        const uploadDir = path.join(process.cwd(), "public", "uploads", "eventos")
        await mkdir(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, filename), buffer)
        data.schedule = `/uploads/eventos/${filename}`
      }

      // Handle pesoDoc upload
      const pesoDocFile = formData.get("pesoDoc") as File | null
      if (pesoDocFile && pesoDocFile.size > 0) {
        const bytes = await pesoDocFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}-pesodoc-${pesoDocFile.name.replace(/\s/g, "_")}`
        const uploadDir = path.join(process.cwd(), "public", "uploads", "eventos")
        await mkdir(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, filename), buffer)
        data.pesoDoc = `/uploads/eventos/${filename}`
      }

      for (const [key, value] of formData.entries()) {
        if (key !== "banner" && key !== "schedule" && key !== "pesoDoc") {
          data[key] = value
        }
      }
    } else {
      data = await req.json()
    }

    const updateData: Record<string, unknown> = {
      name: data.name,
      typeId: data.typeId,
      state: data.state,
      city: data.city,
      location: data.location,
      date: new Date(data.date as string),
      registrationDeadline: new Date(data.registrationDeadline as string),
      correctionDeadline: new Date(data.correctionDeadline as string),
      paymentDeadline: new Date(data.paymentDeadline as string),
      checkinRelease: new Date(data.checkinRelease as string),
      bracketRelease: new Date(data.bracketRelease as string),
      weightTableId: data.weightTableId,
      value: parseFloat(data.value as string) || 0,
      hasAbsolute: data.hasAbsolute === "true" || data.hasAbsolute === true,
      absoluteValue: data.absoluteValue
        ? parseFloat(data.absoluteValue as string)
        : null,
      registrationOpen:
        data.registrationOpen === "true" || data.registrationOpen === true,
      isVisible: data.isVisible === "true" || data.isVisible === true,
      about: data.about || null,
      paymentInfo: data.paymentInfo || null,
      prize: data.prize || null,
      weighInInfo: data.weighInInfo || null,
      imageRights: data.imageRights || null,
      physicalIntegrity: data.physicalIntegrity || null,
    }

    if (data.banner) updateData.banner = data.banner
    if (data.removeSchedule === "true") updateData.schedule = null
    else if (data.schedule) updateData.schedule = data.schedule
    if (data.removePesoDoc === "true") updateData.pesoDoc = null
    else if (data.pesoDoc) updateData.pesoDoc = data.pesoDoc

    const event = await prisma.event.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.event.update>[0]["data"],
      include: { type: true, weightTable: true },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error("[EVENTOS PUT ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao atualizar evento." },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  try {
    const { status } = await req.json()
    const validStatuses = ["RASCUNHO", "INSCRICOES_ABERTAS", "INSCRICOES_ENCERRADAS", "EM_ANDAMENTO", "ENCERRADO"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 })
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status },
    })
    return NextResponse.json(event)
  } catch (error) {
    console.error("[EVENTOS PATCH ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar status." }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: "Evento movido para a lixeira." })
  } catch (error) {
    console.error("[EVENTOS DELETE ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao excluir evento." },
      { status: 500 }
    )
  }
}
