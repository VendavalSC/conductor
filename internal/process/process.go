package process

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/vendi/conductor/internal/config"
)

type Status int

const (
	StatusStopped Status = iota
	StatusStarting
	StatusRunning
	StatusHealthy
	StatusUnhealthy
	StatusStopping
	StatusCrashed
)

func (s Status) String() string {
	switch s {
	case StatusStopped:
		return "stopped"
	case StatusStarting:
		return "starting"
	case StatusRunning:
		return "running"
	case StatusHealthy:
		return "healthy"
	case StatusUnhealthy:
		return "unhealthy"
	case StatusStopping:
		return "stopping"
	case StatusCrashed:
		return "crashed"
	default:
		return "unknown"
	}
}

type LogLine struct {
	Service   string
	Text      string
	IsStderr  bool
	Timestamp time.Time
}

type Process struct {
	Name      string
	Config    *config.Service
	Status    Status
	StartedAt time.Time
	PID       int
	ExitCode  int

	cmd    *exec.Cmd
	cancel context.CancelFunc
	done   chan struct{} // closed when the process exits
	mu     sync.RWMutex
	logCh  chan<- LogLine
}

func New(name string, cfg *config.Service, logCh chan<- LogLine) *Process {
	return &Process{
		Name:   name,
		Config: cfg,
		Status: StatusStopped,
		logCh:  logCh,
	}
}

func (p *Process) Start(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.Status == StatusRunning || p.Status == StatusHealthy || p.Status == StatusStarting {
		return fmt.Errorf("service %q is already running", p.Name)
	}

	procCtx, cancel := context.WithCancel(ctx)
	p.cancel = cancel

	cmd := p.Config.Cmd
	if cmd == "" {
		cancel()
		return fmt.Errorf("service %q has empty command", p.Name)
	}

	// Use shell to handle pipes, quotes, and complex commands.
	p.cmd = exec.CommandContext(procCtx, "sh", "-c", cmd)

	if p.Config.Dir != "" {
		p.cmd.Dir = p.Config.Dir
	}

	p.cmd.Env = os.Environ()
	for k, v := range p.Config.Env {
		p.cmd.Env = append(p.cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	p.cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdout, err := p.cmd.StdoutPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("failed to create stdout pipe for %q: %w", p.Name, err)
	}

	stderr, err := p.cmd.StderrPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("failed to create stderr pipe for %q: %w", p.Name, err)
	}

	if err := p.cmd.Start(); err != nil {
		cancel()
		p.Status = StatusCrashed
		return fmt.Errorf("failed to start %q: %w", p.Name, err)
	}

	p.PID = p.cmd.Process.Pid
	p.Status = StatusStarting
	p.StartedAt = time.Now()
	p.done = make(chan struct{})

	go p.streamLogs(stdout, false)
	go p.streamLogs(stderr, true)

	go p.waitForExit()

	return nil
}

func (p *Process) Stop() error {
	p.mu.Lock()

	if p.Status == StatusStopped || p.Status == StatusCrashed {
		p.mu.Unlock()
		return nil
	}

	p.Status = StatusStopping
	done := p.done
	p.mu.Unlock()

	if p.cmd != nil && p.cmd.Process != nil {
		pgid, err := syscall.Getpgid(p.cmd.Process.Pid)
		if err == nil {
			_ = syscall.Kill(-pgid, syscall.SIGTERM)
		}

		// Wait for waitForExit to observe the exit (or timeout and SIGKILL).
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			if pgid, err := syscall.Getpgid(p.cmd.Process.Pid); err == nil {
				_ = syscall.Kill(-pgid, syscall.SIGKILL)
			}
			<-done
		}
	}

	if p.cancel != nil {
		p.cancel()
	}

	p.mu.Lock()
	p.Status = StatusStopped
	p.mu.Unlock()
	return nil
}

func (p *Process) Restart(ctx context.Context) error {
	if err := p.Stop(); err != nil {
		return err
	}
	return p.Start(ctx)
}

func (p *Process) GetStatus() Status {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.Status
}

func (p *Process) SetStatus(s Status) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Status = s
}

func (p *Process) Uptime() time.Duration {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.StartedAt.IsZero() || p.Status == StatusStopped || p.Status == StatusCrashed {
		return 0
	}
	return time.Since(p.StartedAt)
}

func (p *Process) streamLogs(reader io.Reader, isStderr bool) {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		p.sendLog(LogLine{
			Service:   p.Name,
			Text:      line,
			IsStderr:  isStderr,
			Timestamp: time.Now(),
		})
	}
}

// sendLog safely writes to logCh, ignoring sends after the channel is closed.
func (p *Process) sendLog(line LogLine) {
	defer func() { recover() }()
	p.logCh <- line
}

func (p *Process) waitForExit() {
	if p.cmd == nil {
		return
	}

	err := p.cmd.Wait()
	close(p.done)

	p.mu.Lock()
	defer p.mu.Unlock()

	// If Stop() already set us to stopping/stopped, don't override.
	if p.Status == StatusStopping || p.Status == StatusStopped {
		return
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			p.ExitCode = exitErr.ExitCode()
		}
		p.Status = StatusCrashed
		p.sendLog(LogLine{
			Service:   p.Name,
			Text:      fmt.Sprintf("process exited with error: %v", err),
			IsStderr:  true,
			Timestamp: time.Now(),
		})
	} else {
		p.Status = StatusStopped
		p.sendLog(LogLine{
			Service:   p.Name,
			Text:      "process exited cleanly",
			Timestamp: time.Now(),
		})
	}
}
