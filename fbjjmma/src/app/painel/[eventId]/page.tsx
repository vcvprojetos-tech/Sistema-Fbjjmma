"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"

const AGE_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juv. A",
  INFANTO_JUVENIL_B: "Infanto Juv. B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}

interface CallTime { call: number; at: string }

interface MatchInfo {
  id: string
  round: number
  matchNumber: number
  callTimes: CallTime[] | null
  p1CheckedIn: boolean
  p2CheckedIn: boolean
  isWO: boolean
  endedAt: string | null
  position1: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null } | null } | null
  position2: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null } | null } | null
}

interface BracketInfo {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  weightCategory: { name: string; ageGroup: string; sex: string }
  matches: MatchInfo[]
}

interface TatameInfo {
  id: string
  name: string
  operations: { user: { name: string } }[]
  brackets: BracketInfo[]
}

interface PainelData {
  event: { id: string; name: string }
  tatames: TatameInfo[]
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

function catLabel(b: BracketInfo) {
  const sex = b.weightCategory.sex === "MASCULINO" ? "M" : "F"
  const age = AGE_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
  const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
  const belt = BELT_LABELS[b.belt] || b.belt
  return `${sex} · ${age} · ${peso} · ${belt}`
}

function getAthleteName(pos: MatchInfo["position1"]): string {
  if (!pos?.registration) return "BYE"
  return pos.registration.athlete?.user.name ?? pos.registration.guestName ?? "—"
}

function getCallLabel(calls: CallTime[] | null, num: number): string | null {
  const c = calls?.find(c => c.call === num)
  if (!c) return null
  return new Date(c.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function AthleteRow({
  name, checkedIn, calls, posNum, isWO,
}: {
  name: string
  checkedIn: boolean
  calls: CallTime[] | null
  posNum: number
  isWO: boolean
}) {
  const call1 = getCallLabel(calls, 1)
  const call2 = getCallLabel(calls, 2)
  const call3 = getCallLabel(calls, 3)
  const callCount = calls?.length ?? 0

  let nameBg = "transparent"
  let nameColor = "#e5e7eb"
  let statusText = ""
  let statusColor = "#6b7280"

  if (isWO && name !== "BYE") {
    nameColor = "#6b7280"
    statusText = "W.O. — Ausência"
    statusColor = "#ef4444"
  } else if (checkedIn) {
    nameBg = "#14532d30"
    nameColor = "#4ade80"
    statusText = "✓ Presente"
    statusColor = "#4ade80"
  } else if (callCount >= 3) {
    nameColor = "#f87171"
    statusText = `3ª Chamada — ${call3}`
    statusColor = "#f87171"
  } else if (callCount === 2) {
    nameColor = "#fb923c"
    statusText = `2ª Chamada — ${call2}`
    statusColor = "#fb923c"
  } else if (callCount === 1) {
    nameColor = "#fbbf24"
    statusText = `1ª Chamada — ${call1}`
    statusColor = "#fbbf24"
  } else {
    statusText = "Aguardando"
    statusColor = "#4b5563"
  }

  if (name === "BYE") return null

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{ backgroundColor: nameBg, border: "1px solid #1f2937" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#1f2937", color: "#6b7280" }}
        >
          {posNum}
        </span>
        <span className="font-semibold truncate text-base leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
      </div>
      <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: statusColor }}>
        {statusText}
      </span>
    </div>
  )
}

export default function PainelPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [data, setData] = useState<PainelData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/painel/${eventId}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date())
    } catch { /* silencioso */ }
  }, [eventId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <p className="text-[#6b7280] text-lg">Carregando painel...</p>
      </div>
    )
  }

  const { event, tatames } = data

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-[#1f2937] pb-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-white font-black text-xl leading-tight">{event.name}</h1>
            <p className="text-[#6b7280] text-xs">Painel de Chamadas — Área de Pesagem</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#4b5563] text-xs">Última atualização</p>
          <p className="text-[#6b7280] text-sm font-mono">
            {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </div>

      {tatames.length === 0 ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-[#374151] text-6xl mb-4">📋</p>
            <p className="text-[#6b7280] text-xl">Nenhum tatame ativo no momento</p>
            <p className="text-[#4b5563] text-sm mt-2">Os tatames aparecerão aqui quando os coordenadores estiverem conectados</p>
          </div>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(tatames.length, tatames.length <= 2 ? tatames.length : tatames.length <= 4 ? 2 : tatames.length <= 6 ? 3 : 4)}, 1fr)`,
          }}
        >
          {tatames.map((tatame) => {
            // Pega nome curto do tatame (ex: "Dudu Muniz - Tatame 1" → "Tatame 1")
            const tatameShort = tatame.name.includes("- Tatame")
              ? tatame.name.split("- Tatame")[1].trim()
              : tatame.name
            const operador = tatame.operations[0]?.user.name

            // Todas as partidas ativas agrupadas por chave
            const activeBrackets = tatame.brackets.filter(b => b.matches.length > 0)

            return (
              <div
                key={tatame.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "#1f2937", backgroundColor: "#111827" }}
              >
                {/* Tatame header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: "#dc2626", borderBottom: "2px solid #991b1b" }}
                >
                  <span className="text-white font-black text-lg tracking-wide">
                    TATAME {tatameShort}
                  </span>
                  {operador && (
                    <span className="text-red-200 text-xs">{operador}</span>
                  )}
                </div>

                {/* Chaves e partidas */}
                <div className="p-3 space-y-3">
                  {activeBrackets.length === 0 ? (
                    <p className="text-[#4b5563] text-sm text-center py-4">Sem confrontos no momento</p>
                  ) : (
                    activeBrackets.map((bracket) => {
                      const currentMatches = bracket.matches.filter(
                        m => !m.endedAt && m.position1Id !== null && m.position2Id !== null
                      )
                      const soloMatches = bracket.matches.filter(
                        m => !m.endedAt && m.position1Id !== null && m.position2Id === null
                      )
                      const allMatches = [...currentMatches, ...soloMatches]
                      if (allMatches.length === 0) return null

                      return (
                        <div
                          key={bracket.id}
                          className="rounded-lg overflow-hidden"
                          style={{ border: "1px solid #1f2937" }}
                        >
                          {/* Categoria */}
                          <div className="px-3 py-1.5" style={{ backgroundColor: "#1f2937" }}>
                            <p className="text-[#9ca3af] text-xs font-medium">{catLabel(bracket)}</p>
                          </div>

                          {/* Partidas */}
                          <div className="p-2 space-y-2">
                            {allMatches.map((match) => {
                              const p1Name = getAthleteName(match.position1)
                              const p2Name = getAthleteName(match.position2)
                              const calls = match.callTimes as CallTime[] | null
                              const isSolo = match.position2Id === null

                              return (
                                <div key={match.id}>
                                  <AthleteRow
                                    name={p1Name}
                                    checkedIn={match.p1CheckedIn}
                                    calls={calls}
                                    posNum={1}
                                    isWO={match.isWO && match.endedAt !== null}
                                  />
                                  {!isSolo && (
                                    <>
                                      <div className="flex items-center gap-1 my-1 px-2">
                                        <div className="flex-1 h-px bg-[#1f2937]" />
                                        <span className="text-[#374151] text-xs font-bold">VS</span>
                                        <div className="flex-1 h-px bg-[#1f2937]" />
                                      </div>
                                      <AthleteRow
                                        name={p2Name}
                                        checkedIn={match.p2CheckedIn}
                                        calls={calls}
                                        posNum={2}
                                        isWO={match.isWO && match.endedAt !== null}
                                      />
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
