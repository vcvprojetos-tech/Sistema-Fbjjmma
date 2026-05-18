import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readBackupFile, saveBackupFile } from "@/lib/event-backup"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id: eventId } = await params

  // Tenta ler do arquivo em disco primeiro
  const fileData = readBackupFile(eventId)
  if (fileData) {
    const event = (fileData as { event: { name: string } }).event
    const filename = `backup_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`
    return new NextResponse(JSON.stringify(fileData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  // Fallback: lê do banco (e salva o arquivo para próximas vezes)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, date: true },
  })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brackets = await (prisma.bracket as any).findMany({
    where: { eventId, status: { in: ["FINALIZADA", "PREMIADA"] } },
    include: {
      weightCategory: { select: { name: true, ageGroup: true, sex: true } },
      positions: {
        include: {
          registration: {
            include: {
              athlete: { include: { user: { select: { name: true } } } },
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      matches: {
        include: {
          position1: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { name: true } } } },
                  team: { select: { name: true } },
                },
              },
            },
          },
          position2: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { name: true } } } },
                  team: { select: { name: true } },
                },
              },
            },
          },
          winner: {
            include: {
              registration: {
                include: {
                  athlete: { include: { user: { select: { name: true } } } },
                  team: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
    orderBy: { bracketNumber: "asc" },
  })

  const backup = {
    exportedAt: new Date().toISOString(),
    event: { id: event.id, name: event.name, date: event.date },
    totalBrackets: brackets.length,
    brackets,
  }

  // Salva no disco para próximas consultas
  if (brackets.length > 0) {
    await saveBackupFile(eventId)
  }

  const filename = `backup_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
