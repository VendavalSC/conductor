package desktop

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/vendi/conductor/internal/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

// AddServiceInput is the data received from the UI to add a new service.
type AddServiceInput struct {
	Name      string            `json:"name"`
	Cmd       string            `json:"cmd"`
	Dir       string            `json:"dir"`
	Port      int               `json:"port"`
	Color     string            `json:"color"`
	Env       map[string]string `json:"env"`
	DependsOn []string          `json:"dependsOn"`
	HealthURL string            `json:"healthUrl"`
	HealthCmd string            `json:"healthCmd"`
}

// AddService adds a service to the config and writes conductor.yaml.
func (a *App) AddService(input AddServiceInput) error {
	if input.Name == "" || input.Cmd == "" {
		return fmt.Errorf("name and cmd are required")
	}

	if a.cfg == nil {
		a.cfg = &config.Config{
			Name:     filepath.Base(mustGetwd()),
			Services: make(map[string]*config.Service),
		}
	}

	if _, exists := a.cfg.Services[input.Name]; exists {
		return fmt.Errorf("service %q already exists", input.Name)
	}

	a.cfg.Services[input.Name] = inputToService(input)
	return a.saveConfig()
}

// RemoveService removes a service from the config and writes conductor.yaml.
func (a *App) RemoveService(name string) error {
	if a.cfg == nil {
		return fmt.Errorf("no config loaded")
	}
	if _, exists := a.cfg.Services[name]; !exists {
		return fmt.Errorf("service %q not found", name)
	}

	delete(a.cfg.Services, name)

	// Remove from other services' depends_on
	for _, svc := range a.cfg.Services {
		filtered := svc.DependsOn[:0]
		for _, dep := range svc.DependsOn {
			if dep != name {
				filtered = append(filtered, dep)
			}
		}
		svc.DependsOn = filtered
	}

	return a.saveConfig()
}

// UpdateService updates an existing service's configuration.
func (a *App) UpdateService(name string, input AddServiceInput) error {
	if a.cfg == nil {
		return fmt.Errorf("no config loaded")
	}
	if _, exists := a.cfg.Services[name]; !exists {
		return fmt.Errorf("service %q not found", name)
	}

	a.cfg.Services[name] = inputToService(input)
	return a.saveConfig()
}

// InitConfig creates a new empty conductor.yaml in the given directory.
func (a *App) InitConfig(dir string) error {
	if dir == "" {
		dir = mustGetwd()
	}

	path := filepath.Join(dir, "conductor.yaml")
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("conductor.yaml already exists at %s", dir)
	}

	a.cfg = &config.Config{
		Name:     filepath.Base(dir),
		Services: make(map[string]*config.Service),
	}

	return a.saveConfigTo(path)
}

// GetConfigPath returns the path to the current conductor.yaml.
func (a *App) GetConfigPath() string {
	return filepath.Join(mustGetwd(), "conductor.yaml")
}

// HasConfig returns whether a conductor.yaml is loaded with services.
func (a *App) HasConfig() bool {
	return a.cfg != nil && len(a.cfg.Services) > 0
}

// GetConfigRaw returns the raw YAML content of the current config.
func (a *App) GetConfigRaw() (string, error) {
	path := filepath.Join(mustGetwd(), "conductor.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("no conductor.yaml found: %w", err)
	}
	return string(data), nil
}

// SelectDirectory opens a native directory picker dialog.
func (a *App) SelectDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.wailsCtx, runtime.OpenDialogOptions{
		Title: "Select Project Directory",
	})
	if err != nil {
		return "", fmt.Errorf("dialog error: %w", err)
	}
	return dir, nil
}

// ImportDetected imports a list of detected services into the config.
func (a *App) ImportDetected(services []DetectedService) error {
	if a.cfg == nil {
		a.cfg = &config.Config{
			Name:     filepath.Base(mustGetwd()),
			Services: make(map[string]*config.Service),
		}
	}

	for _, d := range services {
		if d.Name == "" || d.Cmd == "" {
			continue
		}
		if _, exists := a.cfg.Services[d.Name]; exists {
			continue
		}
		a.cfg.Services[d.Name] = &config.Service{
			Cmd:       d.Cmd,
			Dir:       d.Dir,
			Port:      d.Port,
			Color:     d.Color,
			DependsOn: d.DependsOn,
		}
	}

	return a.saveConfig()
}

