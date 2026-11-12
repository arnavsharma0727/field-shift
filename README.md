# Field Shift

A NASA Space Apps 2026 crop-rotation explorer prototype.

**[Open the live app](https://arnavsharma0727.github.io/field-shift/)** · [Research and data provenance](RESEARCH.md)

## Research foundation

The app combines one live NASA data product with lessons from recent NASA-supported agricultural work. The research is used to shape questions and caution flags, not to claim the studies predict outcomes for a selected field.

- **NASA POWER:** Daily precipitation and maximum temperature at the selected coordinate are the only remotely sourced numeric indicators currently integrated into the app.
- **NASA Harvest (2025):** Satellite observations and causal machine learning found rotation effects varied by crop sequence and weather. In the reported study, soybean immediately before winter wheat was associated with worse yields. The app avoids presenting that sequence as a default pathway.
- **NASA DEVELOP (2024 technical paper, archived 2025):** A northwest Alabama study mapped cover crops using Landsat, Sentinel-2, NDVI, and GPM precipitation. It reported higher observed soil water retention in cover-cropped fields, while flagging spatial and seasonal limitations. The app presents cover crops as a trial with water-use risks, especially in dry settings.
- **NASA Acres (2026):** Farmers and scientists in the Texas High Plains are exploring how satellite evidence can inform crops, cover crops, and irrigation under severe water constraints. The app therefore asks for water access and keeps local review explicit.

See [RESEARCH.md](RESEARCH.md) for sources, interpretation, and the data-integration roadmap.

## Run

From this folder, run `python3 -m http.server 8000 --directory dist`, then open `http://localhost:8000` in a browser. A network connection is required to load NASA POWER data. If the API is unavailable, the app still shows clearly labeled illustrative rotation pathways without climate metrics.

For a quick offline look, open `Field-Shift-View.html` directly in your browser. The interface and sample rotation pathways render as one file; live NASA requests may be restricted by browser cross-origin rules when opened from disk. The root `index.html` redirects to `dist/` for GitHub Pages when Pages is configured to publish from the repository root.

## What it does

- Select a sample location or enter coordinates, current rotation, soil texture, water access, and a priority.
- Request daily precipitation and maximum temperature from NASA POWER for 2021–2025.
- Show mean annual rainfall, hot days (maximum temperature ≥32°C), mean longest annual dry spell (precipitation <1 mm/day), and a seasonal rainfall chart.
- Compare three strategies including current practice with visible rationale, possible benefit, evidence, and local checks.
- Export a plain-text summary.

Fit scores are exploratory heuristics on a 1–5 scale. Each pathway has a baseline rating for the chosen priority (water, soil, or income). The app makes small adjustments for dry climate, rainfed water access, and sandy soil. The numbers are not calibrated, modeled yields, financial forecasts, or field-validated advice. Soil texture is supplied by the farmer, not inferred from remote sensing. Historical climate averages are area-scale context. A full submission should add local agronomy validation, crop calendars, soil tests, and field-specific data.

Data reference: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
