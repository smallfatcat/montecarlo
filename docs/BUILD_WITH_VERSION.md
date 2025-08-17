# Building with Automatic Version Generation

This document explains how to use the new automatic version generation feature that runs after every build.

## 🚀 Quick Start

### Standard Build (with automatic version generation)
```bash
# This will build everything and automatically generate version info
npm run build:all
```

### Explicit Build with Version Generation
```bash
# This explicitly runs the build and then version generation
npm run build:with-version
```

### Deployment-Ready Build
```bash
# This forces fresh version generation (useful for deployment)
npm run build:deploy
```

### Manual Version Generation Only
```bash
# Generate version information without building
bash scripts/version.sh generate
```

## 🔧 How It Works

### Automatic Post-Build Hooks

The monorepo now includes automatic post-build hooks that run the version generation script after every build:

- **`postbuild:all`**: Runs after `npm run build:all` completes
- **Version generation**: Automatically creates VERSION files for all components
- **Build info**: Generates comprehensive BUILD_INFO file
- **Smart caching**: Only regenerates when commit hash changes

### What Gets Generated

After each build, the system automatically creates:

```
montecarlo/
├── VERSION                    # Root version with build metadata
├── BUILD_INFO                # Comprehensive build information
├── packages/
│   ├── shared/VERSION       # Shared package version
│   └── poker-engine/VERSION # Poker engine version
├── apps/
│   └── game-server/VERSION  # Game server version
└── vite-app/VERSION         # Frontend version
```

### Version Format

Each VERSION file contains:
```
MAJOR.MINOR.PATCH-build.BUILD_NUMBER
```

**Example:** `0.3.0-build.83`

## 📋 Available Scripts

### Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build:all` | Build all packages and apps (with auto-version) |
| `npm run build:packages` | Build only packages |
| `npm run build:apps` | Build only apps |
| `npm run build:with-version` | Explicit build + version generation |

### Version Scripts

| Script | Description |
|--------|-------------|
| `bash scripts/version.sh generate` | Generate all version files |
| `bash scripts/version.sh show` | Show current version info |
| `bash scripts/version.sh tag` | Create new version tag |

## 🎯 Use Cases

### Development Workflow

1. **Daily Development**
   ```bash
   # Make changes and commit
   git add .
   git commit -m "Add new feature"
   
   # Build with automatic versioning
   npm run build:all
   ```

2. **Release Preparation**
   ```bash
   # Build everything with version info
   npm run build:with-version
   
   # Check generated versions
   cat vite-app/VERSION
   cat BUILD_INFO
   ```

3. **CI/CD Integration**
   ```bash
   # The build process automatically includes version info
   npm run build:all
   
   # Version files are ready for deployment
   ```

### Frontend Integration

The generated version information is automatically available in your frontend:

- **VERSION file**: Available at `/VERSION` endpoint
- **BUILD_INFO**: Available at `/BUILD_INFO` endpoint
- **VersionDisplay component**: Automatically shows current version

**Note**: The BUILD_INFO and VERSION files are automatically copied to the `dist/` directory during the frontend build process, ensuring they're available when the app is served.

### Deployment

For deployment to GitHub Pages or other static hosting:

```bash
# From vite-app directory
npm run deploy

# This automatically:
# 1. Generates fresh version information
# 2. Builds the frontend
# 3. Copies version files to dist/
# 4. Deploys to GitHub Pages
```

**Important**: The deployment process now automatically generates fresh version information, ensuring your deployed app always has current version details.

## 🔍 Troubleshooting

### Common Issues

1. **Version script not found**
   ```bash
   # Make sure the script is executable
   chmod +x scripts/version.sh
   ```

2. **Version files not generated**
   ```bash
   # Check if build completed successfully
   npm run build:all
   
   # Manually generate versions
   bash scripts/version.sh generate
   ```

3. **BUILD_INFO 404 error in frontend**
   ```bash
   # This happens when BUILD_INFO isn't copied to dist/
   # Solution: Rebuild the frontend to copy version files
   cd vite-app && npm run build
   
   # Or rebuild everything from root
   npm run build:all
   ```

4. **Duplicate version generation**
   - This is normal behavior with npm workspaces
   - The script is smart and only regenerates when needed
   - Check the output for "Version information is already current"

### Debug Commands

```bash
# Check current git status
git status

# View generated version files
find . -name "VERSION" -exec echo "=== {} ===" \; -exec cat {} \;

# Check build info
cat BUILD_INFO

# Test version script directly
bash scripts/version.sh show
```

## 📚 Best Practices

### Development

1. **Always commit before building**
   - Ensures accurate build numbers
   - Prevents "dirty" status in versions

2. **Use semantic versioning**
   - Follow MAJOR.MINOR.PATCH format
   - Update package.json versions appropriately

3. **Let automation handle versioning**
   - Don't manually edit VERSION files
   - They're regenerated automatically after each build

### Deployment

1. **Include version files**
   - VERSION files should be deployed with your app
   - BUILD_INFO provides comprehensive deployment tracking

2. **Version tracking**
   - Use generated versions for release notes
   - Track which commit corresponds to which deployment

## 🔄 Migration from Manual Versioning

If you were previously running version generation manually:

### Before
```bash
# Old workflow
npm run build:all
bash scripts/version.sh generate  # Manual step
```

### After
```bash
# New workflow - automatic!
npm run build:all  # Version generation happens automatically
```

The version generation is now completely transparent and requires no additional steps in your build process.
