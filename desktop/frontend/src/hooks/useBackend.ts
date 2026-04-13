import { useState, useEffect, useCallback, useRef } from "react";
import type { ServiceInfo, LogEntry, AddServiceInput, DetectedService } from "../types/wails";

// In dev mode (no Wails runtime), use mock data.
const isDev = !window.go;

const mockServices: ServiceInfo[] = [
  { name: "web", status: "healthy", port: 3000, uptime: "12m 34s", uptimeSec: 754, cmd: "npm run dev", color: "cyan", pid: 12345, restart: "on-failure", restartCount: 0 },
  { name: "api", status: "running", port: 8080, uptime: "12m 30s", uptimeSec: 750, cmd: "go run ./cmd/server", color: "green", pid: 12346, restart: "always", restartCount: 2 },
  { name: "db", status: "healthy", port: 5432, uptime: "12m 35s", uptimeSec: 755, cmd: "postgres", color: "yellow", pid: 12347, restart: "never", restartCount: 0 },
  { name: "redis", status: "healthy", port: 6379, uptime: "12m 35s", uptimeSec: 755, cmd: "redis-server", color: "red", pid: 12348, restart: "never", restartCount: 0 },
  { name: "worker", status: "crashed", port: 0, uptime: "-", uptimeSec: 0, cmd: "celery worker", color: "magenta", pid: 0, restart: "on-failure", restartCount: 3 },
];

const mockLogs: LogEntry[] = [
  { service: "web", text: "compiled successfully in 1.2s", isStderr: false, timestamp: "14:23:01" },
  { service: "api", text: "listening on :8080", isStderr: false, timestamp: "14:23:02" },
  { service: "db", text: "ready to accept connections on port 5432", isStderr: false, timestamp: "14:23:00" },
  { service: "redis", text: "Ready to accept connections tcp port 6379", isStderr: false, timestamp: "14:23:00" },
  { service: "web", text: "GET /api/health 200 12ms", isStderr: false, timestamp: "14:23:05" },
  { service: "api", text: "connected to database", isStderr: false, timestamp: "14:23:03" },
  { service: "worker", text: "FATAL: connection refused to redis:6379", isStderr: true, timestamp: "14:23:04" },
  { service: "web", text: "HMR update: src/App.tsx", isStderr: false, timestamp: "14:23:10" },
  { service: "api", text: "POST /api/users 201 45ms", isStderr: false, timestamp: "14:23:12" },
  { service: "api", text: "GET /api/users/1 200 8ms", isStderr: false, timestamp: "14:23:13" },
];

const mockDetected: DetectedService[] = [
  { name: "frontend", cmd: "npm run dev", dir: "/home/user/project/frontend", port: 3000, color: "cyan", source: "frontend/package.json scripts.dev", dependsOn: [] },
  { name: "backend", cmd: "go run ./cmd/server/", dir: "/home/user/project", port: 8080, color: "green", source: "go.mod cmd/server", dependsOn: [] },
];

const mockConfigRaw = `# conductor.yaml — managed by Conductor

name: my-project
services:
  web:
    cmd: npm run dev
    port: 3000
    color: cyan
    restart: on-failure
  api:
    cmd: go run ./cmd/server
    port: 8080
    color: green
    restart: always
    depends_on:
      - db
  db:
    cmd: postgres
    port: 5432
    color: yellow
`;

