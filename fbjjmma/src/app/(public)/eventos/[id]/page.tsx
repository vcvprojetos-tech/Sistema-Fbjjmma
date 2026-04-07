"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CalendarDays, MapPin, Clock, Users, ChevronRight } from "lucide-react"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim (4-5 anos)",
  MIRIM: "Mirim (6-7 anos)",
  INFANTIL_A: "Infantil A (8-9 anos)",
  INFANTIL_B: "Infantil B (10-11 anos)",
  INFANTO_JUVENIL_A: "Infanto Juvenil A (12-13 anos)",
  INFANTO_JUVENIL_B: "Infanto Juvenil B (14-15 anos)",
  JUVENIL: "Juvenil (16-17 anos)",
  ADULTO: "Adulto (18-29 anos)",
  MASTER_1: "Master 1 (30-35 anos)",
  MASTER_2: "Master 2 (36-40 anos)",
  MASTER_3: "Master 3 (41-45 anos)",
  MASTER_4: "Master 4 (46-50 anos)",
  MASTER_5: "Master 5 (51-55 anos)",
  MASTER_6: "Master 6 (56-60 anos)",
}

interface WeightCategory {
  id: string
  ageGroup: string
  sex: string
  name: string
  maxWeight: number
  order: number
}

interface CategoryValue {
  id: string
  sex: string
  ageGroup: string
  value: number
  hasAbsolute: boolean
  absoluteValue: number | null
}

interface Event {
  id: string
  name: string
  city: string
  state: string
  location: string
  date: string
  registrationDeadline: string
  correctionDeadline: string
  paymentDeadline: string
  checkinRelease: string
  bracketRelease: string
  registrationOpen: boolean
  value: number
  hasAbsolute: boolean
  absoluteValue: number | null
  banner: string | null
  schedule: string | null
  about: string | null
  paymentInfo: string | null
  prize: string | null
  weighInInfo: string | null
  imageRights: string | null
  physicalIntegrity: string | null
  status: string
  type: { name: string }
  weightTable: {
    name: string
    categories: WeightCategory[]
  }
  categoryValues: CategoryValue[]
  _count: { registrations: number }
}

type Tab = "sobre" | "categorias" | "premiacao" | "programacao" | "pagamento"

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  INSCRICOES_ABERTAS: { bg: "#16a34a20", text: "#4ade80" },
  INSCRICOES_ENCERRADAS: { bg: "#92400e20", text: "#fbbf24" },
  EM_ANDAMENTO: { bg: "#1e3a5f30", text: "#60a5fa" },
  ENCERRADO: { bg: "#1a1a1a", text: "#6b7280" },
  RASCUNHO: { bg: "#1a1a1a", text: "#6b7280" },
}

const STATUS_LABELS: Record<string, string> = {
  INSCRICOES_ABERTAS: "Inscrições Abertas",
  INSCRICOES_ENCERRADAS: "Inscrições Encerradas",
  EM_ANDAMENTO: "Em Andamento",
  ENCERRADO: "Encerrado",
  RASCUNHO: "Em breve",
}

