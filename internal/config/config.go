package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Name     string              `yaml:"name"`
	Services map[string]*Service `yaml:"services"`
}

type Service struct {
	Cmd       string            `yaml:"cmd"`
	Dir       string            `yaml:"dir"`
	Port      int               `yaml:"port"`
	Color     string            `yaml:"color"`
	Env       map[string]string `yaml:"env"`
	DependsOn []string          `yaml:"depends_on"`
	Health    *HealthCheck      `yaml:"health"`
}

type HealthCheck struct {
	URL      string        `yaml:"url"`
	Cmd      string        `yaml:"cmd"`
	Interval time.Duration `yaml:"interval"`
	Timeout  time.Duration `yaml:"timeout"`
	Retries  int           `yaml:"retries"`
}

var configFileNames = []string{
	"conductor.yaml",
	"conductor.yml",
}

func Load(path string) (*Config, error) {
	if path == "" {
		var err error
		path, err = discover()
		if err != nil {
			return nil, err
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if err := cfg.applyDefaults(); err != nil {
		return nil, err
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func discover() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	for {
		for _, name := range configFileNames {
			candidate := filepath.Join(dir, name)
			if _, err := os.Stat(candidate); err == nil {
				return candidate, nil
			}
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", fmt.Errorf("no conductor.yaml found (searched from current directory to root)")
}

func (c *Config) applyDefaults() error {
	if c.Name == "" {
		dir, err := os.Getwd()
		if err != nil {
			return err
		}
		c.Name = filepath.Base(dir)
	}

	colors := []string{
		"cyan", "green", "yellow", "magenta", "blue", "red",
	}
	colorIdx := 0

	// Sort service names for deterministic color assignment.
	svcNames := make([]string, 0, len(c.Services))
	for name := range c.Services {
		svcNames = append(svcNames, name)
	}
	sort.Strings(svcNames)

	for _, name := range svcNames {
		svc := c.Services[name]
		if svc.Color == "" {
			svc.Color = colors[colorIdx%len(colors)]
			colorIdx++
		}
		if svc.Health != nil {
			if svc.Health.Interval == 0 {
				svc.Health.Interval = 5 * time.Second
			}
			if svc.Health.Timeout == 0 {
				svc.Health.Timeout = 3 * time.Second
			}
			if svc.Health.Retries == 0 {
				svc.Health.Retries = 3
			}
		}
	}

	return nil
}

func (c *Config) validate() error {
	if len(c.Services) == 0 {
		return fmt.Errorf("no services defined in config")
	}

	for name, svc := range c.Services {
		for _, dep := range svc.DependsOn {
			if _, ok := c.Services[dep]; !ok {
				return fmt.Errorf("service %q depends on %q, which is not defined", name, dep)
			}
		}
		if svc.Cmd == "" {
			return fmt.Errorf("service %q: cmd is required", name)
		}
	}

	if _, err := c.StartOrder(); err != nil {
		return err
	}

	return nil
}

// StartOrder returns services in topological order (dependencies first).
func (c *Config) StartOrder() ([]string, error) {
	visited := make(map[string]bool)
	visiting := make(map[string]bool)
	var order []string

	var visit func(name string) error
	visit = func(name string) error {
		if visited[name] {
			return nil
		}
		if visiting[name] {
			return fmt.Errorf("circular dependency detected involving %q", name)
		}
		visiting[name] = true

		svc := c.Services[name]
		for _, dep := range svc.DependsOn {
			if err := visit(dep); err != nil {
				return err
			}
		}

		visiting[name] = false
		visited[name] = true
		order = append(order, name)
		return nil
	}

	// Sort keys so iteration order is deterministic (maps in Go are unordered).
	names := make([]string, 0, len(c.Services))
	for name := range c.Services {
		names = append(names, name)
	}
	sort.Strings(names)

	for _, name := range names {
		if err := visit(name); err != nil {
			return nil, err
		}
	}

	return order, nil
}

// StopOrder returns services in reverse topological order (dependents first).
func (c *Config) StopOrder() ([]string, error) {
	order, err := c.StartOrder()
	if err != nil {
		return nil, err
	}

	reversed := make([]string, len(order))
	for i, name := range order {
		reversed[len(order)-1-i] = name
	}
	return reversed, nil
}
