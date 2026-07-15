"use client"

import { useState } from "react"
import { X, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  isOpen: boolean
  eventId: string
  onClose: () => void
  onCreated: () => void
}

const ATHLETE_COUNTS = [2, 3, 4, 6, 8, 12, 16]

export default function CriarChavePersonalizadaModal({ isOpen, eventId, onClose, onCreated }: Props) {
  const [customSex, setCustomSex] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [customWeight, setCustomWeight] = useState("")
  const [customBelt, setCustomBelt] = useState("")
  const [athleteCount, setAthleteCount] = useState(4)
  const [athletes, setAthletes] = useState<string[]>(Array(4).fill(""))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleCountChange(n: number) {
    setAthleteCount(n)
    setAthletes(prev => {
      const next = Array(n).fill("")
      for (let i = 0; i < Math.min(prev.length, n); i++) next[i] = prev[i]
      return next
    })
  }

  function handleAthleteChange(i: number, value: string) {
    setAthletes(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  async function handleSave() {
    const filled = athletes.filter(a => a.trim())
    if (filled.length < 2) {
      setError("Preencha pelo menos 2 nomes de atletas.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/eventos/${eventId}/chaves/personalizada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSex: customSex.trim() || undefined,
          customCategory: customCategory.trim() || undefined,
          customWeight: customWeight.trim() || undefined,
          customBelt: customBelt.trim() || undefined,
          athletes: athletes.map(a => a.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao criar chave.")
        return
      }
      // Reset e fecha
      setCustomSex(""); setCustomCategory(""); setCustomWeight(""); setCustomBelt("")
      setAthleteCount(4); setAthletes(Array(4).fill(""))
      onCreated()
      onClose()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: "#dc2626" }} />
            <h2 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
              Nova Chave Personalizada
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100/10 transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Informações do cabeçalho */}
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                Informações do cabeçalho (opcionais)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block" style={{ color: "var(--muted-foreground)" }}>Sexo</Label>
                  <Input
                    placeholder="Ex: Masculino"
                    value={customSex}
                    onChange={e => setCustomSex(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block" style={{ color: "var(--muted-foreground)" }}>Categoria</Label>
                  <Input
                    placeholder="Ex: Adulto"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block" style={{ color: "var(--muted-foreground)" }}>Divisão / Peso</Label>
                  <Input
                    placeholder="Ex: Até 70kg"
                    value={customWeight}
                    onChange={e => setCustomWeight(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block" style={{ color: "var(--muted-foreground)" }}>Faixa</Label>
                  <Input
                    placeholder="Ex: Branca"
                    value={customBelt}
                    onChange={e => setCustomBelt(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Preview do cabeçalho */}
              {(customSex || customCategory || customWeight || customBelt) && (
                <div
                  className="mt-3 px-3 py-2 rounded-md text-xs"
                  style={{ backgroundColor: "var(--card-alt)", color: "var(--muted-foreground)", fontFamily: "monospace" }}
                >
                  {[customSex, customCategory, customWeight, customBelt, "Personalizada: N"]
                    .filter(Boolean)
                    .join(" | ")}
                </div>
              )}
            </div>

            {/* Número de atletas */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                Número de atletas
              </p>
              <div className="flex gap-2 flex-wrap">
                {ATHLETE_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => handleCountChange(n)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium border transition-colors"
                    style={
                      athleteCount === n
                        ? { backgroundColor: "#dc2626", color: "#fff", borderColor: "#dc2626" }
                        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Nomes dos atletas */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                Atletas
              </p>
              <div className="space-y-2">
                {athletes.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold w-5 text-right flex-shrink-0"
                      style={{ color: "var(--muted)" }}
                    >
                      {i + 1}
                    </span>
                    <Input
                      placeholder={`Nome do atleta ${i + 1}`}
                      value={name}
                      onChange={e => handleAthleteChange(i, e.target.value)}
                      className="text-sm flex-1"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const next = document.querySelectorAll<HTMLInputElement>(".custom-athlete-input")
                          next[i + 1]?.focus()
                        }
                      }}
                      // eslint-disable-next-line react/no-unknown-property
                      {...{ "className": `text-sm flex-1 custom-athlete-input` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 border-t flex-shrink-0 gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          {error && (
            <p className="text-xs text-red-500 flex-1">{error}</p>
          )}
          {!error && <div className="flex-1" />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Plus size={14} className="mr-1.5" />
              {saving ? "Criando..." : "Criar Chave"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
