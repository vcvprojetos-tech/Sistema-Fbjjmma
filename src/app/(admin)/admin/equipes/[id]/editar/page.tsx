"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function EditarEquipePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/admin/equipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setName(data.name)
          setIsActive(data.isActive)
        }
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("O nome da equipe é obrigatório.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/equipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao atualizar equipe.")
      } else {
        router.push("/admin/equipes")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-[#6b7280]">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/equipes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Equipe</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Atualize os dados da equipe</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border p-6 space-y-4"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Equipe *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da equipe"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="isActive"
            checked={isActive}
            onCheckedChange={(v) => setIsActive(Boolean(v))}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Equipe Ativa
          </Label>
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/equipes">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
