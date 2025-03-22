// choropleth.js

// Set up dimensions of the map
var width = 960, height = 600;
var projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale([1000]);
var path = d3.geoPath().projection(projection);

// Create color scale for population
var colorScale = d3.scaleQuantize()
    .range(["#f7f7f7", "#f0f0f0", "#d9d9d9", "#bdbdbd", "#969696", "#636363", "#252525"]);

// Set up the SVG container
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// Load GeoJSON and CSV data using D3
Promise.all([
    d3.json("us_counties.geojson"),  // GeoJSON file for county boundaries
    d3.csv("county_data.csv")         // CSV file with population breakdowns
]).then(function([geojson, countyData]) {

    // Map CSV data for easier lookup
    var countyMap = {};
    countyData.forEach(function(d) {
        countyMap[d.state + "_" + d.county] = {
            JD1: +d.JD1,
            JD2: +d.JD2,
            JD3: +d.JD3,
            JD4: +d.JD4
        };
    });

    // Merge the population data into the GeoJSON features
    geojson.features.forEach(function(county) {
        var key = county.properties.STATEFP + "_" + county.properties.NAME;
        var data = countyMap[key];
        if (data) {
            // Sum up the population of all jurisdictions
            county.properties.totalPopulation = Object.values(data).reduce((sum, value) => sum + value, 0);
        } else {
            county.properties.totalPopulation = 0; // Set population to 0 if no data available
        }
    });

    // Define color scale domain based on population data
    colorScale.domain([
        d3.min(geojson.features, d => d.properties.totalPopulation),
        d3.max(geojson.features, d => d.properties.totalPopulation)
    ]);

    // Draw the counties on the map and color them by population
    svg.selectAll(".county")
        .data(geojson.features)
        .enter().append("path")
        .attr("class", "county")
        .attr("d", path)
        .style("fill", function(d) {
            return colorScale(d.properties.totalPopulation);
        })
        .style("stroke", "#fff")
        .style("stroke-width", 0.5)
        .on("click", function(event, d) {
            var countyName = d.properties.NAME;
            var jurisdictionData = countyMap[d.properties.STATEFP + "_" + countyName];
            showJurisdictionData(countyName, jurisdictionData);  // Function to show breakdown in the sidebar
        });

    // Add state borders
    svg.append("path")
        .datum(topojson.mesh(geojson, geojson.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "state-borders")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

    // Function to display jurisdiction-wise population data in the sidebar
    function showJurisdictionData(countyName, data) {
        var breakdownHTML = `<h2>${countyName} - Jurisdiction Breakdown</h2><ul>`;
        for (var jd in data) {
            breakdownHTML += `<li>${jd}: ${data[jd]}</li>`;
        }
        breakdownHTML += "</ul>";
        d3.select("#jurisdiction-data").html(breakdownHTML);
    }

});
