package gui

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/yetone/magpie/internal/agent"
	"github.com/yetone/magpie/internal/settings"
)

// The Gateway page's switch: off, the app serves no gateway — its window,
// pages and background work stay, but nothing answers the port, and the
// agents wired to magpie get no model until it is on again (skills and
// MCP servers of the agents' own stay: they don't go through it; magpie's
// image MCP does). Quitting did that already by ending the process; the
// switch ends the serving alone, doing what quit does for the agents
// pointed at the gateway: failover comes out of Codex's config, so it
// goes straight to OpenAI instead of retrying a port that no longer
// answers, and the Codex threads still open are left a relay at the
// address they hold (OnShutdown's gateway half). `magpie serve` serves
// whatever the switch says: it is the app's alone.

// gatewayOffRoutes: POST /api/gateway/off {"off": true | false} turns the
// gateway off or on, saving the setting first: the watch and every start
// read it (serveGatewayLocked), so an off gateway stays off.
func gatewayOffRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/gateway/off", func(rw http.ResponseWriter, r *http.Request) {
		var in struct {
			Off bool `json:"off"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			fail(rw, err)
			return
		}
		writeJSON(rw, turnGateway(in.Off))
	})
}

// turnGateway turns the gateway this app serves off, or on again, and says
// how the on went: an off one is off whatever held the port, and an on one
// is what startHere says of taking it.
func turnGateway(off bool) gatewayFixJSON {
	if s := settings.Load(); s.GatewayOff && off {
		return gatewayFixJSON{OK: true} // already off: nothing to stop
	}
	s := settings.Load()
	s.GatewayOff = off
	if err := settings.Save(s); err != nil {
		return gatewayFixJSON{Reason: "error", Error: err.Error()}
	}
	gatewayMu.Lock()
	defer gatewayMu.Unlock()
	if off {
		stopGatewayLocked()
		return gatewayFixJSON{OK: true}
	}
	// the failover that stopping took out of Codex's config is written
	// again by its Sync, as at a start
	go syncCodex()
	return startHere()
}

// syncCodex sets Codex's config again, which writes account failover back
// where it belongs.
func syncCodex() {
	for _, a := range agent.All() {
		if a.ID == "codex" && a.Sync != nil {
			if err := a.Sync(); err != nil {
				log.Println("codex sync:", err)
			}
		}
	}
}

// stopGatewayLocked stops the gateway this process serves, waiting for the
// requests in flight, and does what quit does for the agents pointed at
// it (EndCodexFailover, RelayOpenCodex); under gatewayMu.
func stopGatewayLocked() {
	if gw := served.Load(); gw != nil {
		if servedRun.stop != nil {
			servedRun.stop()
			<-servedRun.done
		}
		served.CompareAndSwap(gw, nil)
		ended, err := agent.EndCodexFailover()
		if err != nil {
			log.Println("codex failover:", err)
		}
		// the threads Codex has open keep the gateway's address they began
		// with: a relay serves them there on Codex's own sign-in once the
		// gateway has let go
		if ended {
			if err := agent.RelayOpenCodex(); err != nil {
				log.Println("codex relay:", err)
			}
		}
	}
}
