package cli

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

func newRestartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "restart <service>",
		Short: "Restart a service",
		Long:  "Restart a specific service. Use within the TUI (press 'r') for live restart.",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)

			fmt.Printf("\n %s\n\n",
				accent.Render("⚡ Conductor — Restart"),
			)
			fmt.Printf("   %s\n", dim.Render("Restart is available in the TUI dashboard:"))
			fmt.Printf("   %s\n", dim.Render("1. Run: conductor up"))
			fmt.Printf("   %s\n", dim.Render("2. Select a service with ↑/↓"))
			fmt.Printf("   %s\n\n", dim.Render("3. Press 'r' to restart"))

			fmt.Printf("   %s\n\n",
				dim.Render("Tip: A future release will support `conductor restart <service>` via IPC."),
			)

			return nil
		},
	}
}
