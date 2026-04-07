"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface WeightTable {
  id: string
  name: string
  isActive: boolean
  _count?: { categories: number }
}

export default function TabelasPesoPage() {
  const [tables, setTables] = useState<WeightTable[]>([])
  const [loading, setLoading] = useState(true)

  async function loadTables() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tabelas-peso?all=1&counts=1")
      const data = await res.json()
      if (Array.isArray(data)) setTables(data)
    } catch {
      console.error("Erro ao carregar tabelas de peso")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTables()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("Desativar esta tabela de peso?")) return
    await fetch(`/api/admin/tabelas-peso/${id}`, { method: "DELETE" })
    loadTables()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tabelas de Peso</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Gerencie as tabelas de peso e categorias
          </p>
        </div>
        <Link href="/admin/tabelas-peso/nova">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tabela
          </Button>
        </Link>
      </div>

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
                  Nº Categorias
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
              ) : tables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#6b7280]">
                    Nenhuma tabela encontrada.
                  </td>
                </tr>
              ) : (
                tables.map((table, index) => (
                  <tr
                    key={table.id}
                    style={{ borderBottom: "1px solid #1a1a1a" }}
                    className="hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6b7280]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tabelas-peso/${table.id}`}
                        className="text-white font-medium hover:text-[#dc2626] transition-colors"
                      >
                        {table.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                      {table._count?.categories ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={table.isActive ? "success" : "destructive"}>
                        {table.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/tabelas-peso/${table.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-[#dc2626]"
                          onClick={() => handleDelete(table.id)}
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
