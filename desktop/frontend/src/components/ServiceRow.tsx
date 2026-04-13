import React from "react";
import { StatusBadge } from "./StatusDot";
import { PlayIcon, StopIcon, RestartIcon, TrashIcon } from "./Icons";
import type { ServiceInfo } from "../types/wails";

const colorHex: Record<string, string> = {
  cyan: "#00bfff",
  green: "#00e676",
  yellow: "#ffab00",
  magenta: "#ec4899",
  blue: "#3b82f6",
  red: "#ff5252",
  orange: "#ff9800",
  purple: "#a855f7",
};

interface ServiceRowProps {
  service: ServiceInfo;
  selected: boolean;
  onSelect: () => void;
  onRestart: () => void;
  onStop: () => void;
  onStart: () => void;
  onRemove: () => void;
}

export function ServiceRow({
  service,
  selected,
  onSelect,
  onRestart,
  onStop,
  onStart,
  onRemove,
}: ServiceRowProps) {
  const isActive = service.status === "running" || service.status === "healthy" || service.status === "starting";
  const hex = colorHex[service.color] || colorHex.cyan;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-3 mx-2 mb-0.5 px-3 h-[52px] rounded-xl cursor-pointer transition-all duration-150 ${
        selected
          ? "bg-white/[0.04] shadow-card"
          : "hover:bg-white/[0.02]"
      }`}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-[12px] bottom-[12px] w-[3px] rounded-r-full transition-all duration-200"
        style={{
          backgroundColor: hex,
          opacity: isActive ? 0.8 : 0.2,
          boxShadow: isActive ? `0 0 8px ${hex}40` : "none",
        }}
      />

      {/* Service info */}
      <div className="flex-1 min-w-0 pl-1.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-conductor-text tracking-[-0.01em]">
            {service.name}
          </span>
          <StatusBadge status={service.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {service.port > 0 && (
            <span className="text-[10px] text-conductor-muted font-mono tabular-nums">
              :{service.port}
            </span>
          )}
          <span className="text-[10px] text-conductor-muted/60 font-mono truncate max-w-[160px]">
            {service.cmd}
          </span>
        </div>
      </div>

      {/* Uptime */}
      <div className="w-[64px] text-right shrink-0">
        <span className="text-[11px] text-conductor-muted font-mono tabular-nums">
          {service.uptime && service.uptime !== "-" ? service.uptime : ""}
        </span>
      </div>

      {/* Action buttons — appear on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-100">
        {isActive ? (
          <>
            <ActionButton onClick={onRestart} title="Restart" variant="default">
              <RestartIcon size={13} />
            </ActionButton>
            <ActionButton onClick={onStop} title="Stop" variant="danger">
              <StopIcon size={13} />
            </ActionButton>
          </>
        ) : (
          <ActionButton onClick={onStart} title="Start" variant="accent">
            <PlayIcon size={13} />
          </ActionButton>
        )}
        <ActionButton onClick={onRemove} title="Remove" variant="muted-danger">
          <TrashIcon size={12} />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  variant,
  children,
}: {
  onClick: () => void;
  title: string;
  variant: "default" | "accent" | "danger" | "muted-danger";
  children: React.ReactNode;
}) {
  const styles = {
    default: "text-conductor-dim hover:text-conductor-text-2 hover:bg-white/[0.06]",
    accent: "text-conductor-dim hover:text-conductor-accent hover:bg-conductor-accent/[0.08]",
    danger: "text-conductor-dim hover:text-red-400 hover:bg-red-500/[0.08]",
    "muted-danger": "text-conductor-muted hover:text-red-400 hover:bg-red-500/[0.08]",
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={`w-[28px] h-[28px] inline-flex items-center justify-center rounded-lg transition-all duration-100 active:scale-90 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
