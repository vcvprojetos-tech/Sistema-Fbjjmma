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

// Tamanho fixo de design — o conteúdo é renderizado aqui e depois escalado
const DESIGN_W = 1920
const DESIGN_H = 1080

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
interface FlatMatch { bracketLabel: string; match: MatchInfo }

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
function flatMatches(tatame: TatameInfo): FlatMatch[] {
  const result: FlatMatch[] = []
  for (const b of tatame.brackets) {
    for (const m of b.matches) {
      if (!m.endedAt && m.position1 !== null) result.push({ bracketLabel: catLabel(b), match: m })
    }
  }
  return result.slice(0, 5)
}

function statusStyle(checkedIn: boolean, calls: CallTime[] | null, isWO: boolean) {
  if (isWO)      return { bg: "#334155", text: "#94a3b8", sub: "#64748b" }
  if (checkedIn) return { bg: "#14532d", text: "#bbf7d0", sub: "#86efac" }
  const n = calls?.length ?? 0
  if (n >= 3)    return { bg: "#7f1d1d", text: "#fecaca", sub: "#fca5a5" }
  if (n === 2)   return { bg: "#7c2d12", text: "#fed7aa", sub: "#fdba74" }
  if (n === 1)   return { bg: "#713f12", text: "#fde68a", sub: "#fcd34d" }
  return           { bg: "#991b1b", text: "#fecdd3", sub: "#fca5a5" }
}

const LEGEND = [
  { bg: "#991b1b", label: "Não pesado" },
  { bg: "#713f12", label: "1ª Chamada" },
  { bg: "#7c2d12", label: "2ª Chamada" },
  { bg: "#7f1d1d", label: "3ª Chamada" },
  { bg: "#14532d", label: "Presente" },
  { bg: "#334155", label: "W.O." },
]

// Alturas calculadas para 5 cards caberem em 1080px
// Overhead: padding(40) + topbar(60) + legenda(50) + col-header(80) + 4 gaps(48) = 278px
// Disponível: 1080 - 278 = 802px / 5 cards = 160px por card
const ROW_H   = 56   // altura de cada linha de atleta
const CAT_H   = 22   // altura do cabeçalho de categoria
const VS_H    = 16   // altura da divisória VS
const GAP     = 12   // gap entre cards
const FS_NAME = 20   // fonte do nome
const FS_TEAM = 14   // fonte da equipe
const FS_CAT  = 13   // fonte da categoria

function AthleteRow({ pos, checkedIn, calls, seed, isWO }: {
  pos: MatchInfo["position1"]; checkedIn: boolean; calls: CallTime[] | null
  seed: number; isWO: boolean
}) {
  const name = getName(pos)
  const team = getTeam(pos)
  if (name === "BYE") return <div style={{ height: ROW_H, backgroundColor: "#0f172a" }} />
  const s = statusStyle(checkedIn, calls, isWO)
  return (
    <div style={{ height: ROW_H, backgroundColor: s.bg, display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
      <span style={{ color: s.sub, fontWeight: 800, fontSize: FS_NAME, width: 32, textAlign: "center", flexShrink: 0 }}>{seed}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: s.text, fontWeight: 700, fontSize: FS_NAME, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {team && <div style={{ color: s.sub, fontSize: FS_TEAM, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team}</div>}
      </div>
    </div>
  )
}

function MatchCell({ fm, accentColor }: { fm: FlatMatch; accentColor: string }) {
  const { match, bracketLabel } = fm
  const isSolo = match.position2 === null
  const allCalls = match.callTimes as CallTime[] | null
  const p1Calls = allCalls ? allCalls.filter(c => c.pos === "p1" || !c.pos) : null
  const p2Calls = allCalls ? allCalls.filter(c => c.pos === "p2" || !c.pos) : null
  const isWOFinal = match.isWO && match.endedAt !== null
  const cardH = CAT_H + ROW_H + (isSolo ? 0 : VS_H + ROW_H)
  return (
    <div style={{ height: cardH, border: `1px solid #334155`, borderTop: `3px solid ${accentColor}`, borderRadius: 6, backgroundColor: "#0f172a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: CAT_H, backgroundColor: "#1e293b", display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0 }}>
        <span style={{ color: "#94a3b8", fontSize: FS_CAT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bracketLabel}</span>
      </div>
      <AthleteRow pos={match.position1} checkedIn={match.p1CheckedIn} calls={p1Calls} seed={1} isWO={isWOFinal} />
      {!isSolo && (
        <div style={{ height: VS_H, backgroundColor: "#0a0f1a", display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "#1e293b" }} />
          <span style={{ color: "#475569", fontSize: 14, fontWeight: 800, padding: "0 10px" }}>VS</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#1e293b" }} />
        </div>
      )}
      {!isSolo && <AthleteRow pos={match.position2} checkedIn={match.p2CheckedIn} calls={p2Calls} seed={2} isWO={isWOFinal} />}
    </div>
  )
}

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

  // Escala X e Y independentemente para preencher a tela inteira sem espaços
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
  const tatames = (() => {
    if (!painelNum) return allTatames
    const mid = Math.ceil(allTatames.length / 2)
    return painelNum === "1" ? allTatames.slice(0, mid) : allTatames.slice(mid)
  })()
  const columns = tatames.map(t => ({ tatame: t, matches: flatMatches(t) }))

  return (
    // Fundo ocupa toda a tela
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


      {/* Container interno: tamanho fixo 1920×1080, escalado e centralizado */}
      <div style={{
        width: DESIGN_W,
        height: DESIGN_H,
        transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
        transformOrigin: "top left",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "#0a0f1a",
        padding: "20px 24px",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt="FBJJMMA" style={{ width: 40, height: 40, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 22 }}>{event.name}</div>
              <div style={{ color: "#64748b", fontSize: 14 }}>Painel de Chamadas — Área de Pesagem</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#475569", fontSize: 12 }}>Última atualização</div>
            <div style={{ color: "#64748b", fontSize: 16, fontFamily: "monospace" }}>
              {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: "flex", gap: 20, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, backgroundColor: l.bg, borderRadius: 3 }} />
              <span style={{ color: "#64748b", fontSize: 16 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {tatames.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#1e293b", fontSize: 60, marginBottom: 10 }}>📋</div>
              <div style={{ color: "#475569", fontSize: 24 }}>Nenhum tatame ativo no momento</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${tatames.length}, minmax(0, 1fr))`, gap: 16 }}>
            {columns.map(({ tatame, matches }, colIdx) => {
              const color = COL_COLORS[colIdx % COL_COLORS.length]
              const num = tatame.name.match(/Tatame\s+(\d+)/i)?.[1] ?? tatame.name
              const op = tatame.operations[0]?.user.name ?? ""
              return (
                <div key={tatame.id} style={{ display: "flex", flexDirection: "column" }}>
                  {/* Cabeçalho */}
                  <div style={{ textAlign: "center", paddingBottom: 10, borderBottom: `4px solid ${color}`, marginBottom: 12, flexShrink: 0 }}>
                    <div style={{ color: "#ffffff", fontWeight: 900, fontSize: 36, letterSpacing: "0.04em" }}>Tatame {num}</div>
                    {op && <div style={{ color: "#64748b", fontSize: 18, marginTop: 2 }}>{op}</div>}
                  </div>
                  {/* Cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                    {matches.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <span style={{ color: "#1e293b", fontSize: 20 }}>Sem lutas pendentes</span>
                      </div>
                    ) : (
                      matches.map(fm => (
                        <MatchCell key={fm.match.id} fm={fm} accentColor={color} />
                      ))
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
