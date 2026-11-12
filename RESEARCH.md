# Research and data provenance

Field Shift is a decision-support prototype for the 2026 NASA Space Apps Challenge. It uses climate observations to frame comparison, then draws on recent NASA-supported agricultural research for the questions each pathway should raise. It does not fit a crop-yield model or calculate a causal treatment effect for a user's field.

## Integrated data

**NASA POWER Daily API.** The browser requests `PRECTOTCORR` (corrected precipitation) and `T2M_MAX` (daily maximum 2 m air temperature) for 2021–2025 at the selected coordinate. It excludes fill or implausible values and requires at least three years with 300 valid days. Indicators are the mean annual precipitation, mean count of days with maximum temperature at least 32°C, mean longest annual run with daily precipitation below 1 mm, and mean monthly precipitation totals. The latter is the mean of each month's total across complete years. POWER's point result is area-scale climate context, not a measurement of the precise field.

Source: [NASA POWER Daily API documentation](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).

## Research that shapes the interface

**NASA Harvest-supported rotation study (2025).** Researchers used satellite imagery and causal machine learning to examine rotation effects across real farming conditions. NASA's summary reports strong differences by crop order and weather, including poorer performance for soybean followed by winter wheat in studied regions, plausibly linked to a late wheat planting window. This motivates the app's sequence warning. The reported effects are not transferred into the app's score or presented as local yield estimates.

Source: [NASA Earth Observatory, “How to Rotate Crops”](https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/). The article links the [underlying preprint](https://arxiv.org/abs/2506.02384).

**NASA DEVELOP Alabama agriculture project (2024; NASA archive 2025).** The project explored cover-crop mapping and water retention using Landsat, Sentinel-2, GPM precipitation, and NDVI. Its report described higher observed retention on cover-cropped fields in northwest Alabama and limits due to resolution and changing vegetation. The app includes a cover pathway but explicitly asks farmers to check moisture competition, timing, and local conditions. Findings in Alabama are not assumed to apply elsewhere.

Source: [NASA Technical Reports Server record 20250002857](https://ntrs.nasa.gov/citations/20250002857).

**NASA Acres water-stress collaboration (2026).** NASA's field story describes work with Texas High Plains farmers on practical choices about crops, cover, irrigation, and aquifer stress. This informs the water-access input and the recommendation to trial changes locally. The app does not ingest NASA Acres field data.

Source: [NASA Earth Observatory, “Fighting Drought in Texas Cotton Country”](https://science.nasa.gov/earth/earth-observatory/fighting-drought-in-texas-cotton-country/).

## Next research and engineering steps

1. Add field boundaries and Landsat or Harmonized Landsat Sentinel-2 vegetation time series to estimate ground-cover gaps. Validate against farmer-reported planting and harvest dates.
2. Add SMAP-derived regional soil-moisture anomalies and show its native resolution separately from field imagery. Do not resample coarse soil moisture into false field precision.
3. Incorporate local soil tests, agronomic calendars, irrigation allotments, prices, equipment, and market access. Review candidate rotations with extension specialists and farmers.
4. Evaluate predictions or rankings on held-out fields and years before presenting them as agronomic performance estimates.
