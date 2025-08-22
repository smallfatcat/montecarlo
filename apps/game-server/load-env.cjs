const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadIfExists(filePath) {
	if (fs.existsSync(filePath)) {
		dotenv.config({ path: filePath });
	}
}

// Resolve directories
const pkgDir = __dirname; // apps/game-server
const rootDir = path.resolve(pkgDir, '..', '..'); // monorepo root

// Precedence (last loaded wins in our sequence, so load low -> high precedence):
// 1) root .env
// 2) root .env.local
// 3) package .env
// 4) package .env.local
loadIfExists(path.join(rootDir, '.env'));
loadIfExists(path.join(rootDir, '.env.local'));
loadIfExists(path.join(pkgDir, '.env'));
loadIfExists(path.join(pkgDir, '.env.local'));
