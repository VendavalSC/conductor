import React from "react";

const statusConfig: Record<string, {
  bg: string;
  ring: string;
  glow: string;
  pulse?: boolean;
  label: string;
}> = {
  running:   { bg: "bg-emerald-400",  ring: "ring-emerald-400/20", glow: "shadow-[0_0_8px_rgba(52,211,153,0.5)]", label: "Running" },
  healthy:   { bg: "bg-emerald-400",  ring: "ring-emerald-400/20", glow: "shadow-[0_0_8px_rgba(52,211,153,0.5)]", label: "Healthy" },
  starting:  { bg: "bg-amber-400",    ring: "ring-amber-400/20",   glow: "shadow-[0_0_8px_rgba(251,191,36,0.5)]", pulse: true, label: "Starting" },
  stopped:   { bg: "bg-zinc-600",     ring: "ring-zinc-600/20",    glow: "", label: "Stopped" },
  crashed:   { bg: "bg-red-500",      ring: "ring-red-500/20",     glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]", label: "Crashed" },
  unhealthy: { bg: "bg-red-400",      ring: "ring-red-400/20",     glow: "shadow-[0_0_8px_rgba(248,113,113,0.5)]", pulse: true, label: "Unhealthy" },
  stopping:  { bg: "bg-amber-400",    ring: "ring-amber-400/20",   glow: "shadow-[0_0_8px_rgba(251,191,36,0.5)]", pulse: true, label: "Stopping" },
};

interface StatusDotProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StatusDot({ status, size = "sm", showLabel = false }: StatusDotProps) {
  const config = statusConfig[status] || statusConfig.stopped;
  const sizeMap = {
    sm: "w-[7px] h-[7px]",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };
  const dotSize = sizeMap[size];

  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span className={`relative inline-flex items-center justify-center ${dotSize}`}>
        {config.pulse && (
          <span className={`absolute inset-0 rounded-full ${config.bg} opacity-40 animate-ping`} />
        )}
        <span className={`relative ${dotSize} rounded-full ${config.bg} ${config.glow} ring-2 ${config.ring}`} />
      </span>
      {showLabel && (
        <span className="text-[10px] font-medium text-conductor-dim uppercase tracking-wider">
          {config.label}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.stopped;
  const isActive = status === "running" || status === "healthy";
  const isCrashed = status === "crashed" || status === "unhealthy";
  const isPending = status === "starting" || status === "stopping";

  const badgeColor = isActive
    ? "text-emerald-400 bg-emerald-400/[0.06] border-emerald-400/[0.12]"
    : isCrashed
    ? "text-red-400 bg-red-400/[0.06] border-red-400/[0.12]"
    : isPending
    ? "text-amber-400 bg-amber-400/[0.06] border-amber-400/[0.12]"
    : "text-zinc-500 bg-zinc-500/[0.06] border-zinc-500/[0.12]";

  return (
    <span className={`inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeColor}`}>
      <span className="relative flex items-center justify-center w-[6px] h-[6px]">
        {config.pulse && (
          <span className={`absolute inset-0 rounded-full ${config.bg} opacity-40 animate-ping`} />
        )}
        <span className={`w-[6px] h-[6px] rounded-full ${config.bg}`} />
      </span>
      {config.label}
    </span>
  );
}
