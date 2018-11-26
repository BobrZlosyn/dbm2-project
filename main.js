var highlightedElements = { nodes: {}, paths: {} };

var nodes;
var paths;
var pathsInvis;
var nodeTexts;
var pathTexts;

//Toggle stores whether the highlighting is on
var toggle = 0;
//Create an array logging what is connected to what
var linkedByIndex = {};


//load from input file
var triples = INPUT_DATA.Triples;
console.log(triples);

var filtered = triples.filter(function (item) {
    return item.objectType != 'Literal' || (item.objectType == 'Literal' && item.subject == 'Patient');
});
triples = filtered;



var svg = d3.select("#svg-body").append("svg")
    .attr("width", 500)
    .attr("height", 625)
    ;

var force = d3.layout.force().size([500, 625]);

var graph = triplesToGraph(triples, []);
var check_value = gainTypesFromTriples(triples);
check_value.sort(function (a, b) {
    if (a == 'Literal' || a == '???') return -1;
    if (b == 'Literal' || b == '???') return +1;
    return a.localeCompare(b);
});

console.log(check_value);

update();

var parentElement = document.getElementById('checkboxes');

for (var count in check_value) {
    var row = document.createElement('checkbox');
    var row_id = 'row_' + count; // need unique Ids! 
    row.id = row_id;
    row.setAttribute("style", "min-width:160px !important;");

    var newCheckBox = document.createElement('input');
    var check_id = 'checkbox_' + count; // need unique Ids!

    newCheckBox.type = 'checkbox';
    newCheckBox.id = check_id
    newCheckBox.value = check_value[count];
    newCheckBox.checked = true;

    newCheckBox.setAttribute("onclick", "var array = checkCheckboxes(); graph = triplesToGraph(triples, array); update(); calculateNeighborhoodMatrix(); applyStyle();");
    newCheckBox.setAttribute("style", "display: inline-block");


    var label = document.createElement('label');
    label.htmlFor = check_id;
    label.setAttribute("style", "min-width:170px !important; cursor: pointer; font-size:small");

    label.appendChild(newCheckBox);
    label.appendChild(document.createTextNode(" " + check_value[count]));

    row.appendChild(label);
    parentElement.appendChild(row);
}



calculateNeighborhoodMatrix();
applyStyle();


function filterNodesById(nodes, id) {
    return nodes.filter(function (n) { return n.id === id; });
}

function filterNodesByLabel(nodes, label) {
    return nodes.filter(function (n) { return n.label === label; });
}


function isNotRequiredType(myStringArray, type) {

    var s;
    for (s of myStringArray) {
        if (s === type) {
            return true;
        }
    }
    return false;
}


function checkCheckboxes() {

    var arr = new Array();
    var children = document.getElementById("checkboxes").childNodes;
    var count = 0;

    for (div of children) { //divs
        var chld = div.childNodes;

        for (lab of chld) {
            if (lab.nodeName === 'LABEL') {	//labels
                var lab_child = lab.childNodes;

                for (check of lab_child) {
                    if (check.nodeName === 'INPUT') { //checkbox
                        if (check.checked === false) {
                            arr[count] = check.value;
                            count++;
                        }
                    }
                }
            }
        }
    }

    return arr;
}

