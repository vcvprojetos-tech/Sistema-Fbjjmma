import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  // Bloqueia path traversal
  if (segments.some((s) => s.includes(".."))) {
    return NextResponse.json({ error: "Proibido." }, { status: 403 })
  }

  const filePath = path.join(process.cwd(), "public", "uploads", ...segments)

  try {
    const file = await readFile(filePath)
    const ext = segments[segments.length - 1].split(".").pop()?.toLowerCase() ?? ""
    const contentType = MIME_MAP[ext] ?? "application/octet-stream"

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 })
  }
}
