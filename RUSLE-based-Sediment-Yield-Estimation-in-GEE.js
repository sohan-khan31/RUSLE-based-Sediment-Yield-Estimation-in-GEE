// =========================================================
// DATASETS / ASSETS
// =========================================================

// 1. OpenLandMap USDA Soil Texture Class
var soil = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02');

// 2. Sentinel-2 Level-1C
var s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED');

// 3. MODIS Land Cover
var modis = ee.ImageCollection('MODIS/061/MCD12Q1');

// 4. Bangladesh District shapefile
var district = ee.FeatureCollection('projects/ee-sohan31du/assets/SHP/BD_District');

// 5. Dynamic World Land Use/Land Cover
var LULC = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1');

// 6. NASADEM 30 m
var NDEM = ee.Image('NASA/NASADEM_HGT/001');

// 7. CHIRPS Daily Rainfall
var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');

// 8. HydroSHEDS Level-7 Basins
var basins7 = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_7');

// 9. Bangladesh Division shapefile
var division = ee.FeatureCollection('projects/ee-sohan31du/assets/SHP/BD_Division');

// 10. SRTM DEM 30 m
var DEM = ee.Image('USGS/SRTMGL1_003');

// 11. Visualization parameters
var imageVisParam = {min: 0,max: 2};



// ================== BASIN (AOI) ==================
// Filter basin by HYBAS_ID
var basin = basins7.filter(ee.Filter.eq('HYBAS_ID', 4070912240));
Map.addLayer(basin, {}, 'Teesta Basin', 0);

//
// ================== REGION OF INTEREST (ROI) ==================
var fieldName = 'ADM1_EN';
var valuesToShow = ['Rangpur'];
var roi = division.filter(ee.Filter.inList(fieldName, valuesToShow));
Map.addLayer(roi, {}, 'ROI', 0);


// ================== CLIP AOI BY ROI ==================
// Convert ROI to a single geometry
var roiGeom = roi.geometry();

// Clip AOI using intersection
var aoi = basin.map(function(feature) {
  return feature.intersection(roiGeom, ee.ErrorMargin(1));
});

Map.centerObject(aoi, 9);
Map.addLayer(aoi, {}, 'Teesta Basin in BD');


var dateStart = '2025-03-01';
var dateEnd = '2025-04-30';

//455

// **************** R Factor ***************
var current = CHIRPS.filterDate(dateStart, dateEnd).select('precipitation').sum().clip(aoi);
Map.addLayer (current, {min: 0, max: 412.29800748825073, palette: ['7e81ff','5b66ff','3d4aff','282cff','183dff','0005ff']}, 'Period Rain', 0)


// Resample to 30 m
var current30m = current
  .resample('bilinear')   // or 'bicubic'
  .reproject({
    crs: 'EPSG:4326',
    scale: 30
  });

Map.addLayer(
  current30m,
  {
    min: 0,
    max: 412.29800748825073,
    palette: ['7e81ff','5b66ff','3d4aff','282cff','183dff','0005ff']
  },
  'Period Rain 30m',
  0
);



var R = ee.Image(current.multiply(0.35).add(38.5)).rename('R'); // Morgan, 2005; Sharpley and Williams, 1990
Map.addLayer(R, {min:0, max: 228.664176718235, palette: ['0b2dab', '2f35ff', '25cdff', 'fbff18', 'ff3818', 'a52508']}, 'R Factor Map', 0);



// **************** K Factor ***************
var soil2 = soil.select('b0').clip(aoi).rename('soil')     

var K = soil2.expression(
    "(b('soil') > 11) ? 0.0053" + //Sand
      ": (b('soil') > 10) ? 0.0170" + //Loamy Sand
        ": (b('soil') > 9) ? 0.045" + //Silt
           ": (b('soil') > 8) ? 0.050" + //Sandy Loam
            ": (b('soil') > 7) ? 0.0499" + //Silt Loam
            ": (b('soil') > 6) ? 0.0394" + //Loam
            ": (b('soil') > 5) ? 0.0264" + //Sandy Clay Loam
            ": (b('soil') > 4) ? 0.0423" + //Silt Clay Loam
            ": (b('soil') > 3) ? 0.0394" + //Clay Loam
            ": (b('soil') > 2) ? 0.036" + //Sandy Clay
            ": (b('soil') > 1) ? 0.0341" + //Silt Clay
            ": (b('soil') > 0) ? 0.0288" + //Clay
             ": 0") //Clay
             .rename('K').clip(aoi);   
            
