import React, { useState } from "react";
import type { DetectedService } from "../types/wails";
import { ScanIcon, CheckIcon, FolderIcon, SpinnerIcon, ZapIcon } from "./Icons";

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (dir: string) => Promise<DetectedService[]>;
  onSelectDir: () => Promise<string>;
  onImport: (services: DetectedService[]) => void;
  onGenerateDemo: () => void;
}

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

export function ScanModal({ open, onClose, onScan, onSelectDir, onImport, onGenerateDemo }: ScanModalProps) {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedService[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanDir, setScanDir] = useState("");
  const [scanned, setScanned] = useState(false);

  if (!open) return null;

  const handleBrowse = async () => {
    const dir = await onSelectDir();
    if (dir) setScanDir(dir);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await onScan(scanDir);
      setDetected(results);
      setSelected(new Set(results.map((d) => d.name)));
      setScanned(true);
    } finally {
      setScanning(false);
    }
  };

  const toggleService = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = detected.filter((d) => selected.has(d.name));
    if (toImport.length > 0) onImport(toImport);
    handleClose();
  };

  const handleClose = () => {
    setDetected([]); setSelected(new Set()); setScanDir(""); setScanned(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-[540px] max-h-[80vh] bg-conductor-surface border border-conductor-border rounded-2xl shadow-modal animate-scale-in flex flex-col overflow-hidden">
        {/* Accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-conductor-accent/25 to-transparent" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-conductor-border">
          <h2 className="text-[15px] font-semibold text-conductor-text">Scan Project</h2>
          <p className="text-[12px] text-conductor-dim mt-1">
            Auto-detect services from package.json, go.mod, Cargo.toml, docker-compose.yml, pyproject.toml
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {!scanned ? (
            <div className="space-y-5">
              {/* Directory picker */}
              <label className="block">
                <span className="text-[10px] font-semibold text-conductor-dim uppercase tracking-[0.1em]">
                  Project Directory
                </span>
                <div className="flex gap-2 mt-1.5">
                  <input
                    value={scanDir}
                    onChange={(e) => setScanDir(e.target.value)}
                    placeholder="Leave empty for current directory"
                    className="flex-1 h-[34px] px-3 rounded-xl bg-conductor-bg border border-conductor-border text-[12px] text-conductor-text placeholder:text-conductor-muted/50 focus:outline-none focus:border-conductor-accent/20 focus:shadow-[0_0_0_3px_rgba(0,191,255,0.04)] font-mono transition-all"
                  />
                  <button
                    onClick={handleBrowse}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-xl text-[11px] font-medium text-conductor-dim border border-conductor-border hover:bg-white/[0.04] hover:text-conductor-text-2 transition-all"
                  >
                    <FolderIcon size={13} />
                    Browse
                  </button>
                </div>
              </label>

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-[38px] rounded-xl bg-gradient-to-b from-conductor-accent/[0.12] to-conductor-accent/[0.06] text-conductor-accent border border-conductor-accent/[0.12] text-[12px] font-semibold hover:from-conductor-accent/[0.18] hover:to-conductor-accent/[0.1] active:scale-[0.98] transition-all shadow-inner-glow disabled:opacity-40 disabled:active:scale-100"
                >
                  {scanning ? (
                    <>
                      <SpinnerIcon size={14} />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanIcon size={14} />
                      Scan Directory
                    </>
                  )}
                </button>

                <div className="flex items-center">
                  <span className="text-[10px] text-conductor-muted/40 px-2">or</span>
                </div>

                <button
                  onClick={() => { onGenerateDemo(); handleClose(); }}
                  className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl text-[12px] font-medium text-conductor-dim border border-conductor-border hover:bg-white/[0.04] hover:text-conductor-text-2 transition-all"
                >
                  <ZapIcon size={12} />
                  Demo
                </button>
              </div>
            </div>
          ) : detected.length === 0 ? (
            /* No results */
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-conductor-surface-2 border border-conductor-border flex items-center justify-center shadow-card">
                <ScanIcon size={22} className="text-conductor-muted" />
              </div>
              <div className="text-center">
                <p className="text-[14px] text-conductor-dim font-medium">No services detected</p>
                <p className="text-[12px] text-conductor-muted mt-1.5">Try a different directory or add services manually</p>
              </div>
              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={() => setScanned(false)}
                  className="h-9 px-4 rounded-xl text-[12px] font-medium text-conductor-accent border border-conductor-accent/[0.12] hover:bg-conductor-accent/[0.06] transition-all"
                >
                  Scan Again
                </button>
                <button
                  onClick={() => { onGenerateDemo(); handleClose(); }}
                  className="h-9 px-4 rounded-xl text-[12px] font-medium text-conductor-dim border border-conductor-border hover:bg-white/[0.04] transition-all"
                >
                  Generate Demo
                </button>
              </div>
            </div>
          ) : (
            /* Results list */
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] text-conductor-dim font-medium">
                  Found {detected.length} service{detected.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() =>
                    setSelected(
                      selected.size === detected.length
                        ? new Set()
                        : new Set(detected.map((d) => d.name))
                    )
                  }
                  className="text-[11px] font-medium text-conductor-accent hover:text-conductor-accent-hover transition-colors"
                >
                  {selected.size === detected.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              {detected.map((d) => {
                const isSelected = selected.has(d.name);
                const hex = colorHex[d.color] || colorHex.cyan;
                return (
                  <div
                    key={d.name}
                    onClick={() => toggleService(d.name)}
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "border-conductor-accent/[0.15] bg-conductor-accent/[0.03] shadow-glow-accent"
                        : "border-conductor-border hover:bg-white/[0.015] hover:border-conductor-border-hover"
                    }`}
                  >
                    {/* Color accent */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-opacity"
                      style={{ backgroundColor: hex, opacity: isSelected ? 0.6 : 0.15 }}
                    />

                    {/* Checkbox */}
                    <div
                      className={`w-[18px] h-[18px] rounded-md border-[1.5px] mt-0.5 flex items-center justify-center shrink-0 transition-all duration-150 ${
                        isSelected
                          ? "border-conductor-accent bg-conductor-accent/20"
                          : "border-conductor-muted"
                      }`}
                    >
                      {isSelected && <CheckIcon size={12} className="text-conductor-accent" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pl-0.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[13px] font-semibold text-conductor-text">{d.name}</span>
                        {d.port > 0 && (
                          <span className="text-[10px] text-conductor-muted font-mono tabular-nums">:{d.port}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-conductor-dim font-mono mt-0.5 truncate">{d.cmd}</div>
                      <div className="text-[10px] text-conductor-muted/60 mt-1">{d.source}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-conductor-border bg-conductor-bg/30">
          <button
            onClick={handleClose}
            className="h-[34px] px-4 rounded-lg text-[12px] font-medium text-conductor-dim hover:text-conductor-text hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </button>
          {scanned && detected.length > 0 && (
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="h-[34px] px-5 rounded-lg bg-gradient-to-b from-conductor-accent/[0.12] to-conductor-accent/[0.06] text-conductor-accent border border-conductor-accent/[0.12] text-[12px] font-semibold hover:from-conductor-accent/[0.18] hover:to-conductor-accent/[0.1] active:scale-[0.97] transition-all shadow-inner-glow disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Import {selected.size} Service{selected.size !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
