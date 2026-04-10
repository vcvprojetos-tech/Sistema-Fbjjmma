"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { RefreshCw, AlertCircle, ChevronRight, Trophy } from "lucide-react"
import Link from "next/link"
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

interface BracketPositionData {
  id: string
  position: number
  isEliminated: boolean
  registration: {
    id: string
    athlete: { user: { id: string; name: string } } | null
    guestName: string | null
    team: { name: string } | null
  } | null
}

interface MatchData {
  id: string
  round: number
  matchNumber: number
  position1Id: string | null
  position2Id: string | null
  winnerId: string | null
  isWO: boolean
  woType: string | null
  startedAt: string | null
  endedAt: string | null
  position1: BracketPositionData | null
  position2: BracketPositionData | null
  winner: { id: string } | null
}

interface BracketData {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  bracketGroupId?: string | null
  isGrandFinal?: boolean
  weightCategory: { id?: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: BracketPositionData[]
  matches: MatchData[]
}

interface TatameData {
  id: string
  name: string
  pin: string
  event: { id: string; name: string; status: string }
  brackets: BracketData[]
  operations: { user: { name: string }; startedAt: string }[]
}

function getAthleteName(pos: BracketPositionData | null): string {
  if (!pos?.registration) return "BYE"
  return pos.registration.athlete?.user.name ?? pos.registration.guestName ?? "—"
}

function getAthleteTeam(pos: BracketPositionData | null): string | null {
  return pos?.registration?.team?.name ?? null
}

function catLabel(b: BracketData): string {
  const base = [
    b.weightCategory.sex === "MASCULINO" ? "M" : "F",
    AGE_GROUP_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup,
    b.isAbsolute ? null : b.weightCategory.name,
    BELT_LABELS[b.belt] || b.belt,
    b.isAbsolute ? "Absoluto" : null,
  ].filter(Boolean).join(" · ")
  if (b.isGrandFinal) return `🏆 Grande Final — ${base}`
  if (b.bracketGroupId) return `${base} (Sub-chave)`
  return base
}

function sortBrackets(list: BracketData[]) {
  return [...list].sort((a, b) => {
    const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory.ageGroup)
    const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory.ageGroup)
    if (ageA !== ageB) return ageA - ageB
    if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
    return (a.weightCategory.maxWeight ?? 0) - (b.weightCategory.maxWeight ?? 0)
  })
}

