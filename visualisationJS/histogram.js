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

/*

  transformuje pole s objekty record = { number: 5, count: 3 }
  do normalniho pole [5, 5, 5]
*/
function transformAdvancedValuesToSimple(values) {
  var queryArr = [];
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[i].count; j++) {
      queryArr.push(values[i].number);
    }
  }
  return queryArr;
}

/*

  transformuje pole jednoduch0 pole [5, 5, 5]
  do pole objektů [{ number: 5, count: 3 }]

  !! nutno davat pozor protoze pole neni agregovane, tudiz se muze vyskytovat
  více objektu se stejnými čísly !!
    => použijte potom funkci aggregateArray(array) pro agregaci pole

*/
function transformSimpleValuesToAdvanced(values) {
  var queryArr = [];
  var last = 0;
  var count = 0;


  for (var i = 0; i < values.length; i++ ){
    // prvni zaznam
    if (i == 0) {
      last = values[i];
      count++;
      continue;
    }

    //over zda je hodnota porad stejna
    if (values[i] == last) {
      count++;
    } else {
      //pokud se hodnota zmenila, uloz objekt s informacemi do pole
      let record = {
        number: last,
        count: count
      }

      queryArr.push(record);
      last = values[i];
      count = 1;
    }

    // uklada posledni zaznamenany prvek pred koncem cyklu
    if (i == values.length - 1) {
      let record = {
        number: last,
        count: count
      }
      queryArr.push(record);
    }
  }

  return queryArr;
}

/*

  Agreguje pole s objekty [{ number: 5, count: 3 }], zaručuje že se bude
  vyskytovat vždy jen jeden objekt s jedním číslem

*/
function aggregateArray(arrayToAggregate) {
  var queryAgr = [];
  for (var i = 0; i < arrayToAggregate.length; i++) {
    var number = arrayToAggregate[i].number;
    if (containsNumber(queryAgr, number)){
      continue;
    }

    var count = arrayToAggregate[i].count;
    for (var j = i + 1; j < arrayToAggregate.length; j++) {
      if (number == arrayToAggregate[j].number) {
        count += arrayToAggregate[j].count;
      }
    }

    let record = {
      number: number,
      count: count
    }
    queryAgr.push(record);
  }

  return queryAgr;
}

/*
  pomocna funkce pro zjisteni zda pole jiz obsahuje dane cislo
*/
function containsNumber(array, number) {
  for (var i = 0; i < array.length; i++) {
    if (array[i].number == number) {
      return true;
    }
  }
  return false;
}

/*
  takes key-value array and convert it to object array
  - {number:number, count:count}
*/
function transformKeyValueToObjectArray(array) {
  var newArray = [];
  for (var key in array) {
    let record = {
      number: parseInt(key, 10) ,
      count: array[key]
    }
    newArray.push(record);
  }
  return newArray;
}

/*
  takes object array and convert it to key-value array
  - {number:count}
*/
function transformObjectArrayToKeyValue(array) {
  var newArray = [];
  for (var i = 0; i < array.length; i++) {

      newArray[array[i].number] = array[i].count;
  }
  return newArray;
}

/*
  vykreslovaní histogramu pomoci pole s objekty
  - nutno mít agregovane pole jinak nebude fungovat spravně
  [{ number: 5, count: 3 }, { number: 5, count: 3 }, { number: 5, count: 3 }]
*/
function drawHistogramAdvanced(values) {

  // jen testovaci dokud se nebudou pouzivat spravne pole
  values = aggregateArray(transformSimpleValuesToAdvanced(values));

  const dx = 1;
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
  var max = d3.max(values, function(d){return d.number}) + 1;

  var x = d3.scale.linear()
      .domain([min, max])
      .range([0, width]);


  var data = d3.layout.histogram()
      .bins(x.ticks(max))(values);
  console.log("normalni data");
  console.log(data);
  console.log("bez values");
  console.log(d3.layout.histogram().bins(x.ticks(max)));


  var yMax = d3.max(values, function (d) { return d.count });
  var yMin = d3.min(values, function (d) { return d.count });
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
      .data(values)
      .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function (d) { return "translate(" + x(d.number) + "," + y(d.count) + ")"; });

  bar.append("rect")
      .attr("x", 1)
      .attr("width", (x(dx) - x(0)) - 1)
      .attr("height", function (d) { return height - y(d.count); })
      .attr("fill", function (d) { return colorScale(d.count) });

  bar.append("text")
      .attr("dy", ".75em")
      .attr("y", -12)
      .attr("x", (x(dx) - x(0)) / 2)
      .attr("text-anchor", "middle")
      .text(function (d) { return d.count == 0 ? "" : d.count; });


  svg.append("g")
      .attr("class", "xaxis text")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
      .attr("transform", function (d) {
          return "translate(" + (x(dx) - x(0)) / 2 + "," + 0 + ")";
      });


}


/*
  vykreslovaní histogramu pomoci key-value pole
*/
function drawHistogramKeyValue(values) {

  // odstranit po zavedeni formatu
  vals = aggregateArray(transformSimpleValuesToAdvanced(values));
  values = transformObjectArrayToKeyValue(vals);

  const dx = 1;
  const binCount = 10;
  var color = "steelblue";
  d3.select("#svgHistogram").remove();


  var margin = { top: 20, right: 15, bottom: 30, left: 10 },
      width = 280 - margin.left - margin.right,
      height = 180 - margin.top - margin.bottom;

  var min = 0;
  var max = d3.max(values, function(val,key){return key}) + 1;

  var x = d3.scale.linear()
      .domain([min, max])
      .range([0, width]);



  var yMax = d3.max(values, function (val, key) { return val });
  var yMin = d3.min(values, function (val, key) { return val });
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
      .data(values)
      .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function (val, key) {
        if(typeof val == 'undefined') {
          return "";
        }
        return "translate(" + x(key) + "," + y(val) + ")";
      });
  bar.append("rect")
      .attr("x", 1)
      .attr("width", (x(dx) - x(0)) - 1)
      .attr("height", function (val, key) {
        if(typeof val == 'undefined') {
          val=0;
        }
        return height - y(val);
      })
      .attr("fill", function (val, key) {
        if(typeof val == 'undefined') {
          val=0;
        }
        return colorScale(val);
      });


  bar.append("text")
      .attr("dy", ".75em")
      .attr("y", -12)
      .attr("x", (x(dx) - x(0)) / 2)
      .attr("text-anchor", "middle")
      .text(function (val, key)  { return val == 0 ? "" : val; });


  svg.append("g")
      .attr("class", "xaxis text")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
      .attr("transform", function (d) {
          return "translate(" + (x(dx) - x(0)) / 2 + "," + 0 + ")";
      });

}
