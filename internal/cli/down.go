package cli

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

func newDownCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "down",
		Short: "Stop all running services",
		RunE: func(cmd *cobra.Command, args []string) error {
			// For 'down', we need to signal running conductor processes.
			// In the MVP, this prints a message. A full implementation would
			// use a unix socket or PID file to communicate with the running instance.
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

			fmt.Printf("\n %s %s\n\n",
				accent.Render("⚡ Conductor"),
				dim.Render("send Ctrl+C to the running conductor instance to stop all services"),
			)
			fmt.Printf("   %s\n\n",
				dim.Render("Tip: In a future release, `conductor down` will signal the running instance via a socket."),
			)

			return nil
		},
	}
}
