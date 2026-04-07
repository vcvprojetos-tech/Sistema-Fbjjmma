import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import path from "path"
import { writeFile, mkdir } from "fs/promises"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const trash = searchParams.get("trash") === "1"
  const search = searchParams.get("search") || ""

  const events = await prisma.event.findMany({
    where: {
      deletedAt: trash ? { not: null } : null,
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      type: true,
      weightTable: true,
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

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

      // Parse remaining fields
      for (const [key, value] of formData.entries()) {
        if (key !== "banner" && key !== "schedule") {
          data[key] = value
        }
      }
    } else {
      data = await req.json()
    }

    const event = await prisma.event.create({
      data: {
        name: data.name as string,
        typeId: data.typeId as string,
        state: data.state as string,
        city: data.city as string,
        location: data.location as string,
        date: new Date(data.date as string),
        registrationDeadline: new Date(data.registrationDeadline as string),
        correctionDeadline: new Date(data.correctionDeadline as string),
        paymentDeadline: new Date(data.paymentDeadline as string),
        checkinRelease: new Date(data.checkinRelease as string),
        bracketRelease: new Date(data.bracketRelease as string),
        weightTableId: data.weightTableId as string,
        value: parseFloat(data.value as string) || 0,
        hasAbsolute: data.hasAbsolute === "true" || data.hasAbsolute === true,
        absoluteValue: data.absoluteValue
          ? parseFloat(data.absoluteValue as string)
          : null,
        registrationOpen:
          data.registrationOpen === "true" || data.registrationOpen === true,
        isVisible: data.isVisible === "true" || data.isVisible === true,
        banner: (data.banner as string) || null,
        schedule: (data.schedule as string) || null,
        about: (data.about as string) || null,
        paymentInfo: (data.paymentInfo as string) || null,
        prize: (data.prize as string) || null,
        weighInInfo: (data.weighInInfo as string) || null,
        imageRights: (data.imageRights as string) || null,
        physicalIntegrity: (data.physicalIntegrity as string) || null,
      },
      include: { type: true, weightTable: true },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("[EVENTOS POST ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao criar evento." },
      { status: 500 }
    )
  }
}
