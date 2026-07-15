import { prisma } from "@/lib/db"

export function getClientIP(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  )
}

export async function logAction(params: {
  userId?: string | null
  module: string
  action: string
  details?: Record<string, unknown> | null
  ip?: string | null
}) {
  try {
    await prisma.auditLog.create({ data: params })
  } catch {
    // Nunca deixar o log quebrar o fluxo principal
  }
}
