"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b]",
        destructive:
          "bg-[#dc2626] hover:bg-[#b91c1c]",
        outline:
          "border border-[var(--border-alt)] bg-transparent text-[color:var(--foreground)] hover:bg-[var(--card-alt)]",
        secondary:
          "bg-[var(--card-alt)] text-[color:var(--foreground)] hover:bg-[var(--border)]",
        ghost:
          "bg-transparent hover:bg-[var(--card-alt)]",
        link:
          "text-[#dc2626] underline-offset-4 hover:underline bg-transparent p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const VARIANT_COLORS: Record<string, string> = {
  default:     "#ffffff",
  destructive: "#ffffff",
  outline:     "var(--foreground)",
  secondary:   "var(--foreground)",
  ghost:       "var(--muted-foreground)",
  link:        "#dc2626",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const variantColor = VARIANT_COLORS[variant ?? "default"]
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ color: variantColor, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
