import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/lib/auth"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "FBJJMMA - Federação Baiana de Jiu-Jitsu e MMA",
  description: "Sistema de gestão da Federação Baiana de Jiu-Jitsu e MMA",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
      >
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
