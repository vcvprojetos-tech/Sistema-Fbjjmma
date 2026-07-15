"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, Users, X } from "lucide-react"
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

type Tab = "admin" | "coord"

const ADMIN_MODULES: Record<string, { label: string; bg: string; text: string }> = {
  USUARIOS:  { label: "Usuários",   bg: "#1e3a5f30", text: "#60a5fa" },
  EVENTOS:   { label: "Eventos",    bg: "#14532d30", text: "#4ade80" },
  CHAVES:    { label: "Chaves",     bg: "#92400e30", text: "#fbbf24" },
  ATLETAS:   { label: "Atletas",    bg: "#1e3a5f30", text: "#a78bfa" },
  SISTEMA:   { label: "Sistema",    bg: "#1f2937",   text: "#9ca3af" },
}

const COORD_MODULES: Record<string, { label: string; bg: string; text: string }> = {
  COORDENADOR: { label: "Coordenador", bg: "#4c1d9530", text: "#c084fc" },
  PREMIACAO:   { label: "Premiação",   bg: "#7f1d1d30", text: "#f87171" },
}

const ADMIN_MODULE_KEYS = Object.keys(ADMIN_MODULES)
const COORD_MODULE_KEYS = Object.keys(COORD_MODULES)

const ALL_MODULE_CONFIG = { ...ADMIN_MODULES, ...COORD_MODULES }

const ACTION_LABELS: Record<string, string> = {
  LOGIN:               "Entrou no sistema",
  CRIAR:               "Criou",
  EDITAR:              "Editou",
  EXCLUIR:             "Excluiu",
  EXCLUIR_PERMANENTE:  "Excluiu permanentemente",
  RESTAURAR:           "Restaurou",
  GERAR:               "Gerou chaves",
  LIMPAR:              "Limpou chaves",
  REINICIAR:           "Reiniciou chave",
  EXCLUIR_CHAVE:       "Excluiu chave",
  TROCAR_POSICAO:      "Trocou posição na chave",
  INSCREVER:           "Inscreveu atleta",
  CANCELAR_INSCRICAO:  "Cancelou inscrição",
  EDITAR_INSCRICAO:    "Editou inscrição",
  EXCLUIR_TODOS:       "Excluiu todos os atletas",
  IMPORTAR_EXCEL:      "Importou planilha Excel",
  EDITAR_ATLETA:       "Editou dados do atleta",
  ACESSO_TATAME:       "Acessou tatame",
  RESULTADO:           "Registrou resultado",
  PREMIAR:             "Premiou atleta",
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
  const labels: Record<string, string> = {
    nome: "Nome", perfil: "Perfil", id: "ID", evento: "Evento",
    eventId: "Evento ID", quantidade: "Qtd", tatame: "Tatame",
    atleta: "Atleta", importados: "Importados", erros: "Erros",
    chave: "Chave nº", bracketId: "Chave ID", matchId: "Partida",
    tipo: "Tipo", medal: "Medalha",
  }
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${labels[k] ?? k}: ${v}`)
    .join(" · ")
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>("admin")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterModule, setFilterModule] = useState("")
  const [filterDays, setFilterDays] = useState<number>(-1)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (session?.user?.role !== "PRESIDENTE") router.replace("/admin")
  }, [session, status, router])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })

    if (filterModule) {
      params.set("module", filterModule)
    } else {
      const moduleKeys = tab === "admin" ? ADMIN_MODULE_KEYS : COORD_MODULE_KEYS
      params.set("modules", moduleKeys.join(","))
    }

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
  }, [filterModule, filterDays, tab])

  useEffect(() => { load(1) }, [load])

  function switchTab(t: Tab) {
    setTab(t)
    setFilterModule("")
    setPage(1)
  }

  function changePage(p: number) {
    if (p < 1 || p > pages) return
    load(p)
  }

  if (status === "loading") return null

  const currentModules = tab === "admin" ? ADMIN_MODULES : COORD_MODULES

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

      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--card-alt)" }}>
        <button
          onClick={() => switchTab("admin")}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === "admin" ? "#dc2626" : "transparent",
            color: tab === "admin" ? "#fff" : "var(--muted-foreground)",
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          Administração
        </button>
        <button
          onClick={() => switchTab("coord")}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === "coord" ? "#dc2626" : "transparent",
            color: tab === "coord" ? "#fff" : "var(--muted-foreground)",
          }}
        >
          <Users className="h-4 w-4" />
          Coordenadores de Tatame
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Módulo */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--card-alt)" }}>
          {[{ label: "Todos", value: "" }, ...Object.entries(currentModules).map(([k, v]) => ({ label: v.label, value: k }))].map((opt) => (
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
                const mod = ALL_MODULE_CONFIG[log.module]
                const actionLabel = ACTION_LABELS[log.action] ?? log.action
                const details = formatDetails(log.details)
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[var(--card-alt)] transition-colors cursor-pointer"
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

      {/* Modal de detalhes */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho do modal */}
            <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="space-y-1">
                <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                  {formatDate(selectedLog.createdAt)}
                </p>
                <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                  {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const mod = ALL_MODULE_CONFIG[selectedLog.module]
                    return mod ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: mod.bg, color: mod.text }}>
                        {mod.label}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedLog.module}</span>
                    )
                  })()}
                  {selectedLog.user && (
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      por <strong>{selectedLog.user.name}</strong> ({ROLE_LABELS[selectedLog.user.role] ?? selectedLog.user.role})
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--card-alt)]"
                style={{ color: "var(--muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo do modal — detalhes */}
            <div className="p-5 space-y-3">
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(selectedLog.details).map(([k, v]) => {
                    const keyLabels: Record<string, string> = {
                      nome: "Nome", perfil: "Perfil", id: "ID", evento: "Evento",
                      eventId: "Evento ID", quantidade: "Quantidade", tatame: "Tatame",
                      atleta: "Atleta", atletaA: "Atleta A", atletaB: "Atleta B",
                      importados: "Importados", erros: "Erros", chave: "Chave",
                      bracketId: "Chave ID", matchId: "Partida ID", tipo: "Tipo",
                      medal: "Medalha", eventNome: "Evento", de: "De", para: "Para",
                      categoria: "Categoria de Peso", faixa: "Faixa",
                      sexo: "Sexo", categoria_idade: "Categoria Etária",
                      absoluto: "Absoluto", status: "Status",
                      saiu_de: "Saiu da Chave", entrou_em: "Entrou na Chave",
                    }
                    return (
                      <div key={k} className="flex gap-3 items-start">
                        <span
                          className="text-xs font-medium min-w-[100px] pt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {keyLabels[k] ?? k}
                        </span>
                        <span
                          className="text-sm break-all"
                          style={{ color: "var(--foreground)" }}
                        >
                          {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--muted)" }}>Sem detalhes adicionais.</p>
              )}

              {selectedLog.ip && (
                <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    IP: {selectedLog.ip}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
