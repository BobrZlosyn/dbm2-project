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

        nodes.each(collide(0));


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
