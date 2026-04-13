package process

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/vendi/conductor/internal/config"
)

type Manager struct {
	Config    *config.Config
	Processes map[string]*Process
	LogCh     chan LogLine

	mu     sync.RWMutex
	ctx    context.Context
	closed bool
}

func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		Config:    cfg,
		Processes: make(map[string]*Process),
		LogCh:     make(chan LogLine, 1024),
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

	for _, name := range order {
		svc := m.Config.Services[name]
		proc := New(name, svc, m.LogCh)

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

func (m *Manager) ServiceNames() []string {
	order, _ := m.Config.StartOrder()
	return order
}
