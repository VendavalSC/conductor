package desktop

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// DetectedService is a suggestion from scanning a project directory.
type DetectedService struct {
	Name      string   `json:"name"`
	Cmd       string   `json:"cmd"`
	Dir       string   `json:"dir"`
	Port      int      `json:"port"`
	Color     string   `json:"color"`
	Source    string   `json:"source"`
	DependsOn []string `json:"dependsOn"`
}

// ScanDirectory scans a directory for project files and returns suggested services.
func (a *App) ScanDirectory(dir string) ([]DetectedService, error) {
	if dir == "" {
		dir = mustGetwd()
	}

	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		return nil, fmt.Errorf("invalid directory: %s", dir)
	}

	var detected []DetectedService
	colors := []string{"cyan", "green", "yellow", "magenta", "blue", "red", "orange", "purple"}
	colorIdx := 0

	nextColor := func() string {
		c := colors[colorIdx%len(colors)]
		colorIdx++
		return c
	}

	detected = append(detected, scanNodeJS(dir, nextColor)...)
	detected = append(detected, scanGo(dir, nextColor)...)
	detected = append(detected, scanRust(dir, nextColor)...)
	detected = append(detected, scanPython(dir, nextColor)...)
	detected = append(detected, scanDockerCompose(dir, nextColor)...)

	// Fallback to Makefile if nothing else detected
	if len(detected) == 0 {
		if _, err := os.Stat(filepath.Join(dir, "Makefile")); err == nil {
			detected = append(detected, DetectedService{
				Name:   sanitizeName(filepath.Base(dir)),
				Cmd:    "make run",
				Dir:    dir,
				Color:  nextColor(),
				Source: "Makefile (guessed 'make run')",
			})
		}
	}

	// Scan subdirectories one level deep for monorepo patterns
	detected = append(detected, scanSubdirectories(dir, nextColor)...)

	return detected, nil
}

func scanNodeJS(dir string, nextColor func() string) []DetectedService {
	data, err := os.ReadFile(filepath.Join(dir, "package.json"))
	if err != nil {
		return nil
	}

	var pkg struct {
		Name    string            `json:"name"`
		Scripts map[string]string `json:"scripts"`
	}
	if json.Unmarshal(data, &pkg) != nil {
		return nil
	}

	name := pkg.Name
	if name == "" {
		name = filepath.Base(dir)
	}

	var detected []DetectedService

	if cmd, ok := pkg.Scripts["dev"]; ok {
		d := DetectedService{
			Name:   sanitizeName(name),
			Cmd:    "npm run dev",
			Dir:    dir,
			Color:  nextColor(),
			Source: fmt.Sprintf("package.json scripts.dev → %s", cmd),
		}
		if port := guessPortFromScript(cmd); port > 0 {
			d.Port = port
		}
		detected = append(detected, d)
	} else if cmd, ok := pkg.Scripts["start"]; ok {
		d := DetectedService{
			Name:   sanitizeName(name),
			Cmd:    "npm start",
			Dir:    dir,
			Color:  nextColor(),
			Source: fmt.Sprintf("package.json scripts.start → %s", cmd),
		}
		if port := guessPortFromScript(cmd); port > 0 {
			d.Port = port
		}
		detected = append(detected, d)
	}

	return detected
}

func scanGo(dir string, nextColor func() string) []DetectedService {
	data, err := os.ReadFile(filepath.Join(dir, "go.mod"))
	if err != nil {
		return nil
	}

	modName := ""
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "module ") {
			modName = strings.TrimPrefix(line, "module ")
			break
		}
	}

	name := filepath.Base(dir)
	if modName != "" {
		parts := strings.Split(modName, "/")
		name = parts[len(parts)-1]
	}

	// Check for cmd/ directory with main packages
	if entries, err := os.ReadDir(filepath.Join(dir, "cmd")); err == nil {
		var detected []DetectedService
		for _, entry := range entries {
			if entry.IsDir() {
				detected = append(detected, DetectedService{
					Name:   sanitizeName(entry.Name()),
					Cmd:    fmt.Sprintf("go run ./cmd/%s/", entry.Name()),
					Dir:    dir,
					Color:  nextColor(),
					Source: fmt.Sprintf("go.mod cmd/%s", entry.Name()),
				})
			}
		}
		return detected
	}

	return []DetectedService{{
		Name:   sanitizeName(name),
		Cmd:    "go run .",
		Dir:    dir,
		Color:  nextColor(),
		Source: "go.mod",
	}}
}

func scanRust(dir string, nextColor func() string) []DetectedService {
	if _, err := os.Stat(filepath.Join(dir, "Cargo.toml")); err != nil {
		return nil
	}
	return []DetectedService{{
		Name:   sanitizeName(filepath.Base(dir)),
		Cmd:    "cargo run",
		Dir:    dir,
		Color:  nextColor(),
		Source: "Cargo.toml",
	}}
}

