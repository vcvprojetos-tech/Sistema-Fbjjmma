"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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

interface CallTime { call: number; at: string; pos?: "p1" | "p2" | null }

interface MatchData {
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
  woReason: string | null
  callTimes: CallTime[] | null
  p1CheckedIn: boolean
  p2CheckedIn: boolean
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
  event: { id: string; name: string; status: string; schedule: string | null; pesoDoc: string | null }
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

// Deve coincidir com CALL_INTERVAL_MS na rota chamada/route.ts
const CALL_INTERVAL_MS = 5 * 60 * 1000

function CallCountdown({ calls, absentPosition }: {
  calls: CallTime[]
  absentPosition: "p1" | "p2" | null
}) {
  const posCalls = calls.filter(c => c.pos === absentPosition || c.pos == null)
  const lastDoneCall = [...posCalls].filter(c => c.call <= 2).sort((a, b) => b.call - a.call)[0] ?? null
  const nextCallNum = lastDoneCall ? lastDoneCall.call + 1 : null

  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!lastDoneCall) { setRemaining(0); return }
    const update = () => {
      setRemaining(Math.max(0, CALL_INTERVAL_MS - (Date.now() - new Date(lastDoneCall.at).getTime())))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDoneCall?.at])

  if (!lastDoneCall || nextCallNum == null) return null
  // Se a próxima chamada já foi registrada, não mostrar countdown
  if (posCalls.some(c => c.call >= nextCallNum)) return null

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)

  if (remaining <= 0) {
    return (
      <p className="text-xs text-center font-semibold py-1" style={{ color: "#4ade80" }}>
        ✓ {nextCallNum}ª chamada disponível
      </p>
    )
  }

  return (
    <p className="text-xs text-center font-medium py-1" style={{ color: "#f59e0b" }}>
      ⏱ {nextCallNum}ª chamada em {mins}:{secs.toString().padStart(2, "0")}
    </p>
  )
}

