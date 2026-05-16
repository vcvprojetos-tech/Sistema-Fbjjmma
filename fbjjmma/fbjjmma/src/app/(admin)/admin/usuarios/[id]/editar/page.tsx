"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

export default function EditarUsuarioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [cpf, setCpf] = useState("")

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "COORDENADOR_GERAL",
    isActive: true,
    password: "",
  })

  const isCoordenadorTatame = form.role === "COORDENADOR_TATAME"

  useEffect(() => {
    fetch(`/api/admin/usuarios/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setCpf(data.cpf)
          setForm({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "COORDENADOR_GERAL",
            isActive: data.isActive ?? true,
          })
        }
        setLoading(false)
      })
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  function maskCPF(raw: string) {
    const d = raw.replace(/\D/g, "")
    if (d.length !== 11) return raw
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, "") || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao atualizar usuário.")
      } else {
        router.push("/admin/usuarios")
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
        <Link href="/admin/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Usuário</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{form.name}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border p-6 space-y-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>CPF (não editável)</Label>
          <Input
            value={maskCPF(cpf)}
            disabled
            className="opacity-50 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="phone">Celular</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Perfil *</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRESIDENTE">Presidente</SelectItem>
              <SelectItem value="COORDENADOR_GERAL">Coordenador Geral</SelectItem>
              <SelectItem value="COORDENADOR_TATAME">Coordenador de Tatame</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isCoordenadorTatame && (
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Deixe em branco para não alterar"
              autoComplete="new-password"
            />
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Mínimo 6 caracteres. Deixe em branco para manter a senha atual.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Checkbox
            id="isActive"
            checked={form.isActive}
            onCheckedChange={(v) => set("isActive", Boolean(v))}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Usuário Ativo
          </Label>
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/usuarios">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  )
}