func scanPython(dir string, nextColor func() string) []DetectedService {
	for _, pyFile := range []string{"pyproject.toml", "requirements.txt", "setup.py"} {
		if _, err := os.Stat(filepath.Join(dir, pyFile)); err != nil {
			continue
		}

		// Check for Django
		if _, err := os.Stat(filepath.Join(dir, "manage.py")); err == nil {
			return []DetectedService{{
				Name:   "django",
				Cmd:    "python manage.py runserver",
				Dir:    dir,
				Port:   8000,
				Color:  nextColor(),
				Source: fmt.Sprintf("%s + manage.py (Django)", pyFile),
			}}
		}

		return []DetectedService{{
			Name:   sanitizeName(filepath.Base(dir)),
			Cmd:    "python -m " + filepath.Base(dir),
			Dir:    dir,
			Color:  nextColor(),
			Source: pyFile,
		}}
	}
	return nil
}

func scanDockerCompose(dir string, nextColor func() string) []DetectedService {
	for _, dcFile := range []string{"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"} {
		data, err := os.ReadFile(filepath.Join(dir, dcFile))
		if err != nil {
			continue
		}

		var compose struct {
			Services map[string]struct {
				Ports   []string `yaml:"ports"`
				Command string   `yaml:"command"`
				Build   any      `yaml:"build"`
			} `yaml:"services"`
		}
		if yaml.Unmarshal(data, &compose) != nil {
			continue
		}

		var detected []DetectedService
		for svcName, svc := range compose.Services {
			d := DetectedService{
				Name:   sanitizeName(svcName),
				Color:  nextColor(),
				Source: fmt.Sprintf("%s service:%s", dcFile, svcName),
			}
			if svc.Command != "" {
				d.Cmd = svc.Command
			} else if svc.Build != nil {
				d.Cmd = fmt.Sprintf("# extracted from %s — fill in the run command", dcFile)
			}
			if len(svc.Ports) > 0 {
				d.Port = parseDockerPort(svc.Ports[0])
			}
			detected = append(detected, d)
		}
		return detected
	}
	return nil
}

func scanSubdirectories(dir string, nextColor func() string) []DetectedService {
	skipDirs := map[string]bool{
		"node_modules": true, "vendor": true, "dist": true,
		"build": true, "target": true, "bin": true, ".git": true,
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	var detected []DetectedService
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") || skipDirs[entry.Name()] {
			continue
		}
		subdir := filepath.Join(dir, entry.Name())

		// Sub-package.json
		if data, err := os.ReadFile(filepath.Join(subdir, "package.json")); err == nil {
			var pkg struct {
				Name    string            `json:"name"`
				Scripts map[string]string `json:"scripts"`
			}
			if json.Unmarshal(data, &pkg) == nil {
				if devCmd, ok := pkg.Scripts["dev"]; ok {
					d := DetectedService{
						Name:   sanitizeName(entry.Name()),
						Cmd:    "npm run dev",
						Dir:    subdir,
						Color:  nextColor(),
						Source: fmt.Sprintf("%s/package.json scripts.dev", entry.Name()),
					}
					if port := guessPortFromScript(devCmd); port > 0 {
						d.Port = port
					}
					detected = append(detected, d)
				}
			}
		}

		// Sub-go.mod
		if _, err := os.Stat(filepath.Join(subdir, "go.mod")); err == nil {
			detected = append(detected, DetectedService{
				Name:   sanitizeName(entry.Name()),
				Cmd:    "go run .",
				Dir:    subdir,
				Color:  nextColor(),
				Source: fmt.Sprintf("%s/go.mod", entry.Name()),
			})
		}
	}
	return detected
}

func sanitizeName(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "@", "")
	s = strings.ReplaceAll(s, "/", "-")
	s = strings.TrimLeft(s, "-")
	if s == "" {
		return "service"
	}
	return s
}

func guessPortFromScript(script string) int {
	portPatterns := []struct {
		prefix string
		offset int
	}{
		{"--port ", 7},
		{"-p ", 3},
		{"PORT=", 5},
	}
	for _, pp := range portPatterns {
		if idx := strings.Index(script, pp.prefix); idx >= 0 {
			rest := script[idx+pp.offset:]
			port := 0
			for _, ch := range rest {
				if ch >= '0' && ch <= '9' {
					port = port*10 + int(ch-'0')
				} else {
					break
				}
			}
			if port > 0 && port < 65536 {
				return port
			}
		}
	}
	return 0
}

func parseDockerPort(portSpec string) int {
	parts := strings.Split(portSpec, ":")
	portStr := strings.Split(parts[0], "/")[0]
	port := 0
	for _, ch := range portStr {
		if ch >= '0' && ch <= '9' {
			port = port*10 + int(ch-'0')
		} else {
			break
		}
	}
	if port > 0 && port < 65536 {
		return port
	}
	return 0
}
