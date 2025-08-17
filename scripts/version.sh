#!/usr/bin/env bash
set -euo pipefail

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT_DIR/VERSION"
BUILD_INFO_FILE="$ROOT_DIR/BUILD_INFO"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get git information
get_git_info() {
    if [[ ! -d "$ROOT_DIR/.git" ]]; then
        log_error "Not a git repository"
        exit 1
    fi
    
    cd "$ROOT_DIR"
    
    # Get current branch
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Get latest tag
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    
    # Get commit count since last tag
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    
    # Get short commit hash
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Get build date
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Get build number (commit count since last tag)
    BUILD_NUMBER=$COMMIT_COUNT
    
    # Get dirty status
    if [[ -n "$(git status --porcelain)" ]]; then
        DIRTY_STATUS="dirty"
    else
        DIRTY_STATUS="clean"
    fi
}

# Generate simple version with build number
generate_semver() {
    # Read version from root package.json
    local package_version="0.0.0"
    if [[ -f "package.json" ]]; then
        local root_path=$(realpath ".")
        package_version=$(node -e "console.log(require('$root_path/package.json').version)")
    fi
    
    # Add build number
    local build_metadata="build.$BUILD_NUMBER"
    if [[ "$DIRTY_STATUS" == "dirty" ]]; then
        build_metadata="$build_metadata.dirty"
    fi
    
    echo "$package_version-$build_metadata"
}

# Generate version files for each component
generate_component_versions() {
    log_info "Generating version files for components..."
    
    # Root package.json version
    local root_version=$(generate_semver)
    log_info "Root version: $root_version"
    
    # Generate version files for each package
    for pkg in packages/*/; do
        if [[ -f "$pkg/package.json" ]]; then
            local pkg_name=$(basename "$pkg")
            local pkg_path=$(realpath "$pkg")
            local pkg_version=$(node -e "console.log(require('$pkg_path/package.json').version)")
            local pkg_build_version="$pkg_version-build.$BUILD_NUMBER"
            
            # Create version file
            echo "$pkg_build_version" > "$pkg/VERSION"
            echo "Generated VERSION file for $pkg_name: $pkg_build_version"
        fi
    done
    
    # Generate version files for each app
    for app in apps/*/; do
        if [[ -f "$app/package.json" ]]; then
            local app_name=$(basename "$app")
            local app_path=$(realpath "$app")
            local app_version=$(node -e "console.log(require('$app_path/package.json').version)")
            local app_build_version="$app_version-build.$BUILD_NUMBER"
            
            # Create version file
            echo "$app_build_version" > "$app/VERSION"
            echo "Generated VERSION file for $app_name: $app_build_version"
        fi
    done
    
    # Generate version file for vite-app
    if [[ -f "vite-app/package.json" ]]; then
        local vite_path=$(realpath "vite-app")
        local vite_version=$(node -e "console.log(require('$vite_path/package.json').version)")
        local vite_build_version="$vite_version-build.$BUILD_NUMBER"
        echo "$vite_build_version" > "vite-app/VERSION"
        echo "Generated VERSION file for vite-app: $vite_build_version"
        
        # Also copy BUILD_INFO to vite-app for frontend access
        if [[ -f "$BUILD_INFO_FILE" ]]; then
            cp "$BUILD_INFO_FILE" "vite-app/BUILD_INFO"
            echo "Copied BUILD_INFO to vite-app for frontend access"
        fi
    fi
}

# Generate build info file
generate_build_info() {
    log_info "Generating build info file..."
    
    cat > "$BUILD_INFO_FILE" << EOF
# Build Information
# Generated on: $BUILD_DATE

BUILD_VERSION=$(generate_semver)
BUILD_NUMBER=$BUILD_NUMBER
BUILD_DATE=$BUILD_DATE
BUILD_COMMIT=$COMMIT_HASH
BUILD_BRANCH=$BRANCH
BUILD_STATUS=$DIRTY_STATUS
LATEST_TAG=$LATEST_TAG
COMMIT_COUNT=$COMMIT_COUNT

# Component Versions
EOF
    
    # Add component versions
    for pkg in packages/*/; do
        if [[ -f "$pkg/VERSION" ]]; then
            local pkg_name=$(basename "$pkg")
            echo "${pkg_name^^}_VERSION=$(cat "$pkg/VERSION")" >> "$BUILD_INFO_FILE"
        fi
    done
    
    for app in apps/*/; do
        if [[ -f "$app/VERSION" ]]; then
            local app_name=$(basename "$app")
            echo "${app_name^^}_VERSION=$(cat "$app/VERSION")" >> "$BUILD_INFO_FILE"
        fi
    done
    
    if [[ -f "vite-app/VERSION" ]]; then
        echo "VITE_APP_VERSION=$(cat "vite-app/VERSION")" >> "$BUILD_INFO_FILE"
    fi
    
    log_success "Build info written to $BUILD_INFO_FILE"
}

