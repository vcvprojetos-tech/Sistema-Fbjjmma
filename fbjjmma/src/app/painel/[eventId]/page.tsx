"use client"

import { useEffect, useState, useCallback } from "react"
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

const NAMES_PER_COL = 10
const GAP = 4

// Alturas fixas para layout determinístico
const TOPBAR_H   = 52   // topbar
const TOPBAR_MB  = 10
const LEGEND_H   = 38   // legenda
const LEGEND_MB  = 10
const COL_HEAD_H = 60   // cabeçalho da coluna (título + coordenador)
const COL_HEAD_MB = 8
const OUTER_PAD_T = 16
const OUTER_PAD_B = 12
const OUTER_PAD_H = 16  // horizontal

const SLOTS_AREA_H =
  DESIGN_H - OUTER_PAD_T - OUTER_PAD_B
  - TOPBAR_H - TOPBAR_MB
  - LEGEND_H - LEGEND_MB
  - COL_HEAD_H - COL_HEAD_MB

const SLOT_H = Math.floor((SLOTS_AREA_H - (NAMES_PER_COL - 1) * GAP) / NAMES_PER_COL)

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
  category: string
  checkedIn: boolean
  calls: number
  lastCallAt: string | null
  isWO: boolean
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

function getAthletes(tatame: TatameInfo): AthleteEntry[] {
  const entries: AthleteEntry[] = []
  const seen = new Set<string>()

  // EM_ANDAMENTO antes de DESIGNADA, depois por bracketNumber
  const sorted = [...tatame.brackets].sort((a, b) => {
    const statusOrder = (s: string) => s === "EM_ANDAMENTO" ? 0 : 1
    return statusOrder(a.status) - statusOrder(b.status) || a.bracketNumber - b.bracketNumber
  })

  for (const b of sorted) {
    const category = catLabel(b)
    for (const m of b.matches) {
      if (m.endedAt) continue
      if (!m.position1) continue

      const p1Name = getName(m.position1)
      if (p1Name !== "BYE") {
        const key = `${m.id}-p1`
        if (!seen.has(key)) {
          seen.add(key)
          const allCalls = m.callTimes ?? []
          const p1Calls = allCalls.filter(c => c.pos === "p1" || !c.pos)
          const p1LastCall = p1Calls.length > 0 ? p1Calls.reduce((a, b) => a.call >= b.call ? a : b).at : null
          entries.push({
            key, name: p1Name,
            team: getTeam(m.position1),
            category,
            checkedIn: m.p1CheckedIn,
            calls: p1Calls.length,
            lastCallAt: p1LastCall,
            isWO: m.isWO && !!m.endedAt,
          })
        }
      }

      if (m.position2) {
        const p2Name = getName(m.position2)
        if (p2Name !== "BYE") {
          const key = `${m.id}-p2`
          if (!seen.has(key)) {
            seen.add(key)
            const allCalls = m.callTimes ?? []
            const p2Calls = allCalls.filter(c => c.pos === "p2" || c.pos == null)
            const p2LastCall = p2Calls.length > 0 ? p2Calls.reduce((a, b) => a.call >= b.call ? a : b).at : null
            entries.push({
              key, name: p2Name,
              team: getTeam(m.position2),
              category,
              checkedIn: m.p2CheckedIn,
              calls: p2Calls.length,
              lastCallAt: p2LastCall,
              isWO: m.isWO && !!m.endedAt,
            })
          }
        }
      }
    }
  }

  return entries.filter(e => !e.checkedIn && !e.isWO)
}

function rowBg(calls: number) {
  if (calls >= 3) return "#dc2626"
  if (calls === 2) return "#d97706"
  if (calls === 1) return "#2563eb"
  return "#ffffff"
}
function rowBorder(calls: number) {
  if (calls >= 3) return "#b91c1c"
  if (calls === 2) return "#b45309"
  if (calls === 1) return "#1d4ed8"
  return "#e2e8f0"
}
function rowTextName(calls: number) {
  return calls >= 1 ? "#ffffff" : "#1e293b"
}
function rowTextSub(calls: number) {
  return calls >= 1 ? "rgba(255,255,255,0.85)" : "#64748b"
}

