"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipes</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Gerencie as equipes da federação
          </p>
        </div>
        <Link href="/admin/equipes/nova">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3 max-w-sm">
        <Input
          placeholder="Buscar equipe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" onClick={() => setFiltered(
          teams.filter((t) =>
            t.name.toLowerCase().includes(search.toLowerCase())
          )
        )}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #222222" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden sm:table-cell">
                  Nº Atletas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Ativo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#6b7280]">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#6b7280]">
                    Nenhuma equipe encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((team, index) => (
                  <tr
                    key={team.id}
                    style={{ borderBottom: "1px solid #1a1a1a" }}
                    className="hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6b7280]">{index + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{team.name}</td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                      {team._count?.athletes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={team.isActive ? "success" : "destructive"}>
                        {team.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/equipes/${team.id}/editar`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-[#dc2626]"
                          onClick={() => handleDelete(team.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
