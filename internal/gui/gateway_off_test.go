package gui

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/settings"
)

// The Gateway page's switch: off, the app serves no gateway and nothing
// starts one — not a start, a restart, a take-over or the watch — until it
// is turned on again, which serves at once. The Settings page's own save
// leaves the switch alone, and the state says off for the page to draw.
func TestGatewayOff(t *testing.T) {
	h := t.TempDir()
	t.Setenv("HOME", h)
	t.Setenv("USERPROFILE", h)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(h, ".config"))
	t.Setenv("XDG_CACHE_HOME", filepath.Join(h, ".cache"))
	port := freePort(t)
	t.Setenv("MAGPIE_ADDR", "127.0.0.1:"+strconv.Itoa(port))
	t.Cleanup(func() {
		gatewayMu.Lock()
		defer gatewayMu.Unlock()
		if served.Load() != nil && servedRun.stop != nil {
			servedRun.stop()
			<-servedRun.done
		}
		served.Store(nil)
	})

	srv := Handler(webHost{func() {}}, nil)
	do := func(method, path, body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader(body)))
		return rec
	}
	turn := func(off bool) bool {
		t.Helper()
		rec := do("POST", "/api/gateway/off", `{"off":`+strconv.FormatBool(off)+`}`)
		var out gatewayFixJSON
		if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &out) != nil {
			t.Fatalf("turn %v: %d %s", off, rec.Code, rec.Body)
		}
		return out.OK
	}
	serves := func() bool {
		t.Helper()
		for deadline := time.Now().Add(5 * time.Second); ; time.Sleep(50 * time.Millisecond) {
			if answers(port) {
				return true
			}
			if time.Now().After(deadline) {
				return false
			}
		}
	}

	// serving, then off through the page's switch
	if gw := serveGateway(); gw == nil {
		t.Fatal("didn't serve")
	}
	if !serves() {
		t.Fatal("the gateway never answered")
	}
	if !turn(true) {
		t.Fatal("turning off failed")
	}
	if !settings.Load().GatewayOff {
		t.Fatal("the setting wasn't saved")
	}
	if served.Load() != nil {
		t.Fatal("still serving")
	}
	if serves() {
		t.Fatal("the port still answers")
	}
	if g := providersState().Gateway; !g.Off || g.Running || g.Mine {
		t.Fatalf("the state doesn't say off: %+v", g)
	}

	// nothing starts one while it is off
	if gw := serveGateway(); gw != nil {
		t.Fatal("a start served while off")
	}
	if out := restartGateway(); out.OK || out.Reason != "off" {
		t.Fatalf("restart while off: %+v", out)
	}
	if out := takeOverGateway(); out.OK || out.Reason != "off" {
		t.Fatalf("take-over while off: %+v", out)
	}

	// turning it off again is nothing new
	if !turn(true) {
		t.Fatal("turning off again failed")
	}

	// the Settings page's save, which sends what it was drawn with, leaves it
	if rec := do("POST", "/api/settings", `{"theme":"dark","lang":"en"}`); rec.Code != http.StatusOK {
		t.Fatalf("settings save: %d %s", rec.Code, rec.Body)
	}
	if !settings.Load().GatewayOff {
		t.Fatal("the Settings page's save turned the gateway on")
	}

	// and on again it serves at once
	if !turn(false) {
		t.Fatal("turning on failed")
	}
	if settings.Load().GatewayOff {
		t.Fatal("the setting wasn't saved")
	}
	if served.Load() == nil || !serves() {
		t.Fatal("the gateway wasn't served again")
	}
	if g := providersState().Gateway; g.Off || !g.Running || !g.Mine {
		t.Fatalf("the state doesn't say on: %+v", g)
	}

	// a sync or a restored backup never brings it from another computer
	in := settings.Settings{GatewayOff: true}
	in.KeepOwn(settings.Settings{GatewayOff: false})
	if in.GatewayOff {
		t.Fatal("KeepOwn: the switch came from another computer")
	}
}