Map.addLayer(K, {min: 0, max: 0.0394, palette: ['f7ff90','ffed5f','ffc822','ff921c','ff541e','ab0d0d']}, 'KFactor Map', 0);


// -----------------------------
// 2. NASADEM DEM
// -----------------------------
var dem = ee.Image('NASA/NASADEM_HGT/001')
  .select('elevation')
  .clip(aoi);

Map.addLayer(dem, {min: 0, max: 3000}, 'DEM', 0);

// -----------------------------
// 3. Slope from NASADEM
// -----------------------------
var slopeDeg = ee.Terrain.slope(dem).rename('slope');
var slopeRad = slopeDeg.multiply(Math.PI).divide(180).rename('slope_rad');

Map.addLayer(slopeDeg, {min: 0, max: 30}, 'Slope (degree)', 0);

// -----------------------------
// 4. Flow accumulation
// -----------------------------
// HydroSHEDS 15 arc-second flow accumulation
var fa = ee.Image('WWF/HydroSHEDS/15ACC')
  .select('b1')
  .clip(aoi)
  .rename('flow_acc');

// Reproject to DEM grid
var fa30 = fa.resample('bilinear').reproject(dem.projection());

Map.addLayer(fa30, {min: 0, max: 5000}, 'Flow Accumulation', 0);

// -----------------------------
// 5. Cell size
// -----------------------------
var cellSize = ee.Image.pixelArea().sqrt().rename('cellsize');


var m = 0.4;
var n = 1.3;

// Avoid zero values only for computation stability
var areaTerm = fa30.multiply(cellSize).divide(22.13).max(0.001);
var slopeTerm = slopeRad.sin().divide(0.0896).max(0.001);

// Final LS
var LS = areaTerm.pow(m)
  .multiply(slopeTerm.pow(n))
  .rename('LS')
  .clip(aoi);

Map.addLayer(
  LS,
  {
    min: 0,
    max: 100,
    palette: ['white', 'cyan', 'blue', 'yellow', 'orange', 'red']
  },
  'LS Factor'
);



// **************** C Factor ***************

var s21 = s2.filterBounds(aoi).filterDate(dateStart, dateEnd).mean();
var image_ndvi = s21.normalizedDifference(['B8','B4']).rename("NDVI");

Map.addLayer (image_ndvi, {min: -1, max: 1, palette: ['ffffff','cc9966','cc9900','996600','33cc00','009900']}, 'NDVI', 0);

var C = ee.Image(1)
        .subtract(image_ndvi)
        .divide(2)
        .pow(image_ndvi.add(1))
        .rename('C'); //Lin et al., (2002); Islam et al., (2024) [BD RUSLE]

Map.addLayer (C, {min: -1, max: 1, palette: ['9a9a9a','c9cc58','92cc3a','3a99aa','1a46cc','2e3597']}, 'C Map',0);


// **************** P Factor ***************
// =====================
// Load Dynamic World
// =====================
var dw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
  .filterDate(dateStart, dateEnd)
  .filterBounds(aoi)
  .select('label')
  .mode()                 // categorical composite
  .clip(aoi)
  .rename('lulc');

Map.addLayer(
  dw,
  {
    min: 0,
    max: 8,
    palette: ['0005ff','00851e','00d31d','18ffcc','dbff26','7eff83','ff0000','ff7d3b','e7e7e7']
  },
  'DW LULC',
  0
);

// =====================
// Make sure slope exists
// =====================
// Example from DEM:
var dem = ee.Image('NASA/NASADEM_HGT/001')
  .select('elevation')
  .clip(aoi);

var slope = ee.Terrain.slope(dem)
  .rename('slope')
  .clip(aoi);

// =====================
// Combine LULC + SLOPE
// =====================
var lulc_slope = dw.addBands(slope);

// =====================
// P-Factor Computation
// =====================
// Dynamic World classes:
// 0 = water
// 1 = trees
// 2 = grass
// 3 = flooded vegetation
// 4 = crops
// 5 = shrub & scrub
// 6 = built
// 7 = bare
// 8 = snow & ice

