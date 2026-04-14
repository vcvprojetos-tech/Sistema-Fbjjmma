"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, MapPin, ChevronRight, Trophy } from "lucide-react"

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
  hasAbsolute: boolean
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
  ENCERRADO: { bg: "var(--card-alt)", text: "#6b7280" },
  RASCUNHO: { bg: "var(--card-alt)", text: "#6b7280" },
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/public/eventos?upcoming=1&limit=6")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setEvents(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section
        className="relative py-24 px-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--background) 0%, #1a0000 50%, var(--background) 100%)",
        }}
      >
        {/* Red glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: "#dc2626" }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <img src="/logo2.png" alt="FBJJMMA" className="w-16 h-16 mx-auto mb-6 object-contain" />
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Federação Baiana de
            <br />
            <span style={{ color: "#dc2626" }}>Jiu-Jitsu MMA</span>
          </h1>
          <p className="mt-4 text-[#9ca3af] text-lg max-w-2xl mx-auto">
            Campeonatos oficiais de Jiu-Jitsu da Bahia. Inscreva-se, compete e conquiste.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/eventos"
              className="px-8 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#dc2626" }}
            >
              Ver Eventos
            </Link>
            <Link
              href="/cadastro"
              className="px-8 py-3 rounded-lg font-semibold border transition-colors hover:border-white hover:text-white"
              style={{ borderColor: "var(--border-alt)", color: "var(--muted-foreground)" }}
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Próximos Eventos</h2>
            <p className="text-[#6b7280] text-sm mt-1">Campeonatos disponíveis para inscrição</p>
          </div>
          <Link
            href="/eventos"
            className="flex items-center gap-1 text-sm text-[#dc2626] hover:text-red-400 transition-colors font-medium"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border h-56 animate-pulse"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div
            className="rounded-xl border p-16 text-center"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <Trophy className="h-10 w-10 text-[var(--border-alt)] mx-auto mb-3" />
            <p className="text-[#6b7280]">Nenhum evento programado no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.RASCUNHO
              const deadline = new Date(event.registrationDeadline)
              const isDeadlinePast = deadline < new Date()

              return (
                <Link
                  key={event.id}
                  href={`/eventos/${event.id}`}
                  className="group block rounded-xl border overflow-hidden hover:border-[#dc2626] transition-colors"
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                >
                  {/* Banner */}
                  {event.banner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.banner}
                      alt={event.name}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-40 flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #1a0000 0%, var(--card) 100%)",
                      }}
                    >
                      <img src="/logo2.png" alt="FBJJMMA" className="w-12 h-12 object-contain opacity-30" />
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
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6b7280] text-xs">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{event.city}, {event.state}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-white font-semibold text-sm">
                        {event.value > 0 ? `R$ ${event.value.toFixed(2)}` : "Gratuito"}
                      </span>
                      {event.registrationOpen && !isDeadlinePast ? (
                        <span className="text-xs text-[#4ade80]">
                          Inscrições abertas
                        </span>
                      ) : (
                        <span className="text-xs text-[#6b7280]">
                          {isDeadlinePast ? "Inscrições encerradas" : "Em breve"}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
