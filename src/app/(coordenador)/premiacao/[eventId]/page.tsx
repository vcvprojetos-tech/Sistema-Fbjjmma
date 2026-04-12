"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { RefreshCw, Trophy, Award, CheckCircle2, ChevronRight } from "lucide-react"
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
  "PRE_MIRIM", "MIRIM", "INFANTIL_A", "INFANTIL_B",
  "INFANTO_JUVENIL_A", "INFANTO_JUVENIL_B", "JUVENIL",
  "ADULTO", "MASTER_1", "MASTER_2", "MASTER_3", "MASTER_4", "MASTER_5", "MASTER_6",
]

const PLACE_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  1: { label: "1° Lugar", color: "#fbbf24", bg: "#78350f25", icon: "🥇" },
  2: { label: "2° Lugar", color: "#d1d5db", bg: "#37415125", icon: "🥈" },
  3: { label: "3° Lugar", color: "#c97941", bg: "#7c2d1225", icon: "🥉" },
}

const MEDAL_BY_PLACE: Record<number, string> = { 1: "OURO", 2: "PRATA", 3: "BRONZE" }

interface RegInfo {
  id: string
  awarded: boolean
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
}

interface BracketData {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  bracketGroupId?: string | null
  isGrandFinal?: boolean
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
      if (thirdPos?.registration)
        placements.push({ place: 3, positionId: thirdPos.id, registration: thirdPos.registration })
    } else {
      const champSemi = realMatches.find(
        (m) => m.round === maxRound - 1 && m.winnerId === finalMatch.winnerId
      )
      // Se o atleta que seria 3° lugar perdeu por W.O., não há 3° lugar
      if (champSemi && !champSemi.isWO) {
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

function sortBrackets(list: BracketData[]) {
  return [...list].sort((a, b) => {
    const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory.ageGroup)
    const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory.ageGroup)
    if (ageA !== ageB) return ageA - ageB
    if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
    return a.weightCategory.maxWeight - b.weightCategory.maxWeight
  })
}

