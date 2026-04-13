import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { ServiceRow } from "./components/ServiceRow";
import { LogPanel } from "./components/LogPanel";
import { AddServiceModal } from "./components/AddServiceModal";
import { ScanModal } from "./components/ScanModal";
import { useBackend } from "./hooks/useBackend";
import { PlusIcon, ScanIcon, LayersIcon, TerminalIcon, HeartPulseIcon, SettingsIcon } from "./components/Icons";

type RightTab = "logs" | "config";

export function App() {
  const {
    services, logs, running, projectName,
    startAll, stopAll, restartService, stopService, startService,
    addService, removeService, scanDirectory, selectDirectory, importDetected, generateDemo,
    exportLogs, getConfigRaw, saveConfigRaw, reloadConfigIfChanged,
  } = useBackend();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("logs");
  const [configRaw, setConfigRaw] = useState("");
  const [configDirty, setConfigDirty] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState("");

  const healthyCount = useMemo(
    () => services.filter((s) => s.status === "healthy" || s.status === "running").length,
    [services]
  );

  const crashedCount = useMemo(
    () => services.filter((s) => s.status === "crashed" || s.status === "unhealthy").length,
    [services]
  );

  const serviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const svc of services) map[svc.name] = svc.color;
    return map;
  }, [services]);

  // Load raw config when switching to config tab.
  const handleTabChange = useCallback(async (tab: RightTab) => {
    setRightTab(tab);
    if (tab === "config") {
      const raw = await getConfigRaw();
      setConfigRaw(raw);
      setConfigDirty(false);
      setConfigError("");
    }
  }, [getConfigRaw]);

  // Hot-reload: poll for config changes when not running.
  useEffect(() => {
    if (running) return;
    const interval = setInterval(async () => {
      const changed = await reloadConfigIfChanged();
      if (changed && rightTab === "config") {
        const raw = await getConfigRaw();
        setConfigRaw(raw);
        setConfigDirty(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [running, rightTab, reloadConfigIfChanged, getConfigRaw]);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigError("");
    try {
      await saveConfigRaw(configRaw);
      setConfigDirty(false);
    } catch (e: unknown) {
      setConfigError(e instanceof Error ? e.message : String(e));
    } finally {
      setConfigSaving(false);
    }
  };

  const doRemove = () => {
    if (!confirmRemove) return;
    removeService(confirmRemove);
    if (selectedService === confirmRemove) setSelectedService(null);
    if (logFilter === confirmRemove) setLogFilter(null);
    setConfirmRemove(null);
  };

  const filteredLogs = useMemo(
    () => (logFilter ? logs.filter((l) => l.service === logFilter) : logs),
    [logs, logFilter]
  );

  return (
    <div className="flex flex-col h-screen bg-conductor-bg select-none noise-overlay">
      <Header
        projectName={projectName}
        running={running}
        serviceCount={services.length}
        healthyCount={healthyCount}
        onStart={startAll}
        onStop={stopAll}
        onAddService={() => setShowAddModal(true)}
        onScanProject={() => setShowScanModal(true)}
      />

      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Left sidebar: services */}
        <div className="w-[420px] border-r border-conductor-border flex flex-col bg-conductor-bg">
          {/* Sidebar header with stats */}
          <div className="flex items-center justify-between px-4 h-[38px] border-b border-conductor-border-subtle">
            <div className="flex items-center gap-2">
              <LayersIcon size={12} className="text-conductor-muted" />
              <span className="text-[10px] font-semibold text-conductor-muted uppercase tracking-[0.1em]">
                Services
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {running && healthyCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400/60 tabular-nums">
                  <HeartPulseIcon size={10} className="text-emerald-400/50" />
                  {healthyCount}
                </span>
              )}
              {running && crashedCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-red-400/60 tabular-nums">
                  {crashedCount} failed
                </span>
              )}
            </div>
          </div>

          {/* Service list */}
          <div className="flex-1 overflow-y-auto py-1.5">
            {services.length === 0 ? (
              <EmptyState
                onScan={() => setShowScanModal(true)}
                onAdd={() => setShowAddModal(true)}
              />
            ) : (
              services.map((svc) => (
                <ServiceRow
                  key={svc.name}
                  service={svc}
                  selected={selectedService === svc.name}
                  onSelect={() => {
                    setSelectedService(svc.name === selectedService ? null : svc.name);
                    setLogFilter(svc.name === logFilter ? null : svc.name);
                  }}
                  onRestart={() => restartService(svc.name)}
                  onStop={() => stopService(svc.name)}
                  onStart={() => startService(svc.name)}
                  onRemove={() => setConfirmRemove(svc.name)}
                />
              ))
            )}
          </div>

          {/* Log filter tabs */}
          {services.length > 0 && (
            <div className="border-t border-conductor-border-subtle">
              <div className="flex items-center gap-0.5 px-2.5 py-1.5 overflow-x-auto">
                <FilterTab
                  label="All"
                  active={logFilter === null}
                  onClick={() => setLogFilter(null)}
                />
                {services.map((svc) => (
                  <FilterTab
                    key={svc.name}
                    label={svc.name}
                    color={svc.color}
                    active={logFilter === svc.name}
                    onClick={() => setLogFilter(svc.name === logFilter ? null : svc.name)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-conductor-bg">
          {/* Right panel header with tabs */}
          <div className="flex items-center justify-between h-[38px] px-4 border-b border-conductor-border-subtle">
            <div className="flex items-center gap-0.5">
              <RightTabBtn
                label="Output"
                icon={<TerminalIcon size={11} />}
                active={rightTab === "logs"}
                onClick={() => handleTabChange("logs")}
              />
              <RightTabBtn
                label="Config"
                icon={<SettingsIcon size={11} />}
                active={rightTab === "config"}
                onClick={() => handleTabChange("config")}
              />
            </div>
            <div className="flex items-center gap-3">
              {rightTab === "logs" && (
                <>
                  <span className="text-[10px] text-conductor-muted/40 tabular-nums font-mono">
                    {filteredLogs.length} line{filteredLogs.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={exportLogs}
                    className="text-[10px] text-conductor-muted/40 hover:text-conductor-muted transition-colors font-mono"
                    title="Export logs to file"
                  >
                    export
                  </button>
                  <span className="text-[9px] text-conductor-muted/30 font-mono">
                    Ctrl+F search
                  </span>
                </>
              )}
              {rightTab === "config" && (
                <div className="flex items-center gap-2">
                  {configError && (
                    <span className="text-[10px] text-red-400/70 max-w-[200px] truncate">{configError}</span>
                  )}
                  {configDirty && (
                    <button
                      onClick={handleSaveConfig}
                      disabled={configSaving}
                      className="h-[22px] px-2.5 rounded-md bg-conductor-accent/[0.1] text-conductor-accent border border-conductor-accent/[0.15] text-[10px] font-semibold hover:bg-conductor-accent/[0.18] disabled:opacity-40 transition-all"
                    >
                      {configSaving ? "Saving…" : "Save"}
                    </button>
                  )}
                  {!configDirty && !configError && (
                    <span className="text-[10px] text-conductor-muted/30 font-mono">
                      {running ? "stop services to edit" : "Ctrl+S to save"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {rightTab === "logs" ? (
            <LogPanel logs={logs} filter={logFilter} serviceColorMap={serviceColorMap} />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                value={configRaw}
                onChange={(e) => {
                  setConfigRaw(e.target.value);
                  setConfigDirty(true);
                  setConfigError("");
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    if (configDirty && !running) handleSaveConfig();
                  }
                }}
                readOnly={running}
                spellCheck={false}
                className="flex-1 resize-none bg-transparent font-mono text-[11px] text-conductor-text/80 p-4 outline-none leading-relaxed placeholder:text-conductor-muted/30"
                placeholder="# conductor.yaml will appear here once loaded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="relative flex items-center justify-between h-[26px] px-4 border-t border-conductor-border bg-conductor-surface/40">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-conductor-muted/40 font-mono tracking-wide">
            conductor v1.1.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-conductor-muted/40 tabular-nums">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </span>
          {running && (
            <>
              <span className="w-px h-2.5 bg-conductor-border" />
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/40">
                <span className="relative flex items-center justify-center w-[5px] h-[5px]">
                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400/60 animate-breathe" />
                </span>
                active
              </span>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddServiceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addService}
        existingNames={services.map((s) => s.name)}
      />
      <ScanModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScan={scanDirectory}
        onSelectDir={selectDirectory}
        onImport={importDetected}
        onGenerateDemo={generateDemo}
      />

      {/* Confirm remove dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setConfirmRemove(null)} />
          <div className="relative w-[380px] bg-conductor-surface border border-conductor-border rounded-2xl shadow-modal animate-scale-in overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

            <div className="p-6">
              <h3 className="text-[15px] font-semibold text-conductor-text">Remove Service</h3>
              <p className="text-[12px] text-conductor-dim leading-relaxed mt-2">
                Remove <span className="text-red-400 font-semibold">{confirmRemove}</span> from
                your configuration? This will update conductor.yaml.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => setConfirmRemove(null)}
                className="h-[34px] px-4 rounded-lg text-[12px] font-medium text-conductor-dim hover:text-conductor-text hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doRemove}
                className="h-[34px] px-5 rounded-lg bg-red-500/[0.1] text-red-400 border border-red-500/[0.12] text-[12px] font-semibold hover:bg-red-500/[0.18] active:scale-[0.97] transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Empty state for the service list */
function EmptyState({ onScan, onAdd }: { onScan: () => void; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-conductor-surface-3 to-conductor-surface-2 border border-conductor-border flex items-center justify-center shadow-card">
        <LayersIcon size={24} className="text-conductor-muted" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium text-conductor-dim">No services configured</p>
        <p className="text-[12px] text-conductor-muted mt-1.5 leading-relaxed max-w-[240px]">
          Scan your project to auto-detect services, or add them manually
        </p>
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onScan}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-b from-conductor-accent/[0.12] to-conductor-accent/[0.06] text-conductor-accent border border-conductor-accent/[0.12] text-[12px] font-semibold hover:from-conductor-accent/[0.18] hover:to-conductor-accent/[0.1] active:scale-[0.97] transition-all shadow-inner-glow"
        >
          <ScanIcon size={13} />
          Scan Project
        </button>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/[0.03] text-conductor-dim border border-conductor-border text-[12px] font-medium hover:bg-white/[0.05] hover:text-conductor-text-2 active:scale-[0.97] transition-all"
        >
          <PlusIcon size={13} />
          Add
        </button>
      </div>
    </div>
  );
}

/* Filter tab for log service selection */
const filterColorHex: Record<string, string> = {
  cyan: "#00bfff",
  green: "#00e676",
  yellow: "#ffab00",
  magenta: "#ec4899",
  blue: "#3b82f6",
  red: "#ff5252",
  orange: "#ff9800",
  purple: "#a855f7",
};

function FilterTab({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-md text-[10px] font-semibold transition-all duration-100 ${
        active
          ? "text-conductor-accent bg-conductor-accent/[0.08]"
          : "text-conductor-muted hover:text-conductor-dim hover:bg-white/[0.03]"
      }`}
    >
      {color && (
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ backgroundColor: filterColorHex[color] || "#727289" }}
        />
      )}
      {label}
    </button>
  );
}

function RightTabBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md text-[10px] font-semibold transition-all duration-100 ${
        active
          ? "text-conductor-accent bg-conductor-accent/[0.08]"
          : "text-conductor-muted hover:text-conductor-dim hover:bg-white/[0.03]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
