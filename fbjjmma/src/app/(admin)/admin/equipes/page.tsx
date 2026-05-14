"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface Team {
  id: string
  name: string
  isActive: boolean
  _count?: { athletes: number }
}

export default function EquipesPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [filtered, setFiltered] = useState<Team[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  async function loadTeams() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/equipes?all=1&counts=1")
      const data = await res.json()
      if (Array.isArray(data)) {
        setTeams(data)
        setFiltered(data)
      }
    } catch {
      console.error("Erro ao carregar equipes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(teams)
    } else {
      setFiltered(
        teams.filter((t) =>
          t.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    }
  }, [search, teams])

  async function handleDelete(id: string) {
    if (!confirm("Desativar esta equipe?")) return
    await fetch(`/api/admin/equipes/${id}`, { method: "DELETE" })
    loadTeams()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="admin-page-title">Equipes</p>
          <p className="admin-page-subtitle">Gerencie as equipes da federação</p>
        </div>
        <Link href="/admin/equipes/nova">
          <button className="admin-btn admin-btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Nova Equipe
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
        <Input
          className="pl-9"
          placeholder="Buscar equipe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Nome</th>
                <th className="hidden sm:table-cell">Nº Atletas</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Nenhuma equipe encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((team, index) => (
                  <tr key={team.id}>
                    <td style={{ color: "var(--muted)" }}>{index + 1}</td>
                    <td className="font-semibold" style={{ color: "var(--foreground)" }}>{team.name}</td>
                    <td className="hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                      {team._count?.athletes ?? "—"}
                    </td>
                    <td>
                      <span className={team.isActive ? "admin-badge admin-badge-green" : "admin-badge admin-badge-red"}>
                        {team.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/equipes/${team.id}/editar`}>
                          <button className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center" title="Editar">
                            <Pencil className="h-3.5 w-3.5" style={{ color: "#3b82f6" }} />
                          </button>
                        </Link>
                        <button
                          className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center hover:text-[#dc2626]"
                          onClick={() => handleDelete(team.id)}
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
      </div>
    </div>
  )
}