# Generate version header for C/C++ projects (if needed)
generate_version_header() {
    local header_file="$ROOT_DIR/src/version.h"
    local header_dir=$(dirname "$header_file")
    
    if [[ ! -d "$header_dir" ]]; then
        mkdir -p "$header_dir"
    fi
    
    cat > "$header_file" << EOF
// Auto-generated version header
// Generated on: $BUILD_DATE

#ifndef VERSION_H
#define VERSION_H

#define VERSION_MAJOR $(echo "$(generate_semver)" | cut -d. -f1)
#define VERSION_MINOR $(echo "$(generate_semver)" | cut -d. -f1)
#define VERSION_PATCH $(echo "$(generate_semver)" | cut -d. -f1)
#define VERSION_BUILD $BUILD_NUMBER
#define VERSION_COMMIT "$COMMIT_HASH"
#define VERSION_BRANCH "$BRANCH"
#define VERSION_STRING "$(generate_semver)"

#endif // VERSION_H
EOF
    
    log_info "Generated version header: $header_file"
}

# Show current version information
show_version_info() {
    log_info "Current Version Information:"
    echo "  Root Version: $(generate_semver)"
    echo "  Build Number: $BUILD_NUMBER"
    echo "  Commit Hash: $COMMIT_HASH"
    echo "  Branch: $BRANCH"
    echo "  Status: $DIRTY_STATUS"
    echo "  Latest Tag: $LATEST_TAG"
    echo "  Commits Since Tag: $COMMIT_COUNT"
    echo "  Build Date: $BUILD_DATE"
}

# Main function
main() {
    local action="${1:-generate}"
    
    case "$action" in
        "generate"|"gen")
            log_info "Generating version information..."
            get_git_info
            
            # Check if we need to regenerate (avoid redundant generation)
            # Skip this check if FORCE_GENERATE is set (useful for deployment)
            if [[ "${FORCE_GENERATE:-}" != "true" && -f "$BUILD_INFO_FILE" ]]; then
                local existing_build_date=$(grep "^BUILD_DATE=" "$BUILD_INFO_FILE" | cut -d= -f2 2>/dev/null || echo "")
                local existing_commit=$(grep "^BUILD_COMMIT=" "$BUILD_INFO_FILE" | cut -d= -f2 2>/dev/null || echo "")
                
                if [[ "$existing_commit" == "$COMMIT_HASH" && "$existing_build_date" != "" ]]; then
                    log_info "Version information is already current for commit $COMMIT_HASH"
                    show_version_info
                    return 0
                fi
            fi
            
            generate_build_info
            generate_component_versions
            generate_version_header
            show_version_info
            log_success "Version generation complete!"
            ;;
        "show"|"info")
            get_git_info
            show_version_info
            ;;
        "tag")
            log_info "Creating new version tag..."
            get_git_info
            local new_version=$(generate_semver | cut -d- -f1)
            log_info "New version: $new_version"
            read -p "Create tag v$new_version? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git tag "v$new_version"
                log_success "Created tag v$new_version"
            else
                log_info "Tag creation cancelled"
            fi
            ;;
        "help"|"--help"|"-h")
            cat << EOF
Usage: $0 [COMMAND]

Commands:
    generate, gen    Generate version files for all components (default)
    show, info       Show current version information
    tag              Create a new version tag
    help             Show this help message

Examples:
    $0               # Generate all version files
    $0 show          # Show current version info
    $0 tag           # Create new version tag
EOF
            ;;
        *)
            log_error "Unknown command: $action"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
