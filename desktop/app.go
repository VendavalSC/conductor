package desktop

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/vendi/conductor/internal/config"
	"github.com/vendi/conductor/internal/health"
	"github.com/vendi/conductor/internal/process"
)

// ServiceInfo is the data sent to the frontend for each service.
type ServiceInfo struct {
	Name      string `json:"name"`
	Status    string `json:"status"`
	Port      int    `json:"port"`
	Uptime    string `json:"uptime"`
	UptimeSec int    `json:"uptimeSec"`
	Cmd       string `json:"cmd"`
	Color     string `json:"color"`
	PID       int    `json:"pid"`
}

// LogEntry represents a single log line sent to the frontend.
type LogEntry struct {
	Service   string `json:"service"`
	Text      string `json:"text"`
	IsStderr  bool   `json:"isStderr"`
	Timestamp string `json:"timestamp"`
}

// App is the Wails application backend.
type App struct {
	// wailsCtx is the Wails runtime context — never overwrite this.
	wailsCtx context.Context

	// procCtx/procCancel control the current process lifecycle.
	procCtx    context.Context
	procCancel context.CancelFunc

	cfg     *config.Config
	manager *process.Manager
	checker *health.Checker

	logs    []LogEntry
	logMu   sync.RWMutex
	running bool
	mu      sync.RWMutex // guards running, manager, checker
}

func NewApp() *App {
	return &App{
		logs: make([]LogEntry, 0, 500),
	}
}

// Startup is called by Wails when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.wailsCtx = ctx
}

// Shutdown is called by Wails when the app closes.
func (a *App) Shutdown(ctx context.Context) {
	a.StopAll()
}

// LoadConfig reads the conductor.yaml from the given path (or discovers it).
func (a *App) LoadConfig(path string) (*config.Config, error) {
	cfg, err := config.Load(path)
	if err != nil {
		return nil, err
	}
	a.cfg = cfg
	return cfg, nil
}

// GetServices returns current status of all services.
func (a *App) GetServices() []ServiceInfo {
	if a.cfg == nil {
		return []ServiceInfo{}
	}

	order, _ := a.cfg.StartOrder()
	services := make([]ServiceInfo, 0, len(order))

	a.mu.RLock()
	mgr := a.manager
	isRunning := a.running
	a.mu.RUnlock()

	for _, name := range order {
		svc := a.cfg.Services[name]
		info := ServiceInfo{
			Name:  name,
			Port:  svc.Port,
			Cmd:   svc.Cmd,
			Color: svc.Color,
		}

		if mgr != nil && isRunning {
			if proc, ok := mgr.GetProcess(name); ok {
				info.Status = proc.GetStatus().String()
				info.PID = proc.PID
				uptime := proc.Uptime()
				info.UptimeSec = int(uptime.Seconds())
				info.Uptime = formatUptime(uptime)
			} else {
				info.Status = "stopped"
			}
		} else {
			info.Status = "stopped"
			info.Uptime = "-"
		}

		services = append(services, info)
	}

	return services
}

// StartAll starts all services.
func (a *App) StartAll() error {
	if a.cfg == nil {
		return fmt.Errorf("no config loaded")
	}

	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return fmt.Errorf("services already running")
	}

	ctx, cancel := context.WithCancel(context.Background())
	a.procCtx = ctx
	a.procCancel = cancel
	a.manager = process.NewManager(a.cfg)
	a.running = true
	a.mu.Unlock()

	// Clear previous logs
	a.logMu.Lock()
	a.logs = a.logs[:0]
	a.logMu.Unlock()

	go a.collectLogs()

	if err := a.manager.StartAll(ctx); err != nil {
		a.mu.Lock()
		a.running = false
		a.mu.Unlock()
		cancel()
		return fmt.Errorf("failed to start services: %w", err)
	}

	a.checker = health.NewChecker(a.manager)
	a.checker.Start(ctx)

	return nil
}

