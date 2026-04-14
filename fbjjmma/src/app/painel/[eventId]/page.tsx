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

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
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
  position1: {
    id: string
    registration: {
      athlete: { user: { name: string } } | null
      guestName?: string | null
      team?: { name: string } | null
    } | null
  } | null
  position2: {
    id: string
    registration: {
      athlete: { user: { name: string } } | null
      guestName?: string | null
      team?: { name: string } | null
    } | null
  } | null
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

function getAthleteTeam(pos: MatchInfo["position1"]): string {
  return pos?.registration?.team?.name ?? ""
}

interface AthleteStatus {
  bg: string
  border: string
  text: string
  subtext: string
  label: string
}

function getStatus(checkedIn: boolean, calls: CallTime[] | null, isWO: boolean, name: string): AthleteStatus {
  if (name === "BYE") return { bg: "#111827", border: "#1f2937", text: "#4b5563", subtext: "#374151", label: "" }
  if (isWO) return { bg: "#1f2937", border: "#374151", text: "#9ca3af", subtext: "#6b7280", label: "W.O." }
  if (checkedIn) return { bg: "#14532d", border: "#166534", text: "#f0fdf4", subtext: "#bbf7d0", label: "Presente ✓" }
  const count = calls?.length ?? 0
  if (count >= 3) return { bg: "#7f1d1d", border: "#991b1b", text: "#fef2f2", subtext: "#fecaca", label: "3ª Chamada" }
  if (count === 2) return { bg: "#7c2d12", border: "#9a3412", text: "#fff7ed", subtext: "#fed7aa", label: "2ª Chamada" }
  if (count === 1) return { bg: "#713f12", border: "#92400e", text: "#fffbeb", subtext: "#fde68a", label: "1ª Chamada" }
  return { bg: "#991b1b", border: "#b91c1c", text: "#fff1f2", subtext: "#fecdd3", label: "Não pesado" }
}

const LEGEND = [
  { bg: "#991b1b", label: "Não pesado" },
  { bg: "#713f12", label: "1ª Chamada" },
  { bg: "#7c2d12", label: "2ª Chamada" },
  { bg: "#7f1d1d", label: "3ª Chamada" },
  { bg: "#14532d", label: "Presente" },
  { bg: "#1f2937", label: "W.O." },
]

