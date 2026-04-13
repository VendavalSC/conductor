package cli

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/vendi/conductor/internal/config"
	"github.com/vendi/conductor/internal/health"
	"github.com/vendi/conductor/internal/logmux"
	"github.com/vendi/conductor/internal/process"
	"github.com/vendi/conductor/internal/tui"
)

func newUpCmd() *cobra.Command {
	var noTUI bool

	cmd := &cobra.Command{
		Use:   "up",
		Short: "Start all services",
		Long:  "Start all services defined in conductor.yaml, respecting dependency order.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load(cfgFile)
			if err != nil {
				return err
			}

			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			manager := process.NewManager(cfg)

			// Build color map for formatter
			colorMap := make(map[string]string)
			for name, svc := range cfg.Services {
				colorMap[name] = svc.Color
			}
			formatter := logmux.NewFormatter(manager.ServiceNames(), colorMap)

			// Print startup banner
			printStartBanner(cfg)

			// Start services
			if err := manager.StartAll(ctx); err != nil {
				return err
			}

			// Start health checker
			checker := health.NewChecker(manager)
			checker.Start(ctx)
			defer checker.Stop()

			if noTUI {
				return runStreamMode(ctx, cancel, manager, formatter)
			}
			return runTUIMode(manager, formatter)
		},
	}

	cmd.Flags().BoolVar(&noTUI, "no-tui", false, "stream logs without the TUI dashboard")

	return cmd
}

func printStartBanner(cfg *config.Config) {
	accent := lipgloss.NewStyle().Foreground(lipgloss.Color("#00D4FF")).Bold(true)
	dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

	fmt.Printf("\n %s %s\n\n",
		accent.Render("⚡ Conductor"),
		dim.Render(fmt.Sprintf("starting %d services for %s", len(cfg.Services), cfg.Name)),
	)

	order, _ := cfg.StartOrder()
	for _, name := range order {
		svc := cfg.Services[name]
		port := ""
		if svc.Port > 0 {
			port = fmt.Sprintf(" → :%d", svc.Port)
		}
		fmt.Printf("   %s %s%s\n",
			dim.Render("›"),
			accent.Render(name),
			dim.Render(port),
		)
	}
	fmt.Println()
}

func runStreamMode(ctx context.Context, cancel context.CancelFunc, manager *process.Manager, formatter *logmux.Formatter) error {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	agg := logmux.NewAggregator(manager.LogCh, formatter)

	go func() {
		<-sigCh
		fmt.Println()
		dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		fmt.Printf(" %s\n", dim.Render("shutting down..."))
		cancel()
		_ = manager.StopAll()
	}()

	agg.Stream()
	return nil
}

func runTUIMode(manager *process.Manager, formatter *logmux.Formatter) error {
	model := tui.NewModel(manager, formatter)
	p := tea.NewProgram(model, tea.WithAltScreen())

	result, err := p.Run()
	if err != nil {
		return fmt.Errorf("TUI error: %w", err)
	}

	_ = result

	dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
	fmt.Printf("\n %s\n", dim.Render("shutting down..."))
	return manager.StopAll()
}
