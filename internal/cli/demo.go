package cli

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

const demoConfig = `# conductor.yaml — Demo project (uses basic tools available on any system)
name: conductor-demo

services:
  webserver:
    cmd: python3 -m http.server 8000
    port: 8000
    color: cyan
    restart: on-failure
    health:
      url: http://localhost:8000
      interval: 3s

  ticker:
    cmd: bash -c 'while true; do echo "[$(date +%H:%M:%S)] tick"; sleep 1; done'
    color: green
    restart: always

  counter:
    cmd: bash -c 'i=0; while true; do echo "count=$i"; i=$((i+1)); sleep 2; done'
    color: yellow
    restart: on-failure
    depends_on:
      - webserver

  monitor:
    cmd: bash -c 'while true; do echo "load=$(cat /proc/loadavg 2>/dev/null | cut -d\" \" -f1-3 || echo N/A) procs=$(ls /proc | grep -c ^[0-9] 2>/dev/null || echo N/A)"; sleep 5; done'
    color: magenta

  greeter:
    cmd: bash -c 'names=(Alice Bob Charlie Diana Eve); while true; do echo "Hello ${names[RANDOM % ${#names[@]}]}! The time is $(date +%H:%M:%S)"; sleep 3; done'
    color: blue
    restart: always
    depends_on:
      - ticker
`

func newDemoCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "demo",
		Short: "Create a demo conductor.yaml with sample services to try out",
		RunE: func(cmd *cobra.Command, args []string) error {
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			green := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF88")).Bold(true)
			yellow := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFD700"))

			if _, err := os.Stat("conductor.yaml"); err == nil {
				return fmt.Errorf("conductor.yaml already exists — remove it first or use a different directory")
			}

			if err := os.WriteFile("conductor.yaml", []byte(demoConfig), 0644); err != nil {
				return fmt.Errorf("failed to write conductor.yaml: %w", err)
			}

			fmt.Printf("\n %s\n\n", accent.Render("⚡ Conductor Demo"))
			fmt.Printf("   %s conductor.yaml with 5 demo services\n\n", green.Render("created"))
			fmt.Printf("   %s\n", dim.Render("Services:"))
			fmt.Printf("   %s  webserver    Python HTTP server on :8000\n", yellow.Render("▸"))
			fmt.Printf("   %s  ticker       Prints a tick every second\n", yellow.Render("▸"))
			fmt.Printf("   %s  counter      Incrementing counter (depends on webserver)\n", yellow.Render("▸"))
			fmt.Printf("   %s  monitor      System load monitor\n", yellow.Render("▸"))
			fmt.Printf("   %s  greeter      Random greeting generator\n", yellow.Render("▸"))
			fmt.Printf("\n   %s\n", dim.Render("Run it:"))
			fmt.Printf("   %s         # TUI dashboard\n", accent.Render("conductor up"))
			fmt.Printf("   %s  # Desktop app\n\n", accent.Render("conductor-desktop"))

			return nil
		},
	}
}