const LEGEND = [
  { bg: "#ffffff", border: "#cbd5e1", text: "#1e293b", label: "Aguardando" },
  { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff", label: "1ª Chamada" },
  { bg: "#d97706", border: "#b45309", text: "#ffffff", label: "2ª Chamada" },
  { bg: "#dc2626", border: "#b91c1c", text: "#ffffff", label: "3ª Chamada" },
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

  if (!data) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4f8" }}>
      <p style={{ color: "#64748b" }}>Carregando painel...</p>
    </div>
  )

  const { event, tatames: allTatames } = data

  // Divisão dos tatames por painel:
  // ≤ 4 tatames → todos no painel 1
  //   6 tatames → painel 1: 1-3, painel 2: 4-6
  //   8 tatames → painel 1: 1-4, painel 2: 5-8
  const tatames = (() => {
    if (!painelNum) return allTatames
    const total = allTatames.length
    const splitAt = total <= 4 ? total : Math.ceil(total / 2)
    return painelNum === "1" ? allTatames.slice(0, splitAt) : allTatames.slice(splitAt)
  })()

  return (
    <div style={{ width: "100vw", height: "100dvh", backgroundColor: "#0a0f1a", overflow: "hidden", position: "relative" }}>

      {showOverlay && (
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#f0f4f8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
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
        <div style={{ height: TOPBAR_H + TOPBAR_MB, backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${OUTER_PAD_H}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 34, height: 34, objectFit: "contain" }} />
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

        {/* Área de conteúdo com padding */}
        <div style={{ padding: `${TOPBAR_MB}px ${OUTER_PAD_H}px ${OUTER_PAD_B}px` }}>

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
          <div style={{ height: SLOTS_AREA_H + COL_HEAD_H + COL_HEAD_MB, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              const athletes = getAthletes(tatame).slice(0, NAMES_PER_COL)

              return (
                <div key={tatame.id}>
                  {/* Cabeçalho do tatame */}
                  <div style={{ height: COL_HEAD_H, marginBottom: COL_HEAD_MB, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: `3px solid ${color}` }}>
                    <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 28, letterSpacing: "0.04em", textTransform: "uppercase" }}>Tatame {num}</div>
                    {op && <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{op}</div>}
                  </div>

                  {/* Lista de nomes: 10 slots de altura fixa */}
                  <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                    {athletes.length === 0 ? (
                      <div style={{ height: SLOTS_AREA_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 18 }}>Sem atletas pendentes</span>
                      </div>
                    ) : (
                      Array.from({ length: NAMES_PER_COL }).map((_, idx) => {
                        const a = athletes[idx]
                        if (!a) {
                          return (
                            <div key={`empty-${idx}`} style={{
                              height: SLOT_H, borderRadius: 6,
                              backgroundColor: "#e2e8f0",
                              border: "1px dashed #cbd5e1",
                            }} />
                          )
                        }
                        return (
                          <div key={a.key} style={{
                            height: SLOT_H,
                            backgroundColor: rowBg(a.calls),
                            borderRadius: 6,
                            display: "flex", alignItems: "center", gap: 12, padding: "0 14px",
                            overflow: "hidden",
                            borderLeft: `4px solid ${color}`,
                            border: `1px solid ${rowBorder(a.calls)}`,
                            borderLeftWidth: 4,
                            borderLeftColor: color,
                          }}>
                            <span style={{ color: rowTextName(a.calls), fontWeight: 900, fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }}>
                              {idx + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: rowTextName(a.calls), fontWeight: 700, fontSize: 20, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.name}
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                                {a.team && (
                                  <span style={{ color: rowTextSub(a.calls), fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {a.team}
                                  </span>
                                )}
                                <span style={{ color: rowTextSub(a.calls), opacity: 0.7, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
                                  {a.category}
                                </span>
                              </div>
                            </div>
                            {a.calls > 0 && (
                              <div style={{ flexShrink: 0, textAlign: "right" }}>
                                <div style={{ color: rowTextName(a.calls), fontSize: 13, fontWeight: 700 }}>
                                  {a.calls}ª chamada
                                </div>
                                {a.calls < 3 && a.lastCallAt && (() => {
                                  const remaining = Math.max(0, CALL_INTERVAL_MS - (now - new Date(a.lastCallAt).getTime()))
                                  if (remaining <= 0) return null
                                  const mins = Math.floor(remaining / 60000)
                                  const secs = Math.floor((remaining % 60000) / 1000)
                                  return (
                                    <div style={{ color: rowTextSub(a.calls), fontSize: 11, marginTop: 1 }}>
                                      {a.calls + 1}ª em {mins}:{secs.toString().padStart(2, "0")}
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
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
      </div>
    </div>
  )
}
