"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, Check, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const PERMISSION_GROUPS = [
  {
    key: "secoes",
    label: "Seções Gerais",
    permissions: [
      { key: "ATLETAS", label: "Atletas" },
      { key: "EQUIPES", label: "Equipes" },
      { key: "TABELAS_PESO", label: "Tabelas de Peso" },
    ],
  },
  {
    key: "eventos_crud",
    label: "Eventos",
    permissions: [
      { key: "EVENTOS_CRIAR", label: "Criar evento" },
      { key: "EVENTOS_EDITAR", label: "Editar evento" },
      { key: "EVENTOS_EXCLUIR", label: "Excluir evento" },
    ],
  },
  {
    key: "evento_atletas",
    label: "Evento — Aba Atletas",
    permissions: [
      { key: "EVENTO_ATLETAS_INSCREVER", label: "Inscrever atleta" },
      { key: "EVENTO_ATLETAS_IMPORTAR", label: "Importar Excel" },
      { key: "EVENTO_ATLETAS_EXCLUIR_TODOS", label: "Excluir todos" },
      { key: "EVENTO_ATLETAS_EXPORTAR", label: "Exportar" },
    ],
  },
  {
    key: "evento_chaves",
    label: "Evento — Aba Chaves",
    permissions: [
      { key: "EVENTO_CHAVES_GERAR", label: "Gerar chaves" },
      { key: "EVENTO_CHAVES_EXPORTAR", label: "Exportar PDF" },
      { key: "EVENTO_CHAVES_LIMPAR", label: "Limpar chaves" },
      { key: "EVENTO_CHAVES_ATRIBUIR", label: "Atribuir ao tatame" },
    ],
  },
  {
    key: "evento_tatames",
    label: "Evento — Aba Tatames",
    permissions: [
      { key: "EVENTO_TATAMES_EXCLUIR_CHAVE", label: "Excluir chave" },
      { key: "EVENTO_TATAMES_ATRIBUIR_CHAVE", label: "Atribuir tatame" },
      { key: "EVENTO_TATAMES_TROCAR_POSICAO", label: "Trocar posição" },
      { key: "EVENTO_TATAMES_REINICIAR_CHAVE", label: "Reiniciar chave" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuários",
    permissions: [
      { key: "USUARIOS_CRIAR_COORDENADOR_TATAME", label: "Cadastrar Coord. de Tatame" },
    ],
  },
] as const

const ALL_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))

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
    const has = currentPerms.includes(permKey)
    const newPermissions = has ? currentPerms.filter((p) => p !== permKey) : [...currentPerms, permKey]

    setCoordenadores((prev) =>
      prev.map((c) => (c.id === userId ? { ...c, permissions: newPermissions } : c))
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
        prev.map((c) => (c.id === userId ? { ...c, permissions: currentPerms } : c))
      )
    } finally {
      setSaving(null)
    }
  }

  async function toggleGroup(userId: string, groupKeys: readonly string[], currentPerms: string[]) {
    const allChecked = groupKeys.every((k) => currentPerms.includes(k))
    const newPermissions = allChecked
      ? currentPerms.filter((p) => !groupKeys.includes(p))
      : [...new Set([...currentPerms, ...groupKeys])]

    setCoordenadores((prev) =>
      prev.map((c) => (c.id === userId ? { ...c, permissions: newPermissions } : c))
    )
    setSaving(userId + "group")
    try {
      await fetch(`/api/admin/permissoes/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      })
    } catch {
      setCoordenadores((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, permissions: currentPerms } : c))
      )
    } finally {
      setSaving(null)
    }
  }

  async function toggleAll(userId: string, currentPerms: string[]) {
    const allChecked = ALL_KEYS.every((k) => currentPerms.includes(k))
    const newPermissions = allChecked ? [] : [...ALL_KEYS]

    setCoordenadores((prev) =>
      prev.map((c) => (c.id === userId ? { ...c, permissions: newPermissions } : c))
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
        prev.map((c) => (c.id === userId ? { ...c, permissions: currentPerms } : c))
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
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Painel de Permissões</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Defina o que cada Coordenador Geral pode fazer no sistema
          </p>
        </div>
      </div>

      {coordenadores.length === 0 ? (
        <div
          className="rounded-lg border p-10 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}
        >
          Nenhum Coordenador Geral cadastrado.
        </div>
      ) : (
        <div className="space-y-6">
          {coordenadores.map((coord) => {
            const allChecked = ALL_KEYS.every((k) => coord.permissions.includes(k))
            const isBusy = !!saving && saving.startsWith(coord.id)
            return (
              <div
                key={coord.id}
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                {/* Cabeçalho do coordenador */}
                <div
                  className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ color: "var(--foreground)" }}>{coord.name}</p>
                      <Badge variant={coord.isActive ? "success" : "destructive"}>
                        {coord.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{coord.email}</p>
                  </div>
                  <button
                    onClick={() => toggleAll(coord.id, coord.permissions)}
                    disabled={isBusy}
                    className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:bg-[var(--card-alt)]"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    {allChecked ? "Remover todas" : "Conceder todas"}
                  </button>
                </div>

                {/* Grupos de permissões */}
                <div className="p-5 space-y-5">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key)
                    const groupAllChecked = groupKeys.every((k) => coord.permissions.includes(k))
                    const groupSomeChecked = groupKeys.some((k) => coord.permissions.includes(k))
                    return (
                      <div key={group.key}>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleGroup(coord.id, groupKeys, coord.permissions)}
                            disabled={isBusy}
                            className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              backgroundColor: groupAllChecked ? "#dc2626" : groupSomeChecked ? "#dc262660" : "transparent",
                              borderColor: groupAllChecked || groupSomeChecked ? "#dc2626" : "var(--border-alt)",
                            }}
                            title={groupAllChecked ? "Remover grupo" : "Conceder grupo"}
                          >
                            {groupAllChecked && <Check className="w-2.5 h-2.5 text-white" />}
                            {groupSomeChecked && !groupAllChecked && <span className="w-2 h-0.5 bg-white rounded" />}
                          </button>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            {group.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ml-6">
                          {group.permissions.map((perm) => {
                            const checked = coord.permissions.includes(perm.key)
                            const isSaving = saving === coord.id + perm.key
                            return (
                              <button
                                key={perm.key}
                                onClick={() => togglePermission(coord.id, perm.key, coord.permissions)}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left"
                                style={{
                                  backgroundColor: checked ? "#dc262618" : "var(--card-alt)",
                                  borderColor: checked ? "#dc2626" : "var(--border-alt)",
                                  color: checked ? "#dc2626" : "var(--muted-foreground)",
                                  opacity: isBusy && saving !== coord.id + perm.key ? 0.6 : 1,
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
