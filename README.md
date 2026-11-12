# Field Shift

**[Open the public website](https://arnavsharma0727.github.io/field-shift/)** · [Launch the platform](https://arnavsharma0727.github.io/field-shift/app/) · [Scenario Lab](https://arnavsharma0727.github.io/field-shift/app/scenarios/) · [Research and methods](RESEARCH.md)

Field Shift is an independent 2026 NASA Space Apps Challenge prototype. It audits the environmental assumptions behind a rotation before presenting alternatives. The distinctive question is: **do recent observed conditions still resemble the conditions used as a baseline, and what field evidence is needed before a small trial?**

## Public website and routes

The homepage is a light, product-led introduction with a live embedded app preview and a NASA POWER comparison for the Shenandoah Valley example. The comparison loads public observations and shows an unavailable state when the request fails. `/app/` is the full geospatial workspace; `/app/scenarios/` is a focused scenario route. On GitHub Pages these paths live under the repository prefix `/field-shift/`. The original `/dist/` app remains as a compatibility route.

## Research workspace

- **Interactive map:** MapLibre GL JS and OpenStreetMap reference tiles. Click a point or enter coordinates to query a new NASA POWER location. An optional NASA GIBS MODIS Terra NDVI rolling 8-day visualization (2025-08-15) provides geographic context. It is not sampled or interpreted as a field measurement.
- **Observed record:** NASA POWER daily corrected precipitation, maximum 2 m air temperature, modeled root-zone wetness, and evapotranspiration energy flux for 2016–2025. The chart switches among seasonal rain, ≥32°C hot days, and modeled wetness. Every value shown comes from a successfully parsed response.
- **Assumption Audit:** Compares medians for 2016–2020 and 2021–2025, requiring at least three complete years on each side. It reports rain percentage departure, hot-day difference, and modeled wetness difference. The largest relative adverse change is an exposure signal, **not a causal driver or crop suitability estimate**. A ten-year split is descriptive, not a statistical trend test.
- **Scenario Lab:** Compares the existing rotation with a cover-phase and sequence-change hypothesis. A farmer can test an observed dry year under 0–30% less rain; the slider changes rainfall alone. Missing soil tests and planting dates withhold trial gates. Output is a transparent screening decision, never a yield prediction.
- **Evidence packet:** JSON export of inputs, annual observations, dry analog, audit, gates, citations, and limitations.

NASA Harvest crop-order research informs the sequence caution, while 2026 HLS phenology and NASA Acres work inform the emphasis on field dates and validation. Their study results are not transferred numerically to this point. The app does not ingest HLS field imagery, infer a crop from NDVI color, or estimate causal yield.

## Run and verify

Serve `dist` as a static site, for example:

```bash
python3 -m http.server 8000 --directory dist
```

Run `npm test` for dependency-free calculations. Browser access to NASA POWER, NASA GIBS, MapLibre's module CDN, and OpenStreetMap tiles is required for the full workspace. If POWER is unavailable, the climate audit is withheld and no example observations are substituted. If the map library is unavailable, coordinates and climate analysis remain accessible.

## Architecture

- `index.html`, `landing.css`, `landing.js` — public website and live NASA comparison
- `app/index.html`, `app/theme.css` — light themed product route using the shared analysis implementation
- `app/scenarios/` — dedicated scenario workspace with transparent gates
- `dist/index.html` — original research workspace compatibility route
- `dist/styles.css` — restrained, responsive scientific design system
- `dist/app.js` — NASA request, map and imagery controls, charts, audit presentation, export
- `dist/analytics.js` — pure annual aggregation, dry analog, audit, decision gates
- `test/analytics.test.js` — synthetic-data checks, including Southern Hemisphere seasons and audit windows
- `RESEARCH.md` — source claims, formulas, data boundaries, and research translation

Licensed under MIT. NASA did not develop or endorse this prototype.
