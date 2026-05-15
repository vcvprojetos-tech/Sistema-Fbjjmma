"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { ThemeLogo } from "@/components/ThemeLogo"

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
const GROUPS_PER_ROW = 4
const GROUP_GAP = 12
const GROUP_HEADER_H = 58
const ATHLETE_H = 50
const ATHLETE_GAP = 5

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
  key: string
  name: string
  team: string
  place: number
}

interface AwardGroup {
  bracketId: string
  category: string
  athletes: AwardEntry[]
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

function getAwardGroups(brackets: BracketInfo[]): AwardGroup[] {
  const sorted = [...brackets].sort((a, b) => bracketFinalizedAt(a) - bracketFinalizedAt(b))
  const groups: AwardGroup[] = []
  for (const b of sorted) {
    const podium = getPodium(b).sort((a, c) => a.place - c.place)
    const athletes: AwardEntry[] = []
    for (const { pos, place } of podium) {
      const reg = pos.registration
      if (!reg || reg.awarded) continue
      athletes.push({ key: reg.id, name: athleteName(reg), team: reg.team?.name ?? "", place })
    }
    if (athletes.length > 0) groups.push({ bracketId: b.id, category: catLabel(b), athletes })
  }
  return groups
}

function queueLabel(idx: number): string {
  if (idx === 0) return "Categoria sendo premiada"
  return `${idx + 1}° na fila de premiação`
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
  const [isMobile, setIsMobile] = useState(false)

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
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

  const groups = getAwardGroups(data.brackets)
  const totalAthletes = groups.reduce((s, g) => s + g.athletes.length, 0)

  const TOPBAR_H = 52
  const LEGEND_H = 38
  const CONTENT_H = DESIGN_H - TOPBAR_H - LEGEND_H - 46

  // ── Layout Mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    const PLACE_COLORS: Record<number, { bg: string; border: string; label: string; text: string; sub: string }> = {
      1: { bg: "#1c0f00", border: "#f59e0b", label: "1°", text: "#fde68a", sub: "#ca8a04" },
      2: { bg: "#0d1a2e", border: "#60a5fa", label: "2°", text: "#bfdbfe", sub: "#3b82f6" },
      3: { bg: "#1a0e00", border: "#f97316", label: "3°", text: "#fed7aa", sub: "#ea580c" },
    }
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#0a0f1a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        {/* Header fixo */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0d1117", borderBottom: "1px solid #1e293b", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.event.name}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>Painel de Premiação</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ color: "#334155", fontSize: 10 }}>Atualizado</div>
              <div style={{ color: "#475569", fontSize: 12, fontFamily: "monospace" }}>
                {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        </div>

        {/* Contador */}
        <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>
            {totalAthletes === 0 ? "Nenhum atleta aguardando" : `${totalAthletes} atleta${totalAthletes > 1 ? "s" : ""} · ${groups.length} categoria${groups.length > 1 ? "s" : ""}`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(p => {
              const c = PLACE_COLORS[p]
              return (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, backgroundColor: c.border, borderRadius: 2, opacity: 0.8 }} />
                  <span style={{ color: "#475569", fontSize: 11 }}>{c.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista de categorias */}
        <div style={{ flex: 1, padding: "4px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 }}>
              <div style={{ fontSize: 48 }}>🏆</div>
              <div style={{ color: "#334155", fontSize: 16, fontWeight: 600, textAlign: "center" }}>Nenhuma categoria aguardando premiação</div>
            </div>
          ) : (
            groups.map((group, gIdx) => (
              <div key={group.bracketId} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
                <div style={{
                  padding: "8px 12px",
                  backgroundColor: gIdx === 0 ? "#1e3a5f" : "#1e293b",
                  borderBottom: "1px solid #334155",
                }}>
                  {gIdx === 0 && (
                    <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Sendo premiada agora</div>
                  )}
                  <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {group.category}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px" }}>
                  {group.athletes.map(a => {
                    const c = PLACE_COLORS[a.place] ?? PLACE_COLORS[3]
                    return (
                      <div key={a.key} style={{
                        backgroundColor: c.bg,
                        border: `1px solid ${c.border}55`,
                        borderLeft: `4px solid ${c.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6,
                          backgroundColor: `${c.border}22`,
                          border: `1px solid ${c.border}66`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <span style={{ color: c.text, fontWeight: 900, fontSize: 14 }}>{c.label}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: c.text, fontWeight: 700, fontSize: 14, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.name}
                          </div>
                          {a.team && (
                            <div style={{ color: c.sub, fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.team}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
  // ── Fim Layout Mobile ──────────────────────────────────────────────────────

  return (
    <div style={{ width: "100vw", height: "100dvh", backgroundColor: "#f0f4f8", overflow: "hidden", position: "relative" }}>

      {showOverlay && (
        <div onClick={enterFullscreen} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#f0f4f8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <ThemeLogo style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 24 }} />
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
            <ThemeLogo style={{ width: 34, height: 34, objectFit: "contain" }} />
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
            {totalAthletes} atleta(s) · {groups.length} categoria(s) aguardando premiação
          </span>
        </div>

        {/* Cards de categorias */}
        {groups.length === 0 ? (
          <div style={{ height: CONTENT_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>🏆</div>
              <div style={{ color: "#94a3b8", fontSize: 24 }}>Nenhuma categoria aguardando premiação</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GROUPS_PER_ROW}, minmax(0, 1fr))`, gap: GROUP_GAP, alignContent: "start" }}>
            {groups.map((group, gIdx) => (
              <div key={group.bracketId} style={{
                backgroundColor: "#ffffff",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                boxShadow: gIdx === 0 ? "0 0 0 2px #3b82f6" : "0 1px 3px rgba(0,0,0,0.07)",
                display: "flex", flexDirection: "column",
              }}>
                {/* Cabeçalho do grupo */}
                <div style={{
                  height: GROUP_HEADER_H, flexShrink: 0,
                  backgroundColor: gIdx === 0 ? "#1e3a5f" : "#334155",
                  padding: "0 14px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <div style={{ color: gIdx === 0 ? "#93c5fd" : "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                    {queueLabel(gIdx)}
                  </div>
                  <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {group.category}
                  </div>
                </div>

                {/* Atletas */}
                <div style={{ display: "flex", flexDirection: "column", gap: ATHLETE_GAP, padding: "6px" }}>
                  {group.athletes.map(a => {
                    const c = placeColor(a.place)
                    return (
                      <div key={a.key} style={{
                        height: ATHLETE_H,
                        backgroundColor: c.bg,
                        borderRadius: 6,
                        display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                        overflow: "hidden",
                        borderLeft: `4px solid ${c.border}`,
                        flexShrink: 0,
                      }}>
                        <div style={{ width: 32, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: c.text, fontWeight: 900, fontSize: 10, lineHeight: 1.15, textAlign: "center", whiteSpace: "pre-line" }}>
                            {c.label}
                          </span>
                        </div>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{c.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: c.text, fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.name}
                          </div>
                          {a.team && (
                            <div style={{ color: c.subText, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                              {a.team}
                            </div>
                          )}
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
