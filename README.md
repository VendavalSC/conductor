# Conductor

<div align="center">

[![GitHub release](https://img.shields.io/github/release/VendavalSC/conductor.svg?style=flat-square)](https://github.com/VendavalSC/conductor/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Go Report Card](https://goreportcard.com/badge/github.com/VendavalSC/conductor?style=flat-square)](https://goreportcard.com/report/github.com/VendavalSC/conductor)
[![Made with ❤️](https://img.shields.io/badge/made%20with-❤️-red.svg?style=flat-square)](https://github.com/VendavalSC/conductor)

**Orchestrate your entire dev environment with a single command.**

Conductor is a lightweight, powerful process orchestrator designed for modern development workflows. Start your entire stack—backend, frontend, database, cache, workers—with one command. Manage everything from a beautiful native UI or the terminal.

**No Docker. No complexity. Just pure simplicity and power.**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### Core Capabilities
- **⚡ Instant Setup** — Define services in a single YAML file
- **🚀 Lightning Fast** — Start services respecting dependency order; built in pure Go
- **🎨 Dual Interface** — Beautiful CLI dashboard or native desktop GUI
- **💚 Health Monitoring** — HTTP or command-based health verification with visual indicators
- **📊 Unified Logs** — Color-coded, aggregated logs from all services with real-time streaming
- **🔄 Live Reload** — Restart services on-the-fly without stopping others
- **🔍 Auto-Discovery** — Scan projects and detect services from `package.json`, `go.mod`, `Cargo.toml`, `docker-compose.yml`, `pyproject.toml`
- **🖥️ UI Management** — Add, remove, configure services directly from the desktop app
- **🌍 Cross-Platform** — Linux, macOS, Windows support
- **📦 Zero Dependencies** — Single binary, no external runtime required

### Desktop App
- **Scan & Setup** — Browse any directory; auto-detect services and dependencies
- **Visual Dashboard** — Real-time status dots, uptime, PID, port monitoring
- **Service Forms** — Intuitive UI for creating and managing services with color picker
- **Smart Logs** — Filterable, auto-scrolling, color-coded log viewer
- **Safe Operations** — Confirmation dialogs prevent accidental config changes
- **Demo Mode** — One-click demo project to explore features

---

## 📋 Quick Start

### 1. Try It Immediately

```bash
# Generate demo services
conductor demo
conductor up

# Or start with your existing project
conductor init       # creates conductor.yaml
conductor up         # starts everything
```

### 2. Using the Desktop App

```bash
conductor-desktop
```

On Linux, Conductor integrates with your desktop environment—search for it in rofi, dmenu, or your app launcher.

### 3. Basic Config Example

```yaml
name: my-fullstack-app

services:
  frontend:
    cmd: npm run dev
    dir: ./frontend
    port: 3000
    color: cyan
    env:
      NODE_ENV: development
    depends_on:
      - api
    health:
      url: http://localhost:3000
      interval: 5s

  api:
    cmd: go run ./cmd/server
    dir: ./backend
    port: 8080
    color: green
    depends_on:
      - db
    health:
      cmd: curl -f http://localhost:8080/health

  db:
    cmd: postgres -D /usr/local/var/postgres
    port: 5432
    color: yellow
    health:
      cmd: pg_isready -h localhost
```

---

## 🛠️ Installation

### From Pre-built Binaries

Download the latest release for your platform from [Releases](https://github.com/VendavalSC/conductor/releases).

```bash
# Extract and place in your PATH
tar xzf conductor-linux-x64.tar.gz
sudo mv conductor /usr/local/bin/
sudo mv conductor-desktop /usr/local/bin/
```

### From Source

```bash
git clone https://github.com/VendavalSC/conductor
cd conductor

# CLI only
make build
sudo cp bin/conductor /usr/local/bin/

# Full installation (CLI + Desktop + Linux desktop entry)
make install-all
```

### Requirements

- **CLI:** Go 1.22+ or pre-built binary
- **Desktop App:** Requires GTK3 on Linux; macOS and Windows bundles everything

#### Linux Dependencies (GTK3)

```bash
# Fedora / RHEL / CentOS
sudo dnf install webkit2gtk3-devel

# Debian / Ubuntu
sudo apt-get install libwebkit2gtk-4.0-dev

# Arch
sudo pacman -S webkit2gtk
```

---

## 📖 Complete Configuration Reference

### Top-Level Config

```yaml
name: my-app          # Project name (required)
```

### Service Configuration

| Key | Type | Description |
|-----|------|-------------|
| `cmd` | string | Command to run (supports shell features like pipes) |
| `dir` | string | Working directory (relative to conductor.yaml location) |
| `port` | integer | Exposed port (appears in dashboard) |
| `color` | string | Terminal color: `cyan`, `green`, `yellow`, `red`, `magenta`, `blue`, `orange`, `purple` |
| `env` | object | Environment variables (inherited by child process) |
| `depends_on` | array | Service dependencies (startup order) |
| `health` | object | Health check configuration |

### Health Check Configuration

#### HTTP Health Check
```yaml
health:
  url: http://localhost:3000
  interval: 5s        # check frequency
  timeout: 3s         # request timeout
  retries: 3          # consecutive failures before marking unhealthy
```

#### Command Health Check
```yaml
health:
  cmd: pg_isready -h localhost
  interval: 5s
  retries: 3
```

---

## 🎮 CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `conductor init` | Create template config | `conductor init` |
| `conductor demo` | Create demo config | `conductor demo` |
| `conductor up` | Start all services | `conductor up` |
| `conductor up -c custom.yaml` | Use custom config | `conductor up -c config/dev.yaml` |
| `conductor status` | Show service status | `conductor status` |
| `conductor logs` | Stream all logs | `conductor logs` |
| `conductor logs <service>` | Stream service logs | `conductor logs api` |
| `conductor restart <service>` | Restart a service | `conductor restart frontend` |
| `conductor down` | Stop all services | `conductor down` |
| `conductor version` | Show version | `conductor version` |

### TUI Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` or `k` / `j` | Navigate services |
| `Enter` or `s` | Start/stop service |
| `r` | Restart service |
| `l` | View service logs |
| `q` | Quit (stops all services) |
| `?` | Show help |

---

## 🏗️ How It Works

1. **Config Loading** — Reads `conductor.yaml` from current directory or walks up the tree
2. **Dependency Resolution** — Topological sort determines startup order
3. **Process Spawning** — Executes commands via `sh -c` (supports pipes, redirects, complex syntax)
4. **Log Aggregation** — Combines stdout/stderr with per-service color coding
5. **Health Monitoring** — Periodically checks health endpoints (HTTP or command)
6. **Graceful Shutdown** — SIGTERM → 5s wait → SIGKILL if still running

---

## 📊 Comparison with Alternatives

| Feature | Conductor | Docker Compose | Foreman | Overmind |
|---------|-----------|---|---------|----------|
| Configuration | YAML | YAML | Procfile | Procfile |
| Desktop GUI | ✅ Native | ❌ | ❌ | ❌ |
| Auto-detect Services | ✅ | ❌ | ❌ | ❌ |
| Health Checks | ✅ HTTP + Cmd | ✅ | ❌ | ❌ |
| Service Dependencies | ✅ | ✅ | ❌ | ❌ |
| Docker Required | ❌ | ✅ | ❌ | ❌ |
| Single Binary | ✅ | ❌ | ✅ | ✅ |
| Real-time Logs | ✅ | ✅ | ✅ | ✅ |

---

## 🗺️ Project Roadmap

- [x] CLI with beautiful TUI dashboard
- [x] Native desktop GUI (Wails + React)
- [x] Health checks (HTTP + command)
- [x] Service dependencies (topological sort)
- [x] Environment variables
- [x] UI service management (add/remove/edit)
- [x] Auto-discovery (package.json, go.mod, Cargo.toml, docker-compose, pyproject.toml)
- [x] Desktop entry for Linux app launchers
- [x] Demo project generator
- [ ] System tray with crash notifications
- [ ] Config hot-reload (watch conductor.yaml)
- [ ] Unix socket IPC (signals running instance)
- [ ] Plugin system for custom health checks
- [ ] Save/restore session profiles
- [ ] Conditional startup hooks (pre/post commands)

---

## 🏢 Project Structure

```
conductor/
├── cmd/
│   ├── conductor/              # CLI entry point
│   └── conductor-desktop/      # Desktop app entry point
├── internal/
│   ├── cli/                    # CLI commands (Cobra)
│   ├── config/                 # YAML config parsing
│   ├── health/                 # Health check engine
│   ├── logmux/                 # Log aggregation & formatting
│   ├── process/                # Process lifecycle
│   ├── tui/                    # Terminal UI (Bubble Tea)
│   └── version/                # Version management
├── desktop/
│   ├── app.go                  # Wails backend
│   ├── config_ops.go           # Config operations
│   ├── scanner.go              # Project auto-detection
│   └── frontend/               # React + TypeScript
├── assets/                     # Icons, desktop entry
├── Makefile                    # Build automation
├── go.mod / go.sum             # Go dependencies
├── .goreleaser.yml             # Release configuration
└── conductor.example.yaml      # Example configuration
```

---

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature suggestions, or code contributions, please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

### Quick Start for Contributors

```bash
git clone https://github.com/VendavalSC/conductor
cd conductor

# Run tests
make test

# Build and test locally
make build
./bin/conductor up

# Format code
make fmt

# Run linter
make lint
```

---

## 📜 License

Conductor is distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 💡 Use Cases

### Full-Stack Development
```yaml
services:
  frontend: { cmd: npm run dev, dir: ./frontend, port: 3000 }
  api: { cmd: go run ./cmd/api, dir: ./backend, port: 8080 }
  db: { cmd: postgres ... }
```

### Microservices
```yaml
services:
  auth-service: { cmd: npm start, port: 3001 }
  user-service: { cmd: go run ./main.go, port: 3002 }
  order-service: { cmd: python app.py, port: 3003 }
```

### Python/Django Stack
```yaml
services:
  web: { cmd: python manage.py runserver, port: 8000 }
  celery: { cmd: celery -A config worker }
  redis: { cmd: redis-server, port: 6379 }
  postgres: { cmd: postgres ... }
```

---

## 🆘 Troubleshooting

### Config Not Found
Conductor looks for `conductor.yaml` in the current directory and walks up the tree. Make sure the file exists or use `-c path/to/config.yaml`.

### Health Check Failing
Check that your service is actually listening on the configured port/endpoint. Use `conductor logs <service>` to debug.

### Desktop App Not Launching
On Linux, ensure GTK3 development libraries are installed. See [Installation](#-installation) for platform-specific requirements.

### Permission Denied (Linux Desktop)
```bash
chmod +x /usr/local/bin/conductor-desktop
```

---

## 📧 Support

Have questions? Found a bug? Open an [issue](https://github.com/VendavalSC/conductor/issues) or start a [discussion](https://github.com/VendavalSC/conductor/discussions).

---

<div align="center">

**Made with ❤️ by [VendavalSC](https://github.com/VendavalSC)**

</div>
