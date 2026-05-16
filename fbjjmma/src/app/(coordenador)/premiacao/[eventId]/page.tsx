"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTheme } from "next-themes"
import { ThemeLogo } from "@/components/ThemeLogo"
import { RefreshCw, Trophy, Award, CheckCircle2, ChevronRight, Search, X } from "lucide-react"
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


const PLACE_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string }> = {
  1: { label: "1° Lugar", color: "#fde68a", bg: "#78350f", border: "#fbbf24", icon: "🥇" },
  2: { label: "2° Lugar", color: "#e2e8f0", bg: "#1e293b", border: "#94a3b8", icon: "🥈" },
  3: { label: "3° Lugar", color: "#fdba74", bg: "#431407", border: "#cd7f32", icon: "🥉" },
}

const PLACE_CONFIG_LIGHT: Record<number, { label: string; color: string; bg: string; border: string; icon: string }> = {
  1: { label: "1° Lugar", color: "#78350f", bg: "#fde68a", border: "#d97706", icon: "🥇" },
  2: { label: "2° Lugar", color: "#1e293b", bg: "#cbd5e1", border: "#64748b", icon: "🥈" },
  3: { label: "3° Lugar", color: "#7c2d12", bg: "#fdba74", border: "#ea580c", icon: "🥉" },
}

const MEDAL_BY_PLACE: Record<number, string> = { 1: "OURO", 2: "PRATA", 3: "BRONZE" }

interface RegInfo {
  id: string
  awarded: boolean
  prizePix: string | null
  medal: string | null
  guestName: string | null
  athlete: { user: { id: string; name: string } } | null
  team: { id: string; name: string } | null
}

interface Position {
  id: string
  position: number
  isEliminated: boolean
  registration: RegInfo | null
}

interface Match {
  id: string
  round: number
  matchNumber: number
  position1Id: string | null
  position2Id: string | null
  winnerId: string | null
  isWO: boolean
  woType: string | null
  woWeight1: number | null
  woWeight2: number | null
  endedAt: string | null
}

