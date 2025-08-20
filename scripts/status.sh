#!/usr/bin/env bash

set -euo pipefail

# Configurable paths
REPO_ROOT="/home/smallfatcat/projects/montecarlo"
ENV_FILE="$REPO_ROOT/apps/game-server/.env"
CLOUDFLARED_CONFIG="/etc/cloudflared/config.yml"
CF_TUNNEL_NAME="${1:-poker}"

# Defaults
PORT="8080"
HOSTNAME=""
CF_CFG_TXT=""

color() {
	local code="$1"; shift
	printf "\033[%sm%s\033[0m" "$code" "$*"
}

section() {
	echo
	color 1 "$1"
	echo
}

kv() {
	printf "  %-18s %s\n" "$1" "$2"
}

# Read PORT from .env if present
if [[ -f "$ENV_FILE" ]]; then
	line=$(grep -E '^PORT=' "$ENV_FILE" | tail -n1 || true)
	if [[ -n "${line:-}" ]]; then
		PORT="${line#PORT=}"
	fi
fi

# Try to discover Cloudflare hostname
if command -v cloudflared >/dev/null 2>&1; then
    # Prefer running under the invoking user to access their tunnel context
    USER_BIN="cloudflared"
    if [[ -n "${SUDO_USER:-}" ]]; then
        USER_BIN=(sudo -n -u "$SUDO_USER" cloudflared)
    fi
    info=$(${USER_BIN[@]} tunnel info "$CF_TUNNEL_NAME" 2>/dev/null || true)
    if [[ -n "$info" ]]; then
        maybe=$(printf "%s\n" "$info" | grep -E '^\s*Hostname:\s*' | head -n1 | sed -E 's/^\s*Hostname:\s*//' || true)
        if [[ -n "${maybe:-}" ]]; then HOSTNAME="$maybe"; fi
    fi
fi
# If still no hostname, parse from /etc/cloudflared/config.yml ingress
if [[ -z "$HOSTNAME" && -f "$CLOUDFLARED_CONFIG" ]]; then
    # Try reading plainly first
    if CF_CFG_TXT=$(cat "$CLOUDFLARED_CONFIG" 2>/dev/null); then :; fi
    # If empty, try sudo non-interactively
    if [[ -z "$CF_CFG_TXT" ]]; then CF_CFG_TXT=$(sudo -n cat "$CLOUDFLARED_CONFIG" 2>/dev/null || true); fi
    # Parse hostname
    if [[ -n "$CF_CFG_TXT" ]]; then
        maybe=$(printf "%s\n" "$CF_CFG_TXT" | grep -E '^\s*hostname:\s*' | head -n1 | awk '{print $2}' || true)
        if [[ -n "${maybe:-}" ]]; then HOSTNAME="$maybe"; fi
    fi
fi

# Guess cloudflared unit name
UNIT_CLOUDFLARED=""
for u in cloudflared@poker.service cloudflared.service cloudflared-tunnel.service; do
	if systemctl list-unit-files | grep -q "^${u//./\\.}"; then
		UNIT_CLOUDFLARED="$u"
		break
	fi
done

UNIT_SERVER="poker-server.service"

section "Services"
if systemctl show -p ActiveState "$UNIT_SERVER" >/dev/null 2>&1; then
	state=$(systemctl is-active "$UNIT_SERVER" || true)
	enabled=$(systemctl is-enabled "$UNIT_SERVER" || true)
	kv "game-server" "${state} (${enabled})"
else
	kv "game-server" "not installed"
fi

if [[ -n "$UNIT_CLOUDFLARED" ]]; then
	cf_state=$(systemctl is-active "$UNIT_CLOUDFLARED" || true)
	cf_enabled=$(systemctl is-enabled "$UNIT_CLOUDFLARED" || true)
	kv "cloudflared" "${cf_state} (${cf_enabled}) [$UNIT_CLOUDFLARED]"
else
	kv "cloudflared" "unit not found"
fi

section "Local health checks"
kv "HTTP" "http://148.230.118.4:${PORT}/healthz"
if curl -fsS -m 3 "http://148.230.118.4:${PORT}/healthz" >/dev/null 2>&1; then
	kv "healthz" "$(color 32 OK)"
else
	kv "healthz" "$(color 31 FAIL)"
fi
if curl -fsS -m 3 "http://148.230.118.4:${PORT}/readyz" >/dev/null 2>&1; then
	kv "readyz" "$(color 32 OK)"
else
	kv "readyz" "$(color 33 WARN)"
fi

section "Tunnel checks"
if command -v cloudflared >/dev/null 2>&1; then
    if [[ -n "${SUDO_USER:-}" ]]; then
        if sudo -n -u "$SUDO_USER" cloudflared tunnel list >/dev/null 2>&1; then
            kv "tunnel name" "$CF_TUNNEL_NAME"
            sudo -n -u "$SUDO_USER" cloudflared tunnel list | awk 'NR==1 || $2=="'"$CF_TUNNEL_NAME"'"' | sed 's/^/  /'
        else
            kv "tunnel list" "not accessible"
        fi
    else
        if cloudflared tunnel list >/dev/null 2>&1; then
            kv "tunnel name" "$CF_TUNNEL_NAME"
            cloudflared tunnel list | awk 'NR==1 || $2=="'"$CF_TUNNEL_NAME"'"' | sed 's/^/  /'
        else
            kv "tunnel list" "not accessible"
        fi
    fi
else
    kv "cloudflared" "binary not found"
fi

if [[ -n "$HOSTNAME" ]]; then
    kv "hostname" "$HOSTNAME"
    if curl -fsS -m 5 "https://${HOSTNAME}/healthz" >/dev/null 2>&1; then
        kv "via tunnel" "$(color 32 OK)"
    else
        kv "via tunnel" "$(color 31 FAIL)"
    fi
else
    kv "hostname" "not found (no read access to $CLOUDFLARED_CONFIG)"
fi

# Optional: show brief status lines
section "Systemd summary"
if systemctl show "$UNIT_SERVER" >/dev/null 2>&1; then
	systemctl show "$UNIT_SERVER" -p ActiveState,SubState,ExecMainStatus | sed 's/^/  /'
fi
if [[ -n "$UNIT_CLOUDFLARED" ]] && systemctl show "$UNIT_CLOUDFLARED" >/dev/null 2>&1; then
	systemctl show "$UNIT_CLOUDFLARED" -p ActiveState,SubState,ExecMainStatus | sed 's/^/  /'
fi

echo
exit 0