export default function TatamePage() {
  const { tatameId } = useParams<{ tatameId: string }>()
  const [tatame, setTatame] = useState<TatameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sideTab, setSideTab] = useState<"ativas" | "finalizadas">("ativas")
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [woModal, setWoModal] = useState<{ matchId: string; winnerId: string; bracketId: string; p1Name?: string; p2Name?: string } | null>(null)
  const [pesoStep, setPesoStep] = useState(false)
  const [pesoInput, setPesoInput] = useState("")
  const [callLoading, setCallLoading] = useState<string | null>(null)
  const [callError, setCallError] = useState<{ matchId: string; msg: string; remaining?: number } | null>(null)
  const [callMenu, setCallMenu] = useState<{ matchId: string; bracketId: string; winnerId: string; absenteeName: string; absentPosition: "p1" | "p2" | null } | null>(null)
  const [desclModal, setDesclModal] = useState<{ matchId: string; bracketId: string; winnerId: string; loserName: string } | null>(null)
  const [desclReason, setDesclReason] = useState("")
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null)

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
      // Não chama disconnect() aqui para evitar encerrar sessão em remontagens do React
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

  // Heartbeat a cada 30s + imediatamente ao retornar ao tab (Chrome pode congelar tabs em segundo plano)
  useEffect(() => {
    const pin = getPin()
    if (!pin) return
    const sendHeartbeat = () => {
      fetch(`/api/coordenador/tatame/${tatameId}/heartbeat`, {
        method: "POST",
        headers: { "x-tatame-pin": pin },
      }).catch(() => {})
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 30000)
    // Ao retornar ao tab, reconecta imediatamente mesmo que o intervalo esteja suspenso
    const onVisible = () => { if (document.visibilityState === "visible") sendHeartbeat() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [tatameId, getPin])

  const togglePresent = useCallback(async (matchId: string, bracketId: string, position: "p1" | "p2", current: boolean) => {
    try {
      await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}/chamada`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ action: "checkin", position, checked: !current }),
      })
      await load(true)
    } catch { /* silencioso */ }
  }, [getPin, load])

  const registrarChamada = useCallback(async (matchId: string, bracketId: string, callNumber: number, autoWinnerId?: string, absentPosition?: "p1" | "p2" | null) => {
    setCallLoading(`${matchId}-${callNumber}`)
    setCallError(null)
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}/chamada`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ action: "call", callNumber, position: absentPosition ?? null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCallError({ matchId, msg: data.error || "Erro ao registrar chamada.", remaining: data.remaining })
      } else if (callNumber === 3 && autoWinnerId !== undefined) {
        // 3ª chamada: W.O. automático por ausência
        setCallMenu(null)
        setActionLoading(true)
        const woRes = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
          body: JSON.stringify({ winnerId: autoWinnerId, isWO: true, woType: "AUSENCIA", woWeight: null }),
        })
        if (!woRes.ok) {
          const woData = await woRes.json()
          setError(woData.error || "Erro ao registrar W.O.")
        } else {
          await load(true)
        }
        setActionLoading(false)
      } else {
        await load(true)
      }
    } catch {
      setCallError({ matchId, msg: "Erro de conexão." })
    } finally {
      setCallLoading(null)
    }
  }, [getPin, load])

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

  const declararVencedor = useCallback(async (bracketId: string, matchId: string, winnerId: string, isWO = false, woType?: string, woWeight?: string, woReason?: string) => {
    setActionLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ winnerId, isWO, woType: woType || null, woWeight: woWeight ? parseFloat(woWeight) : null, woReason: woReason || null }),
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

  // Auto-avança atletas que já venceram um round anterior (presença já confirmada)
  const autoAdvancedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!tatame || actionLoading) return
    for (const b of tatame.brackets) {
      if (b.positions.length <= 1) continue
      for (const m of b.matches) {
        if (m.endedAt || m.position2Id !== null || !m.position1Id) continue
        if (autoAdvancedRef.current.has(m.id)) continue
        const jaPresente = m.p1CheckedIn || b.matches.some(prev =>
          prev.endedAt && prev.position2Id !== null && prev.winnerId === m.position1Id
        )
        if (jaPresente) {
          autoAdvancedRef.current.add(m.id)
          declararVencedor(b.id, m.id, m.position1Id, false)
          return
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tatame])

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
      .filter(m => !m.endedAt && m.position1Id !== null && m.position2Id !== null)
      .map(m => ({ ...m, _bracketId: b.id }))
  ).sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)

  // Partidas solo (1 atleta): pesagem individual
  const soloMatches = groupBrackets.flatMap(b =>
    b.matches
      .filter(m => !m.endedAt && m.position1Id !== null && m.position2Id === null)
      .map(m => ({
        ...m,
        _bracketId: b.id,
        _isMidBracket: b.positions.length > 1,
        // Atleta já confirmou presença em round anterior (venceu uma partida real)
        _alreadyPresent: b.matches.some(prev => prev.endedAt && prev.position2Id !== null && prev.winnerId === m.position1Id),
      }))
  )

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
  // Chave de 1 atleta: a "partida final" é a partida solo (sem position2Id)
  const soloFinalMatch = podiumBracket?.matches.find(m => m.position1Id !== null && m.position2Id === null && m.endedAt) ?? null
  const champion = (podiumBracket?.status === "FINALIZADA" || podiumBracket?.status === "PREMIADA")
    ? (podiumLastMatch?.winnerId
        ? podiumBracket!.positions.find(p => p.id === podiumLastMatch.winnerId) ?? null
        : soloFinalMatch?.winnerId
          ? podiumBracket!.positions.find(p => p.id === soloFinalMatch.winnerId) ?? null
          : null)
    : null
  // Se a final terminou via W.O., o perdedor foi desclassificado — sem 2° lugar
  const runnerUp = (podiumBracket?.status === "FINALIZADA" || podiumBracket?.status === "PREMIADA") && podiumLastMatch && !podiumLastMatch.isWO
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
        const thirdCandidate = podiumBracket.positions.find(p => p.id !== firstId && p.id !== secondId) ?? null
        // Se o candidato ao 3° foi eliminado por W.O., não recebe colocação
        const eliminatedByWO = thirdCandidate ? podiumBracket.matches.some(m =>
          m.isWO && m.endedAt && m.winnerId !== thirdCandidate.id &&
          (m.position1Id === thirdCandidate.id || m.position2Id === thirdCandidate.id)
        ) : false
        return eliminatedByWO ? null : thirdCandidate
      }
      if (podiumMaxRound < 2) return null
      // Tenta a semifinal do campeão; se foi W.O. (BYE), tenta a do vice-campeão
      const champSemi = podiumRealMatches.find(m => m.round === podiumMaxRound - 1 && m.winnerId === podiumLastMatch.winnerId)
      const runnerUpId = podiumLastMatch.winnerId === podiumLastMatch.position1Id ? podiumLastMatch.position2Id : podiumLastMatch.position1Id
      const runnerUpSemi = podiumRealMatches.find(m => m.round === podiumMaxRound - 1 && m.winnerId === runnerUpId)
      const semi = (!champSemi?.isWO ? champSemi : null) ?? (!runnerUpSemi?.isWO ? runnerUpSemi : null)
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

  function renderSideColumn({
    color, items, emptyText,
  }: {
    color: string
    items: { section?: string; brackets: BracketData[] }[]
    emptyText: string
  }) {
    const allBrackets = items.flatMap(i => i.brackets)
    return (
      <div className="flex flex-col h-full">
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
                          <p className="font-medium leading-tight mt-0.5 break-words"
                            style={{ color: groupIsActive ? "#fbbf24" : "#e5e7eb", fontSize: "0.72rem" }}>
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
                          <p className="font-medium leading-tight mt-0.5 break-words"
                            style={{ color: isActive ? "#fbbf24" : b.status === "FINALIZADA" || b.status === "PREMIADA" ? color : "#e5e7eb", fontSize: "0.72rem" }}>
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
          {/* Botões de consulta rápida */}
          {tatame.event.schedule && (
            <button
              onClick={() => setDocModal({ title: "Cronograma do Evento", url: tatame.event.schedule! })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hidden sm:flex"
              style={{ backgroundColor: "#1d4ed820", color: "#60a5fa", border: "1px solid #1d4ed840" }}
            >
              📅 Cronograma
            </button>
          )}
          {tatame.event.pesoDoc && (
            <button
              onClick={() => setDocModal({ title: "Tabela de Peso", url: tatame.event.pesoDoc! })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hidden sm:flex"
              style={{ backgroundColor: "#78350f20", color: "#fbbf24", border: "1px solid #78350f40" }}
            >
              ⚖️ Tabela de Peso
            </button>
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

          {/* Coluna esquerda — abas Ativas / Finalizadas */}
          <div className="w-60 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {/* Abas */}
            <div className="flex shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setSideTab("ativas")}
                className="flex-1 py-2 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "ativas" ? "#fbbf24" : "#6b7280",
                  borderBottom: sideTab === "ativas" ? "2px solid #fbbf24" : "2px solid transparent",
                  backgroundColor: "var(--background)",
                }}
              >
                Ativas ({emAndamento.length + pendentes.length})
              </button>
              <button
                onClick={() => setSideTab("finalizadas")}
                className="flex-1 py-2 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "finalizadas" ? "#4ade80" : "#6b7280",
                  borderBottom: sideTab === "finalizadas" ? "2px solid #4ade80" : "2px solid transparent",
                  backgroundColor: "var(--background)",
                }}
              >
                Finalizadas ({finalizadas.length})
              </button>
            </div>
            {/* Conteúdo da aba */}
            <div className="flex-1 overflow-y-auto">
              {sideTab === "ativas"
                ? renderSideColumn({
                    color: "#fbbf24",
                    items: [
                      { section: emAndamento.length > 0 ? "Em Andamento" : undefined, brackets: emAndamento },
                      { section: pendentes.length > 0 ? "Aguardando" : undefined, brackets: pendentes },
                    ].filter(i => i.brackets.length > 0),
                    emptyText: "Nenhuma chave ativa.",
                  })
                : renderSideColumn({
                    color: "#4ade80",
                    items: [{ brackets: finalizadas }],
                    emptyText: "Nenhuma chave finalizada ainda.",
                  })
              }
            </div>
          </div>

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
                  <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[#6b7280] text-xs">Chave #{bracket.bracketNumber}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
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
                    <p className="text-white font-bold text-xs leading-tight whitespace-nowrap overflow-hidden">{catLabel(bracket)}</p>
                    {!bracket.isAbsolute && (
                      <p className="text-[#4b5563] text-xs mt-0.5">
                        até {bracket.weightCategory.maxWeight === 999 ? "∞" : `${bracket.weightCategory.maxWeight}kg`}
                      </p>
                    )}
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
                              const done = allGroupMatches.filter(m => m.round === r).every(m => m.endedAt)
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
                        const isDone = !!match.endedAt
                        const winnerIsP1 = match.winnerId === match.position1Id
                        const winnerIsP2 = match.winnerId === match.position2Id
                        const p1Present = match.p1CheckedIn
                        const p2Present = match.p2CheckedIn
                        const bothPresent = p1Present && p2Present
                        const calls = match.callTimes ?? []
                        const callErr = callError?.matchId === match.id ? callError : null
                        return (
                          <div key={match.id} className="rounded-xl border overflow-hidden"
                            style={{
                              borderColor: isDone ? "#14532d40" : bothPresent ? "#16a34a60" : "#333",
                              backgroundColor: "var(--card)",
                            }}>
                            <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                              <span className="text-xs text-[#6b7280] whitespace-nowrap shrink-0">
                                R{match.round} · P{match.matchNumber}
                              </span>
                              {isDone ? (
                                <span className="text-xs text-[#4ade80] font-semibold whitespace-nowrap">
                                  {match.isWO ? `W.O. (${match.woType === "PESO" ? "Peso" : "Ausência"})` : "Finalizada"}
                                </span>
                              ) : bothPresent ? (
                                <span className="text-xs text-[#4ade80] font-semibold whitespace-nowrap">● Prontos</span>
                              ) : (
                                <span className="text-xs text-[#6b7280] whitespace-nowrap">Confirme presença</span>
                              )}
                            </div>


                            {/* Atleta 1 */}
                            <div className="w-full px-4 py-3 flex items-center gap-3"
                              style={{ backgroundColor: isDone ? (winnerIsP1 ? "#14532d30" : "transparent") : "#111", borderBottom: "1px solid var(--border)" }}>
                              <button
                                onClick={() => !isDone && p1Name !== "BYE" && togglePresent(match.id, match._bracketId, "p1", p1Present)}
                                disabled={isDone || p1Name === "BYE"}
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors disabled:cursor-default"
                                style={{ backgroundColor: isDone && winnerIsP1 ? "#16a34a" : p1Present ? "#15803d" : "#222", color: "var(--foreground)" }}
                                title={p1Present ? "Marcar como ausente" : "Marcar como presente"}
                              >
                                {(isDone && winnerIsP1) || p1Present ? "✓" : "1"}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-xs truncate">{p1Name}</p>
                                {getAthleteTeam(p1) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p1)}</p>}
                              </div>
                              {!isDone && p1Name !== "BYE" && (
                                <button
                                  onClick={() => bothPresent && !actionLoading && p1?.id && declararVencedor(match._bracketId, match.id, p1.id)}
                                  disabled={!bothPresent || actionLoading}
                                  className="text-xs font-bold shrink-0 px-2 py-1 rounded transition-opacity"
                                  style={{ color: bothPresent ? "#dc2626" : "#444", cursor: bothPresent ? "pointer" : "default" }}
                                >
                                  TAP
                                </button>
                              )}
                            </div>

                            {/* VS */}
                            <div className="flex items-center gap-2 px-4" style={{ backgroundColor: "var(--background)" }}>
                              <div className="flex-1 h-px" style={{ backgroundColor: bothPresent && !isDone ? "#16a34a40" : "#222" }} />
                              <span className="text-xs font-bold py-1" style={{ color: bothPresent && !isDone ? "#4ade80" : "#444" }}>VS</span>
                              <div className="flex-1 h-px" style={{ backgroundColor: bothPresent && !isDone ? "#16a34a40" : "#222" }} />
                            </div>

                            {/* Atleta 2 */}
                            <div className="w-full px-4 py-3 flex items-center gap-3"
                              style={{ backgroundColor: isDone ? (winnerIsP2 ? "#14532d30" : "transparent") : "#111" }}>
                              <button
                                onClick={() => !isDone && p2Name !== "BYE" && togglePresent(match.id, match._bracketId, "p2", p2Present)}
                                disabled={isDone || p2Name === "BYE"}
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors disabled:cursor-default"
                                style={{ backgroundColor: isDone && winnerIsP2 ? "#16a34a" : p2Present ? "#15803d" : "#222", color: "var(--foreground)" }}
                                title={p2Present ? "Marcar como ausente" : "Marcar como presente"}
                              >
                                {(isDone && winnerIsP2) || p2Present ? "✓" : "2"}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-xs truncate">{p2Name !== "BYE" ? p2Name : "— BYE —"}</p>
                                {getAthleteTeam(p2) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p2)}</p>}
                              </div>
                              {!isDone && p2Name !== "BYE" && (
                                <button
                                  onClick={() => bothPresent && !actionLoading && p2?.id && declararVencedor(match._bracketId, match.id, p2.id)}
                                  disabled={!bothPresent || actionLoading}
                                  className="text-xs font-bold shrink-0 px-2 py-1 rounded transition-opacity"
                                  style={{ color: bothPresent ? "#dc2626" : "#444", cursor: bothPresent ? "pointer" : "default" }}
                                >
                                  TAP
                                </button>
                              )}
                            </div>

                            {!isDone && p1?.id && p2?.id && (
                              <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                                {callMenu?.matchId !== match.id ? (
                                  <>
                                    <div className="flex gap-2">
                                      <button onClick={() => setCallMenu({ matchId: match.id, bracketId: match._bracketId, winnerId: p2.id, absenteeName: p1Name, absentPosition: "p1" })} disabled={actionLoading}
                                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors">
                                        W.O. — {p1Name.split(" ")[0]}
                                      </button>
                                      <button onClick={() => setCallMenu({ matchId: match.id, bracketId: match._bracketId, winnerId: p1.id, absenteeName: p2Name, absentPosition: "p2" })} disabled={actionLoading}
                                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors">
                                        W.O. — {p2Name.split(" ")[0]}
                                      </button>
                                    </div>
                                    <button onClick={() => setWoModal({ matchId: match.id, winnerId: "", bracketId: match._bracketId, p1Name, p2Name })} disabled={actionLoading}
                                      className="w-full py-2 rounded-lg text-xs font-semibold border transition-colors"
                                      style={{ color: "#f97316", borderColor: "#7c2d1240", backgroundColor: "#7c2d1210" }}>
                                      W.O. — Ambos Ausentes
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs text-[#f87171] font-semibold">Chamadas — {callMenu.absenteeName.split(" ")[0]}</p>
                                    <div className="flex gap-1.5">
                                      {[1, 2, 3].map(n => {
                                        const posCalls = calls.filter((c: CallTime) => c.pos === callMenu.absentPosition || !c.pos)
                                        const done = posCalls.some((c: CallTime) => c.call === n)
                                        const isLoadingCall = callLoading === `${match.id}-${n}`
                                        const canCall = n === 1 ? !done : (posCalls.some((c: CallTime) => c.call === n - 1) && !done)
                                        return (
                                          <button
                                            key={n}
                                            onClick={() => canCall && registrarChamada(match.id, match._bracketId, n, callMenu.winnerId, callMenu.absentPosition)}
                                            disabled={!canCall || !!callLoading || actionLoading}
                                            className="flex-1 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40"
                                            style={{ backgroundColor: done ? "#15803d" : "#1f2937", color: done ? "#4ade80" : "#9ca3af" }}
                                          >
                                            {isLoadingCall ? "..." : done ? `✓ ${n}ª` : `${n}ª Chamada`}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    {callErr && <p className="text-[#f87171] text-xs">{callErr.msg}</p>}
                                    <CallCountdown calls={calls} absentPosition={callMenu.absentPosition} />
                                    <button
                                      onClick={() => { setWoModal({ matchId: match.id, winnerId: callMenu.winnerId, bracketId: match._bracketId }); setPesoStep(true); setCallMenu(null) }}
                                      disabled={actionLoading}
                                      className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                                      style={{ backgroundColor: "#78350f" }}
                                    >
                                      Desclassificação por Peso
                                    </button>
                                    <button
                                      onClick={() => { setDesclModal({ matchId: match.id, bracketId: match._bracketId, winnerId: callMenu.winnerId, loserName: callMenu.absenteeName }); setDesclReason(""); setCallMenu(null) }}
                                      disabled={actionLoading}
                                      className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                                      style={{ backgroundColor: "#7c3aed" }}
                                    >
                                      Desclassificado
                                    </button>
                                    <button
                                      onClick={() => setCallMenu(null)}
                                      className="w-full py-2 rounded-lg text-xs text-[#6b7280]"
                                      style={{ backgroundColor: "var(--card)" }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                )}
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

                  {/* Partidas solo: 1 atleta aguardando pesagem — exibidas após as lutas normais */}
                  {soloMatches.map(match => {
                    const p1 = match.position1
                    const p1Name = getAthleteName(p1)
                    const p1Present = match.p1CheckedIn
                    const isMid = match._isMidBracket
                    const calls = match.callTimes ?? []
                    const callErr = callError?.matchId === match.id ? callError : null
                    return (
                      <div key={match.id} className="rounded-xl border overflow-hidden"
                        style={{ borderColor: p1Present ? "#16a34a60" : "#78350f60", backgroundColor: "var(--card)" }}>
                        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span className="text-xs font-semibold" style={{ color: isMid ? "#60a5fa" : "#fbbf24" }}>
                            {isMid ? "Confirmação de Presença" : "Pesagem — Atleta Único"}
                          </span>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
                          <button
                            onClick={() => {
                              if (isMid) declararVencedor(match._bracketId, match.id, match.position1Id!, false)
                              else togglePresent(match.id, match._bracketId, "p1", p1Present)
                            }}
                            disabled={actionLoading}
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors"
                            style={{ backgroundColor: (!isMid && p1Present) ? "#15803d" : "#222", color: "var(--foreground)" }}
                          >
                            {(!isMid && p1Present) ? "✓" : "1"}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-xs truncate">{p1Name}</p>
                            {getAthleteTeam(p1) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p1)}</p>}
                          </div>
                          <span className="text-xs text-[#6b7280]">TAP</span>
                        </div>
                        <div className="flex gap-2 p-3">
                          {!isMid && (
                          <button
                            onClick={() => !actionLoading && declararVencedor(match._bracketId, match.id, match.position1Id!, false)}
                            disabled={actionLoading || !p1Present}
                            className="flex-1 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40"
                            style={{ backgroundColor: "#15803d" }}
                          >
                            ✓ Campeão
                          </button>
                          )}
                          {callMenu?.matchId !== match.id && (
                            <button
                              onClick={() => setCallMenu({ matchId: match.id, bracketId: match._bracketId, winnerId: "", absenteeName: p1Name, absentPosition: "p1" })}
                              disabled={actionLoading}
                              className="flex-1 py-3 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors"
                            >
                              W.O.
                            </button>
                          )}
                        </div>
                        {callMenu?.matchId === match.id && (
                          <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <p className="text-xs text-[#f87171] font-semibold pt-2">Chamadas — {callMenu.absenteeName.split(" ")[0]}</p>
                            <div className="flex gap-1.5">
                              {[1, 2, 3].map(n => {
                                const posCalls = calls.filter((c: CallTime) => c.pos === callMenu.absentPosition || !c.pos)
                                const done = posCalls.some((c: CallTime) => c.call === n)
                                const isLoadingCall = callLoading === `${match.id}-${n}`
                                const canCall = n === 1 ? !done : (posCalls.some((c: CallTime) => c.call === n - 1) && !done)
                                return (
                                  <button
                                    key={n}
                                    onClick={() => canCall && registrarChamada(match.id, match._bracketId, n, callMenu.winnerId, callMenu.absentPosition)}
                                    disabled={!canCall || !!callLoading || actionLoading}
                                    className="flex-1 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40"
                                    style={{ backgroundColor: done ? "#15803d" : "#1f2937", color: done ? "#4ade80" : "#9ca3af" }}
                                  >
                                    {isLoadingCall ? "..." : done ? `✓ ${n}ª` : `${n}ª Chamada`}
                                  </button>
                                )
                              })}
                            </div>
                            {callErr && <p className="text-[#f87171] text-xs">{callErr.msg}</p>}
                            <CallCountdown calls={calls} absentPosition={callMenu.absentPosition} />
                            <button
                              onClick={() => { setWoModal({ matchId: match.id, winnerId: "", bracketId: match._bracketId }); setPesoStep(true); setCallMenu(null) }}
                              disabled={actionLoading}
                              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                              style={{ backgroundColor: "#78350f" }}
                            >
                              Desclassificação por Peso
                            </button>
                            <button
                              onClick={() => { setDesclModal({ matchId: match.id, bracketId: match._bracketId, winnerId: "", loserName: p1Name }); setDesclReason(""); setCallMenu(null) }}
                              disabled={actionLoading}
                              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                              style={{ backgroundColor: "#7c3aed" }}
                            >
                              Desclassificado
                            </button>
                            <button
                              onClick={() => setCallMenu(null)}
                              className="w-full py-2 rounded-lg text-xs text-[#6b7280]"
                              style={{ backgroundColor: "var(--card)" }}
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

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
                <div className="flex-1 overflow-auto p-5 space-y-6 min-h-0">
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
                            belt: b.belt,
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

        </div>
      )}

      {/* W.O. / Desclassificação modal */}
      {woModal && bracket && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--card-alt)" }}>
            {/* W.O. Duplo — confirmação */}
            {woModal.winnerId === "" && !pesoStep ? (
              <>
                <p className="text-white font-bold text-center text-lg">W.O. — Ambos Ausentes</p>
                <p className="text-[#9ca3af] text-sm text-center">
                  {woModal.p1Name?.split(" ")[0]} e {woModal.p2Name?.split(" ")[0]} não compareceram.<br />
                  Nenhum atleta avança nesta partida.
                </p>
                <button
                  onClick={() => declararVencedor(woModal.bracketId, woModal.matchId, "", true, "AUSENCIA")}
                  disabled={actionLoading}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm"
                  style={{ backgroundColor: "#f97316" }}
                >
                  {actionLoading ? "Confirmando..." : "Confirmar Dupla Ausência"}
                </button>
                <button
                  onClick={() => setWoModal(null)}
                  className="w-full py-3 rounded-xl text-[#6b7280] text-sm"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  Cancelar
                </button>
              </>
            ) : !pesoStep ? (
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

      {/* Modal de consulta rápida de documento (Cronograma / Tabela de Peso) */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setDocModal(null)}>
          <div
            className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              maxWidth: "min(92vw, 1100px)",
              maxHeight: "90vh",
              backgroundColor: docModal.url.match(/\.(pdf)$/i) ? "var(--card-alt)" : "transparent",
            }}
            onClick={e => e.stopPropagation()}>
            {/* Cabeçalho compacto */}
            <div className="flex items-center justify-between px-3 py-2 shrink-0"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: "1rem 1rem 0 0" }}>
              <span className="text-white font-semibold text-xs">{docModal.title}</span>
              <button onClick={() => setDocModal(null)}
                className="text-[#9ca3af] hover:text-white text-base leading-none ml-3">✕</button>
            </div>
            {/* Imagem / PDF sem margens internas */}
            {docModal.url.match(/\.(pdf)$/i) ? (
              <iframe
                src={`${docModal.url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                style={{ border: "none", display: "block", width: "min(92vw, 1100px)", height: "82vh" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={docModal.url}
                alt={docModal.title}
                style={{ display: "block", maxWidth: "min(92vw, 1100px)", maxHeight: "85vh", width: "auto", height: "auto" }}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal de Desclassificação com motivo */}
      {desclModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--card-alt)" }}>
            <div>
              <p className="text-white font-bold text-lg">Desclassificação</p>
              <p className="text-[#a78bfa] text-sm mt-1">{desclModal.loserName}</p>
            </div>
            <div>
              <p className="text-[#9ca3af] text-sm mb-2">Informe o motivo da desclassificação:</p>
              <textarea
                value={desclReason}
                onChange={e => setDesclReason(e.target.value)}
                placeholder="Ex: falta grave, comportamento antidesportivo..."
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-sm text-white resize-none outline-none"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              />
            </div>
            <button
              onClick={async () => {
                if (!desclReason.trim()) return
                await declararVencedor(desclModal.bracketId, desclModal.matchId, desclModal.winnerId, true, "DESCLASSIFICACAO", undefined, desclReason.trim())
                setDesclModal(null)
                setDesclReason("")
              }}
              disabled={actionLoading || !desclReason.trim()}
              className="w-full py-4 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: "#7c3aed" }}
            >
              {actionLoading ? "Confirmando..." : "Confirmar Desclassificação"}
            </button>
            <button
              onClick={() => { setDesclModal(null); setDesclReason("") }}
              className="w-full py-3 rounded-xl text-[#6b7280] text-sm"
              style={{ backgroundColor: "var(--card)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