export default function TatamePage() {
  const { tatameId } = useParams<{ tatameId: string }>()
  const [tatame, setTatame] = useState<TatameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [woModal, setWoModal] = useState<{ matchId: string; winnerId: string; bracketId: string } | null>(null)
  const [pesoStep, setPesoStep] = useState(false)
  const [pesoInput, setPesoInput] = useState("")

  const getPin = useCallback(() => sessionStorage.getItem(`tatame_pin_${tatameId}`) ?? "", [tatameId])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/coordenador/tatame/${tatameId}`, {
        headers: { "x-tatame-pin": getPin() },
      })
      const data = await res.json()
      if (data.id) setTatame(data)
    } catch {
      console.error("Erro ao carregar tatame")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tatameId, getPin])

  useEffect(() => { load() }, [load])

  // Desconectar ao sair da página
  useEffect(() => {
    const disconnect = () => {
      const pin = getPin()
      if (!pin) return
      navigator.sendBeacon(
        `/api/coordenador/tatame/${tatameId}`,
        new Blob([JSON.stringify({})], { type: "application/json" })
      )
      // sendBeacon não suporta headers customizados, usamos fetch com keepalive
      fetch(`/api/coordenador/tatame/${tatameId}`, {
        method: "PATCH",
        headers: { "x-tatame-pin": pin },
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener("beforeunload", disconnect)
    return () => {
      window.removeEventListener("beforeunload", disconnect)
      disconnect()
    }
  }, [tatameId, getPin])

  // SSE: server pushes "refresh" instantly when brackets change
  useEffect(() => {
    const pin = getPin()
    const es = new EventSource(`/api/coordenador/tatame/${tatameId}/stream?pin=${encodeURIComponent(pin)}`)
    es.onmessage = () => load(true)
    es.onerror = () => es.close()
    return () => es.close()
  }, [tatameId, load, getPin])

  // Fallback polling every 10s (covers SSE reconnect gaps)
  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  // Auto-seleciona a primeira em andamento ou pendente
  useEffect(() => {
    if (!tatame || selectedId) return
    const active = sortBrackets(
      tatame.brackets.filter(b => b.status === "EM_ANDAMENTO" || b.status === "PENDENTE" || b.status === "DESIGNADA")
    )
    if (active.length > 0) setSelectedId(active[0].id)
  }, [tatame, selectedId])

  const iniciarChave = useCallback(async (bracketId: string) => {
    setActionLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/iniciar`, {
        method: "POST",
        headers: { "x-tatame-pin": getPin() },
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Erro ao iniciar chave.")
      else await load(true)
    } catch {
      setError("Erro de conexão.")
    } finally {
      setActionLoading(false)
    }
  }, [load, getPin])

  const declararVencedor = useCallback(async (bracketId: string, matchId: string, winnerId: string, isWO = false, woType?: string, woWeight?: string) => {
    setActionLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ winnerId, isWO, woType: woType || null, woWeight: woWeight ? parseFloat(woWeight) : null }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Erro ao registrar resultado.")
      else await load(true)
    } catch {
      setError("Erro de conexão.")
    } finally {
      setActionLoading(false)
      setWoModal(null)
      setPesoStep(false)
      setPesoInput("")
    }
  }, [load, getPin])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b7280]">Carregando...</p>
      </div>
    )
  }

  if (!tatame) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-[#6b7280]">Tatame não encontrado.</p>
        <Link href="/coordenador" className="text-[#dc2626] text-sm underline">Voltar</Link>
      </div>
    )
  }

  // Grupos: só vão para "Finalizadas" quando a Grande Final do grupo está FINALIZADA/PREMIADA
  const groupDone = new Set<string>()
  for (const b of tatame.brackets) {
    if (b.bracketGroupId && b.isGrandFinal && (b.status === "FINALIZADA" || b.status === "PREMIADA"))
      groupDone.add(b.bracketGroupId)
  }
  const groupEmAndamento = new Set<string>()
  for (const b of tatame.brackets) {
    if (b.bracketGroupId && !groupDone.has(b.bracketGroupId) && b.status === "EM_ANDAMENTO")
      groupEmAndamento.add(b.bracketGroupId)
  }

  const emAndamento = sortBrackets(tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "EM_ANDAMENTO"
    return !groupDone.has(b.bracketGroupId) && groupEmAndamento.has(b.bracketGroupId)
  }))
  const pendentes = sortBrackets(tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "PENDENTE" || b.status === "DESIGNADA"
    return !groupDone.has(b.bracketGroupId) && !groupEmAndamento.has(b.bracketGroupId)
  }))
  const finalizadas = sortBrackets(tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "FINALIZADA" || b.status === "PREMIADA"
    return groupDone.has(b.bracketGroupId)
  }))
  const selectedBracket = tatame.brackets.find(b => b.id === selectedId) ?? null
  const operador = tatame.operations[0]

  // Se o bracket selecionado faz parte de um grupo, agrega todos do grupo
  const bracket = selectedBracket
  const groupBrackets = bracket?.bracketGroupId
    ? tatame.brackets.filter(b => b.bracketGroupId === bracket.bracketGroupId).sort((a, b) => {
        if (a.isGrandFinal !== b.isGrandFinal) return a.isGrandFinal ? 1 : -1
        return a.bracketNumber - b.bracketNumber
      })
    : bracket ? [bracket] : []
  const isGroup = groupBrackets.length > 1

  // Confrontos: todos os brackets ativos no grupo
  const currentMatches = groupBrackets.flatMap(b =>
    b.matches
      .filter(m => !m.winnerId && m.position1Id !== null && m.position2Id !== null)
      .map(m => ({ ...m, _bracketId: b.id }))
  ).sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)

  // Para exibir progresso: total de partidas no grupo
  const allGroupMatches = groupBrackets.flatMap(b => b.matches)
  const maxRound = allGroupMatches.length > 0 ? Math.max(...allGroupMatches.map(m => m.round)) : 0

  // Pódio: sempre calculado a partir da Grande Final (se grupo) ou do bracket simples
  const podiumBracket = isGroup
    ? (groupBrackets.find(b => b.isGrandFinal) ?? null)
    : bracket
  const podiumRealMatches = podiumBracket?.matches.filter(m => m.position1Id !== null && m.position2Id !== null) ?? []
  const podiumLastMatch = podiumRealMatches.length > 0
    ? [...podiumRealMatches].sort((a, b) => b.round - a.round || b.matchNumber - a.matchNumber)[0] ?? null
    : null
  const champion = (podiumBracket?.status === "FINALIZADA" || podiumBracket?.status === "PREMIADA") && podiumLastMatch?.winnerId
    ? podiumBracket.positions.find(p => p.id === podiumLastMatch.winnerId) ?? null
    : null
  const runnerUp = (podiumBracket?.status === "FINALIZADA" || podiumBracket?.status === "PREMIADA") && podiumLastMatch
    ? podiumBracket.positions.find(p =>
        p.id === (podiumLastMatch.winnerId === podiumLastMatch.position1Id ? podiumLastMatch.position2Id : podiumLastMatch.position1Id)
      ) ?? null
    : null
  // 3° lugar: perdedor da final da sub-chave do campeão geral
  const thirdPlace: BracketPositionData | null = (() => {
    if (!podiumBracket || (podiumBracket.status !== "FINALIZADA" && podiumBracket.status !== "PREMIADA") || !podiumLastMatch?.winnerId) return null
    if (!isGroup) {
      // Chave simples: 3° = perdedor da semi do campeão
      const podiumMaxRound = podiumRealMatches.length > 0 ? Math.max(...podiumRealMatches.map(m => m.round)) : 0
      if (podiumBracket.positions.length === 3) {
        const firstId = podiumLastMatch.winnerId
        const secondId = podiumLastMatch.winnerId === podiumLastMatch.position1Id ? podiumLastMatch.position2Id : podiumLastMatch.position1Id
        return podiumBracket.positions.find(p => p.id !== firstId && p.id !== secondId) ?? null
      }
      if (podiumMaxRound < 2) return null
      const semi = podiumRealMatches.find(m => m.round === podiumMaxRound - 1 && m.winnerId === podiumLastMatch.winnerId)
      if (!semi) return null
      const loserId = semi.winnerId === semi.position1Id ? semi.position2Id : semi.position1Id
      return loserId ? podiumBracket.positions.find(p => p.id === loserId) ?? null : null
    }
    // Grupo: 3° = perdedor da final da sub-chave do campeão geral
    const champRegId = champion?.registration?.id
    if (!champRegId) return null
    const subBrackets = groupBrackets.filter(b => !b.isGrandFinal)
    for (const sub of subBrackets) {
      const subReal = sub.matches.filter(m => m.position1Id && m.position2Id)
      const subMax = subReal.length > 0 ? Math.max(...subReal.map(m => m.round)) : 0
      const subFinal = subReal.find(m => m.round === subMax && m.matchNumber === 1)
      if (!subFinal?.winnerId) continue
      const subChamp = sub.positions.find(p => p.id === subFinal.winnerId)
      if (subChamp?.registration?.id !== champRegId) continue
      // Esta é a sub-chave do campeão — o 3° é o perdedor da final desta sub-chave
      const loserId = subFinal.position1Id === subFinal.winnerId ? subFinal.position2Id : subFinal.position1Id
      return loserId ? sub.positions.find(p => p.id === loserId) ?? null : null
    }
    return null
  })()

  function SideColumn({
    title, color, dot, items, emptyText,
  }: {
    title: string
    color: string
    dot: string
    items: { section?: string; brackets: BracketData[] }[]
    emptyText: string
  }) {
    const allBrackets = items.flatMap(i => i.brackets)
    return (
      <div className="w-56 shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: "var(--border)" }}>
        <div className="px-3 py-2 border-b sticky top-0 z-10" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: dot === "pulse" ? color : color }} />
            {title}
          </span>
        </div>
        {allBrackets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4 py-8 text-center">
            <p className="text-[#4b5563] text-xs">{emptyText}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map(({ section, brackets }) => (
              <div key={section ?? "default"}>
                {section && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4b5563]">{section}</p>
                )}
                {(() => {
                  const rendered: React.ReactNode[] = []
                  const seenGroups = new Set<string>()
                  for (const b of brackets) {
                    if (b.bracketGroupId && !b.isGrandFinal) {
                      if (seenGroups.has(b.bracketGroupId)) continue
                      seenGroups.add(b.bracketGroupId)
                      const group = brackets.filter(x => x.bracketGroupId === b.bracketGroupId && !x.isGrandFinal)
                      const grandFinal = brackets.find(x => x.bracketGroupId === b.bracketGroupId && x.isGrandFinal)
                      const allInGroup = grandFinal ? [...group, grandFinal] : group
                      const groupIsSelected = allInGroup.some(x => x.id === selectedId)
                      const groupIsActive = group.some(x => x.status === "EM_ANDAMENTO")
                      rendered.push(
                        <button
                          key={b.bracketGroupId}
                          onClick={() => setSelectedId(group[0].id)}
                          className="w-full text-left px-3 py-3 border-b transition-colors"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: groupIsSelected ? (groupIsActive ? "#1a0d00" : "#0d0d1a") : "transparent",
                            borderLeft: groupIsSelected ? `3px solid ${groupIsActive ? "#fbbf24" : color}` : "3px solid transparent",
                          }}
                        >
                          <p className="text-xs text-[#f59e0b] font-semibold">GRUPO — {group.length} sub-chaves</p>
                          <p className="text-sm font-medium leading-tight mt-0.5 truncate pr-2"
                            style={{ color: groupIsActive ? "#fbbf24" : "#e5e7eb" }}>
                            {catLabel(b).replace(" (Sub-chave)", "")}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                            {group.reduce((s, x) => s + x.positions.length, 0)} atleta(s) no total
                          </p>
                        </button>
                      )
                    } else if (!b.bracketGroupId) {
                      const isSelected = b.id === selectedId
                      const isActive = b.status === "EM_ANDAMENTO"
                      rendered.push(
                        <button
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className="w-full text-left px-3 py-3 border-b transition-colors"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: isSelected ? (isActive ? "#1a0d00" : "#0d0d1a") : "transparent",
                            borderLeft: isSelected ? `3px solid ${isActive ? "#fbbf24" : color}` : "3px solid transparent",
                          }}
                        >
                          <p className="text-xs text-[#6b7280]">Chave #{b.bracketNumber}</p>
                          <p className="text-sm font-medium leading-tight mt-0.5 truncate pr-2"
                            style={{ color: isActive ? "#fbbf24" : b.status === "FINALIZADA" || b.status === "PREMIADA" ? color : "#e5e7eb" }}>
                            {catLabel(b)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                            {b.positions.length} atleta(s) · {b.matches.filter(m => m.winnerId).length}/{b.matches.length} partidas
                          </p>
                        </button>
                      )
                    }
                  }
                  return rendered
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <Link href="/coordenador" className="text-[#6b7280] hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>{tatame.name}</h1>
            <p className="text-[#6b7280] text-xs">{tatame.event.name}</p>
          </div>
          {operador && (
            <span className="text-xs text-[#4ade80] hidden sm:inline">
              · Op: {operador.user.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs">
            {emAndamento.length > 0 && <span className="text-[#fbbf24] font-bold">{emAndamento.length} em andamento</span>}
            <span className="text-[#6b7280] font-bold">{pendentes.length} aguardando</span>
            <span className="text-[#4ade80] font-bold">{finalizadas.length} finalizadas</span>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="text-[#6b7280] hover:text-white transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {tatame.brackets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[#6b7280] font-medium">Nenhuma chave atribuída a este tatame.</p>
          <p className="text-[#4b5563] text-sm">Aguarde o administrador atribuir as chaves.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Coluna esquerda — Em andamento + Aguardando */}
          <SideColumn
            title={`Ativas (${emAndamento.length + pendentes.length})`}
            color="#fbbf24"
            dot="pulse"
            items={[
              { section: emAndamento.length > 0 ? "Em Andamento" : undefined, brackets: emAndamento },
              { section: pendentes.length > 0 ? "Aguardando" : undefined, brackets: pendentes },
            ].filter(i => i.brackets.length > 0)}
            emptyText="Nenhuma chave ativa."
          />

          {/* Centro */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!bracket ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <ChevronRight className="h-10 w-10 text-[#374151]" />
                <p className="text-[#6b7280]">Selecione uma chave na lista.</p>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">

                {/* Controles */}
                <div className="w-80 shrink-0 overflow-y-auto p-5 space-y-4 border-r" style={{ borderColor: "var(--border)" }}>
                  {/* Cabeçalho da chave */}
                  <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[#6b7280] text-xs">Chave #{bracket.bracketNumber}</p>
                        <p className="text-white font-bold text-base leading-tight mt-0.5">{catLabel(bracket)}</p>
                        {!bracket.isAbsolute && (
                          <p className="text-[#4b5563] text-sm mt-0.5">
                            até {bracket.weightCategory.maxWeight === 999 ? "∞" : `${bracket.weightCategory.maxWeight}kg`}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                        style={{
                          backgroundColor:
                            bracket.status === "EM_ANDAMENTO" ? "#78350f60" :
                            bracket.status === "FINALIZADA" ? "#14532d60" :
                            bracket.status === "PREMIADA" ? "#4a1d9660" : "#1a1a1a",
                          color:
                            bracket.status === "EM_ANDAMENTO" ? "#fbbf24" :
                            bracket.status === "FINALIZADA" ? "#4ade80" :
                            bracket.status === "PREMIADA" ? "#a78bfa" : "#6b7280",
                        }}
                      >
                        {bracket.status === "EM_ANDAMENTO" ? "Em Andamento" :
                         bracket.status === "FINALIZADA" ? "Finalizada" :
                         bracket.status === "PREMIADA" ? "Premiada" : "Aguardando"}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#7f1d1d30", color: "#f87171" }}>
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* PENDENTE / DESIGNADA — botão iniciar */}
                  {groupBrackets.some(b => b.status === "PENDENTE" || b.status === "DESIGNADA") && (
                    <div className="space-y-3 py-4 text-center">
                      {groupBrackets.filter(b => b.status === "PENDENTE" || b.status === "DESIGNADA").map(b => (
                        <div key={b.id}>
                          {isGroup && <p className="text-[#6b7280] text-xs mb-1">{b.isGrandFinal ? "🏆 Grande Final" : `Sub-chave #${b.bracketNumber}`} — {b.positions.length} atleta(s)</p>}
                          {!isGroup && <p className="text-[#9ca3af] text-sm">{b.positions.length} atleta(s) nesta chave</p>}
                          <button
                            onClick={() => iniciarChave(b.id)}
                            disabled={actionLoading}
                            className="w-full h-14 rounded-xl text-white font-bold text-base transition-opacity disabled:opacity-40"
                            style={{ backgroundColor: "#16a34a" }}
                          >
                            {actionLoading ? "Iniciando..." : `▶ INICIAR${isGroup ? ` #${b.bracketNumber}` : ""}`}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EM_ANDAMENTO — todas as partidas prontas (ambos atletas definidos) */}
                  {groupBrackets.some(b => b.status === "EM_ANDAMENTO") && (
                    <div className="space-y-3">
                      {/* Indicador de progresso por rodada */}
                      {maxRound > 1 && (
                        <div className="flex items-center justify-between">
                          <h2 className="text-white font-semibold text-sm">
                            {currentMatches.length} luta(s) disponível(is)
                          </h2>
                          <div className="flex gap-1">
                            {Array.from({ length: maxRound }, (_, i) => i + 1).map(r => {
                              const done = allGroupMatches.filter(m => m.round === r).every(m => m.winnerId)
                              const active = currentMatches.length > 0 && r === Math.min(...currentMatches.map(m => m.round))
                              return (
                                <div key={r} className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: active ? "#fbbf24" : done ? "#4ade80" : "#333" }} />
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {currentMatches.map(match => {
                        const p1 = match.position1
                        const p2 = match.position2
                        const p1Name = getAthleteName(p1)
                        const p2Name = getAthleteName(p2)
                        const isDone = !!match.winnerId
                        const winnerIsP1 = match.winnerId === match.position1Id
                        const winnerIsP2 = match.winnerId === match.position2Id
                        return (
                          <div key={match.id} className="rounded-xl border overflow-hidden"
                            style={{ borderColor: isDone ? "#14532d40" : "#333", backgroundColor: "var(--card)" }}>
                            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                              <span className="text-xs text-[#6b7280]">
                                R{match.round} · Partida {match.matchNumber}
                              </span>
                              {isDone && (
                                <span className="text-xs text-[#4ade80] font-semibold">
                                  {match.isWO ? `W.O. (${match.woType === "PESO" ? "Peso" : "Ausência"})` : "Finalizada"}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => !isDone && !actionLoading && p1?.id && p1Name !== "BYE" && declararVencedor(match._bracketId, match.id, p1.id)}
                              disabled={isDone || actionLoading || !p1?.id || p1Name === "BYE"}
                              className="w-full px-4 py-4 text-left flex items-center gap-3 transition-colors disabled:cursor-default"
                              style={{ backgroundColor: isDone ? (winnerIsP1 ? "#14532d30" : "transparent") : "#111", borderBottom: "1px solid var(--border)" }}
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                                style={{ backgroundColor: isDone && winnerIsP1 ? "#16a34a" : "#222", color: "var(--foreground)" }}>
                                {isDone && winnerIsP1 ? "✓" : "1"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{p1Name}</p>
                                {getAthleteTeam(p1) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p1)}</p>}
                              </div>
                              {!isDone && p1Name !== "BYE" && <span className="text-xs text-[#dc2626] font-bold shrink-0">TAP</span>}
                            </button>
                            <div className="flex items-center gap-2 px-4" style={{ backgroundColor: "var(--background)" }}>
                              <div className="flex-1 h-px" style={{ backgroundColor: "#222" }} />
                              <span className="text-xs text-[#444] font-bold py-1">VS</span>
                              <div className="flex-1 h-px" style={{ backgroundColor: "#222" }} />
                            </div>
                            <button
                              onClick={() => !isDone && !actionLoading && p2?.id && p2Name !== "BYE" && declararVencedor(match._bracketId, match.id, p2.id)}
                              disabled={isDone || actionLoading || !p2?.id || p2Name === "BYE"}
                              className="w-full px-4 py-4 text-left flex items-center gap-3 transition-colors disabled:cursor-default"
                              style={{ backgroundColor: isDone ? (winnerIsP2 ? "#14532d30" : "transparent") : "#111" }}
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                                style={{ backgroundColor: isDone && winnerIsP2 ? "#16a34a" : "#222", color: "var(--foreground)" }}>
                                {isDone && winnerIsP2 ? "✓" : "2"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{p2Name !== "BYE" ? p2Name : "— BYE —"}</p>
                                {getAthleteTeam(p2) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p2)}</p>}
                              </div>
                              {!isDone && p2Name !== "BYE" && <span className="text-xs text-[#dc2626] font-bold shrink-0">TAP</span>}
                            </button>
                            {!isDone && p1?.id && p2?.id && (
                              <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                                <button onClick={() => setWoModal({ matchId: match.id, winnerId: p1.id, bracketId: match._bracketId })} disabled={actionLoading}
                                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors">
                                  W.O. — {p1Name.split(" ")[0]}
                                </button>
                                <button onClick={() => setWoModal({ matchId: match.id, winnerId: p2.id, bracketId: match._bracketId })} disabled={actionLoading}
                                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors">
                                  W.O. — {p2Name.split(" ")[0]}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Partidas aguardando definição de atletas (ex: próxima rodada ainda não confirmada) */}
                      {allGroupMatches.filter(m => !m.winnerId && (!m.position1Id || !m.position2Id)).length > 0 && (
                        <p className="text-xs text-[#4b5563] text-center py-1">
                          + {bracket.matches.filter(m => !m.winnerId && (!m.position1Id || !m.position2Id)).length} luta(s) aguardando definição de atletas
                        </p>
                      )}

                      {bracket.matches.filter(m => m.winnerId).length > 0 && (
                        <details className="text-xs text-[#6b7280]">
                          <summary className="cursor-pointer py-1 select-none">Partidas concluídas</summary>
                          <div className="space-y-1 mt-1">
                            {bracket.matches.filter(m => m.winnerId).sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber).map(m => {
                              const wp = m.winner ? bracket.positions.find(p => p.id === m.winner?.id) : null
                              return (
                                <p key={m.id} className="px-2">
                                  R{m.round} #{m.matchNumber} → {wp ? getAthleteName(wp) : "—"}{m.isWO && " (W.O.)"}
                                </p>
                              )
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* FINALIZADA / PREMIADA — pódio (só quando a GF finalizou, ou chave simples finalizada) */}
                  {(isGroup
                    ? groupBrackets.some(b => b.isGrandFinal && (b.status === "FINALIZADA" || b.status === "PREMIADA"))
                      || (groupBrackets.every(b => !b.isGrandFinal) && groupBrackets.some(b => b.status === "FINALIZADA" || b.status === "PREMIADA"))
                    : bracket?.status === "FINALIZADA" || bracket?.status === "PREMIADA"
                  ) && (
                    <div className="space-y-3 py-4">
                      {(() => {
                        const grandFinal = groupBrackets.find(b => b.isGrandFinal)
                        const isSubOnly = isGroup && !grandFinal
                        // Sub-chaves sem grande final ainda: mostrar apenas campeões de cada sub-chave
                        if (isSubOnly) {
                          const doneSubs = groupBrackets.filter(b => b.status === "FINALIZADA" || b.status === "PREMIADA")
                          return (
                            <div className="flex flex-col items-center gap-4 text-center">
                              {doneSubs.map(b => {
                                const bRealMatches = b.matches.filter(m => m.position1Id && m.position2Id)
                                const bMaxRound = bRealMatches.length > 0 ? Math.max(...bRealMatches.map(m => m.round)) : 0
                                const bFinal = bRealMatches.find(m => m.round === bMaxRound && m.matchNumber === 1)
                                const bChamp = bFinal?.winnerId ? b.positions.find(p => p.id === bFinal.winnerId) : null
                                return (
                                  <div key={b.id}>
                                    <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider mb-1">Sub-chave #{b.bracketNumber}</p>
                                    {bChamp ? (
                                      <div>
                                        <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider">🏅 Campeão</p>
                                        <p className="text-white text-base font-bold">{getAthleteName(bChamp)}</p>
                                        {getAthleteTeam(bChamp) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(bChamp)}</p>}
                                      </div>
                                    ) : <p className="text-[#6b7280] text-sm">Em andamento</p>}
                                  </div>
                                )
                              })}
                              <p className="text-[#f59e0b] text-sm font-semibold mt-2">⏳ Aguardando Grande Final</p>
                              <p className="text-[#6b7280] text-xs">O pódio será definido na Grande Final entre os campeões.</p>
                            </div>
                          )
                        }
                        // Grande Final finalizada: mostrar pódio completo
                        if (grandFinal && (grandFinal.status === "FINALIZADA" || grandFinal.status === "PREMIADA")) {
                          return (
                            <div className="flex flex-col items-center gap-3 text-center">
                              <Trophy className="h-10 w-10 text-[#fbbf24]" />
                              {champion && (
                                <div>
                                  <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider">🥇 1° Lugar</p>
                                  <p className="text-white text-xl font-bold">{getAthleteName(champion)}</p>
                                  {getAthleteTeam(champion) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(champion)}</p>}
                                </div>
                              )}
                              {runnerUp && (
                                <div>
                                  <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wider">🥈 2° Lugar</p>
                                  <p className="text-white text-base font-semibold">{getAthleteName(runnerUp)}</p>
                                  {getAthleteTeam(runnerUp) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(runnerUp)}</p>}
                                </div>
                              )}
                              {thirdPlace && (
                                <div>
                                  <p className="text-[#cd7f32] text-xs font-semibold uppercase tracking-wider">🥉 3° Lugar</p>
                                  <p className="text-white text-base font-semibold">{getAthleteName(thirdPlace)}</p>
                                  {getAthleteTeam(thirdPlace) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(thirdPlace)}</p>}
                                </div>
                              )}
                              <p className="text-center text-[#4ade80] font-semibold text-sm">
                                {grandFinal.status === "PREMIADA" ? "Chave Premiada ✓" : "Chave Finalizada"}
                              </p>
                            </div>
                          )
                        }
                        // Chave simples (sem grupo)
                        return (
                          <div className="flex flex-col items-center gap-3 text-center">
                            <Trophy className="h-10 w-10 text-[#fbbf24]" />
                            {champion && (
                              <div>
                                <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider">🥇 1° Lugar</p>
                                <p className="text-white text-xl font-bold">{getAthleteName(champion)}</p>
                                {getAthleteTeam(champion) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(champion)}</p>}
                              </div>
                            )}
                            {runnerUp && (
                              <div>
                                <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wider">🥈 2° Lugar</p>
                                <p className="text-white text-base font-semibold">{getAthleteName(runnerUp)}</p>
                                {getAthleteTeam(runnerUp) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(runnerUp)}</p>}
                              </div>
                            )}
                            {thirdPlace && (
                              <div>
                                <p className="text-[#cd7f32] text-xs font-semibold uppercase tracking-wider">🥉 3° Lugar</p>
                                <p className="text-white text-base font-semibold">{getAthleteName(thirdPlace)}</p>
                                {getAthleteTeam(thirdPlace) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(thirdPlace)}</p>}
                              </div>
                            )}
                            <p className="text-center text-[#4ade80] font-semibold text-sm">
                              {bracket?.status === "PREMIADA" ? "Chave Premiada ✓" : "Chave Finalizada"}
                            </p>
                            <p className="text-center text-[#6b7280] text-xs">{bracket?.matches.length} partida(s) realizada(s)</p>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Visualização da chave */}
                <div className="flex-1 overflow-auto p-5 space-y-6">
                  {(() => {
                    const bracketsToShow = bracket.bracketGroupId && !bracket.isGrandFinal
                      ? tatame.brackets.filter(b => b.bracketGroupId === bracket.bracketGroupId)
                          .sort((a, b) => {
                            if (a.isGrandFinal !== b.isGrandFinal) return a.isGrandFinal ? 1 : -1
                            return a.bracketNumber - b.bracketNumber
                          })
                      : [bracket]
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
                              id: b.weightCategory.id ?? b.id,
                              name: b.weightCategory.name,
                              ageGroup: b.weightCategory.ageGroup,
                              sex: b.weightCategory.sex,
                              maxWeight: b.weightCategory.maxWeight,
                            },
                            positions: b.positions.map(p => ({
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

          {/* Coluna direita — Finalizadas */}
          <SideColumn
            title={`Finalizadas (${finalizadas.length})`}
            color="#4ade80"
            dot=""
            items={[{ brackets: finalizadas }]}
            emptyText="Nenhuma chave finalizada ainda."
          />

        </div>
      )}

      {/* W.O. / Desclassificação modal */}
      {woModal && bracket && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--card-alt)" }}>
            {!pesoStep ? (
              <>
                <p className="text-white font-bold text-center text-lg">Motivo</p>
                <p className="text-[#9ca3af] text-sm text-center">Selecione o motivo</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => declararVencedor(woModal.bracketId, woModal.matchId, woModal.winnerId, true, "AUSENCIA")}
                    disabled={actionLoading}
                    className="py-4 rounded-xl font-semibold text-white text-sm"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    W.O. por Ausência
                  </button>
                  <button
                    onClick={() => setPesoStep(true)}
                    disabled={actionLoading}
                    className="py-4 rounded-xl font-semibold text-white text-sm"
                    style={{ backgroundColor: "#78350f" }}
                  >
                    Desclassificação por Peso
                  </button>
                </div>
                <button
                  onClick={() => setWoModal(null)}
                  className="w-full py-3 rounded-xl text-[#6b7280] text-sm"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <p className="text-white font-bold text-center text-lg">Peso do Atleta</p>
                <p className="text-[#9ca3af] text-sm text-center">Informe o peso aferido (kg)</p>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ex: 77.3"
                  value={pesoInput}
                  onChange={e => setPesoInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white text-center text-xl font-bold border focus:outline-none"
                  style={{ backgroundColor: "var(--card)", borderColor: pesoInput ? "#dc2626" : "#333" }}
                  autoFocus
                />
                <button
                  onClick={() => declararVencedor(woModal.bracketId, woModal.matchId, woModal.winnerId, true, "PESO", pesoInput)}
                  disabled={actionLoading || !pesoInput}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  {actionLoading ? "Confirmando..." : "Confirmar Desclassificação"}
                </button>
                <button
                  onClick={() => setPesoStep(false)}
                  className="w-full py-3 rounded-xl text-[#6b7280] text-sm"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  Voltar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
