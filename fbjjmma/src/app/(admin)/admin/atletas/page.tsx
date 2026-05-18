"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, Pencil, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  photo: string | null
  sex: string
  belt: string
  isAffiliated: boolean
  user: {
    id: string
    name: string
    cpf: string
    isActive: boolean
  }
  team: Team | null
}

interface AthleteResponse {
  athletes: Athlete[]
  total: number
  page: number
  limit: number
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca",
  AMARELA_LARANJA_VERDE: "Amarela/Laranja/Verde",
  AZUL: "Azul",
  ROXA: "Roxa",
  MARROM: "Marrom",
  PRETA: "Preta",
}

const BELT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BRANCA: { bg: "#f3f4f620", text: "#d1d5db", border: "#6b728050" },
  AMARELA_LARANJA_VERDE: { bg: "#fbbf2420", text: "#fbbf24", border: "#fbbf2440" },
  AZUL: { bg: "#3b82f620", text: "#60a5fa", border: "#3b82f640" },
  ROXA: { bg: "#a855f720", text: "#c084fc", border: "#a855f740" },
  MARROM: { bg: "#92400e30", text: "#d97706", border: "#92400e50" },
  PRETA: { bg: "var(--card)80", text: "#e5e7eb", border: "#444444" },
}

function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return "***.***.***-**"
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

export default function AtletasPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20

  const [nome, setNome] = useState("")
  const [sexo, setSexo] = useState("")
  const [faixa, setFaixa] = useState("")
  const [equipeId, setEquipeId] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [stats, setStats] = useState({ total: 0, ativos: 0, afiliados: 0 })

  const loadAthletes = useCallback(
    async (currentPage: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (nome) params.set("nome", nome)
        if (sexo) params.set("sexo", sexo)
        if (faixa) params.set("faixa", faixa)
        if (equipeId) params.set("equipeId", equipeId)
        params.set("page", String(currentPage))
        params.set("limit", String(limit))

        const res = await fetch(`/api/admin/atletas?${params}`)
        const data: AthleteResponse = await res.json()
        if (data.athletes) {
          setAthletes(data.athletes)
          setTotal(data.total)
        }
      } catch {
        console.error("Erro ao carregar atletas")
      } finally {
        setLoading(false)
      }
    },
    [nome, sexo, faixa, equipeId]
  )

  async function loadStats() {
    try {
      const [allRes, afiliRes] = await Promise.all([
        fetch("/api/admin/atletas?limit=1"),
        fetch("/api/admin/atletas?limit=1&isAffiliated=true"),
      ])
      const allData = await allRes.json()
      const afiliData = await afiliRes.json()
      setStats({
        total: allData.total || 0,
        ativos: allData.total || 0,
        afiliados: afiliData.total || 0,
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetch("/api/admin/equipes")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTeams(d)
      })
    loadStats()
  }, [])

  useEffect(() => {
    setPage(1)
    loadAthletes(1)
  }, [loadAthletes])

  function handleSearch() {
    setPage(1)
    loadAthletes(1)
  }

  async function handleDelete(id: string) {
    if (!confirm("Desativar este atleta?")) return
    await fetch(`/api/admin/atletas/${id}`, { method: "DELETE" })
    loadAthletes(page)
    loadStats()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Atletas</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Gerencie os atletas da federação
          </p>
        </div>
        <Link href="/admin/atletas/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Atleta
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: stats.total, color: "var(--foreground)" },
          { label: "Ativos", value: stats.ativos, color: "#16a34a" },
          { label: "Afiliados", value: stats.afiliados, color: "#2563eb" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border p-4"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">
              {s.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Nome do atleta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select value={sexo} onValueChange={setSexo}>
            <SelectTrigger>
              <SelectValue placeholder="Sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="MASCULINO">Masculino</SelectItem>
              <SelectItem value="FEMININO">Feminino</SelectItem>
            </SelectContent>
          </Select>
          <Select value={faixa} onValueChange={setFaixa}>
            <SelectTrigger>
              <SelectValue placeholder="Faixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="BRANCA">Branca</SelectItem>
              <SelectItem value="AMARELA_LARANJA_VERDE">Amarela/Laranja/Verde</SelectItem>
              <SelectItem value="AZUL">Azul</SelectItem>
              <SelectItem value="ROXA">Roxa</SelectItem>
              <SelectItem value="MARROM">Marrom</SelectItem>
              <SelectItem value="PRETA">Preta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={equipeId} onValueChange={setEquipeId}>
            <SelectTrigger>
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-12">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden md:table-cell">
                  CPF
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden sm:table-cell">
                  Sexo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden lg:table-cell">
                  Faixa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden lg:table-cell">
                  Equipe
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden md:table-cell">
                  Filiado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#6b7280]">
                    Carregando...
                  </td>
                </tr>
              ) : athletes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#6b7280]">
                    Nenhum atleta encontrado.
                  </td>
                </tr>
              ) : (
                athletes.map((athlete, index) => {
                  const beltStyle = BELT_STYLES[athlete.belt] || BELT_STYLES.BRANCA
                  return (
                    <tr
                      key={athlete.id}
                      style={{ borderBottom: "1px solid var(--card-alt)" }}
                      className="hover:bg-[var(--card-alt)] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#6b7280]">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        {athlete.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={athlete.photo}
                            alt={athlete.user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--border)" }}
                          >
                            <User className="h-4 w-4 text-[#6b7280]" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{athlete.user.name}</p>
                        {!athlete.user.isActive && (
                          <span className="text-xs text-[#dc2626]">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell font-mono text-xs">
                        {maskCPF(athlete.user.cpf)}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                        {athlete.sex === "MASCULINO" ? "Masculino" : "Feminino"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: beltStyle.bg,
                            color: beltStyle.text,
                            borderColor: beltStyle.border,
                          }}
                        >
                          {BELT_LABELS[athlete.belt] || athlete.belt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">
                        {athlete.team?.name || "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={athlete.isAffiliated ? "success" : "secondary"}>
                          {athlete.isAffiliated ? "Sim" : "Não"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/atletas/${athlete.id}/editar`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-[#dc2626]"
                            onClick={() => handleDelete(athlete.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-sm text-[#6b7280]">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                  loadAthletes(page - 1)
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1)
                  loadAthletes(page + 1)
                }}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
