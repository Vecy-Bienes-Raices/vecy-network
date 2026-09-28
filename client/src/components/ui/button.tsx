import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-95 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#dfba6d] via-[#c99c3e] to-[#ae832a] hover:brightness-110 text-black font-extrabold shadow-[0_4px_15px_rgba(191,149,63,0.35)] border-none",
        gold:
          "bg-gradient-to-b from-[#dfba6d] via-[#c99c3e] to-[#ae832a] hover:brightness-110 text-black font-extrabold shadow-[0_4px_15px_rgba(191,149,63,0.35)] border-none",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-white/5 hover:bg-white/10 border border-white/15 text-white backdrop-blur-md hover:border-[#bf953f]/40 shadow-xs",
        glass:
          "bg-white/5 hover:bg-white/10 border border-white/15 text-white backdrop-blur-md hover:border-[#bf953f]/40 shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-white/10 text-zinc-300 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-full gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-full px-6 has-[>svg]:px-4",
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
