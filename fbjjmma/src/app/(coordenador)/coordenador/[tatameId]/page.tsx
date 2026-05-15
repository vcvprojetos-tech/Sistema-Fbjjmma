"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { RefreshCw, AlertCircle, ChevronRight, Trophy } from "lucide-react"
import Link from "next/link"
import BracketView from "@/components/admin/BracketView"
import { ThemeLogo } from "@/components/ThemeLogo"

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
  inPanel?: boolean
  startedAt: string | null
  updatedAt: string
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

function sortByStarted(list: BracketData[]) {
  return [...list].sort((a, b) =>
    new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime()
  )
}

function sortByDesignated(list: BracketData[]) {
  return [...list].sort((a, b) =>
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  )
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
  const [optimisticCheckins, setOptimisticCheckins] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [woModal, setWoModal] = useState<{ matchId: string; winnerId: string; bracketId: string; p1Name?: string; p2Name?: string } | null>(null)
  const [pesoStep, setPesoStep] = useState(false)
  const [pesoInput, setPesoInput] = useState("")
  const [callLoading, setCallLoading] = useState<string | null>(null)
  const [callError, setCallError] = useState<{ matchId: string; msg: string; remaining?: number } | null>(null)
  const [callMenu, setCallMenu] = useState<{ matchId: string; bracketId: string; winnerId: string; absenteeName: string; absentPosition: "p1" | "p2" | null } | null>(null)
  const [desclModal, setDesclModal] = useState<{ matchId: string; bracketId: string; winnerId: string; loserName: string } | null>(null)
  const [desclReason, setDesclReason] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null)
  const [consultaOpen, setConsultaOpen] = useState(false)
  const [consultaQ, setConsultaQ] = useState("")
  const [consultaSex, setConsultaSex] = useState("")
  const [consultaAge, setConsultaAge] = useState("")
  const [consultaBelt, setConsultaBelt] = useState("")
  const [consultaWeight, setConsultaWeight] = useState("")
  const [consultaResults, setConsultaResults] = useState<ConsultaResult[] | null>(null)
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaSnapshot, setConsultaSnapshot] = useState<{ sex: string; age: string; belt: string; weight: string; q: string } | null>(null)
  const docOverlayRef = useRef<HTMLDivElement>(null)
  const docCardRef = useRef<HTMLDivElement>(null)
  const docBackdropRef = useRef<HTMLDivElement>(null)
  const docHintRef = useRef<HTMLDivElement>(null)
  const docDragStartRef = useRef<{ x: number; y: number } | null>(null)
  const docDragCurrRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [undoLoading, setUndoLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [vvBottom, setVvBottom] = useState(0)
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setVvBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update) }
  }, [])

  useEffect(() => {
    const enter = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    document.addEventListener("click", enter, { once: true })
    document.addEventListener("keydown", enter, { once: true })
    return () => {
      document.removeEventListener("click", enter)
      document.removeEventListener("keydown", enter)
    }
  }, [])

  // Previne scroll nativo durante o swipe do modal de documento.
  // React 17+ registra onTouchMove como passivo, então e.preventDefault() é
  // ignorado nos handlers JSX. É necessário usar addEventListener nativo
  // com { passive: false } para que o browser não entre em "modo scroll"
  // durante o arrasto — o que impediria o primeiro toque após fechar de
  // ser reconhecido como click (em vez de início de scroll).
  useEffect(() => {
    const card = docCardRef.current
    if (!docModal || !card) return
    const block = (e: TouchEvent) => e.preventDefault()
    card.addEventListener("touchmove", block, { passive: false })
    return () => card.removeEventListener("touchmove", block)
  }, [docModal])

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setShowOverlay(false)
  }, [])

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement)
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

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

  const desfazerResultado = useCallback(async (bracketId: string) => {
    if (!confirm("Desfazer o último resultado registrado nesta chave?")) return
    setUndoLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/undo`, {
        method: "POST",
        headers: { "x-tatame-pin": getPin() },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao desfazer resultado."); return }
      await load(true)
    } catch {
      setError("Erro ao desfazer resultado.")
    } finally {
      setUndoLoading(false)
    }
  }, [getPin, load])

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
    const key = `${matchId}-${position}`
    setOptimisticCheckins(prev => ({ ...prev, [key]: !current }))
    try {
      await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}/chamada`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ action: "checkin", position, checked: !current }),
      })
      await load(true)
    } catch { /* silencioso */ }
    finally { setOptimisticCheckins(prev => { const n = { ...prev }; delete n[key]; return n }) }
  }, [getPin, load])

  const registrarChamada = useCallback(async (matchId: string, bracketId: string, callNumber: number, _autoWinnerId?: string, absentPosition?: "p1" | "p2" | null) => {
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
        return false
      } else {
        await load(true)
        return true
      }
    } catch {
      setCallError({ matchId, msg: "Erro de conexão." })
      return false
    } finally {
      setCallLoading(null)
    }
  }, [getPin, load])

  const aplicarWOAusencia = useCallback(async (matchId: string, bracketId: string, winnerId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-tatame-pin": getPin() },
        body: JSON.stringify({ winnerId, isWO: true, woType: "AUSENCIA", woWeight: null }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Erro ao registrar W.O.")
      } else {
        setCallMenu(null)
        await load(true)
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setActionLoading(false)
    }
  }, [getPin, load])

  // Auto-seleciona a primeira em andamento ou pendente
  useEffect(() => {
    if (!tatame || selectedId) return
    const active = sortByStarted(
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

  const fetchConsulta = useCallback(async () => {
    if (!tatame) return
    setConsultaLoading(true)
    try {
      const res = await fetch(`/api/coordenador/consulta?eventId=${tatame.event.id}`, {
        headers: { "x-tatame-pin": getPin() },
      })
      const data = await res.json()
      if (Array.isArray(data)) setConsultaResults(data)
      else setConsultaResults([])
    } catch {
      setConsultaResults([])
    } finally {
      setConsultaLoading(false)
    }
  }, [tatame, getPin])

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

  const emAndamento = sortByStarted(tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "EM_ANDAMENTO"
    return !groupDone.has(b.bracketGroupId) && groupEmAndamento.has(b.bracketGroupId)
  }))
  const pendentes = sortByDesignated(tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "PENDENTE" || b.status === "DESIGNADA"
    return !groupDone.has(b.bracketGroupId) && !groupEmAndamento.has(b.bracketGroupId)
  }))
  const finalizadas = [...tatame.brackets.filter(b => {
    if (!b.bracketGroupId) return b.status === "FINALIZADA" || b.status === "PREMIADA"
    return groupDone.has(b.bracketGroupId)
  })].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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
          <div className="flex flex-col gap-1.5 px-2 py-2">
            {items.map(({ section, brackets }) => (
              <div key={section ?? "default"} className="flex flex-col gap-1.5">
                {section && (
                  <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{section}</p>
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
                          onClick={() => { setSelectedId(group[0].id); setSidebarOpen(false) }}
                          className="w-full text-left px-3 py-3.5 rounded-md transition-colors"
                          style={{
                            border: "1px solid var(--border)",
                            borderLeft: `3px solid ${groupIsSelected ? (groupIsActive ? "#fbbf24" : color) : "var(--border-alt)"}`,
                            backgroundColor: groupIsSelected ? (groupIsActive ? "var(--selected-warm)" : "var(--selected-cool)") : "var(--card)",
                          }}
                        >
                          <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>GRUPO — {group.length} sub-chaves</p>
                          <p className="font-medium leading-tight mt-0.5 break-words"
                            style={{ color: groupIsActive ? "var(--hdr-active)" : "var(--foreground)", fontSize: "0.72rem" }}>
                            {catLabel(b).replace(" (Sub-chave)", "")}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
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
                          onClick={() => { setSelectedId(b.id); setSidebarOpen(false) }}
                          className="w-full text-left px-3 py-3.5 rounded-md transition-colors"
                          style={{
                            border: "1px solid var(--border)",
                            borderLeft: `3px solid ${isSelected ? (isActive ? "#fbbf24" : color) : "var(--border-alt)"}`,
                            backgroundColor: isSelected ? (isActive ? "var(--selected-warm)" : "var(--selected-cool)") : "var(--card)",
                          }}
                        >
                          <p className="text-xs" style={{ color: "var(--muted)" }}>Chave #{b.bracketNumber}</p>
                          <p className="font-medium leading-tight mt-0.5 break-words"
                            style={{ color: isActive ? "var(--hdr-active)" : b.status === "FINALIZADA" || b.status === "PREMIADA" ? color : "var(--foreground)", fontSize: "0.72rem" }}>
                            {catLabel(b)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
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
    <div className="flex flex-col h-[calc(100vh-57px)]" style={{ backgroundColor: "var(--page-surface)" }}>

      {/* Overlay de entrada em tela cheia */}
      {showOverlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 80, height: 80, overflow: "hidden", marginBottom: 24 }}>
            <ThemeLogo className="w-full h-full" />
          </div>
          <div style={{ color: "var(--foreground)", fontSize: "1.4rem", fontWeight: 900, marginBottom: 6 }}>
            {tatame.name}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 32 }}>{tatame.event.name}</div>
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
          {/* Botões de consulta rápida */}
          {tatame.event.schedule && (
            <button
              onClick={() => setDocModal({ title: "Cronograma do Evento", url: tatame.event.schedule! })}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: "var(--btn-sched-bg)", color: "var(--btn-sched-fg)", border: "1px solid var(--btn-sched-br)" }}
            >
              📅 Cronograma
            </button>
          )}
          {tatame.event.pesoDoc && (
            <button
              onClick={() => setDocModal({ title: "Tabela de Peso", url: tatame.event.pesoDoc! })}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: "var(--btn-peso-bg)", color: "var(--btn-peso-fg)", border: "1px solid var(--btn-peso-br)" }}
            >
              ⚖️ Tabela de Peso
            </button>
          )}
          <button
            onClick={() => { setConsultaOpen(true); fetchConsulta() }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ backgroundColor: "var(--btn-sched-bg)", color: "var(--btn-sched-fg)", border: "1px solid var(--btn-sched-br)" }}
          >
            🔍 Consulta
          </button>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex gap-2 lg:gap-3 text-xs">
            {emAndamento.length > 0 && <span className="font-bold" style={{ color: "var(--hdr-active)" }}>{emAndamento.length} em andamento</span>}
            <span className="hidden lg:inline font-bold" style={{ color: "var(--hdr-pending)" }}>{pendentes.length} aguardando</span>
            <span className="hidden lg:inline font-bold" style={{ color: "var(--hdr-done)" }}>{finalizadas.length} finalizadas</span>
          </div>
          <span className="font-mono font-bold text-sm tabular-nums" style={{ color: "var(--foreground)" }}>
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Bahia" })}
          </span>
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
        <div className="relative flex flex-1 overflow-hidden">

          {/* Backdrop da gaveta */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-40"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Gaveta lateral deslizante */}
          <div
            className="absolute top-0 right-0 h-full z-50 flex flex-col border-l overflow-hidden"
            style={{
              width: 256,
              borderColor: "var(--border)",
              backgroundColor: "var(--sidebar-surface)",
              transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 200ms ease",
            }}
          >
            {/* Abas */}
            <div className="flex shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setSideTab("ativas")}
                className="flex-1 py-3 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "ativas" ? "var(--hdr-active)" : "var(--muted)",
                  borderBottom: sideTab === "ativas" ? "2px solid var(--hdr-active)" : "2px solid transparent",
                  backgroundColor: "var(--sidebar-surface)",
                }}
              >
                Ativas ({emAndamento.length + pendentes.length})
              </button>
              <button
                onClick={() => setSideTab("finalizadas")}
                className="flex-1 py-3 text-xs font-bold transition-colors"
                style={{
                  color: sideTab === "finalizadas" ? "var(--hdr-done)" : "var(--muted)",
                  borderBottom: sideTab === "finalizadas" ? "2px solid var(--hdr-done)" : "2px solid transparent",
                  backgroundColor: "var(--sidebar-surface)",
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
                    color: "var(--hdr-done)",
                    items: [{ brackets: finalizadas }],
                    emptyText: "Nenhuma chave finalizada ainda.",
                  })
              }
            </div>
          </div>

          {/* Lingüeta — abre/fecha a gaveta */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="absolute z-50"
            style={{
              right: sidebarOpen ? 256 : 0,
              top: "50%",
              transform: "translateY(-50%)",
              transition: "right 200ms ease",
              width: 32,
              height: 88,
              backgroundColor: "#dc2626",
              border: "none",
              borderRadius: "8px 0 0 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "-3px 0 10px rgba(0,0,0,0.4)",
            }}
          >
            <span style={{ fontSize: 16, color: "#ffffff", fontWeight: 700, lineHeight: 1 }}>
              {sidebarOpen ? "›" : "‹"}
            </span>
          </button>

          {/* Conteúdo principal — ocupa toda a largura */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!bracket ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <ChevronRight className="h-10 w-10 text-[#374151]" />
                <p className="text-[#6b7280]">Toque em <strong>‹</strong> para selecionar uma chave.</p>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Controles */}
                <div
                  className="flex flex-col w-96 shrink-0 overflow-y-auto p-4 space-y-4 border-l order-2 mr-7"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Cabeçalho da chave */}
                  <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[#6b7280] text-xs">Chave #{bracket.bracketNumber}</p>
                      <div className="flex items-center gap-2">
                        {(bracket.status === "EM_ANDAMENTO" || bracket.status === "FINALIZADA") &&
                          bracket.matches.some(m => m.endedAt !== null && m.position2Id !== null) && (
                          <button
                            onClick={() => desfazerResultado(bracket.id)}
                            disabled={undoLoading || actionLoading}
                            title="Desfazer último resultado"
                            className="text-[10px] px-2 py-0.5 rounded font-semibold transition-colors disabled:opacity-40 btn-desfazer"
                          >
                            ↩ Desfazer
                          </button>
                        )}
                        {bracket.status === "EM_ANDAMENTO" && bracket.inPanel === false && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ backgroundColor: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d" }}>
                            Fora do Painel
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                            bracket.status === "EM_ANDAMENTO" ? "badge-em-andamento" :
                            bracket.status === "FINALIZADA" ? "badge-finalizada" :
                            bracket.status === "PREMIADA" ? "badge-premiada" : "badge-aguardando"
                          }`}
                        >
                          {bracket.status === "EM_ANDAMENTO" ? "Em Andamento" :
                           bracket.status === "FINALIZADA" ? "Finalizada" :
                           bracket.status === "PREMIADA" ? "Premiada" : "Aguardando"}
                        </span>
                      </div>
                    </div>
                    <p className="text-white font-bold text-xs leading-tight whitespace-nowrap overflow-hidden">{catLabel(bracket)}</p>
                    {!bracket.isAbsolute && (
                      <p className="text-[#4b5563] text-xs mt-0.5">
                        até {bracket.weightCategory.maxWeight === 999 ? "∞" : `${bracket.weightCategory.maxWeight}kg`}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#dc2626", color: "#fca5a5" }}>
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
                        const p1Present = `${match.id}-p1` in optimisticCheckins ? optimisticCheckins[`${match.id}-p1`] : match.p1CheckedIn
                        const p2Present = `${match.id}-p2` in optimisticCheckins ? optimisticCheckins[`${match.id}-p2`] : match.p2CheckedIn
                        const bothPresent = p1Present && p2Present
                        const calls = match.callTimes ?? []
                        const callErr = callError?.matchId === match.id ? callError : null
                        return (
                          <div key={match.id} className="rounded-xl border overflow-hidden"
                            style={{
                              borderColor: isDone ? "#166534" : bothPresent ? "#16a34a" : "var(--border-alt)",
                              backgroundColor: "var(--card)",
                            }}>
                            <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                              <span className="text-xs text-[#6b7280] whitespace-nowrap shrink-0">
                                R{match.round} · P{match.matchNumber}
                              </span>
                              {isDone ? (
                                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--hdr-done)" }}>
                                  {match.isWO ? `W.O. (${match.woType === "PESO" ? "Peso" : "Ausência"})` : "Finalizada"}
                                </span>
                              ) : bothPresent ? (
                                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--hdr-done)" }}>● Prontos</span>
                              ) : (
                                <span className="text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>Confirme presença</span>
                              )}
                            </div>


                            {/* Atleta 1 */}
                            <div className="w-full px-4 py-4 flex items-center gap-3"
                              style={{ backgroundColor: isDone ? (winnerIsP1 ? "#166534" : "transparent") : "var(--surface-match)", borderBottom: "1px solid var(--border)" }}>
                              <button
                                onClick={() => !isDone && p1Name !== "BYE" && togglePresent(match.id, match._bracketId, "p1", p1Present)}
                                disabled={isDone || p1Name === "BYE"}
                                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-base transition-colors duration-100 disabled:cursor-default"
                                style={{ backgroundColor: isDone && winnerIsP1 ? "#16a34a" : p1Present ? "#15803d" : "var(--surface-input)", color: "var(--foreground)" }}
                                title={p1Present ? "Marcar como ausente" : "Marcar como presente"}
                              >
                                {(isDone && winnerIsP1) || p1Present ? "✓" : (p1?.position ?? "1")}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{p1Name}</p>
                                {getAthleteTeam(p1) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p1)}</p>}
                              </div>
                              {!isDone && p1Name !== "BYE" && (() => {
                                const p1Calls = calls.filter((c: CallTime) => c.pos === "p1" || !c.pos).sort((a: CallTime, b: CallTime) => a.call - b.call)
                                if (!p1Present && p1Calls.length > 0) {
                                  return (
                                    <div className="flex flex-col items-end gap-0 shrink-0">
                                      {p1Calls.map((ct: CallTime) => (
                                        <span key={ct.call} className="text-[9px] leading-tight font-semibold" style={{ color: "#f87171" }}>
                                          {ct.call}ª {new Date(ct.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                }
                                return (
                                  <button
                                    onClick={() => bothPresent && !actionLoading && p1?.id && declararVencedor(match._bracketId, match.id, p1.id)}
                                    disabled={!bothPresent || actionLoading}
                                    className="text-sm font-bold shrink-0 px-3 py-2 rounded-lg transition-opacity min-w-[48px] text-center"
                                    style={{ color: bothPresent ? "#dc2626" : "var(--muted)", cursor: bothPresent ? "pointer" : "default" }}
                                  >
                                    TAP
                                  </button>
                                )
                              })()}
                            </div>

                            {/* VS */}
                            <div className="flex items-center gap-2 px-4" style={{ backgroundColor: "var(--background)" }}>
                              <div className="flex-1 h-px" style={{ backgroundColor: bothPresent && !isDone ? "var(--hdr-done)" : "var(--border)", opacity: bothPresent && !isDone ? 0.4 : 1 }} />
                              <span className="text-xs font-bold py-1" style={{ color: bothPresent && !isDone ? "var(--hdr-done)" : "var(--muted)" }}>VS</span>
                              <div className="flex-1 h-px" style={{ backgroundColor: bothPresent && !isDone ? "var(--hdr-done)" : "var(--border)", opacity: bothPresent && !isDone ? 0.4 : 1 }} />
                            </div>

                            {/* Atleta 2 */}
                            <div className="w-full px-4 py-4 flex items-center gap-3"
                              style={{ backgroundColor: isDone ? (winnerIsP2 ? "#166534" : "transparent") : "var(--surface-match)" }}>
                              <button
                                onClick={() => !isDone && p2Name !== "BYE" && togglePresent(match.id, match._bracketId, "p2", p2Present)}
                                disabled={isDone || p2Name === "BYE"}
                                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-base transition-colors duration-100 disabled:cursor-default"
                                style={{ backgroundColor: isDone && winnerIsP2 ? "#16a34a" : p2Present ? "#15803d" : "var(--surface-input)", color: "var(--foreground)" }}
                                title={p2Present ? "Marcar como ausente" : "Marcar como presente"}
                              >
                                {(isDone && winnerIsP2) || p2Present ? "✓" : (p2?.position ?? "2")}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{p2Name !== "BYE" ? p2Name : "— BYE —"}</p>
                                {getAthleteTeam(p2) && <p className="text-xs text-[#6b7280] truncate">{getAthleteTeam(p2)}</p>}
                              </div>
                              {!isDone && p2Name !== "BYE" && (() => {
                                const p2Calls = calls.filter((c: CallTime) => c.pos === "p2" || !c.pos).sort((a: CallTime, b: CallTime) => a.call - b.call)
                                if (!p2Present && p2Calls.length > 0) {
                                  return (
                                    <div className="flex flex-col items-end gap-0 shrink-0">
                                      {p2Calls.map((ct: CallTime) => (
                                        <span key={ct.call} className="text-[9px] leading-tight font-semibold" style={{ color: "#f87171" }}>
                                          {ct.call}ª {new Date(ct.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                }
                                return (
                                  <button
                                    onClick={() => bothPresent && !actionLoading && p2?.id && declararVencedor(match._bracketId, match.id, p2.id)}
                                    disabled={!bothPresent || actionLoading}
                                    className="text-sm font-bold shrink-0 px-3 py-2 rounded-lg transition-opacity min-w-[48px] text-center"
                                    style={{ color: bothPresent ? "#dc2626" : "var(--muted)", cursor: bothPresent ? "pointer" : "default" }}
                                  >
                                    TAP
                                  </button>
                                )
                              })()}
                            </div>

                            {!isDone && p1?.id && p2?.id && (
                              <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                                {callMenu?.matchId !== match.id ? (
                                  <>
                                    <div className="flex gap-2">
                                      <button onClick={() => setCallMenu({ matchId: match.id, bracketId: match._bracketId, winnerId: p2.id, absenteeName: p1Name, absentPosition: "p1" })} disabled={actionLoading}
                                        className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors btn-opcoes">
                                        Opções — {p1Name.split(" ")[0]}
                                      </button>
                                      <button onClick={() => setCallMenu({ matchId: match.id, bracketId: match._bracketId, winnerId: p1.id, absenteeName: p2Name, absentPosition: "p2" })} disabled={actionLoading}
                                        className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors btn-opcoes">
                                        Opções — {p2Name.split(" ")[0]}
                                      </button>
                                    </div>
                                    <button onClick={() => setWoModal({ matchId: match.id, winnerId: "", bracketId: match._bracketId, p1Name, p2Name })} disabled={actionLoading}
                                      className="w-full py-3 rounded-lg text-sm font-semibold transition-colors btn-wo-ambos">
                                      W.O. — Ambos Ausentes
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-semibold" style={{ color: "var(--destructive)" }}>Chamadas — {callMenu.absenteeName.split(" ")[0]}</p>
                                    {(() => {
                                      const posCalls = calls.filter((c: CallTime) => c.pos === callMenu.absentPosition || !c.pos).sort((a: CallTime, b: CallTime) => a.call - b.call)
                                      const all3Done = posCalls.some((c: CallTime) => c.call === 3)
                                      return (
                                        <>
                                          {!all3Done ? (
                                            <>
                                              <div className="flex gap-1.5">
                                                {[1, 2, 3].map(n => {
                                                  const done = posCalls.some((c: CallTime) => c.call === n)
                                                  const isLoadingCall = callLoading === `${match.id}-${n}`
                                                  const canCall = n === 1 ? !done : (posCalls.some((c: CallTime) => c.call === n - 1) && !done)
                                                  return (
                                                    <button
                                                      key={n}
                                                      onClick={async () => { if (!canCall) return; const ok = await registrarChamada(match.id, match._bracketId, n, callMenu.winnerId, callMenu.absentPosition); if (ok) setCallMenu(null) }}
                                                      disabled={!canCall || !!callLoading || actionLoading}
                                                      className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                                                      style={{ backgroundColor: done ? "#15803d" : n === 2 ? "var(--call-2-bg)" : n === 3 ? "var(--call-3-bg)" : "var(--surface-button)", color: done ? "#4ade80" : n === 2 ? "var(--call-2-color)" : n === 3 ? "var(--call-3-color)" : "var(--muted-foreground)" }}
                                                    >
                                                      {isLoadingCall ? "..." : done ? `✓ ${n}ª` : `${n}ª Chamada`}
                                                    </button>
                                                  )
                                                })}
                                              </div>
                                              {callErr && <p className="text-[#f87171] text-xs">{callErr.msg}</p>}
                                              <CallCountdown calls={calls} absentPosition={callMenu.absentPosition} />
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => aplicarWOAusencia(match.id, match._bracketId, callMenu.winnerId)}
                                              disabled={actionLoading}
                                              className="w-full py-2 rounded-lg text-sm font-bold text-white"
                                              style={{ backgroundColor: "#dc2626" }}
                                            >
                                              {actionLoading ? "..." : "W.O. — Confirmar ausência"}
                                            </button>
                                          )}
                                          {posCalls.length > 0 && (
                                            <div className="flex flex-col gap-0.5">
                                              {posCalls.map((ct: CallTime) => (
                                                <span key={ct.call} className="text-[10px]" style={{ color: "#6b7280" }}>
                                                  {ct.call}ª chamada — {new Date(ct.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </>
                                      )
                                    })()}
                                    <button
                                      onClick={() => { setWoModal({ matchId: match.id, winnerId: callMenu.winnerId, bracketId: match._bracketId }); setPesoStep(true); setCallMenu(null) }}
                                      disabled={actionLoading}
                                      className="w-full py-3 rounded-lg text-sm font-semibold"
                                      style={{ backgroundColor: "#78350f", color: "#ffffff" }}
                                    >
                                      Desclassificação por Peso
                                    </button>
                                    <button
                                      onClick={() => { setDesclModal({ matchId: match.id, bracketId: match._bracketId, winnerId: callMenu.winnerId, loserName: callMenu.absenteeName }); setDesclReason(""); setCallMenu(null) }}
                                      disabled={actionLoading}
                                      className="w-full py-3 rounded-lg text-sm font-semibold"
                                      style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
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

                  {/* Partidas solo: 1 atleta aguardando pesagem — exibidas somente após iniciar */}
                  {groupBrackets.some(b => b.status === "EM_ANDAMENTO") && soloMatches.map(match => {
                    const p1 = match.position1
                    const p1Name = getAthleteName(p1)
                    const p1Present = `${match.id}-p1` in optimisticCheckins ? optimisticCheckins[`${match.id}-p1`] : match.p1CheckedIn
                    const isMid = match._isMidBracket
                    const calls = match.callTimes ?? []
                    const callErr = callError?.matchId === match.id ? callError : null
                    return (
                      <div key={match.id} className="rounded-xl border overflow-hidden"
                        style={{ borderColor: p1Present ? "#16a34a" : "#d97706", backgroundColor: "var(--card)" }}>
                        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span className="text-xs font-semibold" style={{ color: isMid ? "var(--confirm-title)" : "#fbbf24" }}>
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
                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-base transition-colors duration-100"
                            style={{ backgroundColor: (!isMid && p1Present) ? "#15803d" : "var(--surface-input)", color: "var(--foreground)" }}
                          >
                            {(!isMid && p1Present) ? "✓" : (p1?.position ?? "1")}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs truncate" style={{ color: "var(--foreground)" }}>{p1Name}</p>
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
                              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors btn-wo-solo"
                            >
                              W.O.
                            </button>
                          )}
                        </div>
                        {callMenu?.matchId === match.id && (
                          <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <p className="text-xs text-[#f87171] font-semibold pt-2">Chamadas — {callMenu.absenteeName.split(" ")[0]}</p>
                            {(() => {
                              const posCalls = calls.filter((c: CallTime) => c.pos === callMenu.absentPosition || !c.pos).sort((a: CallTime, b: CallTime) => a.call - b.call)
                              const all3Done = posCalls.some((c: CallTime) => c.call === 3)
                              return (
                                <>
                                  {!all3Done ? (
                                    <>
                                      <div className="flex gap-1.5">
                                        {[1, 2, 3].map(n => {
                                          const done = posCalls.some((c: CallTime) => c.call === n)
                                          const isLoadingCall = callLoading === `${match.id}-${n}`
                                          const canCall = n === 1 ? !done : (posCalls.some((c: CallTime) => c.call === n - 1) && !done)
                                          return (
                                            <button
                                              key={n}
                                              onClick={async () => { if (!canCall) return; const ok = await registrarChamada(match.id, match._bracketId, n, callMenu.winnerId, callMenu.absentPosition); if (ok) setCallMenu(null) }}
                                              disabled={!canCall || !!callLoading || actionLoading}
                                              className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                                              style={{ backgroundColor: done ? "#15803d" : n === 2 ? "var(--call-2-bg)" : n === 3 ? "var(--call-3-bg)" : "var(--surface-button)", color: done ? "#4ade80" : n === 2 ? "var(--call-2-color)" : n === 3 ? "var(--call-3-color)" : "var(--muted-foreground)" }}
                                            >
                                              {isLoadingCall ? "..." : done ? `✓ ${n}ª` : `${n}ª Chamada`}
                                            </button>
                                          )
                                        })}
                                      </div>
                                      {callErr && <p className="text-[#f87171] text-xs">{callErr.msg}</p>}
                                      <CallCountdown calls={calls} absentPosition={callMenu.absentPosition} />
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => aplicarWOAusencia(match.id, match._bracketId, callMenu.winnerId)}
                                      disabled={actionLoading}
                                      className="w-full py-2 rounded-lg text-sm font-bold text-white"
                                      style={{ backgroundColor: "#dc2626" }}
                                    >
                                      {actionLoading ? "..." : "W.O. — Confirmar ausência"}
                                    </button>
                                  )}
                                  {posCalls.length > 0 && (
                                    <div className="flex flex-col gap-0.5">
                                      {posCalls.map((ct: CallTime) => (
                                        <span key={ct.call} className="text-[10px]" style={{ color: "#6b7280" }}>
                                          {ct.call}ª chamada — {new Date(ct.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
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
                                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hdr-active)" }}>🏅 Campeão</p>
                                        <p className="text-white text-base font-bold">{getAthleteName(bChamp)}</p>
                                        {getAthleteTeam(bChamp) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(bChamp)}</p>}
                                      </div>
                                    ) : <p className="text-[#6b7280] text-sm">Em andamento</p>}
                                  </div>
                                )
                              })}
                              <p className="text-sm font-semibold mt-2" style={{ color: "var(--hdr-active)" }}>⏳ Aguardando Grande Final</p>
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
                                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hdr-active)" }}>🥇 1° Lugar</p>
                                  <p className="text-white text-xl font-bold">{getAthleteName(champion)}</p>
                                  {getAthleteTeam(champion) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(champion)}</p>}
                                </div>
                              )}
                              {runnerUp && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--podium-silver)" }}>🥈 2° Lugar</p>
                                  <p className="text-white text-base font-semibold">{getAthleteName(runnerUp)}</p>
                                  {getAthleteTeam(runnerUp) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(runnerUp)}</p>}
                                </div>
                              )}
                              {thirdPlace && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--podium-bronze)" }}>🥉 3° Lugar</p>
                                  <p className="text-white text-base font-semibold">{getAthleteName(thirdPlace)}</p>
                                  {getAthleteTeam(thirdPlace) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(thirdPlace)}</p>}
                                </div>
                              )}
                              <p className="text-center font-semibold text-sm" style={{ color: "var(--hdr-done)" }}>
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
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hdr-active)" }}>🥇 1° Lugar</p>
                                <p className="text-white text-xl font-bold">{getAthleteName(champion)}</p>
                                {getAthleteTeam(champion) && <p className="text-[#9ca3af] text-sm">{getAthleteTeam(champion)}</p>}
                              </div>
                            )}
                            {runnerUp && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--podium-silver)" }}>🥈 2° Lugar</p>
                                <p className="text-white text-base font-semibold">{getAthleteName(runnerUp)}</p>
                                {getAthleteTeam(runnerUp) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(runnerUp)}</p>}
                              </div>
                            )}
                            {thirdPlace && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--podium-bronze)" }}>🥉 3° Lugar</p>
                                <p className="text-white text-base font-semibold">{getAthleteName(thirdPlace)}</p>
                                {getAthleteTeam(thirdPlace) && <p className="text-[#6b7280] text-sm">{getAthleteTeam(thirdPlace)}</p>}
                              </div>
                            )}
                            <p className="text-center font-semibold text-sm" style={{ color: "var(--hdr-done)" }}>
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
                <div className="flex flex-col flex-1 overflow-auto p-5 space-y-6 min-h-0 order-1">
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
        <div className={`fixed inset-0 z-50 flex ${pesoStep ? "items-start pt-12" : "items-end"} justify-center p-4`} style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
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
                  style={{ backgroundColor: "var(--card)", borderColor: pesoInput ? "#dc2626" : "var(--border)" }}
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

      {/* Modal de consulta rápida de documento — swipe em qualquer direção para fechar */}
      {docModal && (() => {
        const closeTap = () => {
          ;(document.activeElement as HTMLElement)?.blur()
          if (docOverlayRef.current) docOverlayRef.current.style.display = "none"
          if (docBackdropRef.current) {
            docBackdropRef.current.style.transition = "opacity 0.15s"
            docBackdropRef.current.style.opacity = "0"
          }
          if (docCardRef.current) {
            docCardRef.current.style.transition = "opacity 0.15s"
            docCardRef.current.style.opacity = "0"
          }
          setTimeout(() => setDocModal(null), 150)
        }
        const onTouchStart = (e: React.TouchEvent) => {
          const t = e.touches[0]
          docDragStartRef.current = { x: t.clientX, y: t.clientY }
          docDragCurrRef.current = { dx: 0, dy: 0 }
          if (docCardRef.current) docCardRef.current.style.transition = "none"
        }
        const onTouchMove = (e: React.TouchEvent) => {
          if (!docDragStartRef.current || !docCardRef.current) return
          const t = e.touches[0]
          const dx = t.clientX - docDragStartRef.current.x
          const dy = t.clientY - docDragStartRef.current.y
          docDragCurrRef.current = { dx, dy }
          const dist = Math.sqrt(dx * dx + dy * dy)
          const canClose = dist > 80
          docCardRef.current.style.transform = `translate(${dx}px,${dy}px) rotate(${dx * 0.04}deg)`
          docCardRef.current.style.opacity = String(Math.max(0.15, 1 - dist / 220))
          if (docBackdropRef.current)
            docBackdropRef.current.style.opacity = String(Math.max(0.18, 1 - dist / 400))
          if (docHintRef.current) {
            docHintRef.current.style.backgroundColor = canClose ? "rgba(22,163,74,0.9)" : "rgba(0,0,0,0.65)"
            const span = docHintRef.current.querySelector("span")
            if (span) span.textContent = canClose ? "✓ Solte para fechar" : "↕ Arraste em qualquer direção para fechar"
          }
        }
        const onTouchEnd = (e: React.TouchEvent) => {
          e.preventDefault()
          const { dx, dy } = docDragCurrRef.current
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (!docDragStartRef.current) return
          docDragStartRef.current = null
          if (dist > 80) {
            // Anima saída e fecha — sem nenhum setState durante o drag
            ;(document.activeElement as HTMLElement)?.blur()
            if (docOverlayRef.current) docOverlayRef.current.style.display = "none"
            if (docCardRef.current) {
              docCardRef.current.style.pointerEvents = "none"
              docCardRef.current.style.transition = "transform 0.15s ease-out, opacity 0.15s ease-out"
              docCardRef.current.style.transform = `translate(${dx * 5}px,${dy * 5}px) rotate(${dx * 0.04}deg)`
              docCardRef.current.style.opacity = "0"
            }
            if (docBackdropRef.current) {
              docBackdropRef.current.style.transition = "opacity 0.15s"
              docBackdropRef.current.style.opacity = "0"
            }
            setTimeout(() => setDocModal(null), 150)
          } else {
            // Volta ao lugar
            if (docCardRef.current) {
              docCardRef.current.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out"
              docCardRef.current.style.transform = "translate(0,0) rotate(0deg)"
              docCardRef.current.style.opacity = "1"
            }
            if (docBackdropRef.current) {
              docBackdropRef.current.style.transition = "opacity 0.2s"
              docBackdropRef.current.style.opacity = "1"
            }
            if (docHintRef.current) {
              docHintRef.current.style.backgroundColor = "rgba(0,0,0,0.65)"
              const span = docHintRef.current.querySelector("span")
              if (span) span.textContent = "↕ Arraste em qualquer direção para fechar"
            }
            docDragCurrRef.current = { dx: 0, dy: 0 }
          }
        }
        const onTouchCancel = () => {
          docDragStartRef.current = null
          docDragCurrRef.current = { dx: 0, dy: 0 }
          if (docCardRef.current) {
            docCardRef.current.style.transition = "transform 0.2s, opacity 0.2s"
            docCardRef.current.style.transform = "translate(0,0) rotate(0deg)"
            docCardRef.current.style.opacity = "1"
          }
        }
        return (
          <>
            {/* 1. Backdrop — só visual, nunca intercepta eventos */}
            <div
              ref={docBackdropRef}
              className="fixed inset-0"
              style={{ zIndex: 49, backgroundColor: "rgba(0,0,0,0.55)", pointerEvents: "none" }}
            />
            {/* 2. Click-catcher transparente — display:none imediatamente ao fechar */}
            <div
              ref={docOverlayRef}
              className="fixed inset-0"
              style={{ zIndex: 50 }}
              onTouchEnd={e => { e.preventDefault(); closeTap() }}
              onClick={() => closeTap()}
            />
            {/* 3. Card — pointerEvents:none no container, auto no card */}
            <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 51, pointerEvents: "none" }}>
              <div
                ref={docCardRef}
                style={{
                  maxWidth: "min(80vw, 720px)", maxHeight: "85vh",
                  display: "flex", flexDirection: "column",
                  borderRadius: "1rem", overflow: "hidden",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                  userSelect: "none", touchAction: "none", pointerEvents: "auto",
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onTouchCancel={onTouchCancel}
              >
                <div className="flex items-center justify-between px-3 py-2 shrink-0"
                  style={{ backgroundColor: "rgba(0,0,0,0.65)", borderRadius: "1rem 1rem 0 0" }}>
                  <span className="text-white font-semibold text-xs">{docModal.title}</span>
                  <button
                    onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); closeTap() }}
                    onClick={closeTap}
                    className="text-[#9ca3af] hover:text-white text-base leading-none ml-3"
                  >✕</button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={docModal.url}
                  alt={docModal.title}
                  draggable={false}
                  style={{ display: "block", maxWidth: "min(80vw, 720px)", maxHeight: "74vh", width: "auto", height: "auto" }}
                />
                <div ref={docHintRef} style={{
                  backgroundColor: "rgba(0,0,0,0.65)", padding: "7px 12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "0 0 1rem 1rem",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>
                    ↕ Arraste em qualquer direção para fechar
                  </span>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* Modal de Desclassificação com motivo */}
      {desclModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
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
        const baseWeights = Array.from(
          new Map(
            (consultaResults ?? [])
              .filter(r =>
                !r.isAbsolute &&
                (!consultaSex || r.weightCategory.sex === consultaSex) &&
                (!consultaAge || r.weightCategory.ageGroup === consultaAge)
              )
              .map(r => [r.weightCategory.name, r.weightCategory])
          ).values()
        ).sort((a, b) => a.maxWeight - b.maxWeight)
        const hasAbsoluto = (consultaResults ?? []).some(r =>
          r.isAbsolute &&
          (!consultaSex || r.weightCategory.sex === consultaSex) &&
          (!consultaAge || r.weightCategory.ageGroup === consultaAge)
        )
        const weightOptions = [
          ...baseWeights,
          ...(hasAbsoluto ? [{ name: "Absoluto" }] : []),
        ]

        const snap = consultaSnapshot
        const filteredConsulta = snap
          ? (consultaResults ?? []).filter(r => {
              if (snap.sex && r.weightCategory.sex !== snap.sex) return false
              if (snap.age && r.weightCategory.ageGroup !== snap.age) return false
              if (snap.belt && r.belt !== snap.belt) return false
              if (snap.weight === "Absoluto") {
                if (!r.isAbsolute) return false
              } else if (snap.weight) {
                if (r.weightCategory.name !== snap.weight) return false
              }
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
            <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-4" style={{ bottom: vvBottom, pointerEvents: "none" }}>
              <div
                className="w-full max-w-lg rounded-2xl flex flex-col"
                style={{ backgroundColor: "var(--card-alt)", maxHeight: "100%", pointerEvents: "auto" }}
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
    </div>
  )
}
