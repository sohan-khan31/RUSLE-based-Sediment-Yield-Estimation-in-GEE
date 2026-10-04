# Assessment of sediment yield at lower Teesta River Basin of Bangladesh using geospatial technique

This repository contains the Google Earth Engine (GEE) JavaScript code used for the research titled:

**“Assessment of sediment yield at lower Teesta River Basin of Bangladesh using geospatial technique”**

## Google Earth Engine script

GEE snapshot:

https://code.earthengine.google.com/9c5dc1f01066f8689b46c9415e08e87e

Main source file in this repository:

`teesta_sediment_yield_gee.js`

## Overview

The workflow estimates soil loss and sediment yield for the lower Teesta River Basin in Bangladesh using geospatial datasets and Google Earth Engine.

The script implements:

- Rainfall erosivity (R factor)
- Soil erodibility (K factor)
- Slope length and steepness (LS factor)
- Cover-management (C factor)
- Support-practice (P factor)
- RUSLE-based soil-loss estimation
- Sediment Delivery Ratio (SDR)
- Sediment-yield estimation
- Seasonal multi-year sediment-yield analysis for 2018–2025
- Export of Soil Loss, SDR, and Sediment Yield as GeoTIFF files

## Main datasets

The supplied GEE script uses datasets including:

- OpenLandMap USDA Soil Texture Class
- Sentinel-2 Harmonized Level-1C
- Dynamic World land-use/land-cover
- NASADEM
- CHIRPS Daily rainfall
- HydroSHEDS Level-7 basins
- HydroSHEDS flow accumulation
- User-provided Bangladesh administrative-boundary assets in Google Earth Engine

## Important note about the Bangladesh boundary asset

The script references this project asset:

`projects/ee-sohan31du/assets/SHP/BD_Division`

For another Earth Engine user to reproduce the analysis, this asset must be readable by that user. For a public reproducibility repository, make the required Earth Engine asset publicly readable (“Anyone can read”) or provide an equivalent public boundary dataset and document the substitution.

The script also declares:

`projects/ee-sohan31du/assets/SHP/BD_District`

If it is retained in the published script, consider making it publicly readable as well.

## Study period

The principal analysis in the supplied script uses:

- Start: 1 March 2025
- End: 30 April 2025

The script also generates a seasonal sediment-yield time series for **2018–2025**, using the March–April period for each year.

## Running the code

1. Sign in to Google Earth Engine.
2. Open the Earth Engine Code Editor.
3. Open the GEE snapshot link above, or create a new script and paste the contents of `teesta_sediment_yield_gee.js`.
4. Confirm that the required project assets are accessible.
5. Run the script.
6. Review maps, statistics, and the multi-year chart in the Earth Engine interface.
7. Run the export tasks if GeoTIFF outputs are required.

## Exported products

The script prepares the following Google Drive exports at 30 m spatial resolution in **WGS 84 / UTM zone 45N (EPSG:32645)**:

- `Soil_Loss`
- `SDR`
- `Sediment_Yield`

## Citation

If you use this code, please cite the associated journal article:

> [Add the final published article citation here.]

After archiving a release in Zenodo, add the software DOI here as well:

> Software DOI: [Add Zenodo DOI]

## Authors

[Add author names and affiliations]

## License

No software license has been selected in this repository template. Before public release, add the license that is appropriate for your journal, institution, and co-authors (for example, MIT, BSD-3-Clause, or GPL-3.0).
