"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="admin-page-title">Tabelas de Peso</p>
          <p className="admin-page-subtitle">Gerencie as tabelas de peso e categorias</p>
        </div>
        <Link href="/admin/tabelas-peso/nova">
          <button className="admin-btn admin-btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Nova Tabela
          </button>
        </Link>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Nome</th>
                <th className="hidden sm:table-cell">Nº Categorias</th>
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
              ) : tables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Nenhuma tabela encontrada.
                  </td>
                </tr>
              ) : (
                tables.map((table, index) => (
                  <tr key={table.id}>
                    <td style={{ color: "var(--muted)" }}>{index + 1}</td>
                    <td>
                      <Link
                        href={`/admin/tabelas-peso/${table.id}`}
                        className="font-semibold hover:text-[#dc2626] transition-colors"
                        style={{ color: "var(--foreground)" }}
                      >
                        {table.name}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                      {table._count?.categories ?? "—"}
                    </td>
                    <td>
                      <span className={table.isActive ? "admin-badge admin-badge-green" : "admin-badge admin-badge-red"}>
                        {table.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/tabelas-peso/${table.id}`}>
                          <button className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center" title="Editar">
                            <Pencil className="h-3.5 w-3.5 adm-icon-blue" />
                          </button>
                        </Link>
                        <button
                          className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => handleDelete(table.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5 adm-icon-red" />
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
