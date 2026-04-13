package cli

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

func newLogsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "logs [service]",
		Short: "View service logs",
		Long:  "View aggregated logs. Use `conductor up --no-tui` for live log streaming.",
		RunE: func(cmd *cobra.Command, args []string) error {
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)

			fmt.Printf("\n %s\n\n",
				accent.Render("⚡ Conductor — Logs"),
			)
			fmt.Printf("   %s\n", dim.Render("Live logs are available when running services:"))
			fmt.Printf("   %s\n", accent.Render("conductor up          "))
			fmt.Printf("   %s\n\n", dim.Render("(TUI mode with live log panel)"))
			fmt.Printf("   %s\n", accent.Render("conductor up --no-tui "))
			fmt.Printf("   %s\n\n", dim.Render("(streaming mode, logs printed to stdout)"))

			return nil
		},
	}
}
