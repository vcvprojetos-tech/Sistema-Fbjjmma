"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, MapPin, Search, Trophy } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Event {
  id: string
  name: string
  city: string
  state: string
  date: string
  registrationDeadline: string
  registrationOpen: boolean
  banner: string | null
  value: number
  status: string
  type: { name: string }
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  INSCRICOES_ABERTAS: "Inscrições Abertas",
  INSCRICOES_ENCERRADAS: "Inscrições Encerradas",
  EM_ANDAMENTO: "Em Andamento",
  ENCERRADO: "Encerrado",
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  INSCRICOES_ABERTAS: { bg: "#16a34a20", text: "#4ade80" },
  INSCRICOES_ENCERRADAS: { bg: "#92400e20", text: "#fbbf24" },
  EM_ANDAMENTO: { bg: "#1e3a5f30", text: "#60a5fa" },
  ENCERRADO: { bg: "#1a1a1a", text: "#6b7280" },
  RASCUNHO: { bg: "#1a1a1a", text: "#6b7280" },
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filtered, setFiltered] = useState<Event[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"todos" | "abertos" | "encerrados">("todos")

  useEffect(() => {
    fetch("/api/public/eventos?limit=50")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setEvents(d)
          setFiltered(d)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = events
    if (search.trim()) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.city.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filter === "abertos") {
      result = result.filter((e) => e.registrationOpen && new Date(e.registrationDeadline) >= new Date())
    } else if (filter === "encerrados") {
      result = result.filter((e) => e.status === "ENCERRADO" || e.status === "INSCRICOES_ENCERRADAS")
    }
    setFiltered(result)
  }, [search, filter, events])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Eventos</h1>
        <p className="text-[#6b7280] mt-2">Todos os campeonatos da FBJJMMA</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
          <Input
            placeholder="Buscar evento ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["todos", "abertos", "encerrados"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize"
              style={{
                backgroundColor: filter === f ? "#dc2626" : "#111111",
                color: filter === f ? "#ffffff" : "#9ca3af",
                border: `1px solid ${filter === f ? "#dc2626" : "#222222"}`,
              }}
            >
              {f === "todos" ? "Todos" : f === "abertos" ? "Abertos" : "Encerrados"}
            </button>
          ))}
        </div>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border h-64 animate-pulse"
              style={{ backgroundColor: "#111111", borderColor: "#222222" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border p-16 text-center"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <Trophy className="h-10 w-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[#6b7280]">Nenhum evento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => {
            const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.RASCUNHO
            const deadline = new Date(event.registrationDeadline)
            const isOpen = event.registrationOpen && deadline >= new Date()

            return (
              <Link
                key={event.id}
                href={`/eventos/${event.id}`}
                className="group block rounded-xl border overflow-hidden hover:border-[#dc2626] transition-colors"
                style={{ backgroundColor: "#111111", borderColor: "#222222" }}
              >
                {event.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.banner}
                    alt={event.name}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-44 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1a0000 0%, #111111 100%)" }}
                  >
                    <div
                      className="w-14 h-14 flex items-center justify-center opacity-30"
                      style={{
                        clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                        backgroundColor: "#dc2626",
                      }}
                    >
                      <span className="text-white font-black text-base">FBJ</span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-[#dc2626] transition-colors">
                      {event.name}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#6b7280] text-xs">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(event.date).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-[#6b7280] text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.city}, {event.state}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-white font-semibold text-sm">
                      {event.value > 0 ? `R$ ${event.value.toFixed(2)}` : "Gratuito"}
                    </span>
                    <span className={`text-xs font-medium ${isOpen ? "text-[#4ade80]" : "text-[#6b7280]"}`}>
                      {isOpen ? "Inscrições abertas" : "Inscrições encerradas"}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
