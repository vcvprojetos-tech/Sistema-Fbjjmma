import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { subscribeToTatame } from "@/lib/tatame-events"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tatameId: string }> }
) {
  const session = await auth()
  const pin = req.nextUrl.searchParams.get("pin")
  if (!session && !pin) return new Response("Não autorizado.", { status: 401 })
  if (!session && pin) {
    const tatame = await (await import("@/lib/db")).prisma.tatame.findFirst({ where: { id: (await params).tatameId, pin } })
    if (!tatame) return new Response("Não autorizado.", { status: 401 })
  }

  const { tatameId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Initial comment to establish the connection
      controller.enqueue(encoder.encode(": connected\n\n"))

      // Subscribe: push "data: refresh\n\n" whenever the tatame is updated
      const unsubscribe = subscribeToTatame(tatameId, () => {
        try {
          controller.enqueue(encoder.encode("data: refresh\n\n"))
        } catch {
          // Stream already closed — nothing to do
        }
      })

      // Keepalive comment every 25s to prevent proxy/browser timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          clearInterval(keepalive)
        }
      }, 25000)

      req.signal.addEventListener("abort", () => {
        unsubscribe()
        clearInterval(keepalive)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering if used
    },
  })
}
