"use client"

import { useCallback, useEffect, useState } from "react"
import { Monitor, Wifi, WifiOff, RefreshCw, Trash2, LogOut, User, AlertTriangle } from "lucide-react"
import { useSession } from "next-auth/react"

type TatameSession = {
  id: string
  userId: string
  user: { id: string; name: string; role: string } | null
  tatame: { id: string; name: string; event: { name: string } | null } | null
  lastHeartbeat: string
  ativo: boolean
}

type AdminSession = {
  id: string
  userId: string | null
  user: { id: string; name: string; role: string } | null
  ip: string | null
  loginAt: string
  encerrada: boolean
}

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: "Presidente",
  COORDENADOR_GERAL: "Coord. Geral",
  COORDENADOR_TATAME: "Coord. Tatame",
  ATLETA: "Atleta",
  CUSTOM: "Personalizado",
}

function tempoRelativo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s atrás`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  return `${h}h atrás`
}

function dataHora(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function SessoesPage() {
  const { data: session } = useSession()
  const [tatameSessions, setTatameSessions] = useState<TatameSession[]>([])
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [encerrando, setEncerrando] = useState<string | null>(null)
  const [encerrandoTodas, setEncerrandoTodas] = useState(false)
  const [confirmarTodas, setConfirmarTodas] = useState(false)

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch("/api/admin/sessoes")
      if (res.ok) {
        const data = await res.json()
        setTatameSessions(data.tatameSessions ?? [])
        setAdminSessions(data.adminSessions ?? [])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    const interval = setInterval(() => carregar(true), 20_000)
    return () => clearInterval(interval)
  }, [carregar])

  async function encerrar(type: "tatame" | "usuario", id: string) {
    setEncerrando(id)
    try {
      await fetch("/api/admin/sessoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      })
      await carregar(true)
    } finally {
      setEncerrando(null)
    }
  }

  async function encerrarTodas() {
    setEncerrandoTodas(true)
    try {
      await fetch("/api/admin/sessoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      setConfirmarTodas(false)
      await carregar(true)
    } finally {
      setEncerrandoTodas(false)
    }
  }

  const totalAtivos = tatameSessions.filter((s) => s.ativo).length +
    adminSessions.filter((s) => !s.encerrada).length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Sessões Ativas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {totalAtivos} sessão{totalAtivos !== 1 ? "ões" : ""} ativa{totalAtivos !== 1 ? "s" : ""} detectada{totalAtivos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => carregar(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
              backgroundColor: "var(--background)",
            }}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
          {!confirmarTodas ? (
            <button
              onClick={() => setConfirmarTodas(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: "#dc2626", color: "#fff" }}
            >
              <LogOut size={13} />
              Encerrar Todas
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Confirmar?
              </span>
              <button
                onClick={encerrarTodas}
                disabled={encerrandoTodas}
                className="px-3 py-1.5 rounded-md text-sm font-medium"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
              >
                {encerrandoTodas ? "Encerrando..." : "Sim, encerrar"}
              </button>
              <button
                onClick={() => setConfirmarTodas(false)}
                className="px-3 py-1.5 rounded-md text-sm border"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Aviso sobre "Encerrar Todas" */}
      <div
        className="flex items-start gap-3 rounded-md px-4 py-3 text-sm"
        style={{ backgroundColor: "var(--card-alt)", color: "var(--muted-foreground)" }}
      >
        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <span>
          "Encerrar Todas" desconecta todos os coordenadores de tatame e invalida sessões administrativas de outros usuários.
          Sua sessão atual <strong>não</strong> será encerrada.
        </span>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--muted)" }}>
          Carregando sessões...
        </div>
      ) : (
        <>
          {/* Coordenadores de Tatame */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={15} style={{ color: "var(--muted)" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--muted-foreground)" }}>
                COORDENADORES DE TATAME
              </h2>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--card-alt)", color: "var(--muted)" }}
              >
                {tatameSessions.length}
              </span>
            </div>

            {tatameSessions.length === 0 ? (
              <div
                className="rounded-lg border px-4 py-8 text-center text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Nenhum coordenador de tatame ativo no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {tatameSessions.map((s) => {
                  const minAgo = Math.floor((Date.now() - new Date(s.lastHeartbeat).getTime()) / 60000)
                  const statusColor = s.ativo ? "#22c55e" : minAgo < 5 ? "#f59e0b" : "#ef4444"
                  const statusLabel = s.ativo ? "Ativo" : minAgo < 5 ? "Sem resposta" : "Inativo"

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: "#dc2626", color: "#fff" }}
                        >
                          {s.user?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                              {s.user?.name ?? "Usuário desconhecido"}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "var(--card-alt)", color: "var(--muted)" }}
                            >
                              {ROLE_LABELS[s.user?.role ?? ""] ?? s.user?.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.ativo ? (
                              <Wifi size={11} style={{ color: statusColor }} />
                            ) : (
                              <WifiOff size={11} style={{ color: statusColor }} />
                            )}
                            <span className="text-xs" style={{ color: statusColor }}>{statusLabel}</span>
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              · Tatame: <strong>{s.tatame?.name ?? s.id.slice(0, 8)}</strong>
                              {s.tatame?.event && ` (${s.tatame.event.name})`}
                            </span>
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              · {tempoRelativo(s.lastHeartbeat)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => encerrar("tatame", s.id)}
                        disabled={encerrando === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors hover:border-red-400 hover:text-red-500"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                      >
                        <Trash2 size={11} />
                        {encerrando === s.id ? "Encerrando..." : "Encerrar"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Sessões Administrativas */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User size={15} style={{ color: "var(--muted)" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--muted-foreground)" }}>
                SESSÕES ADMINISTRATIVAS
              </h2>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--card-alt)", color: "var(--muted)" }}
              >
                {adminSessions.length}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                — logins nos últimos 30 dias
              </span>
            </div>

            {adminSessions.length === 0 ? (
              <div
                className="rounded-lg border px-4 py-8 text-center text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Nenhum login administrativo nas últimas 8 horas.
              </div>
            ) : (
              <div className="space-y-2">
                {adminSessions.map((s) => {
                  const isMe = s.userId === session?.user?.id
                  const statusColor = s.encerrada ? "#6b7280" : "#22c55e"
                  const statusLabel = s.encerrada ? "Encerrada" : "Possivelmente ativa"

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card)",
                        opacity: s.encerrada ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: isMe ? "#2563eb" : "#dc2626", color: "#fff" }}
                        >
                          {s.user?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                              {s.user?.name ?? "Usuário desconhecido"}
                            </span>
                            {isMe && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                                você
                              </span>
                            )}
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "var(--card-alt)", color: "var(--muted)" }}
                            >
                              {ROLE_LABELS[s.user?.role ?? ""] ?? s.user?.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            />
                            <span className="text-xs" style={{ color: statusColor }}>{statusLabel}</span>
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              · Login em {dataHora(s.loginAt)}
                            </span>
                            {s.ip && (
                              <span className="text-xs" style={{ color: "var(--muted)" }}>
                                · IP: {s.ip}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isMe && !s.encerrada && s.userId && (
                        <button
                          onClick={() => encerrar("usuario", s.userId!)}
                          disabled={encerrando === s.userId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors hover:border-red-400 hover:text-red-500"
                          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                        >
                          <LogOut size={11} />
                          {encerrando === s.userId ? "Encerrando..." : "Encerrar"}
                        </button>
                      )}
                      {(isMe || s.encerrada) && (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {s.encerrada ? "já encerrada" : "sessão atual"}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
