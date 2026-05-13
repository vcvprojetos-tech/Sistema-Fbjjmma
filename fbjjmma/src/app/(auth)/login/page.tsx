"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeLogo } from "@/components/ThemeLogo"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")

  useEffect(() => {
    const enter = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    document.addEventListener("click", enter, { once: true })
    document.addEventListener("keydown", enter, { once: true })
    return () => {
      document.removeEventListener("click", enter)
      document.removeEventListener("keydown", enter)
    }
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const scroll = () => {
      const el = document.activeElement
      if (el instanceof HTMLElement) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    vv.addEventListener("resize", scroll)
    return () => vv.removeEventListener("resize", scroll)
  }, [])
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("CPF/e-mail ou senha inválidos.")
      } else {
        try {
          await document.documentElement.requestFullscreen()
        } catch {
          // navegador bloqueou fullscreen — continua mesmo assim
        }
        router.push("/admin")
      }
    } catch {
      setError("Erro ao realizar login. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center overflow-y-auto py-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-md px-4">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8">
          <ThemeLogo className="w-40 h-40 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-wider">
            FBJJMMA
          </h1>
          <p className="text-sm text-[#6b7280] text-center mt-1">
            Federação Baiana de Jiu-Jitsu e MMA
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-lg border p-8"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Entrar no Sistema
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">CPF ou E-mail</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="000.000.000-00 ou email@exemplo.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-[#dc2626] text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/esqueceu-senha"
              className="text-sm text-[#6b7280] hover:text-[#dc2626] transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
