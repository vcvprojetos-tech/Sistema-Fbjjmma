"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Trophy, AlertCircle } from "lucide-react"

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
  weightCategory: { name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: BracketPositionData[]
  matches: MatchData[]
}

function getAthleteName(pos: BracketPositionData | null): string {
  if (!pos?.registration) return "BYE"
  return pos.registration.athlete?.user.name ?? pos.registration.guestName ?? "—"
}

function getAthleteTeam(pos: BracketPositionData | null): string | null {
  return pos?.registration?.team?.name ?? null
}

export default function ChaveControlePage() {
  const { tatameId, bracketId } = useParams<{ tatameId: string; bracketId: string }>()
  const router = useRouter()
  const [bracket, setBracket] = useState<BracketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [woModal, setWoModal] = useState<{ matchId: string; winnerId: string } | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/coordenador/tatame/${tatameId}`)
      const data = await res.json()
      if (data.brackets) {
        const b = data.brackets.find((x: BracketData) => x.id === bracketId)
        if (b) setBracket(b)
      }
    } catch {
      setError("Erro ao carregar dados.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tatameId, bracketId])

  useEffect(() => { load() }, [load])

  // SSE: server pushes "refresh" instantly when bracket changes
  useEffect(() => {
    const es = new EventSource(`/api/coordenador/tatame/${tatameId}/stream`)
    es.onmessage = () => load(true)
    es.onerror = () => es.close()
    return () => es.close()
  }, [tatameId, load])

  // Fallback polling every 10s
  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  async function iniciarChave() {
    setActionLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/iniciar`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Erro ao iniciar chave.")
      else await load()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setActionLoading(false)
    }
  }

  async function declararVencedor(matchId: string, winnerId: string, isWO = false, woType?: string) {
    setActionLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/coordenador/chave/${bracketId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, isWO, woType: woType || null }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Erro ao registrar resultado.")
      else await load()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setActionLoading(false)
      setWoModal(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b7280]">Carregando...</p>
      </div>
    )
  }

  if (!bracket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-[#6b7280]">Chave não encontrada.</p>
        <button onClick={() => router.back()} className="text-[#dc2626] text-sm underline">Voltar</button>
      </div>
    )
  }

  const title = [
    bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
    AGE_GROUP_LABELS[bracket.weightCategory.ageGroup] || bracket.weightCategory.ageGroup,
    `${bracket.weightCategory.name} (até ${bracket.weightCategory.maxWeight}kg)`,
    BELT_LABELS[bracket.belt] || bracket.belt,
    bracket.isAbsolute ? "Absoluto" : null,
  ].filter(Boolean).join(" · ")

  const pendingMatches = bracket.matches.filter((m) => !m.winnerId)
  const currentRound = pendingMatches.length > 0
    ? Math.min(...pendingMatches.map((m) => m.round))
    : null
  // Todas as partidas prontas (ambos atletas definidos e sem vencedor), em qualquer rodada
  const currentMatches = bracket.matches
    .filter((m) => !m.winnerId && m.position1Id !== null && m.position2Id !== null)
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)

  // Find overall winner (last match winner)
  // Partida final = última com dois atletas reais (exclui W.O. de avanço com position2Id null)
  const lastMatch = bracket.matches.length > 0
    ? [...bracket.matches]
        .filter(m => m.position1Id !== null && m.position2Id !== null)
        .sort((a, b) => b.round - a.round || b.matchNumber - a.matchNumber)[0] ?? null
    : null
  const champion = bracket.status === "FINALIZADA" && lastMatch?.winnerId
    ? bracket.positions.find((p) => p.id === lastMatch.winnerId)
    : null

  const realMatches = bracket.matches.filter(m => m.position1Id !== null && m.position2Id !== null)
  const maxRealRound = realMatches.length > 0 ? Math.max(...realMatches.map(m => m.round)) : 0
  const maxRound = bracket.matches.length > 0
    ? Math.max(...bracket.matches.map((m) => m.round))
    : 0

  // 2nd place = loser of the final match
  const runnerUp = bracket.status === "FINALIZADA" && lastMatch
    ? bracket.positions.find((p) =>
        p.id === (lastMatch.winnerId === lastMatch.position1Id ? lastMatch.position2Id : lastMatch.position1Id)
      ) ?? null
    : null

  // 3rd place logic:
  // - 3-athlete bracket: loser of round 2 (repescagem) — use embedded position objects
  // - Standard bracket: loser of champion's semifinal
  const thirdPlace: BracketPositionData | null = (() => {
    if (bracket.status !== "FINALIZADA" || !lastMatch?.winnerId) return null
    if (bracket.positions.length === 3) {
      // 3-athlete: 3rd place = whoever is neither 1st nor 2nd
      const firstId = lastMatch.winnerId
      const secondId = lastMatch.winnerId === lastMatch.position1Id
        ? lastMatch.position2Id
        : lastMatch.position1Id
      return bracket.positions.find((p) => p.id !== firstId && p.id !== secondId) ?? null
    }
    if (!champion || maxRealRound < 2) return null
    const semiWonByChampion = realMatches.find(
      (m) => m.round === maxRealRound - 1 && m.winnerId === champion.id
    )
    if (!semiWonByChampion) return null
    const loserId = semiWonByChampion.winnerId === semiWonByChampion.position1Id
      ? semiWonByChampion.position2Id
      : semiWonByChampion.position1Id
    return loserId ? bracket.positions.find((p) => p.id === loserId) ?? null : null
  })()

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => router.push(`/coordenador/${tatameId}`)}
          className="text-[#6b7280] hover:text-white mt-1 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#6b7280] text-xs">Chave #{bracket.bracketNumber}</p>
          <p className="text-white font-bold text-sm leading-tight">{title}</p>
        </div>
        <button onClick={() => load(true)} className="text-[#6b7280] hover:text-white shrink-0 mt-1">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#dc2626", color: "#fca5a5" }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status: PENDENTE or DESIGNADA — show start button */}
      {(bracket.status === "PENDENTE" || bracket.status === "DESIGNADA") && (
        <div className="space-y-4 py-8 text-center">
          <p className="text-[#9ca3af] text-sm">{bracket.positions.length} atleta(s) nesta chave</p>
          <button
            onClick={iniciarChave}
            disabled={actionLoading}
            className="w-full h-16 rounded-xl text-white font-bold text-lg transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#16a34a" }}
          >
            {actionLoading ? "Iniciando..." : "▶ INICIAR CHAVE"}
          </button>
        </div>
      )}

      {/* Status: EM_ANDAMENTO — show current round matches */}
      {bracket.status === "EM_ANDAMENTO" && (
        <div className="space-y-4">
          {currentMatches.length > 0 && (
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">
                {currentMatches.length} luta(s) disponível(is)
              </h2>
              <span className="text-xs text-white px-2 py-1 rounded-full" style={{ backgroundColor: "#92400e" }}>
                EM ANDAMENTO
              </span>
            </div>
          )}

          {currentMatches.map((match) => {
            const p1 = match.position1
            const p2 = match.position2
            const p1Name = getAthleteName(p1)
            const p2Name = getAthleteName(p2)
            const p1Team = getAthleteTeam(p1)
            const p2Team = getAthleteTeam(p2)
            const isDone = !!match.winnerId
            const winnerIsP1 = match.winnerId === match.position1Id
            const winnerIsP2 = match.winnerId === match.position2Id

            return (
              <div
                key={match.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: isDone ? "#166534" : "#333", backgroundColor: "var(--card)" }}
              >
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs text-[#6b7280]">R{match.round} · Partida {match.matchNumber}</span>
                  {isDone && (
                    <span className="text-xs text-[#4ade80] font-semibold">
                      {match.isWO ? `W.O. (${match.woType === "PESO" ? "Peso" : "Ausência"})` : "Finalizada"}
                    </span>
                  )}
                </div>

                {/* Athlete 1 button */}
                <button
                  onClick={() => !isDone && !actionLoading && p1?.id && p1Name !== "BYE" && declararVencedor(match.id, p1.id)}
                  disabled={isDone || actionLoading || !p1?.id || p1Name === "BYE"}
                  className="w-full px-4 py-5 text-left flex items-center gap-3 transition-colors disabled:cursor-default"
                  style={{
                    backgroundColor: isDone
                      ? (winnerIsP1 ? "#14532d30" : "transparent")
                      : "#111",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: isDone && winnerIsP1 ? "#16a34a" : "#222", color: "var(--foreground)" }}
                  >
                    {isDone && winnerIsP1 ? "✓" : "1"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p1Name}</p>
                    {p1Team && <p className="text-xs text-[#6b7280] truncate">{p1Team}</p>}
                  </div>
                  {!isDone && p1Name !== "BYE" && (
                    <span className="text-xs text-[#dc2626] font-bold shrink-0">TAP P/ VENCER</span>
                  )}
                </button>

                {/* VS divider */}
                <div className="flex items-center gap-2 px-4" style={{ backgroundColor: "var(--background)" }}>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#222" }} />
                  <span className="text-xs text-[#444] font-bold py-1">VS</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#222" }} />
                </div>

                {/* Athlete 2 button */}
                <button
                  onClick={() => !isDone && !actionLoading && p2?.id && p2Name !== "BYE" && declararVencedor(match.id, p2.id)}
                  disabled={isDone || actionLoading || !p2?.id || p2Name === "BYE"}
                  className="w-full px-4 py-5 text-left flex items-center gap-3 transition-colors disabled:cursor-default"
                  style={{
                    backgroundColor: isDone
                      ? (winnerIsP2 ? "#14532d30" : "transparent")
                      : "#111",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: isDone && winnerIsP2 ? "#16a34a" : "#222", color: "var(--foreground)" }}
                  >
                    {isDone && winnerIsP2 ? "✓" : "2"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p2Name !== "BYE" ? p2Name : "— BYE —"}</p>
                    {p2Team && <p className="text-xs text-[#6b7280] truncate">{p2Team}</p>}
                  </div>
                  {!isDone && p2Name !== "BYE" && (
                    <span className="text-xs text-[#dc2626] font-bold shrink-0">TAP P/ VENCER</span>
                  )}
                </button>

                {/* W.O. button */}
                {!isDone && p1?.id && p2?.id && (
                  <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={() => setWoModal({ matchId: match.id, winnerId: p1.id })}
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors"
                    >
                      W.O. — {p1Name.split(" ")[0]} vence
                    </button>
                    <button
                      onClick={() => setWoModal({ matchId: match.id, winnerId: p2.id })}
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#f87171] border border-[#7f1d1d40] hover:bg-[#7f1d1d20] transition-colors"
                    >
                      W.O. — {p2Name.split(" ")[0]} vence
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Partidas aguardando definição de atletas */}
          {bracket.matches.filter((m) => !m.winnerId && (!m.position1Id || !m.position2Id)).length > 0 && (
            <p className="text-xs text-[#4b5563] text-center py-1">
              + {bracket.matches.filter((m) => !m.winnerId && (!m.position1Id || !m.position2Id)).length} luta(s) aguardando definição de atletas
            </p>
          )}

          {/* Partidas concluídas */}
          {bracket.matches.filter((m) => m.winnerId).length > 0 && (
            <details className="text-xs text-[#6b7280]">
              <summary className="cursor-pointer py-2 select-none">Partidas concluídas</summary>
              <div className="space-y-1 mt-2">
                {bracket.matches
                  .filter((m) => m.winnerId)
                  .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
                  .map((m) => {
                    const winnerPos = m.winner
                      ? bracket.positions.find((p) => p.id === m.winner?.id)
                      : null
                    return (
                      <p key={m.id} className="px-2">
                        R{m.round} #{m.matchNumber} → {winnerPos ? getAthleteName(winnerPos) : "—"}
                        {m.isWO && " (W.O.)"}
                      </p>
                    )
                  })}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Status: FINALIZADA — show podium */}
      {bracket.status === "FINALIZADA" && (
        <div className="space-y-4 py-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="h-12 w-12 text-[#fbbf24]" />

            {/* 1st place */}
            <div className="space-y-0.5">
              <p className="text-[#fbbf24] text-xs font-semibold uppercase tracking-wider">🥇 1° Lugar</p>
              <p className="text-white text-2xl font-bold">{champion ? getAthleteName(champion) : "—"}</p>
              {champion && getAthleteTeam(champion) && (
                <p className="text-[#9ca3af] text-sm">{getAthleteTeam(champion)}</p>
              )}
            </div>

            {/* 2nd place */}
            {runnerUp && (
              <div className="space-y-0.5">
                <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wider">🥈 2° Lugar</p>
                <p className="text-white text-lg font-semibold">{getAthleteName(runnerUp)}</p>
                {getAthleteTeam(runnerUp) && (
                  <p className="text-[#6b7280] text-sm">{getAthleteTeam(runnerUp)}</p>
                )}
              </div>
            )}

            {/* 3rd place */}
            {thirdPlace && (
              <div className="space-y-0.5">
                <p className="text-[#cd7f32] text-xs font-semibold uppercase tracking-wider">🥉 3° Lugar</p>
                <p className="text-white text-base font-semibold">{getAthleteName(thirdPlace)}</p>
                {getAthleteTeam(thirdPlace) && (
                  <p className="text-[#6b7280] text-sm">{getAthleteTeam(thirdPlace)}</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="text-[#4ade80] font-semibold">Chave Finalizada</p>
            <p className="text-[#6b7280] text-sm mt-1">{bracket.matches.length} partida(s) realizada(s)</p>
          </div>
          <button
            onClick={() => router.push(`/coordenador/${tatameId}`)}
            className="mt-4 w-full h-12 rounded-xl text-white font-semibold"
            style={{ backgroundColor: "var(--card-alt)" }}
          >
            Voltar ao Tatame
          </button>
        </div>
      )}

      {/* Round progress indicator */}
      {bracket.status === "EM_ANDAMENTO" && maxRound > 1 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
          <div
            className="flex gap-1.5 px-4 py-2 rounded-full"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border-alt)" }}
          >
            {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => {
              const roundDone = bracket.matches
                .filter((m) => m.round === r)
                .every((m) => m.winnerId)
              return (
                <div
                  key={r}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: r === currentRound
                      ? "#fbbf24"
                      : roundDone
                      ? "#4ade80"
                      : "#333",
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* W.O. type modal */}
      {woModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--card-alt)" }}>
            <p className="text-white font-bold text-center text-lg">Tipo de W.O.</p>
            <p className="text-[#9ca3af] text-sm text-center">Selecione o motivo do W.O.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => declararVencedor(woModal.matchId, woModal.winnerId, true, "PESO")}
                disabled={actionLoading}
                className="py-4 rounded-xl font-semibold text-white text-sm"
                style={{ backgroundColor: "#78350f" }}
              >
                Por Peso
              </button>
              <button
                onClick={() => declararVencedor(woModal.matchId, woModal.winnerId, true, "AUSENCIA")}
                disabled={actionLoading}
                className="py-4 rounded-xl font-semibold text-white text-sm"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                Por Ausência
              </button>
            </div>
            <button
              onClick={() => setWoModal(null)}
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