function triplesToGraph(triples, filterArray) {

    svg.html("");
    //Graph
    var graph = { nodes: [], links: [] };

    idLink = 0;
    idNode = 0;

    //Initial Graph from triples
    triples.forEach(function (triple) {
        var subjId = triple.subject;
        var subjType = triple.subjectType;
        var subjTypePrefixed = triple.subjectTypePrefixed;

        var predId = triple.predicate;

        var objType = triple.objectType;
        var objTypePrefixed = triple.objectTypePrefixed;
        var objId = objType == 'Literal' ? triple.subject + triple.predicate : triple.object;

        var cardinalityMin = triple.cardinalityMin;
        var cardinalityMax = triple.cardinalityMax;




        if (filterArray.length == 0 || (isNotRequiredType(filterArray, subjTypePrefixed) === false && isNotRequiredType(filterArray, objTypePrefixed) === false)) {
            var subjNode = filterNodesByLabel(graph.nodes, subjId)[0];

            if (subjNode == null) {
                subjNode = { id: idNode++, label: subjId, type: 1 };
                graph.nodes.push(subjNode);
            }


            var objNode = filterNodesByLabel(graph.nodes, objId)[0];

            if (objNode == null) {
                if (objType == 'Literal') {
                    objNode = { id: idNode++, label: '', type: 2 };
                    graph.nodes.push(objNode);
                } else {
                    objNode = { id: idNode++, label: objId, type: 1 };
                    graph.nodes.push(objNode);
                }

            }

            graph.links.push({ source: subjNode, target: objNode, predicate: predId, weight: 1, id: idLink++, cardinalityMin: cardinalityMin, cardinalityMax: cardinalityMax });
        }
    });

    return graph;
}



function gainTypesFromTriples(triples) {

    var check_value = new Array();
    triples.forEach(function (triple) {
        if (check_value.indexOf(triple.subjectTypePrefixed) == -1)
            check_value.push(triple.subjectTypePrefixed);
        if (check_value.indexOf(triple.objectTypePrefixed) == -1)
            check_value.push(triple.objectTypePrefixed);
    });

    return check_value;
}

//This function looks up whether a pair are neighbours
function neighboring(a, b) {
    console.log(a);
    console.log(b);
    console.log(linkedByIndex);
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id] || a.id == b.id;
}

function connectedNodes(obj) {
    if (toggle == 0) {
        //Reduce the opacity of all but the neighbouring nodes
        d = d3.select(obj).node().__data__;
        nodes.style("opacity", function (o) {
            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
        });
        paths.style("opacity", function (o) {
            return d.id == o.source.id | d.id == o.target.id ? 1 : 0.1;
        });
        nodeTexts.style("opacity", function (o) {
            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
        });
        pathTexts.style("opacity", function (o) {
            return d.id == o.source.id | d.id == o.target.id ? 1 : 0.1;
        });

        //Reduce the op
        toggle = 1;
    } else {
        //Put them back to opacity=1
        nodes.style("opacity", 1);
        /*	link.style("opacity", 1);*/
        paths.style("opacity", 1);
        nodeTexts.style("opacity", 1);
        pathTexts.style("opacity", 1);
        toggle = 0;
    }
}

