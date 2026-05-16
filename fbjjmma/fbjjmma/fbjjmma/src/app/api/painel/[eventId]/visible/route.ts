import { NextRequest, NextResponse } from "next/server"
import { setPanelVisible } from "@/lib/panel-visibility"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tatameId, bracketIds } = body
  if (!tatameId || !Array.isArray(bracketIds)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  setPanelVisible(tatameId as string, bracketIds as string[])
  return NextResponse.json({ ok: true })
}
