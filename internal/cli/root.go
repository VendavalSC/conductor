package cli

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/vendi/conductor/internal/version"
)

var cfgFile string

var banner = lipgloss.NewStyle().
	Foreground(lipgloss.Color("#00D4FF")).
	Bold(true).
	Render(`
   ___                _            _
  / __\___  _ __   __| |_   _  ___| |_ ___  _ __
 / /  / _ \| '_ \ / _` + "`" + ` | | | |/ __| __/ _ \| '__|
/ /__| (_) | | | | (_| | |_| | (__| || (_) | |
\____/\___/|_| |_|\__,_|\__,_|\___|\__\___/|_|`)

func NewRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:   "conductor",
		Short: "Orchestrate your dev environment",
		Long: fmt.Sprintf("%s\n\n  %s\n",
			banner,
			lipgloss.NewStyle().Foreground(lipgloss.Color("#888888")).Render(
				"Conductor v"+version.Version+" — orchestrate your dev environment (made by Vendi)",
			),
		),
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	root.PersistentFlags().StringVarP(&cfgFile, "config", "c", "", "config file (default: conductor.yaml)")

	root.AddCommand(
		newUpCmd(),
		newDownCmd(),
		newStatusCmd(),
		newLogsCmd(),
		newRestartCmd(),
		newInitCmd(),
		newDemoCmd(),
		newVersionCmd(),
	)

	return root
}

func Execute() {
	if err := NewRootCmd().Execute(); err != nil {
		errStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FF4444")).Bold(true)
		fmt.Fprintf(os.Stderr, "\n %s %s\n\n", errStyle.Render("error:"), err)
		os.Exit(1)
	}
}