export function useBackend() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [projectName, setProjectName] = useState("my-project");
  const [hasConfig, setHasConfig] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (isDev) {
      setServices(mockServices);
      setLogs(mockLogs);
      setRunning(true);
      setHasConfig(true);
      return;
    }
    try {
      const [svc, logEntries, isRunning, name, hasCfg] = await Promise.all([
        window.go.desktop.App.GetServices(),
        window.go.desktop.App.GetLogs(200),
        window.go.desktop.App.IsRunning(),
        window.go.desktop.App.GetProjectName(),
        window.go.desktop.App.HasConfig(),
      ]);
      setServices(svc ?? []);
      setLogs(logEntries ?? []);
      setRunning(isRunning);
      setProjectName(name || "conductor");
      setHasConfig(hasCfg);
    } catch {
      // Backend may be shutting down — keep polling, next tick will recover.
    }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 800);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const startAll = useCallback(async () => {
    if (isDev) { setRunning(true); return; }
    try { await window.go.desktop.App.StartAll(); } catch { /* backend error */ }
    refresh();
  }, [refresh]);

  const stopAll = useCallback(async () => {
    if (isDev) { setRunning(false); return; }
    try { await window.go.desktop.App.StopAll(); } catch { /* backend error */ }
    refresh();
  }, [refresh]);

  const restartService = useCallback(async (name: string) => {
    if (isDev) return;
    try { await window.go.desktop.App.RestartService(name); } catch { /* backend error */ }
    refresh();
  }, [refresh]);

  const stopService = useCallback(async (name: string) => {
    if (isDev) return;
    try { await window.go.desktop.App.StopService(name); } catch { /* backend error */ }
    refresh();
  }, [refresh]);

  const startService = useCallback(async (name: string) => {
    if (isDev) return;
    try { await window.go.desktop.App.StartService(name); } catch { /* backend error */ }
    refresh();
  }, [refresh]);

  const addService = useCallback(async (input: AddServiceInput) => {
    if (isDev) {
      setServices((prev) => [...prev, {
        name: input.name, status: "stopped", port: input.port,
        uptime: "-", uptimeSec: 0, cmd: input.cmd, color: input.color || "cyan", pid: 0,
        restart: input.restart || "never", restartCount: 0,
      }]);
      return;
    }
    await window.go.desktop.App.AddService(input);
    refresh();
  }, [refresh]);

  const removeService = useCallback(async (name: string) => {
    if (isDev) {
      setServices((prev) => prev.filter((s) => s.name !== name));
      return;
    }
    await window.go.desktop.App.RemoveService(name);
    refresh();
  }, [refresh]);

  const updateService = useCallback(async (name: string, input: AddServiceInput) => {
    if (isDev) return;
    await window.go.desktop.App.UpdateService(name, input);
    refresh();
  }, [refresh]);

  const scanDirectory = useCallback(async (dir: string): Promise<DetectedService[]> => {
    if (isDev) return mockDetected;
    return await window.go.desktop.App.ScanDirectory(dir) ?? [];
  }, []);

  const selectDirectory = useCallback(async (): Promise<string> => {
    if (isDev) return "/home/user/project";
    return await window.go.desktop.App.SelectDirectory();
  }, []);

  const importDetected = useCallback(async (detected: DetectedService[]) => {
    if (isDev) {
      for (const d of detected) {
        setServices((prev) => [...prev, {
          name: d.name, status: "stopped", port: d.port,
          uptime: "-", uptimeSec: 0, cmd: d.cmd, color: d.color, pid: 0,
          restart: "never", restartCount: 0,
        }]);
      }
      return;
    }
    await window.go.desktop.App.ImportDetected(detected);
    refresh();
  }, [refresh]);

  const generateDemo = useCallback(async () => {
    if (isDev) return;
    await window.go.desktop.App.GenerateDemo("");
    await window.go.desktop.App.LoadConfig("");
    refresh();
  }, [refresh]);

  const loadConfig = useCallback(async (path: string) => {
    if (isDev) return;
    await window.go.desktop.App.LoadConfig(path);
    refresh();
  }, [refresh]);

  const exportLogs = useCallback(async () => {
    if (isDev) return;
    try { await window.go.desktop.App.ExportLogsToFile(); } catch { /* dialog cancelled */ }
  }, []);

  const getConfigRaw = useCallback(async (): Promise<string> => {
    if (isDev) return mockConfigRaw;
    try { return await window.go.desktop.App.GetConfigRaw(); } catch { return ""; }
  }, []);

  const saveConfigRaw = useCallback(async (content: string): Promise<void> => {
    if (isDev) return;
    await window.go.desktop.App.SaveConfigRaw(content);
    refresh();
  }, [refresh]);

  const reloadConfigIfChanged = useCallback(async (): Promise<boolean> => {
    if (isDev) return false;
    try {
      const changed = await window.go.desktop.App.ReloadConfigIfChanged();
      if (changed) refresh();
      return changed;
    } catch {
      return false;
    }
  }, [refresh]);

  return {
    services,
    logs,
    running,
    projectName,
    hasConfig,
    startAll,
    stopAll,
    restartService,
    stopService,
    startService,
    addService,
    removeService,
    updateService,
    scanDirectory,
    selectDirectory,
    importDetected,
    generateDemo,
    loadConfig,
    refresh,
    exportLogs,
    getConfigRaw,
    saveConfigRaw,
    reloadConfigIfChanged,
  };
}
