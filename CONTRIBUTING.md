# Contributing to Conductor

First off, thank you for your interest in contributing to Conductor! We're excited to have you join us. This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

---

## Getting Started

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/conductor.git
   cd conductor
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/VendavalSC/conductor.git
   ```

### Create a Branch

Create a branch for your work with a descriptive name:

```bash
git checkout -b feature/amazing-feature
# or
git checkout -b fix/issue-123-bug-description
```

Use these prefixes:
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring (no behavior change)
- `test/` — Test additions or improvements
- `perf/` — Performance improvements

---

## Development Setup

### Prerequisites

- **Go** 1.22 or later
- **Node.js** 18+ (for desktop frontend)
- **Wails v2** CLI (for desktop app development)
- **Make**

### Install Dependencies

#### Go Dependencies
```bash
go mod download
```

#### Node.js Dependencies (Desktop Frontend)
```bash
cd desktop/frontend
npm install
cd ../..
```

#### Wails CLI
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Linux: WebKit Development Headers

#### Fedora / RHEL / CentOS
```bash
sudo dnf install webkit2gtk3-devel
```

#### Debian / Ubuntu
```bash
sudo apt-get install libwebkit2gtk-4.0-dev
```

#### Arch Linux
```bash
sudo pacman -S webkit2gtk

# Create webkit2gtk-4.0 shim for Wails v2
mkdir -p .pkgconfig
cat > .pkgconfig/webkit2gtk-4.0.pc << 'EOF'
Name: webkit2gtk-4.0
Description: Shim redirecting to webkit2gtk-4.1
Version: 2.42.0
Requires: webkit2gtk-4.1
EOF
```

---

## Making Changes

### Building

```bash
# CLI only
make build
# Output: bin/conductor

# Desktop app (requires CGO + webkit2gtk)
make build-desktop
# Output: bin/conductor-desktop

# Everything
make all
```

### Running During Development

```bash
# CLI with arguments
make run ARGS="up"
make run ARGS="demo"
make run ARGS="status"

# Desktop app
make run-desktop

# Frontend with hot-reload (requires Node.js)
cd desktop/frontend
npm run dev
```

### Project Structure

```
conductor/
├── cmd/
│   ├── conductor/              # CLI binary entry point
│   └── conductor-desktop/      # Desktop app entry point
├── internal/
│   ├── cli/                    # CLI commands (Cobra)
│   │   ├── root.go             # Root command & setup
│   │   ├── up.go               # `conductor up` command
│   │   ├── down.go             # `conductor down` command
│   │   ├── status.go           # `conductor status` command
│   │   ├── logs.go             # `conductor logs` command
│   │   ├── restart.go          # `conductor restart` command
│   │   ├── init.go             # `conductor init` command
│   │   ├── demo.go             # `conductor demo` command
│   │   └── version.go          # `conductor version` command
│   ├── config/
│   │   └── config.go           # YAML config parsing & validation
│   ├── health/
│   │   └── checker.go          # Health check engine (HTTP + command)
│   ├── logmux/
│   │   ├── aggregator.go       # Log aggregation from processes
│   │   └── formatter.go        # Color formatting & output
│   ├── process/
│   │   ├── process.go          # Single process lifecycle
│   │   ├── manager.go          # Multi-process orchestration
│   │   └── health_bridge.go    # Health check integration
│   ├── tui/
│   │   ├── app.go              # Terminal UI app (Bubble Tea)
│   │   └── styles.go           # TUI styling
│   └── version/
│       └── version.go          # Version information
├── desktop/
│   ├── app.go                  # Wails backend implementation
│   ├── config_ops.go           # Config file operations
│   ├── scanner.go              # Project auto-detection
│   └── frontend/               # React + TypeScript UI
│       ├── src/
│       │   ├── App.tsx         # Main app component
│       │   ├── pages/          # Page components
│       │   └── components/     # Reusable components
│       ├── package.json
│       └── vite.config.ts
└── assets/                     # Icons, desktop entry files
```

---

## Testing

### Run All Tests

```bash
make test
```

### Run Specific Tests

```bash
# Run tests for a specific package
go test ./internal/config -v

