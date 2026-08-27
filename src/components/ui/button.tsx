import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-transparent px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-3 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "bg-secondary text-on-primary hover:bg-primary",
        outline: "border-primary bg-surface text-primary hover:bg-surface-subtle",
      },
      size: {
        default: "min-w-28",
        sm: "min-h-8 min-w-0 px-3 py-1.5 text-xs",
        lg: "min-h-12 px-5 text-base",
        icon: "min-h-10 min-w-10 px-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