function AthleteCard({
  pos, checkedIn, calls, posNum, isWO,
}: {
  pos: MatchInfo["position1"]
  checkedIn: boolean
  calls: CallTime[] | null
  posNum: number
  isWO: boolean
}) {
  const name = getAthleteName(pos)
  const team = getAthleteTeam(pos)
  if (name === "BYE") return null
  const st = getStatus(checkedIn, calls, isWO, name)

  return (
    <div
      style={{
        backgroundColor: st.bg,
        borderLeft: `3px solid ${st.border}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
      }}
    >
      <span style={{ color: st.subtext, fontWeight: 800, fontSize: "0.95rem", width: "18px", textAlign: "center", flexShrink: 0 }}>
        {posNum}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: st.text, fontWeight: 700, fontSize: "0.92rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {team && (
          <div style={{ color: st.subtext, fontSize: "0.68rem", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {team}
          </div>
        )}
      </div>
      {st.label && (
        <span style={{ color: st.subtext, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
          {st.label}
        </span>
      )}
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" }}>
        <p style={{ color: "#6b7280", fontSize: "1.125rem" }}>Carregando painel...</p>
      </div>
    )
  }

  const { event, tatames } = data
  const numCols = tatames.length === 0 ? 1 : tatames.length <= 2 ? tatames.length : tatames.length <= 4 ? 2 : tatames.length <= 6 ? 3 : 4

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", padding: "12px 16px", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "2px solid #dc2626" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          <div>
            <div style={{ color: "#ffffff", fontWeight: 900, fontSize: "1.1rem", lineHeight: 1.2 }}>{event.name}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.7rem" }}>Painel de Chamadas — Área de Pesagem</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#4b5563", fontSize: "0.65rem" }}>Última atualização</div>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem", fontFamily: "monospace" }}>
            {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1f2937" }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: l.bg, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ color: "#9ca3af", fontSize: "0.7rem" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {tatames.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#374151", fontSize: "3rem", marginBottom: "12px" }}>📋</div>
            <div style={{ color: "#6b7280", fontSize: "1.125rem" }}>Nenhum tatame ativo no momento</div>
            <div style={{ color: "#4b5563", fontSize: "0.85rem", marginTop: "6px" }}>
              Os tatames aparecerão aqui quando os coordenadores estiverem conectados
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${numCols}, 1fr)`, gap: "10px", alignItems: "start" }}>
          {tatames.map((tatame) => {
            const operador = tatame.operations[0]?.user.name ?? ""
            const operadorShort = operador.split(" ").slice(0, 2).join(" ")
            const tatameNum = tatame.name.match(/Tatame\s+(\d+)/i)?.[1] ?? tatame.name
            const activeBrackets = tatame.brackets.filter(b => b.matches.length > 0)

            return (
              <div key={tatame.id} style={{ display: "flex", flexDirection: "column", gap: "0" }}>

                {/* Cabeçalho tatame */}
                <div style={{
                  backgroundColor: "#dc2626",
                  padding: "8px 12px",
                  borderRadius: "6px 6px 0 0",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  borderBottom: "3px solid #991b1b",
                }}>
                  <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "0.05em" }}>
                    TATAME {tatameNum}
                  </span>
                  {operadorShort && (
                    <span style={{ color: "#fca5a5", fontSize: "0.72rem", fontWeight: 600 }}>
                      {operadorShort}
                    </span>
                  )}
                </div>

                {/* Corpo */}
                <div style={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderTop: "none",
                  borderRadius: "0 0 6px 6px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0",
                }}>
                  {activeBrackets.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "#374151", fontSize: "0.8rem" }}>
                      Sem confrontos no momento
                    </div>
                  ) : (
                    activeBrackets.map((bracket, bIdx) => {
                      const visibleMatches = bracket.matches.filter(m => {
                        if (m.endedAt) return false
                        return m.position1 !== null
                      })
                      if (visibleMatches.length === 0) return null

                      return (
                        <div key={bracket.id} style={{ borderTop: bIdx > 0 ? "2px solid #1f2937" : "none" }}>
                          {/* Cabeçalho da categoria */}
                          <div style={{ backgroundColor: "#1a1f2e", padding: "4px 10px", borderBottom: "1px solid #1f2937" }}>
                            <span style={{ color: "#9ca3af", fontSize: "0.7rem", fontWeight: 600 }}>
                              {catLabel(bracket)}
                            </span>
                          </div>

                          {/* Partidas */}
                          {visibleMatches.map((match, mIdx) => {
                            const isSolo = match.position2 === null
                            const calls = match.callTimes as CallTime[] | null
                            const isWOFinal = match.isWO && match.endedAt !== null

                            return (
                              <div key={match.id} style={{ borderTop: mIdx > 0 ? "1px solid #0d1117" : "none" }}>
                                <AthleteCard
                                  pos={match.position1}
                                  checkedIn={match.p1CheckedIn}
                                  calls={calls}
                                  posNum={1}
                                  isWO={isWOFinal}
                                />
                                {!isSolo && (
                                  <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 10px", backgroundColor: "#0d1117" }}>
                                      <div style={{ flex: 1, height: "1px", backgroundColor: "#1f2937" }} />
                                      <span style={{ color: "#374151", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.1em" }}>VS</span>
                                      <div style={{ flex: 1, height: "1px", backgroundColor: "#1f2937" }} />
                                    </div>
                                    <AthleteCard
                                      pos={match.position2}
                                      checkedIn={match.p2CheckedIn}
                                      calls={calls}
                                      posNum={2}
                                      isWO={isWOFinal}
                                    />
                                  </>
                                )}
                              </div>
                            )
                          })}
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
