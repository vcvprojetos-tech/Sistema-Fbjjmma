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

const MEDAL_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "#78350f", text: "#fde68a", label: "1°" },
  2: { bg: "#1e3a5f", text: "#bfdbfe", label: "2°" },
  3: { bg: "#431407", text: "#fed7aa", label: "3°" },
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
  bracketGroupId?: string | null
  isGrandFinal?: boolean
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

interface Placement {
  place: 1 | 2 | 3
  positionId: string
  registration: Reg | null
}

function getRealMatches(matches: BMatch[]) {
  return matches.filter(m => m.position1Id !== null && m.position2Id !== null)
}

function computePlacements(b: BracketInfo, allBrackets?: BracketInfo[]): Placement[] {
  const { positions, matches } = b
  if (positions.length === 0) return []

  if (b.bracketGroupId && !b.isGrandFinal) {
    if (positions.length === 1 && positions[0].registration)
      return [{ place: 1, positionId: positions[0].id, registration: positions[0].registration }]
    if (!matches || matches.length === 0) return []
    const rm = getRealMatches(matches)
    if (rm.length === 0) return []
    const maxR = Math.max(...rm.map(m => m.round))
    const fin = rm.find(m => m.round === maxR && m.matchNumber === 1)
    if (!fin?.winnerId) return []
    const fp = positions.find(p => p.id === fin.winnerId)
    if (fp?.registration)
      return [{ place: 1, positionId: fp.id, registration: fp.registration }]
    return []
  }

  if (positions.length === 1 && positions[0].registration) {
    const soloMatch = matches.find(m => m.position1Id !== null && m.position2Id === null)
    if (soloMatch?.isWO) return []
    return [{ place: 1, positionId: positions[0].id, registration: positions[0].registration }]
  }

  if (!matches || matches.length === 0) return []

  const realMatches = getRealMatches(matches)
  if (realMatches.length === 0) return []

  const maxRound = Math.max(...realMatches.map(m => m.round))
  const finalMatch = realMatches.find(m => m.round === maxRound && m.matchNumber === 1)
  if (!finalMatch || !finalMatch.winnerId) return []

  const placements: Placement[] = []

  const firstPos = positions.find(p => p.id === finalMatch.winnerId)
  if (firstPos?.registration)
    placements.push({ place: 1, positionId: firstPos.id, registration: firstPos.registration })

  const secondPosId = finalMatch.position1Id === finalMatch.winnerId ? finalMatch.position2Id : finalMatch.position1Id
  const secondPos = positions.find(p => p.id === secondPosId)
  if (secondPos?.registration)
    placements.push({ place: 2, positionId: secondPos.id, registration: secondPos.registration })

  if (b.isGrandFinal && allBrackets && b.bracketGroupId) {
    const champRegId = firstPos?.registration?.id
    if (champRegId) {
      const subBrackets = allBrackets.filter(sb => sb.bracketGroupId === b.bracketGroupId && !sb.isGrandFinal)
      for (const sub of subBrackets) {
        const subReal = getRealMatches(sub.matches)
        const subMaxRound = subReal.length > 0 ? Math.max(...subReal.map(m => m.round)) : 0
        const subFinal = subReal.find(m => m.round === subMaxRound && m.matchNumber === 1)
        if (!subFinal?.winnerId) continue
        const subChamp = sub.positions.find(p => p.id === subFinal.winnerId)
        if (subChamp?.registration?.id !== champRegId) continue
        const loserId = subFinal.position1Id === subFinal.winnerId ? subFinal.position2Id : subFinal.position1Id
        const loserPos = sub.positions.find(p => p.id === loserId)
        if (loserPos?.registration)
          placements.push({ place: 3, positionId: loserPos.id, registration: loserPos.registration })
        break
      }
    }
  } else if (maxRound > 1) {
    if (positions.length === 3) {
      const thirdPos = positions.find(p => p.id !== firstPos?.id && p.id !== secondPos?.id)
      if (thirdPos?.registration)
        placements.push({ place: 3, positionId: thirdPos.id, registration: thirdPos.registration })
    } else {
      const semiRound = maxRound - 1
      const champSemi = realMatches.find(m => m.round === semiRound && m.winnerId === finalMatch.winnerId)
      const semiHadWO = champSemi?.isWO || (!champSemi && matches.some(m => m.round === semiRound && m.isWO))
      if (champSemi && !semiHadWO) {
        const loserId = champSemi.position1Id === champSemi.winnerId ? champSemi.position2Id : champSemi.position1Id
        const loserPos = positions.find(p => p.id === loserId)
        if (loserPos?.registration)
          placements.push({ place: 3, positionId: loserPos.id, registration: loserPos.registration })
      }
    }
  }

  return placements
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
    const placements = computePlacements(b, brackets).sort((a, c) => a.place - c.place)
    for (const { registration: reg, place } of placements) {
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
  { ...MEDAL_COLORS[1], label: "1° Lugar" },
  { ...MEDAL_COLORS[2], label: "2° Lugar" },
  { ...MEDAL_COLORS[3], label: "3° Lugar" },
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
      const res = await fetch(`/api/premiacao/${eventId}`)
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
    <div style={{ width: "100vw", height: "100dvh", backgroundColor: "#0a0f1a", overflow: "hidden", position: "relative" }}>

      {showOverlay && (
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0a0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
          <div style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 900, marginBottom: 12 }}>
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
        padding: `16px 24px 10px`,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}>

        {/* Topbar */}
        <div style={{ height: TOPBAR_H, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 20 }}>{data.event.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Painel de Premiação — Entrega de Medalhas</div>
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
        <div style={{ height: LEGEND_H, marginBottom: 10, display: "flex", alignItems: "center", gap: 24, borderBottom: "1px solid #1e293b" }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, backgroundColor: l.bg, borderRadius: 3, border: `1px solid ${l.text}44` }} />
              <span style={{ color: "#64748b", fontSize: 15 }}>{l.label}</span>
            </div>
          ))}
          <span style={{ color: "#334155", fontSize: 13, marginLeft: "auto" }}>
            {entries.length} atleta(s) aguardando premiação
          </span>
        </div>

        {/* Colunas */}
        {entries.length === 0 ? (
          <div style={{ height: SLOTS_AREA_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#1e293b", fontSize: 60, marginBottom: 10 }}>🏆</div>
              <div style={{ color: "#475569", fontSize: 24 }}>Nenhum atleta aguardando premiação</div>
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
                          backgroundColor: "#0f172a",
                          border: "1px dashed #1e293b",
                        }} />
                      )
                    }
                    const c = placeColor(a.place)
                    return (
                      <div key={a.key} style={{
                        height: SLOT_H,
                        backgroundColor: c.bg,
                        borderRadius: 6,
                        display: "flex", alignItems: "center", gap: 12, padding: "0 14px",
                        overflow: "hidden",
                        borderLeft: `4px solid ${c.text}88`,
                      }}>
                        <span style={{ color: c.text, fontWeight: 900, fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>
                          {c.label}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: c.text, fontWeight: 700, fontSize: 20, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.name}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                            {a.team && (
                              <span style={{ color: c.text, opacity: 0.75, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.team}
                              </span>
                            )}
                            <span style={{ color: c.text, opacity: 0.5, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
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
