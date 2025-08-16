#!/usr/bin/env bash

set -euo pipefail

SERVICE_NAME="poker-server.service"

show_help() {
    cat << EOF
Usage: $0 <command>

Commands:
    start       Start the poker-server service
    stop        Stop the poker-server service
    restart     Restart the poker-server service
    status      Show service status
    logs        Show service logs (with follow)
    enable      Enable service to start on boot
    disable     Disable service from starting on boot
    health      Check health endpoints
    help        Show this help message

Examples:
    $0 start
    $0 status
    $0 logs
    $0 health
EOF
}

check_service() {
    if ! systemctl show "$SERVICE_NAME" >/dev/null 2>&1; then
        echo "Error: Service $SERVICE_NAME not found"
        exit 1
    fi
}

case "${1:-help}" in
    start)
        check_service
        echo "Starting $SERVICE_NAME..."
        sudo systemctl start "$SERVICE_NAME"
        echo "Service started successfully"
        ;;
    stop)
        check_service
        echo "Stopping $SERVICE_NAME..."
        sudo systemctl stop "$SERVICE_NAME"
        echo "Service stopped successfully"
        ;;
    restart)
        check_service
        echo "Restarting $SERVICE_NAME..."
        sudo systemctl restart "$SERVICE_NAME"
        echo "Service restarted successfully"
        ;;
    status)
        check_service
        sudo systemctl status "$SERVICE_NAME"
        ;;
    logs)
        check_service
        echo "Showing logs for $SERVICE_NAME (press Ctrl+C to exit)..."
        sudo journalctl -u "$SERVICE_NAME" -f
        ;;
    enable)
        check_service
        echo "Enabling $SERVICE_NAME to start on boot..."
        sudo systemctl enable "$SERVICE_NAME"
        echo "Service enabled successfully"
        ;;
    disable)
        check_service
        echo "Disabling $SERVICE_NAME from starting on boot..."
        sudo systemctl disable "$SERVICE_NAME"
        echo "Service disabled successfully"
        ;;
    health)
        echo "Checking health endpoints..."
        echo "Health check:"
        if curl -fsS -m 3 "http://127.0.0.1:8080/healthz" >/dev/null 2>&1; then
            echo "  ✓ /healthz - OK"
        else
            echo "  ✗ /healthz - FAILED"
        fi
        
        echo "Ready check:"
        if curl -fsS -m 3 "http://127.0.0.1:8080/readyz" >/dev/null 2>&1; then
            echo "  ✓ /readyz - OK"
        else
            echo "  ✗ /readyz - FAILED"
        fi
        ;;
    help|*)
        show_help
        ;;
esac
