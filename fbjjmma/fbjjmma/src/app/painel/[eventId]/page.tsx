"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"

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

const COL_COLORS = ["#0d9488","#f97316","#eab308","#7c3aed","#0891b2","#be185d","#15803d","#dc2626"]

const DESIGN_W = 1920
const DESIGN_H = 1080

const TOPBAR_H   = 52
const TOPBAR_MB  = 10
const LEGEND_H   = 38
const LEGEND_MB  = 10
const COL_HEAD_H = 60
const COL_HEAD_MB = 8
const OUTER_PAD_H = 16

const CAT_HEADER_H = 40
const ATHLETE_H = 58
const ATHLETE_GAP = 4
const CARD_PAD = 5
const CARD_GAP = 10

// Altura disponível para os cards dentro de cada coluna (espaço abaixo do cabeçalho do tatame)
const CONTENT_H =
  DESIGN_H - TOPBAR_H - TOPBAR_MB
  - LEGEND_H - LEGEND_MB
  - 12  // outer_pad_b
  - COL_HEAD_H - COL_HEAD_MB

const CALL_INTERVAL_MS = 5 * 60 * 1000

interface CallTime { call: number; at: string; pos?: "p1" | "p2" | null }
interface MatchInfo {
  id: string; round: number; matchNumber: number
  callTimes: CallTime[] | null
  p1CheckedIn: boolean; p2CheckedIn: boolean
  isWO: boolean; endedAt: string | null
  position1: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null; team?: { name: string } | null } | null } | null
  position2: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null; team?: { name: string } | null } | null } | null
}
interface BracketInfo {
  id: string; bracketNumber: number; belt: string; isAbsolute: boolean; status: string
  weightCategory: { name: string; ageGroup: string; sex: string }
  matches: MatchInfo[]
}
interface TatameInfo {
  id: string; name: string
  operations: { user: { name: string } }[]
  brackets: BracketInfo[]
}
interface PainelData {
  event: { id: string; name: string }
  tatames: TatameInfo[]
}

interface AthleteEntry {
  key: string
  name: string
  team: string
  calls: number
  callTimes: { call: number; at: string }[]
}

interface BracketGroup {
  bracketId: string
  category: string
  athletes: AthleteEntry[]
}

function catLabel(b: BracketInfo) {
  const sex = b.weightCategory.sex === "MASCULINO" ? "M" : "F"
  const age = AGE_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
  const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
  const belt = BELT_LABELS[b.belt] || b.belt
  return `${sex} · ${age} · ${peso} · ${belt}`
}

function getName(pos: MatchInfo["position1"]) {
  if (!pos?.registration) return "BYE"
  return pos.registration.athlete?.user.name ?? pos.registration.guestName ?? "—"
}
function getTeam(pos: MatchInfo["position1"]) {
  return pos?.registration?.team?.name ?? ""
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/(?<!\p{L})\p{L}/gu, c => c.toUpperCase())
}

function cardHeight(numAthletes: number): number {
  return CAT_HEADER_H + CARD_PAD * 2 + numAthletes * ATHLETE_H + Math.max(0, numAthletes - 1) * ATHLETE_GAP
}

function filterGroupsToFit(groups: BracketGroup[], maxH: number): BracketGroup[] {
  const result: BracketGroup[] = []
  let usedH = 0
  for (const group of groups) {
    const h = cardHeight(group.athletes.length)
    const gap = result.length > 0 ? CARD_GAP : 0
    if (usedH + gap + h <= maxH) {
      result.push(group)
      usedH += gap + h
    } else {
      break
    }
  }
  return result
}

function bracketHasAppeared(b: BracketInfo, visibleBrackets: Set<string>): boolean {
  if (visibleBrackets.has(b.id)) return true
  return b.matches.some(m => ((m.callTimes ?? []) as CallTime[]).some(c => c.call === 1))
}

