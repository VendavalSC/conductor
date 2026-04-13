package cli

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

const exampleConfig = `# conductor.yaml — define your dev services
name: my-project

services:
  web:
    cmd: npm run dev
    dir: ./frontend
    port: 3000
    color: cyan
    health:
      url: http://localhost:3000
      interval: 5s
    env:
      NODE_ENV: development

  api:
    cmd: go run ./cmd/server
    dir: ./backend
    port: 8080
    color: green
    depends_on:
      - db
    health:
      url: http://localhost:8080/health
      interval: 10s

  db:
    cmd: postgres -D /usr/local/var/postgres
    port: 5432
    color: yellow
    health:
      cmd: pg_isready -h localhost
      interval: 5s

  redis:
    cmd: redis-server
    port: 6379
    color: red
    health:
      cmd: redis-cli ping
      interval: 5s
`

func newInitCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init",
		Short: "Create a conductor.yaml in the current directory",
		RunE: func(cmd *cobra.Command, args []string) error {
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			green := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF88")).Bold(true)

			if _, err := os.Stat("conductor.yaml"); err == nil {
				return fmt.Errorf("conductor.yaml already exists in this directory")
			}

			if err := os.WriteFile("conductor.yaml", []byte(exampleConfig), 0644); err != nil {
				return fmt.Errorf("failed to write conductor.yaml: %w", err)
			}

			fmt.Printf("\n %s\n\n", accent.Render("⚡ Conductor"))
			fmt.Printf("   %s conductor.yaml\n\n", green.Render("created"))
			fmt.Printf("   %s\n", dim.Render("Edit the file to match your project, then run:"))
			fmt.Printf("   %s\n\n", accent.Render("conductor up"))

			return nil
		},
	}
}