interface BracketData {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  bracketGroupId?: string | null
  isGrandFinal?: boolean
  updatedAt: string
  weightCategory: { name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: Position[]
  matches: Match[]
}

interface Placement {
  place: 1 | 2 | 3
  positionId: string
  registration: RegInfo | null
}

function getRealMatches(matches: Match[]) {
  return matches.filter((m) => m.position1Id !== null && m.position2Id !== null)
}

function computePlacements(bracket: BracketData, allBrackets?: BracketData[]): Placement[] {
  const { positions, matches } = bracket
  if (positions.length === 0) return []

  // Sub-chave de grupo (não é a Grande Final): retorna apenas o campeão
  if (bracket.bracketGroupId && !bracket.isGrandFinal) {
    if (positions.length === 1 && positions[0].registration)
      return [{ place: 1, positionId: positions[0].id, registration: positions[0].registration }]
    if (!matches || matches.length === 0) return []
    const realMatches = getRealMatches(matches)
    if (realMatches.length === 0) return []
    const maxRound = Math.max(...realMatches.map((m) => m.round))
    const finalMatch = realMatches.find((m) => m.round === maxRound && m.matchNumber === 1)
    if (!finalMatch?.winnerId) return []
    const firstPos = positions.find((p) => p.id === finalMatch.winnerId)
    if (firstPos?.registration)
      return [{ place: 1, positionId: firstPos.id, registration: firstPos.registration }]
    return []
  }

  if (positions.length === 1 && positions[0].registration) {
    // Se o único atleta tomou W.O., não há colocação
    const soloMatch = matches.find(m => m.position1Id !== null && m.position2Id === null)
    if (soloMatch?.isWO) return []
    return [{ place: 1, positionId: positions[0].id, registration: positions[0].registration }]
  }

  if (!matches || matches.length === 0) return []

  const realMatches = getRealMatches(matches)
  if (realMatches.length === 0) return []

  const maxRound = Math.max(...realMatches.map((m) => m.round))
  const finalMatch = realMatches.find((m) => m.round === maxRound && m.matchNumber === 1)
  if (!finalMatch || !finalMatch.winnerId) return []

  const placements: Placement[] = []

  const firstPos = positions.find((p) => p.id === finalMatch.winnerId)
  if (firstPos?.registration)
    placements.push({ place: 1, positionId: firstPos.id, registration: firstPos.registration })

  const secondPosId =
    finalMatch.position1Id === finalMatch.winnerId ? finalMatch.position2Id : finalMatch.position1Id
  const secondPos = positions.find((p) => p.id === secondPosId)
  if (secondPos?.registration)
    placements.push({ place: 2, positionId: secondPos.id, registration: secondPos.registration })

  // 3° lugar
  if (bracket.isGrandFinal && allBrackets && bracket.bracketGroupId) {
    // Grande final: 3° = perdedor da final da sub-chave do campeão geral (apenas 1 terceiro lugar)
    const champRegId = firstPos?.registration?.id
    if (champRegId) {
      const subBrackets = allBrackets.filter(
        (b) => b.bracketGroupId === bracket.bracketGroupId && !b.isGrandFinal
      )
      for (const sub of subBrackets) {
        const subReal = getRealMatches(sub.matches)
        const subMaxRound = subReal.length > 0 ? Math.max(...subReal.map((m) => m.round)) : 0
        const subFinal = subReal.find((m) => m.round === subMaxRound && m.matchNumber === 1)
        if (!subFinal?.winnerId) continue
        const subChamp = sub.positions.find((p) => p.id === subFinal.winnerId)
        if (subChamp?.registration?.id !== champRegId) continue
        // Esta é a sub-chave do campeão — 3° é o perdedor da final dela
        const loserId = subFinal.position1Id === subFinal.winnerId ? subFinal.position2Id : subFinal.position1Id
        const loserPos = sub.positions.find((p) => p.id === loserId)
        if (loserPos?.registration)
          placements.push({ place: 3, positionId: loserPos.id, registration: loserPos.registration })
        break // apenas 1 terceiro lugar
      }
    }
  } else if (maxRound > 1) {
    if (positions.length === 3) {
      const thirdPos = positions.find((p) => p.id !== firstPos?.id && p.id !== secondPos?.id)
      if (thirdPos?.registration) {
        const eliminatedByWO = matches.some(m =>
          m.isWO && m.endedAt && m.winnerId !== thirdPos.id &&
          (m.position1Id === thirdPos.id || m.position2Id === thirdPos.id)
        )
        if (!eliminatedByWO)
          placements.push({ place: 3, positionId: thirdPos.id, registration: thirdPos.registration })
      }
    } else {
      const semiRound = maxRound - 1
      const champSemi = realMatches.find(
        (m) => m.round === semiRound && m.winnerId === finalMatch.winnerId
      )
      const semiHadWO = champSemi?.isWO || (!champSemi && matches.some(m => m.round === semiRound && m.isWO))
      if (champSemi && !semiHadWO) {
        const loserId =
          champSemi.position1Id === champSemi.winnerId ? champSemi.position2Id : champSemi.position1Id
        const loserPos = positions.find((p) => p.id === loserId)
        if (loserPos?.registration)
          placements.push({ place: 3, positionId: loserPos.id, registration: loserPos.registration })
      }
    }
  }

  return placements
}

function catLabel(bracket: BracketData): string {
  const base = [
    bracket.weightCategory.sex === "MASCULINO" ? "M" : "F",
    AGE_GROUP_LABELS[bracket.weightCategory.ageGroup] || bracket.weightCategory.ageGroup,
    bracket.isAbsolute ? null : bracket.weightCategory.name,
    BELT_LABELS[bracket.belt] || bracket.belt,
    bracket.isAbsolute ? "Absoluto" : null,
  ].filter(Boolean).join(" · ")
  if (bracket.isGrandFinal) return `🏆 Grande Final — ${base}`
  if (bracket.bracketGroupId) return `${base} (Sub-chave)`
  return base
}

interface ConsultaResult {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  weightCategory: { name: string; ageGroup: string; sex: string; maxWeight: number }
  athletes: string[]
  localizacao: string
  localizacaoTipo: "tatame" | "premiacao" | "aguardando" | "finalizada" | "premiada"
  tatameName: string | null
}

function consultaCatLabel(r: ConsultaResult): string {
  return [
    r.weightCategory.sex === "MASCULINO" ? "M" : "F",
    AGE_GROUP_LABELS[r.weightCategory.ageGroup] || r.weightCategory.ageGroup,
    r.isAbsolute ? null : r.weightCategory.name,
    BELT_LABELS[r.belt] || r.belt,
    r.isAbsolute ? "Absoluto" : null,
  ].filter(Boolean).join(" · ")
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

function bracketMatchesSearch(bracket: BracketData, query: string): boolean {
  const q = normalize(query)
  if (!q) return false
  return bracket.positions.some((p) => {
    const name = p.registration?.athlete?.user.name ?? p.registration?.guestName ?? ""
    return normalize(name).includes(q)
  })
}


function bracketFinalizedAt(b: BracketData): number {
  const times = b.matches
    .filter(m => m.endedAt)
    .map(m => new Date(m.endedAt!).getTime())
  return times.length > 0 ? Math.max(...times) : 0
}

export default function PremiacaoPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"
  const [eventName, setEventName] = useState("")
  const [brackets, setBrackets] = useState<BracketData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [awarding, setAwarding] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pixModal, setPixModal] = useState<{ bracket: BracketData; placement: Placement } | null>(null)
  const [pixValue, setPixValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sideTab, setSideTab] = useState<"aguardando" | "premiadas">("aguardando")
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [consultaOpen, setConsultaOpen] = useState(false)
  const [consultaQ, setConsultaQ] = useState("")
  const [consultaSex, setConsultaSex] = useState("")
  const [consultaAge, setConsultaAge] = useState("")
  const [consultaBelt, setConsultaBelt] = useState("")
  const [consultaWeight, setConsultaWeight] = useState("")
  const [consultaResults, setConsultaResults] = useState<ConsultaResult[] | null>(null)
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaSnapshot, setConsultaSnapshot] = useState<{ sex: string; age: string; belt: string; weight: string; q: string } | null>(null)

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setShowOverlay(false)
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/premiacao/${eventId}`)
      const data = await res.json()
      if (data.event) {
        setEventName(data.event.name)
        setBrackets(data.brackets || [])

      }
    } catch {
      console.error("Erro ao carregar premiação")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  // Auto-seleciona a primeira pendente quando não há nada selecionado
  useEffect(() => {
    if (selectedId) return
    const primeiras = brackets
      .filter((b) => b.status === "FINALIZADA")
      .sort((a, b) => bracketFinalizedAt(a) - bracketFinalizedAt(b))
    if (primeiras.length > 0) setSelectedId(primeiras[0].id)
  }, [brackets, selectedId])

  // Auto-avança para a próxima chave quando a atual é totalmente premiada
  useEffect(() => {
    if (!selectedId || sideTab !== "aguardando") return
    const isStillPending = pendentes.some((b) => b.id === selectedId)
    if (isStillPending) return
    if (pendentes.length === 0) return
    setSelectedId(pendentes[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brackets])

  const fetchConsulta = useCallback(async () => {
    setConsultaLoading(true)
    try {
      const res = await fetch(`/api/coordenador/consulta?eventId=${eventId}`)
      const data = await res.json()
      if (Array.isArray(data)) setConsultaResults(data)
      else setConsultaResults([])
    } catch {
      setConsultaResults([])
    } finally {
      setConsultaLoading(false)
    }
  }, [eventId])

  const handlePremiar = useCallback(async (bracket: BracketData, placement: Placement, prizePix?: string) => {
    if (!placement.registration) return
    const regId = placement.registration.id
    const medal = MEDAL_BY_PLACE[placement.place] ?? null

    setAwarding((prev) => new Set(prev).add(regId))

    // Optimistic: mark this athlete as awarded in local state
    setBrackets((prev) =>
      prev.map((b) => {
        if (b.id !== bracket.id) return b
        return {
          ...b,
          positions: b.positions.map((p) => {
            if (p.registration?.id !== regId) return p
            return { ...p, registration: { ...p.registration!, awarded: true, medal, ...(prizePix !== undefined ? { prizePix } : {}) } }
          }),
        }
      })
    )

    try {
      const res = await fetch(`/api/premiacao/${eventId}/award`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId, bracketId: bracket.id, medal, ...(prizePix !== undefined ? { prizePix } : {}) }),
      })
      if (!res.ok) throw new Error("Erro")
      // Reload to get fresh bracket status from server (server decides when to mark PREMIADA)
      await load(true)
    } catch {
      // Revert optimistic update
      setBrackets((prev) =>
        prev.map((b) => {
          if (b.id !== bracket.id) return b
          return {
            ...b,
            positions: b.positions.map((p) => {
              if (p.registration?.id !== regId) return p
              return { ...p, registration: { ...p.registration!, awarded: false, medal: null } }
            }),
          }
        })
      )
    } finally {
      setAwarding((prev) => { const s = new Set(prev); s.delete(regId); return s })
    }
  }, [eventId, load])

  // Grupos com grande final: sub-chaves só aparecem após a grande final ser premiada
  const grandFinalGroups = new Set(
    brackets
      .filter((b) => b.isGrandFinal)
      .map((b) => b.bracketGroupId)
      .filter(Boolean) as string[]
  )
  const pendentes = brackets
    .filter((b) => {
      if (b.status !== "FINALIZADA") return false
      // Sub-chave com grande final em andamento: não listar ainda
      if (b.bracketGroupId && !b.isGrandFinal && grandFinalGroups.has(b.bracketGroupId)) return false
      // Chave de 1 atleta que tomou W.O.: não vai para premiação
      if (b.positions.length === 1) {
        const soloMatch = b.matches.find(m => m.position1Id !== null && m.position2Id === null)
        if (soloMatch?.isWO) return false
      }
      // Já totalmente premiada (status travado): não mostrar em aguardando
      const placements = computePlacements(b, brackets)
      if (placements.length > 0 && placements.every(pl => pl.registration?.awarded)) return false
      return true
    })
    .sort((a, b) => bracketFinalizedAt(a) - bracketFinalizedAt(b))
  const premiadas = brackets.filter((b) => {
    if (b.status === "PREMIADA") return true
    // FINALIZADA com todos os colocados já premiados (status travado): tratar como premiada
    if (b.status === "FINALIZADA") {
      const placements = computePlacements(b, brackets)
      if (placements.length > 0 && placements.every(pl => pl.registration?.awarded)) return true
    }
    return false
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const selectedBracket = brackets.find((b) => b.id === selectedId) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b7280]">Carregando...</p>
      </div>
    )
  }

  const regName = pixModal?.placement.registration?.athlete?.user.name ?? pixModal?.placement.registration?.guestName ?? ""

  return (
    <>
    {pixModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        onClick={() => setPixModal(null)}
      >
        <div
          className="rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
          style={{ backgroundColor: "#111", border: "1px solid #333" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <p className="text-xs text-[#6b7280] font-semibold uppercase tracking-wider mb-1">Premiação — 1° Lugar Absoluto</p>
            <p className="text-white font-bold text-lg leading-tight">{regName}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9ca3af]">Chave PIX do atleta <span className="text-[#6b7280] font-normal">(opcional)</span></label>
            <input
              type="text"
              value={pixValue}
              onChange={(e) => setPixValue(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              autoFocus
              className="rounded-xl px-4 py-3 outline-none"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", color: "#fff", fontSize: 16 }}
            />
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setPixModal(null)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const { bracket, placement } = pixModal
                setPixModal(null)
                handlePremiar(bracket, placement, pixValue.trim() || undefined)
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ backgroundColor: "#dc2626", color: "#fff" }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Overlay de entrada em tela cheia */}
    {showOverlay && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 80, height: 80, overflow: "hidden", marginBottom: 24 }}>
          <ThemeLogo className="w-full h-full" />
        </div>
        <div style={{ color: "var(--foreground)", fontSize: "1.4rem", fontWeight: 900, marginBottom: 6 }}>Premiação</div>
        <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 32 }}>{eventName}</div>
        <button
          onClick={enterFullscreen}
          style={{ backgroundColor: "var(--card)", border: "2px solid #dc2626", borderRadius: 12, padding: "16px 40px", color: "#dc2626", fontSize: "1.1rem", fontWeight: 700, cursor: "pointer" }}
        >
          ⛶ Abrir em Tela Cheia
        </button>
        <button
          onClick={() => setShowOverlay(false)}
          style={{ marginTop: 16, background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer" }}
        >
          Continuar sem tela cheia
        </button>
        <button
          onClick={isFullscreen ? () => document.exitFullscreen?.() : enterFullscreen}
          style={{ position: "fixed", bottom: 12, right: 12, zIndex: 1000, backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", fontSize: "0.7rem", padding: "6px 10px", cursor: "pointer" }}>
          {isFullscreen ? "⊠ Sair" : "⛶ Tela Cheia"}
        </button>
      </div>
    )}

    {/* Botão de tela cheia (visível após fechar overlay) */}
    {!showOverlay && (
      <button
        onClick={isFullscreen ? () => document.exitFullscreen?.() : enterFullscreen}
        style={{ position: "fixed", bottom: 12, right: 12, zIndex: 1000, backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", fontSize: "0.7rem", padding: "6px 10px", cursor: "pointer" }}>
        {isFullscreen ? "⊠ Sair" : "⛶ Tela Cheia"}
      </button>
    )}

    {/*  page body  */}
    <div className="flex flex-col h-[calc(100vh-57px)]" style={{ backgroundColor: "var(--page-surface)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-[#fbbf24]" />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>Premiação</h1>
            <p className="text-[#6b7280] text-xs">{eventName}</p>
          </div>
          <button
            onClick={() => { setConsultaOpen(true); fetchConsulta() }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hidden sm:flex"
            style={{ backgroundColor: "var(--btn-sched-bg)", color: "var(--btn-sched-fg)", border: "1px solid var(--btn-sched-br)" }}
          >
            🔍 Consulta
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Campo de busca */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[#6b7280] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar atleta..."
              className="pl-8 pr-7 py-2.5 rounded-lg outline-none w-44"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 16 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 text-[#6b7280] hover:text-white">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-[#fbbf24] font-bold">{pendentes.length} aguardando</span>
            <span className="text-[#a78bfa] font-bold">{premiadas.length} premiadas</span>
          </div>
          <span className="font-mono font-bold text-sm tabular-nums" style={{ color: "var(--foreground)" }}>
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Bahia" })}
          </span>
          <button onClick={() => load(true)} disabled={refreshing} className="p-2 text-[#6b7280] hover:text-white transition-colors">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {brackets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Award className="h-14 w-14 text-[#1f2937]" />
          <p className="text-[#6b7280] font-medium">Nenhuma chave finalizada ainda.</p>
          <p className="text-[#4b5563] text-sm">Aguarde os coordenadores de tatame finalizarem as chaves.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Coluna esquerda — Abas Aguardando/Premiadas */}
          <div className="w-64 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--sidebar-surface)" }}>
            {/* Abas */}
            <div className="flex shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setSideTab("aguardando")}
                className="flex-1 py-3 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "aguardando" ? "#fbbf24" : "#6b7280",
                  borderBottom: sideTab === "aguardando" ? "2px solid #fbbf24" : "2px solid transparent",
                  backgroundColor: "var(--sidebar-surface)",
                }}
              >
                Aguardando ({pendentes.length})
              </button>
              <button
                onClick={() => setSideTab("premiadas")}
                className="flex-1 py-3 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "premiadas" ? "#a78bfa" : "#6b7280",
                  borderBottom: sideTab === "premiadas" ? "2px solid #a78bfa" : "2px solid transparent",
                  backgroundColor: "var(--sidebar-surface)",
                }}
              >
                Premiadas ({premiadas.length})
              </button>
            </div>
            {/* Conteúdo da aba */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery ? (
                brackets.filter(b => bracketMatchesSearch(b, searchQuery)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center gap-2">
                    <p className="text-[#6b7280] text-xs">Nenhum atleta encontrado.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 px-2 py-2">
                    {brackets.filter(b => bracketMatchesSearch(b, searchQuery)).map(b => {
                      const isSelected = b.id === selectedId
                      const isPending = b.status === "FINALIZADA"
                      const isAwarded = b.status === "PREMIADA"
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className="w-full text-left px-3 py-3.5 rounded-lg transition-colors"
                          style={{
                            border: "1px solid var(--border)",
                            borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
                            backgroundColor: isSelected ? "var(--selected-cool)" : "var(--card)",
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                            {isPending && <span className="text-[9px] px-1 rounded font-bold" style={{ backgroundColor: "#92400e", color: "#ffffff" }}>PENDENTE</span>}
                            {isAwarded && <span className="text-[9px] px-1 rounded font-bold" style={{ backgroundColor: "#5b21b6", color: "#ffffff" }}>PREMIADA</span>}
                          </div>
                          <p className="font-medium leading-tight break-words" style={{ color: "var(--foreground)", fontSize: "0.72rem" }}>{catLabel(b)}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {b.positions.filter(p => {
                              const name = p.registration?.athlete?.user.name ?? p.registration?.guestName ?? ""
                              return normalize(name).includes(normalize(searchQuery))
                            }).map(p => (
                              <p key={p.id} className="text-[10px] text-[#3b82f6] font-semibold truncate">
                                {p.registration?.athlete?.user.name ?? p.registration?.guestName}
                              </p>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : sideTab === "aguardando" ? (
                pendentes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center gap-2">
                    <CheckCircle2 className="h-8 w-8" style={{ color: "var(--hdr-done)" }} />
                    <p className="text-xs font-medium" style={{ color: "var(--hdr-done)" }}>Todas premiadas!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 px-2 py-2">
                    {(() => {
                      const rendered: React.ReactNode[] = []
                      const seenGroups = new Set<string>()
                      for (const b of pendentes) {
                        if (b.bracketGroupId) {
                          if (seenGroups.has(b.bracketGroupId)) continue
                          seenGroups.add(b.bracketGroupId)
                          const groupBrackets = pendentes.filter(x => x.bracketGroupId === b.bracketGroupId)
                          const allPlacements = groupBrackets.flatMap(x => computePlacements(x, brackets))
                          const awardedCount = allPlacements.filter(pl => pl.registration?.awarded).length
                          const isSelected = groupBrackets.some(x => x.id === selectedId)
                          const label = catLabel(b).replace(" (Sub-chave)", "").replace("🏆 Grande Final — ", "")
                          rendered.push(
                            <button
                              key={b.bracketGroupId}
                              onClick={() => setSelectedId(groupBrackets[0].id)}
                              className="w-full text-left px-3 py-3.5 rounded-lg transition-colors"
                              style={{
                                border: "1px solid var(--border)",
                                borderLeft: isSelected ? "3px solid #fbbf24" : "3px solid transparent",
                                backgroundColor: isSelected ? "var(--selected-warm)" : "var(--card)",
                              }}
                            >
                              <p className="text-xs text-[#f59e0b] font-semibold">GRUPO — {groupBrackets.length} chaves</p>
                              <p className="font-medium leading-tight mt-0.5 break-words" style={{ color: "var(--foreground)", fontSize: "0.72rem" }}>{label}</p>
                              {allPlacements.length > 0 && (
                                <p className="text-xs text-[#6b7280] mt-1">{awardedCount}/{allPlacements.length} premiado(s)</p>
                              )}
                            </button>
                          )
                        } else {
                          const isSelected = b.id === selectedId
                          const placements = computePlacements(b, brackets)
                          const awardedCount = placements.filter((pl) => pl.registration?.awarded).length
                          rendered.push(
                            <button
                              key={b.id}
                              onClick={() => setSelectedId(b.id)}
                              className="w-full text-left px-3 py-3.5 rounded-lg transition-colors"
                              style={{
                                border: "1px solid var(--border)",
                                borderLeft: isSelected ? "3px solid #fbbf24" : "3px solid transparent",
                                backgroundColor: isSelected ? "var(--selected-warm)" : "var(--card)",
                              }}
                            >
                              <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                              <p className="font-medium leading-tight mt-0.5 break-words" style={{ color: "var(--foreground)", fontSize: "0.72rem" }}>{catLabel(b)}</p>
                              {placements.length > 0 && (
                                <p className="text-xs text-[#6b7280] mt-1">{awardedCount}/{placements.length} premiado(s)</p>
                              )}
                            </button>
                          )
                        }
                      }
                      return rendered
                    })()}
                  </div>
                )
              ) : (
                premiadas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center gap-2">
                    <p className="text-[#4b5563] text-xs">Nenhuma chave premiada ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 px-2 py-2">
                    {premiadas.map((b) => {
                      const isSelected = b.id === selectedId
                      const placements = computePlacements(b, brackets)
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className="w-full text-left px-3 py-3.5 rounded-lg transition-colors"
                          style={{
                            border: "1px solid var(--border)",
                            borderLeft: isSelected ? "3px solid #a78bfa" : "3px solid transparent",
                            backgroundColor: isSelected ? "var(--selected-cool)" : "var(--card)",
                          }}
                        >
                          <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                          <p className="font-medium leading-tight mt-0.5 break-words" style={{ color: "#a78bfa", fontSize: "0.72rem" }}>{catLabel(b)}</p>
                          {placements.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" style={{ color: "var(--hdr-done)" }} />
                              <p className="text-xs" style={{ color: "var(--hdr-done)" }}>{placements.length} premiado(s)</p>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Centro — Detalhe da chave selecionada */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedBracket ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <ChevronRight className="h-10 w-10 text-[#374151]" />
                <p className="text-[#6b7280]">Selecione uma chave na lista à esquerda.</p>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">

                {/* Colocações — coluna fixa esquerda */}
                <div className="w-80 shrink-0 overflow-y-auto p-4 space-y-4 border-r" style={{ borderColor: "var(--border)" }}>
                  {/* Cabeçalho */}
                  <div
                    className="rounded-xl border p-3"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[#6b7280] text-xs">Chave #{selectedBracket.bracketNumber}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${selectedBracket.status === "PREMIADA" ? "badge-premiada" : "badge-finalizada"}`}>
                        {selectedBracket.status === "PREMIADA" ? "Premiada" : "Finalizada"}
                      </span>
                    </div>
                    <p className="font-bold text-xs leading-tight truncate" style={{ color: "var(--foreground)" }}>{catLabel(selectedBracket)}</p>
                    {!selectedBracket.isAbsolute && (
                      <p className="text-[#4b5563] text-xs mt-0.5">
                        até {selectedBracket.weightCategory.maxWeight === 999 ? "∞" : `${selectedBracket.weightCategory.maxWeight}kg`}
                      </p>
                    )}
                  </div>

                  {/* Colocações */}
                  {(() => {
                    const bracketsForPlacements = (() => {
                      if (!selectedBracket.bracketGroupId) return [selectedBracket]
                      const grandFinal = brackets.find(b => b.bracketGroupId === selectedBracket.bracketGroupId && b.isGrandFinal)
                      // Se existe Grande Final, usar só ela para o pódio; senão mostrar campeões das sub-chaves
                      if (grandFinal) return [grandFinal]
                      return brackets.filter(b => b.bracketGroupId === selectedBracket.bracketGroupId && !b.isGrandFinal)
                    })()
                    const placements = bracketsForPlacements.flatMap(b => computePlacements(b, brackets).map(pl => ({ ...pl, sourceBracket: b })))
                    if (placements.length === 0) {
                      return <p className="text-[#6b7280] text-sm text-center py-8">Sem dados de colocação.</p>
                    }
                    return (
                      <div className="space-y-3">
                        {placements.map((pl) => {
                          const cfg = (isLight ? PLACE_CONFIG_LIGHT : PLACE_CONFIG)[pl.place]
                          const awarded = pl.registration?.awarded ?? false
                          const isAwardingNow = awarding.has(pl.registration?.id ?? "")
                          const regName = pl.registration?.athlete?.user.name ?? pl.registration?.guestName ?? "—"
                          const teamName = pl.registration?.team?.name
                          return (
                            <div
                              key={pl.positionId}
                              className="rounded-xl overflow-hidden border"
                              style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
                            >
                              <div className="px-4 py-4 flex items-center gap-3">
                                <span className="text-2xl shrink-0">{cfg.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate" style={{ color: awarded ? "var(--hdr-done)" : "var(--card-foreground)" }}>{regName}</p>
                                  {teamName && <p className="text-xs text-[#6b7280] truncate">{teamName}</p>}
                                  <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                                </div>
                                {awarded ? (
                                  <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ color: "var(--hdr-done)" }}>
                                    <CheckCircle2 className="h-6 w-6" />
                                    <span className="text-xs font-bold">Premiado</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (pl.place === 1 && pl.sourceBracket.isAbsolute) {
                                        setPixModal({ bracket: pl.sourceBracket, placement: pl })
                                        setPixValue(pl.registration?.prizePix ?? "")
                                      } else {
                                        handlePremiar(pl.sourceBracket, pl)
                                      }
                                    }}
                                    disabled={isAwardingNow || !pl.registration}
                                    className="px-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
                                    style={{ backgroundColor: "#dc2626", color: "#fff" }}
                                  >
                                    {isAwardingNow ? "..." : "Premiar"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Chave visual — área direita com scroll */}
                <div className="flex-1 overflow-auto p-5 space-y-6">
                  {(() => {
                    const bracketsToShow = selectedBracket.bracketGroupId
                      ? brackets.filter(b => b.bracketGroupId === selectedBracket.bracketGroupId)
                          .sort((a, b) => {
                            if (a.isGrandFinal !== b.isGrandFinal) return a.isGrandFinal ? 1 : -1
                            return a.bracketNumber - b.bracketNumber
                          })
                      : [selectedBracket]
                    return bracketsToShow.map(b => (
                      <div key={b.id}>
                        {bracketsToShow.length > 1 && (
                          <p className="text-xs font-semibold mb-2" style={{ color: b.isGrandFinal ? "#fbbf24" : "#6b7280" }}>
                            {b.isGrandFinal ? "🏆 Grande Final" : `Sub-chave #${b.bracketNumber}`}
                          </p>
                        )}
                        <BracketView
                          bracket={{
                            id: b.id,
                            bracketNumber: b.bracketNumber,
                            isAbsolute: b.isAbsolute,
                            weightCategory: {
                              id: b.id,
                              name: b.weightCategory.name,
                              ageGroup: b.weightCategory.ageGroup,
                              sex: b.weightCategory.sex,
                              maxWeight: b.weightCategory.maxWeight,
                            },
                            positions: b.positions.map((p) => ({
                              id: p.id,
                              position: p.position,
                              registration: p.registration
                                ? {
                                    id: p.registration.id,
                                    guestName: p.registration.guestName,
                                    athlete: p.registration.athlete,
                                    team: p.registration.team,
                                    prizePix: p.registration.prizePix,
                                  }
                                : null,
                            })),
                            matches: b.matches,
                          }}
                        />
                      </div>
                    ))
                  })()}
                </div>

              </div>
            )}
          </div>


        </div>
      )}
    </div>

      {/* Modal de Consulta de Chaves */}
      {consultaOpen && (() => {
        const closeConsulta = () => {
          setConsultaOpen(false)
          setConsultaSex("")
          setConsultaAge("")
          setConsultaBelt("")
          setConsultaWeight("")
          setConsultaQ("")
          setConsultaSnapshot(null)
        }
        const locColors: Record<string, { badgeBg: string; textColor: string }> = {
          tatame:    { badgeBg: "#15803d", textColor: "#4ade80" },
          premiacao: { badgeBg: "#1d4ed8", textColor: "#60a5fa" },
          premiada:  { badgeBg: "#7c3aed", textColor: "#c084fc" },
          finalizada:{ badgeBg: "#b45309", textColor: "#fbbf24" },
          aguardando:{ badgeBg: "#374151", textColor: "#9ca3af" },
        }
        const weightOptions = Array.from(
          new Map(
            (consultaResults ?? [])
              .filter(r =>
                (!consultaSex || r.weightCategory.sex === consultaSex) &&
                (!consultaAge || r.weightCategory.ageGroup === consultaAge)
              )
              .map(r => [r.weightCategory.name, r.weightCategory])
          ).values()
        ).sort((a, b) => a.maxWeight - b.maxWeight)

        const snap = consultaSnapshot
        const filteredConsulta = snap
          ? (consultaResults ?? []).filter(r => {
              if (snap.sex && r.weightCategory.sex !== snap.sex) return false
              if (snap.age && r.weightCategory.ageGroup !== snap.age) return false
              if (snap.belt && r.belt !== snap.belt) return false
              if (snap.weight && r.weightCategory.name !== snap.weight) return false
              if (snap.q.trim() && !r.athletes.some(a => a.toLowerCase().includes(snap.q.trim().toLowerCase()))) return false
              return true
            })
          : []

        return (
          <>
            <div
              className="fixed inset-0 z-50"
              style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
              onClick={closeConsulta}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: "none" }}>
              <div
                className="w-full max-w-lg rounded-2xl flex flex-col"
                style={{ backgroundColor: "var(--card-alt)", maxHeight: "85vh", pointerEvents: "auto" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
                  <p className="text-white font-bold text-base">🔍 Consulta de Chaves</p>
                  <button onClick={closeConsulta} className="text-[#6b7280] hover:text-white text-lg leading-none">✕</button>
                </div>
                <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
                  <div className="flex gap-2">
                    <select
                      value={consultaSex}
                      onChange={e => { setConsultaSex(e.target.value); setConsultaWeight("") }}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white border outline-none"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <option value="">Sexo</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                    </select>
                    <select
                      value={consultaAge}
                      onChange={e => { setConsultaAge(e.target.value); setConsultaWeight("") }}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white border outline-none"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <option value="">Categorias</option>
                      {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={consultaBelt}
                      onChange={e => setConsultaBelt(e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white border outline-none"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <option value="">Faixa</option>
                      {Object.entries(BELT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <select
                      value={consultaWeight}
                      onChange={e => setConsultaWeight(e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white border outline-none"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                      disabled={consultaLoading || consultaResults === null}
                    >
                      <option value="">Peso</option>
                      {weightOptions.map(w => (
                        <option key={w.name} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome do atleta..."
                    value={consultaQ}
                    onChange={e => setConsultaQ(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") setConsultaSnapshot({ sex: consultaSex, age: consultaAge, belt: consultaBelt, weight: consultaWeight, q: consultaQ }) }}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white border outline-none"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  />
                  <button
                    onClick={() => setConsultaSnapshot({ sex: consultaSex, age: consultaAge, belt: consultaBelt, weight: consultaWeight, q: consultaQ })}
                    disabled={consultaLoading || consultaResults === null}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    {consultaLoading ? "Buscando..." : "Pesquisar"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {(consultaLoading || consultaResults === null) ? (
                    <p className="text-[#6b7280] text-sm text-center py-8">Buscando...</p>
                  ) : snap === null ? (
                    <p className="text-[#4b5563] text-sm text-center py-8">Configure os filtros e clique em Pesquisar.</p>
                  ) : filteredConsulta.length === 0 ? (
                    <p className="text-[#4b5563] text-sm text-center py-8">Nenhuma chave encontrada.</p>
                  ) : (
                    <div className="flex flex-col gap-2 mt-1">
                      {filteredConsulta.map(r => {
                        const col = locColors[r.localizacaoTipo] ?? locColors.aguardando
                        return (
                          <div
                            key={r.id}
                            className="rounded-xl p-3"
                            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white leading-tight">{consultaCatLabel(r)}</p>
                                <p className="text-[#6b7280] text-xs mt-0.5">Chave #{r.bracketNumber}</p>
                                {r.athletes.length > 0 && (
                                  <p className="text-[#9ca3af] text-xs mt-1 leading-relaxed">{r.athletes.join(" · ")}</p>
                                )}
                              </div>
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                                style={{ color: "#ffffff", backgroundColor: col.badgeBg }}
                              >
                                {r.localizacaoTipo === "tatame" ? (r.tatameName ?? "Tatame") :
                                 r.localizacaoTipo === "premiacao" ? "Premiação" :
                                 r.localizacaoTipo === "premiada" ? "Premiada" :
                                 r.localizacaoTipo === "finalizada" ? "Finalizada" : "Aguardando"}
                              </span>
                            </div>
                            <p className="text-xs mt-1.5 leading-snug" style={{ color: col.textColor }}>{r.localizacao}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </>
  )
}
