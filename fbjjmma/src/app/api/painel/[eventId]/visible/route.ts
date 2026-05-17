import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tatameId, bracketIds } = body
    if (!tatameId || !Array.isArray(bracketIds)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await prisma.tatame.update({
      where: { id: tatameId as string },
      data: {
        panelBracketIds: bracketIds as string[],
        panelUpdatedAt: new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
