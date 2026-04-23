import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const upcoming = searchParams.get("upcoming") === "1"
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  const where = {
    deletedAt: null,
    isVisible: true,
    ...(upcoming ? { date: { gte: new Date() } } : {}),
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      date: true,
      registrationDeadline: true,
      registrationOpen: true,
      banner: true,
      value: true,
      hasAbsolute: true,
      absoluteValue: true,
      status: true,
      type: { select: { name: true } },
    },
  })

  return NextResponse.json(events)
}