function collide(alpha) {
    var padding = 3, // separation between circles
        radius = 8;

    var quadtree = d3.geom.quadtree(graph.nodes);
    return function (d) {
        var rb = 2 * radius + padding,
            nx1 = d.x - rb,
            nx2 = d.x + rb,
            ny1 = d.y - rb,
            ny2 = d.y + rb;
        quadtree.visit(function (quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y);
                if (l < rb) {
                    l = (l - rb) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}


function update() {
    // ==================== Add Marker ====================
	/*		svg.append("svg:defs").selectAll("marker")
			    .data(["end"])
			  .enter().append("svg:marker")
			    .attr("id", String)
			    .attr("viewBox", "0 -5 10 10")
			    .attr("refX", 18)
//			    .attr("refY", -0.6)
			    .attr("markerWidth", 7)
			    .attr("markerHeight", 7)
			    .attr("orient", "auto")
			  .append("svg:polyline")
			    .attr("points", "0,-5 10,0 0,5")
              .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");
			    ;
*/
    var markerdata = [
        { id: 0, name: 'circle', fill: 1, path: 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0', viewbox: '-6 -6 12 12' }
        , { id: 1, name: 'square', fill: 1, path: 'M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z', viewbox: '-5 -5 10 10' }
        , { id: 2, name: 'arrow-nofill', fill: 0, path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', viewbox: '-5 -5 10 10' }
        , { id: 3, name: 'arrow-fill', fill: 1, path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', viewbox: '-5 -5 10 10' }
        , { id: 4, name: 'stub', fill: 1, path: 'M 0,0 m -1,-5 L 1,-5 L 1,5 L -1,5 Z', viewbox: '-1 -5 2 10' }
    ]

    var defs = svg.append('svg:defs');
    var marker = defs.selectAll('marker')
        .data(markerdata)
        .enter()
        .append('svg:marker')
        .attr('id', function (d) { return 'marker_' + d.name })
        .attr('markerHeight', 10)
        .attr('markerWidth', 10)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', 14)
        .attr('refY', 0)
        .attr('viewBox', function (d) { return d.viewbox })
        .append('svg:path')
        .attr('d', function (d) { return d.path })
        .attr('class', function (d) { return d.fill > 0 ? 'marker-end-fill' : 'marker-end-no-fill' });
    //.attr('fill', function(d,i) { return '#999'});





    // ==================== Arc Paths =====================
    paths = svg.append("svg:g").selectAll(".path")
        .data(graph.links)
        .enter().append("svg:path")
        .attr("id", function (d) { return d.source.id + "_" + d.target.id + "_" + d.predicate; })
        .attr("class", "path")
        //     .attr("class", function(d) { return 'path' + (d.cardinalityMin == 0 ? ' cardinality0' : '') + (d.cardinalityMax > 1 ? ' cardinalityN' : '') })
        //     .attr("class", function(d) { return d.cardinalityMin == 0 ? 'cardinality0' : 'asdsd' } )
        //     .attr("class", function(d) { return d.cardinalityMax > 1 ? 'cardinalityN' : '' } )
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", function (d) { return d.cardinalityMin == 0 ? '4 5' : '' })
        .attr("marker-end", function (d) { return d.cardinalityMax > 1 ? 'url(#marker_arrow-fill)' : 'url(#marker_arrow-nofill)' });

    pathsInvis = svg.append("svg:g").selectAll(".path.invis")
        .data(graph.links)
        .enter().append("svg:path")
        .attr("id", function (d) { return "reverse" + d.source.id + "_" + d.target.id + "_" + d.predicate; })
        .attr("class", "invis");



    // ==================== Add Link Names =====================

    pathTexts = svg.append("svg:g").selectAll(".pathTexts")
        .data(graph.links)
        .enter().append("svg:text")
        .attr("class", "pathTexts")
        .attr("dy", -2)
        .append("svg:textPath")
        .attr("startOffset", "50%")
        .attr("text-anchor", "middle")
        .attr("xlink:href", function (d) { return "#reverse" + d.source.id + "_" + d.target.id + "_" + d.predicate; })
        .attr("class", "link-text")
        .text(function (d) { return d.predicate; });



    // ==================== Add Node =====================
    nodes = svg.selectAll(".node")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 6);//nodes


    // ==================== Add Node Names =====================
    nodeTexts = svg.selectAll(".node-text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr("class", "node-text")
        .style('text-anchor', 'middle')
        .text(function (d) { return d.label; })
        ;




    // ==================== Force ====================
    force.on("tick", function () {
        nodes
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            ;
        /*				
                        paths
                            .attr("d", function(d) {
                                var dx = d.target.x - d.source.x,
                                    dy = d.target.y - d.source.y,
                                    dr = 650;  //linknum is defined above
                                return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
                            });
         */
        paths
            .attr("d", function (d) { return arcPath(false, d); });

        pathsInvis
            .attr("d", function (d) { return arcPath(d.source.x > d.target.x, d); });


        nodeTexts
            .attr("x", function (d) { return d.x; })
            .attr("y", function (d) { return d.y - 10; })
            ;

        nodes.each(collide(0.9));


    });

    // ==================== Run ====================
    force
        .nodes(graph.nodes)
        .links(graph.links)
        .charge(-500)
        .linkDistance(120)
        .start()
        ;

}


function arcPath(reverse, d) {
    x1 = reverse ? d.target.x : d.source.x,
        y1 = reverse ? d.target.y : d.source.y,
        x2 = reverse ? d.source.x : d.target.x,
        y2 = reverse ? d.source.y : d.target.y,
        dx = x2 - x1,
        dy = y2 - y1,
        dr = Math.sqrt(dx * dx + dy * dy),

        // Defaults for normal edge.
        //drx, dry = 0 for straight lines
        drx = dr,
        dry = dr,
        xRotation = 0, // degrees
        largeArc = 0, // 1 or 0
        sweep = reverse ? 0 : 1; // 1 or 0



    //HACK        
    //FIXME: proper handling of multiple properties in the same direction        
    if (d.predicate == "imagingStudy") { drx *= 0.6; dry *= 0.6 }


    // Self edge.
    if (x1 === x2 && y1 === y2) {
        // Fiddle with this angle to get loop oriented.
        xRotation = -45;

        // Needs to be 1.
        largeArc = 1;

        // Change sweep to change orientation of loop. 
        //sweep = 0;

        // Make drx and dry different to get an ellipse
        // instead of a circle.
        drx = 10;
        dry = 30;

        // For whatever reason the arc collapses to a point if the beginning
        // and ending points of the arc are the same, so kludge it.
        x2 = x2 + 1;
        y2 = y2 + 1;
    }
    /*      
              siblingCount = countSiblingLinks(d.source, d.target)
  
              if (siblingCount > 1) {
                  var siblings = getSiblingLinks(d.source, d.target);
                  var arcScale = d3.scale.ordinal()
                                          .domain(siblings)
                                          .rangePoints([1, siblingCount]);
                  drx = drx/(1 + (1/siblingCount) * (arcScale(d.id) - 1));
                  dry = dry/(1 + (1/siblingCount) * (arcScale(d.id) - 1));
              }
  
  */
    return "M" + x1 + "," + y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
}


/*
  function countSiblingLinks(source, target) {
      var count = 0;
      for(var i = 0; i < graph.links.length; ++i){
          if( (graph.links[i].source.id == source.id && graph.links[i].target.id == target.id) || (graph.links[i].source.id == target.id && graph.links[i].target.id == source.id) )
              count++;
      };
      return count;
  };

  function getSiblingLinks(source, target) {
      var siblings = [];
      for(var i = 0; i < graph.links.length; ++i){
          if( (graph.links[i].source.id == source.id && graph.links[i].target.id == target.id) || (graph.links[i].source.id == target.id && graph.links[i].target.id == source.id) )
              siblings.push(graph.links[i].id);
      };
      return siblings;
  };
*/



function showInfo(obj) {

    d = obj.__data__;
    data = triples[d.id];

    console.log(d);

    console.log(triples[d.id]);
    document.getElementById("value-triples").innerHTML = data.predicateCount;
    document.getElementById("value-distinctSubject").innerHTML = data.subjectCount;
    document.getElementById("value-distinctObject").innerHTML = data.objectCount;

    document.getElementById("value-propertyType").innerHTML = data.predicateTypePrefixed;
    document.getElementById("value-subjectType").innerHTML = data.subjectTypePrefixed;
    document.getElementById("value-objectType").innerHTML = data.objectTypePrefixed;

    //        drawHistogram([1, 1, 1, 1, 3, 5, 3, 14, 1, 9, 11, 1, 1, 0, 10, 1, 1]);
    drawHistogram(data.cardinalities);
}

function highlight(obj) {
    d = obj.__data__;

    if (obj.classList.contains('node')) {
        if (highlightedElements.nodes[d.id] == 1) {
            highlightedElements.nodes[d.id] = 0;
        } else {
            highlightedElements.nodes[d.id] = 1;
        }
    } else if (obj.classList.contains('link-text') || obj.classList.contains('path')) {
        switchOn = highlightedElements.paths[d.id] != 1;

        if (switchOn) {
            highlightedElements.paths[d.id] = 1;
            highlightedElements.nodes[d.source.id] = 1;
            highlightedElements.nodes[d.target.id] = 1;
        } else {
            highlightedElements.paths[d.id] = 0;
        }

    }

    console.log(highlightedElements);


    nodes.style("opacity", function (o) {
        return highlightedElements.nodes[o.id] == 1 ? 1 : 0.1;
    });

    paths.style("opacity", function (o) {
        return highlightedElements.paths[o.id] == 1 ? 1 : 0.1;
    });

    pathTexts.style("opacity", function (o) {
        return highlightedElements.paths[o.id] == 1 ? 1 : 0.5;
    });
}


function removeSvgElement(obj) {
    d = obj.__data__;


    if (obj.classList.contains('node')) {
        graph.nodes.splice(d.index, 1);
        graph.links = graph.links.filter(function (el) { return el.source.id != d.id && el.target.id != d.id; });


        for (i = nodes[0].length - 1; i >= 0; i--) {
            el = nodes[0][i];
            if (el.__data__.id == d.id) {
                el.parentElement.removeChild(el);
                nodes[0].splice(i, 1);
            }
        }

        for (i = nodeTexts[0].length - 1; i >= 0; i--) {
            el = nodeTexts[0][i];
            if (el.__data__.id == d.id) {
                el.parentElement.removeChild(el);
                nodeTexts[0].splice(i, 1);
            }
        }

        for (i = paths[0].length - 1; i >= 0; i--) {
            el = paths[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                paths[0].splice(i, 1);
            }
        }
        for (i = pathsInvis[0].length - 1; i >= 0; i--) {
            el = pathsInvis[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                pathsInvis[0].splice(i, 1);
            }
        }
        for (i = pathTexts[0].length - 1; i >= 0; i--) {
            el = pathTexts[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                pathTexts[0].splice(i, 1);
            }
        }

        nodes.data(graph.nodes)
            .exit().remove();

        nodeTexts.data(graph.nodes)
            .exit().remove();

        paths.data(graph.links)
            .exit().remove();

        pathsInvis.data(graph.links)
            .exit().remove();

        pathTexts.data(graph.links)
            .exit().remove();


        force.nodes(graph.nodes);
        force.links(graph.links);
        force.start();

        applyStyle();

        console.log(graph);


    }
}



function clickedElement() {
    if (selectedMode == 'a') {
        //
    } else if (selectedMode == 'b') {
        showInfo(this);
    } else if (selectedMode == 'c') {
        highlight(this);
    } else if (selectedMode == 'd') {
        removeSvgElement(this);
    } else if (selectedMode == 'e') {
        connectedNodes(this);
    } else if (selectedMode == 'fix') {
        this.classList.toggle("fixed-node");

        d3.selectAll('.fixed-node').each(
            function (d) {
                d.fixed = true;
            }
        );
    }


}


var selectedMode = '-';
function switchMode(mode) {
    selectedMode = mode;
    document.getElementById("editmode").innerHTML = selectedMode;
}


function applyStyle() {

    var color = d3.scale.category20();

    nodes.style("fill", function (d) {
        return color(d.type);
    });

    nodeTexts.style("fill", function (d) {
        return color(d.type);
    });

    nodes.on('click', clickedElement);
    nodes.call(force.drag);
    paths.on('click', clickedElement);
    paths.call(force.drag);
    nodeTexts.on('click', clickedElement);
    nodeTexts.call(force.drag);
    pathTexts.on('click', clickedElement);
    pathTexts.call(force.drag);

}

function calculateNeighborhoodMatrix() {
    linkedByIndex = [];
    for (i = 0; i < graph.nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    };
    graph.links.forEach(function (d) {
        linkedByIndex[d.source.id + "," + d.target.id] = 1;
    });
}


$(function () {
    $('[data-toggle="popover"]').popover();
    $('.choice1').popover({
        title: "<strong>dcm:has_study</strong> - min. cardinality 0", content: `
<div class='radio'>
  <label><input type='radio' name='optradio' checked='checked'>Select every <strong>Patient</strong>, regardless of the property.</label>
</div>
<div class='radio'>
  <label><input type='radio' name='optradio'>Select only <strong>Patient</strong>s that are linked to some <strong>Study</strong>.</label>
</div>
  `, html: true, placement: "right"
    });

})



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