package cli

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/vendi/conductor/internal/version"
)

func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version information",
		Run: func(cmd *cobra.Command, args []string) {
			accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
			dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

			fmt.Printf("\n %s %s\n",
				accent.Render("⚡ Conductor"),
				dim.Render(fmt.Sprintf("v%s (%s) built %s", version.Version, version.Commit, version.Date, "made by Vendi")),
			)
			fmt.Println()
		},
	}
}
