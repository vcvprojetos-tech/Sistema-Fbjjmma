"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juvenil A",
  INFANTO_JUVENIL_B: "Infanto Juvenil B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}
const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

interface BackupData {
  event: { id: string; name: string; date: string }
  brackets: BracketItem[]
}
interface Reg {
  id: string
  athlete: { user: { name: string } } | null
  guestName: string | null
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
  isWO?: boolean
  endedAt?: string | null
}
interface BracketItem {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: BPos[]
  matches: BMatch[]
}

function athleteName(reg: Reg | null | undefined): string {
  if (!reg) return "BYE"
  return reg.athlete?.user.name ?? reg.guestName ?? "—"
}
function teamName(reg: Reg | null | undefined): string {
  return reg?.team?.name ?? ""
}

function buildPrintHTML(data: BackupData): string {
  const dateStr = data.event.date
    ? new Date(data.event.date).toLocaleDateString("pt-BR")
    : ""

  const bracketBlocks = data.brackets.map(b => {
    const age = AGE_GROUP_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
    const belt = BELT_LABELS[b.belt] || b.belt
    const sex = b.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino"
    const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
    const title = `${sex} | ${age} | ${peso} | ${belt}`
    const statusLabel = b.status === "PREMIADA" ? "Premiada" : "Finalizada"
    const statusColor = b.status === "PREMIADA" ? "#7c3aed" : "#16a34a"
    const statusBg = b.status === "PREMIADA" ? "#ede9fe" : "#dcfce7"

    const posMap = new Map<string, BPos>()
    for (const p of b.positions) posMap.set(p.id, p)

    // Pódio
    const realMatches = b.matches.filter(m => m.position1Id && m.position2Id && m.endedAt)
    const maxRound = realMatches.length > 0 ? Math.max(...realMatches.map(m => m.round)) : 0
    const finalMatch = realMatches.find(m => m.round === maxRound && m.matchNumber === 1)
    const champPos = finalMatch?.winnerId ? posMap.get(finalMatch.winnerId) : undefined
    const viceId = finalMatch ? (finalMatch.winnerId === finalMatch.position1Id ? finalMatch.position2Id : finalMatch.position1Id) : null
    const vicePos = viceId ? posMap.get(viceId) : undefined
    const thirdPos = b.positions.find(p =>
      p.id !== champPos?.id && p.id !== vicePos?.id && p.registration !== null &&
      b.matches.some(m => (m.position1Id === p.id || m.position2Id === p.id) && m.endedAt) &&
      !b.matches.some(m => m.round === maxRound && (m.position1Id === p.id || m.position2Id === p.id))
    )

    const medal = (label: string, bg: string, color: string, pos: BPos | undefined) => {
      if (!pos?.registration) return ""
      const name = athleteName(pos.registration)
      const team = teamName(pos.registration)
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:${bg};color:${color};font-weight:800;font-size:11px;padding:2px 10px;border-radius:999px;white-space:nowrap">${label}</span>
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a">${name}</div>
          ${team ? `<div style="font-size:11px;color:#64748b">${team}</div>` : ""}
        </div>
      </div>`
    }

    const podiumHTML = [
      medal("1º Lugar", "#fbbf24", "#000", champPos),
      medal("2º Lugar", "#94a3b8", "#fff", vicePos),
      medal("3º Lugar", "#cd7c2f", "#fff", thirdPos),
    ].filter(Boolean).join("") || `<p style="color:#94a3b8;font-size:13px">Sem resultado</p>`

    // Partidas
    const byRound = new Map<number, BMatch[]>()
    for (const m of b.matches) {
      if (!m.endedAt) continue
      if (!byRound.has(m.round)) byRound.set(m.round, [])
      byRound.get(m.round)!.push(m)
    }
    const rounds = [...byRound.keys()].sort((a, z) => a - z)

    const roundsHTML = rounds.map(r => {
      const label = r === maxRound ? "Final" : r === maxRound - 1 && maxRound > 1 ? "Semifinal" : `Rodada ${r}`
      const rows = byRound.get(r)!.map(m => {
        const p1 = athleteName(posMap.get(m.position1Id ?? "")?.registration)
        const p2 = m.position2Id ? athleteName(posMap.get(m.position2Id)?.registration) : null
        const p1Win = m.winnerId === m.position1Id
        const p2Win = m.winnerId === m.position2Id
        const wo = m.isWO ? ` <span style="color:#dc2626;font-size:10px">(W.O.)</span>` : ""
        if (!p2) {
          return `<tr>
            <td style="padding:4px 8px;font-weight:600;color:#16a34a">${p1}</td>
            <td style="padding:4px 8px;color:#64748b;font-size:11px" colspan="2">confirmou presença</td>
          </tr>`
        }
        return `<tr>
          <td style="padding:4px 8px;${p1Win ? "font-weight:700;color:#16a34a" : "color:#475569"}">${p1Win ? "▶ " : ""}${p1}</td>
          <td style="padding:4px 8px;text-align:center;color:#94a3b8;font-size:11px">vs${wo}</td>
          <td style="padding:4px 8px;${p2Win ? "font-weight:700;color:#16a34a" : "color:#475569"}">${p2Win ? "▶ " : ""}${p2}</td>
        </tr>`
      }).join("")

      return `<div style="margin-bottom:10px">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;color:#475569;letter-spacing:0.06em">${label}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }).join("")

    return `<div style="page-break-after:always;break-after:page;padding-bottom:20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">
        <div>
          <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Chave #${b.bracketNumber}</p>
          <p style="margin:0;font-size:18px;font-weight:900;color:#0f172a">${title}</p>
        </div>
        <span style="background:${statusBg};color:${statusColor};font-weight:700;font-size:11px;padding:3px 12px;border-radius:999px">${statusLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
        <div>
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Pódio</p>
          ${podiumHTML}
        </div>
        <div>
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Partidas</p>
          ${roundsHTML || '<p style="color:#94a3b8;font-size:13px">Sem partidas</p>'}
        </div>
      </div>
    </div>`
  }).join("")

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Chaves — ${data.event.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, Arial, sans-serif; background: #fff; color: #0f172a; padding: 20px 28px; }
  @page { size: A4; margin: 10mm 14mm; }
</style>
</head>
<body>
  <div style="border-bottom:3px solid #0f172a;padding-bottom:10px;margin-bottom:24px">
    <h1 style="font-size:22px;font-weight:900;margin-bottom:4px">${data.event.name}</h1>
    <p style="color:#64748b;font-size:13px">${dateStr ? `${dateStr} · ` : ""}${data.brackets.length} chave(s) finalizada(s) · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
  </div>
  ${bracketBlocks}
</body>
</html>`
}

export default function BackupVisualPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/backup`)
      if (!res.ok) { setError("Erro ao carregar dados."); return }
      setData(await res.json())
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function handlePrint() {
    if (!data) return
    const html = buildPrintHTML(data)
    const win = window.open("", "_blank")
    if (!win) { alert("Popup bloqueado. Permita popups para este site e tente novamente."); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Topbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <Link href={`/admin/eventos/${id}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none" }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Voltar
        </Link>
        <div style={{ flex: 1 }}>
          {data && <>
            <p style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 13, margin: 0 }}>{data.event.name}</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: 11, margin: 0 }}>{data.brackets.length} chave(s) finalizada(s)</p>
          </>}
        </div>
        <button onClick={handlePrint} disabled={!data} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#0f766e", color: "#fff", border: "none",
          borderRadius: 8, padding: "8px 16px", fontSize: 13,
          fontWeight: 600, cursor: data ? "pointer" : "not-allowed", opacity: data ? 1 : 0.5,
        }}>
          <Printer style={{ width: 14, height: 14 }} />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Lista de chaves na tela */}
      <div style={{ padding: "24px 32px" }}>
        {loading && <p style={{ color: "var(--muted-foreground)" }}>Carregando chaves...</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        {data && data.brackets.length === 0 && <p style={{ color: "var(--muted-foreground)" }}>Nenhuma chave finalizada ainda.</p>}
        {data?.brackets.map(b => {
          const age = AGE_GROUP_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
          const belt = BELT_LABELS[b.belt] || b.belt
          const sex = b.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino"
          const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
          return (
            <div key={b.id} style={{ marginBottom: 8, padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Chave #{b.bracketNumber}</p>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--foreground)", fontSize: 14 }}>{sex} | {age} | {peso} | {belt}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: b.status === "PREMIADA" ? "#ede9fe" : "#dcfce7", color: b.status === "PREMIADA" ? "#7c3aed" : "#16a34a" }}>
                {b.status === "PREMIADA" ? "Premiada" : "Finalizada"}
              </span>
            </div>
          )
        })}
        {data && data.brackets.length > 0 && (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 16 }}>
            Clique em <strong style={{ color: "var(--foreground)" }}>"Imprimir / Salvar PDF"</strong> para abrir uma nova janela com todas as chaves formatadas para impressão.
          </p>
        )}
      </div>
    </div>
  )
}