var P = lulc_slope.expression(
  "(lulc < 4) ? 0.8" +
  " : (lulc == 4) ? " +
      "((slope < 2) ? 0.6" +
      " : (slope < 5) ? 0.5" +
      " : (slope < 8) ? 0.5" +
      " : (slope < 12) ? 0.6" +
      " : (slope < 16) ? 0.7" +
      " : (slope < 20) ? 0.8" +
      " : 0.9)" +
  " : ((lulc >= 5 && lulc <= 8) ? 1 : 1)",
  {
    lulc: lulc_slope.select('lulc'),
    slope: lulc_slope.select('slope')
  }
).rename('P').clip(aoi);

Map.addLayer(
  P,
  {min: 0.5, max: 1, palette: ['ff8282','ffc75d','c3ff68','53f5ff','945bff']},
  'P Factor',
  0
);


// ================  ESTIMATING SOIL LOSS ===================
var soil_loss = R.multiply(K).multiply(LS).multiply(C).multiply(P).rename("Soil Loss") //.updateMask(dw.neq(0)); // mask water


var style = ['490eff','12f4ff','12ff50','e5ff12','ff4812']

Map.addLayer (soil_loss, {min: -0.05, max: 15, palette: ['0da2d1','06c489','b8e510','f5f00c','f99c0a','ff0000']}, 'Soil Loss', 0)

var SL_class = soil_loss.expression(
    "(b('Soil Loss') < 2) ? 1" +
      ": (b('Soil Loss') < 4) ? 2" +
      ": (b('Soil Loss') < 6) ? 3"+
      ": (b('Soil Loss') < 8) ? 4"+
             ": 5")
             .rename('SL_class').clip(aoi);  
Map.addLayer (SL_class, {min: 1, max: 5, palette: ['0072ac','0cb2b4','d4eb2c','ef921a','db0000']}, 'Soil Loss Class', 0)

var SL_mean = soil_loss.reduceRegion({
  geometry: aoi, 
  reducer: ee.Reducer.mean(), 
  scale: 30,
  maxPixels: 1e13
})

//print ("Mean Soil Loss",SL_mean.get("Soil Loss"))

// Soil Loss Statistics
var SL_stats = soil_loss.reduceRegion({
  reducer: ee.Reducer.min()
    .combine({
      reducer2: ee.Reducer.max(),
      sharedInputs: true
    })
    .combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
    }),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e13
});

print('Soil Loss Statistics (t/ha/yr)', SL_stats);





// =========================================================
// ===============   SEDIMENT DELIVERY RATIO   =============
// =========================================================

var flowAccum = ee.Image("WWF/HydroSHEDS/15ACC")
  .select('b1')
  .clip(aoi);

var slopeRad = slope.multiply(Math.PI).divide(180);

// Upslope component
var Dup = flowAccum.add(1).log()
  .multiply(K.add(0.001))
  .rename('Dup');

// Downslope component
var Ddn = slopeRad.sin().add(0.001).rename('Ddn');

// Connectivity Index
var IC = Dup.subtract(Ddn).rename('IC');

// SDR (logistic)
var SDR = IC.expression(
  "1 / (1 + exp(-a * (IC - b)))", {
    IC: IC,
    a: 1.5,
    b: 0.5
}).rename('SDR');


// ===============================
// 9. SEDIMENT YIELD
// ===============================
var sedimentYield = soil_loss.multiply(SDR).rename('sediment_yield');

Map.addLayer(sedimentYield, {min:0, max:20, palette:['green','orange','red']}, 'Sediment Yield');

// ---------- Step 6: Export or Statistics ----------
var SY_mean = sedimentYield.reduceRegion({
  geometry: aoi,
  reducer: ee.Reducer.mean(),
  scale: 30,
  maxPixels: 1e10
});

//print("Mean Sediment Yield (tons/ha/year)", SY_mean);


// Sediment Yield Statistics
var SY_stats = sedimentYield.reduceRegion({
  reducer: ee.Reducer.min()
    .combine({
      reducer2: ee.Reducer.max(),
      sharedInputs: true
    })
    .combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
    }),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e13
});

print('Sediment Yield Statistics (t/ha/yr)', SY_stats);




