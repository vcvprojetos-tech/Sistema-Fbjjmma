import fs from "fs"
import path from "path"
import { prisma } from "@/lib/db"

// Diretório onde os arquivos de backup ficam: <raiz do projeto>/data/backups/
const BACKUP_DIR = path.join(process.cwd(), "data", "backups")

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function filePath(eventId: string) {
  return path.join(BACKUP_DIR, `${eventId}.json`)
}

/**
 * Lê o backup em disco para um evento.
 * Retorna null se o arquivo não existir.
 */
export function readBackupFile(eventId: string): object | null {
  try {
    const fp = filePath(eventId)
    if (!fs.existsSync(fp)) return null
    return JSON.parse(fs.readFileSync(fp, "utf-8"))
  } catch {
    return null
  }
}

/**
 * Reconstrói e salva o snapshot completo de chaves finalizadas/premiadas
 * de um evento no arquivo JSON em disco.
 * Chamado toda vez que uma chave passa para FINALIZADA ou PREMIADA.
 */
export async function saveBackupFile(eventId: string): Promise<void> {
  try {
    ensureDir()

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true },
    })
    if (!event) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brackets = await (prisma.bracket as any).findMany({
      where: {
        eventId,
        status: { in: ["FINALIZADA", "PREMIADA"] },
      },
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

    fs.writeFileSync(filePath(eventId), JSON.stringify(backup, null, 2), "utf-8")
  } catch (err) {
    console.error("[BACKUP] Erro ao salvar backup do evento", eventId, err)
  }
}
