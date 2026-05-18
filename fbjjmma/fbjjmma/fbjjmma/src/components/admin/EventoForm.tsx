"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"

const ESTADOS_BR = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

const DEFAULT_WEIGH_IN =
  "A PESAGEM acontecerá COM KIMONO na hora estipulada na programação, ANTES do início das disputas das categorias. Aconselhamos aos competidores estarem presentes 45 minutos antes do horário previsto. Todos os atletas deverão portar documento de identidade, com foto, na hora da pesagem."

const DEFAULT_IMAGE_RIGHTS =
  "Ao participar deste evento, o atleta autoriza o uso de sua imagem e vídeo para fins de divulgação institucional da FBJJMMA, sem qualquer ônus."

const DEFAULT_PHYSICAL_INTEGRITY =
  "A FBJJMMA não se responsabiliza por eventuais acidentes ou lesões durante o evento. Ao se inscrever, o atleta declara estar em condições físicas adequadas para a prática do esporte."

interface EventType {
  id: string
  name: string
}

interface WeightTable {
  id: string
  name: string
}

interface EventFormData {
  name: string
  typeId: string
  state: string
  city: string
  location: string
  date: string
  registrationDeadline: string
  correctionDeadline: string
  paymentDeadline: string
  checkinRelease: string
  bracketRelease: string
  weightTableId: string
  value: string
  hasAbsolute: boolean
  absoluteValue: string
  registrationOpen: boolean
  isVisible: boolean
  about: string
  paymentInfo: string
  prize: string
  weighInInfo: string
  imageRights: string
  physicalIntegrity: string
}

interface EventoFormProps {
  initialData?: Partial<EventFormData> & { banner?: string; schedule?: string }
  eventId?: string
}