function dateStr(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}
function dateTimeStr(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function EventoPublicPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("sobre")

  useEffect(() => {
    fetch(`/api/public/eventos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setEvent(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-[#6b7280]">
        Carregando...
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6b7280]">Evento não encontrado.</p>
        <Link href="/eventos" className="text-[#dc2626] text-sm mt-4 inline-block">
          ← Voltar para Eventos
        </Link>
      </div>
    )
  }

  const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.RASCUNHO
  const deadline = new Date(event.registrationDeadline)
  const isOpen = event.registrationOpen && deadline >= new Date()

  const allTabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "sobre" as Tab, label: "Sobre", show: true },
    { key: "categorias" as Tab, label: "Categorias", show: true },
    { key: "premiacao" as Tab, label: "Premiação", show: !!event.prize },
    { key: "programacao" as Tab, label: "Programação", show: !!event.schedule },
    { key: "pagamento" as Tab, label: "Pagamento", show: !!event.paymentInfo },
  ]
  const tabs = allTabs.filter((t) => t.show)

  // Group categories by age group + sex
  const groupMap = new Map<string, WeightCategory[]>()
  for (const cat of event.weightTable.categories) {
    const key = `${cat.ageGroup}|${cat.sex}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(cat)
  }

  return (
    <div>
      {/* Banner */}
      {event.banner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.banner} alt={event.name} className="w-full max-h-80 object-cover" />
      ) : (
        <div
          className="w-full h-48 sm:h-64"
          style={{ background: "linear-gradient(135deg, #1a0000 0%, #111111 100%)" }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <Link href="/eventos" className="hover:text-white transition-colors">
            Eventos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white truncate">{event.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight flex-1">
                {event.name}
              </h1>
              <span
                className="text-sm px-3 py-1 rounded-full flex-shrink-0 font-medium"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
              >
                {STATUS_LABELS[event.status] || event.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: "Data do evento", value: dateStr(event.date) },
                { icon: MapPin, label: "Local", value: `${event.city}, ${event.state}` },
                { icon: Clock, label: "Prazo de inscrição", value: dateTimeStr(event.registrationDeadline) },
                { icon: Users, label: "Atletas inscritos", value: String(event._count.registrations) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                >
                  <item.icon className="h-4 w-4 text-[#dc2626] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#6b7280]">{item.label}</p>
                    <p className="text-sm text-white font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registration card */}
          <div
            className="rounded-xl border p-6 space-y-4 lg:w-72 flex-shrink-0"
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            <div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wider">Valor da inscrição</p>
              <p className="text-3xl font-black text-white mt-1">
                {event.value > 0 ? `R$ ${event.value.toFixed(2)}` : "Gratuito"}
              </p>
              {event.hasAbsolute && event.absoluteValue && (
                <p className="text-xs text-[#6b7280] mt-1">
                  + R$ {event.absoluteValue.toFixed(2)} absoluto
                </p>
              )}
            </div>

            <div className="space-y-2 text-xs text-[#6b7280]">
              <div className="flex justify-between">
                <span>Correção até:</span>
                <span className="text-[#9ca3af]">{dateStr(event.correctionDeadline)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagamento até:</span>
                <span className="text-[#9ca3af]">{dateStr(event.paymentDeadline)}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="text-[#9ca3af]">{dateStr(event.checkinRelease)}</span>
              </div>
              <div className="flex justify-between">
                <span>Chaves em:</span>
                <span className="text-[#9ca3af]">{dateStr(event.bracketRelease)}</span>
              </div>
            </div>

            {isOpen ? (
              <Link
                href={`/eventos/${event.id}/inscrever`}
                className="block w-full py-3 text-center font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#dc2626" }}
              >
                Inscrever-se
              </Link>
            ) : (
              <div
                className="w-full py-3 text-center text-sm rounded-lg"
                style={{ backgroundColor: "#1a1a1a", color: "#6b7280" }}
              >
                {event.status === "ENCERRADO"
                  ? "Evento encerrado"
                  : deadline < new Date()
                  ? "Inscrições encerradas"
                  : "Inscrições em breve"}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div
            className="flex gap-1 border-b"
            style={{ borderColor: "#222222" }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
                style={{
                  borderColor: activeTab === t.key ? "#dc2626" : "transparent",
                  color: activeTab === t.key ? "#ffffff" : "#6b7280",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {activeTab === "sobre" && (
              <div className="space-y-6">
                {event.about && (
                  <div
                    className="rounded-xl border p-6"
                    style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                  >
                    <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                      Sobre o Evento
                    </h3>
                    <div
                      className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: event.about }}
                    />
                  </div>
                )}
                <div
                  className="rounded-xl border p-6"
                  style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                >
                  <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                    Local
                  </h3>
                  <p className="text-white font-medium">{event.location}</p>
                  <p className="text-[#6b7280] text-sm">{event.city}, {event.state}</p>
                </div>
                {event.weighInInfo && (
                  <div
                    className="rounded-xl border p-6"
                    style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                  >
                    <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                      Pesagem
                    </h3>
                    <div
                      className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: event.weighInInfo }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "categorias" && (
              <div className="space-y-4">
                {Array.from(groupMap.entries()).map(([key, cats]) => {
                  const [ageGroup, sex] = key.split("|")
                  return (
                    <div
                      key={key}
                      className="rounded-xl border overflow-hidden"
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                    >
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: "1px solid #222222" }}
                      >
                        <h4 className="text-sm font-semibold text-white">
                          {AGE_GROUP_LABELS[ageGroup] || ageGroup}
                        </h4>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: sex === "MASCULINO" ? "#1e3a5f30" : "#4c1d9530",
                            color: sex === "MASCULINO" ? "#60a5fa" : "#c084fc",
                          }}
                        >
                          {sex === "MASCULINO" ? "Masculino" : "Feminino"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ backgroundColor: "#1a1a1a" }}>
                        {cats.map((cat) => (
                          <div
                            key={cat.id}
                            className="px-3 py-2"
                            style={{ backgroundColor: "#111111" }}
                          >
                            <p className="text-white text-xs font-medium">{cat.name}</p>
                            <p className="text-[#6b7280] text-xs">
                              {cat.maxWeight >= 999 ? "Acima" : `até ${cat.maxWeight}kg`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === "premiacao" && event.prize && (
              <div
                className="rounded-xl border p-6"
                style={{ backgroundColor: "#111111", borderColor: "#222222" }}
              >
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Premiação
                </h3>
                <div
                  className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: event.prize }}
                />
              </div>
            )}

            {activeTab === "programacao" && event.schedule && (
              <div
                className="rounded-xl border p-6"
                style={{ backgroundColor: "#111111", borderColor: "#222222" }}
              >
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Programação
                </h3>
                {event.schedule.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.schedule} alt="Programação" className="rounded-lg max-w-full" />
                ) : (
                  <div
                    className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: event.schedule }}
                  />
                )}
              </div>
            )}

            {activeTab === "pagamento" && event.paymentInfo && (
              <div
                className="rounded-xl border p-6"
                style={{ backgroundColor: "#111111", borderColor: "#222222" }}
              >
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Informações de Pagamento
                </h3>
                <div
                  className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: event.paymentInfo }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
