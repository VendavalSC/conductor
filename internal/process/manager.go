package process

import (
	"context"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/vendi/conductor/internal/config"
)

type Manager struct {
	Config    *config.Config
	Processes map[string]*Process
	LogCh     chan LogLine

	crashCh       chan string
	restartCounts map[string]int
	restartMu     sync.RWMutex

	mu     sync.RWMutex
	ctx    context.Context
	closed bool
}

func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		Config:        cfg,
		Processes:     make(map[string]*Process),
		LogCh:         make(chan LogLine, 1024),
		crashCh:       make(chan string, 32),
		restartCounts: make(map[string]int),
	}
}

// sendLog safely writes to LogCh, ignoring sends after close.
func (m *Manager) sendLog(line LogLine) {
	defer func() { recover() }()
	m.LogCh <- line
}

func (m *Manager) StartAll(ctx context.Context) error {
	m.ctx = ctx

	order, err := m.Config.StartOrder()
	if err != nil {
		return fmt.Errorf("failed to resolve start order: %w", err)
	}

	// Check for port conflicts before starting.
	for _, name := range order {
		svc := m.Config.Services[name]
		if svc.Port > 0 && !checkPortFree(svc.Port) {
			m.sendLog(LogLine{
				Service:   name,
				Text:      fmt.Sprintf("warning: port %d already in use — service may fail to bind", svc.Port),
				IsStderr:  true,
				Timestamp: time.Now(),
			})
		}
	}

	// Reset restart counts.
	m.restartMu.Lock()
	m.restartCounts = make(map[string]int)
	m.restartMu.Unlock()

	// Start crash watcher.
	go m.watchCrashes(ctx)

	for _, name := range order {
		svc := m.Config.Services[name]
		proc := New(name, svc, m.LogCh, m.crashCh)

		m.mu.Lock()
		m.Processes[name] = proc
		m.mu.Unlock()

		if err := proc.Start(ctx); err != nil {
			return fmt.Errorf("failed to start %q: %w", name, err)
		}

		m.sendLog(LogLine{
			Service:   name,
			Text:      fmt.Sprintf("started (pid %d)", proc.PID),
			Timestamp: time.Now(),
		})

		if svc.Health != nil {
			waitForReady(ctx, name, svc)
		} else {
			proc.SetStatus(StatusRunning)
			time.Sleep(200 * time.Millisecond)
		}
	}

	return nil
}

// watchCrashes listens for crashed processes and restarts them according to policy.
func (m *Manager) watchCrashes(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case name, ok := <-m.crashCh:
			if !ok {
				return
			}
			svc, exists := m.Config.Services[name]
			if !exists {
				continue
			}

			policy := svc.Restart
			if policy != "always" && policy != "on-failure" {
				continue
			}

			m.restartMu.Lock()
			count := m.restartCounts[name]
			if svc.MaxRestarts > 0 && count >= svc.MaxRestarts {
				m.restartMu.Unlock()
				m.sendLog(LogLine{
					Service:   name,
					Text:      fmt.Sprintf("max restarts (%d) reached — giving up", svc.MaxRestarts),
					IsStderr:  true,
					Timestamp: time.Now(),
				})
				continue
			}
			m.restartCounts[name] = count + 1
			m.restartMu.Unlock()

			// Exponential backoff: 1s, 2s, 4s, … capped at 30s.
			delay := time.Duration(1<<uint(count)) * time.Second
			if delay > 30*time.Second {
				delay = 30 * time.Second
			}

			m.sendLog(LogLine{
				Service:   name,
				Text:      fmt.Sprintf("crashed — restarting in %v (attempt %d)", delay, count+1),
				IsStderr:  true,
				Timestamp: time.Now(),
			})

			go func(svcName string, d time.Duration) {
				select {
				case <-ctx.Done():
					return
				case <-time.After(d):
				}
				if err := m.StartService(ctx, svcName); err != nil {
					m.sendLog(LogLine{
						Service:   svcName,
						Text:      fmt.Sprintf("restart failed: %v", err),
						IsStderr:  true,
						Timestamp: time.Now(),
					})
				}
			}(name, delay)
		}
	}
}

func waitForReady(ctx context.Context, name string, svc *config.Service) {
	if svc.Health == nil {
		return
	}

	deadline := time.After(30 * time.Second)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-deadline:
			return
		case <-ticker.C:
			if checkHealth(svc.Health) {
				return
			}
		}
	}
}

func (m *Manager) StopAll() error {
	order, err := m.Config.StopOrder()
	if err != nil {
		return err
	}

	var firstErr error
	for _, name := range order {
		m.mu.RLock()
		proc, ok := m.Processes[name]
		m.mu.RUnlock()

		if !ok {
			continue
		}

		m.sendLog(LogLine{
			Service:   name,
			Text:      "stopping...",
			Timestamp: time.Now(),
		})

		if err := proc.Stop(); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("failed to stop %q: %w", name, err)
		}

		m.sendLog(LogLine{
			Service:   name,
			Text:      "stopped",
			Timestamp: time.Now(),
		})
	}

	// Safe close: only close once, recover from any concurrent send.
	func() {
		defer func() { recover() }()
		close(m.LogCh)
	}()

	return firstErr
}

func (m *Manager) RestartService(ctx context.Context, name string) error {
	m.mu.RLock()
	proc, ok := m.Processes[name]
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("service %q not found", name)
	}

	m.sendLog(LogLine{
		Service:   name,
		Text:      "restarting...",
		Timestamp: time.Now(),
	})

	// Reset restart count on manual restart.
	m.restartMu.Lock()
	m.restartCounts[name] = 0
	m.restartMu.Unlock()

	return proc.Restart(ctx)
}

func (m *Manager) StopService(name string) error {
	m.mu.RLock()
	proc, ok := m.Processes[name]
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("service %q not found", name)
	}

	return proc.Stop()
}

func (m *Manager) StartService(ctx context.Context, name string) error {
	m.mu.RLock()
	proc, ok := m.Processes[name]
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("service %q not found", name)
	}

	return proc.Start(ctx)
}

func (m *Manager) GetProcess(name string) (*Process, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.Processes[name]
	return p, ok
}

func (m *Manager) GetRestartCount(name string) int {
	m.restartMu.RLock()
	defer m.restartMu.RUnlock()
	return m.restartCounts[name]
}

func (m *Manager) ServiceNames() []string {
	order, _ := m.Config.StartOrder()
	return order
}

// checkPortFree returns false if the port is already bound by another process.
func checkPortFree(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return false
	}
	_ = ln.Close()
	return true
}
