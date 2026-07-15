"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LogEntry {
  id: string
  userId: string | null
  module: string
  action: string
  details: Record<string, unknown> | null
  ip: string | null
  createdAt: string
  user: { name: string; role: string } | null
}

const MODULE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  USUARIOS:     { label: "Usuários",    bg: "#1e3a5f30", text: "#60a5fa" },
  EVENTOS:      { label: "Eventos",     bg: "#14532d30", text: "#4ade80" },
  CHAVES:       { label: "Chaves",      bg: "#92400e30", text: "#fbbf24" },
  COORDENADOR:  { label: "Coordenador", bg: "#4c1d9530", text: "#c084fc" },
}

const ACTION_LABELS: Record<string, string> = {
  CRIAR:              "Criou",
  EDITAR:             "Editou",
  EXCLUIR:            "Excluiu",
  EXCLUIR_PERMANENTE: "Excluiu permanentemente",
  RESTAURAR:          "Restaurou",
  GERAR:              "Gerou chaves",
  LIMPAR:             "Limpou chaves",
  REINICIAR:          "Reiniciou chave",
  ACESSO_TATAME:      "Acessou tatame",
}

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE:         "Presidente",
  COORDENADOR_GERAL:  "Coord. Geral",
  COORDENADOR_TATAME: "Coord. Tatame",
}

const DATE_RANGES = [
  { label: "Hoje",    days: 0 },
  { label: "7 dias",  days: 7 },
  { label: "30 dias", days: 30 },
  { label: "Tudo",    days: -1 },
] as const

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return ""
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const labels: Record<string, string> = {
        nome: "Nome", perfil: "Perfil", id: "ID", evento: "Evento",
        eventId: "Evento ID", quantidade: "Qtd", tatame: "Tatame",
      }
      return `${labels[k] ?? k}: ${v}`
    })
    .join(" · ")
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [filterModule, setFilterModule] = useState("")
  const [filterDays, setFilterDays] = useState<number>(-1)

  useEffect(() => {
    if (status === "loading") return
    if (session?.user?.role !== "PRESIDENTE") {
      router.replace("/admin")
    }
  }, [session, status, router])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (filterModule) params.set("module", filterModule)
    if (filterDays >= 0) {
      const from = new Date()
      from.setDate(from.getDate() - filterDays)
      from.setHours(0, 0, 0, 0)
      params.set("from", from.toISOString())
    }
    try {
      const res = await fetch(`/api/admin/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
      setPage(data.page ?? 1)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filterModule, filterDays])

  useEffect(() => { load(1) }, [load])

  function changePage(p: number) {
    if (p < 1 || p > pages) return
    load(p)
  }

  if (status === "loading") return null

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-[#dc2626]" />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Logs de Atividade</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Registro de todas as ações realizadas no sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Módulo */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--card-alt)" }}>
          {[{ label: "Todos", value: "" }, ...Object.entries(MODULE_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterModule(opt.value); setPage(1) }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterModule === opt.value ? "#dc2626" : "transparent",
                color: filterModule === opt.value ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Período */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--card-alt)" }}>
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => { setFilterDays(r.days); setPage(1) }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterDays === r.days ? "#dc2626" : "transparent",
                color: filterDays === r.days ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => load(page)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-[var(--card-alt)]"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </button>
      </div>

      {/* Contagem */}
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {total === 0 ? "Nenhum registro encontrado." : `${total} registro${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
      </p>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Módulo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Ação</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--muted)" }}>Detalhes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden xl:table-cell" style={{ color: "var(--muted)" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : logs.map((log) => {
                const mod = MODULE_CONFIG[log.module]
                const actionLabel = ACTION_LABELS[log.action] ?? log.action
                const details = formatDetails(log.details)
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--card-alt)] transition-colors"
                    style={{ borderBottom: "1px solid var(--card-alt)" }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{log.user.name}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            {ROLE_LABELS[log.user.role] ?? log.user.role}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>Sistema</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mod ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: mod.bg, color: mod.text }}
                        >
                          {mod.label}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{log.module}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {actionLabel}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {details}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell font-mono text-xs" style={{ color: "var(--muted)" }}>
                      {log.ip ?? "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= pages || loading}>
              Próxima <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
