import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(_req: NextRequest) {
  const session = await auth()

  if (session?.user?.sessionId) {
    await (prisma as any).userSession.update({
      where: { id: session.user.sessionId },
      data: { invalidatedAt: new Date() },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