export default function PremiacaoPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [eventName, setEventName] = useState("")
  const [brackets, setBrackets] = useState<BracketData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [awarding, setAwarding] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/premiacao/${eventId}`)
      const data = await res.json()
      if (data.event) {
        setEventName(data.event.name)
        setBrackets(data.brackets || [])
        setLastUpdated(new Date())
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
    const pendentes = sortBrackets(brackets.filter((b) => b.status === "FINALIZADA"))
    if (pendentes.length > 0) setSelectedId(pendentes[0].id)
  }, [brackets, selectedId])

  const handlePremiar = useCallback(async (bracket: BracketData, placement: Placement) => {
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
            return { ...p, registration: { ...p.registration!, awarded: true, medal } }
          }),
        }
      })
    )

    try {
      const res = await fetch(`/api/premiacao/${eventId}/award`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId, bracketId: bracket.id, medal }),
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
  const pendentes = sortBrackets(
    brackets.filter((b) => {
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
  )
  const premiadas = sortBrackets(brackets.filter((b) => {
    if (b.status === "PREMIADA") return true
    // FINALIZADA com todos os colocados já premiados (status travado): tratar como premiada
    if (b.status === "FINALIZADA") {
      const placements = computePlacements(b, brackets)
      if (placements.length > 0 && placements.every(pl => pl.registration?.awarded)) return true
    }
    return false
  }))
  const selectedBracket = brackets.find((b) => b.id === selectedId) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b7280]">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-[#fbbf24]" />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>Premiação</h1>
            <p className="text-[#6b7280] text-xs">{eventName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-[#4b5563] text-xs hidden sm:inline">
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <div className="flex gap-3 text-xs">
            <span className="text-[#fbbf24] font-bold">{pendentes.length} aguardando</span>
            <span className="text-[#a78bfa] font-bold">{premiadas.length} premiadas</span>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="text-[#6b7280] hover:text-white transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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

          {/* Coluna esquerda — Aguardando premiação */}
          <div className="w-56 shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            <div className="px-3 py-2 border-b sticky top-0 z-10" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
              <span className="text-xs font-bold text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24] inline-block animate-pulse" />
                Aguardando ({pendentes.length})
              </span>
            </div>

            {pendentes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-[#4ade80]" />
                <p className="text-[#4ade80] text-xs font-medium">Todas premiadas!</p>
              </div>
            ) : (
              <div className="flex flex-col">
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
                          className="w-full text-left px-3 py-3 border-b transition-colors"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: isSelected ? "#1a0a00" : "transparent",
                            borderLeft: isSelected ? "3px solid #fbbf24" : "3px solid transparent",
                          }}
                        >
                          <p className="text-xs text-[#f59e0b] font-semibold">GRUPO — {groupBrackets.length} chaves</p>
                          <p className="text-sm font-medium leading-tight mt-0.5 truncate pr-2" style={{ color: "var(--foreground)" }}>{label}</p>
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
                          className="w-full text-left px-3 py-3 border-b transition-colors"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: isSelected ? "#1a0a00" : "transparent",
                            borderLeft: isSelected ? "3px solid #fbbf24" : "3px solid transparent",
                          }}
                        >
                          <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                          <p className="text-sm font-medium leading-tight mt-0.5 truncate pr-2" style={{ color: "var(--foreground)" }}>{catLabel(b)}</p>
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
            )}
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
                <div className="w-80 shrink-0 overflow-y-auto p-5 space-y-4 border-r" style={{ borderColor: "var(--border)" }}>
                  {/* Cabeçalho */}
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: selectedBracket.status === "PREMIADA" ? "#0d0d1a" : "#111",
                      borderColor: selectedBracket.status === "PREMIADA" ? "#4a1d9650" : "#222",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[#6b7280] text-xs">Chave #{selectedBracket.bracketNumber}</p>
                        <p className="text-white font-bold text-lg leading-tight mt-0.5">{catLabel(selectedBracket)}</p>
                        {!selectedBracket.isAbsolute && (
                          <p className="text-[#4b5563] text-sm mt-0.5">
                            até {selectedBracket.weightCategory.maxWeight === 999 ? "∞" : `${selectedBracket.weightCategory.maxWeight}kg`}
                          </p>
                        )}
                      </div>
                      {selectedBracket.status === "PREMIADA" && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold shrink-0" style={{ backgroundColor: "#4a1d9640", color: "#a78bfa" }}>
                          Premiada
                        </span>
                      )}
                    </div>
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
                          const cfg = PLACE_CONFIG[pl.place]
                          const awarded = pl.registration?.awarded ?? false
                          const isAwardingNow = awarding.has(pl.registration?.id ?? "")
                          const regName = pl.registration?.athlete?.user.name ?? pl.registration?.guestName ?? "—"
                          const teamName = pl.registration?.team?.name
                          return (
                            <div
                              key={pl.positionId}
                              className="flex items-center gap-4 rounded-xl px-4 py-4"
                              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}25` }}
                            >
                              <span className="text-3xl shrink-0">{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-bold leading-snug" style={{ color: awarded ? "#4ade80" : "#f9fafb" }}>{regName}</p>
                                {teamName && <p className="text-sm text-[#6b7280] leading-snug">{teamName}</p>}
                                <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                              </div>
                              {awarded ? (
                                <div className="flex flex-col items-center gap-1 text-[#4ade80] shrink-0">
                                  <CheckCircle2 className="h-6 w-6" />
                                  <span className="text-xs font-bold">Premiado</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePremiar(pl.sourceBracket, pl)}
                                  disabled={isAwardingNow || !pl.registration}
                                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
                                  style={{ backgroundColor: "#dc2626", color: "var(--foreground)" }}
                                >
                                  {isAwardingNow ? "..." : "Premiar"}
                                </button>
                              )}
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

          {/* Coluna direita — Premiadas */}
          <div className="w-56 shrink-0 flex flex-col border-l overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            <div className="px-3 py-2 border-b sticky top-0 z-10" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
              <span className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a78bfa] inline-block" />
                Premiadas ({premiadas.length})
              </span>
            </div>

            {premiadas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center gap-2">
                <p className="text-[#4b5563] text-xs">Nenhuma chave premiada ainda.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {premiadas.map((b) => {
                  const isSelected = b.id === selectedId
                  const placements = computePlacements(b, brackets)
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className="w-full text-left px-3 py-3 border-b transition-colors"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: isSelected ? "#0d0d1a" : "transparent",
                        borderLeft: isSelected ? "3px solid #a78bfa" : "3px solid transparent",
                      }}
                    >
                      <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                      <p className="text-sm font-medium leading-tight mt-0.5 truncate pr-2" style={{ color: "#a78bfa" }}>{catLabel(b)}</p>
                      {placements.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-[#4ade80]" />
                          <p className="text-xs text-[#4ade80]">{placements.length} premiado(s)</p>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
