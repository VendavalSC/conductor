package logmux

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/vendi/conductor/internal/process"
)

var serviceColors = map[string]lipgloss.Color{
	"cyan":    lipgloss.Color("#00D4FF"),
	"green":   lipgloss.Color("#00FF88"),
	"yellow":  lipgloss.Color("#FFD700"),
	"magenta": lipgloss.Color("#FF44CC"),
	"blue":    lipgloss.Color("#4488FF"),
	"red":     lipgloss.Color("#FF4444"),
	"orange":  lipgloss.Color("#FF8800"),
	"purple":  lipgloss.Color("#AA44FF"),
	"pink":    lipgloss.Color("#FF66AA"),
	"white":   lipgloss.Color("#CCCCCC"),
}

type Formatter struct {
	maxNameLen int
	colorMap   map[string]lipgloss.Style
}

func NewFormatter(serviceNames []string, serviceColors map[string]string) *Formatter {
	f := &Formatter{
		colorMap: make(map[string]lipgloss.Style),
	}

	for _, name := range serviceNames {
		if len(name) > f.maxNameLen {
			f.maxNameLen = len(name)
		}
	}

	for _, name := range serviceNames {
		color := resolveColor(serviceColors[name])
		f.colorMap[name] = lipgloss.NewStyle().
			Foreground(color).
			Bold(true)
	}

	return f
}

func (f *Formatter) Format(line process.LogLine) string {
	nameStyle, ok := f.colorMap[line.Service]
	if !ok {
		nameStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
	}

	paddedName := padRight(line.Service, f.maxNameLen)
	prefix := nameStyle.Render(paddedName)
	separator := lipgloss.NewStyle().Foreground(lipgloss.Color("#555555")).Render(" │ ")

	text := line.Text
	if line.IsStderr {
		text = lipgloss.NewStyle().Foreground(lipgloss.Color("#FF6666")).Render(text)
	}

	return fmt.Sprintf("%s%s%s", prefix, separator, text)
}

func resolveColor(name string) lipgloss.Color {
	if c, ok := serviceColors[name]; ok {
		return c
	}
	if strings.HasPrefix(name, "#") {
		return lipgloss.Color(name)
	}
	return lipgloss.Color("#00D4FF")
}

func padRight(s string, length int) string {
	if len(s) >= length {
		return s
	}
	return s + strings.Repeat(" ", length-len(s))
}
