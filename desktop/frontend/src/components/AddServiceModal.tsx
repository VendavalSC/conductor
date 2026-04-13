import React, { useState, useRef, useEffect } from "react";
import type { AddServiceInput } from "../types/wails";

const colorOptions = [
  { name: "cyan",    hex: "#00bfff" },
  { name: "green",   hex: "#00e676" },
  { name: "yellow",  hex: "#ffab00" },
  { name: "magenta", hex: "#ec4899" },
  { name: "blue",    hex: "#3b82f6" },
  { name: "red",     hex: "#ff5252" },
  { name: "orange",  hex: "#ff9800" },
  { name: "purple",  hex: "#a855f7" },
];

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddServiceInput) => void;
  existingNames: string[];
}

export function AddServiceModal({ open, onClose, onSubmit, existingNames }: AddServiceModalProps) {
  const [name, setName] = useState("");
  const [cmd, setCmd] = useState("");
  const [dir, setDir] = useState("");
  const [port, setPort] = useState("");
  const [color, setColor] = useState("cyan");
  const [healthUrl, setHealthUrl] = useState("");
  const [healthCmd, setHealthCmd] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setName(""); setCmd(""); setDir(""); setPort("");
    setColor("cyan"); setHealthUrl(""); setHealthCmd(""); setError("");
  };

  const handleSubmit = () => {
    const trimmedName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmedName) { setError("Name is required"); return; }
    if (!cmd.trim()) { setError("Command is required"); return; }
    if (existingNames.includes(trimmedName)) { setError(`"${trimmedName}" already exists`); return; }

    onSubmit({
      name: trimmedName, cmd: cmd.trim(), dir: dir.trim(),
      port: port ? parseInt(port, 10) || 0 : 0, color,
      env: {}, dependsOn: [],
      healthUrl: healthUrl.trim(), healthCmd: healthCmd.trim(),
    });
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === "Escape") handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-[500px] bg-conductor-surface border border-conductor-border rounded-2xl shadow-modal animate-scale-in overflow-hidden">
        {/* Accent gradient top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-conductor-accent/25 to-transparent" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-[15px] font-semibold text-conductor-text">Add Service</h2>
          <p className="text-[12px] text-conductor-dim mt-1">Configure a new process for your stack</p>
        </div>

        {/* Form */}
        <div className="px-6 pb-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 text-[11px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.08] rounded-xl px-3.5 py-3">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 5V9M8 11V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Name" required>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="my-service"
                className={inputClass}
              />
            </Field>
            <Field label="Port">
              <input
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))}
                placeholder="3000"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Command" required>
            <input
              value={cmd}
              onChange={(e) => { setCmd(e.target.value); setError(""); }}
              placeholder="npm run dev"
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="Working Directory">
            <input
              value={dir}
              onChange={(e) => setDir(e.target.value)}
              placeholder="./frontend (relative to config)"
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="Color">
            <div className="flex gap-2 mt-2">
              {colorOptions.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`w-[28px] h-[28px] rounded-lg transition-all duration-150 ${
                    color === c.name
                      ? "ring-[2px] ring-white/40 ring-offset-[3px] ring-offset-conductor-surface scale-110"
                      : "opacity-35 hover:opacity-60 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Health Check URL">
              <input
                value={healthUrl}
                onChange={(e) => setHealthUrl(e.target.value)}
                placeholder="http://localhost:3000/health"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Health Check Command">
              <input
                value={healthCmd}
                onChange={(e) => setHealthCmd(e.target.value)}
                placeholder="curl -sf ..."
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-conductor-border bg-conductor-bg/30">
          <span className="text-[10px] text-conductor-muted/50">Ctrl+Enter to submit</span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="h-[34px] px-4 rounded-lg text-[12px] font-medium text-conductor-dim hover:text-conductor-text hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="h-[34px] px-5 rounded-lg bg-gradient-to-b from-conductor-accent/[0.12] to-conductor-accent/[0.06] text-conductor-accent border border-conductor-accent/[0.12] text-[12px] font-semibold hover:from-conductor-accent/[0.18] hover:to-conductor-accent/[0.1] active:scale-[0.97] transition-all shadow-inner-glow"
            >
              Add Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full h-[34px] px-3 rounded-xl bg-conductor-bg border border-conductor-border text-[12px] text-conductor-text placeholder:text-conductor-muted/50 focus:outline-none focus:border-conductor-accent/20 focus:shadow-[0_0_0_3px_rgba(0,191,255,0.04)] transition-all duration-150";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-conductor-dim uppercase tracking-[0.1em]">
        {label}{required && <span className="text-conductor-accent/40 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
