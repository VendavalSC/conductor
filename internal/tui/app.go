package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/vendi/conductor/internal/logmux"
	"github.com/vendi/conductor/internal/process"
)

const (
	maxLogLines  = 200
	tickInterval = 500 * time.Millisecond
)

type logMsg process.LogLine
type tickMsg time.Time

type Model struct {
	manager   *process.Manager
	formatter *logmux.Formatter

	logLines []process.LogLine
	selected int
	width    int
	height   int
	quitting bool
}

func NewModel(manager *process.Manager, formatter *logmux.Formatter) Model {
	return Model{
		manager:   manager,
		formatter: formatter,
		logLines:  make([]process.LogLine, 0, maxLogLines),
		width:     80,
		height:    24,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		m.listenForLogs(),
		m.tick(),
	)
}

func (m Model) listenForLogs() tea.Cmd {
	return func() tea.Msg {
		line, ok := <-m.manager.LogCh
		if !ok {
			return nil
		}
		return logMsg(line)
	}
}

func (m Model) tick() tea.Cmd {
	return tea.Tick(tickInterval, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			m.quitting = true
			return m, tea.Quit
		case "up", "k":
			if m.selected > 0 {
				m.selected--
			}
		case "down", "j":
			names := m.manager.ServiceNames()
			if m.selected < len(names)-1 {
				m.selected++
			}
		case "r":
			names := m.manager.ServiceNames()
			if m.selected < len(names) {
				_ = m.manager.RestartService(context.Background(), names[m.selected])
			}
		case "s":
			names := m.manager.ServiceNames()
			if m.selected < len(names) {
				name := names[m.selected]
				proc, ok := m.manager.GetProcess(name)
				if ok {
					status := proc.GetStatus()
					if status == process.StatusStopped || status == process.StatusCrashed {
						_ = m.manager.StartService(context.Background(), name)
					} else {
						_ = m.manager.StopService(name)
					}
				}
			}
		}

	case logMsg:
		line := process.LogLine(msg)
		m.logLines = append(m.logLines, line)
		if len(m.logLines) > maxLogLines {
			m.logLines = m.logLines[len(m.logLines)-maxLogLines:]
		}
		return m, m.listenForLogs()

	case tickMsg:
		return m, m.tick()

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}

	return m, nil
}

func (m Model) View() string {
	if m.quitting {
		return ""
	}

	var b strings.Builder

	// Header
	header := titleStyle.Render("⚡ Conductor") +
		lipgloss.NewStyle().Foreground(dimColor).Render(fmt.Sprintf(" — %s", m.manager.Config.Name))
	b.WriteString(header)
	b.WriteString("\n\n")

	// Service table header
	tableHeader := tableHeaderStyle.Render(
		fmt.Sprintf("  %-14s %-12s %-8s %-12s", "SERVICE", "STATUS", "PORT", "UPTIME"),
	)
	b.WriteString(tableHeader)
	b.WriteString("\n")

	// Service rows
	names := m.manager.ServiceNames()
	for i, name := range names {
		proc, ok := m.manager.GetProcess(name)
		if !ok {
			continue
		}

		status := proc.GetStatus()
		dot := statusDot[status.String()]
		if dot == "" {
			dot = "?"
		}

		dotStyled := styleForStatus(status).Render(dot)
		statusText := styleForStatus(status).Render(status.String())

		port := ""
		if m.manager.Config.Services[name].Port > 0 {
			port = fmt.Sprintf(":%d", m.manager.Config.Services[name].Port)
		}

		uptime := formatUptime(proc.Uptime())

		row := fmt.Sprintf("%s %-14s %-12s %-8s %-12s",
			dotStyled, name, statusText, port, uptime)

		if i == m.selected {
			row = selectedRowStyle.Render(row)
		} else {
			row = tableRowStyle.Render(row)
		}

		b.WriteString(row)
		b.WriteString("\n")
	}

	b.WriteString("\n")

	// Log panel
	logHeaderText := lipgloss.NewStyle().
		Foreground(dimColor).
		Bold(true).
		Render("─── Logs ")

	separator := lipgloss.NewStyle().
		Foreground(mutedColor).
		Render(strings.Repeat("─", max(0, m.width-12)))

	b.WriteString(logHeaderText + separator)
	b.WriteString("\n")

	// Calculate available log lines
	usedLines := len(names) + 7 // header + table header + gaps + log header + help
	availableLogLines := max(3, m.height-usedLines)

	start := 0
	if len(m.logLines) > availableLogLines {
		start = len(m.logLines) - availableLogLines
	}

	for _, line := range m.logLines[start:] {
		formatted := m.formatter.Format(line)
		// Truncate to terminal width
		if len(formatted) > m.width-2 {
			formatted = formatted[:m.width-2]
		}
		b.WriteString(" ")
		b.WriteString(formatted)
		b.WriteString("\n")
	}

	// Pad remaining log space
	displayedLines := min(len(m.logLines)-start, availableLogLines)
	for i := displayedLines; i < availableLogLines; i++ {
		b.WriteString("\n")
	}

	// Help bar
	help := helpStyle.Render("[↑/↓] select  [r] restart  [s] start/stop  [q] quit")
	b.WriteString("\n")
	b.WriteString(help)

	return b.String()
}

func styleForStatus(s process.Status) lipgloss.Style {
	switch s {
	case process.StatusRunning:
		return statusRunning
	case process.StatusHealthy:
		return statusHealthy
	case process.StatusStarting:
		return statusStarting
	case process.StatusStopped:
		return statusStopped
	case process.StatusCrashed:
		return statusCrashed
	case process.StatusUnhealthy:
		return statusUnhealthy
	default:
		return statusStopped
	}
}

func formatUptime(d time.Duration) string {
	if d == 0 {
		return "-"
	}
	d = d.Round(time.Second)

	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
