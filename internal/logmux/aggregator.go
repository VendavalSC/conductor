package logmux

import (
	"fmt"

	"github.com/vendi/conductor/internal/process"
)

type Aggregator struct {
	formatter *Formatter
	logCh     <-chan process.LogLine
}

func NewAggregator(logCh <-chan process.LogLine, formatter *Formatter) *Aggregator {
	return &Aggregator{
		formatter: formatter,
		logCh:     logCh,
	}
}

// Stream prints log lines to stdout until the channel closes.
func (a *Aggregator) Stream() {
	for line := range a.logCh {
		fmt.Println(a.formatter.Format(line))
	}
}
