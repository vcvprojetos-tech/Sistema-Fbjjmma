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
  return result.slice(0, 4)
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

// Calcula tamanhos em px a partir da altura real da tela
function calcSizes(screenH: number, numCards: number) {
  // Espaço fixo: topbar ~52px + legenda ~36px + col-header ~58px + gaps ~30px = 176px
  const overhead = 176
  const totalGaps = (numCards - 1) * 6
  const cardH = Math.floor((screenH - overhead - totalGaps) / numCards)
  // Dentro do card: catH + rowH + vsH + rowH
  const catH  = Math.max(22, Math.floor(cardH * 0.13))
  const vsH   = Math.max(16, Math.floor(cardH * 0.08))
  const rowH  = Math.floor((cardH - catH - vsH) / 2)
  const fsName = Math.max(13, Math.floor(rowH * 0.38))
  const fsTeam = Math.max(10, Math.floor(rowH * 0.27))
  const fsCat  = Math.max(10, Math.floor(catH * 0.55))
  return { cardH, catH, vsH, rowH, fsName, fsTeam, fsCat }
}

function AthleteRow({ pos, checkedIn, calls, seed, isWO, rowH, fsName, fsTeam }: {
  pos: MatchInfo["position1"]; checkedIn: boolean; calls: CallTime[] | null
  seed: number; isWO: boolean; rowH: number; fsName: number; fsTeam: number
}) {
  const name = getName(pos)
  const team = getTeam(pos)
  if (name === "BYE") return <div style={{ height: rowH, backgroundColor: "#0f172a" }} />
  const s = statusStyle(checkedIn, calls, isWO)
  return (
    <div style={{ height: rowH, backgroundColor: s.bg, display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", overflow: "hidden" }}>
      <span style={{ color: s.sub, fontWeight: 800, fontSize: fsName, width: fsName * 1.4, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{seed}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: s.text, fontWeight: 700, fontSize: fsName, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {team && <div style={{ color: s.sub, fontSize: fsTeam, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team}</div>}
      </div>
    </div>
  )
}

function MatchCell({ fm, accentColor, sizes }: {
  fm: FlatMatch; accentColor: string
  sizes: ReturnType<typeof calcSizes>
}) {
  const { match, bracketLabel } = fm
  const isSolo = match.position2 === null
  const allCalls = match.callTimes as CallTime[] | null
  const p1Calls = allCalls ? allCalls.filter(c => c.pos === "p1" || !c.pos) : null
  const p2Calls = allCalls ? allCalls.filter(c => c.pos === "p2" || !c.pos) : null
  const isWOFinal = match.isWO && match.endedAt !== null
  const { cardH, catH, vsH, rowH, fsName, fsTeam, fsCat } = sizes
  return (
    <div style={{ height: cardH, flexShrink: 0, border: `1px solid #334155`, borderTop: `3px solid ${accentColor}`, borderRadius: 4, backgroundColor: "#0f172a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: catH, flexShrink: 0, backgroundColor: "#1e293b", display: "flex", alignItems: "center", padding: "0 10px" }}>
        <span style={{ color: "#94a3b8", fontSize: fsCat, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bracketLabel}</span>
      </div>
      <AthleteRow pos={match.position1} checkedIn={match.p1CheckedIn} calls={p1Calls} seed={1} isWO={isWOFinal} rowH={rowH} fsName={fsName} fsTeam={fsTeam} />
      {!isSolo && (
        <div style={{ height: vsH, flexShrink: 0, display: "flex", alignItems: "center", backgroundColor: "#0a0f1a", padding: "0 10px" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "#1e293b" }} />
          <span style={{ color: "#475569", fontSize: fsCat, fontWeight: 800, padding: "0 8px" }}>VS</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#1e293b" }} />
        </div>
      )}
      {!isSolo && <AthleteRow pos={match.position2} checkedIn={match.p2CheckedIn} calls={p2Calls} seed={2} isWO={isWOFinal} rowH={rowH} fsName={fsName} fsTeam={fsTeam} />}
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
  const [screenH, setScreenH] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)

  // Mede a altura real da tela
  useEffect(() => {
    const update = () => setScreenH(window.innerHeight)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setShowOverlay(false)
  }, [])

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setScreenH(window.innerHeight)
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0f1a" }}>
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
  const maxCards = Math.max(...columns.map(c => c.matches.length), 1)
  const sizes = screenH > 0 ? calcSizes(screenH, maxCards) : null

  return (
    <div ref={headerRef} style={{ height: "100dvh", width: "100%", boxSizing: "border-box", backgroundColor: "#0a0f1a", padding: "8px 12px", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

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

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: "0.9rem" }}>{event.name}</div>
            <div style={{ color: "#64748b", fontSize: "0.6rem" }}>Painel de Chamadas — Área de Pesagem</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#475569", fontSize: "0.55rem" }}>Última atualização</div>
          <div style={{ color: "#64748b", fontSize: "0.7rem", fontFamily: "monospace" }}>
            {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, backgroundColor: l.bg, borderRadius: 2 }} />
            <span style={{ color: "#64748b", fontSize: "0.62rem" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {tatames.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#1e293b", fontSize: "3rem", marginBottom: 10 }}>📋</div>
            <div style={{ color: "#475569", fontSize: "1rem" }}>Nenhum tatame ativo no momento</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${tatames.length}, minmax(0, 1fr))`, gap: 8 }}>
          {columns.map(({ tatame, matches }, colIdx) => {
            const color = COL_COLORS[colIdx % COL_COLORS.length]
            const num = tatame.name.match(/Tatame\s+(\d+)/i)?.[1] ?? tatame.name
            const op = tatame.operations[0]?.user.name ?? ""
            return (
              <div key={tatame.id} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Cabeçalho da coluna */}
                <div style={{ textAlign: "center", paddingBottom: 8, borderBottom: `3px solid ${color}`, flexShrink: 0 }}>
                  <div style={{ color: "#ffffff", fontWeight: 900, fontSize: "1.2rem", letterSpacing: "0.04em" }}>Tatame {num}</div>
                  {op && <div style={{ color: "#64748b", fontSize: "0.65rem", marginTop: 1 }}>{op}</div>}
                </div>
                {/* Cards de luta */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, overflow: "hidden" }}>
                  {matches.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>Sem lutas pendentes</span>
                    </div>
                  ) : sizes ? (
                    matches.map(fm => (
                      <MatchCell key={fm.match.id} fm={fm} accentColor={color} sizes={sizes} />
                    ))
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