export default function EventoForm({ initialData, eventId }: EventoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [weightTables, setWeightTables] = useState<WeightTable[]>([])
  const bannerRef = useRef<HTMLInputElement>(null)
  const scheduleRef = useRef<HTMLInputElement>(null)
  const [bannerPreview, setBannerPreview] = useState<string>(initialData?.banner || "")
  const [schedulePreview, setSchedulePreview] = useState<string>(initialData?.schedule || "")

  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || "",
    typeId: initialData?.typeId || "",
    state: initialData?.state || "",
    city: initialData?.city || "",
    location: initialData?.location || "",
    date: initialData?.date || "",
    registrationDeadline: initialData?.registrationDeadline || "",
    correctionDeadline: initialData?.correctionDeadline || "",
    paymentDeadline: initialData?.paymentDeadline || "",
    checkinRelease: initialData?.checkinRelease || "",
    bracketRelease: initialData?.bracketRelease || "",
    weightTableId: initialData?.weightTableId || "",
    value: initialData?.value || "",
    hasAbsolute: initialData?.hasAbsolute || false,
    absoluteValue: initialData?.absoluteValue || "",
    registrationOpen: initialData?.registrationOpen || false,
    isVisible: initialData?.isVisible || false,
    about: initialData?.about || "",
    paymentInfo: initialData?.paymentInfo || "",
    prize: initialData?.prize || "",
    weighInInfo: initialData?.weighInInfo || DEFAULT_WEIGH_IN,
    imageRights: initialData?.imageRights || DEFAULT_IMAGE_RIGHTS,
    physicalIntegrity: initialData?.physicalIntegrity || DEFAULT_PHYSICAL_INTEGRITY,
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tipos-evento").then((r) => r.json()),
      fetch("/api/admin/tabelas-peso").then((r) => r.json()),
    ]).then(([types, tables]) => {
      if (Array.isArray(types)) setEventTypes(types)
      if (Array.isArray(tables)) setWeightTables(tables)
    })
  }, [])

  function handleChange(field: keyof EventFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "banner" | "schedule"
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === "banner") setBannerPreview(url)
    else setSchedulePreview(url)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const formData = new FormData()

      // Append file inputs
      const bannerFile = bannerRef.current?.files?.[0]
      const scheduleFile = scheduleRef.current?.files?.[0]
      if (bannerFile) formData.append("banner", bannerFile)
      if (scheduleFile) formData.append("schedule", scheduleFile)

      // Append form fields
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const url = eventId
        ? `/api/admin/eventos/${eventId}`
        : "/api/admin/eventos"
      const method = eventId ? "PUT" : "POST"

      const res = await fetch(url, { method, body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao salvar evento.")
      } else {
        router.push("/admin/eventos")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const sectionClass = "text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-4"
  const fieldGroupClass = "grid grid-cols-1 md:grid-cols-2 gap-4"

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/eventos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {eventId ? "Editar Evento" : "Novo Evento"}
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {eventId
              ? "Atualize as informações do evento"
              : "Preencha os dados para criar um novo evento"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Imagens */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className={sectionClass}>Imagens</h3>
          <div className={fieldGroupClass}>
            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner do Evento</Label>
              <div
                className="relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer hover:border-[#dc2626] transition-colors"
                style={{ borderColor: "var(--border-alt)", minHeight: "120px" }}
                onClick={() => bannerRef.current?.click()}
              >
                {bannerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <Upload className="h-6 w-6 text-[#6b7280]" />
                    <p className="text-xs text-[#6b7280]">Clique para fazer upload</p>
                  </div>
                )}
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "banner")}
                />
              </div>
            </div>

            {/* Schedule/Programação */}
            <div className="space-y-2">
              <Label>Programação (imagem)</Label>
              <div
                className="relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer hover:border-[#dc2626] transition-colors"
                style={{ borderColor: "var(--border-alt)", minHeight: "120px" }}
                onClick={() => scheduleRef.current?.click()}
              >
                {schedulePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={schedulePreview}
                    alt="Programação preview"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <Upload className="h-6 w-6 text-[#6b7280]" />
                    <p className="text-xs text-[#6b7280]">Clique para fazer upload</p>
                  </div>
                )}
                <input
                  ref={scheduleRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "schedule")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Informações Gerais */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className={sectionClass}>Informações Gerais</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Evento *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex.: Campeonato Baiano de Jiu-Jitsu 2026"
                              />
            </div>

            <div className={fieldGroupClass}>
              <div className="space-y-2">
                <Label htmlFor="typeId">Tipo de Evento *</Label>
                <Select
                  value={form.typeId}
                  onValueChange={(v) => handleChange("typeId", v)}
                >
                  <SelectTrigger id="typeId">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightTableId">Tabela de Peso *</Label>
                <Select
                  value={form.weightTableId}
                  onValueChange={(v) => handleChange("weightTableId", v)}
                >
                  <SelectTrigger id="weightTableId">
                    <SelectValue placeholder="Selecione a tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightTables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={fieldGroupClass}>
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Select
                  value={form.state}
                  onValueChange={(v) => handleChange("state", v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Ex.: Salvador"
                                  />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local *</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Nome do ginásio / arena"
                              />
            </div>
          </div>
        </div>

        {/* Datas */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className={sectionClass}>Datas e Prazos</h3>
          <div className={fieldGroupClass}>
            <div className="space-y-2">
              <Label htmlFor="date">Data do Evento *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">Limite para Inscrição *</Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) =>
                  handleChange("registrationDeadline", e.target.value)
                }
                              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctionDeadline">Limite para Correção *</Label>
              <Input
                id="correctionDeadline"
                type="datetime-local"
                value={form.correctionDeadline}
                onChange={(e) =>
                  handleChange("correctionDeadline", e.target.value)
                }
                              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDeadline">Limite para Pagamento *</Label>
              <Input
                id="paymentDeadline"
                type="date"
                value={form.paymentDeadline}
                onChange={(e) => handleChange("paymentDeadline", e.target.value)}
                              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkinRelease">Liberação da Checagem *</Label>
              <Input
                id="checkinRelease"
                type="datetime-local"
                value={form.checkinRelease}
                onChange={(e) => handleChange("checkinRelease", e.target.value)}
                              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bracketRelease">Liberação da Chave *</Label>
              <Input
                id="bracketRelease"
                type="datetime-local"
                value={form.bracketRelease}
                onChange={(e) => handleChange("bracketRelease", e.target.value)}
                              />
            </div>
          </div>
        </div>

        {/* Valores */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className={sectionClass}>Valores e Inscrição</h3>
          <div className={fieldGroupClass}>
            <div className="space-y-2">
              <Label htmlFor="value">Valor da Inscrição (R$) *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                placeholder="0.00"
                              />
            </div>

            {form.hasAbsolute && (
              <div className="space-y-2">
                <Label htmlFor="absoluteValue">Valor Absoluto (R$)</Label>
                <Input
                  id="absoluteValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.absoluteValue}
                  onChange={(e) =>
                    handleChange("absoluteValue", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasAbsolute"
                checked={form.hasAbsolute}
                onCheckedChange={(checked) =>
                  handleChange("hasAbsolute", Boolean(checked))
                }
              />
              <Label htmlFor="hasAbsolute" className="cursor-pointer">
                Possui Absoluto
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="registrationOpen"
                checked={form.registrationOpen}
                onCheckedChange={(checked) =>
                  handleChange("registrationOpen", Boolean(checked))
                }
              />
              <Label htmlFor="registrationOpen" className="cursor-pointer">
                Inscrição Disponível
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isVisible"
                checked={form.isVisible}
                onCheckedChange={(checked) =>
                  handleChange("isVisible", Boolean(checked))
                }
              />
              <Label htmlFor="isVisible" className="cursor-pointer">
                Visível para atletas
              </Label>
            </div>
          </div>
        </div>

        {/* Textos informativos */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className={sectionClass}>Informações do Evento</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="about">Sobre o Evento</Label>
              <textarea
                id="about"
                value={form.about}
                onChange={(e) => handleChange("about", e.target.value)}
                placeholder="Descrição do evento..."
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                  minHeight: "100px",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentInfo">Informações de Pagamento</Label>
              <textarea
                id="paymentInfo"
                value={form.paymentInfo}
                onChange={(e) => handleChange("paymentInfo", e.target.value)}
                placeholder="PIX, dados bancários, etc..."
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prize">Premiação</Label>
              <textarea
                id="prize"
                value={form.prize}
                onChange={(e) => handleChange("prize", e.target.value)}
                placeholder="Descrição da premiação..."
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weighInInfo">Pesagem</Label>
              <textarea
                id="weighInInfo"
                value={form.weighInInfo}
                onChange={(e) => handleChange("weighInInfo", e.target.value)}
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageRights">Direitos de Imagem</Label>
              <textarea
                id="imageRights"
                value={form.imageRights}
                onChange={(e) => handleChange("imageRights", e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="physicalIntegrity">Integridade Física</Label>
              <textarea
                id="physicalIntegrity"
                value={form.physicalIntegrity}
                onChange={(e) =>
                  handleChange("physicalIntegrity", e.target.value)
                }
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                style={{
                  backgroundColor: "var(--card-alt)",
                  borderColor: "var(--border-alt)",
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#dc2626] text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pb-6">
          <Link href="/admin/eventos">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading} size="lg">
            {loading ? "Salvando..." : "SALVAR"}
          </Button>
        </div>
      </form>
    </div>
  )
}
