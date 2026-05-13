"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface ThemeLogoProps {
  className?: string
  style?: React.CSSProperties
}

export function ThemeLogo({ className, style }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const src = !mounted || resolvedTheme === "dark" ? "/logo2.png" : "/logo-color.png"

  return <img src={src} alt="FBJJMMA" className={className} style={style} />
}
