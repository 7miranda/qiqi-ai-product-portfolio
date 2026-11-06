# Crossbound public release

Game source: `Cynthiawongss/crossbound`, main commit `696f4b36da07ab9a629ff41d617eb800a70f4554`.

The current integrated game, local baseline, build scripts and regression tests are synchronized into this portfolio. The portfolio pages remain independent of the game build.

- Landing page: `http://77miranda.com/previews/crossbound/`
- Game: `http://77miranda.com/previews/crossbound/preview.html`
- Build game assets: `npm run build:crossbound`
- Run game regression tests: `npm run test:crossbound`
- Export the portfolio and game together: `npm run build`

The Pages workflow builds and tests the integrated game before exporting the site. The legacy details build command delegates to the current builder; it no longer restores a historical Git snapshot. Entry scripts, styles and images are separate content-versioned assets.

GitHub Pages hosts static frontend files only. Existing browser-local game progress and questionnaire rewards work locally; Pages does not provide the optional account/database API. No server credentials or database exports are included in this release.

At release preparation, Pages reports `77miranda.com` as its custom domain with HTTPS certificate authorization pending. Use the existing HTTP URL until the domain owner completes certificate provisioning.
