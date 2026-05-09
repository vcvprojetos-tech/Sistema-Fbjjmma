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

const DESIGN_W = 1920
const DESIGN_H = 1080
const NUM_COLS = 4
const NAMES_PER_COL = 10
const GAP = 4

const MEDAL_COLORS: Record<number, { bg: string; border: string; text: string; subText: string; label: string; emoji: string }> = {
  1: { bg: "#fbbf24", border: "#d97706", text: "#1c1917", subText: "#44403c", label: "1°\nLugar", emoji: "🥇" },
  2: { bg: "#e2e8f0", border: "#cbd5e1", text: "#1e293b", subText: "#475569", label: "2°\nLugar", emoji: "🥈" },
  3: { bg: "#f97316", border: "#ea580c", text: "#ffffff", subText: "rgba(255,255,255,0.85)", label: "3°\nLugar", emoji: "🥉" },
}

interface Reg {
  id: string
  awarded: boolean
  guestName: string | null
  athlete: { user: { name: string } } | null
  team: { name: string } | null
}
interface BPos {
  id: string
  position: number
  registration: Reg | null
}
interface BMatch {
  id: string
  round: number
  matchNumber: number
  winnerId: string | null
  position1Id: string | null
  position2Id: string | null
  isWO: boolean
  endedAt: string | null
}
interface BracketInfo {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  weightCategory: { name: string; ageGroup: string; sex: string }
  positions: BPos[]
  matches: BMatch[]
}
interface EventData {
  event: { id: string; name: string }
  brackets: BracketInfo[]
}

interface AwardEntry {
  key: string       // registrationId
  name: string
  team: string
  category: string
  place: number     // 1, 2 ou 3
}

function athleteName(reg: Reg | null | undefined): string {
  if (!reg) return "BYE"
  return reg.athlete?.user.name ?? reg.guestName ?? "—"
}

function catLabel(b: BracketInfo): string {
  const sex = b.weightCategory.sex === "MASCULINO" ? "M" : "F"
  const age = AGE_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
  const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
  const belt = BELT_LABELS[b.belt] || b.belt
  return `${sex} · ${age} · ${peso} · ${belt}`
}

function getPodium(b: BracketInfo): { pos: BPos; place: number }[] {
  const posMap = new Map<string, BPos>()
  for (const p of b.positions) posMap.set(p.id, p)

  const realMatches = b.matches.filter(m => m.position1Id && m.position2Id && m.endedAt)
  const soloMatch = b.matches.find(m => m.position1Id && !m.position2Id && m.endedAt && m.winnerId)

  if (realMatches.length === 0 && soloMatch) {
    const champPos = soloMatch.winnerId ? posMap.get(soloMatch.winnerId) : undefined
    return champPos ? [{ pos: champPos, place: 1 }] : []
  }

  const maxRound = realMatches.length > 0 ? Math.max(...realMatches.map(m => m.round)) : 0
  const finalMatch = realMatches.find(m => m.round === maxRound && m.matchNumber === 1)
  if (!finalMatch) return []

  const champId = finalMatch.winnerId
  const viceId = champId === finalMatch.position1Id ? finalMatch.position2Id : finalMatch.position1Id
  const champPos = champId ? posMap.get(champId) : undefined
  const vicePos = viceId ? posMap.get(viceId) : undefined

  const result: { pos: BPos; place: number }[] = []
  if (champPos) result.push({ pos: champPos, place: 1 })
  // Se a final terminou via W.O., o perdedor foi desclassificado — sem 2° lugar
  if (vicePos && !finalMatch.isWO) result.push({ pos: vicePos, place: 2 })

  // 3° lugar: loser da semifinal do campeão — mesmo algoritmo do BracketView
  if (maxRound >= 2) {
    const semiRound = maxRound - 1
    const champSemi = realMatches.find(m => m.round === semiRound && m.winnerId === champId && !m.isWO)
    const viceSemi = realMatches.find(m => m.round === semiRound && m.winnerId === viceId && !m.isWO)
    const semi = champSemi ?? viceSemi
    if (semi) {
      const loserId = semi.winnerId === semi.position1Id ? semi.position2Id : semi.position1Id
      const thirdPos = loserId ? posMap.get(loserId) : undefined
      if (thirdPos?.registration) result.push({ pos: thirdPos, place: 3 })
    }
  }

  return result
}

// Retorna o timestamp da última partida finalizada da chave (proxy de quando foi finalizada)
function bracketFinalizedAt(b: BracketInfo): number {
  const times = b.matches
    .filter(m => m.endedAt)
    .map(m => new Date(m.endedAt!).getTime())
  return times.length > 0 ? Math.max(...times) : 0
}

