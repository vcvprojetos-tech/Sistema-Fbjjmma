"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react"
import BracketView from "@/components/admin/BracketView"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juv. A",
  INFANTO_JUVENIL_B: "Infanto Juv. B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

const AGE_GROUP_ORDER = [
  "PRE_MIRIM","MIRIM","INFANTIL_A","INFANTIL_B","INFANTO_JUVENIL_A",
  "INFANTO_JUVENIL_B","JUVENIL","ADULTO","MASTER_1","MASTER_2",
  "MASTER_3","MASTER_4","MASTER_5","MASTER_6",
]

const BELT_ORDER = ["BRANCA","AMARELA_LARANJA_VERDE","AZUL","ROXA","MARROM","PRETA"]

interface EventSummary {
  id: string
  name: string
  date: string
  status: string
}

interface BracketItem {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  bracketGroupId: string | null
  isGrandFinal: boolean
  status: string
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: {
    id: string
    position: number
    registration: {
      id: string
      guestName: string | null
      athlete: { user: { name: string } } | null
      team: { name: string } | null
    } | null
  }[]
  matches: {
    id: string
    round: number
    matchNumber: number
    winnerId: string | null
    position1Id: string | null
    position2Id: string | null
    isWO?: boolean
    woType?: string | null
    woWeight1?: number | null
    woWeight2?: number | null
    endedAt?: string | null
  }[]
}

function bracketLabel(b: BracketItem): string {
  const parts = [
    b.weightCategory.sex === "MASCULINO" ? "M" : "F",
    AGE_GROUP_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup,
    b.isAbsolute ? null : b.weightCategory.name,
    BELT_LABELS[b.belt] || b.belt,
    b.isAbsolute ? "Absoluto" : null,
  ].filter(Boolean).join(" | ")
  if (b.isGrandFinal) return `🏆 Grande Final — ${parts}`
  return parts
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, "")
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        border: `1px solid ${active ? "#dc2626" : "var(--border)"}`,
        backgroundColor: active ? "#dc2626" : "var(--card)",
        color: active ? "#fff" : "var(--muted-foreground)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

