import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null, isVisible: true },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      location: true,
      date: true,
      registrationDeadline: true,
      correctionDeadline: true,
      paymentDeadline: true,
      checkinRelease: true,
      bracketRelease: true,
      registrationOpen: true,
      value: true,
      hasAbsolute: true,
      absoluteValue: true,
      banner: true,
      schedule: true,
      about: true,
      paymentInfo: true,
      prize: true,
      weighInInfo: true,
      imageRights: true,
      physicalIntegrity: true,
      status: true,
      type: { select: { name: true } },
      weightTable: {
        select: {
          name: true,
          categories: {
            orderBy: [{ ageGroup: "asc" }, { sex: "asc" }, { order: "asc" }],
          },
        },
      },
      categoryValues: true,
      _count: {
        select: { registrations: true },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  }

  return NextResponse.json(event)
}
