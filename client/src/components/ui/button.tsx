import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-95 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,#ffe89c_0%,#d4af37_22%,#fff6c4_48%,#f3c442_53%,#b38118_82%,#7f5405_100%)] hover:brightness-105 text-[#120e03] font-black border-t border-white/75 border-b border-black/55 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_2px_8px_rgba(212,175,55,0.35),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-2px_3px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_22px_rgba(212,175,55,0.65),inset_0_1px_2px_rgba(255,255,255,0.95)]",
        gold:
          "bg-[linear-gradient(180deg,#ffe89c_0%,#d4af37_22%,#fff6c4_48%,#f3c442_53%,#b38118_82%,#7f5405_100%)] hover:brightness-105 text-[#120e03] font-black border-t border-white/75 border-b border-black/55 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_2px_8px_rgba(212,175,55,0.35),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-2px_3px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_22px_rgba(212,175,55,0.65),inset_0_1px_2px_rgba(255,255,255,0.95)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-white/5 hover:bg-white/10 border border-white/15 border-t-white/30 text-white backdrop-blur-md hover:border-[#bf953f]/50 shadow-md",
        glass:
          "bg-white/5 hover:bg-white/10 border border-white/15 border-t-white/30 text-white backdrop-blur-md hover:border-[#bf953f]/50 shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-white/10 text-zinc-300 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
