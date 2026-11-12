# Research and data provenance

Field Shift asks whether a proposed rotation has enough evidence for a **small field trial**, rather than declaring a highest-yielding crop. The live numbers are NASA POWER area-scale series. The research below informs the sequence warnings and validation workflow. No study's numerical yield effect is applied to a user's field.

## Live public data

The app calls the [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) with community `AG`, parameters `PRECTOTCORR,T2M_MAX,GWETROOT,EVPTRNS`, local solar time, a point coordinate, and dates 2016-01-01 through 2025-12-31. NASA's [hydrology parameter documentation](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/) describes root-zone wetness and evapotranspiration energy flux. The endpoint response identifies the underlying source as MERRA-2/POWER for tested coordinates.

| Indicator | Calculation | Interpretation |
| --- | --- | --- |
| Growing-season rain | Sum of daily corrected precipitation in the seasonal window | Area-scale historical water input; not field rain-gauge data |
| Hot days | Count of days with maximum 2 m air temperature ≥32°C | Screen for heat exposure; not crop canopy temperature |
| Root-zone wetness | Mean of daily `GWETROOT` fraction in the window | Modeled moisture state; not a soil test or direct SMAP retrieval |
| Evapotranspiration energy flux | Mean daily `EVPTRNS`, MJ/m²/day | Water/energy context; **not** a water depth or crop-specific ET requirement |
| Dry-year analog | Year with least growing-season rain among complete years | Observed historical comparator; not a future-year prediction |

Only days with plausible values for all four parameters are retained. Years require 300 valid days and 110 seasonal days. At least five complete years are required. Annual bars and the selected analog are included in the downloadable evidence packet. The sensitivity slider multiplies the analog's rain total by 1 minus the chosen percentage, leaving wetness, heat, and other observations unchanged. This deliberately avoids pretending the slider is a physical climate simulation.

## Research translated into behavior

### NASA Harvest, crop order and weather (2025)

[NASA Earth Observatory's research summary](https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/) describes satellite and causal machine-learning analysis of crop rotations across real-world conditions. It reports that effects varied by crop order and weather, including a poor soybean-to-winter-wheat transition in studied fields, plausibly tied to later wheat planting. The [underlying preprint](https://arxiv.org/abs/2506.02384) is linked from NASA's article.

**Implementation:** The diversified example puts winter wheat before soybean and warns about the soybean-to-winter-wheat calendar. Confirmed harvest and planting dates are a gate. We do not transpose any paper yield percentages or imply the sequence is suitable in every region.

### HLS winter cover-crop phenology (2026)

[NASA's September 2026 feature](https://science.nasa.gov/mission/landsat/separating-wheat-from-chaff-from-space/) describes a weighted temporal and spectral method using Harmonized Landsat Sentinel-2 imagery and field observations to detect winter cover crops. The [underlying 2026 study](https://www.usgs.gov/publications/mapping-winter-cover-crops-using-remote-sensing-crop-phenology) reports balanced accuracy around 75–85% in its evaluation and confusion with weeds, perennial grasses, and winter cash crops. A green satellite snapshot is insufficient to establish a cover crop.

**Implementation:** The app asks for reported bare-ground months and verified planting/harvest dates before a trial. It treats these as farmer inputs, not remotely detected field states. No HLS pixels or crop classifier are currently integrated, so the study's accuracy does not describe this app.

### NASA Acres, measurement with farmers (2026)

[NASA Acres describes](https://www.nasaacres.org/news/helping-states-and-farmers-measure-conservation-practices-at-scale-with-nasa-remote-sensing) a Maryland collaboration that analyzes roughly 26,000 fields annually using HLS observations and field information to assess cover-crop growth and termination. Its role is to supply information for decisions, with ground observations essential to validation.

**Implementation:** The existing rotation remains the benchmark. A proposed change is framed as a limited trial with a measurement plan. If field soil data or dates are absent, the app withholds a green trial gate. We do not use NASA Acres field data or claim its regional results transfer to a user's farm.

## Boundaries and next engineering work

This version has no field polygon, crop-history verification, soil laboratory result, prices, irrigation allotment, pest history, or yield model. Root-zone wetness has coarse model resolution and cannot be downscaled into field precision by plotting it on a field map. A strong next version would connect field boundaries to HLS time series, infer seasonal ground-cover hypotheses with cloud and crop-confusion checks, compare them with planting records, and validate against held-out farms and years. Local extension and farmer review would still be needed before recommendations.
