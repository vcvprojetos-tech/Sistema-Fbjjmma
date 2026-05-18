"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, RotateCcw, Image as ImageIcon, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  border: "1px solid var(--border-alt)",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
}

interface EventType {
  id: string
  name: string
}

interface WeightTable {
  id: string
  name: string
}

interface Event {
  id: string
  name: string
  date: string
  banner: string | null
  city: string
  state: string
  status: string
  registrationOpen: boolean
  isVisible: boolean
  deletedAt: string | null
  type: EventType
  weightTable: WeightTable
}

export default function EventosPage() {
  const [tab, setTab] = useState<"ativos" | "lixeira">("ativos")
  const [search, setSearch] = useState("")
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  async function loadEvents() {
    setLoading(true)
    setApiError(false)
    const params = new URLSearchParams()
    if (tab === "lixeira") params.set("trash", "1")
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/admin/eventos?${params}`)
      if (!res.ok) { setApiError(true); return }
      const data = await res.json()
      if (Array.isArray(data)) setEvents(data)
      else setApiError(true)
    } catch {
      setApiError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search])

  async function handleDelete(id: string) {
    if (!confirm("Mover este evento para a lixeira?")) return
    await fetch(`/api/admin/eventos/${id}`, { method: "DELETE" })
    loadEvents()
  }

  const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    RASCUNHO: { label: "Rascunho", cls: "admin-badge admin-badge-gray" },
    INSCRICOES_ABERTAS: { label: "Inscrições Abertas", cls: "admin-badge admin-badge-green" },
    INSCRICOES_ENCERRADAS: { label: "Inscrições Encerradas", cls: "admin-badge admin-badge-amber" },
    EM_ANDAMENTO: { label: "Em Andamento", cls: "admin-badge admin-badge-blue" },
    ENCERRADO: { label: "Encerrado", cls: "admin-badge admin-badge-gray" },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="admin-page-title">Eventos</p>
          <p className="admin-page-subtitle">Gerencie os eventos da federação</p>
        </div>
        <Link href="/admin/eventos/novo">
          <button className="admin-btn admin-btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Novo Evento
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--card-alt)" }}>
        {(["ativos", "lixeira"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === t ? "#dc2626" : "transparent",
              color: tab === t ? "#ffffff" : "#6b7280",
            }}
          >
            {t === "ativos" ? "ATIVOS" : "LIXEIRA"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
        <Input
          className="pl-9"
          placeholder="Buscar evento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th className="w-16">Banner</th>
                <th>Nome</th>
                <th>Data</th>
                <th className="hidden md:table-cell">Tabela de Peso</th>
                <th className="hidden lg:table-cell">Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : apiError ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>Erro ao carregar eventos</div>
                    <button onClick={loadEvents} style={{ color: "#3b82f6", fontSize: 13, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
                      Tentar novamente
                    </button>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Nenhum evento encontrado.
                  </td>
                </tr>
              ) : (
                events.map((event, index) => {
                  const st = STATUS_CONFIG[event.status] ?? { label: event.status, cls: "admin-badge admin-badge-gray" }
                  return (
                    <tr key={event.id}>
                      <td style={{ color: "var(--muted)" }}>{index + 1}</td>
                      <td>
                        {event.banner ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.banner}
                            alt={event.name}
                            className="w-12 h-8 object-cover rounded"
                          />
                        ) : (
                          <div
                            className="w-12 h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: "var(--card-alt)" }}
                          >
                            <ImageIcon className="h-4 w-4" style={{ color: "var(--muted)" }} />
                          </div>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/eventos/${event.id}`}
                          className="font-semibold hover:text-[#dc2626] transition-colors"
                          style={{ color: "var(--foreground)" }}
                        >
                          {event.name}
                        </Link>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                          {event.city}, {event.state} &bull; {event.type.name}
                        </p>
                      </td>
                      <td className="whitespace-nowrap tabular-nums" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                        {new Date(event.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="hidden md:table-cell" style={{ color: "var(--muted)" }}>
                        {event.weightTable.name}
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className={st.cls}>{st.label}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          {tab === "ativos" ? (
                            <>
                              <Link href={`/admin/eventos/${event.id}`}>
                                <button style={iconBtnStyle} title="Gerenciar">
                                  <Eye size={14} color="#6366f1" />
                                </button>
                              </Link>
                              <Link href={`/admin/eventos/${event.id}/editar`}>
                                <button style={iconBtnStyle} title="Editar">
                                  <Pencil size={14} color="#3b82f6" />
                                </button>
                              </Link>
                              <button style={iconBtnStyle} onClick={() => handleDelete(event.id)} title="Excluir">
                                <Trash2 size={14} color="#dc2626" />
                              </button>
                            </>
                          ) : (
                            <button style={iconBtnStyle} title="Restaurar">
                              <RotateCcw size={14} color="#16a34a" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