// ===============================
// 10. EXPORT TO DRIVE (UTM 45N)
// ===============================

var exportImage = function(image, name, scale) {
  Export.image.toDrive({
    image: image,
    description: name,
    fileNamePrefix: name,
    region: aoi,
    scale: scale,
    crs: 'EPSG:32645',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
  });
};


exportImage(soil_loss.toFloat(), 'Soil_Loss', 30);
exportImage(SDR.toFloat(), 'SDR', 30);
exportImage(sedimentYield.toFloat(), 'Sediment_Yield', 30);


// =========================================================================
// 11. MULTI-YEAR TIMESERIES LOOP & CHART GENERATION (2018 - 2025)
// =========================================================================

// Define the year range list
var years = ee.List.sequence(2018, 2025);

// Map over the years to calculate dynamic inputs and final Sediment Yield
var annualSedimentYieldCollection = ee.ImageCollection(years.map(function(year) {
  var yearStr = ee.Number(year).format('%d');
  
  // Set up annual matching date ranges (using your specific month/day profile)
  var startYearDate = ee.Date.fromYMD(year, 3, 1);  // March 1st
  var endYearDate = ee.Date.fromYMD(year, 4, 30);  // April 30th
  
  // 1. Dynamic R Factor (CHIRPS)
  var annualRain = CHIRPS.filterDate(startYearDate, endYearDate)
                         .select('precipitation')
                         .sum()
                         .clip(aoi);
  var annualR = annualRain.multiply(0.35).add(38.5).rename('R');
  
  // 2. Dynamic C Factor (Sentinel-2)
  var annualS2 = s2.filterBounds(aoi)
                   .filterDate(startYearDate, endYearDate)
                   .mean();
  var annualNDVI = annualS2.normalizedDifference(['B8','B4']).rename("NDVI");
  var annualC = ee.Image(1).subtract(annualNDVI)
                           .divide(2)
                           .pow(annualNDVI.add(1))
                           .rename('C');
                           
  // 3. Dynamic P Factor (Dynamic World Map)
  var annualDW = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
                   .filterDate(startYearDate, endYearDate)
                   .filterBounds(aoi)
                   .select('label')
                   .mode()
                   .clip(aoi)
                   .rename('lulc');
  
  var annualLulcSlope = annualDW.addBands(slope);
  var annualP = annualLulcSlope.expression(
    "(lulc < 4) ? 0.8" +
    " : (lulc == 4) ? " +
        "((slope < 2) ? 0.6" +
         " : (slope < 5) ? 0.5" +
         " : (slope < 8) ? 0.5" +
         " : (slope < 12) ? 0.6" +
         " : (slope < 16) ? 0.7" +
         " : (slope < 20) ? 0.8" +
         " : 0.9)" +
    " : ((lulc >= 5 && lulc <= 8) ? 1 : 1)",
    {
      lulc: annualLulcSlope.select('lulc'),
      slope: annualLulcSlope.select('slope')
    }
  ).rename('P').clip(aoi);
  
  // 4. Calculate Dynamic Annual Soil Loss
  // Note: K and LS are static constraints based on geomorphology & geology
  var annualSoilLoss = annualR.multiply(K).multiply(LS).multiply(annualC).multiply(annualP).rename("Soil_Loss");
  
  // 5. Calculate Final Annual Sediment Yield 
  // Note: SDR calculation uses static terrain datasets (HydroSHEDS/NASADEM)
  var annualSedimentYield = annualSoilLoss.multiply(SDR)
                                          .rename('sediment_yield')
                                          .set('year', year)
                                          .set('system:time_start', startYearDate.millis());
  
  return annualSedimentYield;
}));

// Create a visual time-series trend line chart in the console panel
var syChart = ui.Chart.image.series({
  imageCollection: annualSedimentYieldCollection.select('sediment_yield'),
  region: aoi,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'Seasonal Mean Sediment Yield Trend (2018-2025)',
  vAxis: {title: 'Sediment Yield (tons/ha/season)'},
  hAxis: {title: 'Year', format: 'yyyy'},
  lineWidth: 2,
  pointSize: 5,
  series: {
    0: {color: '#cc3300'} // Visual representation: Dark rusty red
  }
});

print('--- MULTI-YEAR ANALYSIS CHART ---', syChart);