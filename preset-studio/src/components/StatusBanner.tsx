import { useState, useCallback } from "react";
import { CheckCircle2, Info, AlertTriangle, Loader2 } from "lucide-react";

export type StatusKind = "info" | "success" | "error" | "busy";

export interface Status {
  readonly message: string;
  readonly kind: StatusKind;
}

const ICONS: Record<StatusKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
  busy: Loader2,
};

export function useStatus() {
  const [status, setStatusState] = useState<Status | null>(null);
  const setStatus = useCallback((message: string, kind: StatusKind = "info") => {
    if (!message) {
      setStatusState(null);
      return;
    }
    setStatusState({ message, kind });
  }, []);
  return [status, setStatus] as const;
}

export function StatusBanner({ status }: { readonly status: Status | null }) {
  if (!status) return null;
  const Icon = ICONS[status.kind];
  return (
    <p className={`status-banner status-${status.kind}`}>
      <Icon size={16} className={status.kind === "busy" ? "spin" : undefined} />
      <span>{status.message}</span>
    </p>
  );
}
