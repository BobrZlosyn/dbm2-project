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

function calculateNeighborhoodMatrix() {
    linkedByIndex = [];
    for (i = 0; i < graph.nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    };
    graph.links.forEach(function (d) {
        linkedByIndex[d.source.id + "," + d.target.id] = 1;
    });
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
