import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const types = await prisma.eventType.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(types)
}
