"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
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
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-md px-4">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-24 h-24 flex items-center justify-center mb-4"
            style={{
              clipPath:
                "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              backgroundColor: "#dc2626",
            }}
          >
            <span className="text-white font-black text-sm tracking-widest">
              FBJJMMA
            </span>
          </div>
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

        <div className="mt-6 text-center">
          <p className="text-sm text-[#6b7280]">
            Não tem conta?{" "}
            <Link
              href="/cadastro"
              className="text-[#dc2626] hover:text-[#ef4444] font-medium transition-colors"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
