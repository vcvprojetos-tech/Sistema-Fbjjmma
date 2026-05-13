import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/Providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "FBJJMMA - Federação Baiana de Jiu-Jitsu e MMA",
  description: "Sistema de gestão da Federação Baiana de Jiu-Jitsu e MMA",
  icons: {
    icon: "/logo-color.png",
    apple: "/logo-color.png",
  },
  openGraph: {
    siteName: "FBJJMMA",
    title: "FBJJMMA - Federação Baiana de Jiu-Jitsu e MMA",
    description: "Sistema de gestão da Federação Baiana de Jiu-Jitsu e MMA",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
