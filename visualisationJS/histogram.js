function drawHistogram(values) {
    const binCount = 10;
    var color = "steelblue";

    d3.select("#svgHistogram").remove();


    //  var values = [2,1,0,4,5,0,7,3];
    //  values = values.map(x => x >= binCount ? binCount : x );

    //triples[0].cardinalities

    // A formatter for counts.
    //   var formatCount = d3.format("d");

    var margin = { top: 20, right: 15, bottom: 30, left: 10 },
        width = 280 - margin.left - margin.right,
        height = 180 - margin.top - margin.bottom;

    var min = 0;
    var max = d3.max(values) + 1;

    var x = d3.scale.linear()
        .domain([min, max])
        .range([0, width]);


    var data = d3.layout.histogram()
        .bins(x.ticks(max))
        (values);

    var yMax = d3.max(data, function (d) { return d.length });
    var yMin = d3.min(data, function (d) { return d.length });
    var colorScale = d3.scale.linear()
        .domain([yMin, yMax])
        .range([d3.rgb(color).brighter(), d3.rgb(color).darker()]);

    var y = d3.scale.linear()
        .domain([0, yMax])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .tickFormat(d3.format("d"))
        .orient("bottom");


    var svg = d3.select("#histo").append("svg")
        .attr("id", "svgHistogram")
        .style("border-style", "none")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function (d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", (x(data[0].dx) - x(0)) - 1)
        .attr("height", function (d) { return height - y(d.y); })
        .attr("fill", function (d) { return colorScale(d.y) });

    bar.append("text")
        .attr("dy", ".75em")
        .attr("y", -12)
        .attr("x", (x(data[0].dx) - x(0)) / 2)
        .attr("text-anchor", "middle")
        .text(function (d) { return d.y == 0 ? "" : d.y; });


    svg.append("g")
        .attr("class", "xaxis text")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
        .attr("transform", function (d) {
            return "translate(" + (x(data[0].dx) - x(0)) / 2 + "," + 0 + ")";
        });
}

function drawHistogramAdvanced(values) {

}]
