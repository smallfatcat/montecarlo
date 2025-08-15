# Versioning and Build Number System

This document explains how to use the comprehensive versioning and build number system implemented in the Monte Carlo project.

## 🎯 Overview

The project implements a sophisticated versioning system that automatically generates:
- **Build numbers** based on git commit counts
- **Semantic versions** with build metadata
- **Component-specific versions** for each package and app
- **Build information files** for deployment tracking
- **GitHub Actions integration** for automated releases

## 🚀 Quick Start

### Generate Version Information
```bash
# Generate all version files
./scripts/version.sh generate

# Show current version info
./scripts/version.sh show

# Create a new version tag
./scripts/version.sh tag
```

### Get Build Numbers
```bash
# Get full build number string
./scripts/build-number.sh

# Get specific components
./scripts/build-number.sh number    # Build number only
./scripts/build-number.sh hash      # Commit hash only
./scripts/build-number.sh branch    # Branch name only
./scripts/build-number.sh date      # Build date only
```

### Build with Versioning
```bash
# Build everything with automatic version generation
./rebuild.sh
```

## 📋 Version Format

### Semantic Version with Build Metadata
```
MAJOR.MINOR.PATCH-build.BUILD_NUMBER+COMMIT_HASH.STATUS
```

**Example:** `0.0.48-build.48+6f42633.dirty`

- **0.0.48**: Base semantic version
- **build.48**: Build number (commits since last tag)
- **6f42633**: Short commit hash
- **dirty**: Git working directory status

### Build Number Format
```
build.BUILD_NUMBER.COMMIT_HASH.BRANCH.BUILD_DATE
```

**Example:** `build.48.6f42633.multiplay.20250815.023050`

## 🏗️ Architecture

### Files Generated
```
montecarlo/
├── VERSION                    # Root version
├── BUILD_INFO                # Comprehensive build information
├── packages/
│   ├── shared/VERSION       # Shared package version
│   └── poker-engine/VERSION # Poker engine version
├── apps/
│   └── game-server/VERSION  # Game server version
└── vite-app/VERSION         # Frontend version
```

### Build Info Structure
```bash
# Build Information
BUILD_VERSION=0.0.48-build.48+6f42633.dirty
BUILD_NUMBER=48
BUILD_DATE=2025-08-15T02:30:55Z
BUILD_COMMIT=6f42633
BUILD_BRANCH=multiplay
BUILD_STATUS=dirty
LATEST_TAG=v0.0.0
COMMIT_COUNT=48

# Component Versions
POKER-ENGINE_VERSION=0.0.48-build.48+6f42633.dirty
SHARED_VERSION=0.0.48-build.48+6f42633.dirty
GAME-SERVER_VERSION=0.0.48-build.48+6f42633.dirty
VITE_APP_VERSION=0.0.48-build.48+6f42633.dirty
```

## 🔧 Scripts Reference

### `scripts/version.sh`

**Commands:**
- `generate` / `gen`: Generate all version files (default)
- `show` / `info`: Display current version information
- `tag`: Create a new version tag
- `help`: Show usage information

**Features:**
- Automatic semantic version generation
- Component-specific version files
- Build metadata inclusion
- Git status detection
- C/C++ header generation

### `scripts/build-number.sh`

**Commands:**
- `build`: Generate full build number string (default)
- `number`: Get build number only
- `hash`: Get commit hash only
- `branch`: Get branch name only
- `date`: Get build date only

**Use Cases:**
- CI/CD integration
- Docker image tagging
- Deployment tracking
- Build artifact naming

## 🚀 CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/version-and-build.yml` workflow provides:

1. **Automatic Version Generation**
   - Runs on every push/PR
   - Generates version information
   - Creates build artifacts

2. **Multi-Node Testing**
   - Tests on Node.js 18 and 20
   - Ensures compatibility

3. **Automated Releases**
   - Creates GitHub releases
   - Tags with semantic versions
   - Includes build metadata

### Manual Release
```bash
# Trigger manual release workflow
# Go to GitHub Actions → Version and Build → Run workflow
# Select version type: major, minor, or patch
```

## 🎨 Frontend Integration

### Version Display Component

The `VersionDisplay` component shows version information in the UI:

```tsx
import VersionDisplay from './components/VersionDisplay';

function App() {
  return (
    <div>
      <h1>Monte Carlo Poker</h1>
      <VersionDisplay />
      {/* Rest of your app */}
    </div>
  );
}
```

### Features:
- Expandable version information
- Build number display
- Component version breakdown
- Responsive design
- Professional styling

## 📊 Version Management

### Creating New Versions

1. **Automatic (Recommended)**
   ```bash
   # The system automatically increments versions based on commits
   ./scripts/version.sh generate
   ```

2. **Manual Tag Creation**
   ```bash
   # Create a new semantic version tag
   ./scripts/version.sh tag
   git push --tags
   ```

3. **GitHub Release**
   - Use the GitHub Actions workflow
   - Select version type (major/minor/patch)
   - Automatic release creation

### Version Increment Rules

- **Patch**: Bug fixes, minor changes
- **Minor**: New features, backward compatible
- **Major**: Breaking changes, major features

## 🔍 Troubleshooting

### Common Issues

1. **"Not a git repository"**
   - Ensure you're in the project root
   - Check that `.git` directory exists

2. **Version files not generated**
   - Run `./scripts/version.sh generate`
   - Check file permissions on scripts

3. **Build numbers not updating**
   - Commit your changes
   - Check git status
   - Verify tag history

### Debug Commands

```bash
# Check git status
git status

# View commit history
git log --oneline

# Check tags
git tag -l

# Verify script permissions
ls -la scripts/*.sh
```

## 📚 Best Practices

### Development Workflow

1. **Always commit before building**
   - Ensures accurate build numbers
   - Prevents "dirty" status

2. **Use semantic versioning**
   - Follow MAJOR.MINOR.PATCH format
   - Document breaking changes

3. **Tag important releases**
   - Use `./scripts/version.sh tag`
   - Push tags to remote

4. **Integrate with CI/CD**
   - Use GitHub Actions workflow
   - Automate version generation

### Version File Management

- **Don't edit VERSION files manually**
- **Commit VERSION files to git**
- **Use scripts for all version operations**
- **Include version info in releases**

## 🔮 Future Enhancements

### Planned Features

1. **Docker Integration**
   - Automatic image tagging
   - Multi-arch builds

2. **Release Notes Generation**
   - Automatic changelog creation
   - Commit message parsing

3. **Version Compatibility Checking**
   - Dependency version validation
   - Breaking change detection

4. **Rollback Support**
   - Version rollback scripts
   - Database migration tracking

## 📞 Support

For questions or issues with the versioning system:

1. Check this documentation
2. Review script help: `./scripts/version.sh help`
3. Examine generated files
4. Check GitHub Actions logs
5. Open an issue in the repository

---

**Last Updated:** 2025-08-15  
**Version:** 0.0.48-build.48+6f42633.dirty
