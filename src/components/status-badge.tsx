import type { ReactNode } from "react";
import { Check, Circle, TriangleAlert } from "lucide-react";

type StatusBadgeTone = "success" | "warning" | "neutral";

export function StatusBadge({ children, tone, showIcon = true }: { children: ReactNode; tone: StatusBadgeTone; showIcon?: boolean }) {
  return <span className={`gst-status-badge is-${tone}`}>{showIcon ? <StatusBadgeIcon tone={tone} /> : null}<span>{children}</span></span>;
}

function StatusBadgeIcon({ tone }: { tone: StatusBadgeTone }) {
  if (tone === "success") return <Check aria-hidden="true" />;
  if (tone === "warning") return <TriangleAlert aria-hidden="true" />;
  return <Circle aria-hidden="true" />;
}
