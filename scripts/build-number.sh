#!/usr/bin/env bash
set -euo pipefail

# Simple build number generator for CI/CD integration
# This script generates build numbers based on git information

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Get build number from git
get_build_number() {
    cd "$ROOT_DIR"
    
    # Get commit count since last tag, or total commits if no tags
    local tag_count=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [[ -n "$tag_count" ]]; then
        # Count commits since last tag
        git rev-list --count HEAD ^"$tag_count"
    else
        # No tags, count total commits
        git rev-list --count HEAD
    fi
}

# Get short commit hash
get_commit_hash() {
    cd "$ROOT_DIR"
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# Get current branch
get_branch() {
    cd "$ROOT_DIR"
    git branch --show-current 2>/dev/null || echo "unknown"
}

# Get build date
get_build_date() {
    date -u +"%Y%m%d.%H%M%S"
}

# Generate build number string
generate_build_number() {
    local build_num=$(get_build_number)
    local commit_hash=$(get_commit_hash)
    local branch=$(get_branch)
    local build_date=$(get_build_date)
    
    echo "build.$build_num.$commit_hash.$branch.$build_date"
}

# Main execution
case "${1:-build}" in
    "build")
        generate_build_number
        ;;
    "number")
        get_build_number
        ;;
    "hash")
        get_commit_hash
        ;;
    "branch")
        get_branch
        ;;
    "date")
        get_build_date
        ;;
    "help"|"--help"|"-h")
        cat << EOF
Usage: $0 [COMMAND]

Commands:
    build           Generate full build number string (default)
    number          Get build number only
    hash            Get commit hash only
    branch          Get branch name only
    date            Get build date only
    help            Show this help message

Examples:
    $0              # Generate full build number
    $0 number       # Get build number only
    $0 hash         # Get commit hash only
EOF
        ;;
    *)
        echo "Unknown command: $1" >&2
        echo "Use '$0 help' for usage information" >&2
        exit 1
        ;;
esac