function getGroupsForTatame(tatame: TatameInfo, visibleBrackets: Set<string>): BracketGroup[] {
  const groups: BracketGroup[] = []

  const sorted = [...tatame.brackets].sort((a, b) => {
    const statusOrder = (s: string) => s === "EM_ANDAMENTO" ? 0 : 1
    const aOrd = statusOrder(a.status)
    const bOrd = statusOrder(b.status)
    if (aOrd !== bOrd) return aOrd - bOrd
    // Dentro de EM_ANDAMENTO: chaves já exibidas no painel vêm antes das recém-iniciadas
    const aApp = bracketHasAppeared(a, visibleBrackets) ? 0 : 1
    const bApp = bracketHasAppeared(b, visibleBrackets) ? 0 : 1
    if (aApp !== bApp) return aApp - bApp
    return a.bracketNumber - b.bracketNumber
  })

  for (const b of sorted) {
    const athletes: AthleteEntry[] = []
    const seen = new Set<string>()

    for (const m of b.matches) {
      if (m.endedAt) continue
      if (!m.position1) continue

      const allCalls = m.callTimes ?? []

      const addAthlete = (
        pos: MatchInfo["position1"],
        posKey: string,
        checkedIn: boolean,
        callFilter: (c: CallTime) => boolean
      ) => {
        if (checkedIn) return
        const name = getName(pos)
        if (name === "BYE") return
        const key = `${m.id}-${posKey}`
        if (seen.has(key)) return
        const posCalls = allCalls.filter(callFilter).sort((a, b) => a.call - b.call)
        seen.add(key)
        athletes.push({
          key, name, team: getTeam(pos),
          calls: posCalls.length,
          callTimes: posCalls.map(c => ({ call: c.call, at: c.at })),
        })
      }

      addAthlete(m.position1, "p1", m.p1CheckedIn, c => c.pos === "p1" || !c.pos)
      if (m.position2) addAthlete(m.position2, "p2", m.p2CheckedIn, c => c.pos === "p2" || c.pos == null)
    }

    if (athletes.length > 0) {
      groups.push({ bracketId: b.id, category: catLabel(b), athletes })
    }
  }

  return groups
}

function rowBg(calls: number) {
  if (calls >= 3) return "#dc2626"
  if (calls === 2) return "#d97706"
  if (calls === 1) return "#edf0f4"
  return "#ffffff"
}
function rowBorder(calls: number) {
  if (calls >= 3) return "#b91c1c"
  if (calls === 2) return "#b45309"
  if (calls === 1) return "#1d4ed8"
  return "#e2e8f0"
}
function rowTextName(_calls: number) {
  return "#0f172a"
}
function rowTextSub(_calls: number) {
  return "#374151"
}

const LEGEND = [
  { bg: "#ffffff", border: "#cbd5e1", label: "Aguardando" },
  { bg: "#edf0f4", border: "#94a3b8", label: "1ª Chamada" },
  { bg: "#d97706", border: "#b45309", label: "2ª Chamada" },
  { bg: "#dc2626", border: "#b91c1c", label: "3ª Chamada" },
]

