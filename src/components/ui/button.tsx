import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "gst-button inline-flex h-10 max-h-10 items-center justify-center gap-2 rounded-sm border border-transparent px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-3 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "gst-button-default bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "gst-button-secondary bg-secondary text-on-primary hover:bg-primary",
        outline: "gst-button-outline border-primary bg-surface text-primary hover:bg-surface-subtle",
      },
      size: {
        default: "min-w-28",
        sm: "min-w-0",
        lg: "min-w-0",
        icon: "min-w-10",
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
