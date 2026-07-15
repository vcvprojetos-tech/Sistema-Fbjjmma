"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, Check, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const PERMISSIONS = [
  { key: "EVENTOS", label: "Eventos" },
  { key: "ATLETAS", label: "Atletas" },
  { key: "EQUIPES", label: "Equipes" },
  { key: "TABELAS_PESO", label: "Tabelas de Peso" },
] as const

interface Coordenador {
  id: string
  name: string
  email: string
  isActive: boolean
  permissions: string[]
}

export default function PermissoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (session?.user?.role !== "PRESIDENTE") {
      router.replace("/admin")
      return
    }
    fetch("/api/admin/permissoes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCoordenadores(data)
      })
      .finally(() => setLoading(false))
  }, [session, status, router])

  async function togglePermission(userId: string, permKey: string, currentPerms: string[]) {
    const hasPermission = currentPerms.includes(permKey)
    const newPermissions = hasPermission
      ? currentPerms.filter((p) => p !== permKey)
      : [...currentPerms, permKey]

    setCoordenadores((prev) =>
      prev.map((c) =>
        c.id === userId ? { ...c, permissions: newPermissions } : c
      )
    )

    setSaving(userId + permKey)
    try {
      await fetch(`/api/admin/permissoes/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      })
    } catch {
      setCoordenadores((prev) =>
        prev.map((c) =>
          c.id === userId ? { ...c, permissions: currentPerms } : c
        )
      )
    } finally {
      setSaving(null)
    }
  }

  async function toggleAll(userId: string, currentPerms: string[]) {
    const allKeys = PERMISSIONS.map((p) => p.key)
    const allChecked = allKeys.every((k) => currentPerms.includes(k))
    const newPermissions = allChecked ? [] : allKeys

    setCoordenadores((prev) =>
      prev.map((c) =>
        c.id === userId ? { ...c, permissions: newPermissions } : c
      )
    )

    setSaving(userId + "all")
    try {
      await fetch(`/api/admin/permissoes/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      })
    } catch {
      setCoordenadores((prev) =>
        prev.map((c) =>
          c.id === userId ? { ...c, permissions: currentPerms } : c
        )
      )
    } finally {
      setSaving(null)
    }
  }

  if (status === "loading" || loading) {
    return <div className="p-6 text-[#6b7280]">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-[#dc2626]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Painel de Permissões</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Defina quais seções cada Coordenador Geral pode acessar
          </p>
        </div>
      </div>

      {coordenadores.length === 0 ? (
        <div
          className="rounded-lg border p-10 text-center text-[#6b7280]"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          Nenhum Coordenador Geral cadastrado.
        </div>
      ) : (
        <div className="space-y-4">
          {coordenadores.map((coord) => {
            const allChecked = PERMISSIONS.every((p) => coord.permissions.includes(p.key))
            return (
              <div
                key={coord.id}
                className="rounded-lg border p-5 space-y-4"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{coord.name}</p>
                      <Badge variant={coord.isActive ? "success" : "destructive"}>
                        {coord.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5">{coord.email}</p>
                  </div>
                  <button
                    onClick={() => toggleAll(coord.id, coord.permissions)}
                    disabled={saving === coord.id + "all"}
                    className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:bg-[var(--card-alt)]"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    {allChecked ? "Remover todas" : "Conceder todas"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PERMISSIONS.map((perm) => {
                    const checked = coord.permissions.includes(perm.key)
                    const isSaving = saving === coord.id + perm.key
                    return (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(coord.id, perm.key, coord.permissions)}
                        disabled={!!saving}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all"
                        style={{
                          backgroundColor: checked ? "#dc262618" : "var(--card-alt)",
                          borderColor: checked ? "#dc2626" : "var(--border-alt)",
                          color: checked ? "#dc2626" : "var(--muted-foreground)",
                          opacity: saving && saving !== coord.id + perm.key ? 0.6 : 1,
                        }}
                      >
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border"
                          style={{
                            backgroundColor: checked ? "#dc2626" : "transparent",
                            borderColor: checked ? "#dc2626" : "var(--border-alt)",
                          }}
                        >
                          {isSaving ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                          ) : checked ? (
                            <Check className="w-2.5 h-2.5 text-white" />
                          ) : null}
                        </span>
                        {perm.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
