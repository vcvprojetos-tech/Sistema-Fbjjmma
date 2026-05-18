"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, RotateCcw, Image as ImageIcon, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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

  async function loadEvents() {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === "lixeira") params.set("trash", "1")
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/admin/eventos?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setEvents(data)
    } catch {
      console.error("Erro ao carregar eventos")
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

  const STATUS_COLORS: Record<string, string> = {
    RASCUNHO: "#6b7280",
    INSCRICOES_ABERTAS: "#16a34a",
    INSCRICOES_ENCERRADAS: "#d97706",
    EM_ANDAMENTO: "#2563eb",
    ENCERRADO: "#6b7280",
  }

  const STATUS_LABELS: Record<string, string> = {
    RASCUNHO: "Rascunho",
    INSCRICOES_ABERTAS: "Inscrições Abertas",
    INSCRICOES_ENCERRADAS: "Inscrições Encerradas",
    EM_ANDAMENTO: "Em Andamento",
    ENCERRADO: "Encerrado",
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Gerencie os eventos da federação
          </p>
        </div>
        <Link href="/admin/eventos/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
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
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-16">
                  Banner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden md:table-cell">
                  Tabela de Peso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden lg:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#6b7280]">
                    Carregando...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#6b7280]">
                    Nenhum evento encontrado.
                  </td>
                </tr>
              ) : (
                events.map((event, index) => (
                  <tr
                    key={event.id}
                    style={{ borderBottom: "1px solid var(--card-alt)" }}
                    className="hover:bg-[var(--card-alt)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6b7280]">{index + 1}</td>
                    <td className="px-4 py-3">
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
                          <ImageIcon className="h-4 w-4 text-[var(--border-alt)]" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/eventos/${event.id}`}
                        className="text-white font-medium hover:text-[#dc2626] transition-colors"
                      >
                        {event.name}
                      </Link>
                      <p className="text-[#6b7280] text-xs">
                        {event.city}, {event.state} &bull; {event.type.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell">
                      {event.weightTable.name}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[event.status] || "#6b7280"}20`,
                          color: STATUS_COLORS[event.status] || "#9ca3af",
                        }}
                      >
                        {STATUS_LABELS[event.status] || event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {tab === "ativos" ? (
                          <>
                            <Link href={`/admin/eventos/${event.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link href={`/admin/eventos/${event.id}/editar`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-[#dc2626]"
                              onClick={() => handleDelete(event.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-green-400"
                            title="Restaurar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