export default function PainelPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const searchParams = useSearchParams()
  const painelNum = searchParams.get("painel")
  const [data, setData] = useState<PainelData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const recalc = () => {
      setScaleX(window.innerWidth / DESIGN_W)
      setScaleY(window.innerHeight / DESIGN_H)
    }
    recalc()
    window.addEventListener("resize", recalc)
    return () => window.removeEventListener("resize", recalc)
  }, [])

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setShowOverlay(false)
  }, [])

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setScaleX(window.innerWidth / DESIGN_W)
      setScaleY(window.innerHeight / DESIGN_H)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const triggeredRef = useRef<Set<string>>(new Set())
  const visibleBracketsRef = useRef<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/painel/${eventId}`)
      if (!res.ok) return
      setData(await res.json())
      setLastUpdate(new Date())
    } catch { /* silencioso */ }
  }, [eventId])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 5000)
    return () => clearInterval(iv)
  }, [fetchData])

  // Informa ao servidor quais brackets estão visíveis neste painel
  useEffect(() => {
    if (!data) return
    const allTatames = data.tatames
    const total = allTatames.length
    const splitAt = total <= 4 ? total : Math.ceil(total / 2)
    const myTatames = !painelNum ? allTatames
      : painelNum === "1" ? allTatames.slice(0, splitAt)
      : allTatames.slice(splitAt)
    for (const tatame of myTatames) {
      const groups = filterGroupsToFit(getGroupsForTatame(tatame, visibleBracketsRef.current), CONTENT_H)
      const visibleIds = groups.map(g => g.bracketId)
      fetch(`/api/painel/${eventId}/visible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tatameId: tatame.id, bracketIds: visibleIds }),
      }).catch(() => {})
    }
  }, [data, eventId, painelNum])

  // Registra 1ª chamada no momento em que cada bracket aparece no painel
  useEffect(() => {
    if (!data) return
    const allTatames = data.tatames
    const visibleTatames = (() => {
      if (!painelNum) return allTatames
      const total = allTatames.length
      const splitAt = total <= 4 ? total : Math.ceil(total / 2)
      return painelNum === "1" ? allTatames.slice(0, splitAt) : allTatames.slice(splitAt)
    })()
    for (const tatame of visibleTatames) {
      const groups = getGroupsForTatame(tatame, visibleBracketsRef.current)
      const visible = filterGroupsToFit(groups, CONTENT_H)
      const visibleIds = new Set(visible.map(g => g.bracketId))
      for (const bracket of tatame.brackets) {
        if (!visibleIds.has(bracket.id)) continue
        // Marca bracket como já exibido no painel
        visibleBracketsRef.current.add(bracket.id)
        for (const match of bracket.matches) {
          const allCalls = (match.callTimes ?? []) as CallTime[]
          if (allCalls.some(c => c.call === 1)) continue
          if (triggeredRef.current.has(match.id)) continue
          triggeredRef.current.add(match.id)
          fetch(`/api/painel/${eventId}/chamada`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: match.id, bracketId: bracket.id }),
          }).catch(() => {})
        }
      }
    }
  }, [data, eventId, painelNum])

  if (!data) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4f8" }}>
      <p style={{ color: "#64748b" }}>Carregando painel...</p>
    </div>
  )

  const { event, tatames: allTatames } = data

  const tatames = (() => {
    if (!painelNum) return allTatames
    const total = allTatames.length
    const splitAt = total <= 4 ? total : Math.ceil(total / 2)
    return painelNum === "1" ? allTatames.slice(0, splitAt) : allTatames.slice(splitAt)
  })()

  return (
    <div style={{ width: "100vw", height: "100dvh", backgroundColor: "#f0f4f8", overflow: "hidden", position: "relative" }}>

      {showOverlay && (
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#f0f4f8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="FBJJMMA" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
          <div style={{ color: "#1e293b", fontSize: "1.5rem", fontWeight: 900, marginBottom: 12 }}>
            Painel de Chamadas{painelNum ? ` — Painel ${painelNum}` : ""}
          </div>
          <div style={{ color: "#64748b", fontSize: "1rem", marginBottom: 32 }}>Área de Pesagem</div>
          <div style={{ backgroundColor: "#1e3a5f", border: "2px solid #3b82f6", borderRadius: 12, padding: "16px 40px", color: "#93c5fd", fontSize: "1.1rem", fontWeight: 700 }}>
            Pressione OK para abrir em Tela Cheia
          </div>
        </div>
      )}

      {!showOverlay && (
        <button onClick={isFullscreen ? () => document.exitFullscreen?.() : enterFullscreen}
          style={{ position: "fixed", bottom: 12, right: 12, zIndex: 1000, backgroundColor: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: 8, color: "#475569", fontSize: "0.7rem", padding: "6px 10px", cursor: "pointer" }}>
          {isFullscreen ? "⊠ Sair" : "⛶ Tela Cheia"}
        </button>
      )}

      <div style={{
        width: DESIGN_W, height: DESIGN_H,
        transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
        transformOrigin: "top left",
        position: "absolute", top: 0, left: 0,
        backgroundColor: "#f0f4f8",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}>

        {/* Topbar */}
        <div style={{ height: TOPBAR_H, marginBottom: TOPBAR_MB, backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${OUTER_PAD_H}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div style={{ width: 34, height: 34, flexShrink: 0, position: "relative", overflow: "visible" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-color.png" alt="FBJJMMA" style={{ width: 119, height: 119, objectFit: "contain", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
            </div>
            <div>
              <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 18 }}>{event.name}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>Painel de Chamadas — Área de Pesagem</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>Última atualização</div>
            <div style={{ color: "#475569", fontSize: 14, fontFamily: "monospace" }}>
              {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        <div style={{ padding: `0 ${OUTER_PAD_H}px 12px` }}>

          {/* Legenda */}
          <div style={{ height: LEGEND_H, marginBottom: LEGEND_MB, display: "flex", alignItems: "center", gap: 24, backgroundColor: "#e2e8f0", borderRadius: 8, padding: "0 16px", border: "1px solid #cbd5e1" }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, backgroundColor: l.bg, borderRadius: 4, border: `1px solid ${l.border}` }} />
                <span style={{ color: "#1e293b", fontSize: 14, fontWeight: 600 }}>{l.label}</span>
              </div>
            ))}
          </div>

          {tatames.length === 0 ? (
            <div style={{ height: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#cbd5e1", fontSize: 60, marginBottom: 10 }}>📋</div>
                <div style={{ color: "#94a3b8", fontSize: 24 }}>Nenhum tatame ativo no momento</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${tatames.length}, minmax(0, 1fr))`, gap: 16 }}>
              {tatames.map((tatame, colIdx) => {
                const color = COL_COLORS[colIdx % COL_COLORS.length]
                const num = tatame.name.match(/Tatame\s+(\d+)/i)?.[1] ?? tatame.name
                const op = tatame.operations[0]?.user.name ?? ""
                const groups = filterGroupsToFit(getGroupsForTatame(tatame, visibleBracketsRef.current), CONTENT_H)

                return (
                  <div key={tatame.id}>
                    {/* Cabeçalho do tatame */}
                    <div style={{ height: COL_HEAD_H, marginBottom: COL_HEAD_MB, textAlign: "center", display: "flex", flexDirection: "column" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 4, paddingBottom: 10 }}>
                        <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 28, letterSpacing: "0.04em", textTransform: "uppercase" }}>Tatame {num}</div>
                        {op && <div style={{ color: "#64748b", fontSize: 13 }}>{op}</div>}
                      </div>
                      <div style={{ height: 3, backgroundColor: color, borderRadius: 2 }} />
                    </div>

                    {/* Cards de categoria empilhados */}
                    {groups.length === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
                        <span style={{ color: "#94a3b8", fontSize: 16 }}>Sem atletas pendentes</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP }}>
                        {groups.map((group) => (
                          <div key={group.bracketId} style={{
                            backgroundColor: "#ffffff",
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                          }}>
                            {/* Cabeçalho da categoria */}
                            <div style={{
                              height: CAT_HEADER_H,
                              backgroundColor: "#1e293b",
                              borderLeft: `4px solid ${color}`,
                              padding: "0 12px",
                              display: "flex", alignItems: "center",
                            }}>
                              <div style={{ color: "#ffffff", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {group.category}
                              </div>
                            </div>

                            {/* Atletas */}
                            <div style={{ display: "flex", flexDirection: "column", gap: ATHLETE_GAP, padding: CARD_PAD }}>
                              {group.athletes.map((a) => (
                                <div key={a.key} style={{
                                  height: ATHLETE_H,
                                  backgroundColor: rowBg(a.calls),
                                  borderRadius: 6,
                                  display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                                  overflow: "hidden",
                                  borderLeft: `4px solid ${color}`,
                                  flexShrink: 0,
                                }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: rowTextName(a.calls), fontWeight: 700, fontSize: 16, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {toTitleCase(a.name)}
                                    </div>
                                    {a.team && (
                                      <div style={{ color: rowTextSub(a.calls), fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                                        {a.team}
                                      </div>
                                    )}
                                  </div>
                                  {a.callTimes.length > 0 && (
                                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                                      {a.callTimes.map(ct => (
                                        <div key={ct.call} style={{ color: rowTextName(a.calls), fontSize: 11, fontWeight: 600, lineHeight: 1.35 }}>
                                          {ct.call}ª {new Date(ct.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                      ))}
                                      {a.calls < 3 && (() => {
                                        const lastAt = a.callTimes[a.callTimes.length - 1]?.at
                                        if (!lastAt) return null
                                        const remaining = Math.max(0, CALL_INTERVAL_MS - (now - new Date(lastAt).getTime()))
                                        if (remaining <= 0) return null
                                        const mins = Math.floor(remaining / 60000)
                                        const secs = Math.floor((remaining % 60000) / 1000)
                                        return (
                                          <div style={{ color: rowTextSub(a.calls), fontSize: 10, marginTop: 1 }}>
                                            {a.calls + 1}ª em {mins}:{secs.toString().padStart(2, "0")}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