// StopAll stops all services.
func (a *App) StopAll() error {
	a.mu.Lock()
	if !a.running || a.manager == nil {
		a.mu.Unlock()
		return nil
	}

	mgr := a.manager
	chk := a.checker
	cancel := a.procCancel

	// Set state to stopped BEFORE actually stopping, so the UI updates immediately.
	a.running = false
	a.manager = nil
	a.checker = nil
	a.procCancel = nil
	a.mu.Unlock()

	if chk != nil {
		chk.Stop()
	}

	var stopErr error
	if mgr != nil {
		stopErr = mgr.StopAll()
	}

	if cancel != nil {
		cancel()
	}

	return stopErr
}

// RestartService restarts a single service.
func (a *App) RestartService(name string) error {
	a.mu.RLock()
	mgr := a.manager
	a.mu.RUnlock()

	if mgr == nil {
		return fmt.Errorf("no services running")
	}
	return mgr.RestartService(a.procCtx, name)
}

// StopService stops a single service.
func (a *App) StopService(name string) error {
	a.mu.RLock()
	mgr := a.manager
	a.mu.RUnlock()

	if mgr == nil {
		return fmt.Errorf("no services running")
	}
	return mgr.StopService(name)
}

// StartService starts a single service.
func (a *App) StartService(name string) error {
	a.mu.RLock()
	mgr := a.manager
	a.mu.RUnlock()

	if mgr == nil {
		return fmt.Errorf("no services running")
	}
	return mgr.StartService(a.procCtx, name)
}

// GetLogs returns the most recent log entries.
func (a *App) GetLogs(limit int) []LogEntry {
	a.logMu.RLock()
	defer a.logMu.RUnlock()

	total := len(a.logs)
	if limit <= 0 || limit > total {
		limit = total
	}

	start := total - limit
	result := make([]LogEntry, limit)
	copy(result, a.logs[start:])
	return result
}

// GetLogsForService returns logs filtered by service name.
func (a *App) GetLogsForService(service string, limit int) []LogEntry {
	a.logMu.RLock()
	defer a.logMu.RUnlock()

	var filtered []LogEntry
	for i := len(a.logs) - 1; i >= 0 && len(filtered) < limit; i-- {
		if a.logs[i].Service == service {
			filtered = append(filtered, a.logs[i])
		}
	}

	// Reverse to chronological order
	for i, j := 0, len(filtered)-1; i < j; i, j = i+1, j-1 {
		filtered[i], filtered[j] = filtered[j], filtered[i]
	}

	return filtered
}

// IsRunning returns whether services are currently running.
func (a *App) IsRunning() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.running
}

// GetProjectName returns the project name from config.
func (a *App) GetProjectName() string {
	if a.cfg == nil {
		return ""
	}
	return a.cfg.Name
}

func (a *App) collectLogs() {
	a.mu.RLock()
	mgr := a.manager
	a.mu.RUnlock()

	if mgr == nil {
		return
	}

	for line := range mgr.LogCh {
		entry := LogEntry{
			Service:   line.Service,
			Text:      line.Text,
			IsStderr:  line.IsStderr,
			Timestamp: line.Timestamp.Format("15:04:05"),
		}

		a.logMu.Lock()
		a.logs = append(a.logs, entry)
		if len(a.logs) > 5000 {
			a.logs = a.logs[len(a.logs)-5000:]
		}
		a.logMu.Unlock()
	}
}

func mustGetwd() string {
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	return dir
}

func formatUptime(d time.Duration) string {
	if d == 0 {
		return "-"
	}
	d = d.Round(time.Second)
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	s := int(d.Seconds()) % 60

	if h > 0 {
		return fmt.Sprintf("%dh %dm %ds", h, m, s)
	}
	if m > 0 {
		return fmt.Sprintf("%dm %ds", m, s)
	}
	return fmt.Sprintf("%ds", s)
}
