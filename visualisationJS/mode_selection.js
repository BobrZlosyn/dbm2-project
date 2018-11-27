var selectedMode = '-';

function switchMode(mode) {
    selectedMode = mode;
    document.getElementById("editmode").innerHTML = selectedMode;
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
