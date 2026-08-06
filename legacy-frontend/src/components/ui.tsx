"use client";

import { STATUS_LABELS, STATUS_TONE } from "@/lib/labels";
import type { SolicitudStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: SolicitudStatus }) {
  return (
    <span className={`badge ${STATUS_TONE[status]}`}>{STATUS_LABELS[status]}</span>
  );
}

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="error-box">{message}</div>;
}

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return <div className="center-screen">{label}</div>;
}

export function InfoRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="info-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}
