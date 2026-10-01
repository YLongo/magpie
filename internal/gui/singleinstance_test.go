//go:build !nogui

package gui

import (
	"runtime"
	"testing"
)

// The fork runs the single-instance handover on the Mac too: the autostart
// LaunchAgent's `magpie tray` and the session-restored app would otherwise
// both live after a reboot, for neither went through LaunchServices.
func TestSingleInstanceOnTheMac(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("the fork's change is darwin's alone")
	}
	if singleInstance(&host{}) == nil {
		t.Fatal("darwin gave no single-instance options: a second launch would stay a second app")
	}
}
