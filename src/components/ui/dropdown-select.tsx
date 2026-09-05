"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type Option = { label: string; value: string };

export function DropdownSelect({ value, onValueChange, options, ariaLabel, disabled = false }: { value: string; onValueChange: (value: string) => void; options: Option[]; ariaLabel: string; disabled?: boolean }) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}><SelectPrimitive.Trigger className="gst-dropdown-select" aria-label={ariaLabel}><SelectPrimitive.Value /><SelectPrimitive.Icon><ChevronDown /></SelectPrimitive.Icon></SelectPrimitive.Trigger><SelectPrimitive.Portal><SelectPrimitive.Content className="gst-dropdown-content" position="popper" sideOffset={4}><SelectPrimitive.Viewport>{options.map((option) => <SelectPrimitive.Item className="gst-dropdown-item" value={option.value} key={option.value}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>)}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal></SelectPrimitive.Root>;
}
