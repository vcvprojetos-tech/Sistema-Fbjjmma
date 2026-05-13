"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim (4 e 5 anos)",
  MIRIM: "Mirim (6 e 7 anos)",
  INFANTIL_A: "Infantil A (8 e 9 anos)",
  INFANTIL_B: "Infantil B (10 e 11 anos)",
  INFANTO_JUVENIL_A: "Infanto Juvenil A (12 e 13 anos)",
  INFANTO_JUVENIL_B: "Infanto Juvenil B (14 e 15 anos)",
  JUVENIL: "Juvenil (16 e 17 anos)",
  ADULTO: "Adulto (18 a 29 anos)",
  MASTER_1: "Master 1 (30 a 35 anos)",
  MASTER_2: "Master 2 (36 a 40 anos)",
  MASTER_3: "Master 3 (41 a 45 anos)",
  MASTER_4: "Master 4 (46 a 50 anos)",
  MASTER_5: "Master 5 (51 a 55 anos)",
  MASTER_6: "Master 6 (56 a 60 anos)",
}

interface WeightCategory {
  id: string
  ageGroup: string
  sex: string
  name: string
  maxWeight: number
  order: number
}

interface WeightTable {
  id: string
  name: string
  isActive: boolean
  categories: WeightCategory[]
}

interface GroupKey {
  ageGroup: string
  sex: string
  label: string
}

export default function TabelaPesoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [table, setTable] = useState<WeightTable | null>(null)
  const [tableName, setTableName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedGroup, setSavedGroup] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editedCategories, setEditedCategories] = useState<Record<string, Partial<WeightCategory>>>({})
  const [nameError, setNameError] = useState("")

  const loadTable = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tabelas-peso/${id}`)
      const data = await res.json()
      if (data.id) {
        setTable(data)
        setTableName(data.name)
        const allGroups = new Set<string>()
        data.categories.forEach((c: WeightCategory) => {
          allGroups.add(`${c.ageGroup}|${c.sex}`)
        })
        setExpandedGroups(allGroups)
      }
    } catch {
      console.error("Erro ao carregar tabela")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadTable()
  }, [loadTable])

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCategoryChange(catId: string, field: keyof WeightCategory, value: string | number) {
    setEditedCategories((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value },
    }))
  }

  async function handleSaveName() {
    if (!tableName.trim()) {
      setNameError("Nome é obrigatório.")
      return
    }
    setNameError("")
    setSaving(true)
    try {
      await fetch(`/api/admin/tabelas-peso/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tableName.trim() }),
      })
      setTable((prev) => (prev ? { ...prev, name: tableName.trim() } : prev))
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGroup(groupKey: string) {
    if (!table) return
    const [ageGroup, sex] = groupKey.split("|")
    const cats = table.categories.filter(
      (c) => c.ageGroup === ageGroup && c.sex === sex
    )
    const updatedCats = cats.map((c) => ({
      id: c.id,
      maxWeight: editedCategories[c.id]?.maxWeight ?? c.maxWeight,
      order: editedCategories[c.id]?.order ?? c.order,
      name: editedCategories[c.id]?.name ?? c.name,
    }))

    setSaving(true)
    try {
      await fetch(`/api/admin/tabelas-peso/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updatedCats }),
      })
      setSavedGroup(groupKey)
      setTimeout(() => setSavedGroup(null), 2000)
      loadTable()
      const keysToRemove = cats.map((c) => c.id)
      setEditedCategories((prev) => {
        const next = { ...prev }
        keysToRemove.forEach((k) => delete next[k])
        return next
      })
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-[#6b7280]">Carregando...</div>
    )
  }

  if (!table) {
    return (
      <div className="p-6 text-[#6b7280]">Tabela não encontrada.</div>
    )
  }

  const groupMap = new Map<string, WeightCategory[]>()
  for (const cat of table.categories) {
    const key = `${cat.ageGroup}|${cat.sex}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(cat)
  }

  const sortedGroups: GroupKey[] = Array.from(groupMap.keys()).map((key) => {
    const [ageGroup, sex] = key.split("|")
    return {
      ageGroup,
      sex,
      label: `${AGE_GROUP_LABELS[ageGroup] || ageGroup} — ${sex === "MASCULINO" ? "Masculino" : "Feminino"}`,
    }
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tabelas-peso">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{table.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[#6b7280] text-sm">Tabela de Peso</p>
            <Badge variant={table.isActive ? "success" : "destructive"}>
              {table.isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
          Nome da Tabela
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="tableName">Nome *</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Nome da tabela"
            />
            {nameError && <p className="text-xs text-[#dc2626]">{nameError}</p>}
          </div>
          <div className="flex items-end">
            <Button onClick={handleSaveName} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Categories grouped by AgeGroup x Sex */}
      {sortedGroups.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center text-[#6b7280]"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          Nenhuma categoria cadastrada nesta tabela.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const key = `${group.ageGroup}|${group.sex}`
            const cats = groupMap.get(key) || []
            const isExpanded = expandedGroups.has(key)
            const isSaved = savedGroup === key

            return (
              <div
                key={key}
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => toggleGroup(key)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#6b7280]" />
                    )}
                    <span className="text-white font-medium text-sm">
                      {group.label}
                    </span>
                    <span className="text-xs text-[#6b7280]">
                      ({cats.length} {cats.length === 1 ? "categoria" : "categorias"})
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">
                            Nome
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase w-36">
                            Peso Máx (kg)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase w-24">
                            Ordem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cats.map((cat) => {
                          const edited = editedCategories[cat.id] || {}
                          return (
                            <tr
                              key={cat.id}
                              style={{ borderBottom: "1px solid var(--border)" }}
                            >
                              <td className="px-4 py-2">
                                <Input
                                  value={edited.name ?? cat.name}
                                  onChange={(e) =>
                                    handleCategoryChange(cat.id, "name", e.target.value)
                                  }
                                  className="h-8 text-xs"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={
                                    edited.maxWeight !== undefined
                                      ? edited.maxWeight
                                      : cat.maxWeight
                                  }
                                  onChange={(e) =>
                                    handleCategoryChange(
                                      cat.id,
                                      "maxWeight",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={
                                    edited.order !== undefined ? edited.order : cat.order
                                  }
                                  onChange={(e) =>
                                    handleCategoryChange(
                                      cat.id,
                                      "order",
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="flex justify-end px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() => handleSaveGroup(key)}
                        disabled={saving}
                      >
                        {isSaved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