export default function ChavesClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventIdParam = searchParams.get("eventId")

  const [events, setEvents] = useState<EventSummary[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam)
  const [eventName, setEventName] = useState("")
  const [brackets, setBrackets] = useState<BracketItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const [sexFilter, setSexFilter] = useState<Set<string>>(new Set())
  const [ageGroupFilter, setAgeGroupFilter] = useState<Set<string>>(new Set())
  const [weightFilter, setWeightFilter] = useState<Set<string>>(new Set())
  const [beltFilter, setBeltFilter] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  // Atualiza o horário a cada minuto para ativar o botão automaticamente
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Carrega lista de eventos disponíveis
  useEffect(() => {
    fetch("/api/public/chaves")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.events)) {
          setEvents(d.events)
          if (!selectedEventId && d.events.length > 0) {
            setSelectedEventId(d.events[0].id)
          }
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega chaves do evento selecionado
  const loadBrackets = useCallback(async (eid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/chaves?eventId=${eid}`)
      const data = await res.json()
      if (data.brackets) {
        setBrackets(data.brackets)
        setEventName(data.event?.name || "")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEventId) loadBrackets(selectedEventId)
  }, [selectedEventId, loadBrackets])

  // Zera filtros ao trocar evento
  const handleEventChange = (id: string) => {
    setSelectedEventId(id)
    setSearch("")
    setSexFilter(new Set())
    setAgeGroupFilter(new Set())
    setWeightFilter(new Set())
    setBeltFilter(new Set())
    router.replace(`/chaves?eventId=${id}`, { scroll: false })
  }

  // Opções disponíveis derivadas das chaves carregadas
  const filterOptions = useMemo(() => {
    const sexes = new Set<string>()
    const ageGroups = new Set<string>()
    const weights = new Set<string>()
    const belts = new Set<string>()
    let hasAbsolute = false
    for (const b of brackets) {
      sexes.add(b.weightCategory.sex)
      ageGroups.add(b.weightCategory.ageGroup)
      if (b.isAbsolute) hasAbsolute = true
      else weights.add(b.weightCategory.name)
      belts.add(b.belt)
    }
    const weightList = [...weights].sort((a, b) => a.localeCompare(b, "pt-BR"))
    if (hasAbsolute) weightList.push("ABSOLUTO")
    return {
      sexes: (["MASCULINO","FEMININO"] as string[]).filter(s => sexes.has(s)),
      ageGroups: AGE_GROUP_ORDER.filter(a => ageGroups.has(a)),
      weights: weightList,
      belts: BELT_ORDER.filter(b => belts.has(b)),
    }
  }, [brackets])

  const activeFilterCount = sexFilter.size + ageGroupFilter.size + weightFilter.size + beltFilter.size

  const clearFilters = () => {
    setSexFilter(new Set())
    setAgeGroupFilter(new Set())
    setWeightFilter(new Set())
    setBeltFilter(new Set())
  }

  const filtered = useMemo(() => brackets.filter(b => {
    if (search.trim()) {
      const q = normalize(search)
      const label = normalize(bracketLabel(b))
      const num = `#${b.bracketNumber}`
      const athletes = b.positions.map(p =>
        normalize(p.registration?.athlete?.user.name ?? p.registration?.guestName ?? "")
      ).join(" ")
      if (!label.includes(q) && !num.includes(q) && !athletes.includes(q)) return false
    }
    if (sexFilter.size > 0 && !sexFilter.has(b.weightCategory.sex)) return false
    if (ageGroupFilter.size > 0 && !ageGroupFilter.has(b.weightCategory.ageGroup)) return false
    if (weightFilter.size > 0) {
      const passAbsoluto = b.isAbsolute && weightFilter.has("ABSOLUTO")
      const passWeight = !b.isAbsolute && weightFilter.has(b.weightCategory.name)
      if (!passAbsoluto && !passWeight) return false
    }
    if (beltFilter.size > 0 && !beltFilter.has(b.belt)) return false
    return true
  }), [brackets, search, sexFilter, ageGroupFilter, weightFilter, beltFilter])

  const selectedEvent = events.find(e => e.id === selectedEventId)
  const painelAtivo = selectedEvent ? new Date(selectedEvent.date).getTime() <= now : false

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Chaves
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Visualize todas as chaves do campeonato
          </p>
        </div>
        {selectedEventId && (
          painelAtivo ? (
            <a
              href={`/painel/${selectedEventId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir painel de chamadas"
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                backgroundColor: "#dc2626", color: "#fff",
                border: "none", cursor: "pointer", textDecoration: "none",
                boxShadow: "0 1px 4px #dc262630",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 19 2 12 11 5 11 19" />
                <polygon points="22 19 13 12 22 5 22 19" />
              </svg>
              Painel de Chamadas
            </a>
          ) : (
            <div
              title={selectedEvent ? `Disponível a partir de ${new Date(selectedEvent.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Aguardando data do evento"}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                backgroundColor: "var(--card)", color: "var(--muted-foreground)",
                border: "1px solid var(--border)", cursor: "not-allowed",
                opacity: 0.5, userSelect: "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 19 2 12 11 5 11 19" />
                <polygon points="22 19 13 12 22 5 22 19" />
              </svg>
              Painel de Chamadas
            </div>
          )
        )}
      </div>

      {/* Seletor de evento + busca + botão filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Dropdown de evento */}
        <div className="relative flex-1">
          <select
            value={selectedEventId || ""}
            onChange={e => handleEventChange(e.target.value)}
            className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium outline-none"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            {events.length === 0 && <option value="">Nenhum evento disponível</option>}
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
        </div>

        {/* Campo de busca */}
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar categoria ou atleta..."
            className="w-full rounded-xl pl-9 pr-8 py-3 text-sm outline-none"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: 16,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Botão filtros */}
        {brackets.length > 0 && (
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
              border: `1px solid ${showFilters || activeFilterCount > 0 ? "#dc2626" : "var(--border)"}`,
              backgroundColor: showFilters || activeFilterCount > 0 ? "#dc262615" : "var(--card)",
              color: showFilters || activeFilterCount > 0 ? "#dc2626" : "var(--muted-foreground)",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: "#dc2626", color: "#fff",
                borderRadius: 999, fontSize: 10, fontWeight: 700,
                padding: "1px 6px", lineHeight: 1.5,
              }}>{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilters && brackets.length > 0 && (
        <div
          className="mb-4 rounded-xl p-4"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
        >
          <div className="flex flex-col gap-4">

            {/* Sexo */}
            {filterOptions.sexes.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Sexo</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.sexes.map(s => (
                    <Chip
                      key={s}
                      label={s === "MASCULINO" ? "Masculino" : "Feminino"}
                      active={sexFilter.has(s)}
                      onClick={() => setSexFilter(toggle(sexFilter, s))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categoria */}
            {filterOptions.ageGroups.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.ageGroups.map(a => (
                    <Chip
                      key={a}
                      label={AGE_GROUP_LABELS[a] || a}
                      active={ageGroupFilter.has(a)}
                      onClick={() => setAgeGroupFilter(toggle(ageGroupFilter, a))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Peso */}
            {filterOptions.weights.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Peso</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.weights.map(w => (
                    <Chip
                      key={w}
                      label={w}
                      active={weightFilter.has(w)}
                      onClick={() => setWeightFilter(toggle(weightFilter, w))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Faixa */}
            {filterOptions.belts.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Faixa</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.belts.map(belt => (
                    <Chip
                      key={belt}
                      label={BELT_LABELS[belt] || belt}
                      active={beltFilter.has(belt)}
                      onClick={() => setBeltFilter(toggle(beltFilter, belt))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Limpar filtros */}
            {activeFilterCount > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer",
                    background: "none", border: "none", padding: 0,
                  }}
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contador */}
      {!loading && brackets.length > 0 && (
        <p className="text-xs mb-6" style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} {filtered.length === 1 ? "chave" : "chaves"}
          {search || activeFilterCount > 0 ? " encontrada(s)" : ` — ${eventName}`}
        </p>
      )}

      {/* Estado vazio / carregando */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl h-32 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : !selectedEventId || events.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
          <p className="text-lg font-semibold">Nenhum evento disponível</p>
          <p className="text-sm mt-1">As chaves serão exibidas assim que um campeonato estiver em andamento.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
          <p className="text-sm font-medium">
            {search.trim() || activeFilterCount > 0
              ? "Nenhuma chave encontrada para os filtros selecionados."
              : "Nenhuma chave gerada para este evento ainda."
            }
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", background: "none", border: "none" }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map(b => (
            <div
              key={b.id}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
            >
              {/* Header da chave */}
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card-alt)" }}
              >
                <span className="text-xs font-bold tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                  #{b.bracketNumber}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {bracketLabel(b)}
                </span>
                {!b.isAbsolute && (
                  <span className="text-xs ml-auto shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    até {b.weightCategory.maxWeight === 999 ? "∞" : `${b.weightCategory.maxWeight}kg`}
                  </span>
                )}
              </div>

              {/* BracketView */}
              <div className="overflow-x-auto p-4">
                <BracketView
                  bracket={{
                    id: b.id,
                    bracketNumber: b.bracketNumber,
                    isAbsolute: b.isAbsolute,
                    weightCategory: b.weightCategory,
                    positions: b.positions.map(p => ({
                      id: p.id,
                      position: p.position,
                      registration: p.registration
                        ? {
                            id: p.registration.id,
                            guestName: p.registration.guestName,
                            athlete: p.registration.athlete,
                            team: p.registration.team,
                            prizePix: null,
                          }
                        : null,
                    })),
                    matches: b.matches,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