# Run tests matching a pattern
go test ./... -run TestConfigParse -v

# Run with race detection
go test -race ./...

# Run with coverage
go test -cover ./...
```

### Writing Tests

Tests use Go's standard `testing` package. Table-driven tests are preferred:

```go
func TestConfigParse(t *testing.T) {
    tests := []struct {
        name    string
        yaml    string
        want    Config
        wantErr bool
    }{
        {
            name: "valid config",
            yaml: `name: myapp
services:
  web:
    cmd: npm start
    port: 3000`,
            want: Config{...},
        },
        {
            name: "missing name",
            yaml: `services: {}`,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig([]byte(tt.yaml))
            if (err != nil) != tt.wantErr {
                t.Errorf("ParseConfig() error = %v, wantErr %v", err, tt.wantErr)
            }
            if err == nil && !reflect.DeepEqual(got, tt.want) {
                t.Errorf("ParseConfig() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Code Coverage

Aim for 80%+ coverage on new code:

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

---

## Submitting Changes

### Before You Push

1. **Format code:**
   ```bash
   make fmt
   ```

2. **Run linter:**
   ```bash
   make lint
   ```

3. **Run all tests:**
   ```bash
   make test
   ```

4. **Manual testing:**
   - Test the specific feature you changed
   - Test related features to ensure no regressions
   - Test on multiple platforms if possible

### Create a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

2. Open a Pull Request on GitHub with:
   - **Clear title** — Summarize the change
   - **Detailed description** — Explain what, why, and how
   - **Screenshots/videos** — For UI changes
   - **References** — Link to related issues (#123)

3. Fill out the PR template:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## How to Test
   Steps to verify the changes

   ## Checklist
   - [ ] Tests pass locally
   - [ ] Code is formatted
   - [ ] No new warnings from linter
   - [ ] Documentation updated (if needed)
   ```

### Review Process

- Maintainers will review your PR
- Requested changes should be addressed with new commits (don't force-push)
- Once approved, your PR will be merged

---

## Code Style

### Go Code Style

- Follow [Effective Go](https://golang.org/doc/effective_go)
- Use `gofmt` for formatting (enforced by `make fmt`)
- Use `goimports` for import organization
- Aim for functions < 50 lines
- Use descriptive variable names
- Handle errors explicitly; never ignore them

### Naming Conventions

- **Constants:** `UPPER_CASE`
- **Variables:** `camelCase`
- **Types:** `PascalCase`
- **Functions:** `PascalCase` (exported) or `camelCase` (unexported)
- **Packages:** `lowercase` (single word preferred)

### Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to parse config: %w", err)
}
```

### TypeScript/React (Desktop Frontend)

- Use TypeScript for type safety
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Format with Prettier: `npm run format`
- Lint with ESLint: `npm run lint`

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat:` — A new feature
- `fix:` — A bug fix
- `docs:` — Documentation only
- `style:` — Changes that don't affect code behavior (formatting, etc.)
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `perf:` — Code change that improves performance
- `test:` — Adding or updating tests
- `chore:` — Changes to build process, dependencies, etc.

### Examples

```
feat: add health check timeout configuration

Add configurable timeout for HTTP health checks.
Previously hardcoded to 3s, now accepts interval
via conductor.yaml health.timeout field.

Fixes #45
```

```
fix: prevent service order mutation in UI

Services were being reordered in the list when state
updated. Changed to use immutable data structures.
```

---

## 🙏 Thank You

Thank you for contributing to Conductor! Your work helps make this project better for everyone. If you have questions, please open an issue or start a discussion.

---

## Additional Resources

- [GitHub Issues](https://github.com/VendavalSC/conductor/issues) — Report bugs or request features
- [GitHub Discussions](https://github.com/VendavalSC/conductor/discussions) — Ask questions, share ideas
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community standards
