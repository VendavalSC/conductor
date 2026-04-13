BINARY    := conductor
PREFIX    ?= $(HOME)/.local
VERSION   := $(shell git describe --tags --always --dirty 2>/dev/null | sed 's/^v//' || echo "1.1.0-dev")
COMMIT    := $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE      := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS   := -s -w \
	-X github.com/vendi/conductor/internal/version.Version=$(VERSION) \
	-X github.com/vendi/conductor/internal/version.Commit=$(COMMIT) \
	-X github.com/vendi/conductor/internal/version.Date=$(DATE)

.PHONY: build build-desktop install install-desktop install-all clean test lint run run-desktop frontend dev-frontend all release

# ── CLI ──────────────────────────────────────────────
build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/conductor/

run:
	go run -ldflags "$(LDFLAGS)" ./cmd/conductor/ $(ARGS)

# ── Desktop App ──────────────────────────────────────
frontend:
	cd desktop/frontend && npm install && npx vite build
	rm -rf cmd/conductor-desktop/dist
	cp -r desktop/frontend/dist cmd/conductor-desktop/dist

# Arch Linux ships webkit2gtk-4.1 only; Wails v2 links against 4.0.
# Create .pkgconfig/webkit2gtk-4.0.pc shim if needed (see CONTRIBUTING.md).
WAILS_PKG_CFG := PKG_CONFIG_PATH=$(CURDIR)/.pkgconfig:$(PKG_CONFIG_PATH)

build-desktop: frontend
	$(WAILS_PKG_CFG) CGO_ENABLED=1 go build -tags "desktop,production" -ldflags "$(LDFLAGS)" -o bin/$(BINARY)-desktop ./cmd/conductor-desktop/

run-desktop: build-desktop
	./bin/$(BINARY)-desktop

# ── Dev (frontend hot-reload) ────────────────────────
dev-frontend:
	cd desktop/frontend && npx vite --port 5173

# ── Tests ────────────────────────────────────────────
test:
	go test -race -cover ./...

lint:
	golangci-lint run ./...

# ── Install ──────────────────────────────────────────
install: build
	mkdir -p $(PREFIX)/bin
	cp bin/$(BINARY) $(PREFIX)/bin/$(BINARY)
	@printf "\n  Installed conductor to $(PREFIX)/bin/\n\n"

install-desktop: build-desktop
	mkdir -p $(PREFIX)/bin
	cp bin/$(BINARY)-desktop $(PREFIX)/bin/$(BINARY)-desktop
	mkdir -p $(HOME)/.local/share/applications
	sed 's|CONDUCTOR_INSTALL_PATH|$(PREFIX)/bin|g' assets/conductor.desktop.in \
		> $(HOME)/.local/share/applications/conductor.desktop
	mkdir -p $(HOME)/.local/share/icons/hicolor/scalable/apps
	cp assets/conductor.svg $(HOME)/.local/share/icons/hicolor/scalable/apps/conductor.svg
	-gtk-update-icon-cache $(HOME)/.local/share/icons/hicolor/ 2>/dev/null
	-update-desktop-database $(HOME)/.local/share/applications/ 2>/dev/null
	@printf "\n  Installed conductor-desktop to $(PREFIX)/bin/\n"
	@printf "  Desktop entry installed — search 'Conductor' in your app launcher\n\n"

install-all: build build-desktop
	mkdir -p $(PREFIX)/bin
	cp bin/$(BINARY) $(PREFIX)/bin/$(BINARY)
	cp bin/$(BINARY)-desktop $(PREFIX)/bin/$(BINARY)-desktop
	mkdir -p $(HOME)/.local/share/applications
	sed 's|CONDUCTOR_INSTALL_PATH|$(PREFIX)/bin|g' assets/conductor.desktop.in \
		> $(HOME)/.local/share/applications/conductor.desktop
	mkdir -p $(HOME)/.local/share/icons/hicolor/scalable/apps
	cp assets/conductor.svg $(HOME)/.local/share/icons/hicolor/scalable/apps/conductor.svg
	-gtk-update-icon-cache $(HOME)/.local/share/icons/hicolor/ 2>/dev/null
	-update-desktop-database $(HOME)/.local/share/applications/ 2>/dev/null
	@printf "\n  Installed conductor + conductor-desktop to $(PREFIX)/bin/\n"
	@printf "  Desktop entry installed — search 'Conductor' in your app launcher\n\n"

uninstall:
	rm -f $(PREFIX)/bin/$(BINARY) $(PREFIX)/bin/$(BINARY)-desktop
	rm -f $(HOME)/.local/share/applications/conductor.desktop
	rm -f $(HOME)/.local/share/icons/hicolor/scalable/apps/conductor.svg
	@printf "\n  Uninstalled conductor\n\n"

# ── Release ──────────────────────────────────────────
release:
	goreleaser release --clean

# ── Clean ────────────────────────────────────────────
clean:
	rm -rf bin/ dist/ cmd/conductor-desktop/dist/

all: build build-desktop
