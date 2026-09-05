"use client";

import { useEffect } from "react";

export function Toast({ message, onDismiss }: { message?: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="gst-toast-viewport" aria-live="polite" aria-atomic="true">
      <div className="gst-toast" role="status">
        <p>{message}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>
      </div>
    </div>
  );
}
