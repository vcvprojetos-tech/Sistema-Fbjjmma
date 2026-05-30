import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  const pin = req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.type === "image/png" ? "png" : "jpg"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), "public", "uploads", "peso")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/peso/${filename}` })
}