// GenerateDemo creates a demo conductor.yaml with simple test services.
func (a *App) GenerateDemo(dir string) error {
	if dir == "" {
		dir = mustGetwd()
	}

	a.cfg = &config.Config{
		Name: "conductor-demo",
		Services: map[string]*config.Service{
			"webserver": {
				Cmd:   "python3 -m http.server 8000",
				Port:  8000,
				Color: "cyan",
				Health: &config.HealthCheck{
					URL:      "http://localhost:8000",
					Interval: 3 * time.Second,
					Timeout:  2 * time.Second,
					Retries:  3,
				},
			},
			"ticker": {
				Cmd:   `bash -c 'while true; do echo "[$(date +%H:%M:%S)] tick"; sleep 1; done'`,
				Color: "green",
			},
			"counter": {
				Cmd:       `bash -c 'i=0; while true; do echo "count=$i"; i=$((i+1)); sleep 2; done'`,
				Color:     "yellow",
				DependsOn: []string{"webserver"},
			},
			"monitor": {
				Cmd:   `bash -c 'while true; do echo "mem=$(free -m 2>/dev/null | awk "/Mem:/{print \$3}" || echo "N/A")MB load=$(cat /proc/loadavg 2>/dev/null | cut -d" " -f1 || echo "N/A")"; sleep 5; done'`,
				Color: "magenta",
			},
			"greeter": {
				Cmd:       `bash -c 'names=(Alice Bob Charlie Diana Eve); while true; do echo "Hello ${names[RANDOM % ${#names[@]}]}! The time is $(date +%H:%M:%S)"; sleep 3; done'`,
				Color:     "blue",
				DependsOn: []string{"ticker"},
			},
		},
	}

	return a.saveConfigTo(filepath.Join(dir, "conductor.yaml"))
}

func (a *App) saveConfig() error {
	return a.saveConfigTo(filepath.Join(mustGetwd(), "conductor.yaml"))
}

func (a *App) saveConfigTo(path string) error {
	type yamlHealth struct {
		URL      string `yaml:"url,omitempty"`
		Cmd      string `yaml:"cmd,omitempty"`
		Interval string `yaml:"interval,omitempty"`
	}
	type yamlService struct {
		Cmd       string            `yaml:"cmd"`
		Dir       string            `yaml:"dir,omitempty"`
		Port      int               `yaml:"port,omitempty"`
		Color     string            `yaml:"color,omitempty"`
		Env       map[string]string `yaml:"env,omitempty"`
		DependsOn []string          `yaml:"depends_on,omitempty"`
		Health    *yamlHealth       `yaml:"health,omitempty"`
	}
	type yamlConfig struct {
		Name     string                  `yaml:"name"`
		Services map[string]*yamlService `yaml:"services"`
	}

	out := yamlConfig{
		Name:     a.cfg.Name,
		Services: make(map[string]*yamlService),
	}

	for name, svc := range a.cfg.Services {
		ys := &yamlService{
			Cmd:       svc.Cmd,
			Dir:       svc.Dir,
			Port:      svc.Port,
			Color:     svc.Color,
			Env:       svc.Env,
			DependsOn: svc.DependsOn,
		}
		if svc.Health != nil {
			ys.Health = &yamlHealth{
				URL: svc.Health.URL,
				Cmd: svc.Health.Cmd,
			}
			if svc.Health.Interval > 0 {
				ys.Health.Interval = svc.Health.Interval.String()
			}
		}
		out.Services[name] = ys
	}

	data, err := yaml.Marshal(out)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	header := []byte("# conductor.yaml — managed by Conductor\n\n")
	return os.WriteFile(path, append(header, data...), 0644)
}

func inputToService(input AddServiceInput) *config.Service {
	svc := &config.Service{
		Cmd:       input.Cmd,
		Dir:       input.Dir,
		Port:      input.Port,
		Color:     input.Color,
		Env:       input.Env,
		DependsOn: input.DependsOn,
	}

	if input.HealthURL != "" || input.HealthCmd != "" {
		svc.Health = &config.HealthCheck{
			URL:      input.HealthURL,
			Cmd:      input.HealthCmd,
			Interval: 5 * time.Second,
			Timeout:  3 * time.Second,
			Retries:  3,
		}
	}

	return svc
}
