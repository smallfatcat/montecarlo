## Montecarlo

A small Vite + React app for running Monte Carlo style simulations and visualizations (currently focused on poker gameplay/simulation UI).

### Tech stack
- React 19, TypeScript
- Vite 7

### Repository layout
- `vite-app/` — the web app source (React + Vite)

### Development
```sh
cd vite-app
npm install
npm run dev
```
The app runs on a local dev server. Vite Hot Module Reload is enabled.

### Build
```sh
cd vite-app
npm run build
```
Outputs static assets to `vite-app/dist/`.

### Tests
```sh
cd vite-app
npm test
```

### Deployment (GitHub Pages)
This project is configured to deploy to GitHub Pages using `gh-pages`.

- The app is built with Vite `base` set to `/montecarlo/` in `vite-app/vite.config.js` so it serves correctly under the project path.
- Deploy with:
```sh
cd vite-app
npm run deploy
```
This builds the app and publishes `dist/` to the `gh-pages` branch. In your repository settings, set Pages to deploy from the `gh-pages` branch.

### License
MIT — see `LICENSE`.


