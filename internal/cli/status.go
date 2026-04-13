package cli

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/vendi/conductor/internal/config"
	"github.com/vendi/conductor/internal/health"
)

func newStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show service status",
		Long:  "Show the health and port status of all defined services.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load(cfgFile)
			if err != nil {
				return err
			}

			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			green := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF88")).Bold(true)
			red := lipgloss.NewStyle().Foreground(lipgloss.Color("#FF4444")).Bold(true)

			fmt.Printf("\n %s %s\n\n",
				accent.Render("⚡ Conductor"),
				dim.Render(fmt.Sprintf("status for %s", cfg.Name)),
			)

			fmt.Printf("   %s\n",
				dim.Render(fmt.Sprintf("%-16s %-10s %-8s %s", "SERVICE", "HEALTH", "PORT", "CMD")),
			)
			fmt.Printf("   %s\n", dim.Render("────────────────────────────────────────────────────"))

			order, _ := cfg.StartOrder()
			for _, name := range order {
				svc := cfg.Services[name]

				port := "-"
				if svc.Port > 0 {
					port = fmt.Sprintf(":%d", svc.Port)
				}

				healthStatus := dim.Render("  —")
				if svc.Health != nil {
					if health.Check(svc.Health) {
						healthStatus = green.Render("● up")
					} else {
						healthStatus = red.Render("✖ down")
					}
				}

				cmdPreview := svc.Cmd
				if len(cmdPreview) > 30 {
					cmdPreview = cmdPreview[:27] + "..."
				}

				fmt.Printf("   %-16s %-10s %-8s %s\n",
					accent.Render(name),
					healthStatus,
					port,
					dim.Render(cmdPreview),
				)
			}
			fmt.Println()

			return nil
		},
	}
}
