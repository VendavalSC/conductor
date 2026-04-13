package tui

import "github.com/charmbracelet/lipgloss"

var (
	// Brand colors
	accentColor  = lipgloss.Color("#00D4FF")
	successColor = lipgloss.Color("#00FF88")
	warningColor = lipgloss.Color("#FFD700")
	errorColor   = lipgloss.Color("#FF4444")
	mutedColor   = lipgloss.Color("#555555")
	dimColor     = lipgloss.Color("#888888")
	textColor    = lipgloss.Color("#EEEEEE")
	bgColor      = lipgloss.Color("#111111")

	// Service status styles
	statusRunning   = lipgloss.NewStyle().Foreground(successColor).Bold(true)
	statusHealthy   = lipgloss.NewStyle().Foreground(successColor).Bold(true)
	statusStopped   = lipgloss.NewStyle().Foreground(dimColor)
	statusCrashed   = lipgloss.NewStyle().Foreground(errorColor).Bold(true)
	statusStarting  = lipgloss.NewStyle().Foreground(warningColor)
	statusUnhealthy = lipgloss.NewStyle().Foreground(errorColor)

	// Layout
	headerStyle = lipgloss.NewStyle().
			Foreground(accentColor).
			Bold(true).
			PaddingLeft(1)

	titleStyle = lipgloss.NewStyle().
			Foreground(accentColor).
			Bold(true).
			PaddingLeft(1).
			PaddingRight(1)

	tableHeaderStyle = lipgloss.NewStyle().
				Foreground(dimColor).
				Bold(true).
				PaddingLeft(1)

	tableRowStyle = lipgloss.NewStyle().
			PaddingLeft(1)

	selectedRowStyle = lipgloss.NewStyle().
				PaddingLeft(1).
				Background(lipgloss.Color("#1a1a2e")).
				Foreground(textColor)

	logPanelStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.NormalBorder()).
			BorderTop(true).
			BorderForeground(mutedColor)

	helpStyle = lipgloss.NewStyle().
			Foreground(dimColor).
			PaddingLeft(1)

	statusDot = map[string]string{
		"running":   "●",
		"healthy":   "●",
		"starting":  "◐",
		"stopped":   "○",
		"crashed":   "✖",
		"unhealthy": "▲",
		"stopping":  "◑",
	}
)
