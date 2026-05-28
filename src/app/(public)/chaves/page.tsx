"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, X, ChevronDown } from "lucide-react"
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

export default function ChavesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventIdParam = searchParams.get("eventId")

  const [events, setEvents] = useState<EventSummary[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam)
  const [eventName, setEventName] = useState("")
  const [brackets, setBrackets] = useState<BracketItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

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

  const handleEventChange = (id: string) => {
    setSelectedEventId(id)
    setSearch("")
    router.replace(`/chaves?eventId=${id}`, { scroll: false })
  }

  const filtered = brackets.filter(b => {
    if (!search.trim()) return true
    const q = normalize(search)
    const label = normalize(bracketLabel(b))
    const num = `#${b.bracketNumber}`
    const athletes = b.positions.map(p =>
      normalize(p.registration?.athlete?.user.name ?? p.registration?.guestName ?? "")
    ).join(" ")
    return label.includes(q) || num.includes(q) || athletes.includes(q)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
          Chaves
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Visualize todas as chaves do campeonato
        </p>
      </div>

      {/* Seletor de evento + busca */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
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
        <div className="relative sm:w-64">
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
      </div>

      {/* Contador */}
      {!loading && brackets.length > 0 && (
        <p className="text-xs mb-6" style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} {filtered.length === 1 ? "chave" : "chaves"}
          {search ? " encontrada(s)" : ` — ${eventName}`}
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
          <p className="text-sm">Nenhuma chave encontrada para &ldquo;{search}&rdquo;</p>
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
