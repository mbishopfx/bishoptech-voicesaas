import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-0 text-[0.72rem] leading-none font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    tone?: "default" | "success" | "warning" | "muted" | "cyan"
  }) {
  const Comp = asChild ? Slot.Root : "span"
  const mappedVariant =
    tone === "success"
      ? "secondary"
      : tone === "warning"
        ? "destructive"
        : tone === "muted" || tone === "cyan"
          ? "outline"
          : variant

  return (
    <Comp
      data-slot="badge"
      data-variant={mappedVariant}
      data-tone={tone}
      className={cn(
        badgeVariants({ variant: mappedVariant }),
        tone === "success" && "border-emerald-700/15 bg-emerald-700/[0.08] text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200 dark:shadow-none",
        tone === "warning" && "border-amber-600/20 bg-amber-500/[0.10] text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200 dark:shadow-none",
        tone === "muted" && "border-border/80 bg-background/82 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:shadow-none",
        tone === "cyan" && "border-sky-700/15 bg-sky-600/[0.08] text-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-cyan-500/25 dark:bg-cyan-500/12 dark:text-cyan-200 dark:shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
