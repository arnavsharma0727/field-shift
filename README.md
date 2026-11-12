# Field Shift

**[Open the live app](https://arnavsharma0727.github.io/field-shift/)** · [Research and methods](RESEARCH.md)

Field Shift is a research prototype for the 2026 NASA Space Apps Challenge. Its unusual premise is that a crop-rotation tool should sometimes advise **measurement or a small trial before a change**. A ranked list can hide the cost of being wrong in a dry year. This app makes the existing rotation a benchmark, screens two alternatives against observed stress, and shows which field facts are still missing.

## What is implemented

- Fetch ten years of public **NASA POWER daily data** at a chosen coordinate: corrected precipitation (`PRECTOTCORR`), maximum air temperature (`T2M_MAX`), modeled root-zone wetness (`GWETROOT`), and evapotranspiration energy flux (`EVPTRNS`).
- Exclude fill values and incomplete years. Calculate growing-season precipitation, hot days, mean root-zone wetness, evapotranspiration energy flux, and annual dry spells.
- Select the **observed** year with the least growing-season rainfall as a dry-year analog. Compare its rainfall and root-zone wetness with historical medians. The chart exposes every year, including the selected analog.
- Apply a 0–30% rainfall sensitivity adjustment to that analog. This changes only rainfall in a decision screen; it is **not** a forecast, climate projection, or modeled crop response.
- Compare current practice, a cover-phase trial, and a different crop sequence. The alternatives are gated by a recent soil test, confirmed planting dates, water access, observed stress, and the farmer's reported bare-ground months.
- Export a JSON evidence packet with the inputs, annual series, analog, gates, sources, and limitations.

The interface draws on recent NASA Harvest, HLS phenology, and NASA Acres research. It incorporates their **decision lessons**—crop order matters, a cover crop is a seasonal time series rather than a single green snapshot, and field records are needed to interpret satellite observations. It does **not** ingest HLS imagery, classify an individual field, estimate causal yield effects, or claim that NASA Acres' field measurements apply at the chosen point. See [RESEARCH.md](RESEARCH.md).

## Run and test

Open the [hosted app](https://arnavsharma0727.github.io/field-shift/), or run a local static server:

```bash
python3 -m http.server 8000 --directory dist
```

Then visit `http://localhost:8000`. Run the dependency-free analysis tests with `npm test` from the repository root. The browser needs internet access to retrieve NASA data. If the request fails, climate-dependent gates are withheld; the app does not substitute demo values.

## Method in brief

The window is May–September in the Northern Hemisphere and November–March, grouped by calendar year, in the Southern Hemisphere. A year is used if it has at least 300 valid daily observations and 110 valid growing-season days. The dry analog is the complete year with the lowest seasonal precipitation; ties go to the year with more hot days. Median comparisons are descriptive. Root-zone wetness is a modeled fraction on a coarse grid, not a field soil test or direct SMAP measurement. `EVPTRNS` is energy flux in MJ/m²/day, not millimeters of irrigation water. The thresholds in `assessPathways` are explicit screening heuristics, not statistically calibrated performance estimates.

## Files

- `dist/index.html` — responsive interface
- `dist/app.js` — browser state, NASA API request, charts, and export
- `dist/analytics.js` — pure analysis and decision-gate functions
- `test/analytics.test.js` — meaningful synthetic-data checks
- `RESEARCH.md` — source claims, mapping to features, and limitations

Licensed under MIT. This is an independent student prototype and is not endorsed by NASA.
