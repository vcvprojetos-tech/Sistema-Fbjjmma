"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, Pencil, Trash2, User, Users, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
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

const BELT_CLS: Record<string, string> = {
  BRANCA: "admin-badge admin-badge-gray",
  AMARELA_LARANJA_VERDE: "admin-badge admin-badge-amber",
  AZUL: "admin-badge admin-badge-blue",
  ROXA: "admin-badge admin-badge-purple",
  MARROM: "admin-badge admin-badge-amber",
  PRETA: "admin-badge admin-badge-gray",
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="admin-page-title">Atletas</p>
          <p className="admin-page-subtitle">Gerencie os atletas da federação</p>
        </div>
        <Link href="/admin/atletas/novo">
          <button className="admin-btn admin-btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Novo Atleta
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de Atletas", value: stats.total, icon: Users, color: "#dc2626" },
          { label: "Atletas Ativos", value: stats.ativos, icon: User, color: "#16a34a" },
          { label: "Afiliados", value: stats.afiliados, icon: Star, color: "#2563eb" },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="admin-stat-card" style={{ borderLeftColor: s.color }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--card-alt)" }}>
                <Icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>{s.value}</p>
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="admin-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            className="admin-input"
            placeholder="Nome do atleta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select value={sexo} onValueChange={setSexo}>
            <SelectTrigger className="admin-select">
              <SelectValue placeholder="Sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="MASCULINO">Masculino</SelectItem>
              <SelectItem value="FEMININO">Feminino</SelectItem>
            </SelectContent>
          </Select>
          <Select value={faixa} onValueChange={setFaixa}>
            <SelectTrigger className="admin-select">
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
            <SelectTrigger className="admin-select">
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
          <button onClick={handleSearch} className="admin-btn admin-btn-primary w-full justify-center">
            <Search className="h-3.5 w-3.5" />
            Pesquisar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th className="w-12">Foto</th>
                <th>Nome</th>
                <th className="hidden md:table-cell">CPF</th>
                <th className="hidden sm:table-cell">Sexo</th>
                <th className="hidden lg:table-cell">Faixa</th>
                <th className="hidden lg:table-cell">Equipe</th>
                <th className="hidden md:table-cell">Filiado</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : athletes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Nenhum atleta encontrado.
                  </td>
                </tr>
              ) : (
                athletes.map((athlete, index) => (
                  <tr key={athlete.id}>
                    <td style={{ color: "var(--muted)" }}>
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td>
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
                          <User className="h-4 w-4" style={{ color: "var(--muted)" }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <p className="font-semibold" style={{ color: "var(--foreground)" }}>{athlete.user.name}</p>
                      {!athlete.user.isActive && (
                        <span className="text-xs text-[#dc2626]">Inativo</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell font-mono" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      {maskCPF(athlete.user.cpf)}
                    </td>
                    <td className="hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                      {athlete.sex === "MASCULINO" ? "Masculino" : "Feminino"}
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className={BELT_CLS[athlete.belt] || "admin-badge admin-badge-gray"}>
                        {BELT_LABELS[athlete.belt] || athlete.belt}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: "var(--muted)" }}>
                      {athlete.team?.name || "—"}
                    </td>
                    <td className="hidden md:table-cell">
                      <span className={athlete.isAffiliated ? "admin-badge admin-badge-green" : "admin-badge admin-badge-gray"}>
                        {athlete.isAffiliated ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/atletas/${athlete.id}/editar`}>
                          <button className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center" title="Editar">
                            <Pencil className="h-3.5 w-3.5" style={{ color: "#3b82f6" }} />
                          </button>
                        </Link>
                        <button
                          className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center hover:text-[#dc2626]"
                          onClick={() => handleDelete(athlete.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" style={{ color: "#dc2626" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                className="admin-btn admin-btn-ghost"
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); loadAthletes(page - 1) }}
              >
                Anterior
              </button>
              <button
                className="admin-btn admin-btn-ghost"
                disabled={page >= totalPages}
                onClick={() => { setPage(page + 1); loadAthletes(page + 1) }}
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