function getAwardEntries(brackets: BracketInfo[]): AwardEntry[] {
  // Ordena chaves pelo momento de finalização (mais antiga primeiro)
  const sorted = [...brackets].sort((a, b) => bracketFinalizedAt(a) - bracketFinalizedAt(b))

  const entries: AwardEntry[] = []
  for (const b of sorted) {
    const category = catLabel(b)
    // Dentro de cada chave: 1°, 2°, 3°
    const podium = getPodium(b).sort((a, c) => a.place - c.place)
    for (const { pos, place } of podium) {
      const reg = pos.registration
      if (!reg || reg.awarded) continue
      entries.push({
        key: reg.id,
        name: athleteName(reg),
        team: reg.team?.name ?? "",
        category,
        place,
      })
    }
  }
  return entries
}

function placeColor(place: number) {
  return MEDAL_COLORS[place] ?? MEDAL_COLORS[3]
}

const LEGEND = [
  { ...MEDAL_COLORS[1] },
  { ...MEDAL_COLORS[2] },
  { ...MEDAL_COLORS[3] },
]

export default function PainelPremiacaoPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [data, setData] = useState<EventData | null>(null)
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
      const res = await fetch(`/api/painel-premiacao/${eventId}`)
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

  const entries = getAwardEntries(data.brackets)
  // Sempre 4 colunas fixas de até 10 slots cada
  const cols: AwardEntry[][] = Array.from({ length: NUM_COLS }, (_, i) =>
    entries.slice(i * NAMES_PER_COL, (i + 1) * NAMES_PER_COL)
  )

  // Altura fixa por slot
  const TOPBAR_H = 52
  const LEGEND_H = 38
  const OUTER_PAD = 16 + 10 + 10 + 10
  const SLOTS_AREA_H = DESIGN_H - TOPBAR_H - LEGEND_H - OUTER_PAD
  const SLOT_H = Math.floor((SLOTS_AREA_H - (NAMES_PER_COL - 1) * GAP) / NAMES_PER_COL)

  return (
    <div style={{ width: "100vw", height: "100dvh", backgroundColor: "#f0f4f8", overflow: "hidden", position: "relative" }}>

      {showOverlay && (
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#f0f4f8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
          <div style={{ color: "#1e293b", fontSize: "1.5rem", fontWeight: 900, marginBottom: 12 }}>
            Painel de Premiação
          </div>
          <div style={{ color: "#64748b", fontSize: "1rem", marginBottom: 32 }}>Área de Entrega de Medalhas</div>
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
        padding: `16px 24px 10px`,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}>

        {/* Topbar */}
        <div style={{ height: TOPBAR_H, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ffffff", borderRadius: 10, padding: "0 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 34, height: 34, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#1e293b", fontWeight: 900, fontSize: 20 }}>{data.event.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Painel de Premiação — Entrega de Medalhas</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>Última atualização</div>
            <div style={{ color: "#475569", fontSize: 15, fontFamily: "monospace" }}>
              {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ height: LEGEND_H, marginBottom: 10, display: "flex", alignItems: "center", gap: 24, backgroundColor: "#e2e8f0", borderRadius: 8, padding: "0 18px" }}>
          {LEGEND.map(l => (
            <div key={l.emoji} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{l.emoji}</span>
              <span style={{ color: "#475569", fontSize: 15, fontWeight: 600 }}>{l.label.replace("\n", " ")}</span>
            </div>
          ))}
          <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: "auto" }}>
            {entries.length} atleta(s) aguardando premiação
          </span>
        </div>

        {/* Colunas */}
        {entries.length === 0 ? (
          <div style={{ height: SLOTS_AREA_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>🏆</div>
              <div style={{ color: "#94a3b8", fontSize: 24 }}>Nenhum atleta aguardando premiação</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${NUM_COLS}, minmax(0, 1fr))`, gap: 16 }}>
            {cols.map((col, colIdx) => (
              <div key={colIdx}>
                <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {Array.from({ length: NAMES_PER_COL }).map((_, idx) => {
                    const a = col[idx]
                    if (!a) {
                      return (
                        <div key={`empty-${idx}`} style={{
                          height: SLOT_H, borderRadius: 6,
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }} />
                      )
                    }
                    const c = placeColor(a.place)
                    return (
                      <div key={a.key} style={{
                        height: SLOT_H,
                        backgroundColor: c.bg,
                        borderRadius: 6,
                        display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
                        overflow: "hidden",
                        borderLeft: `4px solid ${c.border}`,
                      }}>
                        {/* Badge lugar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 44, flexShrink: 0 }}>
                          <span style={{ color: c.text, fontWeight: 900, fontSize: 15, lineHeight: 1.1, textAlign: "center", whiteSpace: "pre-line" }}>
                            {c.label}
                          </span>
                        </div>
                        {/* Emoji medalha */}
                        <span style={{ fontSize: 26, flexShrink: 0 }}>{c.emoji}</span>
                        {/* Info atleta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: c.text, fontWeight: 700, fontSize: 20, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.name}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                            {a.team && (
                              <span style={{ color: c.subText, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.team}
                              </span>
                            )}
                            <span style={{ color: c.subText, opacity: 0.7, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
                              {a.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
