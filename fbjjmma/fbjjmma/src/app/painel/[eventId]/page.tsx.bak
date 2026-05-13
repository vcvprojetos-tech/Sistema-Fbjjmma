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
  id: string; bracketNumber: number; belt: string; isAbsolute: boolean
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
  checkedIn: boolean
  calls: number
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

  for (const b of tatame.brackets) {
    const label = catLabel(b)
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
          entries.push({
            key, name: p1Name,
            team: getTeam(m.position1) || label,
            checkedIn: m.p1CheckedIn,
            calls: p1Calls.length,
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
            const p2Calls = allCalls.filter(c => c.pos === "p2")
            entries.push({
              key, name: p2Name,
              team: getTeam(m.position2) || label,
              checkedIn: m.p2CheckedIn,
              calls: p2Calls.length,
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
  if (calls >= 3) return "#7f1d1d"
  if (calls === 2) return "#7c2d12"
  if (calls === 1) return "#713f12"
  return "#1e3a5f"
}
function rowText(calls: number) {
  if (calls >= 3) return "#fecaca"
  if (calls === 2) return "#fed7aa"
  if (calls === 1) return "#fde68a"
  return "#bfdbfe"
}

const LEGEND = [
  { bg: "#1e3a5f", label: "Aguardando" },
  { bg: "#713f12", label: "1ª Chamada" },
  { bg: "#7c2d12", label: "2ª Chamada" },
  { bg: "#7f1d1d", label: "3ª Chamada" },
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
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0f1a" }}>
      <p style={{ color: "#475569" }}>Carregando painel...</p>
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
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0a0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
          <div style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 900, marginBottom: 12 }}>
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
          style={{ position: "fixed", bottom: 12, right: 12, zIndex: 1000, backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#64748b", fontSize: "0.7rem", padding: "6px 10px", cursor: "pointer" }}>
          {isFullscreen ? "⊠ Sair" : "⛶ Tela Cheia"}
        </button>
      )}

      <div style={{
        width: DESIGN_W, height: DESIGN_H,
        transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
        transformOrigin: "top left",
        position: "absolute", top: 0, left: 0,
        backgroundColor: "#0a0f1a",
        padding: `${OUTER_PAD_T}px ${OUTER_PAD_H}px ${OUTER_PAD_B}px`,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}>

        {/* Topbar */}
        <div style={{ height: TOPBAR_H, marginBottom: TOPBAR_MB, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 20 }}>{event.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Painel de Chamadas — Área de Pesagem</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#475569", fontSize: 11 }}>Última atualização</div>
            <div style={{ color: "#64748b", fontSize: 15, fontFamily: "monospace" }}>
              {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ height: LEGEND_H, marginBottom: LEGEND_MB, display: "flex", alignItems: "center", gap: 24, borderBottom: "1px solid #1e293b" }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, backgroundColor: l.bg, borderRadius: 3 }} />
              <span style={{ color: "#64748b", fontSize: 15 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {tatames.length === 0 ? (
          <div style={{ height: SLOTS_AREA_H + COL_HEAD_H + COL_HEAD_MB, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#1e293b", fontSize: 60, marginBottom: 10 }}>📋</div>
              <div style={{ color: "#475569", fontSize: 24 }}>Nenhum tatame ativo no momento</div>
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
                  <div style={{ height: COL_HEAD_H, marginBottom: COL_HEAD_MB, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: `4px solid ${color}` }}>
                    <div style={{ color: "#ffffff", fontWeight: 900, fontSize: 28, letterSpacing: "0.04em" }}>Tatame {num}</div>
                    {op && <div style={{ color: "#64748b", fontSize: 14, marginTop: 2 }}>{op}</div>}
                  </div>

                  {/* Lista de nomes: 10 slots de altura fixa */}
                  <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                    {athletes.length === 0 ? (
                      <div style={{ height: SLOTS_AREA_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#1e293b", fontSize: 18 }}>Sem atletas pendentes</span>
                      </div>
                    ) : (
                      Array.from({ length: NAMES_PER_COL }).map((_, idx) => {
                        const a = athletes[idx]
                        if (!a) {
                          return (
                            <div key={`empty-${idx}`} style={{
                              height: SLOT_H, borderRadius: 6,
                              backgroundColor: "#0f172a",
                              border: "1px dashed #1e293b",
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
                          }}>
                            <span style={{ color: rowText(a.calls), fontWeight: 900, fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }}>
                              {idx + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: rowText(a.calls), fontWeight: 700, fontSize: 20, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.name}
                              </div>
                              {a.team && (
                                <div style={{ color: rowText(a.calls), opacity: 0.7, fontSize: 14, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {a.team}
                                </div>
                              )}
                            </div>
                            {a.calls > 0 && (
                              <span style={{ color: rowText(a.calls), fontSize: 13, fontWeight: 700, flexShrink: 0, opacity: 0.9 }}>
                                {a.calls}ª chamada
                              </span>
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
  )
}
