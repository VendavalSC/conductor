package health

import (
	"context"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/vendi/conductor/internal/config"
	"github.com/vendi/conductor/internal/process"
)

type Checker struct {
	manager *process.Manager
	cancel  context.CancelFunc
}

func NewChecker(manager *process.Manager) *Checker {
	return &Checker{manager: manager}
}

func (c *Checker) Start(ctx context.Context) {
	ctx, c.cancel = context.WithCancel(ctx)

	for name, svc := range c.manager.Config.Services {
		if svc.Health != nil {
			go c.monitor(ctx, name, svc)
		}
	}
}

func (c *Checker) Stop() {
	if c.cancel != nil {
		c.cancel()
	}
}

func (c *Checker) monitor(ctx context.Context, name string, svc *config.Service) {
	ticker := time.NewTicker(svc.Health.Interval)
	defer ticker.Stop()

	failures := 0

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			proc, ok := c.manager.GetProcess(name)
			if !ok {
				continue
			}

			status := proc.GetStatus()
			if status == process.StatusStopped || status == process.StatusCrashed || status == process.StatusStopping {
				continue
			}

			if Check(svc.Health) {
				failures = 0
				proc.SetStatus(process.StatusHealthy)
			} else {
				failures++
				if failures >= svc.Health.Retries {
					proc.SetStatus(process.StatusUnhealthy)
				}
			}
		}
	}
}

func Check(h *config.HealthCheck) bool {
	if h.URL != "" {
		return checkHTTP(h.URL, h.Timeout)
	}
	if h.Cmd != "" {
		return checkCmd(h.Cmd, h.Timeout)
	}
	return true
}

func checkHTTP(url string, timeout time.Duration) bool {
	client := &http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 400
}

func checkCmd(command string, timeout time.Duration) bool {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	parts := strings.Fields(command)
	cmd := exec.CommandContext(ctx, parts[0], parts[1:]...)
	return cmd.Run() == nil
}
