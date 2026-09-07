import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        "3d":
          "border-2 border-[#1B2A4A] bg-[#FAF8F5] text-[#1B2A4A] font-bold rounded-full shadow-[0_5px_0_0_#1B2A4A] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#1B2A4A] active:translate-y-0.5 active:shadow-[0_2px_0_0_#1B2A4A] dark:border-[#FAF8F5] dark:bg-[#FAF8F5] dark:text-[#0B101B] dark:shadow-[0_5px_0_0_#9E9689,0_6px_0_1.5px_#FAF8F5,0_10px_20px_rgba(0,0,0,0.8)] dark:hover:shadow-[0_7px_0_0_#9E9689,0_8px_0_2px_#FAF8F5,0_14px_25px_rgba(0,0,0,0.9)] dark:active:shadow-[0_2px_0_0_#9E9689,0_3px_0_1px_#FAF8F5] transition-all",
        "3d-primary":
          "border-2 border-[#0E1726] bg-[#1B2A4A] text-[#F5F3EE] font-bold rounded-full shadow-[0_5px_0_0_#0E1726] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#0E1726] active:translate-y-0.5 active:shadow-[0_2px_0_0_#0E1726] dark:border-[#5E83C4] dark:bg-[#20355A] dark:text-[#FAF8F5] dark:shadow-[0_5px_0_0_#0D1624,0_6px_0_1.5px_#5E83C4,0_10px_20px_rgba(0,0,0,0.8)] dark:hover:shadow-[0_7px_0_0_#0D1624,0_8px_0_2px_#5E83C4,0_14px_25px_rgba(94,131,196,0.4)] dark:active:shadow-[0_2px_0_0_#0D1624,0_3px_0_1px_#5E83C4] transition-all",
        "3d-terracotta":
          "border-2 border-[#85331E] bg-[#C1553A] text-[#FBF3EE] font-bold rounded-full shadow-[0_5px_0_0_#6B2615] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#6B2615] active:translate-y-0.5 active:shadow-[0_2px_0_0_#6B2615] dark:border-[#FFA08A] dark:bg-[#E05A3A] dark:text-white dark:shadow-[0_5px_0_0_#7A2612,0_6px_0_1.5px_#FFA08A,0_10px_20px_rgba(224,90,58,0.35)] dark:hover:shadow-[0_7px_0_0_#7A2612,0_8px_0_2px_#FFA08A,0_14px_25px_rgba(224,90,58,0.5)] dark:active:shadow-[0_2px_0_0_#7A2612,0_3px_0_1px_#FFA08A] transition-all",
        "3d-gold":
          "border-2 border-[#825F21] bg-[#C89B4A] text-[#2A2013] font-bold rounded-full shadow-[0_5px_0_0_#664A17] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#664A17] active:translate-y-0.5 active:shadow-[0_2px_0_0_#664A17] dark:border-[#FFE082] dark:bg-[#E5AD35] dark:text-[#1A1203] dark:shadow-[0_5px_0_0_#61440A,0_6px_0_1.5px_#FFE082,0_10px_20px_rgba(229,173,53,0.35)] dark:hover:shadow-[0_7px_0_0_#61440A,0_8px_0_2px_#FFE082,0_14px_25px_rgba(229,173,53,0.5)] dark:active:shadow-[0_2px_0_0_#61440A,0_3px_0_1px_#FFE082] transition-all",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
