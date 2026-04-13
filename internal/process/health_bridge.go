package process

import (
	"net/http"
	"time"

	"github.com/vendi/conductor/internal/config"
)

// checkHealth is a lightweight startup check. Full monitoring is in the health package.
func checkHealth(h *config.HealthCheck) bool {
	if h.URL != "" {
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get(h.URL)
		if err != nil {
			return false
		}
		resp.Body.Close()
		return resp.StatusCode >= 200 && resp.StatusCode < 400
	}
	return false
}
