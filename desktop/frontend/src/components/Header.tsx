import React from "react";
import { ZapIcon, PlusIcon, ScanIcon, PlayIcon, StopIcon } from "./Icons";

interface HeaderProps {
  projectName: string;
  running: boolean;
  serviceCount: number;
  healthyCount: number;
  onStart: () => void;
  onStop: () => void;
  onAddService: () => void;
  onScanProject: () => void;
}

export function Header({
  projectName,
  running,
  serviceCount,
  healthyCount,
  onStart,
  onStop,
  onAddService,
  onScanProject,
}: HeaderProps) {
  return (
    <div
      className="relative flex items-center justify-between px-5 h-[52px] border-b border-conductor-border bg-conductor-surface/80 backdrop-blur-xl"
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
    >
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-conductor-accent/20 to-transparent" />

      {/* Left: brand + project */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-[26px] h-[26px] rounded-[8px] bg-gradient-to-br from-conductor-accent/25 to-conductor-accent/5 border border-conductor-accent/15 flex items-center justify-center shadow-glow-accent">
            <ZapIcon size={12} className="text-conductor-accent" />
          </div>
          <span className="text-[14px] font-semibold text-conductor-text tracking-[-0.02em]">
            Conductor
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gradient-to-b from-transparent via-conductor-border to-transparent" />

        {/* Project name */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-conductor-text-2 font-medium tracking-[-0.01em]">
            {projectName}
          </span>

          {/* Status pill */}
          {serviceCount > 0 && (
            <div
              className={`inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[10px] font-bold tabular-nums tracking-wide transition-all duration-300 ${
                running
                  ? "text-emerald-400 bg-emerald-400/[0.06] border border-emerald-400/[0.1]"
                  : "text-conductor-dim bg-white/[0.02] border border-conductor-border"
              }`}
            >
              {running && (
                <span className="relative flex items-center justify-center w-[6px] h-[6px]">
                  <span className="absolute w-[6px] h-[6px] rounded-full bg-emerald-400/60 animate-ping" />
                  <span className="relative w-[6px] h-[6px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                </span>
              )}
              {healthyCount}/{serviceCount}
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        <HeaderButton onClick={onScanProject} icon={<ScanIcon size={13} />} label="Scan" />
        <HeaderButton onClick={onAddService} icon={<PlusIcon size={13} />} label="Add" />

        <div className="w-px h-4 bg-conductor-border mx-2" />

        {running ? (
          <button
            onClick={onStop}
            className="inline-flex items-center gap-1.5 h-[30px] px-3.5 rounded-lg bg-red-500/[0.08] text-red-400 border border-red-500/[0.1] text-[11px] font-semibold hover:bg-red-500/[0.14] hover:border-red-500/[0.18] active:scale-[0.97] transition-all duration-150"
          >
            <StopIcon size={12} />
            <span>Stop All</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={serviceCount === 0}
            className="inline-flex items-center gap-1.5 h-[30px] px-3.5 rounded-lg bg-gradient-to-b from-conductor-accent/[0.12] to-conductor-accent/[0.06] text-conductor-accent border border-conductor-accent/[0.12] text-[11px] font-semibold hover:from-conductor-accent/[0.18] hover:to-conductor-accent/[0.1] hover:border-conductor-accent/[0.2] active:scale-[0.97] transition-all duration-150 shadow-inner-glow disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:from-conductor-accent/[0.12] disabled:hover:to-conductor-accent/[0.06] disabled:active:scale-100"
          >
            <PlayIcon size={12} />
            <span>Start All</span>
          </button>
        )}
      </div>
    </div>
  );
}

function HeaderButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg text-[11px] font-medium text-conductor-dim hover:text-conductor-text-2 hover:bg-white/[0.04] active:bg-white/[0.02] active:scale-[0.97] transition-all duration-150"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
