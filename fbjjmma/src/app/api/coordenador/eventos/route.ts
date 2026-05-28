import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const events = await prisma.event.findMany({
    where: { deletedAt: null, status: { not: "ENCERRADO" } },
    select: { id: true, name: true, date: true, status: true },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(events, { headers: { "Cache-Control": "no-store" } })
}
